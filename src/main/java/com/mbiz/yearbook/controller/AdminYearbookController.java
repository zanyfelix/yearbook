package com.mbiz.yearbook.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.DownloadProgressService;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.JpgRenderingService;
import com.mbiz.yearbook.service.PdfRenderingService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Controller
public class AdminYearbookController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
    private HomeService homeService;
	
	@Autowired
	private PdfRenderingService pdfRenderingService;
	
	@Autowired
	private JpgRenderingService jpgRenderingService;

	@Autowired
	private DownloadProgressService downloadProgressService;

	@Autowired
	private ContentsRepository contentsRepository;

	@Autowired
	private YearbookRepository yearbookRepository;

	private final String UPLOAD_DIR = "upload/";

	@GetMapping("/admin/yearbook")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, @RequestParam(required = false) Long userId, Model model) {
		
		if (id != null) {
			Optional<User> userOptional = userRepository.findById(id);
			if (userOptional.isPresent()) {
	            User user = userOptional.get();
	            String role = user.getRole().toUpperCase();
	            
	            switch (role) {
	                case "USER":
	                    return "redirect:/admin/home?userId="+id;
	                default:
	                    break;
	            }
	        }
	    }
		
		User loginUser = (User) session.getAttribute("loginUser");
        if (loginUser == null) {
            return "redirect:/login"; // Redirect to login if no user is logged in
        }
        model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    List<User> users;
        if (userId == null) {
            // Show all non-admin users when userId is null (for "All" option)
            users = userRepository.findByRole("user");
        } else {
            // Show only the selected user
            users = userRepository.findById(userId)
                .map(user -> List.of(user))
                .orElse(List.of());
        }
        model.addAttribute("users", users);
	    
	    model.addAttribute("id", id);
	    model.addAttribute("userId", userId);
	    model.addAttribute("currentMenu", "yearbook");

	    return "admin/yearbook";
	}
	
	/**
	 * SSE 구독 엔드포인트 – 다운로드 진행률 실시간 전송
	 * 프론트엔드가 progressToken 을 생성 후 이 URL 을 EventSource 로 구독
	 */
	@GetMapping(value = "/admin/yearbook/progress", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public SseEmitter subscribeProgress(@RequestParam("token") String token) {
	    return downloadProgressService.createEmitter(token);
	}

	/**
	 * 특정 사용자의 카테고리-그룹-페이지 계층 조회 (모달용)
	 * 반환 구조: category → groups → pages (thumbnailPath 포함)
	 *
	 * @param userId 조회할 사용자 ID
	 * @return [ { category, categoryLabel, groups: [ { contentsId, title, pages: [ { id, pageNo, thumbnailPath } ] } ] } ]
	 */
	@GetMapping("/admin/yearbook/pages")
	@ResponseBody
	public ResponseEntity<List<Map<String, Object>>> getYearbookPages(@RequestParam("userId") Long userId) {

		List<Contents> contentsList = contentsRepository.findByUserId(userId);

		// category 순서: group 먼저, event 나중
		contentsList.sort((a, b) -> {
			int oa = "group".equalsIgnoreCase(a.getCategory()) ? 0 : 1;
			int ob = "group".equalsIgnoreCase(b.getCategory()) ? 0 : 1;
			if (oa != ob) return oa - ob;
			return Long.compare(a.getId(), b.getId());
		});

		// category → groups 매핑
		Map<String, List<Map<String, Object>>> categoryGroups = new LinkedHashMap<>();
		for (Contents contents : contentsList) {
			String cat = contents.getCategory() != null ? contents.getCategory().toLowerCase() : "event";
			List<Map<String, Object>> groups = categoryGroups.computeIfAbsent(cat, k -> new ArrayList<>());

			List<Yearbook> pages = yearbookRepository.findByContentsIdOrderByPageNoAsc(contents.getId());
			if (pages.isEmpty()) continue;

			List<Map<String, Object>> pageList = new ArrayList<>();
			for (Yearbook yb : pages) {
				Map<String, Object> pageMap = new LinkedHashMap<>();
				pageMap.put("id", yb.getId());
				pageMap.put("pageNo", yb.getPageNo());
				pageMap.put("thumbnailPath", yb.getThumbnailPath());
				pageList.add(pageMap);
			}

			Map<String, Object> groupMap = new LinkedHashMap<>();
			groupMap.put("contentsId", contents.getId());
			groupMap.put("title", contents.getTitle());
			groupMap.put("pages", pageList);
			groups.add(groupMap);
		}

		// 최종 결과 리스트 조합
		List<Map<String, Object>> result = new ArrayList<>();
		categoryGroups.forEach((cat, groups) -> {
			Map<String, Object> catMap = new LinkedHashMap<>();
			catMap.put("category", cat);
			catMap.put("categoryLabel", "group".equals(cat) ? "Group Photo" : "Event Photo");
			catMap.put("groups", groups);
			result.add(catMap);
		});

		return ResponseEntity.ok(result);
	}

	/**
	 * 선택된 페이지(Yearbook ID 목록)만 렌더링하여 ZIP 다운로드 (진행률 SSE 지원)
	 *
	 * @param pageIds 렌더링할 Yearbook ID 목록 (쉼표 구분)
	 * @param format  이미지 포맷 (기본 jpg)
	 * @param token   progressToken – SSE 이벤트 전송용 (optional)
	 */
	@GetMapping("/admin/yearbook/downloadSelected")
	public void downloadSelected(
	        @RequestParam("pageIds") List<Long> pageIds,
	        @RequestParam(value = "format", defaultValue = "jpg") String format,
	        @RequestParam(value = "token", required = false) String token,
	        HttpServletResponse response) throws IOException {

		String normalizedFormat = format.toLowerCase();
		if (!"jpg".equals(normalizedFormat)) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST, "jpg 포맷만 지원합니다.");
			downloadProgressService.completeWithError(token, "지원하지 않는 포맷입니다.");
			return;
		}

		int total = pageIds.size();
		Map<String, Object> initData = new LinkedHashMap<>();
		initData.put("total", total);
		downloadProgressService.sendEvent(token, "init", initData);

		File zipFile = null;
		try {
			// packaging 이벤트 (렌더링 전 표시)
			downloadProgressService.sendEvent(token, "packaging", "페이지 렌더링 중...");

			zipFile = jpgRenderingService.renderAndZipSelectedPages(pageIds, normalizedFormat,
			        downloadProgressService, token);

			if (zipFile == null || !zipFile.exists()) {
				response.sendError(HttpServletResponse.SC_NOT_FOUND, "렌더링할 페이지가 없습니다.");
				downloadProgressService.completeWithError(token, "렌더링할 페이지가 없습니다.");
				return;
			}

			response.setContentType("application/zip");
			response.setHeader("Content-Disposition", buildContentDisposition(zipFile.getName()));

			// SSE 완료 처리 후 스트리밍
			downloadProgressService.complete(token);

			streamFileToResponse(zipFile, response);

		} catch (Exception e) {
			downloadProgressService.completeWithError(token, "렌더링 중 오류: " + e.getMessage());
			throw e;
		} finally {
			if (zipFile != null && zipFile.exists()) zipFile.delete();
		}
	}

	/**
	 * 특정 사용자의 원본 사진 파일을 카테고리/그룹/페이지 계층 구조 ZIP으로 다운로드.
	 * design_data JSON의 photos[].src 에서 /photo/originals/ 경로를 추출하여 묶음.
	 *
	 * @param userId 대상 사용자 ID
	 */
	@GetMapping("/admin/yearbook/downloadOriginals")
	public void downloadOriginals(
	        @RequestParam("userId") Long userId,
	        HttpServletResponse response) throws IOException {

	    Optional<User> userOpt = userRepository.findById(userId);
	    if (userOpt.isEmpty()) {
	        response.sendError(HttpServletResponse.SC_NOT_FOUND, "User not found: " + userId);
	        return;
	    }

	    File zipFile = null;
	    try {
	        zipFile = jpgRenderingService.zipOriginalPhotos(userId);

	        if (zipFile == null || !zipFile.exists() || zipFile.length() == 0) {
	            response.sendError(HttpServletResponse.SC_NOT_FOUND,
	                    "No original photos found for this user.");
	            return;
	        }

	        response.setContentType("application/zip");
	        response.setContentLength((int) zipFile.length());
	        response.setHeader("Content-Disposition", buildContentDisposition(zipFile.getName()));

	        streamFileToResponse(zipFile, response);

	    } catch (Exception e) {
	        if (!response.isCommitted()) {
	            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
	                    "Failed to create ZIP: " + e.getMessage());
	        }
	    } finally {
	        if (zipFile != null && zipFile.exists()) zipFile.delete();
	    }
	}

	/**
	 * 연감 다운로드 엔드포인트 (진행률 SSE 지원)
	 *
	 * @param userIds 선택된 사용자 ID 목록
	 * @param format  이미지 포맷 (현재 jpg 만 지원)
	 * @param token   progressToken – SSE 진행 이벤트 전송용 (optional)
	 */
	@GetMapping("/admin/yearbook/download")
	public void downloadYearbooks(
	        @RequestParam("ids") List<Long> userIds,
	        @RequestParam(value = "format", defaultValue = "jpg") String format,
	        @RequestParam(value = "token", required = false) String token,
	        HttpServletResponse response) throws IOException {

	    String normalizedFormat = format.toLowerCase();
	    if (!"jpg".equals(normalizedFormat)) {
	        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "지원하지 않는 형식입니다. jpg만 가능합니다.");
	        downloadProgressService.completeWithError(token, "지원하지 않는 포맷입니다.");
	        return;
	    }

	    int total = userIds.size();

	    // ── 사전 집계: 각 사용자의 전체 페이지 수 합산 ─────────────────
	    Map<Long, Integer> userPageCounts = new LinkedHashMap<>();
	    int totalPages = 0;
	    for (Long uid : userIds) {
	        List<Contents> contentsList = contentsRepository.findByUserId(uid);
	        int cnt = 0;
	        for (Contents c : contentsList) {
	            cnt += yearbookRepository.countByContentsId(c.getId());
	        }
	        userPageCounts.put(uid, cnt);
	        totalPages += cnt;
	    }

	    // ── 초기 이벤트: 총 학교 수 + 총 페이지 수 알림 ───────────────
	    Map<String, Object> initData = new LinkedHashMap<>();
	    initData.put("total",      total);
	    initData.put("totalPages", totalPages);
	    downloadProgressService.sendEvent(token, "init", initData);

	    List<File> userZipFiles = new ArrayList<>();
	    File masterZipFile = null;

	    try {
	        int globalOffset = 0;
	        for (int i = 0; i < userIds.size(); i++) {
	            Long userId = userIds.get(i);

	            // 학교 이름 조회 (없으면 ID 로 대체)
	            String schoolName = userRepository.findById(userId)
	                    .map(User::getSchoolName)
	                    .orElse("사용자 #" + userId);

	            // ── schoolStart 이벤트 (학교 컨텍스트 표시용) ───────────
	            Map<String, Object> startData = new LinkedHashMap<>();
	            startData.put("index",      i);
	            startData.put("total",      total);
	            startData.put("schoolName", schoolName);
	            downloadProgressService.sendEvent(token, "schoolStart", startData);

	            // 실제 렌더링 수행 (페이지 단위 SSE 포함)
	            File userZip = jpgRenderingService.renderAndZipUserYearbook(
	                    userId, normalizedFormat,
	                    downloadProgressService, token,
	                    globalOffset, totalPages);
	            if (userZip != null) {
	                userZipFiles.add(userZip);
	            }

	            // 다음 사용자를 위한 전역 오프셋 갱신
	            globalOffset += userPageCounts.getOrDefault(userId, 0);
	        }

	        if (userZipFiles.isEmpty()) {
	            response.sendError(HttpServletResponse.SC_NOT_FOUND, "렌더링할 페이지가 없습니다.");
	            downloadProgressService.completeWithError(token, "렌더링할 페이지가 없습니다.");
	            return;
	        }

	        // ── packaging 이벤트 ─────────────────────────────────────
	        downloadProgressService.sendEvent(token, "packaging", "ZIP 생성 중...");

	        if (userZipFiles.size() == 1) {
	            File fileToDownload = userZipFiles.get(0);
	            response.setContentType("application/zip");
	            response.setHeader("Content-Disposition", buildContentDisposition(fileToDownload.getName()));

	            // ZIP 스트리밍 전 SSE 완료 처리
	            downloadProgressService.complete(token);

	            streamFileToResponse(fileToDownload, response);
	        } else {
	            masterZipFile = createMasterZipFromZips(userZipFiles);
	            String masterTimestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmm"));
	            String masterFileName  = "yearbook_files_" + masterTimestamp + ".zip";
	            response.setContentType("application/zip");
	            response.setHeader("Content-Disposition", buildContentDisposition(masterFileName));

	            // ZIP 스트리밍 전 SSE 완료 처리
	            downloadProgressService.complete(token);

	            streamFileToResponse(masterZipFile, response);
	        }

	    } catch (Exception e) {
	        downloadProgressService.completeWithError(token, "렌더링 중 오류: " + e.getMessage());
	        throw e;
	    } finally {
	        for (File zipFile : userZipFiles) {
	            if (zipFile != null && zipFile.exists()) zipFile.delete();
	        }
	        if (masterZipFile != null && masterZipFile.exists()) masterZipFile.delete();
	    }
	}
	
    // 여러 개의 ZIP 파일을 하나의 마스터 ZIP으로 묶는 헬퍼 메소드
	private File createMasterZipFromZips(List<File> zipFiles) throws IOException {
	    File masterZip = File.createTempFile("master_collection_", ".zip");
	    try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(masterZip))) {
	        for (File zipFile : zipFiles) {
	            zos.putNextEntry(new ZipEntry(zipFile.getName()));
	            Files.copy(zipFile.toPath(), zos);
	            zos.closeEntry();
	        }
	    }
	    return masterZip;
	}

	private boolean isValidFormat(String format) {
	    return "jpg".equals(format) || "jpeg".equals(format) || 
	           "png".equals(format) || "tiff".equals(format) || "tif".equals(format);
	}
	
	/**
	 * Creates a master ZIP archive containing all user files (JPGs or ZIPs)
	 */
	private File createMasterZipArchive(List<File> userFiles) throws IOException {
	    File masterZipFile = File.createTempFile("yearbooks_collection", ".zip");
	    
	    try (ZipOutputStream zipOut = new ZipOutputStream(new FileOutputStream(masterZipFile))) {
	        for (File userFile : userFiles) {
	            if (userFile.getName().endsWith(".jpg")) {
	                // Direct JPG file - add to ZIP
	                ZipEntry zipEntry = new ZipEntry(userFile.getName());
	                zipOut.putNextEntry(zipEntry);
	                java.nio.file.Files.copy(userFile.toPath(), zipOut);
	                zipOut.closeEntry();
	            } else if (userFile.getName().endsWith(".zip")) {
	                // User's ZIP file - extract and add contents to master ZIP
	                extractZipToMasterZip(userFile, zipOut);
	            }
	        }
	    }
	    
	    return masterZipFile;
	}

	/**
	 * Extracts contents of a user's ZIP file and adds them to the master ZIP
	 */
	private void extractZipToMasterZip(File userZipFile, ZipOutputStream masterZipOut) throws IOException {
	    try (ZipInputStream userZipIn = new ZipInputStream(new FileInputStream(userZipFile))) {
	        ZipEntry entry;
	        while ((entry = userZipIn.getNextEntry()) != null) {
	            // Create a new entry in the master ZIP
	            ZipEntry newEntry = new ZipEntry(entry.getName());
	            masterZipOut.putNextEntry(newEntry);
	            
	            // Copy the file content
	            byte[] buffer = new byte[8192];
	            int length;
	            while ((length = userZipIn.read(buffer)) != -1) {
	                masterZipOut.write(buffer, 0, length);
	            }
	            
	            masterZipOut.closeEntry();
	            userZipIn.closeEntry();
	        }
	    }
	}

	/**
	 * Streams a file to the HTTP response
	 */

	/**
	 * RFC 5987 기반 Content-Disposition 헤더 생성 (한글 파일명 지원)
	 * - filename= : ASCII 폴백 (한글은 _ 로 대체)
	 * - filename*= : UTF-8 퍼센트 인코딩 (모든 브라우저에서 한글 파일명 표시)
	 */
	private String buildContentDisposition(String fileName) {
	    String asciiName = fileName.replaceAll("[^\\x20-\\x7E]", "_");
	    String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
	    return "attachment; filename=\"" + asciiName + "\"; filename*=UTF-8''" + encoded;
	}

	private void streamFileToResponse(File file, HttpServletResponse response) throws IOException {
	    response.setContentLength((int) file.length());
	    
	    try (FileInputStream fileInputStream = new FileInputStream(file);
	         OutputStream responseOutputStream = response.getOutputStream()) {
	        
	        byte[] buffer = new byte[8192];
	        int bytesRead;
	        while ((bytesRead = fileInputStream.read(buffer)) != -1) {
	            responseOutputStream.write(buffer, 0, bytesRead);
	        }
	        responseOutputStream.flush();
	    }
	}
}