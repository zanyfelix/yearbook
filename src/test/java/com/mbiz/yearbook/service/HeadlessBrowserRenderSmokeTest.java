package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;

import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.YearbookRepository;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT,
		properties = {
				"server.port=19080",
				"headless.render.base-url=http://127.0.0.1:19080"
		})
class HeadlessBrowserRenderSmokeTest {

	private static final int EXPECTED_RENDER_WIDTH = 2621;
	private static final int EXPECTED_RENDER_HEIGHT = 3371;

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private HeadlessBrowserRenderService headlessBrowserRenderService;

	@Autowired
	private JpgRenderingService jpgRenderingService;

	@Autowired
	private ThumbnailRenderingService thumbnailRenderingService;

	@Test
	void shouldRenderRecentPageThroughHeadlessBrowserAndFinalZipFlow() throws Exception {
		Yearbook page = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::hasVisibleThumbnail)
				.findFirst()
				.orElseThrow(() -> new AssertionError("No visually renderable yearbook page was found."));

		BufferedImage browserRendered = headlessBrowserRenderService.renderPage(page.getId());
		assertNotNull(browserRendered, "Headless browser render returned null for pageId=" + page.getId());
		assertEquals(EXPECTED_RENDER_WIDTH, browserRendered.getWidth(),
				"Unexpected headless browser render width for pageId=" + page.getId());
		assertEquals(EXPECTED_RENDER_HEIGHT, browserRendered.getHeight(),
				"Unexpected headless browser render height for pageId=" + page.getId());

		Path reportDir = Path.of("target", "headless-browser-render");
		Files.createDirectories(reportDir);
		Path browserImagePath = reportDir.resolve("page-" + page.getId() + "-browser.png");
		ImageIO.write(browserRendered, "png", browserImagePath.toFile());
		assertFalse(isMostlyBlank(browserRendered), "Headless browser render looked blank for pageId=" + page.getId()
				+ " output=" + browserImagePath.toAbsolutePath());

		BufferedImage preferredRendered = jpgRenderingService.renderForVerification(page);
		assertNotNull(preferredRendered, "Preferred verification render returned null for pageId=" + page.getId());
		assertEquals(EXPECTED_RENDER_WIDTH, preferredRendered.getWidth(),
				"Unexpected preferred render width for pageId=" + page.getId());
		assertEquals(EXPECTED_RENDER_HEIGHT, preferredRendered.getHeight(),
				"Unexpected preferred render height for pageId=" + page.getId());
		assertFalse(isMostlyBlank(preferredRendered), "Preferred render looked blank for pageId=" + page.getId());

		File zipFile = jpgRenderingService.renderAndZipSelectedPages(List.of(page.getId()), "jpg", null, null);
		assertNotNull(zipFile, "Final ZIP render returned null for pageId=" + page.getId());
		assertFalse(!zipFile.exists(), "Final ZIP render did not create a file for pageId=" + page.getId());

		Path zipCopyPath = reportDir.resolve("page-" + page.getId() + "-render.zip");
		Files.copy(zipFile.toPath(), zipCopyPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

		try (ZipFile zip = new ZipFile(zipFile)) {
			ZipEntry imageEntry = zip.stream()
					.filter(entry -> !entry.isDirectory() && entry.getName().toLowerCase().endsWith(".jpg"))
					.findFirst()
					.orElseThrow(() -> new AssertionError("Rendered ZIP did not contain a JPG entry."));

			BufferedImage finalRender = ImageIO.read(zip.getInputStream(imageEntry));
			assertNotNull(finalRender, "Failed to read final JPG render from ZIP for pageId=" + page.getId());
			assertEquals(EXPECTED_RENDER_WIDTH, finalRender.getWidth(),
					"Unexpected final JPG width for pageId=" + page.getId());
			assertEquals(EXPECTED_RENDER_HEIGHT, finalRender.getHeight(),
					"Unexpected final JPG height for pageId=" + page.getId());
			assertFalse(isMostlyBlank(finalRender), "Final JPG render looked blank for pageId=" + page.getId());
			assertTrue(estimateMeanAbsoluteDifference(preferredRendered, finalRender) < 6.0,
					"Final JPG diverged too much from the preferred final render for pageId=" + page.getId());

			Path finalImagePath = reportDir.resolve("page-" + page.getId() + "-final.jpg");
			ImageIO.write(finalRender, "jpg", finalImagePath.toFile());
			System.out.println("HEADLESS_BROWSER_SMOKE pageId=" + page.getId()
					+ " browserImage=" + browserImagePath.toAbsolutePath()
					+ " finalImage=" + finalImagePath.toAbsolutePath()
					+ " zip=" + zipCopyPath.toAbsolutePath());
		}

		if (!zipFile.delete()) {
			zipFile.deleteOnExit();
		}
	}

	private boolean hasVisibleThumbnail(Yearbook page) {
		if (page.getDesignData() == null || page.getDesignData().isBlank() || page.getLastSaved() == null) {
			return false;
		}

		if (page.getThumbnailPath() == null || page.getThumbnailPath().isBlank()) {
			return false;
		}

		try {
			Path thumbnailPath = thumbnailRenderingService.resolveThumbnailPath(page.getThumbnailPath());
			if (thumbnailPath == null || !Files.exists(thumbnailPath)) {
				return false;
			}

			BufferedImage thumbnail = ImageIO.read(thumbnailPath.toFile());
			return thumbnail != null && !isMostlyBlank(thumbnail);
		} catch (Exception e) {
			return false;
		}
	}

	private boolean isMostlyBlank(BufferedImage image) {
		int sampleStepX = Math.max(1, image.getWidth() / 120);
		int sampleStepY = Math.max(1, image.getHeight() / 120);
		int nonWhiteSamples = 0;
		int totalSamples = 0;

		for (int y = 0; y < image.getHeight(); y += sampleStepY) {
			for (int x = 0; x < image.getWidth(); x += sampleStepX) {
				totalSamples++;
				int rgb = image.getRGB(x, y);
				int a = (rgb >>> 24) & 0xFF;
				int r = (rgb >>> 16) & 0xFF;
				int g = (rgb >>> 8) & 0xFF;
				int b = rgb & 0xFF;
				if (a > 0 && (r < 245 || g < 245 || b < 245)) {
					nonWhiteSamples++;
				}
			}
		}

		return totalSamples > 0 && (nonWhiteSamples / (double) totalSamples) < 0.01;
	}

	private double estimateMeanAbsoluteDifference(BufferedImage first, BufferedImage second) {
		int width = Math.min(first.getWidth(), second.getWidth());
		int height = Math.min(first.getHeight(), second.getHeight());
		int sampleStepX = Math.max(1, width / 120);
		int sampleStepY = Math.max(1, height / 120);
		double totalDiff = 0;
		int totalSamples = 0;

		for (int y = 0; y < height; y += sampleStepY) {
			for (int x = 0; x < width; x += sampleStepX) {
				totalSamples++;
				int rgb1 = first.getRGB(x, y);
				int rgb2 = second.getRGB(x, y);
				int rDiff = Math.abs(((rgb1 >>> 16) & 0xFF) - ((rgb2 >>> 16) & 0xFF));
				int gDiff = Math.abs(((rgb1 >>> 8) & 0xFF) - ((rgb2 >>> 8) & 0xFF));
				int bDiff = Math.abs((rgb1 & 0xFF) - (rgb2 & 0xFF));
				totalDiff += (rDiff + gDiff + bDiff) / 3.0;
			}
		}

		return totalSamples == 0 ? 0 : totalDiff / totalSamples;
	}
}
