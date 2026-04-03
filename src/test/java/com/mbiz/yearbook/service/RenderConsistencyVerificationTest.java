package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.YearbookRepository;

@SpringBootTest
class RenderConsistencyVerificationTest {

	private static final Path THUMBNAIL_ROOT = Paths.get("E:/data/thumbnail");
	private static final Path REPORT_ROOT = Paths.get("target/render-consistency");
	private static final double MAX_ALLOWED_MEAN_DIFF = 8.0;
	private static final double MAX_ALLOWED_MISMATCH_RATIO = 0.03;
	private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private JpgRenderingService jpgRenderingService;

	@Test
	void recentSavedPagesShouldMatchRenderedOutput() throws Exception {
		Files.createDirectories(REPORT_ROOT);

		List<Yearbook> candidates = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::hasComparableAssets)
				.limit(3)
				.toList();

		assertFalse(candidates.isEmpty(), "No comparable yearbook pages with designData and thumbnailPath were found.");

		List<String> failures = new ArrayList<>();

		for (Yearbook page : candidates) {
			ComparisonMetrics metrics = comparePage(page);
			String summary = String.format(
					"pageId=%d meanDiff=%.4f maxDiff=%d mismatchRatio=%.4f mismatchBox=%s summary=%s layers=%s thumb=%s diff=%s",
					page.getId(), metrics.meanDiff(), metrics.maxDiff(), metrics.mismatchRatio(),
					metrics.mismatchBounds(), metrics.pageSummary(), metrics.layerSummary(),
					metrics.thumbnailCopy(), metrics.diffImage());
			System.out.println(summary);

			if (metrics.meanDiff() > MAX_ALLOWED_MEAN_DIFF || metrics.mismatchRatio() > MAX_ALLOWED_MISMATCH_RATIO) {
				failures.add(summary);
			}
		}

		assertFalse(!failures.isEmpty(),
				"Render consistency check failed:\n" + String.join("\n", failures));
	}

	private boolean hasComparableAssets(Yearbook page) {
		if (page.getDesignData() == null || page.getDesignData().isBlank()) {
			return false;
		}

		if (page.getThumbnailPath() == null || page.getThumbnailPath().isBlank()) {
			return false;
		}

		Path thumbnailFile = resolveThumbnailPath(page.getThumbnailPath());
		return thumbnailFile != null && Files.exists(thumbnailFile);
	}

	private ComparisonMetrics comparePage(Yearbook page) throws Exception {
		Path pageDir = REPORT_ROOT.resolve("page-" + page.getId());
		Files.createDirectories(pageDir);

		Path thumbnailFile = resolveThumbnailPath(page.getThumbnailPath());
		BufferedImage thumbnail = ImageIO.read(thumbnailFile.toFile());
		BufferedImage rendered = jpgRenderingService.renderForVerification(page);
		BufferedImage scaledRendered = scaleImage(rendered, thumbnail.getWidth(), thumbnail.getHeight());

		Path renderedCopy = pageDir.resolve("render-scaled.png");
		ImageIO.write(scaledRendered, "png", renderedCopy.toFile());

		Path thumbnailCopy = pageDir.resolve("thumbnail-source.png");
		Files.copy(thumbnailFile, thumbnailCopy, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

		DiffResult diffResult = diff(thumbnail, scaledRendered);
		Path diffImage = pageDir.resolve("diff-heatmap.png");
		ImageIO.write(diffResult.diffImage(), "png", diffImage.toFile());
		String pageSummary = summarizePage(page.getDesignData());
		String layerSummary = summarizeLayers(page.getDesignData(), thumbnail);

		return new ComparisonMetrics(diffResult.meanDiff(), diffResult.maxDiff(), diffResult.mismatchRatio(),
				thumbnailCopy, diffImage, diffResult.mismatchBounds(), pageSummary, layerSummary);
	}

	private Path resolveThumbnailPath(String thumbnailPath) {
		String normalized = thumbnailPath.replace('\\', '/');
		String fileName = normalized.substring(normalized.lastIndexOf('/') + 1);

		List<Path> candidates = List.of(
				Paths.get(normalized),
				THUMBNAIL_ROOT.resolve(fileName),
				THUMBNAIL_ROOT.resolve(normalized.startsWith("/") ? normalized.substring(1) : normalized),
				THUMBNAIL_ROOT.resolve("thumbnail").resolve(fileName));

		return candidates.stream()
				.map(Path::normalize)
				.filter(Files::exists)
				.min(Comparator.comparing(Path::toString))
				.orElse(null);
	}

	private BufferedImage scaleImage(BufferedImage source, int width, int height) {
		BufferedImage scaled = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
		Graphics2D g2d = scaled.createGraphics();
		g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
		g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
		g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		g2d.drawImage(source, 0, 0, width, height, null);
		g2d.dispose();
		return scaled;
	}

	private DiffResult diff(BufferedImage expected, BufferedImage actual) throws IOException {
		int width = expected.getWidth();
		int height = expected.getHeight();
		BufferedImage heatmap = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);

		long totalDiff = 0;
		int maxDiff = 0;
		long mismatchPixels = 0;
		int minMismatchX = width;
		int minMismatchY = height;
		int maxMismatchX = -1;
		int maxMismatchY = -1;

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
				maxDiff = Math.max(maxDiff, pixelDiff);

				if (pixelDiff > 8) {
					mismatchPixels++;
					minMismatchX = Math.min(minMismatchX, x);
					minMismatchY = Math.min(minMismatchY, y);
					maxMismatchX = Math.max(maxMismatchX, x);
					maxMismatchY = Math.max(maxMismatchY, y);
				}

				int alpha = Math.min(255, pixelDiff * 8);
				int heat = (alpha << 24) | (255 << 16);
				heatmap.setRGB(x, y, heat);
			}
		}

		double meanDiff = totalDiff / (double) (width * height * 4);
		double mismatchRatio = mismatchPixels / (double) (width * height);
		String mismatchBounds = mismatchPixels == 0
				? "none"
				: String.format("%d,%d-%d,%d", minMismatchX, minMismatchY, maxMismatchX, maxMismatchY);
		return new DiffResult(meanDiff, maxDiff, mismatchRatio, heatmap, mismatchBounds);
	}

	private String summarizePage(String designData) throws IOException {
		JsonNode root = OBJECT_MAPPER.readTree(designData);
		String background = root.path("background").asText("");
		int frameCount = root.path("frames").size();
		int textCount = root.path("textBoxes").size();
		int photoFrameCount = 0;
		int rotatedFrameCount = 0;
		int rotatedTextCount = 0;
		int captureInfoTextCount = 0;
		List<String> themeIds = new ArrayList<>();

		for (JsonNode frame : root.path("frames")) {
			if (frame.path("photo").has("src")) {
				photoFrameCount++;
			}
			if (Math.abs(frame.path("rotation").asDouble(0)) > 0.001) {
				rotatedFrameCount++;
			}
			if (themeIds.size() < 5) {
				themeIds.add(frame.path("theme").path("id").asText("?"));
			}
		}

		for (JsonNode textBox : root.path("textBoxes")) {
			if (Math.abs(textBox.path("rotation").asDouble(0)) > 0.001) {
				rotatedTextCount++;
			}
			if (!textBox.path("captureInfo").isMissingNode()) {
				captureInfoTextCount++;
			}
		}

		return String.format("bg=%s frames=%d photos=%d rotatedFrames=%d texts=%d rotatedTexts=%d captureTexts=%d themes=%s",
				background, frameCount, photoFrameCount, rotatedFrameCount, textCount, rotatedTextCount,
				captureInfoTextCount, themeIds);
	}

	private String summarizeLayers(String designData, BufferedImage thumbnail) throws Exception {
		JsonNode root = OBJECT_MAPPER.readTree(designData);
		JsonNode bgOnly = root.deepCopy();
		((com.fasterxml.jackson.databind.node.ArrayNode) bgOnly.path("frames")).removeAll();
		((com.fasterxml.jackson.databind.node.ArrayNode) bgOnly.path("textBoxes")).removeAll();

		JsonNode noPhoto = root.deepCopy();
		for (JsonNode frame : noPhoto.path("frames")) {
			if (frame.isObject()) {
				((com.fasterxml.jackson.databind.node.ObjectNode) frame).remove("photo");
			}
		}

		DiffResult bgDiff = diff(thumbnail, scaleImage(jpgRenderingService.renderForVerification(OBJECT_MAPPER.writeValueAsString(bgOnly)),
				thumbnail.getWidth(), thumbnail.getHeight()));
		DiffResult noPhotoDiff = diff(thumbnail, scaleImage(jpgRenderingService.renderForVerification(OBJECT_MAPPER.writeValueAsString(noPhoto)),
				thumbnail.getWidth(), thumbnail.getHeight()));

		return String.format("bgOnly=%.4f/%.4f noPhoto=%.4f/%.4f",
				bgDiff.meanDiff(), bgDiff.mismatchRatio(),
				noPhotoDiff.meanDiff(), noPhotoDiff.mismatchRatio());
	}

	private record DiffResult(double meanDiff, int maxDiff, double mismatchRatio, BufferedImage diffImage,
			String mismatchBounds) {
	}

	private record ComparisonMetrics(double meanDiff, int maxDiff, double mismatchRatio, Path thumbnailCopy,
			Path diffImage, String mismatchBounds, String pageSummary, String layerSummary) {
	}
}
