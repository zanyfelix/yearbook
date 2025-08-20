package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.ToggleActiveDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.HomeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
public class AdminHomeController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
    private HomeService homeService;
	
	@Autowired
	private HomeRepository homeRepository;
	
	private final String UPLOAD_DIR = "uploads/";

	@GetMapping("/admin/home")
	public String showForm(HttpSession session, @RequestParam(required = false) Long userId, @RequestParam(required = false) Long id, Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> users = userRepository.findByRole("user");
        model.addAttribute("users", users);
		
	    model.addAttribute("id", id);
	    model.addAttribute("userId", userId);
	    
	    List<Home> homeList = homeRepository.findByUserId(userId);
	    model.addAttribute("homeList", homeList);
	    //메인은 사용자별 1개
	    List<Home> mainList = homeRepository.findByUserIdAndType(userId, "main");
	    
	    if(mainList.size() > 0) {
	    	model.addAttribute("main", mainList.get(0));
	    	 if (mainList.get(0).getAttachmentPath() != null && !mainList.get(0).getAttachmentPath().isEmpty()) {
	 	        String attachmentPath = mainList.get(0).getAttachmentPath();
	 	        String storedFileName = attachmentPath.substring(attachmentPath.lastIndexOf("/") + 1);
	 	        String originalFileName = storedFileName.substring(storedFileName.indexOf("_") + 1);
	 	        model.addAttribute("guidanceFileName", originalFileName);
	 	    }
	    }
	    
	    model.addAttribute("currentMenu", "home");

	    return "admin/home";
	}
	
	@PostMapping("/uploadGuidance")
	public String admitHomeSubmit(@RequestParam("mainId") Long mainId, // 1. Home 객체 대신 id를 직접 받습니다.
	                          @RequestParam("file") MultipartFile file,
	                          RedirectAttributes redirectAttributes) throws IOException {

		Home homeToUpdate = homeRepository.findById(mainId)
	            .orElseThrow(() -> new IllegalArgumentException("Invalid home Id:" + mainId));

	    if (!file.isEmpty()) {
	        // 파일 저장 로직은 동일합니다.
	        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
	        Path filepath = Paths.get(UPLOAD_DIR, filename);
	        Files.createDirectories(filepath.getParent());
	        Files.write(filepath, file.getBytes());

	        // 3. 불러온 객체의 attachmentPath 필드만 수정합니다.
	        homeToUpdate.setAttachmentPath("/" + filepath.toString().replace("\\", "/"));
	    }

	    // 4. 수정된 객체를 저장합니다. JPA가 변경된 필드만 감지하여 업데이트합니다.
	    homeService.save(homeToUpdate); 
        return "redirect:/admin/home";
    }
	
	@GetMapping("/downloadGuidance")
	public ResponseEntity<Resource> downloadGuidanceFile(@RequestParam("mainId") Long mainId) {
	    // 1. ID로 Home 객체를 찾아 첨부파일 경로를 가져옵니다.
	    Home home = homeRepository.findById(mainId)
	            .orElseThrow(() -> new RuntimeException("Error: File not found."));

	    String storedFileName = home.getAttachmentPath().substring(home.getAttachmentPath().lastIndexOf("/") + 1);
	    String originalFileName = storedFileName.substring(storedFileName.indexOf("_") + 1);

	    try {
	        // 2. 파일 경로를 통해 리소스를 로드합니다.
	        Path filePath = Paths.get(UPLOAD_DIR).resolve(storedFileName).normalize();
	        Resource resource = new UrlResource(filePath.toUri());

	        if (resource.exists() && resource.isReadable()) {
	            // 3. 다운로드 시 사용할 원본 파일명으로 헤더를 설정합니다.
	            String encodedFileName = new String(originalFileName.getBytes(StandardCharsets.UTF_8), StandardCharsets.ISO_8859_1);
	            HttpHeaders headers = new HttpHeaders();
	            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"");

	            // 4. 파일을 ResponseEntity에 담아 반환합니다.
	            return ResponseEntity.ok()
	                    .headers(headers)
	                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
	                    .body(resource);
	        } else {
	            throw new RuntimeException("Error: File not found or is not readable.");
	        }
	    } catch (MalformedURLException e) {
	        throw new RuntimeException("Error: Malformed URL.", e);
	    }
	}
	
	// REGISTER(등록) 및 MODIFY(수정) 처리
	@PostMapping("/admin/home/register")
	public String registerOrModifyHome(@ModelAttribute Home home, @RequestParam("userId") Long userId, RedirectAttributes redirectAttributes) {
	    // type을 "content"로 설정하여 Yearbook Guidance와 구분
	    home.setType("content");
	    home.setUserId(userId);
	    homeService.save(home);
	    
	    redirectAttributes.addFlashAttribute("successMessage", "saved successfully.");
	    // 작업 후 현재 보고있던 사용자의 페이지로 리다이렉트
	    return "redirect:/admin/home?userId=" + userId;
	}

	// DELETE(삭제) 처리
	@PostMapping("/admin/home/delete")
	public ResponseEntity<String> deleteHome(@RequestParam("ids") List<Long> ids) {
	    try {
	        ids.forEach(id -> homeRepository.deleteById(id));
	        return ResponseEntity.ok("선택한 항목이 삭제되었습니다.");
	    } catch (Exception e) {
	        return ResponseEntity.status(500).body("삭제 중 오류가 발생했습니다.");
	    }
	}

	// APPLY(적용) 처리 - isActive 상태를 true로 변경
	@PostMapping("/admin/home/apply")
	public ResponseEntity<String> applyHome(@RequestParam("ids") List<Long> ids) {
	    try {
	        List<Home> homesToUpdate = homeRepository.findAllById(ids);
	        for (Home home : homesToUpdate) {
	            home.setIsActive(true);
	        }
	        homeRepository.saveAll(homesToUpdate);
	        return ResponseEntity.ok("선택한 항목이 적용되었습니다.");
	    } catch (Exception e) {
	        return ResponseEntity.status(500).body("적용 중 오류가 발생했습니다.");
	    }
	}
	
	@PostMapping("/admin/home/toggle-active")
	public ResponseEntity<Map<String, String>> toggleActive(@RequestBody ToggleActiveDto dto) {
		homeService.updateActive(dto.getId(), dto.isActive());
        return ResponseEntity.ok().build();
	}
}