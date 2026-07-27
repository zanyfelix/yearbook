package com.mbiz.yearbook.controller;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.StandardCopyOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.FontDto;
import com.mbiz.yearbook.model.PayloadDto;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.model.YearbookSummary;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserThemeRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ContentsService;
import com.mbiz.yearbook.service.HeadlessBrowserRenderService;
import com.mbiz.yearbook.service.ThemeService;
import com.mbiz.yearbook.service.ThumbnailRenderingService;
import com.mbiz.yearbook.service.TextPreviewSessionService;
import com.mbiz.yearbook.service.YearbookService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Controller
public class EditController {

	private static final Logger logger = LoggerFactory.getLogger(EditController.class);

	// --- 서비스 및 레포지토리 (기존과 동일) ---
	@Autowired
	private ContentsService contentsService;
	@Autowired
	private ThemeService themeService;
	@Autowired
	private YearbookService yearbookService;
	@Autowired
	private ContentsRepository contentsRepository;
	@Autowired
	private YearbookRepository yearbookRepository;
	@Autowired
	private ThemeRepository themeRepository;
	@Autowired
	private UserThemeRepository userThemeRepository;
	@Autowired
	private ThumbnailRenderingService thumbnailRenderingService;
	@Autowired
	private HeadlessBrowserRenderService headlessBrowserRenderService;
	@Autowired
	private TextPreviewSessionService textPreviewSessionService;

	@Value("${file.path.user-photos}")
	private String userPhotosPath;

	// ✅ 편집 권한 체크 헬퍼 메소드
	private boolean canEdit(HttpSession session) {
		User loginUser = (User) session.getAttribute("loginUser");

		if (loginUser == null) {
			return false;
		}

		if ("ADMIN".equalsIgnoreCase(loginUser.getRole())) {
			return true;
		}

		Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
		if (Boolean.TRUE.equals(isImpersonating)) {
			return true;
		}

		if (loginUser.isSubmitted()) {
			return false;
		}

		if (loginUser.getDeadline() != null) {
			LocalDate today = LocalDate.now();
			LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

			if (today.isAfter(deadline)) {
				return false;
			}
		}

		return true;
	}

	private boolean canEditTargetUser(HttpSession session, Long targetUserId) {
		if (!canEdit(session) || targetUserId == null) {
			return false;
		}

		User loginUser = (User) session.getAttribute("loginUser");
		if ("ADMIN".equalsIgnoreCase(loginUser.getRole())
				|| Boolean.TRUE.equals(session.getAttribute("isImpersonating"))) {
			return true;
		}

		return Objects.equals(loginUser.getId(), targetUserId);
	}

	static boolean hasSavableBackground(Map<String, Object> designData) {
		if (designData == null) {
			return false;
		}

		Object backgroundValue = designData.get("background");
		String background = backgroundValue instanceof String ? ((String) backgroundValue).trim() : "";
		if (background.isBlank()) {
			Object originalValue = designData.get("backgroundOriginal");
			background = originalValue instanceof String ? ((String) originalValue).trim() : "";
		}
		if (background.isBlank()) {
			return false;
		}

		String normalized = background.replace('\\', '/').toLowerCase(Locale.ROOT);
		int queryIndex = normalized.indexOf('?');
		int fragmentIndex = normalized.indexOf('#');
		int suffixIndex = queryIndex < 0 ? fragmentIndex
				: (fragmentIndex < 0 ? queryIndex : Math.min(queryIndex, fragmentIndex));
		if (suffixIndex >= 0) {
			normalized = normalized.substring(0, suffixIndex);
		}

		if (normalized.isBlank() || "null".equals(normalized) || "undefined".equals(normalized)
				|| "none".equals(normalized) || "transparent".equals(normalized)
				|| "about:blank".equals(normalized) || normalized.startsWith("data:")
				|| normalized.startsWith("blob:")) {
			return false;
		}

		return !(normalized.endsWith("/images/background.png")
				|| normalized.equals("images/background.png")
				|| normalized.endsWith("/images/placeholder.png")
				|| normalized.equals("images/placeholder.png"));
	}

	private static Map<String, Object> backgroundRequiredResponse() {
		Map<String, Object> response = new HashMap<>();
		response.put("success", false);
		response.put("code", "BACKGROUND_REQUIRED");
		response.put("message", "A background image must be applied before saving. Blank pages cannot be saved.");
		return response;
	}

	private static boolean isPageFormatOptionEnabled(Map<String, Object> formatOptions, String optionName) {
		if (formatOptions == null || !formatOptions.containsKey(optionName)) {
			return true;
		}
		Object value = formatOptions.get(optionName);
		return value instanceof Boolean booleanValue
				? booleanValue
				: Boolean.parseBoolean(String.valueOf(value));
	}

	private static String normalizePageFormatToken(Object value) {
		return value == null
				? ""
				: String.valueOf(value).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
	}

	private static String getPageFormatFrameOption(Map<?, ?> frameMap, Map<?, ?> themeMap) {
		String category = normalizePageFormatToken(themeMap.get("category"));
		if (category.isBlank()) {
			category = normalizePageFormatToken(frameMap.get("category"));
		}

		String type = normalizePageFormatToken(frameMap.get("type"));
		if (type.isBlank()) {
			type = normalizePageFormatToken(themeMap.get("type"));
		}
		String name = normalizePageFormatToken(themeMap.get("name"));

		if ("element".equals(category) || "element".equals(type)) {
			return "elements";
		}
		if ("textboxframe".equals(category) || "textbox".equals(type) || name.contains("text")) {
			return "textFrames";
		}
		return "photoFrames";
	}

	private static Map<String, Object> copyStringKeyMap(Map<?, ?> source) {
		Map<String, Object> copy = new LinkedHashMap<>();
		source.forEach((key, value) -> copy.put(String.valueOf(key), value));
		return copy;
	}

	static Map<String, Object> sanitizePastedPageFormat(Map<String, Object> designData) {
		return sanitizePastedPageFormat(designData, Collections.emptyMap());
	}

	static Map<String, Object> sanitizePastedPageFormat(Map<String, Object> designData,
			Map<String, Object> formatOptions) {
		Map<String, Object> sanitized = new LinkedHashMap<>();
		List<Map<String, Object>> frames = new ArrayList<>();
		Object rawFrames = designData == null ? null : designData.get("frames");
		if (rawFrames instanceof List<?> frameList) {
			for (Object rawFrame : frameList) {
				if (!(rawFrame instanceof Map<?, ?> frameMap)
						|| !(frameMap.get("theme") instanceof Map<?, ?> themeMap)) {
					continue;
				}
				String frameOption = getPageFormatFrameOption(frameMap, themeMap);
				if (!isPageFormatOptionEnabled(formatOptions, frameOption)) {
					continue;
				}

				Map<String, Object> frame = copyStringKeyMap(frameMap);
				frame.put("photo", null);
				frames.add(frame);
			}
		}

		List<Map<String, Object>> textBoxes = new ArrayList<>();
		Object rawTextBoxes = designData == null ? null : designData.get("textBoxes");
		if (isPageFormatOptionEnabled(formatOptions, "text") && rawTextBoxes instanceof List<?> textBoxList) {
			for (Object rawTextBox : textBoxList) {
				if (!(rawTextBox instanceof Map<?, ?> textBoxMap)) {
					continue;
				}
				Map<String, Object> textBox = copyStringKeyMap(textBoxMap);
				textBox.put("renderImage", null);
				textBox.put("isModified", true);
				textBoxes.add(textBox);
			}
		}

		sanitized.put("frames", frames);
		sanitized.put("textBoxes", textBoxes);
		if (designData != null) {
			sanitized.put("background", designData.getOrDefault("background", ""));
			sanitized.put("backgroundOriginal",
					designData.getOrDefault("backgroundOriginal", designData.getOrDefault("background", "")));
			if (designData.get("backgroundThemeId") != null) {
				sanitized.put("backgroundThemeId", designData.get("backgroundThemeId"));
			}
		}
		return sanitized;
	}

	private boolean isBlankFormatPasteTarget(Yearbook page, ObjectMapper mapper) {
		String thumbnailPath = page.getThumbnailPath() == null
				? ""
				: page.getThumbnailPath().replace('\\', '/').toLowerCase(Locale.ROOT);
		if (!thumbnailPath.isBlank() && !thumbnailPath.endsWith("/images/placeholder.png")
				&& !thumbnailPath.equals("images/placeholder.png")) {
			return false;
		}
		if (page.getDesignData() == null || page.getDesignData().isBlank()) {
			return true;
		}
		try {
			Map<String, Object> currentDesign = mapper.readValue(page.getDesignData(), Map.class);
			return !hasSavableBackground(currentDesign);
		} catch (Exception e) {
			logger.warn("Refusing to overwrite a page with unreadable design data: yearbookId={}", page.getId());
			return false;
		}
	}

	// --- /edit (기존과 동일) ---
	@GetMapping("/edit")
	public String editMain(HttpSession session, @RequestParam Long id,
	                       Model model, RedirectAttributes redirectAttributes) {
		User loginUser = (User) session.getAttribute("loginUser");

		Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");

		if (!"ADMIN".equalsIgnoreCase(loginUser.getRole()) &&
		    !Boolean.TRUE.equals(isImpersonating)) {

			if (loginUser.isSubmitted()) {
				redirectAttributes.addFlashAttribute("errorMessage",
					"This has already been submitted and cannot be edited.");
				return "redirect:/submit?id=" + id;
			}

			if (loginUser.getDeadline() != null) {
				LocalDate today = LocalDate.now();
				LocalDate deadline = loginUser.getDeadline().toInstant()
					.atZone(ZoneId.systemDefault()).toLocalDate();

				if (today.isAfter(deadline)) {
					redirectAttributes.addFlashAttribute("errorMessage",
						"The deadline has passed and editing is no longer allowed.");
					return "redirect:/submit?id=" + id;
				}
			}
		}

		if (Boolean.TRUE.equals(isImpersonating)) {
			model.addAttribute("isAdminImpersonate", true);
			User originalAdmin = (User) session.getAttribute("originalAdmin");
			if (originalAdmin != null) {
				model.addAttribute("adminName", originalAdmin.getSchoolName());
			}
		}

		model.addAttribute("loginUser", loginUser);
		model.addAttribute("deadline", loginUser.getDeadline());

		LocalDate today = LocalDate.now();
		LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
		long remainDays = ChronoUnit.DAYS.between(today, deadline);

		Map<String, Integer> progressData = calculateProgress(loginUser.getId());

		model.addAttribute("remainDays", remainDays);
		model.addAttribute("groupProgress", progressData.get("groupProgress"));
		model.addAttribute("eventProgress", progressData.get("eventProgress"));

		List<ContentsData> contentsListForView = createContentsListForView(loginUser.getId());
		model.addAttribute("contentsList", contentsListForView);
		model.addAttribute("currentMenu", "edit");

		return "edit";
	}

	// =========================================================================
	// ✅ [수정 1] calculateProgress - 유효 범위 내 페이지만 카운트
	//    기존: findSummariesByContentsIdOrderByPageNoAsc().size() → 전체 레코드 수
	//    수정: pageNo <= content.getPages() 범위 내 레코드만 카운트
	// =========================================================================
	private Map<String, Integer> calculateProgress(Long userId) {
		Map<String, Integer> result = new HashMap<>();
		int groupCompleted = 0, groupTotal = 0;
		int eventCompleted = 0, eventTotal = 0;

		List<Contents> groupContents = contentsRepository.findByUserIdAndCategory(userId, "group");
		List<Contents> eventContents = contentsRepository.findByUserIdAndCategory(userId, "event");

		for (Contents content : groupContents) {
			groupTotal += content.getPages();
			// ✅ 수정: content.getPages() 이하인 페이지만 완료 카운트
			long validCompleted = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId())
					.stream()
					.filter(p -> p.getPageNo() <= content.getPages())
					.count();
			groupCompleted += (int) validCompleted;
		}

		for (Contents content : eventContents) {
			eventTotal += content.getPages();
			// ✅ 수정: content.getPages() 이하인 페이지만 완료 카운트
			long validCompleted = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId())
					.stream()
					.filter(p -> p.getPageNo() <= content.getPages())
					.count();
			eventCompleted += (int) validCompleted;
		}

		result.put("groupProgress", groupTotal != 0 ? (groupCompleted * 100) / groupTotal : 0);
		result.put("eventProgress", eventTotal != 0 ? (eventCompleted * 100) / eventTotal : 0);

		return result;
	}

	// =========================================================================
	// ✅ [수정 2] createContentsListForView - savedPagesCount를 유효 범위 내로만 계산
	//    기존: existingPages.size() → DB에 저장된 전체 레코드 수 (초과분 포함)
	//    수정: pageNo <= content.getPages() 인 레코드만 카운트
	// =========================================================================
	private List<ContentsData> createContentsListForView(Long userId) {
		List<Contents> allContents = contentsRepository.findByUserId(userId);
		List<ContentsData> contentsListForView = new ArrayList<>();

		for (Contents content : allContents) {
			List<YearbookSummary> existingPages = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
			List<YearbookSummary> fullPageList = new ArrayList<>();

			for (int i = 1; i <= content.getPages(); i++) {
				final int currentPageNo = i;
				YearbookSummary pageToAdd = existingPages.stream()
						.filter(p -> p.getPageNo() == currentPageNo)
						.findFirst()
						.orElseGet(() -> createEmptyPage(content.getId(), currentPageNo));
				fullPageList.add(pageToAdd);
			}

			ContentsData data = new ContentsData();
			data.setContentsInfo(content);
			data.setYearbookPages(fullPageList);

			// ✅ 수정: 유효 범위(pageNo <= pages) 내 저장된 페이지 수만 카운트
			long validSavedCount = existingPages.stream()
					.filter(p -> p.getPageNo() <= content.getPages())
					.count();
			data.setSavedPagesCount((int) validSavedCount);

			contentsListForView.add(data);
		}
		return contentsListForView;
	}

	private YearbookSummary createEmptyPage(Long contentsId, int pageNo) {
		YearbookSummary emptyPage = new YearbookSummary();
		emptyPage.setContentsId(contentsId);
		emptyPage.setPageNo(pageNo);
		return emptyPage;
	}

	// --- 테마 및 폰트 관련 API (기존과 동일) ---
	@GetMapping("/edit/theme")
	@ResponseBody
	public List<UserTheme> backgroundList(@RequestParam Long userId, @RequestParam String category,
			@RequestParam String gubun) {
		return themeService.findByUserIdAndCategory(userId, category, gubun);
	}

	@GetMapping("/edit/themesByParent")
	@ResponseBody
	public List<Theme> getThemesByParentId(@RequestParam Long themeId) {
		Theme currentTheme = themeRepository.findById(themeId)
				.orElseThrow(() -> new RuntimeException("Theme not found with id: " + themeId));
		Long parentId = currentTheme.getParentId();
		return parentId != null ? themeRepository.findByParentIdOrderByFilenameAsc(parentId) : Collections.emptyList();
	}

	@GetMapping("/edit/fonts")
	@ResponseBody
	public List<FontDto> getFonts(HttpSession session) {
		User loginUser = (User) session.getAttribute("loginUser");
		return getFontsForUser(loginUser);
	}

	private List<FontDto> getFontsForUser(User loginUser) {
		if (loginUser == null) {
			return Collections.emptyList();
		}

		List<UserTheme> userThemes = userThemeRepository.findByUserId(loginUser.getId());
		if (userThemes.isEmpty() || userThemes.get(0).getFontIds() == null) {
			return Collections.emptyList();
		}

		try {
			List<Long> fontIds = Arrays.stream(userThemes.get(0).getFontIds().split(","))
					.map(String::trim)
					.filter(value -> !value.isBlank())
					.map(Long::parseLong)
					.collect(Collectors.toList());
			List<Theme> themes = themeRepository.findAllById(fontIds);
			return themes.stream()
					.map(theme -> new FontDto(theme.getId(), theme.getFilename(), theme.getFontPath()))
					.collect(Collectors.toList());
		} catch (NumberFormatException e) {
			return Collections.emptyList();
		}
	}

	private String sanitizePreviewId(String previewId) {
		if (previewId == null) {
			return null;
		}

		String sanitized = previewId.replaceAll("[^a-zA-Z0-9_-]", "");
		return sanitized.isBlank() ? null : sanitized;
	}

	private String cleanFontName(String filename) {
		if (filename == null || filename.isBlank()) {
			return "";
		}

		return filename
				.replaceAll("\\.(ttf|otf|woff2?|eot)$", "")
				.replaceAll("^[^a-zA-Z]+", "")
				.replaceAll("[_-]+", " ")
				.trim();
	}

	private String normalizeFontKey(String value) {
		if (value == null || value.isBlank()) {
			return "";
		}

		return value.replace("\"", "")
				.replace("'", "")
				.replaceAll("[\\s_-]+", "")
				.toLowerCase();
	}

	private List<FontDto> getPreviewFontsForUser(User loginUser, String requestedFontFamily) {
		List<FontDto> fonts = getFontsForUser(loginUser);
		String requestedKey = normalizeFontKey(requestedFontFamily);
		if (requestedKey.isBlank()) {
			return fonts;
		}

		List<FontDto> matchedFonts = fonts.stream()
				.filter(font -> {
					String filename = font.getFilename();
					String cleanedName = cleanFontName(filename);
					String rawName = filename == null ? "" : filename.replaceAll("\\.(ttf|otf|woff2?|eot)$", "");
					return requestedKey.equals(normalizeFontKey(cleanedName))
							|| requestedKey.equals(normalizeFontKey(rawName))
							|| requestedKey.equals(normalizeFontKey(filename));
				})
				.collect(Collectors.toList());

		return matchedFonts.isEmpty() ? fonts : matchedFonts;
	}

	// --- 이미지 업로드 API (기존과 동일) ---
	@PostMapping("/edit/uploadImage")
	@ResponseBody
	public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file,
			HttpSession session) {

		if (!canEdit(session)) {
			return new ResponseEntity<>(Map.of("error", "This has already been submitted and cannot be edited."),
					HttpStatus.FORBIDDEN);
		}

		User loginUser = (User) session.getAttribute("loginUser");
		if (loginUser == null) {
			return new ResponseEntity<>(Map.of("error", "User not logged in."), HttpStatus.UNAUTHORIZED);
		}

		if (file.isEmpty()) {
			return new ResponseEntity<>(Map.of("error", "File is empty."), HttpStatus.BAD_REQUEST);
		}

		try {
			Path uploadDir = Paths.get(userPhotosPath);
			if (!Files.exists(uploadDir)) {
				Files.createDirectories(uploadDir);
			}

			String originalFileName = file.getOriginalFilename();
			String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
			String uniqueFileName = UUID.randomUUID().toString() + extension;

			Path filePath = uploadDir.resolve(uniqueFileName);
			file.transferTo(filePath.toFile());

			String webAccessiblePath = "/photo/" + uniqueFileName;

			return ResponseEntity.ok(Map.of("filePath", webAccessiblePath));

		} catch (IOException e) {
			e.printStackTrace();
			return new ResponseEntity<>(Map.of("error", "Failed to save file: " + e.getMessage()),
					HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// --- savePage (기존과 동일) ---
	@PostMapping("/edit/savePage")
	@ResponseBody
	public Map<String, Object> savePage(@RequestBody Map<String, Object> payload) {
		Long yearbookId = parseId(payload.get("yearbookId"));
		String designDataJson = (String) payload.get("designData");
		try {
			ObjectMapper mapper = new ObjectMapper();
			Map<String, Object> designData = mapper.readValue(designDataJson, Map.class);
			if (!hasSavableBackground(designData)) {
				logger.warn("Rejected page save without a valid background: yearbookId={}", yearbookId);
				return backgroundRequiredResponse();
			}
		} catch (Exception e) {
			logger.warn("Rejected page save with invalid design data: yearbookId={}", yearbookId, e);
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("code", "INVALID_DESIGN_DATA");
			response.put("message", "The page design data is invalid.");
			return response;
		}

		Yearbook page = yearbookId != null ? updateExistingPage(yearbookId) : createNewPage(payload);

		page.setDesignData(designDataJson);
		page.setLastSaved(new Date());

		Yearbook savedPage = yearbookRepository.saveAndFlush(page);

		return createSaveResponse(savedPage, savedPage.getThumbnailPath());
	}

	@PostMapping("/edit/pastePageFormat")
	@ResponseBody
	public Map<String, Object> pastePageFormat(@RequestBody Map<String, Object> payload, HttpSession session) {
		String generatedThumbnailPath = null;
		boolean pagePersisted = false;
		try {
			Long yearbookId = parseId(payload.get("yearbookId"));
			long requestedContentsId = Long.parseLong(payload.get("contentsId").toString());
			int requestedPageNo = Integer.parseInt(payload.get("pageNo").toString());
			long requestedUserId = Long.parseLong(payload.get("userId").toString());

			if (!canEditTargetUser(session, requestedUserId)) {
				Map<String, Object> response = new HashMap<>();
				response.put("success", false);
				response.put("code", "FORMAT_PASTE_FORBIDDEN");
				response.put("message", "This page cannot be edited.");
				return response;
			}

			Contents requestedContents = contentsRepository.findById(requestedContentsId)
					.orElseThrow(() -> new IllegalArgumentException("Contents not found: " + requestedContentsId));
			if (!Objects.equals(requestedContents.getUserId(), requestedUserId)
					|| requestedPageNo < 1 || requestedPageNo > requestedContents.getPages()) {
				Map<String, Object> response = new HashMap<>();
				response.put("success", false);
				response.put("code", "FORMAT_PASTE_TARGET_MISMATCH");
				response.put("message", "The target page no longer matches the selected blank page.");
				return response;
			}

			ObjectMapper mapper = new ObjectMapper();
			Object rawDesignData = payload.get("designData");
			Map<String, Object> designData = rawDesignData instanceof Map<?, ?>
					? mapper.convertValue(rawDesignData, Map.class)
					: mapper.readValue(String.valueOf(rawDesignData), Map.class);
			Object rawFormatOptions = payload.get("formatOptions");
			Map<String, Object> formatOptions = rawFormatOptions instanceof Map<?, ?>
					? mapper.convertValue(rawFormatOptions, Map.class)
					: Collections.emptyMap();
			Map<String, Object> sanitizedFormat = sanitizePastedPageFormat(designData, formatOptions);
			if (!hasSavableBackground(sanitizedFormat)) {
				return backgroundRequiredResponse();
			}

			Yearbook targetPage = yearbookId != null ? updateExistingPage(yearbookId) : createNewPage(payload);
			if (!Objects.equals(targetPage.getContentsId(), requestedContentsId)
					|| targetPage.getPageNo() != requestedPageNo
					|| !Objects.equals(targetPage.getUserId(), requestedUserId)) {
				Map<String, Object> response = new HashMap<>();
				response.put("success", false);
				response.put("code", "FORMAT_PASTE_TARGET_MISMATCH");
				response.put("message", "The target page no longer matches the selected blank page.");
				return response;
			}
			if (!isBlankFormatPasteTarget(targetPage, mapper)) {
				Map<String, Object> response = new HashMap<>();
				response.put("success", false);
				response.put("code", "FORMAT_PASTE_TARGET_NOT_BLANK");
				response.put("message", "Page format can only be pasted onto a blank page.");
				return response;
			}

			String designDataJson = mapper.writeValueAsString(sanitizedFormat);
			generatedThumbnailPath = thumbnailRenderingService.generateThumbnail(designDataJson, targetPage.getId());
			if (generatedThumbnailPath == null || generatedThumbnailPath.isBlank()) {
				throw new IOException("The pasted page thumbnail could not be generated.");
			}

			targetPage.setDesignData(designDataJson);
			targetPage.setThumbnailPath(generatedThumbnailPath);
			targetPage.setBackupDesignData(null);
			targetPage.setLastSaved(new Date());
			Yearbook savedPage = yearbookRepository.saveAndFlush(targetPage);
			pagePersisted = true;

			Map<String, Object> response;
			try {
				response = createSaveResponse(savedPage, generatedThumbnailPath);
			} catch (Exception responseError) {
				logger.warn("Page format was saved, but the page count could not be refreshed: yearbookId={}",
						savedPage.getId(), responseError);
				response = new HashMap<>();
				response.put("newImagePath", generatedThumbnailPath);
				response.put("newYearbookId", savedPage.getId());
				response.put("contentsId", savedPage.getContentsId());
				response.put("lastSaved", savedPage.getLastSaved());
			}
			response.put("success", true);
			response.put("message", "Page format pasted and saved.");
			return response;
		} catch (Exception e) {
			if (!pagePersisted && generatedThumbnailPath != null) {
				try {
					thumbnailRenderingService.deleteThumbnailIfExists(generatedThumbnailPath);
				} catch (IOException cleanupError) {
					logger.warn("Failed to remove an unreferenced format thumbnail: {}", generatedThumbnailPath,
							cleanupError);
				}
			}
			logger.error("Failed to paste and save page format", e);
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", "Failed to paste and save the page format: " + e.getMessage());
			return response;
		}
	}

	// --- 페이지 데이터 로드, 리셋, 순서 변경 API (기존과 동일) ---
	@GetMapping("/edit/pageData")
	@ResponseBody
	public Yearbook getPageData(@RequestParam("id") Long yearbookId) {
		return yearbookRepository.findById(yearbookId)
				.orElseThrow(() -> new RuntimeException("Yearbook page not found with id: " + yearbookId));
	}

	// --- SafeFit 백업/복원 API ---
	@PostMapping("/edit/backupDesignData")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> backupDesignData(@RequestBody Map<String, Long> request) {
		Map<String, Object> response = new HashMap<>();
		try {
			Long yearbookId = request.get("yearbookId");
			yearbookService.backupDesignData(yearbookId);
			response.put("success", true);
			return ResponseEntity.ok(response);
		} catch (Exception e) {
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	@PostMapping("/edit/restoreDesignData")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> restoreDesignData(@RequestBody Map<String, Long> request) {
		Map<String, Object> response = new HashMap<>();
		try {
			Long yearbookId = request.get("yearbookId");
			Yearbook restored = yearbookService.restoreDesignData(yearbookId);
			response.put("success", true);
			response.put("designData", restored.getDesignData());
			response.put("lastSaved", restored.getLastSaved());
			return ResponseEntity.ok(response);
		} catch (Exception e) {
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	@PostMapping("/edit/resetPage")
	@ResponseBody
	public Map<String, Object> resetPage(@RequestParam("id") Long id, HttpSession session) {
		Map<String, Object> response = new HashMap<>();
		try {
			Yearbook page = yearbookRepository.findById(id)
					.orElseThrow(() -> new IllegalArgumentException("Page not found: " + id));
			if (!canEditTargetUser(session, page.getUserId())) {
				response.put("success", false);
				response.put("code", "PAGE_RESET_FORBIDDEN");
				response.put("message", "This page cannot be reset.");
				return response;
			}

			yearbookRepository.deleteById(id);
			try {
				thumbnailRenderingService.deletePageArtifacts(id, page.getThumbnailPath());
			} catch (IOException cleanupError) {
				logger.warn("Page reset succeeded, but its generated files could not be fully removed: yearbookId={}",
						id, cleanupError);
			}
			response.put("success", true);
		} catch (Exception e) {
			response.put("success", false);
			response.put("message", e.getMessage());
		}
		return response;
	}

	@PostMapping("/edit/updatePageOrder")
	@ResponseBody
	public Map<String, Object> updatePageOrder(@RequestBody List<PageOrderDTO> pageOrders) {
		Map<String, Object> response = new HashMap<>();
		try {
			yearbookService.updatePageOrder(pageOrders);
			response.put("success", true);
		} catch (Exception e) {
			response.put("success", false);
			response.put("message", e.getMessage());
		}
		return response;
	}

	// =========================================================================
	// ✅ [신규 API] /admin/edit/updateContentsPages
	//    Contents의 pages 수를 변경할 때 초과 Yearbook 레코드를 안전하게 처리
	//
	//    동작:
	//    1. contents.pages 값을 newPages로 업데이트
	//    2. newPages를 초과하는 pageNo를 가진 Yearbook 레코드 목록 조회
	//    3. deleteExcess=true 이면 즉시 삭제, false 이면 목록만 반환 (미리보기)
	//
	//    호출 예시 (미리보기):
	//      POST /admin/edit/updateContentsPages
	//      { "contentsId": 1, "newPages": 12, "deleteExcess": false }
	//
	//    호출 예시 (실제 적용):
	//      POST /admin/edit/updateContentsPages
	//      { "contentsId": 1, "newPages": 12, "deleteExcess": true }
	// =========================================================================
	@PostMapping("/admin/edit/updateContentsPages")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> updateContentsPages(
			@RequestBody Map<String, Object> payload,
			HttpSession session) {

		// 관리자만 접근 가능
		User loginUser = (User) session.getAttribute("loginUser");
		if (loginUser == null || !"ADMIN".equalsIgnoreCase(loginUser.getRole())) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN)
					.body(Map.of("error", "관리자만 접근 가능합니다."));
		}

		Map<String, Object> response = new HashMap<>();

		try {
			Long contentsId = Long.parseLong(payload.get("contentsId").toString());
			int newPages = Integer.parseInt(payload.get("newPages").toString());
			boolean deleteExcess = Boolean.parseBoolean(payload.getOrDefault("deleteExcess", "false").toString());

			if (newPages < 1) {
				return ResponseEntity.badRequest()
						.body(Map.of("error", "newPages는 1 이상이어야 합니다."));
			}

			// 1. Contents 조회
			Contents contents = contentsRepository.findById(contentsId)
					.orElseThrow(() -> new RuntimeException("Contents not found: " + contentsId));

			int oldPages = contents.getPages();

			// 2. 초과 페이지 레코드 조회 (pageNo > newPages)
			List<Yearbook> excessPages = yearbookRepository
					.findByContentsIdOrderByPageNoAsc(contentsId)
					.stream()
					.filter(p -> p.getPageNo() > newPages)
					.collect(Collectors.toList());

			// 3. 미리보기 모드: 삭제 없이 초과 목록만 반환
			if (!deleteExcess) {
				List<Map<String, Object>> excessInfo = excessPages.stream().map(p -> {
					Map<String, Object> info = new HashMap<>();
					info.put("yearbookId", p.getId());
					info.put("pageNo", p.getPageNo());
					info.put("lastSaved", p.getLastSaved());
					// 저장된 데이터 유무 확인 (designData가 있으면 실제 작업된 페이지)
					info.put("hasData", p.getDesignData() != null && !p.getDesignData().isEmpty());
					return info;
				}).collect(Collectors.toList());

				response.put("contentsId", contentsId);
				response.put("oldPages", oldPages);
				response.put("newPages", newPages);
				response.put("excessCount", excessPages.size());
				response.put("excessPages", excessInfo);
				response.put("applied", false);
				response.put("message", "미리보기 결과입니다. deleteExcess=true로 재요청하면 실제 적용됩니다.");
				return ResponseEntity.ok(response);
			}

			// 4. 실제 적용: 초과 레코드 삭제 후 contents.pages 업데이트
			List<Long> deletedIds = excessPages.stream().map(Yearbook::getId).collect(Collectors.toList());

			if (!excessPages.isEmpty()) {
				yearbookRepository.deleteAllById(deletedIds);
			}

			// 5. Contents의 pages 값 업데이트
			contents.setPages(newPages);
			contentsRepository.save(contents);

			response.put("contentsId", contentsId);
			response.put("oldPages", oldPages);
			response.put("newPages", newPages);
			response.put("deletedCount", deletedIds.size());
			response.put("deletedIds", deletedIds);
			response.put("applied", true);
			response.put("message", String.format(
					"pages %d → %d 변경 완료. 초과 레코드 %d건 삭제됨.",
					oldPages, newPages, deletedIds.size()));

			return ResponseEntity.ok(response);

		} catch (Exception e) {
			e.printStackTrace();
			response.put("error", "처리 중 오류 발생: " + e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
		}
	}

	// =========================================================================
	// ✅ [신규 API] /admin/edit/cleanupExcessPages
	//    특정 Contents(또는 전체)의 초과 저장된 Yearbook 레코드를 일괄 정리
	//    pages 변경 없이 현재 contents.pages 기준으로 초과분만 삭제
	//
	//    호출 예시 (특정 contents):
	//      POST /admin/edit/cleanupExcessPages
	//      { "contentsId": 1 }
	//
	//    호출 예시 (전체 정리):
	//      POST /admin/edit/cleanupExcessPages
	//      { "contentsId": null }
	// =========================================================================
	@PostMapping("/admin/edit/cleanupExcessPages")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> cleanupExcessPages(
			@RequestBody Map<String, Object> payload,
			HttpSession session) {

		User loginUser = (User) session.getAttribute("loginUser");
		if (loginUser == null || !"ADMIN".equalsIgnoreCase(loginUser.getRole())) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN)
					.body(Map.of("error", "관리자만 접근 가능합니다."));
		}

		Map<String, Object> response = new HashMap<>();

		try {
			Object contentsIdObj = payload.get("contentsId");
			List<Contents> targetContentsList;

			if (contentsIdObj == null || contentsIdObj.toString().isBlank()) {
				// 전체 Contents 대상
				targetContentsList = contentsRepository.findAll();
			} else {
				Long contentsId = Long.parseLong(contentsIdObj.toString());
				targetContentsList = contentsRepository.findById(contentsId)
						.map(List::of)
						.orElse(Collections.emptyList());
			}

			int totalDeleted = 0;
			List<Map<String, Object>> cleanupDetails = new ArrayList<>();

			for (Contents content : targetContentsList) {
				// 현재 pages 기준으로 초과 레코드 조회 및 삭제
				List<Yearbook> excessPages = yearbookRepository
						.findByContentsIdOrderByPageNoAsc(content.getId())
						.stream()
						.filter(p -> p.getPageNo() > content.getPages())
						.collect(Collectors.toList());

				if (!excessPages.isEmpty()) {
					List<Long> deletedIds = excessPages.stream()
							.map(Yearbook::getId)
							.collect(Collectors.toList());
					yearbookRepository.deleteAllById(deletedIds);

					Map<String, Object> detail = new HashMap<>();
					detail.put("contentsId", content.getId());
					detail.put("contentsName", content.getTitle());
					detail.put("allowedPages", content.getPages());
					detail.put("deletedCount", deletedIds.size());
					detail.put("deletedIds", deletedIds);
					cleanupDetails.add(detail);

					totalDeleted += deletedIds.size();
				}
			}

			response.put("totalDeleted", totalDeleted);
			response.put("details", cleanupDetails);
			response.put("message", String.format("총 %d건의 초과 페이지 레코드가 삭제되었습니다.", totalDeleted));

			return ResponseEntity.ok(response);

		} catch (Exception e) {
			e.printStackTrace();
			response.put("error", "처리 중 오류 발생: " + e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
		}
	}

	// =========================================================================
	// ✅ [신규 API] /admin/edit/deduplicatePages
	//    동일한 contentsId + pageNo 조합이 중복 저장된 레코드를 정리
	//
	//    처리 기준 (중복 중 어떤 것을 남길지):
	//      - designData가 있는(실제 작업된) 레코드를 우선 보존
	//      - 동일 조건이면 lastSaved가 가장 최신인 레코드를 보존
	//      - 나머지 중복 레코드는 삭제
	//
	//    호출 예시 (특정 contents):
	//      POST /admin/edit/deduplicatePages
	//      { "contentsId": 61 }
	//
	//    호출 예시 (전체 정리):
	//      POST /admin/edit/deduplicatePages
	//      { "contentsId": null }
	// =========================================================================
	@PostMapping("/admin/edit/deduplicatePages")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> deduplicatePages(
			@RequestBody Map<String, Object> payload,
			HttpSession session) {

		User loginUser = (User) session.getAttribute("loginUser");
		if (loginUser == null || !"ADMIN".equalsIgnoreCase(loginUser.getRole())) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN)
					.body(Map.of("error", "관리자만 접근 가능합니다."));
		}

		Map<String, Object> response = new HashMap<>();

		try {
			Object contentsIdObj = payload.get("contentsId");
			List<Contents> targetContentsList;

			if (contentsIdObj == null || contentsIdObj.toString().isBlank()) {
				targetContentsList = contentsRepository.findAll();
			} else {
				Long contentsId = Long.parseLong(contentsIdObj.toString());
				targetContentsList = contentsRepository.findById(contentsId)
						.map(List::of)
						.orElse(Collections.emptyList());
			}

			int totalDeleted = 0;
			List<Map<String, Object>> dedupeDetails = new ArrayList<>();

			for (Contents content : targetContentsList) {
				// 해당 contents의 모든 yearbook 레코드 조회
				List<Yearbook> allPages = yearbookRepository
						.findByContentsIdOrderByPageNoAsc(content.getId());

				// pageNo 기준으로 그룹핑
				Map<Integer, List<Yearbook>> groupedByPageNo = allPages.stream()
						.collect(Collectors.groupingBy(Yearbook::getPageNo));

				List<Long> duplicateIdsToDelete = new ArrayList<>();

				for (Map.Entry<Integer, List<Yearbook>> entry : groupedByPageNo.entrySet()) {
					List<Yearbook> duplicates = entry.getValue();

					// 중복이 없으면 스킵
					if (duplicates.size() <= 1) continue;

					// ✅ 보존 우선순위:
					//    1순위: designData가 있는(실제 작업된) 레코드
					//    2순위: lastSaved가 가장 최신인 레코드
					Yearbook toKeep = duplicates.stream()
							.sorted((a, b) -> {
								// designData 유무 비교 (있으면 우선)
								boolean aHasData = a.getDesignData() != null && !a.getDesignData().isEmpty();
								boolean bHasData = b.getDesignData() != null && !b.getDesignData().isEmpty();
								if (aHasData != bHasData) {
									return aHasData ? -1 : 1;
								}
								// lastSaved 최신 순 정렬
								if (a.getLastSaved() != null && b.getLastSaved() != null) {
									return b.getLastSaved().compareTo(a.getLastSaved());
								}
								if (a.getLastSaved() != null) return -1;
								if (b.getLastSaved() != null) return 1;
								return 0;
							})
							.findFirst()
							.orElse(duplicates.get(0));

					// 보존할 레코드 제외한 나머지 삭제 대상으로 지정
					for (Yearbook dup : duplicates) {
						if (!dup.getId().equals(toKeep.getId())) {
							duplicateIdsToDelete.add(dup.getId());
						}
					}
				}

				if (!duplicateIdsToDelete.isEmpty()) {
					yearbookRepository.deleteAllById(duplicateIdsToDelete);

					Map<String, Object> detail = new HashMap<>();
					detail.put("contentsId", content.getId());
					detail.put("contentsName", content.getTitle());
					detail.put("deletedCount", duplicateIdsToDelete.size());
					detail.put("deletedIds", duplicateIdsToDelete);
					dedupeDetails.add(detail);

					totalDeleted += duplicateIdsToDelete.size();
				}
			}

			response.put("totalDeleted", totalDeleted);
			response.put("details", dedupeDetails);
			response.put("message", String.format("총 %d건의 중복 페이지 레코드가 삭제되었습니다.", totalDeleted));

			return ResponseEntity.ok(response);

		} catch (Exception e) {
			e.printStackTrace();
			response.put("error", "처리 중 오류 발생: " + e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
		}
	}

	// =========================================================================
	// ✅ [수정 3] createNewPage - pageNo 범위 초과 + 중복 방어 강화
	//
	//    [기존 문제 1] pageNo 유효성 검사 없이 그냥 저장 → 초과 저장 발생
	//    [기존 문제 2] findByContentsIdAndPageNo 결과가 복수(Race Condition 등)일 때
	//                 orElse(new Yearbook()) 이 중복 레코드를 더 만들 수 있음
	//
	//    [수정 1] pageNo > content.getPages() 이면 예외 발생 → 저장 차단
	//    [수정 2] 중복 레코드 존재 시 → 보존 기준 정렬 후 1건만 남기고 나머지 즉시 삭제
	//
	//    ※ DB 레벨 근본 해결: yearbook 테이블에 아래 유니크 제약 추가 권장
	//       ALTER TABLE yearbook
	//         ADD CONSTRAINT uq_yearbook_contents_page
	//         UNIQUE (contents_id, page_no);
	//
	//    ※ YearbookRepository에 아래 메서드 추가 필요:
	//       List<Yearbook> findAllByContentsIdAndPageNo(Long contentsId, Integer pageNo);
	// =========================================================================
	private Yearbook createNewPage(Map<String, Object> payload) {
		Long contentsId = Long.parseLong(payload.get("contentsId").toString());
		Integer pageNo = Integer.parseInt(payload.get("pageNo").toString());
		Long userId = Long.parseLong(payload.get("userId").toString());

		// ✅ [수정 1] Contents 조회 후 pageNo 범위 검증
		Contents contents = contentsRepository.findById(contentsId)
				.orElseThrow(() -> new RuntimeException("Contents not found: " + contentsId));

		if (pageNo < 1 || pageNo > contents.getPages()) {
			throw new IllegalArgumentException(String.format(
					"pageNo(%d)가 허용 범위(1~%d)를 벗어났습니다. (contentsId: %d)",
					pageNo, contents.getPages(), contentsId));
		}

		// ✅ [수정 2] List로 조회하여 중복 여부 직접 확인
		List<Yearbook> existingList = yearbookRepository.findAllByContentsIdAndPageNo(contentsId, pageNo);

		if (existingList.isEmpty()) {
			// 정상: 신규 생성
			Yearbook page = new Yearbook();
			page.setUserId(userId);
			page.setContentsId(contentsId);
			page.setPageNo(pageNo);
			return page;

		} else if (existingList.size() == 1) {
			// 정상: 기존 레코드 수정
			return existingList.get(0);

		} else {
			// 비정상: 중복 레코드 존재 → 즉시 정리 후 최선 1건 반환
			// 보존 기준: 1순위 designData 있는 것, 2순위 lastSaved 최신 순
			Yearbook toKeep = existingList.stream()
					.sorted((a, b) -> {
						boolean aHasData = a.getDesignData() != null && !a.getDesignData().isEmpty();
						boolean bHasData = b.getDesignData() != null && !b.getDesignData().isEmpty();
						if (aHasData != bHasData) return aHasData ? -1 : 1;
						if (a.getLastSaved() != null && b.getLastSaved() != null) {
							return b.getLastSaved().compareTo(a.getLastSaved());
						}
						if (a.getLastSaved() != null) return -1;
						if (b.getLastSaved() != null) return 1;
						return 0;
					})
					.findFirst()
					.orElse(existingList.get(0));

			// 보존 레코드 제외 나머지 즉시 삭제
			List<Long> dupIds = existingList.stream()
					.filter(p -> !p.getId().equals(toKeep.getId()))
					.map(Yearbook::getId)
					.collect(Collectors.toList());
			yearbookRepository.deleteAllById(dupIds);

			return toKeep;
		}
	}

	// =========================================================================
	// ✅ [수정 4] createSaveResponse - updatedSavedCount를 유효 범위 내로만 계산
	//    기존: findByContentsIdOrderByPageNoAsc().size() → 전체 레코드 수
	//    수정: pageNo <= content.getPages() 인 레코드만 카운트
	// =========================================================================
	private Map<String, Object> createSaveResponse(Yearbook savedPage, String newImagePath) {
		Map<String, Object> response = new HashMap<>();
		response.put("newImagePath", newImagePath);
		response.put("newYearbookId", savedPage.getId());
		response.put("lastSaved", savedPage.getLastSaved());

		// ✅ 수정: contents의 pages 한도 내에 있는 레코드만 카운트
		Contents contents = contentsRepository.findById(savedPage.getContentsId())
				.orElse(null);

		long validSavedCount;
		if (contents != null) {
			validSavedCount = yearbookRepository
					.findByContentsIdOrderByPageNoAsc(savedPage.getContentsId())
					.stream()
					.filter(p -> p.getPageNo() <= contents.getPages())
					.count();
		} else {
			// contents를 찾지 못한 경우 전체 카운트 (fallback)
			validSavedCount = yearbookRepository
					.findByContentsIdOrderByPageNoAsc(savedPage.getContentsId()).size();
		}

		response.put("updatedSavedCount", validSavedCount);
		response.put("contentsId", savedPage.getContentsId());
		return response;
	}

	// --- 기존 헬퍼 메소드들 ---
	private Long parseId(Object idObj) {
		return (idObj != null && !idObj.toString().isEmpty()) ? Long.parseLong(idObj.toString()) : null;
	}

	private Yearbook updateExistingPage(Long yearbookId) {
		return yearbookRepository.findById(yearbookId)
				.orElseThrow(() -> new RuntimeException("페이지를 찾을 수 없습니다."));
	}

	private String generateThumbnail(String designDataJson, Long pageId) {
		try {
			return thumbnailRenderingService.generateThumbnail(designDataJson, pageId);
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	// --- savePageWithThumbnail (기존과 동일) ---
	@PostMapping("/edit/savePageWithThumbnail")
	@ResponseBody
	public Map<String, Object> savePageWithThumbnail(@RequestParam("payload") String payloadJson,
			@RequestParam(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
			HttpSession session) {

		try {
			if (!canEdit(session)) {
				Map<String, Object> errorResponse = new HashMap<>();
				errorResponse.put("success", false);
				errorResponse.put("message", "This has already been submitted and cannot be edited.");
				return errorResponse;
			}

			ObjectMapper mapper = new ObjectMapper();
			PayloadDto payload = mapper.readValue(payloadJson, PayloadDto.class);
			Map<String, Object> designData = mapper.readValue(payload.getDesignData(), Map.class);
			if (!hasSavableBackground(designData)) {
				logger.warn("Rejected page save without a valid background: yearbookId={}, userId={}",
						payload.getYearbookId(), payload.getUserId());
				return backgroundRequiredResponse();
			}
			payload.setEmptyPage(false);

			Map<String, Object> result = yearbookService.savePageAndThumbnail(payload, thumbnailFile, null, null);

			return result;

		} catch (IOException e) {
			e.printStackTrace();
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", "Error processing request: " + e.getMessage());
			return errorResponse;
		}
	}

	@PostMapping("/edit/renderTextPreview")
	@ResponseBody
	public Map<String, Object> renderTextPreview(@RequestBody Map<String, Object> requestBody, HttpSession session) {
		Map<String, Object> response = new HashMap<>();
		long startedAt = System.currentTimeMillis();

		try {
			if (!canEdit(session)) {
				response.put("success", false);
				response.put("message", "This has already been submitted and cannot be edited.");
				return response;
			}

			User loginUser = (User) session.getAttribute("loginUser");
			if (loginUser == null) {
				response.put("success", false);
				response.put("message", "User not logged in.");
				return response;
			}

			Map<String, Object> textBox = requestBody == null
					? Collections.emptyMap()
					: (Map<String, Object>) requestBody.getOrDefault("textBox", Collections.emptyMap());
			Map<String, Object> styles = textBox.isEmpty()
					? Collections.emptyMap()
					: (Map<String, Object>) textBox.getOrDefault("styles", Collections.emptyMap());

			String previewId = requestBody == null ? null : (String) requestBody.get("previewId");
			previewId = sanitizePreviewId(previewId);
			if (previewId == null || previewId.isBlank()) {
				previewId = UUID.randomUUID().toString();
			}

			Map<String, Object> previewPayload = new HashMap<>();
			Map<String, Object> previewTextBox = new HashMap<>();
			previewTextBox.put("html", textBox.getOrDefault("html", ""));
			previewTextBox.put("textType", textBox.getOrDefault("textType", "text"));

			Map<String, Object> previewStyles = new HashMap<>();
			previewStyles.put("color", styles.getOrDefault("color", "rgb(33, 37, 41)"));
			previewStyles.put("fontSize", styles.getOrDefault("fontSize", 12));
			previewStyles.put("fontWeight", styles.getOrDefault("fontWeight", "400"));
			previewStyles.put("textAlign", styles.getOrDefault("textAlign", "left"));
			previewStyles.put("fontFamily", styles.getOrDefault("fontFamily", ""));
			previewTextBox.put("styles", previewStyles);
			previewPayload.put("textBox", previewTextBox);
			String requestedFontFamily = String.valueOf(previewStyles.getOrDefault("fontFamily", ""));
			List<FontDto> fonts = getPreviewFontsForUser(loginUser, requestedFontFamily);
			previewPayload.put("fonts", fonts);

			String previewToken = textPreviewSessionService.createSession(previewPayload);
			HeadlessBrowserRenderService.RenderedTextPreview renderedPreview = headlessBrowserRenderService
					.renderTextPreview(previewToken);
			if (renderedPreview == null || renderedPreview.image() == null) {
				response.put("success", false);
				response.put("message", "Failed to render text preview.");
				return response;
			}

			Path textImagesDir = Paths.get(userPhotosPath, "text-images");
			Files.createDirectories(textImagesDir);

			String fileName = previewId + ".png";
			Path outputPath = textImagesDir.resolve(fileName);
			BufferedImage previewImage = renderedPreview.image();
			ImageIO.write(previewImage, "png", outputPath.toFile());

			double widthPercent = (renderedPreview.cssWidth() / 786.0d) * 100.0d;
			double heightPercent = (renderedPreview.cssHeight() / 1011.0d) * 100.0d;
			String renderImagePath = "/photo/text-images/" + fileName;

			response.put("success", true);
			response.put("previewId", previewId);
			response.put("renderImage", renderImagePath);
			response.put("cssWidth", renderedPreview.cssWidth());
			response.put("cssHeight", renderedPreview.cssHeight());
			response.put("widthPercent", widthPercent);
			response.put("heightPercent", heightPercent);
			logger.info("Text preview rendered in {} ms using {} font(s) for previewId={}",
					System.currentTimeMillis() - startedAt, fonts.size(), previewId);
			return response;
		} catch (Exception e) {
			e.printStackTrace();
			response.put("success", false);
			response.put("message", "Error rendering text preview: " + e.getMessage());
			return response;
		}
	}

	// --- savePageWithTextImages (기존과 동일) ---
	@PostMapping("/edit/savePageWithTextImages")
	@ResponseBody
	public Map<String, Object> savePageWithTextImages(@RequestParam("payload") String payloadJson,
			@RequestParam(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
			@RequestParam(value = "renderCaptureFile", required = false) MultipartFile renderCaptureFile,
			@RequestParam(value = "overlayCaptureFile", required = false) MultipartFile overlayCaptureFile,
			@RequestParam Map<String, MultipartFile> files, HttpSession session) {

		try {
			if (!canEdit(session)) {
				Map<String, Object> errorResponse = new HashMap<>();
				errorResponse.put("success", false);
				errorResponse.put("message", "This has already been submitted and cannot be edited.");
				return errorResponse;
			}

			ObjectMapper mapper = new ObjectMapper();
			PayloadDto payload = mapper.readValue(payloadJson, PayloadDto.class);

			Map<String, Object> designData = mapper.readValue(payload.getDesignData(), Map.class);
			if (!hasSavableBackground(designData)) {
				logger.warn("Rejected page save without a valid background: yearbookId={}, userId={}",
						payload.getYearbookId(), payload.getUserId());
				return backgroundRequiredResponse();
			}
			payload.setEmptyPage(false);
			List<Map<String, Object>> textBoxes = (List<Map<String, Object>>) designData.get("textBoxes");

			Path textImagesDir = Paths.get(userPhotosPath, "text-images");
			Files.createDirectories(textImagesDir);

			List<String> savedTextImagePaths = new ArrayList<>();

			for (Map.Entry<String, MultipartFile> entry : files.entrySet()) {
				if (entry.getKey().startsWith("textImage_")) {
					String indexStr = entry.getKey().substring("textImage_".length());
					int index = Integer.parseInt(indexStr);

					if (index < textBoxes.size()) {
						MultipartFile imageFile = entry.getValue();

						String fileName = UUID.randomUUID().toString() + ".png";
						Path filePath = textImagesDir.resolve(fileName);
						imageFile.transferTo(filePath.toFile());

						String webPath = "/photo/text-images/" + fileName;

						Map<String, Object> textBox = textBoxes.get(index);
						textBox.put("renderImage", webPath);
						textBox.put("isModified", false);

						savedTextImagePaths.add(webPath);
					}
				}
			}

			payload.setDesignData(mapper.writeValueAsString(designData));

			Map<String, Object> result = yearbookService.savePageAndThumbnail(payload, thumbnailFile, renderCaptureFile, overlayCaptureFile);
			result.put("textImagePaths", savedTextImagePaths);

			return result;

		} catch (Exception e) {
			e.printStackTrace();
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", "Error: " + e.getMessage());
			return errorResponse;
		}
	}

	// --- uploadImageVersions (기존과 동일) ---
	@PostMapping("/edit/uploadImageVersions")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> uploadImageVersions(
			@RequestParam("originalFile") MultipartFile originalFile,
			@RequestParam("editFile") MultipartFile editFile,
			HttpSession session) {

		if (!canEdit(session)) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN)
					.body(Map.of("error", "This has already been submitted and cannot be edited."));
		}

		User loginUser = (User) session.getAttribute("loginUser");
		if (loginUser == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not logged in"));
		}

		try {
			Path uploadDir = Paths.get(userPhotosPath);
			Path originalsDir = uploadDir.resolve("originals");
			Path editsDir = uploadDir.resolve("edits");

			Files.createDirectories(originalsDir);
			Files.createDirectories(editsDir);

			String uniqueId = UUID.randomUUID().toString();

			String originalExt = getFileExtension(originalFile.getOriginalFilename());
			String originalName = uniqueId + "_original" + originalExt;
			Path originalPath = originalsDir.resolve(originalName);
			originalFile.transferTo(originalPath.toFile());

			String editName = uniqueId + "_edit.jpg";
			Path editPath = editsDir.resolve(editName);
			editFile.transferTo(editPath.toFile());

			Map<String, Object> response = new HashMap<>();
			response.put("originalPath", "/photo/originals/" + originalName);
			response.put("editPath", "/photo/edits/" + editName);
			response.put("success", true);

			return ResponseEntity.ok(response);

		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "서버 오류: " + e.getMessage()));
		}
	}

	// --- convertHeic (기존과 동일) ---
	@PostMapping("/edit/convertHeic")
	@ResponseBody
	public ResponseEntity<byte[]> convertHeic(@RequestParam("file") MultipartFile file, HttpSession session) {

		if (!canEdit(session)) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
		}

		User loginUser = (User) session.getAttribute("loginUser");
		if (loginUser == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		if (file.isEmpty()) {
			return ResponseEntity.badRequest().build();
		}

		Path tempHeic = null;
		Path tempJpg = null;

		try {
			tempHeic = Files.createTempFile("heic_", ".heic");
			tempJpg = Files.createTempFile("converted_", ".jpg");

			file.transferTo(tempHeic.toFile());

			String heicPath = tempHeic.toString().replace("\\", "/");
			String jpgPath = tempJpg.toString().replace("\\", "/");

			String pythonScript = String.format("from PIL import Image; "
					+ "from pillow_heif import register_heif_opener; " + "register_heif_opener(); "
					+ "Image.open('%s').convert('RGB').save('%s', 'JPEG', quality=90)", heicPath, jpgPath);

			ProcessBuilder pb = new ProcessBuilder("python3.8", "-c", pythonScript);
			pb.redirectErrorStream(true);
			Process process = pb.start();

			java.io.BufferedReader reader = new java.io.BufferedReader(
					new java.io.InputStreamReader(process.getInputStream()));
			StringBuilder output = new StringBuilder();
			String line;
			while ((line = reader.readLine()) != null) {
				output.append(line).append("\n");
			}

			int exitCode = process.waitFor();

			if (exitCode != 0) {
				System.err.println("HEIC 변환 실패: " + output.toString());
				return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
			}

			byte[] jpegData = Files.readAllBytes(tempJpg);

			return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_JPEG).body(jpegData);

		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		} finally {
			try {
				if (tempHeic != null) Files.deleteIfExists(tempHeic);
				if (tempJpg != null) Files.deleteIfExists(tempJpg);
			} catch (IOException ignored) {
			}
		}
	}

	private String getFileExtension(String filename) {
		if (filename == null || !filename.contains(".")) {
			return "";
		}
		return filename.substring(filename.lastIndexOf("."));
	}

	/**
	 * 편집 화면에서 선택한 원본 사진 1장 다운로드.
	 * src 파라미터는 반드시 /photo/originals/ 경로여야 함 (보안 검증).
	 */
	@GetMapping("/edit/downloadOriginalPhoto")
	public void downloadOriginalPhoto(
	        @RequestParam("src") String src,
	        HttpServletResponse response) throws IOException {

	    // 보안: originals 경로만 허용
	    if (src == null || !src.contains("/originals/")) {
	        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid path: only originals allowed");
	        return;
	    }

	    // /photo/ 접두사 제거 → 상대 경로
	    String rel;
	    if (src.startsWith("/photo/"))      rel = src.substring("/photo/".length());
	    else if (src.startsWith("photo/")) rel = src.substring("photo/".length());
	    else { response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid path"); return; }

	    // 경로 탐색(../) 방지
	    Path filePath = Paths.get(userPhotosPath).resolve(rel).normalize();
	    if (!filePath.startsWith(Paths.get(userPhotosPath).normalize()) || !Files.exists(filePath)) {
	        response.sendError(HttpServletResponse.SC_NOT_FOUND, "File not found");
	        return;
	    }

	    String filename  = filePath.getFileName().toString();
	    String mime      = Files.probeContentType(filePath);
	    if (mime == null) mime = "application/octet-stream";

	    response.setContentType(mime);
	    response.setContentLengthLong(Files.size(filePath));
	    response.setHeader("Content-Disposition",
	            "attachment; filename*=UTF-8''" + java.net.URLEncoder.encode(filename, "UTF-8").replace("+", "%20"));

	    Files.copy(filePath, response.getOutputStream());
	    response.getOutputStream().flush();
	}

	public static class PageOrderDTO {
		private Long id;
		private int pageNo;

		public Long getId() {
			return id;
		}

		public void setId(Long id) {
			this.id = id;
		}

		public int getPageNo() {
			return pageNo;
		}

		public void setPageNo(int pageNo) {
			this.pageNo = pageNo;
		}
	}
}
