package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.YearbookRepository;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT,
		properties = {
				"server.port=19080",
				"headless.render.base-url=http://127.0.0.1:19080"
		})
class RenderPageDiagnosticsTest {

	private static final Long TARGET_PAGE_ID = 729L;

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private HeadlessBrowserRenderService headlessBrowserRenderService;

	@Autowired
	private JpgRenderingService jpgRenderingService;

	@Test
	void shouldExportDiagnosticsForSpecificPage() throws Exception {
		Yearbook page = yearbookRepository.findById(TARGET_PAGE_ID)
				.orElseThrow(() -> new AssertionError("Target page not found: " + TARGET_PAGE_ID));

		Path reportDir = Path.of("target", "page-diagnostics", "page-" + TARGET_PAGE_ID);
		Files.createDirectories(reportDir);

		Files.writeString(
				reportDir.resolve("design-data.json"),
				page.getDesignData() == null ? "" : page.getDesignData(),
				StandardCharsets.UTF_8);

		BufferedImage browserRendered = headlessBrowserRenderService.renderPage(TARGET_PAGE_ID);
		assertNotNull(browserRendered, "Headless browser render returned null for pageId=" + TARGET_PAGE_ID);
		ImageIO.write(browserRendered, "png", reportDir.resolve("browser-render.png").toFile());

		BufferedImage finalRendered = jpgRenderingService.renderForVerification(page);
		assertNotNull(finalRendered, "Preferred final render returned null for pageId=" + TARGET_PAGE_ID);
		ImageIO.write(finalRendered, "png", reportDir.resolve("preferred-render.png").toFile());

		File zipFile = jpgRenderingService.renderAndZipSelectedPages(java.util.List.of(TARGET_PAGE_ID), "png", null, null);
		assertNotNull(zipFile, "ZIP render returned null for pageId=" + TARGET_PAGE_ID);
		Files.copy(zipFile.toPath(), reportDir.resolve("selected-render.zip"), java.nio.file.StandardCopyOption.REPLACE_EXISTING);

		try (ZipFile zip = new ZipFile(zipFile)) {
			ZipEntry imageEntry = zip.stream()
					.filter(entry -> !entry.isDirectory() && entry.getName().toLowerCase().endsWith(".png"))
					.findFirst()
					.orElseThrow(() -> new AssertionError("Rendered ZIP did not contain a PNG entry."));
			BufferedImage finalZipRender = ImageIO.read(zip.getInputStream(imageEntry));
			assertNotNull(finalZipRender, "Failed to read final PNG render from ZIP for pageId=" + TARGET_PAGE_ID);
			ImageIO.write(finalZipRender, "png", reportDir.resolve("zip-render.png").toFile());
		}

		if (!zipFile.delete()) {
			zipFile.deleteOnExit();
		}
	}
}
