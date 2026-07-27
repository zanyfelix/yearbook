package com.mbiz.yearbook.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.PayloadDto;
import com.mbiz.yearbook.model.User;

import jakarta.servlet.http.HttpSession;

class EditControllerBackgroundValidationTest {

	@Test
	void rejectsMissingAndPlaceholderBackgrounds() {
		assertFalse(EditController.hasSavableBackground(null));
		assertFalse(EditController.hasSavableBackground(Map.of()));
		assertFalse(EditController.hasSavableBackground(Map.of("background", "")));
		assertFalse(EditController.hasSavableBackground(
				Map.of("background", "/yearbook/images/background.png?v=123")));
		assertFalse(EditController.hasSavableBackground(
				Map.of("background", "/images/placeholder.png")));
		assertFalse(EditController.hasSavableBackground(
				Map.of("background", "data:image/gif;base64,R0lGODlhAQABAAD")));
		assertFalse(EditController.hasSavableBackground(
				Map.of("background", "blob:https://example.com/temporary-background")));
		assertFalse(EditController.hasSavableBackground(
				Map.of("background", Map.of("path", "/themes/background.jpg"))));
		assertFalse(EditController.hasSavableBackground(Map.of("background", "null")));
	}

	@Test
	void acceptsAppliedBackgroundPaths() {
		assertTrue(EditController.hasSavableBackground(
				Map.of("background", "/themes/background/edit/class-page.jpg")));
		assertTrue(EditController.hasSavableBackground(
				Map.of("background", "https://cdn.example.com/backgrounds/page.png?v=2")));

		Map<String, Object> originalOnly = new HashMap<>();
		originalOnly.put("background", " ");
		originalOnly.put("backgroundOriginal", "/themes/background/original/class-page.png");
		assertTrue(EditController.hasSavableBackground(originalOnly));
	}

	@Test
	void saveEndpointsRejectBlankBackgroundBeforePersistence() throws Exception {
		EditController controller = new EditController();
		String blankDesign = "{\"frames\":[],\"textBoxes\":[],\"background\":\"/images/background.png\"}";

		Map<String, Object> legacyPayload = new HashMap<>();
		legacyPayload.put("designData", blankDesign);
		Map<String, Object> legacyResponse = controller.savePage(legacyPayload);
		assertEquals(false, legacyResponse.get("success"));
		assertEquals("BACKGROUND_REQUIRED", legacyResponse.get("code"));

		PayloadDto payload = new PayloadDto();
		payload.setUserId(1L);
		payload.setContentsId(2L);
		payload.setPageNo(1);
		payload.setDesignData(blankDesign);

		HttpSession session = mock(HttpSession.class);
		User user = mock(User.class);
		when(session.getAttribute("loginUser")).thenReturn(user);
		when(user.getRole()).thenReturn("ADMIN");

		Map<String, Object> response = controller.savePageWithTextImages(
				new ObjectMapper().writeValueAsString(payload), null, null, null, Map.of(), session);
		assertEquals(false, response.get("success"));
		assertEquals("BACKGROUND_REQUIRED", response.get("code"));

		Map<String, Object> thumbnailResponse = controller.savePageWithThumbnail(
				new ObjectMapper().writeValueAsString(payload), null, session);
		assertEquals(false, thumbnailResponse.get("success"));
		assertEquals("BACKGROUND_REQUIRED", thumbnailResponse.get("code"));
	}
}
