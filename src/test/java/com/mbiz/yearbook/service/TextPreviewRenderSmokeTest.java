package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT,
		properties = {
				"server.port=19081",
				"headless.render.base-url=http://127.0.0.1:19081"
		})
class TextPreviewRenderSmokeTest {

	@Autowired
	private HeadlessBrowserRenderService headlessBrowserRenderService;

	@Autowired
	private TextPreviewSessionService textPreviewSessionService;

	@Test
	void shouldRenderTextPreviewMoreThanOnce() throws Exception {
		Map<String, Object> payload = Map.of(
				"textBox", Map.of(
						"html", "Dragon<br>Golden Dragon Spirit Award",
						"textType", "Title",
						"styles", Map.of(
								"color", "rgb(33, 37, 41)",
								"fontSize", 36,
								"fontWeight", "700",
								"textAlign", "center",
								"fontFamily", "")),
				"fonts", List.of());

		String firstToken = textPreviewSessionService.createSession(payload);
		String secondToken = textPreviewSessionService.createSession(payload);

		HeadlessBrowserRenderService.RenderedTextPreview firstPreview =
				headlessBrowserRenderService.renderTextPreview(firstToken);
		HeadlessBrowserRenderService.RenderedTextPreview secondPreview =
				headlessBrowserRenderService.renderTextPreview(secondToken);

		assertRenderedPreview(firstPreview, "first");
		assertRenderedPreview(secondPreview, "second");

		Path reportDir = Path.of("target", "text-preview-render");
		Files.createDirectories(reportDir);
		ImageIO.write(firstPreview.image(), "png", reportDir.resolve("first-preview.png").toFile());
		ImageIO.write(secondPreview.image(), "png", reportDir.resolve("second-preview.png").toFile());
	}

	private void assertRenderedPreview(HeadlessBrowserRenderService.RenderedTextPreview preview, String label) {
		assertNotNull(preview, "Expected " + label + " preview render to succeed.");
		assertNotNull(preview.image(), "Expected " + label + " preview image to be created.");
		assertTrue(preview.image().getWidth() > 0, "Expected " + label + " preview image width to be positive.");
		assertTrue(preview.image().getHeight() > 0, "Expected " + label + " preview image height to be positive.");
		assertTrue(preview.cssWidth() > 0, "Expected " + label + " preview css width to be positive.");
		assertTrue(preview.cssHeight() > 0, "Expected " + label + " preview css height to be positive.");
	}
}
