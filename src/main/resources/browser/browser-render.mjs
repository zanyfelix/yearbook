import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

function getArg(name, fallback = undefined) {
	const flag = `--${name}`;
	const index = process.argv.indexOf(flag);
	if (index === -1 || index + 1 >= process.argv.length) {
		return fallback;
	}
	return process.argv[index + 1];
}

function asNumber(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function getPositiveRect(value) {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const x = Number(value.x);
	const y = Number(value.y);
	const width = Number(value.width);
	const height = Number(value.height);
	if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
		return null;
	}

	return { x, y, width, height };
}

class CdpClient {
	constructor(webSocketUrl) {
		this.webSocketUrl = webSocketUrl;
		this.nextId = 1;
		this.pending = new Map();
		this.socket = null;
		this.listeners = new Map();
	}

	async connect() {
		await new Promise((resolve, reject) => {
			const socket = new WebSocket(this.webSocketUrl);
			this.socket = socket;

			socket.addEventListener('open', () => resolve(), { once: true });
			socket.addEventListener('error', (event) => reject(event.error || new Error('WebSocket connection failed')), {
				once: true
			});
			socket.addEventListener('message', (event) => this.handleMessage(event));
			socket.addEventListener('close', () => {
				for (const { reject } of this.pending.values()) {
					reject(new Error('CDP socket closed'));
				}
				this.pending.clear();
			});
		});
	}

	handleMessage(event) {
		const payload = JSON.parse(event.data);
		if (!payload.id) {
			const handlers = this.listeners.get(payload.method) || [];
			for (const handler of handlers) {
				try {
					handler(payload.params ?? {});
				} catch (error) {
					console.warn(`CDP event handler failed for ${payload.method}:`, error);
				}
			}
			return;
		}

		const entry = this.pending.get(payload.id);
		if (!entry) {
			return;
		}

		this.pending.delete(payload.id);
		if (payload.error) {
			entry.reject(new Error(payload.error.message || 'CDP command failed'));
			return;
		}

		entry.resolve(payload.result ?? {});
	}

	send(method, params = {}, sessionId = undefined) {
		const id = this.nextId++;
		const payload = { id, method, params };
		if (sessionId) {
			payload.sessionId = sessionId;
		}

		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.socket.send(JSON.stringify(payload));
		});
	}

	on(method, handler) {
		const handlers = this.listeners.get(method) || [];
		handlers.push(handler);
		this.listeners.set(method, handlers);
	}

	close() {
		if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
			this.socket.close();
		}
	}
}

async function waitForDevToolsUrl(browserProcess, timeoutMs) {
	let output = '';

	return await new Promise((resolve, reject) => {
		const deadline = setTimeout(() => {
			reject(new Error(`Timed out waiting for DevTools URL. Output so far:\n${output}`));
		}, timeoutMs);

		const handleChunk = (chunk) => {
			const text = chunk.toString();
			output += text;
			const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
			if (match) {
				clearTimeout(deadline);
				resolve(match[1]);
			}
		};

		browserProcess.stdout.on('data', handleChunk);
		browserProcess.stderr.on('data', handleChunk);
		browserProcess.once('error', (error) => {
			clearTimeout(deadline);
			reject(error);
		});
		browserProcess.once('exit', (code) => {
			clearTimeout(deadline);
			reject(new Error(`Browser exited before DevTools opened (code=${code}). Output:\n${output}`));
		});
	});
}

async function waitForRenderReady(client, sessionId, timeoutMs) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		const evaluation = await client.send(
			'Runtime.evaluate',
			{
				expression: `(() => ({
					ready: window.__RENDER_READY === true,
					error: window.__RENDER_ERROR || null,
					renderReady: document.body?.dataset?.renderReady === 'true'
				}))()`,
				returnByValue: true
			},
			sessionId
		);

		const value = evaluation?.result?.value ?? {};
		if (value.error) {
			throw new Error(`Render page reported an error: ${value.error}`);
		}

		if (value.ready || value.renderReady) {
			await client.send(
				'Runtime.evaluate',
				{
					expression: `document.fonts ? document.fonts.ready.then(() => true) : true`,
					awaitPromise: true,
					returnByValue: true
				},
				sessionId
			);
			await delay(150);
			return;
		}

		await delay(200);
	}

	throw new Error('Timed out waiting for the render page to become ready.');
}

async function stopBrowser(browserProcess) {
	if (!browserProcess || browserProcess.exitCode !== null) {
		return;
	}

	browserProcess.kill();
	await Promise.race([
		new Promise((resolve) => browserProcess.once('exit', resolve)),
		delay(1500)
	]);

	if (browserProcess.exitCode === null) {
		browserProcess.kill('SIGKILL');
		await Promise.race([
			new Promise((resolve) => browserProcess.once('exit', resolve)),
			delay(1500)
		]);
	}
}

async function readProtocolStream(client, handle, sessionId) {
	const chunks = [];
	try {
		while (true) {
			const result = await client.send('IO.read', { handle }, sessionId);
			const data = result?.data || '';
			if (data) {
				chunks.push(result.base64Encoded ? Buffer.from(data, 'base64') : Buffer.from(data, 'utf8'));
			}
			if (result?.eof) {
				break;
			}
		}
	} finally {
		try {
			await client.send('IO.close', { handle }, sessionId);
		} catch (error) {
			console.warn('Failed to close protocol stream:', error);
		}
	}

	return Buffer.concat(chunks);
}

async function captureScreenshot({
	browserPath,
	url,
	output,
	width,
	height,
	deviceScale,
	timeoutMs,
	clipSelector,
	metricsOutput
}) {
	if (!existsSync(browserPath) && !['msedge', 'chrome'].includes(browserPath)) {
		throw new Error(`Browser executable not found: ${browserPath}`);
	}

	const userDataDir = await mkdtemp(join(tmpdir(), 'yearbook-browser-render-'));
	let browserOutput = '';
	let browserExitDetails = 'browser exit status unavailable';
	const appendBrowserOutput = (chunk) => {
		browserOutput += chunk.toString();
		if (browserOutput.length > 12000) {
			browserOutput = browserOutput.slice(-12000);
		}
	};
	const browserArgs = [
		'--headless=new',
		'--disable-gpu',
		'--hide-scrollbars',
		'--mute-audio',
		'--no-first-run',
		'--no-default-browser-check',
		'--remote-debugging-port=0',
		`--user-data-dir=${userDataDir}`,
		'about:blank'
	];

	const browserProcess = spawn(browserPath, browserArgs, {
		stdio: ['ignore', 'pipe', 'pipe']
	});
	browserProcess.stdout.on('data', appendBrowserOutput);
	browserProcess.stderr.on('data', appendBrowserOutput);
	browserProcess.on('exit', (code, signal) => {
		browserExitDetails = `Browser exited code=${code} signal=${signal ?? 'none'}`;
	});

	let client;
	const eventLog = [];
	const pushEvent = (label, value) => {
		const message = typeof value === 'string' ? value : JSON.stringify(value);
		eventLog.push(`${label}: ${message}`);
		if (eventLog.length > 40) {
			eventLog.shift();
		}
	};
	try {
		const wsUrl = await waitForDevToolsUrl(browserProcess, timeoutMs);
		client = new CdpClient(wsUrl);
		await client.connect();

		const target = await client.send('Target.createTarget', { url: 'about:blank' });
		const attached = await client.send('Target.attachToTarget', {
			targetId: target.targetId,
			flatten: true
		});
		const sessionId = attached.sessionId;

		await client.send('Page.enable', {}, sessionId);
		await client.send('Runtime.enable', {}, sessionId);
		await client.send('Log.enable', {}, sessionId);
		client.on('Runtime.consoleAPICalled', (params) => {
			const args = (params.args || [])
				.map((arg) => arg.value ?? arg.description ?? arg.type)
				.join(' | ');
			pushEvent(`console.${params.type || 'log'}`, args);
		});
		client.on('Runtime.exceptionThrown', (params) => {
			pushEvent('runtime.exception', params.exceptionDetails?.text || params.exceptionDetails);
		});
		client.on('Log.entryAdded', (params) => {
			pushEvent(`log.${params.entry?.level || 'info'}`, params.entry?.text || params.entry);
		});
		client.on('Inspector.detached', (params) => {
			pushEvent('inspector.detached', params.reason || params);
		});
		client.on('Page.javascriptDialogOpening', (params) => {
			pushEvent('dialog', params.message || params);
		});
		await client.send(
			'Emulation.setDeviceMetricsOverride',
			{
				width,
				height,
				deviceScaleFactor: deviceScale,
				mobile: false,
				screenWidth: width,
				screenHeight: height
			},
			sessionId
		);
		await client.send(
			'Emulation.setDefaultBackgroundColorOverride',
			{
				color: { r: 255, g: 255, b: 255, a: 1 }
			},
			sessionId
		);
		await client.send('Page.navigate', { url }, sessionId);
		pushEvent('stage', 'navigated');
		await waitForRenderReady(client, sessionId, timeoutMs);
		pushEvent('stage', 'render-ready');
		await client.send('Emulation.setEmulatedMedia', { media: 'screen' }, sessionId);
		pushEvent('stage', 'screen-media-ready');

		let clipRect = null;
		let renderMetrics = null;
		if (clipSelector) {
			const clipEvaluation = await client.send(
				'Runtime.evaluate',
				{
					expression: `(() => {
						const selector = ${JSON.stringify(clipSelector)};
						const element = document.querySelector(selector);
						if (!element) {
							return { error: 'clip selector not found', selector };
						}

						const rect = element.getBoundingClientRect();
						return {
							selector,
							rect: {
								x: rect.x,
								y: rect.y,
								width: rect.width,
								height: rect.height
							},
							renderCrop: document.body?.dataset?.renderCrop || null,
							renderReady: document.body?.dataset?.renderReady || null,
							pagePreviewRect: (() => {
								const preview = document.getElementById('page-preview');
								if (!preview) return null;
								const previewRect = preview.getBoundingClientRect();
								return {
									x: previewRect.x,
									y: previewRect.y,
									width: previewRect.width,
									height: previewRect.height
								};
							})(),
							backgroundRect: (() => {
								const bg = document.getElementById('page-preview-img');
								if (!bg) return null;
								const bgRect = bg.getBoundingClientRect();
								return {
									x: bgRect.x,
									y: bgRect.y,
									width: bgRect.width,
									height: bgRect.height
								};
							})()
						};
					})()`,
					returnByValue: true
				},
				sessionId
			);

			renderMetrics = clipEvaluation?.result?.value ?? null;
			clipRect = getPositiveRect(renderMetrics?.rect);
			if (!clipRect) {
				pushEvent('clip-selector-metrics', renderMetrics ?? 'unavailable');
			}
		}

		const screenshot = await client.send(
			'Page.captureScreenshot',
			{
				format: 'png',
				fromSurface: true,
				...(clipRect ? {
					clip: {
						x: clipRect.x,
						y: clipRect.y,
						width: clipRect.width,
						height: clipRect.height,
						scale: 1
					}
				} : {})
			},
			sessionId
		);
		pushEvent('stage', 'screenshot-captured');

		const screenshotBuffer = screenshot?.data ? Buffer.from(screenshot.data, 'base64') : null;
		if (!screenshotBuffer || screenshotBuffer.length === 0) {
			throw new Error('Rendered screenshot output was empty.');
		}

		await writeFile(output, screenshotBuffer);
		pushEvent('stage', 'file-written');

		if (metricsOutput && renderMetrics) {
			await writeFile(metricsOutput, JSON.stringify(renderMetrics, null, 2), 'utf8');
			pushEvent('stage', 'metrics-written');
		}
	} catch (error) {
		const diagnosticParts = [error?.stack || String(error)];
		if (eventLog.length > 0) {
			diagnosticParts.push(`Page events:\n${eventLog.join('\n')}`);
		}
		if (browserOutput.trim()) {
			diagnosticParts.push(`Browser output:\n${browserOutput.trim()}`);
		}
		diagnosticParts.push(browserExitDetails);
		throw new Error(diagnosticParts.join('\n\n'));
	} finally {
		if (client) {
			client.close();
		}

		try {
			await stopBrowser(browserProcess);
		} catch (error) {
			console.warn('Failed to stop browser cleanly:', error);
		}

		try {
			await rm(userDataDir, { recursive: true, force: true });
		} catch (error) {
			console.warn('Failed to remove temporary browser profile:', error);
		}
	}
}

async function main() {
	const browserPath = getArg('browser-path');
	const url = getArg('url');
	const output = getArg('output');
	const width = asNumber(getArg('width'), 2621);
	const height = asNumber(getArg('height'), 3371);
	const deviceScale = asNumber(getArg('device-scale'), 2);
	const timeoutMs = asNumber(getArg('timeout-ms'), 45000);
	const clipSelector = getArg('clip-selector', '#page-preview');
	const metricsOutput = getArg('metrics-output', undefined);

	if (!browserPath || !url || !output) {
		throw new Error('Missing required arguments: --browser-path, --url, --output');
	}

	await captureScreenshot({
		browserPath,
		url,
		output,
		width,
		height,
		deviceScale,
		timeoutMs,
		clipSelector,
		metricsOutput
	});
}

main().catch((error) => {
	console.error(error?.stack || String(error));
	process.exitCode = 1;
});
