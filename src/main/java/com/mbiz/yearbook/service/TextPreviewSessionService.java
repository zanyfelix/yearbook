package com.mbiz.yearbook.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class TextPreviewSessionService {

	private static final Duration TOKEN_TTL = Duration.ofMinutes(10);

	private final Map<String, PreviewSessionEntry> sessions = new ConcurrentHashMap<>();

	public String createSession(Map<String, Object> payload) {
		cleanupExpiredSessions();
		String token = UUID.randomUUID().toString();
		sessions.put(token, new PreviewSessionEntry(payload, Instant.now().plus(TOKEN_TTL)));
		return token;
	}

	public Map<String, Object> getPayload(String token) {
		if (token == null || token.isBlank()) {
			return null;
		}

		PreviewSessionEntry entry = sessions.get(token);
		if (entry == null) {
			return null;
		}

		if (entry.expiresAt().isBefore(Instant.now())) {
			sessions.remove(token);
			return null;
		}

		return entry.payload();
	}

	public boolean isValid(String token) {
		return getPayload(token) != null;
	}

	private void cleanupExpiredSessions() {
		Instant now = Instant.now();
		sessions.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
	}

	private record PreviewSessionEntry(Map<String, Object> payload, Instant expiresAt) {
	}
}
