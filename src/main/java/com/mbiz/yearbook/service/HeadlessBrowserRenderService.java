package com.mbiz.yearbook.service;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import javax.imageio.ImageIO;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class HeadlessBrowserRenderService {

	private static final Logger logger = LoggerFactory.getLogger(HeadlessBrowserRenderService.class);

	private static final int CSS_WIDTH = 2621;
	private static final int CSS_HEIGHT = 3371;
	private static final int DEVICE_SCALE = 1;
	private static final int OUTPUT_WIDTH = CSS_WIDTH * DEVICE_SCALE;
	private static final int OUTPUT_HEIGHT = CSS_HEIGHT * DEVICE_SCALE;
	private static final int EDITOR_CSS_WIDTH = 786;
	private static final int EDITOR_CSS_HEIGHT = 1011;
	private static final double TEXT_PREVIEW_DEVICE_SCALE = 4.0d;

	private final BrowserRenderTokenService browserRenderTokenService;
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Value("${server.port:8080}")
	private int serverPort;

	@Value("${server.servlet.context-path:}")
	private String contextPath;

	@Value("${headless.render.enabled:true}")
	private boolean enabled;

	@Value("${headless.render.timeout-ms:120000}")
	private long timeoutMs;

	@Value("${headless.render.virtual-time-budget-ms:60000}")
	private long configuredVirtualTimeBudgetMs;

	@Value("${headless.render.virtual-time-budget-min-ms:10000}")
	private long virtualTimeBudgetMinMs;

	@Value("${headless.render.process-grace-ms:5000}")
	private long processGraceMs;

	@Value("${headless.render.health-timeout-ms:3000}")
	private int healthTimeoutMs;

	@Value("${headless.render.trim-outer-white-margins:false}")
	private boolean trimOuterWhiteMarginsEnabled;

	@Value("${headless.render.base-url:}")
	private String configuredBaseUrl;

	@Value("${headless.render.browser-path:}")
	private String configuredBrowserPath;

	@Value("${headless.render.node-path:}")
	private String configuredNodePath;

	@Value("${headless.render.browser-window-inset-width:0}")
	private int browserWindowInsetWidth;

	@Value("${headless.render.browser-window-inset-height:0}")
	private int browserWindowInsetHeight;

	private volatile Path extractedScriptPath;
	private volatile Path extractedTextPreviewWorkerScriptPath;
	private final Object textPreviewWorkerLock = new Object();
	private volatile TextPreviewWorker textPreviewWorker;

	public HeadlessBrowserRenderService(BrowserRenderTokenService browserRenderTokenService) {
		this.browserRenderTokenService = browserRenderTokenService;
	}

	@PreDestroy
	public void shutdown() {
		stopTextPreviewWorker();
	}

	public BufferedImage renderPage(Long yearbookId) {
		if (!enabled || yearbookId == null) {
			return null;
		}

		String browserPath = resolveBrowserPath();
		if (browserPath == null || browserPath.isBlank()) {
			logger.info("Skipping headless browser render because no browser executable was found.");
			return null;
		}

		Path outputPath = null;
		Path browserProfileDir = null;
		Process process = null;
		StringBuilder commandOutput = new StringBuilder();
		Thread logThread = null;

		try {
			String token = browserRenderTokenService.issueToken(yearbookId);
			if (!canReachRenderEndpoint(yearbookId, token)) {
				return null;
			}
			String renderUrl = buildRenderUrl(yearbookId, token);
			BufferedImage scriptRendered = renderPageWithBrowserScript(yearbookId, browserPath, renderUrl);
			if (scriptRendered != null) {
				return scriptRendered;
			}
			browserProfileDir = Files.createTempDirectory("yearbook-browser-profile-");
			outputPath = browserProfileDir.resolve("render.png");
			long virtualTimeBudgetMs = resolveVirtualTimeBudgetMs();
			long effectiveWaitMs = resolveEffectiveWaitMs(virtualTimeBudgetMs);

			logger.debug(
					"Starting headless browser render for pageId={} with timeoutMs={}, virtualTimeBudgetMs={}, processGraceMs={}",
					yearbookId, timeoutMs, virtualTimeBudgetMs, processGraceMs);

			List<String> command = new ArrayList<>();
			command.add(browserPath);
			command.add("--headless=new");
			command.add("--disable-gpu");
			command.add("--hide-scrollbars");
			command.add("--mute-audio");
			command.add("--no-first-run");
			command.add("--no-default-browser-check");
			command.add("--run-all-compositor-stages-before-draw");
			command.add("--window-size=" + resolveBrowserWindowWidth() + "," + resolveBrowserWindowHeight());
			command.add("--force-device-scale-factor=" + DEVICE_SCALE);
			command.add("--virtual-time-budget=" + virtualTimeBudgetMs);
			command.add("--screenshot=" + outputPath.toString());
			command.add("--user-data-dir=" + browserProfileDir.toString());
			command.add(renderUrl);

			ProcessBuilder processBuilder = new ProcessBuilder(command);
			processBuilder.redirectErrorStream(true);
			process = processBuilder.start();

			Process currentProcess = process;
			logThread = new Thread(() -> consumeProcessOutput(currentProcess.getInputStream(), commandOutput),
					"browser-render-output");
			logThread.setDaemon(true);
			logThread.start();

			boolean finished = process.waitFor(effectiveWaitMs, TimeUnit.MILLISECONDS);
			if (!finished) {
				process.destroyForcibly();
				logger.warn(
						"Headless browser render timed out for pageId={} (timeoutMs={}, virtualTimeBudgetMs={}, processGraceMs={})",
						yearbookId, timeoutMs, virtualTimeBudgetMs, processGraceMs);
				return null;
			}

			if (logThread != null) {
				logThread.join(1000);
			}

			if (process.exitValue() != 0) {
				logger.warn("Headless browser render failed for pageId={} exitCode={} output={}",
						yearbookId, process.exitValue(), summarizeOutput(commandOutput));
				return null;
			}

			if (outputPath == null || !Files.exists(outputPath) || Files.size(outputPath) == 0) {
				logger.warn("Headless browser render finished without an output file for pageId={}", yearbookId);
				return null;
			}

			return renderImageOutput(outputPath);
		} catch (Exception e) {
			logger.warn("Headless browser render could not be completed for pageId={}", yearbookId, e);
			return null;
		} finally {
			if (process != null && process.isAlive()) {
				process.destroyForcibly();
			}
			if (browserProfileDir != null) {
				try {
					Files.walk(browserProfileDir)
							.sorted(java.util.Comparator.reverseOrder())
							.forEach(path -> {
								try {
									Files.deleteIfExists(path);
								} catch (IOException e) {
									logger.debug("Failed to delete temporary browser render path: {}", path, e);
								}
							});
				} catch (IOException e) {
					logger.debug("Failed to clean temporary browser render directory: {}", browserProfileDir, e);
				}
			} else if (outputPath != null) {
				try {
					Files.deleteIfExists(outputPath);
				} catch (IOException e) {
					logger.debug("Failed to delete temporary browser render output: {}", outputPath, e);
				}
			}
		}
	}

	public RenderedTextPreview renderTextPreview(String previewToken) {
		RenderedTextPreview workerPreview = renderTextPreviewWithWorker(previewToken);
		if (workerPreview != null) {
			return workerPreview;
		}

		return renderTextPreviewOnce(previewToken);
	}

	private RenderedTextPreview renderTextPreviewWithWorker(String previewToken) {
		if (!enabled || previewToken == null || previewToken.isBlank()) {
			return null;
		}

		String browserPath = resolveBrowserPath();
		if (browserPath == null || browserPath.isBlank()) {
			return null;
		}

		String nodePath = resolveNodePath();
		if (nodePath == null || nodePath.isBlank()) {
			return null;
		}

		Path tempDir = null;
		try {
			TextPreviewWorker worker = getOrStartTextPreviewWorker(nodePath, browserPath);
			if (worker == null) {
				return null;
			}

			tempDir = Files.createTempDirectory("yearbook-text-preview-");
			Path outputPath = tempDir.resolve("preview.png");
			Path metricsPath = tempDir.resolve("preview-metrics.json");
			long virtualTimeBudgetMs = resolveVirtualTimeBudgetMs();
			long effectiveWaitMs = resolveEffectiveWaitMs(virtualTimeBudgetMs);

			boolean rendered = worker.render(new TextPreviewWorkerRequest(
					buildTextPreviewUrl(previewToken),
					outputPath,
					metricsPath,
					EDITOR_CSS_WIDTH,
					EDITOR_CSS_HEIGHT,
					TEXT_PREVIEW_DEVICE_SCALE,
					effectiveWaitMs,
					"#text-preview-target"));
			if (!rendered) {
				stopTextPreviewWorker();
				return null;
			}

			return loadRenderedTextPreview(outputPath, metricsPath, TEXT_PREVIEW_DEVICE_SCALE);
		} catch (Exception e) {
			logger.warn("Persistent text preview worker failed, falling back to one-shot render", e);
			stopTextPreviewWorker();
			return null;
		} finally {
			deleteDirectoryIfExists(tempDir, "temporary text preview render directory");
		}
	}

	private RenderedTextPreview renderTextPreviewOnce(String previewToken) {
		if (!enabled || previewToken == null || previewToken.isBlank()) {
			return null;
		}

		String browserPath = resolveBrowserPath();
		if (browserPath == null || browserPath.isBlank()) {
			logger.info("Skipping headless text preview render because no browser executable was found.");
			return null;
		}

		String nodePath = resolveNodePath();
		if (nodePath == null || nodePath.isBlank()) {
			logger.info("Skipping headless text preview render because no Node.js executable was found.");
			return null;
		}

		Path tempDir = null;
		Process process = null;
		StringBuilder commandOutput = new StringBuilder();
		Thread logThread = null;

		try {
			Path scriptPath = ensureScriptExtracted();
			tempDir = Files.createTempDirectory("yearbook-text-preview-");
			Path outputPath = tempDir.resolve("preview.png");
			Path metricsPath = tempDir.resolve("preview-metrics.json");
			long virtualTimeBudgetMs = resolveVirtualTimeBudgetMs();
			long effectiveWaitMs = resolveEffectiveWaitMs(virtualTimeBudgetMs);

			List<String> command = new ArrayList<>();
			command.add(nodePath);
			command.add(scriptPath.toString());
			command.add("--browser-path");
			command.add(browserPath);
			command.add("--url");
			command.add(buildTextPreviewUrl(previewToken));
			command.add("--output");
			command.add(outputPath.toString());
			command.add("--width");
			command.add(String.valueOf(EDITOR_CSS_WIDTH));
			command.add("--height");
			command.add(String.valueOf(EDITOR_CSS_HEIGHT));
			command.add("--device-scale");
			command.add(String.valueOf(TEXT_PREVIEW_DEVICE_SCALE));
			command.add("--timeout-ms");
			command.add(String.valueOf(effectiveWaitMs));
			command.add("--clip-selector");
			command.add("#text-preview-target");
			command.add("--metrics-output");
			command.add(metricsPath.toString());
			command.add("--transparent-background");
			command.add("true");

			ProcessBuilder processBuilder = new ProcessBuilder(command);
			processBuilder.redirectErrorStream(true);
			process = processBuilder.start();

			Process currentProcess = process;
			logThread = new Thread(() -> consumeProcessOutput(currentProcess.getInputStream(), commandOutput),
					"text-preview-render-script-output");
			logThread.setDaemon(true);
			logThread.start();

			boolean finished = process.waitFor(effectiveWaitMs + 2000L, TimeUnit.MILLISECONDS);
			if (!finished) {
				process.destroyForcibly();
				logger.warn("Script-based text preview render timed out output={}", summarizeOutput(commandOutput));
				return null;
			}

			if (logThread != null) {
				logThread.join(1000);
			}

			if (process.exitValue() != 0) {
				logger.warn("Script-based text preview render failed exitCode={} output={}",
						process.exitValue(), summarizeOutput(commandOutput));
				return null;
			}

			if (!Files.exists(outputPath) || Files.size(outputPath) == 0) {
				logger.warn("Script-based text preview render finished without an output file.");
				return null;
			}

			return loadRenderedTextPreview(outputPath, metricsPath, TEXT_PREVIEW_DEVICE_SCALE);
		} catch (Exception e) {
			logger.warn("Script-based text preview render could not be completed", e);
			return null;
		} finally {
			if (process != null && process.isAlive()) {
				process.destroyForcibly();
			}
			deleteDirectoryIfExists(tempDir, "temporary text preview render directory");
		}
	}

	private RenderedTextPreview loadRenderedTextPreview(Path outputPath, Path metricsPath, double deviceScale)
			throws IOException {
		if (outputPath == null || !Files.exists(outputPath) || Files.size(outputPath) == 0) {
			return null;
		}

		BufferedImage previewImage = ImageIO.read(outputPath.toFile());
		if (previewImage == null) {
			return null;
		}

		double cssWidth = previewImage.getWidth() / deviceScale;
		double cssHeight = previewImage.getHeight() / deviceScale;
		if (metricsPath != null && Files.exists(metricsPath) && Files.size(metricsPath) > 0) {
			JsonNode metricsNode = objectMapper.readTree(metricsPath.toFile());
			JsonNode rectNode = metricsNode.path("rect");
			if (rectNode.isObject()) {
				cssWidth = rectNode.path("width").asDouble(cssWidth);
				cssHeight = rectNode.path("height").asDouble(cssHeight);
			}
		}

		return new RenderedTextPreview(previewImage, cssWidth, cssHeight);
	}

	private TextPreviewWorker getOrStartTextPreviewWorker(String nodePath, String browserPath) throws IOException {
		TextPreviewWorker existingWorker = textPreviewWorker;
		if (existingWorker != null && existingWorker.isRunning()) {
			return existingWorker;
		}

		synchronized (textPreviewWorkerLock) {
			if (textPreviewWorker != null && textPreviewWorker.isRunning()) {
				return textPreviewWorker;
			}

			stopTextPreviewWorker();
			Path workerScriptPath = ensureTextPreviewWorkerScriptExtracted();
			TextPreviewWorker worker = new TextPreviewWorker(nodePath, browserPath, workerScriptPath);
			worker.start();
			textPreviewWorker = worker;
			return worker;
		}
	}

	private void stopTextPreviewWorker() {
		synchronized (textPreviewWorkerLock) {
			if (textPreviewWorker == null) {
				return;
			}

			textPreviewWorker.stop();
			textPreviewWorker = null;
		}
	}

	private void deleteDirectoryIfExists(Path directory, String label) {
		if (directory == null) {
			return;
		}

		try {
			Files.walk(directory)
					.sorted(java.util.Comparator.reverseOrder())
					.forEach(path -> {
						try {
							Files.deleteIfExists(path);
						} catch (IOException e) {
							logger.debug("Failed to delete {} path: {}", label, path, e);
						}
					});
		} catch (IOException e) {
			logger.debug("Failed to clean {}: {}", label, directory, e);
		}
	}

	private BufferedImage renderImageOutput(Path outputPath) throws IOException {
		BufferedImage rendered = ImageIO.read(outputPath.toFile());
		if (rendered == null) {
			return null;
		}

		rendered = cropRenderedViewportInsets(rendered);

		if (trimOuterWhiteMarginsEnabled) {
			BufferedImage trimmed = trimOuterWhiteMargins(rendered);
			if (trimmed != null) {
				rendered = trimmed;
			}
		}

		if (rendered.getWidth() == OUTPUT_WIDTH && rendered.getHeight() == OUTPUT_HEIGHT) {
			return rendered;
		}

		BufferedImage normalized = new BufferedImage(
				OUTPUT_WIDTH,
				OUTPUT_HEIGHT,
				rendered.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
		java.awt.Graphics2D g2d = normalized.createGraphics();
		try {
			g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
					java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);
			g2d.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING,
					java.awt.RenderingHints.VALUE_RENDER_QUALITY);
			g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING,
					java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
			g2d.drawImage(rendered, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, null);
		} finally {
			g2d.dispose();
		}
		return normalized;
	}

	private BufferedImage cropRenderedViewportInsets(BufferedImage rendered) {
		if (rendered == null) {
			return null;
		}

		if (rendered.getWidth() == OUTPUT_WIDTH && rendered.getHeight() == OUTPUT_HEIGHT) {
			return rendered;
		}

		if (rendered.getWidth() < OUTPUT_WIDTH || rendered.getHeight() < OUTPUT_HEIGHT) {
			return rendered;
		}

		BufferedImage cropped = new BufferedImage(
				OUTPUT_WIDTH,
				OUTPUT_HEIGHT,
				rendered.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
		java.awt.Graphics2D g2d = cropped.createGraphics();
		try {
			g2d.drawImage(rendered, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT, null);
		} finally {
			g2d.dispose();
		}
		return cropped;
	}

	private BufferedImage renderPageWithBrowserScript(Long yearbookId, String browserPath, String renderUrl) {
		String nodePath = resolveNodePath();
		if (nodePath == null || nodePath.isBlank()) {
			logger.debug("Skipping script-based headless render because Node.js executable was not found.");
			return null;
		}

		Path tempDir = null;
		Process process = null;
		StringBuilder commandOutput = new StringBuilder();
		Thread logThread = null;

		try {
			Path scriptPath = ensureScriptExtracted();
			tempDir = Files.createTempDirectory("yearbook-browser-script-");
			Path outputPath = tempDir.resolve("render.png");
			long virtualTimeBudgetMs = resolveVirtualTimeBudgetMs();
			long effectiveWaitMs = resolveEffectiveWaitMs(virtualTimeBudgetMs);

			List<String> command = new ArrayList<>();
			command.add(nodePath);
			command.add(scriptPath.toString());
			command.add("--browser-path");
			command.add(browserPath);
			command.add("--url");
			command.add(renderUrl);
			command.add("--output");
			command.add(outputPath.toString());
			command.add("--width");
			command.add(String.valueOf(CSS_WIDTH));
			command.add("--height");
			command.add(String.valueOf(CSS_HEIGHT));
			command.add("--device-scale");
			command.add(String.valueOf(DEVICE_SCALE));
			command.add("--timeout-ms");
			command.add(String.valueOf(effectiveWaitMs));
			command.add("--clip-selector");
			command.add("#page-preview");

			ProcessBuilder processBuilder = new ProcessBuilder(command);
			processBuilder.redirectErrorStream(true);
			process = processBuilder.start();

			Process currentProcess = process;
			logThread = new Thread(() -> consumeProcessOutput(currentProcess.getInputStream(), commandOutput),
					"browser-render-script-output");
			logThread.setDaemon(true);
			logThread.start();

			boolean finished = process.waitFor(effectiveWaitMs + 2000L, TimeUnit.MILLISECONDS);
			if (!finished) {
				process.destroyForcibly();
				logger.warn("Script-based headless render timed out for pageId={} output={}",
						yearbookId, summarizeOutput(commandOutput));
				return null;
			}

			if (logThread != null) {
				logThread.join(1000);
			}

			if (process.exitValue() != 0) {
				logger.warn("Script-based headless render failed for pageId={} exitCode={} output={}",
						yearbookId, process.exitValue(), summarizeOutput(commandOutput));
				return null;
			}

			if (!Files.exists(outputPath) || Files.size(outputPath) == 0) {
				logger.warn("Script-based headless render finished without an output file for pageId={}", yearbookId);
				return null;
			}

			logger.info("Preferred final render: headless browser original-asset render for pageId={}", yearbookId);
			return renderImageOutput(outputPath);
		} catch (Exception e) {
			logger.warn("Script-based headless render could not be completed for pageId={}", yearbookId, e);
			return null;
		} finally {
			if (process != null && process.isAlive()) {
				process.destroyForcibly();
			}
			if (tempDir != null) {
				try {
					Files.walk(tempDir)
							.sorted(java.util.Comparator.reverseOrder())
							.forEach(path -> {
								try {
									Files.deleteIfExists(path);
								} catch (IOException e) {
									logger.debug("Failed to delete temporary browser script render path: {}", path, e);
								}
							});
				} catch (IOException e) {
					logger.debug("Failed to clean temporary browser script render directory: {}", tempDir, e);
				}
			}
		}
	}

	private long resolveVirtualTimeBudgetMs() {
		long safeTimeoutMs = Math.max(virtualTimeBudgetMinMs + processGraceMs + 1000L, timeoutMs);
		long availableBudgetMs = Math.max(virtualTimeBudgetMinMs, safeTimeoutMs - processGraceMs);
		long requestedBudgetMs = Math.max(virtualTimeBudgetMinMs, configuredVirtualTimeBudgetMs);
		long effectiveBudgetMs = Math.min(requestedBudgetMs, availableBudgetMs);

		if (effectiveBudgetMs != requestedBudgetMs) {
			logger.debug(
					"Clamped headless virtual time budget from {}ms to {}ms to fit timeoutMs={} and processGraceMs={}",
					requestedBudgetMs, effectiveBudgetMs, timeoutMs, processGraceMs);
		}

		return effectiveBudgetMs;
	}

	private long resolveEffectiveWaitMs(long virtualTimeBudgetMs) {
		long minimumWaitMs = virtualTimeBudgetMs + Math.max(1000L, processGraceMs);
		return Math.max(timeoutMs, minimumWaitMs);
	}

	private BufferedImage trimOuterWhiteMargins(BufferedImage image) {
		if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
			return image;
		}

		int width = image.getWidth();
		int height = image.getHeight();
		int left = 0;
		int right = width - 1;
		int top = 0;
		int bottom = height - 1;
		int maxHorizontalTrim = Math.max(12, width / 12);
		int maxVerticalTrim = Math.max(12, height / 12);

		while (left < right && left < maxHorizontalTrim && isMostlyWhiteColumn(image, left)) {
			left++;
		}
		while (right > left && (width - 1 - right) < maxHorizontalTrim && isMostlyWhiteColumn(image, right)) {
			right--;
		}
		while (top < bottom && top < maxVerticalTrim && isMostlyWhiteRow(image, top)) {
			top++;
		}
		while (bottom > top && (height - 1 - bottom) < maxVerticalTrim && isMostlyWhiteRow(image, bottom)) {
			bottom--;
		}

		if (left == 0 && top == 0 && right == width - 1 && bottom == height - 1) {
			return image;
		}

		int croppedWidth = right - left + 1;
		int croppedHeight = bottom - top + 1;
		if (croppedWidth <= 0 || croppedHeight <= 0) {
			return image;
		}

		BufferedImage cropped = new BufferedImage(
				croppedWidth,
				croppedHeight,
				image.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
		java.awt.Graphics2D g2d = cropped.createGraphics();
		try {
			g2d.drawImage(image, 0, 0, croppedWidth, croppedHeight, left, top, right + 1, bottom + 1, null);
		} finally {
			g2d.dispose();
		}
		return cropped;
	}

	private boolean isMostlyWhiteColumn(BufferedImage image, int x) {
		int step = Math.max(1, image.getHeight() / 300);
		for (int y = 0; y < image.getHeight(); y += step) {
			if (!isNearWhite(image.getRGB(x, y))) {
				return false;
			}
		}
		return true;
	}

	private boolean isMostlyWhiteRow(BufferedImage image, int y) {
		int step = Math.max(1, image.getWidth() / 300);
		for (int x = 0; x < image.getWidth(); x += step) {
			if (!isNearWhite(image.getRGB(x, y))) {
				return false;
			}
		}
		return true;
	}

	private boolean isNearWhite(int argb) {
		int alpha = (argb >>> 24) & 0xFF;
		if (alpha < 10) {
			return true;
		}

		int red = (argb >>> 16) & 0xFF;
		int green = (argb >>> 8) & 0xFF;
		int blue = argb & 0xFF;
		return red >= 250 && green >= 250 && blue >= 250;
	}

	private void consumeProcessOutput(InputStream inputStream, StringBuilder buffer) {
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
			String line;
			while ((line = reader.readLine()) != null) {
				buffer.append(line).append(System.lineSeparator());
			}
		} catch (IOException e) {
			logger.debug("Failed to read headless browser process output", e);
		}
	}

	private String buildRenderUrl(Long yearbookId, String token) {
		return resolveBaseUrl()
				+ "/render/browser/page?yearbookId="
				+ yearbookId
				+ "&token="
				+ java.net.URLEncoder.encode(token, StandardCharsets.UTF_8);
	}

	private String buildTextPreviewUrl(String token) {
		return resolveBaseUrl()
				+ "/render/browser/text-preview?token="
				+ java.net.URLEncoder.encode(token, StandardCharsets.UTF_8);
	}

	private boolean canReachRenderEndpoint(Long yearbookId, String token) {
		HttpURLConnection connection = null;
		try {
			String healthUrl = resolveBaseUrl()
					+ "/render/browser/health?yearbookId="
					+ yearbookId
					+ "&token="
					+ java.net.URLEncoder.encode(token, StandardCharsets.UTF_8);
			connection = (HttpURLConnection) new URL(healthUrl).openConnection();
			connection.setRequestMethod("GET");
			connection.setConnectTimeout(healthTimeoutMs);
			connection.setReadTimeout(healthTimeoutMs);
			int responseCode = connection.getResponseCode();
			if (responseCode == HttpURLConnection.HTTP_OK) {
				return true;
			}

			logger.debug("Headless render health check returned status {} for pageId={}", responseCode, yearbookId);
			return false;
		} catch (IOException e) {
			logger.debug("Headless render health check failed for pageId={}", yearbookId, e);
			return false;
		} finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	private String resolveBaseUrl() {
		if (configuredBaseUrl != null && !configuredBaseUrl.isBlank()) {
			return trimTrailingSlash(configuredBaseUrl.trim());
		}

		String normalizedContextPath = contextPath == null ? "" : contextPath.trim();
		if (normalizedContextPath.equals("/")) {
			normalizedContextPath = "";
		} else if (!normalizedContextPath.isBlank() && !normalizedContextPath.startsWith("/")) {
			normalizedContextPath = "/" + normalizedContextPath;
		}

		return "http://127.0.0.1:" + serverPort + normalizedContextPath;
	}

	private String resolveNodePath() {
		if (configuredNodePath != null && !configuredNodePath.isBlank()) {
			return configuredNodePath.trim();
		}

		String[] envCandidates = {
				System.getenv("NODE_BIN"),
				System.getenv("NODE_PATH")
		};
		for (String candidate : envCandidates) {
			if (candidate != null && !candidate.isBlank() && Files.exists(Path.of(candidate))) {
				return candidate;
			}
		}

		return "node";
	}

	private int resolveBrowserWindowWidth() {
		return CSS_WIDTH + Math.max(0, browserWindowInsetWidth);
	}

	private int resolveBrowserWindowHeight() {
		return CSS_HEIGHT + Math.max(0, browserWindowInsetHeight);
	}

	private String resolveBrowserPath() {
		if (configuredBrowserPath != null && !configuredBrowserPath.isBlank()) {
			return configuredBrowserPath.trim();
		}

		String[] envCandidates = {
				System.getenv("CHROME_BIN"),
				System.getenv("EDGE_BIN"),
				System.getenv("BROWSER_BIN")
		};
		for (String candidate : envCandidates) {
			if (candidate != null && !candidate.isBlank() && Files.exists(Path.of(candidate))) {
				return candidate;
			}
		}

		List<String> candidates = new ArrayList<>();
		addWindowsCandidate(candidates, System.getenv("ProgramFiles"), "Google\\Chrome\\Application\\chrome.exe");
		addWindowsCandidate(candidates, System.getenv("ProgramFiles(x86)"), "Google\\Chrome\\Application\\chrome.exe");
		addWindowsCandidate(candidates, System.getenv("ProgramFiles(x86)"), "Microsoft\\Edge\\Application\\msedge.exe");
		addWindowsCandidate(candidates, System.getenv("ProgramFiles"), "Microsoft\\Edge\\Application\\msedge.exe");
		candidates.add("chrome");
		candidates.add("msedge");

		for (String candidate : candidates) {
			if (!candidate.contains("\\") && !candidate.contains("/")) {
				return candidate;
			}

			Path path = Path.of(candidate);
			if (Files.exists(path)) {
				return path.toString();
			}
		}

		return null;
	}

	private void addWindowsCandidate(List<String> candidates, String baseDir, String suffix) {
		if (baseDir == null || baseDir.isBlank()) {
			return;
		}

		candidates.add(Path.of(baseDir, suffix.split("\\\\")).toString());
	}

	private Path ensureScriptExtracted() throws IOException {
		Path currentPath = extractedScriptPath;
		if (currentPath != null && Files.exists(currentPath)) {
			return currentPath;
		}

		synchronized (this) {
			if (extractedScriptPath != null && Files.exists(extractedScriptPath)) {
				return extractedScriptPath;
			}

			ClassPathResource resource = new ClassPathResource("browser/browser-render.mjs");
			Path tempFile = Files.createTempFile("yearbook-browser-render-", ".mjs");
			try (InputStream inputStream = resource.getInputStream()) {
				Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
			}
			extractedScriptPath = tempFile;
			return tempFile;
		}
	}

	private Path ensureTextPreviewWorkerScriptExtracted() throws IOException {
		Path currentPath = extractedTextPreviewWorkerScriptPath;
		if (currentPath != null && Files.exists(currentPath)) {
			return currentPath;
		}

		synchronized (this) {
			if (extractedTextPreviewWorkerScriptPath != null && Files.exists(extractedTextPreviewWorkerScriptPath)) {
				return extractedTextPreviewWorkerScriptPath;
			}

			ClassPathResource resource = new ClassPathResource("browser/browser-text-preview-worker.mjs");
			Path tempFile = Files.createTempFile("yearbook-browser-text-preview-worker-", ".mjs");
			try (InputStream inputStream = resource.getInputStream()) {
				Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
			}
			extractedTextPreviewWorkerScriptPath = tempFile;
			return tempFile;
		}
	}

	private String summarizeOutput(StringBuilder output) {
		if (output == null || output.isEmpty()) {
			return "";
		}

		String normalized = output.toString().replace("\r", "").trim();
		if (normalized.length() <= 5000) {
			return normalized;
		}

		return normalized.substring(normalized.length() - 5000);
	}

	private String trimTrailingSlash(String value) {
		String normalized = value;
		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}
		return normalized;
	}

	private record TextPreviewWorkerRequest(
			String url,
			Path outputPath,
			Path metricsPath,
			int width,
			int height,
			double deviceScale,
			long timeoutMs,
			String clipSelector) {
	}

	private final class TextPreviewWorker {

		private static final String READY_TYPE = "ready";
		private static final String RESULT_TYPE = "result";
		private static final String STREAM_CLOSED = "__STREAM_CLOSED__";

		private final String nodePath;
		private final String browserPath;
		private final Path scriptPath;
		private final LinkedBlockingQueue<String> stdoutLines = new LinkedBlockingQueue<>();
		private Process process;
		private BufferedWriter writer;
		private Thread stdoutThread;
		private Thread stderrThread;
		private final StringBuilder stderrOutput = new StringBuilder();
		private long requestSequence = 0L;

		private TextPreviewWorker(String nodePath, String browserPath, Path scriptPath) {
			this.nodePath = nodePath;
			this.browserPath = browserPath;
			this.scriptPath = scriptPath;
		}

		private synchronized void start() throws IOException {
			if (isRunning()) {
				return;
			}

			stdoutLines.clear();
			stderrOutput.setLength(0);

			List<String> command = new ArrayList<>();
			command.add(nodePath);
			command.add(scriptPath.toString());
			command.add("--browser-path");
			command.add(browserPath);
			command.add("--width");
			command.add(String.valueOf(EDITOR_CSS_WIDTH));
			command.add("--height");
			command.add(String.valueOf(EDITOR_CSS_HEIGHT));
			command.add("--device-scale");
			command.add(String.valueOf(TEXT_PREVIEW_DEVICE_SCALE));

			ProcessBuilder processBuilder = new ProcessBuilder(command);
			processBuilder.redirectErrorStream(false);
			process = processBuilder.start();
			writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
			startStdoutThread(process);
			startStderrThread(process);
			awaitReady();
		}

		private synchronized boolean render(TextPreviewWorkerRequest request) {
			if (!isRunning() || request == null) {
				return false;
			}

			try {
				long requestId = ++requestSequence;
				Map<String, Object> payload = new HashMap<>();
				payload.put("requestId", requestId);
				payload.put("url", request.url());
				payload.put("output", request.outputPath().toString());
				payload.put("metricsOutput", request.metricsPath().toString());
				payload.put("width", request.width());
				payload.put("height", request.height());
				payload.put("deviceScale", request.deviceScale());
				payload.put("timeoutMs", request.timeoutMs());
				payload.put("clipSelector", request.clipSelector());
				payload.put("transparentBackground", true);

				writer.write(objectMapper.writeValueAsString(payload));
				writer.newLine();
				writer.flush();

				JsonNode response = awaitResponse(RESULT_TYPE, request.timeoutMs() + 5000L);
				if (response == null) {
					logger.warn("Text preview worker timed out waiting for requestId={}", requestId);
					return false;
				}

				if (response.path("requestId").asLong(-1L) != requestId) {
					logger.warn("Text preview worker response mismatch. expectedRequestId={} actualResponse={}",
							requestId, response.toString());
					return false;
				}

				if (!response.path("success").asBoolean(false)) {
					logger.warn("Text preview worker returned an error for requestId={}: {}",
							requestId, response.path("error").asText("unknown error"));
					return false;
				}

				return true;
			} catch (Exception e) {
				logger.warn("Text preview worker request failed", e);
				return false;
			}
		}

		private synchronized boolean isRunning() {
			return process != null && process.isAlive();
		}

		private synchronized void stop() {
			if (process == null) {
				return;
			}

			try {
				if (writer != null) {
					writer.close();
				}
			} catch (IOException e) {
				logger.debug("Failed to close text preview worker stdin", e);
			}

			if (process.isAlive()) {
				process.destroy();
				try {
					if (!process.waitFor(1500, TimeUnit.MILLISECONDS)) {
						process.destroyForcibly();
					}
				} catch (InterruptedException e) {
					Thread.currentThread().interrupt();
					process.destroyForcibly();
				}
			}

			if (stdoutThread != null) {
				stdoutThread.interrupt();
			}
			if (stderrThread != null) {
				stderrThread.interrupt();
			}

			process = null;
			writer = null;
			stdoutThread = null;
			stderrThread = null;
			stdoutLines.clear();
		}

		private void startStdoutThread(Process currentProcess) {
			stdoutThread = new Thread(() -> {
				try (BufferedReader reader = new BufferedReader(
						new InputStreamReader(currentProcess.getInputStream(), StandardCharsets.UTF_8))) {
					String line;
					while ((line = reader.readLine()) != null) {
						stdoutLines.offer(line);
					}
				} catch (IOException e) {
					logger.debug("Text preview worker stdout reader stopped", e);
				} finally {
					stdoutLines.offer(STREAM_CLOSED);
				}
			}, "text-preview-worker-stdout");
			stdoutThread.setDaemon(true);
			stdoutThread.start();
		}

		private void startStderrThread(Process currentProcess) {
			stderrThread = new Thread(() -> consumeProcessOutput(currentProcess.getErrorStream(), stderrOutput),
					"text-preview-worker-stderr");
			stderrThread.setDaemon(true);
			stderrThread.start();
		}

		private void awaitReady() throws IOException {
			try {
				JsonNode ready = awaitResponse(READY_TYPE, 20000L);
				if (ready == null) {
					throw new IOException("Text preview worker did not become ready. stderr=" + summarizeOutput(stderrOutput));
				}
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw new IOException("Interrupted while waiting for text preview worker startup", e);
			}
		}

		private JsonNode awaitResponse(String expectedType, long timeoutMs) throws IOException, InterruptedException {
			long deadline = System.currentTimeMillis() + Math.max(timeoutMs, 1000L);
			while (System.currentTimeMillis() < deadline) {
				long remaining = Math.max(1L, deadline - System.currentTimeMillis());
				String line = stdoutLines.poll(remaining, TimeUnit.MILLISECONDS);
				if (line == null) {
					continue;
				}

				if (STREAM_CLOSED.equals(line)) {
					throw new IOException("Text preview worker stream closed. stderr=" + summarizeOutput(stderrOutput));
				}

				JsonNode node = objectMapper.readTree(line);
				if (expectedType.equals(node.path("type").asText())) {
					return node;
				}
			}

			return null;
		}
	}

	public record RenderedTextPreview(BufferedImage image, double cssWidth, double cssHeight) {
	}
}
