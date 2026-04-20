package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mbiz.yearbook.model.FontDto;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserThemeRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.BrowserRenderTokenService;
import com.mbiz.yearbook.service.TextPreviewSessionService;

@Controller
public class BrowserRenderController {

	private final BrowserRenderTokenService browserRenderTokenService;
	private final TextPreviewSessionService textPreviewSessionService;
	private final YearbookRepository yearbookRepository;
	private final UserThemeRepository userThemeRepository;
	private final ThemeRepository themeRepository;

	@Value("${file.path.theme}")
	private String themePath;

	@Value("${file.path.upload}")
	private String uploadPath;

	@Value("${file.path.thumbnail}")
	private String thumbnailPath;

	@Value("${file.path.user-photos}")
	private String userPhotosPath;

	private final ObjectMapper objectMapper = new ObjectMapper();

	public BrowserRenderController(BrowserRenderTokenService browserRenderTokenService,
			TextPreviewSessionService textPreviewSessionService,
			YearbookRepository yearbookRepository,
			UserThemeRepository userThemeRepository,
			ThemeRepository themeRepository) {
		this.browserRenderTokenService = browserRenderTokenService;
		this.textPreviewSessionService = textPreviewSessionService;
		this.yearbookRepository = yearbookRepository;
		this.userThemeRepository = userThemeRepository;
		this.themeRepository = themeRepository;
	}

	@GetMapping("/render/browser/page")
	public String renderBrowserPage(@RequestParam("yearbookId") Long yearbookId,
			@RequestParam("token") String token,
			Model model) {
		validateToken(token, yearbookId);
		model.addAttribute("yearbookId", yearbookId);
		model.addAttribute("token", token);
		model.addAttribute("jsVersion", System.currentTimeMillis());
		return "render-browser";
	}

	@GetMapping("/render/browser/editor-preview")
	public String renderBrowserEditorPreview(@RequestParam("yearbookId") Long yearbookId,
			@RequestParam("token") String token,
			Model model) {
		validateToken(token, yearbookId);
		model.addAttribute("yearbookId", yearbookId);
		model.addAttribute("token", token);
		model.addAttribute("jsVersion", System.currentTimeMillis());
		return "render-browser-editor-preview";
	}

	@GetMapping("/render/browser/text-preview")
	public String renderBrowserTextPreview(@RequestParam("token") String token, Model model) {
		validateTextPreviewToken(token);
		model.addAttribute("token", token);
		model.addAttribute("jsVersion", System.currentTimeMillis());
		return "render-browser-text-preview";
	}

	@GetMapping("/render/browser/text-preview/data")
	@ResponseBody
	public Map<String, Object> getTextPreviewData(@RequestParam("token") String token) {
		Map<String, Object> payload = textPreviewSessionService.getPayload(token);
		if (payload == null) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid text preview token");
		}
		return payload;
	}

	@GetMapping("/render/browser/pageData")
	@ResponseBody
	public Yearbook getPageData(@RequestParam("id") Long yearbookId,
			@RequestParam("token") String token) {
		validateToken(token, yearbookId);
		Yearbook page = yearbookRepository.findById(yearbookId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Yearbook page not found"));
		return new Yearbook(
				page.getId(),
				page.getUserId(),
				page.getContentsId(),
				page.getPageNo(),
				page.getThumbnailPath(),
				optimizeDesignDataForRender(page.getDesignData()),
				page.getLastSaved(),
				page.getSubcategory(),
				page.getBackupDesignData());
	}

	@GetMapping("/render/browser/fonts")
	@ResponseBody
	public List<FontDto> getFonts(@RequestParam("yearbookId") Long yearbookId,
			@RequestParam("token") String token) {
		validateToken(token, yearbookId);

		Yearbook page = yearbookRepository.findById(yearbookId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Yearbook page not found"));
		Long userId = page.getUserId();
		if (userId == null) {
			return Collections.emptyList();
		}

		List<UserTheme> userThemes = userThemeRepository.findByUserId(userId);
		if (userThemes.isEmpty() || userThemes.get(0).getFontIds() == null) {
			return Collections.emptyList();
		}

		try {
			List<Long> fontIds = Arrays.stream(userThemes.get(0).getFontIds().split(","))
					.map(String::trim)
					.filter(value -> !value.isBlank())
					.map(Long::parseLong)
					.toList();
			List<Theme> themes = themeRepository.findAllById(fontIds);
			return themes.stream()
					.map(theme -> new FontDto(
							theme.getId(),
							theme.getFilename(),
							buildAssetUrl(yearbookId, token, theme.getFontPath())))
					.collect(Collectors.toList());
		} catch (Exception e) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to resolve render fonts", e);
		}
	}

	@GetMapping("/render/browser/asset")
	public ResponseEntity<Resource> getAsset(@RequestParam("yearbookId") Long yearbookId,
			@RequestParam("token") String token,
			@RequestParam("src") String src) {
		validateToken(token, yearbookId);

		Path assetPath = resolveAssetPath(src);
		if (assetPath == null || !Files.exists(assetPath) || !Files.isRegularFile(assetPath)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Render asset not found");
		}

		MediaType mediaType = resolveMediaType(assetPath);
		return ResponseEntity.ok()
				.contentType(mediaType)
				.body(new FileSystemResource(assetPath));
	}

	@GetMapping("/render/browser/health")
	@ResponseBody
	public Map<String, Object> health(@RequestParam("yearbookId") Long yearbookId,
			@RequestParam("token") String token) {
		validateToken(token, yearbookId);
		return Map.of("success", true, "yearbookId", yearbookId);
	}

	private void validateToken(String token, Long yearbookId) {
		if (!browserRenderTokenService.isValid(token, yearbookId)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid browser render token");
		}
	}

	private void validateTextPreviewToken(String token) {
		if (!textPreviewSessionService.isValid(token)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid text preview token");
		}
	}

	private String buildAssetUrl(Long yearbookId, String token, String assetPath) {
		if (assetPath == null || assetPath.isBlank()) {
			return assetPath;
		}

		return "/render/browser/asset?yearbookId="
				+ yearbookId
				+ "&token="
				+ URLEncoder.encode(token, StandardCharsets.UTF_8)
				+ "&src="
				+ URLEncoder.encode(assetPath, StandardCharsets.UTF_8);
	}

	private Path resolveAssetPath(String src) {
		if (src == null || src.isBlank()) {
			return null;
		}

		if (src.startsWith("/theme/")) {
			return resolveUnderBase(themePath, src.substring("/theme/".length()));
		}
		if (src.startsWith("/photo/")) {
			return resolveUnderBase(userPhotosPath, src.substring("/photo/".length()));
		}
		if (src.startsWith("/thumbnail/")) {
			return resolveUnderBase(thumbnailPath, src.substring("/thumbnail/".length()));
		}
		if (src.startsWith("/upload/")) {
			return resolveUnderBase(uploadPath, src.substring("/upload/".length()));
		}

		throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported render asset path");
	}

	private Path resolveUnderBase(String baseDir, String relativePath) {
		Path basePath = Paths.get(baseDir).normalize();
		Path resolvedPath = basePath.resolve(relativePath).normalize();
		if (!resolvedPath.startsWith(basePath)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid render asset path");
		}
		return resolvedPath;
	}

	private MediaType resolveMediaType(Path assetPath) {
		try {
			String detectedType = Files.probeContentType(assetPath);
			if (detectedType != null && !detectedType.isBlank()) {
				return MediaType.parseMediaType(detectedType);
			}
		} catch (IOException ignored) {
		}

		return MediaTypeFactory.getMediaType(assetPath.getFileName().toString())
				.orElse(MediaType.APPLICATION_OCTET_STREAM);
	}

	private String optimizeDesignDataForRender(String designData) {
		if (designData == null || designData.isBlank()) {
			return designData;
		}

		try {
			JsonNode rootNode = objectMapper.readTree(designData);
			if (!(rootNode instanceof ObjectNode root)) {
				return designData;
			}

			upgradeBackgroundAsset(root);
			upgradeFrameThemeAssets(root.withArray("frames"));
			return objectMapper.writeValueAsString(root);
		} catch (Exception ex) {
			return designData;
		}
	}

	private void upgradeBackgroundAsset(ObjectNode root) {
		String currentBackground = getTextValue(root.path("background"));
		String savedOriginalBackground = getTextValue(root.path("backgroundOriginal"));
		Long backgroundThemeId = root.path("backgroundThemeId").canConvertToLong()
				? root.path("backgroundThemeId").asLong()
				: null;

		Theme backgroundTheme = null;
		if (backgroundThemeId != null) {
			backgroundTheme = themeRepository.findById(backgroundThemeId).orElse(null);
		}
		if (backgroundTheme == null && currentBackground != null) {
			backgroundTheme = themeRepository.findFirstByEditPath(currentBackground)
					.or(() -> themeRepository.findFirstByOriginalPath(currentBackground))
					.orElse(null);
		}

		String preferredBackground = firstNonBlank(
				backgroundTheme != null ? backgroundTheme.getOriginalPath() : null,
				savedOriginalBackground,
				currentBackground);

		if (preferredBackground != null) {
			root.put("backgroundOriginal", preferredBackground);
		}
	}

	private void upgradeFrameThemeAssets(ArrayNode frames) {
		for (JsonNode frameNode : frames) {
			if (!(frameNode instanceof ObjectNode frameObject)) {
				continue;
			}

			JsonNode rawThemeNode = frameObject.get("theme");
			if (!(rawThemeNode instanceof ObjectNode themeObject)) {
				continue;
			}

			Theme theme = null;
			if (themeObject.path("id").canConvertToLong()) {
				theme = themeRepository.findById(themeObject.path("id").asLong()).orElse(null);
			}

			String preferredImagePath = firstNonBlank(
					theme != null ? theme.getOriginalPath() : null,
					getTextValue(themeObject.path("originalPath")),
					theme != null ? theme.getEditPath() : null,
					getTextValue(themeObject.path("editPath")));
			if (preferredImagePath != null) {
				themeObject.put("originalPath", preferredImagePath);
			}

			String preferredMaskPath = firstNonBlank(
					theme != null ? theme.getOriginalMaskPath() : null,
					getTextValue(themeObject.path("originalMaskPath")),
					theme != null ? theme.getEditMaskPath() : null,
					getTextValue(themeObject.path("editMaskPath")));
			if (preferredMaskPath != null) {
				themeObject.put("originalMaskPath", preferredMaskPath);
			}
		}
	}

	private String getTextValue(JsonNode node) {
		if (node == null || node.isMissingNode() || node.isNull()) {
			return null;
		}

		String value = node.asText(null);
		if (value == null || value.isBlank()) {
			return null;
		}

		return value;
	}

	private String firstNonBlank(String... values) {
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value;
			}
		}
		return null;
	}
}
