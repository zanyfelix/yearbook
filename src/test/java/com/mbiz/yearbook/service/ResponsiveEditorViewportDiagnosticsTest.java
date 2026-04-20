package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.YearbookRepository;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT,
		properties = {
				"server.port=19080",
				"headless.render.base-url=http://127.0.0.1:19080"
		})
class ResponsiveEditorViewportDiagnosticsTest {

	private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
	private static final int NORMALIZED_WIDTH = 786;
	private static final int NORMALIZED_HEIGHT = 1011;
	private static final Path REPORT_ROOT = Path.of("target", "responsive-editor-preview");
	private static final Path CAPTURE_SCRIPT = Path.of("src", "main", "resources", "browser", "browser-render.mjs");
	private static final CaptureScenario FINAL_RENDER_CAPTURE = new CaptureScenario("final-render-dom", 2621, 3371, 1.0);
	private static final List<CaptureScenario> SCENARIOS = List.of(
			new CaptureScenario("1920x1080-100", 1920, 1080, 1.0),
			new CaptureScenario("1366x768-100", 1366, 768, 1.0),
			new CaptureScenario("2560x1440-100", 2560, 1440, 1.0),
			new CaptureScenario("1920x1080-125", 1920, 1080, 1.25),
			new CaptureScenario("1920x1080-150", 1920, 1080, 1.5));

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private BrowserRenderTokenService browserRenderTokenService;

	@Autowired
	private HeadlessBrowserRenderService headlessBrowserRenderService;

	@Test
	void shouldExportResponsiveEditorPreviewDiagnostics() throws Exception {
		assertTrue(Files.exists(CAPTURE_SCRIPT), "Browser capture script not found: " + CAPTURE_SCRIPT.toAbsolutePath());
		Files.createDirectories(REPORT_ROOT);

		List<Yearbook> recentPages = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::hasDesignData)
				.limit(30)
				.toList();
		assertFalse(recentPages.isEmpty(), "No recent design pages were found.");

		Map<String, Yearbook> selectedPages = new LinkedHashMap<>();
		recentPages.stream()
				.filter(this::hasTextBoxes)
				.findFirst()
				.ifPresent(page -> selectedPages.put("text-page", page));
		recentPages.stream()
				.filter(page -> !hasTextBoxes(page))
				.findFirst()
				.ifPresent(page -> selectedPages.put("non-text-page", page));

		assertFalse(selectedPages.isEmpty(), "No suitable pages were found for responsive diagnostics.");

		List<String> summaries = new ArrayList<>();
		for (Map.Entry<String, Yearbook> entry : selectedPages.entrySet()) {
			summaries.add(runDiagnosticsForPage(entry.getKey(), entry.getValue()));
		}

		Files.writeString(REPORT_ROOT.resolve("summary.txt"), String.join(System.lineSeparator(), summaries),
				StandardCharsets.UTF_8);
	}

	private String runDiagnosticsForPage(String label, Yearbook page) throws Exception {
		Long pageId = page.getId();
		Path pageDir = REPORT_ROOT.resolve(label + "-page-" + pageId);
		Files.createDirectories(pageDir);
		Files.writeString(pageDir.resolve("design-data.json"),
				page.getDesignData() == null ? "" : page.getDesignData(),
				StandardCharsets.UTF_8);

		BufferedImage finalRender = headlessBrowserRenderService.renderPage(pageId);
		assertNotNull(finalRender, "Headless browser final render returned null for pageId=" + pageId);
		Path finalRenderPath = pageDir.resolve("final-render.png");
		ImageIO.write(finalRender, "png", finalRenderPath.toFile());

		BufferedImage normalizedFinal = scaleImage(finalRender, NORMALIZED_WIDTH, NORMALIZED_HEIGHT);
		Path normalizedFinalPath = pageDir.resolve("final-render-normalized.png");
		ImageIO.write(normalizedFinal, "png", normalizedFinalPath.toFile());

		String token = browserRenderTokenService.issueToken(pageId);
		String editorPreviewUrl = "http://127.0.0.1:19080/render/browser/editor-preview?yearbookId=" + pageId
				+ "&token=" + java.net.URLEncoder.encode(token, StandardCharsets.UTF_8);
		String finalRenderUrl = "http://127.0.0.1:19080/render/browser/page?yearbookId=" + pageId
				+ "&token=" + java.net.URLEncoder.encode(token, StandardCharsets.UTF_8);
		PreviewMetrics finalRenderMetrics = captureMetricsOnly(pageDir, finalRenderUrl, FINAL_RENDER_CAPTURE);

		Map<String, CaptureArtifact> captures = new LinkedHashMap<>();
		for (CaptureScenario scenario : SCENARIOS) {
			captures.put(scenario.name(), captureScenario(pageDir, editorPreviewUrl, scenario));
		}

		CaptureArtifact baseline = captures.get("1920x1080-100");
		assertNotNull(baseline, "Baseline editor preview capture was not created.");

		List<String> lines = new ArrayList<>();
		lines.add("pageId=" + pageId + " label=" + label);
		lines.add("editorPreviewUrl=" + editorPreviewUrl);
		lines.add("finalRenderUrl=" + finalRenderUrl);
		lines.add("baselineLayout=" + summarizeLayoutCounts(baseline.metrics().layoutElements()));
		lines.add("finalRenderLayout=" + summarizeLayoutCounts(finalRenderMetrics.layoutElements()));

		for (CaptureScenario scenario : SCENARIOS) {
			CaptureArtifact artifact = captures.get(scenario.name());
			DiffMetrics visualVsBaseline = diff(baseline.normalizedImage(), artifact.normalizedImage());
			DiffMetrics visualVsFinal = diff(normalizedFinal, artifact.normalizedImage());
			GeometryDiff layoutVsBaseline = compareLayoutGeometry(baseline.metrics(), artifact.metrics(), null);
			GeometryDiff layoutVsFinal = compareLayoutGeometry(finalRenderMetrics, artifact.metrics(), null);
			GeometryDiff textVsBaseline = compareLayoutGeometry(baseline.metrics(), artifact.metrics(), "text");
			GeometryDiff textVsFinal = compareLayoutGeometry(finalRenderMetrics, artifact.metrics(), "text");

			String safeName = sanitizeFileName(scenario.name());
			ImageIO.write(visualVsBaseline.heatmap(), "png", pageDir.resolve(safeName + "-vs-baseline-diff.png").toFile());
			ImageIO.write(visualVsFinal.heatmap(), "png", pageDir.resolve(safeName + "-vs-final-diff.png").toFile());

			lines.add(String.format(Locale.ROOT,
					"scenario=%s viewport=%dx%d zoom=%.2f preview=%dx%d bgCrop=%dx%d layout=%s visualVsBaseline(mean=%.4f mismatch=%.4f) visualVsFinal(mean=%.4f mismatch=%.4f) layoutVsBaseline(mean=%.4f max=%.4f compared=%d missing=%d) layoutVsFinal(mean=%.4f max=%.4f compared=%d missing=%d) textVsBaseline(mean=%.4f max=%.4f compared=%d missing=%d) textVsFinal(mean=%.4f max=%.4f compared=%d missing=%d)",
					scenario.name(),
					scenario.viewportWidth(),
					scenario.viewportHeight(),
					scenario.pageScaleFactor(),
					artifact.previewWidth(),
					artifact.previewHeight(),
					artifact.backgroundWidth(),
					artifact.backgroundHeight(),
					summarizeLayoutCounts(artifact.metrics().layoutElements()),
					visualVsBaseline.meanDiff(),
					visualVsBaseline.mismatchRatio(),
					visualVsFinal.meanDiff(),
					visualVsFinal.mismatchRatio(),
					layoutVsBaseline.meanDelta(),
					layoutVsBaseline.maxDelta(),
					layoutVsBaseline.comparedElements(),
					layoutVsBaseline.missingElements(),
					layoutVsFinal.meanDelta(),
					layoutVsFinal.maxDelta(),
					layoutVsFinal.comparedElements(),
					layoutVsFinal.missingElements(),
					textVsBaseline.meanDelta(),
					textVsBaseline.maxDelta(),
					textVsBaseline.comparedElements(),
					textVsBaseline.missingElements(),
					textVsFinal.meanDelta(),
					textVsFinal.maxDelta(),
					textVsFinal.comparedElements(),
					textVsFinal.missingElements()));
		}

		Path summaryPath = pageDir.resolve("summary.txt");
		Files.writeString(summaryPath, String.join(System.lineSeparator(), lines), StandardCharsets.UTF_8);
		System.out.println(String.join(System.lineSeparator(), lines));
		return "pageDir=" + pageDir.toAbsolutePath() + System.lineSeparator() + String.join(System.lineSeparator(), lines);
	}

	private CaptureArtifact captureScenario(Path pageDir, String editorPreviewUrl, CaptureScenario scenario) throws Exception {
		String safeName = sanitizeFileName(scenario.name());
		Path rawPath = pageDir.resolve(safeName + "-raw.png");
		Path metricsPath = pageDir.resolve(safeName + "-metrics.json");
		runCaptureScript(editorPreviewUrl, rawPath, metricsPath, scenario, false);

		BufferedImage rawImage = ImageIO.read(rawPath.toFile());
		assertNotNull(rawImage, "Failed to read editor preview screenshot: " + rawPath);
		PreviewMetrics metrics = readMetrics(metricsPath);
		BufferedImage backgroundCrop = cropToBackground(rawImage, metrics);
		Path backgroundCropPath = pageDir.resolve(safeName + "-background.png");
		ImageIO.write(backgroundCrop, "png", backgroundCropPath.toFile());

		BufferedImage normalized = scaleImage(backgroundCrop, NORMALIZED_WIDTH, NORMALIZED_HEIGHT);
		Path normalizedPath = pageDir.resolve(safeName + "-normalized.png");
		ImageIO.write(normalized, "png", normalizedPath.toFile());

		return new CaptureArtifact(scenario, (int) Math.round(metrics.rectWidth()), (int) Math.round(metrics.rectHeight()),
				backgroundCrop.getWidth(), backgroundCrop.getHeight(), normalized, metrics);
	}

	private PreviewMetrics captureMetricsOnly(Path pageDir, String url, CaptureScenario scenario) throws Exception {
		String safeName = sanitizeFileName(scenario.name());
		Path metricsPath = pageDir.resolve(safeName + "-metrics.json");
		runCaptureScript(url, null, metricsPath, scenario, true);
		return readMetrics(metricsPath);
	}

	private void runCaptureScript(String url, Path outputPath, Path metricsPath, CaptureScenario scenario, boolean metricsOnly) throws Exception {
		String nodePath = resolveNodePath();
		String browserPath = resolveBrowserPath();
		assertNotNull(nodePath, "Node.js executable could not be resolved.");
		assertNotNull(browserPath, "Browser executable could not be resolved.");

		List<String> command = new ArrayList<>();
		command.add(nodePath);
		command.add(CAPTURE_SCRIPT.toAbsolutePath().toString());
		command.add("--browser-path");
		command.add(browserPath);
		command.add("--url");
		command.add(url);
		if (!metricsOnly) {
			assertNotNull(outputPath, "Output path is required when metricsOnly=false.");
			command.add("--output");
			command.add(outputPath.toAbsolutePath().toString());
		}
		command.add("--width");
		command.add(String.valueOf(scenario.viewportWidth()));
		command.add("--height");
		command.add(String.valueOf(scenario.viewportHeight()));
		command.add("--device-scale");
		command.add("1");
		command.add("--page-scale-factor");
		command.add(String.valueOf(scenario.pageScaleFactor()));
		command.add("--timeout-ms");
		command.add("120000");
		command.add("--clip-selector");
		command.add("#page-preview");
		command.add("--metrics-output");
		command.add(metricsPath.toAbsolutePath().toString());
		if (metricsOnly) {
			command.add("--metrics-only");
			command.add("true");
		}

		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.redirectErrorStream(true);
		Process process = processBuilder.start();

		ByteArrayOutputStream outputBuffer = new ByteArrayOutputStream();
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
			String line;
			while ((line = reader.readLine()) != null) {
				outputBuffer.write(line.getBytes(StandardCharsets.UTF_8));
				outputBuffer.write(System.lineSeparator().getBytes(StandardCharsets.UTF_8));
			}
		}

		int exitCode = process.waitFor();
		String commandOutput = outputBuffer.toString(StandardCharsets.UTF_8);
		assertTrue(exitCode == 0,
				"Capture script failed for scenario " + scenario.name() + " exitCode=" + exitCode + "\n" + commandOutput);
		if (!metricsOnly) {
			assertTrue(Files.exists(outputPath) && Files.size(outputPath) > 0,
					"Capture output was not created for scenario " + scenario.name());
		}
		assertTrue(Files.exists(metricsPath) && Files.size(metricsPath) > 0,
				"Capture metrics were not created for scenario " + scenario.name());
	}

	private PreviewMetrics readMetrics(Path metricsPath) throws IOException {
		JsonNode root = OBJECT_MAPPER.readTree(Files.readString(metricsPath, StandardCharsets.UTF_8));
		JsonNode rect = root.path("rect");
		JsonNode backgroundRect = root.path("backgroundRect");
		List<LayoutElementMetrics> layoutElements = new ArrayList<>();
		JsonNode layoutNode = root.path("layoutElements");
		if (layoutNode.isArray()) {
			for (JsonNode elementNode : layoutNode) {
				int index = elementNode.path("index").asInt(-1);
				String type = elementNode.path("type").asText("unknown");
				String className = elementNode.path("className").asText("");
				RelativeRect relativeRect = readRelativeRect(elementNode.path("relativeToBackground"));
				layoutElements.add(new LayoutElementMetrics(type + ":" + index, index, type, className, relativeRect));
			}
		}

		return new PreviewMetrics(
				rect.path("x").asDouble(),
				rect.path("y").asDouble(),
				rect.path("width").asDouble(),
				rect.path("height").asDouble(),
				backgroundRect.path("x").asDouble(rect.path("x").asDouble()),
				backgroundRect.path("y").asDouble(rect.path("y").asDouble()),
				backgroundRect.path("width").asDouble(rect.path("width").asDouble()),
				backgroundRect.path("height").asDouble(rect.path("height").asDouble()),
				List.copyOf(layoutElements));
	}

	private RelativeRect readRelativeRect(JsonNode node) {
		if (node == null || node.isMissingNode() || node.isNull()) {
			return null;
		}

		return new RelativeRect(
				node.path("left").asDouble(),
				node.path("top").asDouble(),
				node.path("width").asDouble(),
				node.path("height").asDouble());
	}

	private BufferedImage cropToBackground(BufferedImage rawImage, PreviewMetrics metrics) {
		if (rawImage == null) {
			return null;
		}

		int cropX = (int) Math.round(metrics.backgroundX() - metrics.rectX());
		int cropY = (int) Math.round(metrics.backgroundY() - metrics.rectY());
		int cropWidth = (int) Math.round(metrics.backgroundWidth());
		int cropHeight = (int) Math.round(metrics.backgroundHeight());

		cropX = Math.max(0, Math.min(cropX, rawImage.getWidth() - 1));
		cropY = Math.max(0, Math.min(cropY, rawImage.getHeight() - 1));
		cropWidth = Math.max(1, Math.min(cropWidth, rawImage.getWidth() - cropX));
		cropHeight = Math.max(1, Math.min(cropHeight, rawImage.getHeight() - cropY));

		BufferedImage cropped = new BufferedImage(cropWidth, cropHeight, BufferedImage.TYPE_INT_ARGB);
		Graphics2D g2d = cropped.createGraphics();
		try {
			g2d.drawImage(rawImage, 0, 0, cropWidth, cropHeight, cropX, cropY, cropX + cropWidth, cropY + cropHeight, null);
		} finally {
			g2d.dispose();
		}
		return cropped;
	}

	private BufferedImage scaleImage(BufferedImage source, int width, int height) {
		BufferedImage scaled = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
		Graphics2D g2d = scaled.createGraphics();
		try {
			g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
			g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			g2d.drawImage(source, 0, 0, width, height, null);
		} finally {
			g2d.dispose();
		}
		return scaled;
	}

	private DiffMetrics diff(BufferedImage expected, BufferedImage actual) {
		int width = Math.min(expected.getWidth(), actual.getWidth());
		int height = Math.min(expected.getHeight(), actual.getHeight());
		BufferedImage heatmap = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);

		long totalDiff = 0;
		long mismatchPixels = 0;
		for (int y = 0; y < height; y++) {
			for (int x = 0; x < width; x++) {
				int expectedRgb = expected.getRGB(x, y);
				int actualRgb = actual.getRGB(x, y);

				int rDiff = Math.abs(((expectedRgb >> 16) & 0xFF) - ((actualRgb >> 16) & 0xFF));
				int gDiff = Math.abs(((expectedRgb >> 8) & 0xFF) - ((actualRgb >> 8) & 0xFF));
				int bDiff = Math.abs((expectedRgb & 0xFF) - (actualRgb & 0xFF));
				int aDiff = Math.abs(((expectedRgb >>> 24) & 0xFF) - ((actualRgb >>> 24) & 0xFF));

				int pixelDiff = Math.max(Math.max(rDiff, gDiff), Math.max(bDiff, aDiff));
				totalDiff += rDiff + gDiff + bDiff + aDiff;
				if (pixelDiff > 8) {
					mismatchPixels++;
				}

				int alpha = Math.min(255, pixelDiff * 8);
				int heat = (alpha << 24) | (255 << 16);
				heatmap.setRGB(x, y, heat);
			}
		}

		double meanDiff = totalDiff / (double) (width * height * 4);
		double mismatchRatio = mismatchPixels / (double) (width * height);
		return new DiffMetrics(meanDiff, mismatchRatio, heatmap);
	}

	private GeometryDiff compareLayoutGeometry(PreviewMetrics expected, PreviewMetrics actual, String typeFilter) {
		Map<String, LayoutElementMetrics> expectedByKey = indexLayoutElements(expected.layoutElements(), typeFilter);
		Map<String, LayoutElementMetrics> actualByKey = indexLayoutElements(actual.layoutElements(), typeFilter);

		int missingElements = 0;
		int comparedElements = 0;
		double totalDelta = 0;
		double maxDelta = 0;

		for (Map.Entry<String, LayoutElementMetrics> entry : expectedByKey.entrySet()) {
			LayoutElementMetrics expectedElement = entry.getValue();
			LayoutElementMetrics actualElement = actualByKey.get(entry.getKey());
			if (actualElement == null || expectedElement.relativeRect() == null || actualElement.relativeRect() == null) {
				missingElements++;
				continue;
			}

			RelativeRect expectedRect = expectedElement.relativeRect();
			RelativeRect actualRect = actualElement.relativeRect();
			double leftDelta = Math.abs(expectedRect.left() - actualRect.left());
			double topDelta = Math.abs(expectedRect.top() - actualRect.top());
			double widthDelta = Math.abs(expectedRect.width() - actualRect.width());
			double heightDelta = Math.abs(expectedRect.height() - actualRect.height());
			double elementMaxDelta = Math.max(Math.max(leftDelta, topDelta), Math.max(widthDelta, heightDelta));

			totalDelta += leftDelta + topDelta + widthDelta + heightDelta;
			maxDelta = Math.max(maxDelta, elementMaxDelta);
			comparedElements++;
		}

		for (String actualKey : actualByKey.keySet()) {
			if (!expectedByKey.containsKey(actualKey)) {
				missingElements++;
			}
		}

		double meanDelta = comparedElements > 0 ? totalDelta / (comparedElements * 4.0) : Double.NaN;
		return new GeometryDiff(expectedByKey.size(), actualByKey.size(), comparedElements, missingElements, meanDelta, maxDelta);
	}

	private Map<String, LayoutElementMetrics> indexLayoutElements(List<LayoutElementMetrics> layoutElements, String typeFilter) {
		Map<String, LayoutElementMetrics> byKey = new LinkedHashMap<>();
		for (LayoutElementMetrics element : layoutElements) {
			if (typeFilter != null && !typeFilter.equals(element.type())) {
				continue;
			}
			byKey.put(element.key(), element);
		}
		return byKey;
	}

	private String summarizeLayoutCounts(List<LayoutElementMetrics> layoutElements) {
		int frameCount = 0;
		int textCount = 0;
		int photoCount = 0;
		int elementCount = 0;
		int unknownCount = 0;

		for (LayoutElementMetrics element : layoutElements) {
			switch (element.type()) {
			case "frame" -> frameCount++;
			case "text" -> textCount++;
			case "photo" -> photoCount++;
			case "element" -> elementCount++;
			default -> unknownCount++;
			}
		}

		return String.format(Locale.ROOT,
				"total=%d frame=%d text=%d photo=%d element=%d unknown=%d",
				layoutElements.size(),
				frameCount,
				textCount,
				photoCount,
				elementCount,
				unknownCount);
	}

	private boolean hasDesignData(Yearbook page) {
		return page.getDesignData() != null && !page.getDesignData().isBlank();
	}

	private boolean hasTextBoxes(Yearbook page) {
		try {
			JsonNode root = OBJECT_MAPPER.readTree(page.getDesignData());
			return root.path("textBoxes").isArray() && root.path("textBoxes").size() > 0;
		} catch (Exception e) {
			return false;
		}
	}

	private String resolveNodePath() {
		String[] candidates = {
				System.getenv("NODE_BIN"),
				System.getenv("NODE_PATH"),
				"node"
		};
		return firstAvailableExecutable(candidates);
	}

	private String resolveBrowserPath() {
		String[] candidates = {
				System.getenv("CHROME_BIN"),
				System.getenv("EDGE_BIN"),
				System.getenv("BROWSER_BIN"),
				"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
				"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
				"C:/Program Files/Google/Chrome/Application/chrome.exe",
				"msedge",
				"chrome"
		};
		return firstAvailableExecutable(candidates);
	}

	private String firstAvailableExecutable(String[] candidates) {
		for (String candidate : candidates) {
			if (candidate == null || candidate.isBlank()) {
				continue;
			}

			Path candidatePath = Path.of(candidate);
			if (candidate.contains("/") || candidate.contains("\\") || candidate.endsWith(".exe")) {
				if (Files.exists(candidatePath)) {
					return candidatePath.toString();
				}
				continue;
			}

			if (canExecute(candidate)) {
				return candidate;
			}
		}
		return null;
	}

	private boolean canExecute(String command) {
		Process process = null;
		try {
			process = new ProcessBuilder(command, "--version")
					.redirectErrorStream(true)
					.start();
			return process.waitFor() == 0;
		} catch (Exception e) {
			return false;
		} finally {
			if (process != null && process.isAlive()) {
				process.destroyForcibly();
			}
		}
	}

	private String sanitizeFileName(String value) {
		return value.replaceAll("[^a-zA-Z0-9._-]+", "_");
	}

	private record CaptureScenario(String name, int viewportWidth, int viewportHeight, double pageScaleFactor) {
	}

	private record PreviewMetrics(
			double rectX,
			double rectY,
			double rectWidth,
			double rectHeight,
			double backgroundX,
			double backgroundY,
			double backgroundWidth,
			double backgroundHeight,
			List<LayoutElementMetrics> layoutElements) {
	}

	private record RelativeRect(
			double left,
			double top,
			double width,
			double height) {
	}

	private record LayoutElementMetrics(
			String key,
			int index,
			String type,
			String className,
			RelativeRect relativeRect) {
	}

	private record CaptureArtifact(
			CaptureScenario scenario,
			int previewWidth,
			int previewHeight,
			int backgroundWidth,
			int backgroundHeight,
			BufferedImage normalizedImage,
			PreviewMetrics metrics) {
	}

	private record DiffMetrics(double meanDiff, double mismatchRatio, BufferedImage heatmap) {
	}

	private record GeometryDiff(
			int expectedElements,
			int actualElements,
			int comparedElements,
			int missingElements,
			double meanDelta,
			double maxDelta) {
	}
}
