package com.mbiz.yearbook.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ThumbnailRenderingService;

import jakarta.servlet.http.HttpSession;

class EditControllerPageFormatPasteTest {

	private EditController controller;
	private ContentsRepository contentsRepository;
	private YearbookRepository yearbookRepository;
	private ThumbnailRenderingService thumbnailRenderingService;
	private HttpSession session;

	@BeforeEach
	void setUp() {
		controller = new EditController();
		contentsRepository = mock(ContentsRepository.class);
		yearbookRepository = mock(YearbookRepository.class);
		thumbnailRenderingService = mock(ThumbnailRenderingService.class);
		ReflectionTestUtils.setField(controller, "contentsRepository", contentsRepository);
		ReflectionTestUtils.setField(controller, "yearbookRepository", yearbookRepository);
		ReflectionTestUtils.setField(controller, "thumbnailRenderingService", thumbnailRenderingService);

		session = mock(HttpSession.class);
		User user = mock(User.class);
		when(session.getAttribute("loginUser")).thenReturn(user);
		when(user.getRole()).thenReturn("ADMIN");
	}

	@Test
	void pastesSanitizedFormatAndGeneratedThumbnailWithoutOpeningEditor() throws Exception {
		Contents contents = new Contents();
		contents.setId(22L);
		contents.setUserId(7L);
		contents.setPages(4);
		when(contentsRepository.findById(22L)).thenReturn(Optional.of(contents));
		when(yearbookRepository.findAllByContentsIdAndPageNo(22L, 2)).thenReturn(new ArrayList<>());
		when(yearbookRepository.findByContentsIdOrderByPageNoAsc(22L)).thenReturn(new ArrayList<>());
		when(thumbnailRenderingService.generateThumbnail(anyString(), isNull()))
				.thenReturn("/thumbnail/generated-format.png");
		when(yearbookRepository.saveAndFlush(any(Yearbook.class))).thenAnswer(invocation -> {
			Yearbook page = invocation.getArgument(0);
			page.setId(88L);
			return page;
		});

		Map<String, Object> response = controller.pastePageFormat(createPastePayload(), session);

		assertTrue((Boolean) response.get("success"));
		assertEquals(88L, response.get("newYearbookId"));
		assertEquals("/thumbnail/generated-format.png", response.get("newImagePath"));

		ArgumentCaptor<Yearbook> savedPageCaptor = ArgumentCaptor.forClass(Yearbook.class);
		verify(yearbookRepository).saveAndFlush(savedPageCaptor.capture());
		Yearbook savedPage = savedPageCaptor.getValue();
		assertEquals("/thumbnail/generated-format.png", savedPage.getThumbnailPath());

		JsonNode savedDesign = new ObjectMapper().readTree(savedPage.getDesignData());
		assertEquals(1, savedDesign.path("textBoxes").size());
		assertEquals(1, savedDesign.path("frames").size());
		assertTrue(savedDesign.path("frames").get(0).path("photo").isNull());
		assertTrue(savedDesign.path("textBoxes").get(0).path("renderImage").isNull());
		assertTrue(savedDesign.path("textBoxes").get(0).path("isModified").asBoolean());
	}

	@Test
	void appliesSelectedFormatOptionsWhileKeepingBackgroundRequired() {
		Map<String, Object> photoFrame = createFrame("photoframe", null);
		Map<String, Object> textFrame = createFrame("textboxframe", null);
		Map<String, Object> element = createFrame("element", "element");

		Map<String, Object> designData = new LinkedHashMap<>();
		designData.put("background", "/theme/20/background/edit.jpg");
		designData.put("frames", List.of(photoFrame, textFrame, element));
		designData.put("textBoxes", List.of(Map.of("html", "Source text")));

		Map<String, Object> formatOptions = new LinkedHashMap<>();
		formatOptions.put("background", false);
		formatOptions.put("photoFrames", false);
		formatOptions.put("textFrames", true);
		formatOptions.put("text", false);
		formatOptions.put("elements", false);

		Map<String, Object> sanitized = EditController.sanitizePastedPageFormat(designData, formatOptions);
		JsonNode sanitizedJson = new ObjectMapper().valueToTree(sanitized);

		assertEquals("/theme/20/background/edit.jpg", sanitizedJson.path("background").asText());
		assertEquals(1, sanitizedJson.path("frames").size());
		assertEquals("textboxframe",
				sanitizedJson.path("frames").get(0).path("theme").path("category").asText());
		assertTrue(sanitizedJson.path("frames").get(0).path("photo").isNull());
		assertEquals(0, sanitizedJson.path("textBoxes").size());
	}

	@Test
	void refusesToOverwriteNonBlankTarget() throws Exception {
		Contents contents = new Contents();
		contents.setId(22L);
		contents.setUserId(7L);
		contents.setPages(4);
		when(contentsRepository.findById(22L)).thenReturn(Optional.of(contents));

		Yearbook existingPage = new Yearbook();
		existingPage.setId(99L);
		existingPage.setUserId(7L);
		existingPage.setContentsId(22L);
		existingPage.setPageNo(2);
		existingPage.setThumbnailPath("/thumbnail/existing.png");
		existingPage.setDesignData("{\"background\":\"/theme/background.jpg\"}");
		when(yearbookRepository.findById(99L)).thenReturn(Optional.of(existingPage));

		Map<String, Object> payload = createPastePayload();
		payload.put("yearbookId", 99L);
		Map<String, Object> response = controller.pastePageFormat(payload, session);

		assertFalse((Boolean) response.get("success"));
		assertEquals("FORMAT_PASTE_TARGET_NOT_BLANK", response.get("code"));
		verify(thumbnailRenderingService, never()).generateThumbnail(anyString(), any());
		verify(yearbookRepository, never()).saveAndFlush(any(Yearbook.class));
	}

	@Test
	void doesNotPersistWhenThumbnailRenderingFails() throws Exception {
		Contents contents = new Contents();
		contents.setId(22L);
		contents.setUserId(7L);
		contents.setPages(4);
		when(contentsRepository.findById(22L)).thenReturn(Optional.of(contents));
		when(yearbookRepository.findAllByContentsIdAndPageNo(22L, 2)).thenReturn(new ArrayList<>());
		when(thumbnailRenderingService.generateThumbnail(anyString(), isNull()))
				.thenThrow(new IOException("render failed"));

		Map<String, Object> response = controller.pastePageFormat(createPastePayload(), session);

		assertFalse((Boolean) response.get("success"));
		verify(yearbookRepository, never()).saveAndFlush(any(Yearbook.class));
	}

	@Test
	void removesGeneratedThumbnailWhenPersistenceFails() throws Exception {
		Contents contents = new Contents();
		contents.setId(22L);
		contents.setUserId(7L);
		contents.setPages(4);
		when(contentsRepository.findById(22L)).thenReturn(Optional.of(contents));
		when(yearbookRepository.findAllByContentsIdAndPageNo(22L, 2)).thenReturn(new ArrayList<>());
		when(thumbnailRenderingService.generateThumbnail(anyString(), isNull()))
				.thenReturn("/thumbnail/unreferenced.png");
		when(yearbookRepository.saveAndFlush(any(Yearbook.class)))
				.thenThrow(new IllegalStateException("database write failed"));

		Map<String, Object> response = controller.pastePageFormat(createPastePayload(), session);

		assertFalse((Boolean) response.get("success"));
		verify(thumbnailRenderingService).deleteThumbnailIfExists("/thumbnail/unreferenced.png");
	}

	@Test
	void refusesTargetOwnedByAnotherUser() {
		HttpSession otherUserSession = mock(HttpSession.class);
		User otherUser = mock(User.class);
		when(otherUserSession.getAttribute("loginUser")).thenReturn(otherUser);
		when(otherUser.getRole()).thenReturn("USER");
		when(otherUser.getId()).thenReturn(8L);

		Map<String, Object> response = controller.pastePageFormat(createPastePayload(), otherUserSession);

		assertFalse((Boolean) response.get("success"));
		assertEquals("FORMAT_PASTE_FORBIDDEN", response.get("code"));
		verify(contentsRepository, never()).findById(any());
		verify(yearbookRepository, never()).saveAndFlush(any(Yearbook.class));
	}

	@Test
	void refusesContentsThatDoNotBelongToRequestedUser() throws Exception {
		Contents contents = new Contents();
		contents.setId(22L);
		contents.setUserId(8L);
		contents.setPages(4);
		when(contentsRepository.findById(22L)).thenReturn(Optional.of(contents));

		Map<String, Object> response = controller.pastePageFormat(createPastePayload(), session);

		assertFalse((Boolean) response.get("success"));
		assertEquals("FORMAT_PASTE_TARGET_MISMATCH", response.get("code"));
		verify(thumbnailRenderingService, never()).generateThumbnail(anyString(), any());
		verify(yearbookRepository, never()).saveAndFlush(any(Yearbook.class));
	}

	@Test
	void resetPageDeletesDatabaseRecordAndGeneratedFiles() throws Exception {
		Yearbook page = new Yearbook();
		page.setId(91L);
		page.setUserId(7L);
		page.setThumbnailPath("/thumbnail/page-91.png");
		when(yearbookRepository.findById(91L)).thenReturn(Optional.of(page));

		Map<String, Object> response = controller.resetPage(91L, session);

		assertTrue((Boolean) response.get("success"));
		verify(yearbookRepository).deleteById(91L);
		verify(thumbnailRenderingService).deletePageArtifacts(91L, "/thumbnail/page-91.png");
	}

	@Test
	void resetPageRefusesAnotherUsersPage() throws Exception {
		HttpSession otherUserSession = mock(HttpSession.class);
		User otherUser = mock(User.class);
		when(otherUserSession.getAttribute("loginUser")).thenReturn(otherUser);
		when(otherUser.getRole()).thenReturn("USER");
		when(otherUser.getId()).thenReturn(8L);

		Yearbook page = new Yearbook();
		page.setId(91L);
		page.setUserId(7L);
		when(yearbookRepository.findById(91L)).thenReturn(Optional.of(page));

		Map<String, Object> response = controller.resetPage(91L, otherUserSession);

		assertFalse((Boolean) response.get("success"));
		assertEquals("PAGE_RESET_FORBIDDEN", response.get("code"));
		verify(yearbookRepository, never()).deleteById(any());
		verify(thumbnailRenderingService, never()).deletePageArtifacts(any(), any());
	}

	private Map<String, Object> createPastePayload() {
		Map<String, Object> frame = new LinkedHashMap<>();
		frame.put("theme", Map.of("id", 10L));
		frame.put("position", Map.of("left", 10, "top", 20));
		frame.put("size", Map.of("width", 30, "height", 40));
		frame.put("photo", Map.of("src", "/photo/source.jpg"));

		Map<String, Object> designData = new LinkedHashMap<>();
		designData.put("background", "/theme/20/background/edit.jpg");
		designData.put("backgroundOriginal", "/theme/20/background/original.jpg");
		designData.put("backgroundThemeId", 5L);
		designData.put("frames", List.of(frame));
		designData.put("textBoxes", List.of(Map.of(
				"html", "Source text",
				"renderImage", "/text/source-page.png")));

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("userId", 7L);
		payload.put("yearbookId", null);
		payload.put("contentsId", 22L);
		payload.put("pageNo", 2);
		payload.put("designData", designData);
		return payload;
	}

	private Map<String, Object> createFrame(String category, String type) {
		Map<String, Object> theme = new LinkedHashMap<>();
		theme.put("id", 10L);
		theme.put("category", category);

		Map<String, Object> frame = new LinkedHashMap<>();
		frame.put("theme", theme);
		frame.put("position", Map.of("left", 10, "top", 20));
		frame.put("size", Map.of("width", 30, "height", 40));
		frame.put("photo", Map.of("src", "/photo/source.jpg"));
		if (type != null) {
			frame.put("type", type);
		}
		return frame;
	}
}
