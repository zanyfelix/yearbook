package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Test;

class TextPreviewSessionServiceTest {

	@Test
	void shouldStoreAndResolvePreviewPayloadByToken() {
		TextPreviewSessionService service = new TextPreviewSessionService();
		Map<String, Object> payload = Map.of(
				"textBox", Map.of("html", "Dragon", "textType", "Title"),
				"fonts", java.util.List.of(Map.of("filename", "BrianJames.ttf", "fontPath", "/theme/font/BrianJames.ttf")));

		String token = service.createSession(payload);

		assertNotNull(token);
		assertTrue(service.isValid(token));
		assertEquals(payload, service.getPayload(token));
	}

	@Test
	void shouldRejectMissingTokens() {
		TextPreviewSessionService service = new TextPreviewSessionService();

		assertFalse(service.isValid("missing-token"));
		assertEquals(null, service.getPayload("missing-token"));
	}
}
