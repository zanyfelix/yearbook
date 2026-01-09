package com.mbiz.yearbook.controller;

import java.io.IOException;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
import com.mbiz.yearbook.service.ThemeService;
import com.mbiz.yearbook.service.ThumbnailRenderingService;
import com.mbiz.yearbook.service.YearbookService;

import jakarta.servlet.http.HttpSession;

@Controller
public class EditController {

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

	// ▼▼▼ [추가] 사용자가 업로드한 사진을 저장할 실제 서버 경로 ▼▼▼
	@Value("${file.path.user-photos}")
	private String userPhotosPath;

	// ✅ 편집 권한 체크 헬퍼 메소드
	private boolean canEdit(HttpSession session) {
		User loginUser = (User) session.getAttribute("loginUser");

		if (loginUser == null) {
			return false;
		}

		// 관리자는 항상 편집 가능
		if ("ADMIN".equalsIgnoreCase(loginUser.getRole())) {
			return true;
		}

		// 관리자 Impersonate 모드인 경우 편집 가능
		Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
		if (Boolean.TRUE.equals(isImpersonating)) {
			return true;
		}

		// 일반 사용자는 제출 전이고 deadline 전에만 편집 가능
		if (loginUser.isSubmitted()) {
			return false;
		}

		// ✅ deadline 체크 추가
		if (loginUser.getDeadline() != null) {
			LocalDate today = LocalDate.now();
			LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

			// deadline이 지났으면 편집 불가
			if (today.isAfter(deadline)) {
				return false;
			}
		}

		return true;
	}

	// --- /edit (기존과 동일) ---
	@GetMapping("/edit")
	public String editMain(HttpSession session, @RequestParam Long id, Model model,
			RedirectAttributes redirectAttributes) {
		User loginUser = (User) session.getAttribute("loginUser");

		Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");

		// deadline 체크 (관리자 및 Impersonate 모드 제외)
		if (!"ADMIN".equalsIgnoreCase(loginUser.getRole()) && !Boolean.TRUE.equals(isImpersonating)) {

			if (loginUser.getDeadline() != null) {
				LocalDate today = LocalDate.now();
				LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

				// deadline이 지났으면 접근 차단
				if (today.isAfter(deadline)) {
					redirectAttributes.addFlashAttribute("errorMessage",
							"The deadline has passed and editing is no longer allowed.");
					return "redirect:/submit?id=" + id;
				}
			}

			// 제출 완료 체크
			if (loginUser.isSubmitted()) {
				redirectAttributes.addFlashAttribute("errorMessage",
						"This has already been submitted and cannot be edited.");
				return "redirect:/submit?id=" + id;
			}
		}

		// ✅ 관리자 Impersonate 모드 표시용
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

	// --- calculateProgress, createContentsListForView, createEmptyPage (기존과 동일)
	// ---
	private Map<String, Integer> calculateProgress(Long userId) {
		Map<String, Integer> result = new HashMap<>();
		int groupCompleted = 0, groupTotal = 0;
		int eventCompleted = 0, eventTotal = 0;

		List<Contents> groupContents = contentsRepository.findByUserIdAndCategory(userId, "group");
		List<Contents> eventContents = contentsRepository.findByUserIdAndCategory(userId, "event");

		for (Contents content : groupContents) {
			groupTotal += content.getPages();
			groupCompleted += yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId()).size();
		}

		for (Contents content : eventContents) {
			eventTotal += content.getPages();
			eventCompleted += yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId()).size();
		}

		result.put("groupProgress", groupTotal != 0 ? (groupCompleted * 100) / groupTotal : 0);
		result.put("eventProgress", eventTotal != 0 ? (eventCompleted * 100) / eventTotal : 0);

		return result;
	}

	private List<ContentsData> createContentsListForView(Long userId) {
		List<Contents> allContents = contentsRepository.findByUserId(userId);
		List<ContentsData> contentsListForView = new ArrayList<>();

		for (Contents content : allContents) {
			List<YearbookSummary> existingPages = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
			List<YearbookSummary> fullPageList = new ArrayList<>();

			for (int i = 1; i <= content.getPages(); i++) {
				final int currentPageNo = i;
				YearbookSummary pageToAdd = existingPages.stream().filter(p -> p.getPageNo() == currentPageNo)
						.findFirst().orElseGet(() -> createEmptyPage(content.getId(), currentPageNo));
				fullPageList.add(pageToAdd);
			}

			ContentsData data = new ContentsData();
			data.setContentsInfo(content);
			data.setYearbookPages(fullPageList);
			data.setSavedPagesCount(existingPages.size());
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
		if (loginUser == null)
			return Collections.emptyList();

		List<UserTheme> userThemes = userThemeRepository.findByUserId(loginUser.getId());
		if (userThemes.isEmpty() || userThemes.get(0).getFontIds() == null)
			return Collections.emptyList();

		try {
			List<Long> fontIds = Arrays.stream(userThemes.get(0).getFontIds().split(",")).map(String::trim)
					.map(Long::parseLong).collect(Collectors.toList());
			List<Theme> themes = themeRepository.findAllById(fontIds);
			return themes.stream().map(theme -> new FontDto(theme.getId(), theme.getFilename(), theme.getFontPath()))
					.collect(Collectors.toList());
		} catch (NumberFormatException e) {
			return Collections.emptyList();
		}
	}

	// ▼▼▼ [신규] 이미지 업로드 API ▼▼▼
	/**
	 * 사용자가 업로드한 사진 파일을 서버에 저장하고, 웹에서 접근 가능한 상대 경로를 반환합니다.
	 * 
	 * @param file 업로드된 이미지 파일
	 * @return 성공 시 이미지 경로, 실패 시 에러 메시지를 담은 ResponseEntity
	 */
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
			// 1. 저장할 디렉토리 생성 (없으면)
			Path uploadDir = Paths.get(userPhotosPath);
			if (!Files.exists(uploadDir)) {
				Files.createDirectories(uploadDir);
			}

			// 2. 고유한 파일명 생성 (UUID 사용)
			String originalFileName = file.getOriginalFilename();
			String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
			String uniqueFileName = UUID.randomUUID().toString() + extension;

			// 3. 파일 저장
			Path filePath = uploadDir.resolve(uniqueFileName);
			file.transferTo(filePath.toFile());

			// 4. 클라이언트에게 반환할 상대 경로 생성
			// (예: "/user_photos/a1b2c3d4.jpg")
			String webAccessiblePath = "/photo/" + uniqueFileName;

			return ResponseEntity.ok(Map.of("filePath", webAccessiblePath));

		} catch (IOException e) {
			e.printStackTrace();
			return new ResponseEntity<>(Map.of("error", "Failed to save file: " + e.getMessage()),
					HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	// --- savePage (기존과 거의 동일, 로직 변경 없음) ---
	// 이제 designDataJson에는 Base64가 아닌 이미지 파일 경로가 포함됩니다.
	@PostMapping("/edit/savePage")
	@ResponseBody
	public Map<String, Object> savePage(@RequestBody Map<String, Object> payload) {
		Long yearbookId = parseId(payload.get("yearbookId"));
		String designDataJson = (String) payload.get("designData");

		Yearbook page = yearbookId != null ? updateExistingPage(yearbookId) : createNewPage(payload);

		page.setDesignData(designDataJson);
		page.setLastSaved(new Date());

		// ✅ 썸네일 생성 로직 없이 데이터만 저장하고 바로 종료합니다.
		Yearbook savedPage = yearbookRepository.saveAndFlush(page);

		return createSaveResponse(savedPage, savedPage.getThumbnailPath());
	}

	// --- 페이지 데이터 로드, 리셋, 순서 변경 API (기존과 동일) ---
	@GetMapping("/edit/pageData")
	@ResponseBody
	public Yearbook getPageData(@RequestParam("id") Long yearbookId) {
		return yearbookRepository.findById(yearbookId)
				.orElseThrow(() -> new RuntimeException("Yearbook page not found with id: " + yearbookId));
	}

	@PostMapping("/edit/resetPage")
	@ResponseBody
	public Map<String, Object> resetPage(@RequestParam("id") Long id) {
		Map<String, Object> response = new HashMap<>();
		try {
			yearbookRepository.deleteById(id);
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

	// --- 헬퍼 메소드들 (기존과 동일) ---
	private Long parseId(Object idObj) {
		return (idObj != null && !idObj.toString().isEmpty()) ? Long.parseLong(idObj.toString()) : null;
	}

	private Yearbook updateExistingPage(Long yearbookId) {
		return yearbookRepository.findById(yearbookId).orElseThrow(() -> new RuntimeException("페이지를 찾을 수 없습니다."));
	}

	private Yearbook createNewPage(Map<String, Object> payload) {
		Long contentsId = Long.parseLong(payload.get("contentsId").toString());
		Integer pageNo = Integer.parseInt(payload.get("pageNo").toString());
		Long userId = Long.parseLong(payload.get("userId").toString());
		Yearbook page = yearbookRepository.findByContentsIdAndPageNo(contentsId, pageNo).orElse(new Yearbook());
		if (page.getId() == null) {
			page.setUserId(userId);
			page.setContentsId(contentsId);
			page.setPageNo(pageNo);
		}
		return page;
	}

	private String generateThumbnail(String designDataJson, Long pageId) {
		try {
			return thumbnailRenderingService.generateThumbnail(designDataJson, pageId);
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	private Map<String, Object> createSaveResponse(Yearbook savedPage, String newImagePath) {
		Map<String, Object> response = new HashMap<>();
		response.put("newImagePath", newImagePath);
		response.put("newYearbookId", savedPage.getId());
		response.put("lastSaved", savedPage.getLastSaved());
		response.put("updatedSavedCount",
				yearbookRepository.findByContentsIdOrderByPageNoAsc(savedPage.getContentsId()).size());
		response.put("contentsId", savedPage.getContentsId());
		return response;
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

	@PostMapping("/edit/savePageWithThumbnail")
	@ResponseBody
	public Map<String, Object> savePageWithThumbnail(@RequestParam("payload") String payloadJson,
			@RequestParam(value = "thumbnailFile", required = false) MultipartFile thumbnailFile, HttpSession session) {

		try {
			if (!canEdit(session)) {
				Map<String, Object> errorResponse = new HashMap<>();
				errorResponse.put("success", false);
				errorResponse.put("message", "This has already been submitted and cannot be edited.");
				return errorResponse;
			}

			// ObjectMapper를 사용하여 JSON 문자열을 DTO 객체로 변환
			ObjectMapper mapper = new ObjectMapper();
			PayloadDto payload = mapper.readValue(payloadJson, PayloadDto.class);

			// 서비스 레이어에 작업 위임
			Map<String, Object> result = yearbookService.savePageAndThumbnail(payload, thumbnailFile);

			return result;

		} catch (IOException e) {
			e.printStackTrace();
			// 에러 발생 시 실패 응답 반환
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", "Error processing request: " + e.getMessage());
			return errorResponse;
		}
	}

	@PostMapping("/edit/savePageWithTextImages")
	@ResponseBody
	public Map<String, Object> savePageWithTextImages(@RequestParam("payload") String payloadJson,
			@RequestParam(value = "thumbnailFile", required = false) MultipartFile thumbnailFile,
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

			// JSON 파싱
			Map<String, Object> designData = mapper.readValue(payload.getDesignData(), Map.class);
			List<Map<String, Object>> textBoxes = (List<Map<String, Object>>) designData.get("textBoxes");

			// 텍스트 이미지 저장 디렉토리
			Path textImagesDir = Paths.get(userPhotosPath, "text-images");
			Files.createDirectories(textImagesDir);

			List<String> savedTextImagePaths = new ArrayList<>();

			// 각 텍스트 이미지 처리
			for (Map.Entry<String, MultipartFile> entry : files.entrySet()) {
				if (entry.getKey().startsWith("textImage_")) {
					String indexStr = entry.getKey().substring("textImage_".length());
					int index = Integer.parseInt(indexStr);

					if (index < textBoxes.size()) {
						MultipartFile imageFile = entry.getValue();

						// 고유 파일명 생성
						String fileName = UUID.randomUUID().toString() + ".png";
						Path filePath = textImagesDir.resolve(fileName);
						imageFile.transferTo(filePath.toFile());

						String webPath = "/photo/text-images/" + fileName;

						// textBox 데이터에 이미지 경로 추가
						Map<String, Object> textBox = textBoxes.get(index);
						textBox.put("renderImage", webPath);
						textBox.put("isModified", false);

						savedTextImagePaths.add(webPath);
					}
				}
			}

			// 업데이트된 designData를 다시 JSON으로 변환
			payload.setDesignData(mapper.writeValueAsString(designData));

			// 기존 저장 로직 활용
			Map<String, Object> result = yearbookService.savePageAndThumbnail(payload, thumbnailFile);
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

	@PostMapping("/edit/uploadImageVersions")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> uploadImageVersions(
			@RequestParam("originalFile") MultipartFile originalFile, @RequestParam("editFile") MultipartFile editFile,
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
			// 디렉토리 준비
			Path uploadDir = Paths.get(userPhotosPath);
			Path originalsDir = uploadDir.resolve("originals");
			Path editsDir = uploadDir.resolve("edits");

			Files.createDirectories(originalsDir);
			Files.createDirectories(editsDir);

			String uniqueId = UUID.randomUUID().toString();

			// 원본 저장
			String originalExt = getFileExtension(originalFile.getOriginalFilename());
			String originalName = uniqueId + "_original" + originalExt;
			Path originalPath = originalsDir.resolve(originalName);
			originalFile.transferTo(originalPath.toFile());

			// 편집용 저장 (이미 클라이언트에서 처리됨)
			String editName = uniqueId + "_edit.jpg";
			Path editPath = editsDir.resolve(editName);
			editFile.transferTo(editPath.toFile());

			// 응답
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

	private String getFileExtension(String filename) {
		if (filename == null || !filename.contains(".")) {
			return "";
		}
		return filename.substring(filename.lastIndexOf("."));
	}

	/**
	 * HEIC 파일을 서버에서 JPEG로 변환 (pillow-heif 사용) heic2any가 처리하지 못하는 특수 HEIC 파일용 폴백
	 */
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
			// 임시 파일 생성
			tempHeic = Files.createTempFile("heic_", ".heic");
			tempJpg = Files.createTempFile("converted_", ".jpg");

			// HEIC 파일 저장
			file.transferTo(tempHeic.toFile());

			String heicPath = tempHeic.toString().replace("\\", "/");
			String jpgPath = tempJpg.toString().replace("\\", "/");

			// Python pillow-heif로 변환
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

			// 변환된 파일 읽기
			byte[] jpegData = Files.readAllBytes(tempJpg);

			return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_JPEG).body(jpegData);

		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		} finally {
			// 임시 파일 정리
			try {
				if (tempHeic != null)
					Files.deleteIfExists(tempHeic);
				if (tempJpg != null)
					Files.deleteIfExists(tempJpg);
			} catch (IOException ignored) {
			}
		}
	}
}