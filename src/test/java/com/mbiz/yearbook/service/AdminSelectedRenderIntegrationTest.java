package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;

import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.YearbookRepository;

@SpringBootTest
class AdminSelectedRenderIntegrationTest {

	private static final int EXPECTED_RENDER_WIDTH = 2621;
	private static final int EXPECTED_RENDER_HEIGHT = 3371;
	private static final int LEGACY_RENDER_WIDTH = 5242;
	private static final int LEGACY_RENDER_HEIGHT = 6742;

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private JpgRenderingService jpgRenderingService;

	@Autowired
	private ThumbnailRenderingService thumbnailRenderingService;

	@Test
	void selectedPagesRenderingShouldProduceZipEntries() throws Exception {
		List<Long> pageIds = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::isRenderablePage)
				.limit(3)
				.map(Yearbook::getId)
				.toList();

		assertFalse(pageIds.isEmpty(), "No renderable yearbook pages were found.");

		File zipFile = jpgRenderingService.renderAndZipSelectedPages(pageIds, "jpg", null, null);
		assertNotNull(zipFile, "Selected page render returned null zip file.");
		assertFalse(!zipFile.exists(), "Selected page render did not create a zip file.");

		int fileEntryCount = countFileEntries(zipFile);
		assertFalse(fileEntryCount == 0, "Selected page render created an empty zip file.");
		assertZipEntriesAreHighResolution(zipFile, ".jpg");

		if (!zipFile.delete()) {
			zipFile.deleteOnExit();
		}
	}

	@Test
	void selectedPagesRenderingShouldProducePngZipEntries() throws Exception {
		List<Long> pageIds = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::isRenderablePage)
				.limit(2)
				.map(Yearbook::getId)
				.toList();

		assertFalse(pageIds.isEmpty(), "No renderable yearbook pages were found.");

		File zipFile = jpgRenderingService.renderAndZipSelectedPages(pageIds, "png", null, null);
		assertNotNull(zipFile, "Selected PNG render returned null zip file.");
		assertFalse(!zipFile.exists(), "Selected PNG render did not create a zip file.");

		int fileEntryCount = countFileEntries(zipFile);
		assertFalse(fileEntryCount == 0, "Selected PNG render created an empty zip file.");
		assertZipEntriesAreHighResolution(zipFile, ".png");

		if (!zipFile.delete()) {
			zipFile.deleteOnExit();
		}
	}

	@Test
	void savedRenderCaptureShouldMatchHighResolutionCanvasWhenPresent() throws Exception {
		List<Yearbook> pages = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::isRenderablePage)
				.limit(10)
				.toList();

		boolean verified = false;
		for (Yearbook page : pages) {
			Path capturePath = thumbnailRenderingService.resolveRenderCapturePath(page.getId());
			if (capturePath == null || !Files.exists(capturePath)) {
				continue;
			}

			BufferedImage renderCapture = ImageIO.read(capturePath.toFile());
			assertNotNull(renderCapture, "Saved render capture could not be read: " + capturePath);
			assertTrue(isAcceptedRenderSize(renderCapture.getWidth(), renderCapture.getHeight()),
					"Render capture size mismatch for pageId=" + page.getId() + ": "
							+ renderCapture.getWidth() + "x" + renderCapture.getHeight());
			verified = true;
			break;
		}

		Assumptions.assumeTrue(verified, "No saved render capture was found to verify.");
	}

	@Test
	void renderVerificationShouldProduceHighResolutionOutputWhenSavedAssetsPresent() throws Exception {
		List<Yearbook> pages = yearbookRepository.findAll(Sort.by(Sort.Direction.DESC, "lastSaved")).stream()
				.filter(this::isRenderablePage)
				.limit(10)
				.toList();

		boolean verified = false;
		for (Yearbook page : pages) {
			Path capturePath = thumbnailRenderingService.resolveRenderCapturePath(page.getId());
			Path overlayPath = thumbnailRenderingService.resolveTextOverlayPath(page.getId());
			boolean hasRenderCapture = capturePath != null && Files.exists(capturePath);
			boolean hasOverlayCapture = overlayPath != null && Files.exists(overlayPath);
			if (!hasRenderCapture && !hasOverlayCapture) {
				continue;
			}

			BufferedImage rendered = jpgRenderingService.renderForVerification(page);
			assertNotNull(rendered, "Verification render returned null for pageId=" + page.getId());
			assertTrue(rendered.getWidth() == EXPECTED_RENDER_WIDTH,
					"Verification render width mismatch for pageId=" + page.getId() + ": " + rendered.getWidth());
			assertTrue(rendered.getHeight() == EXPECTED_RENDER_HEIGHT,
					"Verification render height mismatch for pageId=" + page.getId() + ": " + rendered.getHeight());

			verified = true;
			break;
		}

		Assumptions.assumeTrue(verified, "No saved render assets were found to verify.");
	}

	private boolean isRenderablePage(Yearbook page) {
		return page.getDesignData() != null && !page.getDesignData().isBlank();
	}

	private int countFileEntries(File zipFile) throws IOException {
		try (ZipFile zip = new ZipFile(zipFile)) {
			return zip.stream()
					.filter(entry -> !entry.isDirectory())
					.map(ZipEntry::getName)
					.toList()
					.size();
		}
	}

	private void assertZipEntriesAreHighResolution(File zipFile, String extension) throws IOException {
		try (ZipFile zip = new ZipFile(zipFile)) {
			List<? extends ZipEntry> imageEntries = zip.stream()
					.filter(entry -> !entry.isDirectory() && entry.getName().toLowerCase().endsWith(extension))
					.toList();

			assertFalse(imageEntries.isEmpty(), "Selected render zip did not contain any " + extension + " entries.");

			for (ZipEntry entry : imageEntries) {
				BufferedImage image = ImageIO.read(zip.getInputStream(entry));
				assertNotNull(image, "Failed to read rendered image from zip entry: " + entry.getName());
				assertTrue(image.getWidth() == EXPECTED_RENDER_WIDTH,
						"Rendered image width mismatch for " + entry.getName() + ": " + image.getWidth());
				assertTrue(image.getHeight() == EXPECTED_RENDER_HEIGHT,
						"Rendered image height mismatch for " + entry.getName() + ": " + image.getHeight());
			}
		}
	}

	private boolean isAcceptedRenderSize(int width, int height) {
		return (width == EXPECTED_RENDER_WIDTH && height == EXPECTED_RENDER_HEIGHT)
				|| (width == LEGACY_RENDER_WIDTH && height == LEGACY_RENDER_HEIGHT);
	}

}
