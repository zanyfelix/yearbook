package com.mbiz.yearbook.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class BrowserRenderTokenService {

	private static final Duration TOKEN_TTL = Duration.ofMinutes(5);

	private final Map<String, TokenEntry> tokens = new ConcurrentHashMap<>();

	public String issueToken(Long yearbookId) {
		cleanupExpiredTokens();
		String token = UUID.randomUUID().toString();
		tokens.put(token, new TokenEntry(yearbookId, Instant.now().plus(TOKEN_TTL)));
		return token;
	}

	public boolean isValid(String token, Long yearbookId) {
		if (token == null || token.isBlank() || yearbookId == null) {
			return false;
		}

		TokenEntry entry = tokens.get(token);
		if (entry == null) {
			return false;
		}

		if (entry.expiresAt().isBefore(Instant.now())) {
			tokens.remove(token);
			return false;
		}

		return yearbookId.equals(entry.yearbookId());
	}

	private void cleanupExpiredTokens() {
		Instant now = Instant.now();
		tokens.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
	}

	private record TokenEntry(Long yearbookId, Instant expiresAt) {
	}
}
