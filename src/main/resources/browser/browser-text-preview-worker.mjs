import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';
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
			await delay(20);
			return;
		}

		await delay(50);
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

async function launchBrowserSession({ browserPath, width, height, deviceScale }) {
	if (!existsSync(browserPath) && !['msedge', 'chrome'].includes(browserPath)) {
		throw new Error(`Browser executable not found: ${browserPath}`);
	}

	const userDataDir = await mkdtemp(join(tmpdir(), 'yearbook-text-preview-worker-'));
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

	let browserOutput = '';
	const appendBrowserOutput = (chunk) => {
		browserOutput += chunk.toString();
		if (browserOutput.length > 12000) {
			browserOutput = browserOutput.slice(-12000);
		}
	};
	browserProcess.stdout.on('data', appendBrowserOutput);
	browserProcess.stderr.on('data', appendBrowserOutput);

	const wsUrl = await waitForDevToolsUrl(browserProcess, 20000);
	const client = new CdpClient(wsUrl);
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

	return {
		browserProcess,
		client,
		sessionId,
		userDataDir,
		browserOutput: () => browserOutput
	};
}

async function renderPreview(state, request) {
	const client = state.client;
	const sessionId = state.sessionId;
	const timeoutMs = asNumber(request.timeoutMs, 45000);
	const selector = request.clipSelector || '#text-preview-target';

	await client.send(
		'Emulation.setDeviceMetricsOverride',
		{
			width: asNumber(request.width, state.width),
			height: asNumber(request.height, state.height),
			deviceScaleFactor: asNumber(request.deviceScale, state.deviceScale),
			mobile: false,
			screenWidth: asNumber(request.width, state.width),
			screenHeight: asNumber(request.height, state.height)
		},
		sessionId
	);
	await client.send(
		'Emulation.setDefaultBackgroundColorOverride',
		{
			color: request.transparentBackground
				? { r: 255, g: 255, b: 255, a: 0 }
				: { r: 255, g: 255, b: 255, a: 1 }
		},
		sessionId
	);
	await client.send('Page.navigate', { url: request.url }, sessionId);
	await waitForRenderReady(client, sessionId, timeoutMs);
	await client.send('Emulation.setEmulatedMedia', { media: 'screen' }, sessionId);

	const clipEvaluation = await client.send(
		'Runtime.evaluate',
		{
			expression: `(() => {
				const element = document.querySelector(${JSON.stringify(selector)});
				if (!element) {
					return { error: 'clip selector not found', selector: ${JSON.stringify(selector)} };
				}
				const rect = element.getBoundingClientRect();
				return {
					rect: {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height
					}
				};
			})()`,
			returnByValue: true
		},
		sessionId
	);

	const metrics = clipEvaluation?.result?.value ?? null;
	if (metrics?.error) {
		throw new Error(metrics.error);
	}

	const clipRect = getPositiveRect(metrics?.rect);
	if (!clipRect) {
		throw new Error('Text preview metrics were not available.');
	}

	if (request.metricsOutput) {
		await writeFile(request.metricsOutput, JSON.stringify(metrics, null, 2), 'utf8');
	}

	const screenshot = await client.send(
		'Page.captureScreenshot',
		{
			format: 'png',
			fromSurface: true,
			clip: {
				x: clipRect.x,
				y: clipRect.y,
				width: clipRect.width,
				height: clipRect.height,
				scale: 1
			}
		},
		sessionId
	);

	const screenshotBuffer = screenshot?.data ? Buffer.from(screenshot.data, 'base64') : null;
	if (!screenshotBuffer || screenshotBuffer.length === 0) {
		throw new Error('Rendered screenshot output was empty.');
	}

	await writeFile(request.output, screenshotBuffer);
	return metrics;
}

async function cleanup(state) {
	if (!state) {
		return;
	}

	try {
		if (state.client) {
			state.client.close();
		}
	} catch (error) {
		console.error('Failed to close CDP client:', error);
	}

	try {
		await stopBrowser(state.browserProcess);
	} catch (error) {
		console.error('Failed to stop browser cleanly:', error);
	}

	try {
		if (state.userDataDir) {
			await rm(state.userDataDir, { recursive: true, force: true });
		}
	} catch (error) {
		console.error('Failed to remove temporary browser profile:', error);
	}
}

async function main() {
	const browserPath = getArg('browser-path');
	const width = asNumber(getArg('width'), 786);
	const height = asNumber(getArg('height'), 1011);
	const deviceScale = asNumber(getArg('device-scale'), 4);

	if (!browserPath) {
		throw new Error('Missing required argument: --browser-path');
	}

	let state = await launchBrowserSession({ browserPath, width, height, deviceScale });
	state.width = width;
	state.height = height;
	state.deviceScale = deviceScale;

	let shuttingDown = false;
	const shutdown = async () => {
		if (shuttingDown) {
			return;
		}
		shuttingDown = true;
		await cleanup(state);
	};

	process.on('SIGINT', async () => {
		await shutdown();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await shutdown();
		process.exit(0);
	});

	process.stdout.write(`${JSON.stringify({ type: 'ready' })}\n`);

	const rl = readline.createInterface({
		input: process.stdin,
		crlfDelay: Infinity
	});

	for await (const line of rl) {
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}

		let request;
		try {
			request = JSON.parse(trimmed);
		} catch (error) {
			process.stdout.write(`${JSON.stringify({
				type: 'result',
				success: false,
				error: `Invalid request: ${error?.message || String(error)}`
			})}\n`);
			continue;
		}

		const response = {
			type: 'result',
			requestId: request.requestId
		};

		try {
			await renderPreview(state, request);
			response.success = true;
		} catch (error) {
			response.success = false;
			response.error = error?.stack || String(error);
		}

		process.stdout.write(`${JSON.stringify(response)}\n`);
	}

	await shutdown();
}

main().catch(async (error) => {
	console.error(error?.stack || String(error));
	process.exitCode = 1;
});
