package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.repository.ThemeRepository;

class ThumbnailRenderingServiceTest {

	@TempDir
	Path tempDir;

	@Test
	void rendersAndStoresThumbnailFromBackground() throws Exception {
		Path themeDir = Files.createDirectories(tempDir.resolve("theme"));
		Path thumbnailDir = Files.createDirectories(tempDir.resolve("thumbnail"));
		BufferedImage source = new BufferedImage(40, 60, BufferedImage.TYPE_INT_RGB);
		Graphics2D graphics = source.createGraphics();
		graphics.setColor(new Color(24, 120, 210));
		graphics.fillRect(0, 0, source.getWidth(), source.getHeight());
		graphics.dispose();
		ImageIO.write(source, "png", themeDir.resolve("background.png").toFile());
		BufferedImage frameImage = new BufferedImage(20, 20, BufferedImage.TYPE_INT_ARGB);
		Graphics2D frameGraphics = frameImage.createGraphics();
		frameGraphics.setColor(new Color(220, 45, 60));
		frameGraphics.fillRect(0, 0, frameImage.getWidth(), frameImage.getHeight());
		frameGraphics.dispose();
		ImageIO.write(frameImage, "png", themeDir.resolve("frame.png").toFile());

		ThumbnailRenderingService service = new ThumbnailRenderingService();
		ThemeRepository themeRepository = mock(ThemeRepository.class);
		Theme frameTheme = new Theme();
		frameTheme.setId(10L);
		frameTheme.setEditPath("/frame.png");
		when(themeRepository.findById(10L)).thenReturn(Optional.of(frameTheme));
		ReflectionTestUtils.setField(service, "themePath", themeDir.toString() + File.separator);
		ReflectionTestUtils.setField(service, "thumbnailPath", thumbnailDir.toString());
		ReflectionTestUtils.setField(service, "themeRepository", themeRepository);

		String relativePath = service.generateThumbnail(
				"{\"background\":\"/background.png\",\"frames\":[{\"theme\":{\"id\":10},"
						+ "\"position\":{\"left\":25,\"top\":25},\"size\":{\"width\":50,\"height\":50},"
						+ "\"photo\":null}],\"textBoxes\":[]}", null);

		assertTrue(relativePath.startsWith("/thumbnail/thumbnail_"));
		BufferedImage rendered = ImageIO.read(thumbnailDir.resolve(Path.of(relativePath).getFileName()).toFile());
		assertEquals(314, rendered.getWidth());
		assertEquals(404, rendered.getHeight());
		assertEquals(new Color(24, 120, 210).getRGB(), rendered.getRGB(20, 20));
		assertEquals(new Color(220, 45, 60).getRGB(), rendered.getRGB(157, 202));
	}

	@Test
	void rejectsMissingBackgroundInsteadOfWritingBlankThumbnail() {
		ThumbnailRenderingService service = new ThumbnailRenderingService();
		ReflectionTestUtils.setField(service, "themePath", tempDir.toString() + File.separator);
		ReflectionTestUtils.setField(service, "thumbnailPath", tempDir.resolve("thumbnail").toString());

		assertThrows(IOException.class, () -> service.generateThumbnail(
				"{\"background\":\"/missing.png\",\"frames\":[],\"textBoxes\":[]}", null));
	}

	@Test
	void appliesSavedFrameRotationToThumbnail() throws Exception {
		Path themeDir = Files.createDirectories(tempDir.resolve("theme"));
		Path thumbnailDir = Files.createDirectories(tempDir.resolve("thumbnail"));
		writeSolidImage(themeDir.resolve("background.png"), 40, 60, new Color(24, 120, 210));
		writeSolidImage(themeDir.resolve("frame.png"), 20, 10, new Color(220, 45, 60));

		ThemeRepository themeRepository = mock(ThemeRepository.class);
		Theme frameTheme = new Theme();
		frameTheme.setId(10L);
		frameTheme.setEditPath("/frame.png");
		when(themeRepository.findById(10L)).thenReturn(Optional.of(frameTheme));

		ThumbnailRenderingService service = createService(themeDir, thumbnailDir, themeRepository);
		String relativePath = service.generateThumbnail(
				"{\"background\":\"/background.png\",\"frames\":[{\"theme\":{\"id\":10},"
						+ "\"position\":{\"left\":25,\"top\":40},\"size\":{\"width\":50,\"height\":20},"
						+ "\"rotation\":1.5707963267948966,\"translateX\":0,\"translateY\":0,"
						+ "\"transformOriginX\":50,\"transformOriginY\":50,\"photo\":null}],"
						+ "\"textBoxes\":[]}", null);

		BufferedImage rendered = ImageIO.read(thumbnailDir.resolve(Path.of(relativePath).getFileName()).toFile());
		assertEquals(new Color(220, 45, 60).getRGB(), rendered.getRGB(157, 130));
		assertEquals(new Color(24, 120, 210).getRGB(), rendered.getRGB(90, 202));
	}

	@Test
	void rejectsBackgroundOutsideThemeDirectory() throws Exception {
		Path themeDir = Files.createDirectories(tempDir.resolve("theme"));
		Path thumbnailDir = Files.createDirectories(tempDir.resolve("thumbnail"));
		writeSolidImage(tempDir.resolve("outside.png"), 20, 20, Color.RED);

		ThumbnailRenderingService service = createService(
				themeDir, thumbnailDir, mock(ThemeRepository.class));

		assertThrows(IOException.class, () -> service.generateThumbnail(
				"{\"background\":\"/../outside.png\",\"frames\":[],\"textBoxes\":[]}", null));
	}

	@Test
	void deletesThumbnailAndPageRenderArtifacts() throws Exception {
		Path thumbnailDir = Files.createDirectories(tempDir.resolve("thumbnail"));
		Path thumbnail = Files.writeString(thumbnailDir.resolve("page.png"), "thumbnail");
		Path renderCapture = Files.createDirectories(thumbnailDir.resolve("render-captures"))
				.resolve("render_55.png");
		Path textOverlay = Files.createDirectories(thumbnailDir.resolve("render-overlays"))
				.resolve("overlay_55.png");
		Files.writeString(renderCapture, "render");
		Files.writeString(textOverlay, "overlay");

		ThumbnailRenderingService service = new ThumbnailRenderingService();
		ReflectionTestUtils.setField(service, "thumbnailPath", thumbnailDir.toString());

		service.deletePageArtifacts(55L, "/thumbnail/page.png");

		assertFalse(Files.exists(thumbnail));
		assertFalse(Files.exists(renderCapture));
		assertFalse(Files.exists(textOverlay));
	}

	@Test
	void refusesToDeleteThumbnailOutsideConfiguredDirectory() throws Exception {
		Path thumbnailDir = Files.createDirectories(tempDir.resolve("thumbnail"));
		Path outsideFile = Files.writeString(tempDir.resolve("outside.png"), "outside");
		ThumbnailRenderingService service = new ThumbnailRenderingService();
		ReflectionTestUtils.setField(service, "thumbnailPath", thumbnailDir.toString());

		assertThrows(IOException.class, () -> service.deleteThumbnailIfExists(outsideFile.toString()));
		assertTrue(Files.exists(outsideFile));
	}

	private ThumbnailRenderingService createService(
			Path themeDir, Path thumbnailDir, ThemeRepository themeRepository) {
		ThumbnailRenderingService service = new ThumbnailRenderingService();
		ReflectionTestUtils.setField(service, "themePath", themeDir.toString() + File.separator);
		ReflectionTestUtils.setField(service, "thumbnailPath", thumbnailDir.toString());
		ReflectionTestUtils.setField(service, "themeRepository", themeRepository);
		return service;
	}

	private void writeSolidImage(Path path, int width, int height, Color color) throws IOException {
		BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
		Graphics2D graphics = image.createGraphics();
		graphics.setColor(color);
		graphics.fillRect(0, 0, width, height);
		graphics.dispose();
		ImageIO.write(image, "png", path.toFile());
	}
}
