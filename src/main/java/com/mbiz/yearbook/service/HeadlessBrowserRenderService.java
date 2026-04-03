package com.mbiz.yearbook.service;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class HeadlessBrowserRenderService {

	private static final Logger logger = LoggerFactory.getLogger(HeadlessBrowserRenderService.class);

	private static final int CSS_WIDTH = 2621;
	private static final int CSS_HEIGHT = 3371;
	private static final int DEVICE_SCALE = 1;
	private static final int OUTPUT_WIDTH = CSS_WIDTH * DEVICE_SCALE;
	private static final int OUTPUT_HEIGHT = CSS_HEIGHT * DEVICE_SCALE;

	private final BrowserRenderTokenService browserRenderTokenService;

	@Value("${server.port:8080}")
	private int serverPort;

	@Value("${server.servlet.context-path:}")
	private String contextPath;

	@Value("${headless.render.enabled:true}")
	private boolean enabled;

	@Value("${headless.render.timeout-ms:45000}")
	private long timeoutMs;

	@Value("${headless.render.health-timeout-ms:1500}")
	private int healthTimeoutMs;

	@Value("${headless.render.base-url:}")
	private String configuredBaseUrl;

	@Value("${headless.render.browser-path:}")
	private String configuredBrowserPath;

	private volatile Path extractedScriptPath;

	public HeadlessBrowserRenderService(BrowserRenderTokenService browserRenderTokenService) {
		this.browserRenderTokenService = browserRenderTokenService;
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
			browserProfileDir = Files.createTempDirectory("yearbook-browser-profile-");
			outputPath = browserProfileDir.resolve("render.png");
			long virtualTimeBudgetMs = Math.max(6000L, Math.min(timeoutMs - 3000L, 15000L));

			List<String> command = new ArrayList<>();
			command.add(browserPath);
			command.add("--headless=new");
			command.add("--disable-gpu");
			command.add("--hide-scrollbars");
			command.add("--mute-audio");
			command.add("--no-first-run");
			command.add("--no-default-browser-check");
			command.add("--run-all-compositor-stages-before-draw");
			command.add("--window-size=" + CSS_WIDTH + "," + CSS_HEIGHT);
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

			boolean finished = process.waitFor(timeoutMs + 5000, TimeUnit.MILLISECONDS);
			if (!finished) {
				process.destroyForcibly();
				logger.warn("Headless browser render timed out for pageId={}", yearbookId);
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

	private BufferedImage renderImageOutput(Path outputPath) throws IOException {
		BufferedImage rendered = ImageIO.read(outputPath.toFile());
		if (rendered == null) {
			return null;
		}

		BufferedImage trimmed = trimOuterWhiteMargins(rendered);
		if (trimmed != null) {
			rendered = trimmed;
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
		int nonWhiteSamples = 0;
		for (int y = 0; y < image.getHeight(); y += step) {
			if (!isNearWhite(image.getRGB(x, y))) {
				nonWhiteSamples++;
				if (nonWhiteSamples >= 3) {
					return false;
				}
			}
		}
		return true;
	}

	private boolean isMostlyWhiteRow(BufferedImage image, int y) {
		int step = Math.max(1, image.getWidth() / 300);
		int nonWhiteSamples = 0;
		for (int x = 0; x < image.getWidth(); x += step) {
			if (!isNearWhite(image.getRGB(x, y))) {
				nonWhiteSamples++;
				if (nonWhiteSamples >= 3) {
					return false;
				}
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
		return red >= 245 && green >= 245 && blue >= 245;
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
}
