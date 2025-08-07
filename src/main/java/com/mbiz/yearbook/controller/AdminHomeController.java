package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.HomeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.UserService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;

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
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, @RequestParam(required = false) Long homeId, 
			Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    if (id == null) {
	        List<User> users = userRepository.findAll();
	        model.addAttribute("users", users);
	    } else {
	        userRepository.findById(id).ifPresent(user -> model.addAttribute("users", List.of(user)));
	    }
	    
	    //Yearkbook Guidance 고정값
	    if(id == null) {
	    	id = (long) 11;
	    }
	    
	    //현재 사용자에 대한 아이디 값
	    model.addAttribute("id", id);
	    
	    // 수정된 부분: homeId 대신 guidanceHome 객체와 guidanceFileName을 모델에 추가
	    Home guidanceHome = homeRepository.findByUserIdAndType(id,"main").get(0);
	    model.addAttribute("guidanceHome", guidanceHome);
	    
	    // 첨부파일이 있을 경우, 원본 파일명을 추출하여 모델에 추가
	    if (guidanceHome.getAttachmentPath() != null && !guidanceHome.getAttachmentPath().isEmpty()) {
	        String attachmentPath = guidanceHome.getAttachmentPath();
	        String storedFileName = attachmentPath.substring(attachmentPath.lastIndexOf("/") + 1);
	        String originalFileName = storedFileName.substring(storedFileName.indexOf("_") + 1);
	        model.addAttribute("guidanceFileName", originalFileName);
	    }
	    
	    List<Home> homeList = homeRepository.findByUserIdAndType(id, "content");
	    model.addAttribute("homeList", homeList);
	    
	    model.addAttribute("currentMenu", "home");

	    return "admin/home";
	}
	
	@PostMapping("/uploadGuidance")
	public String admitHomeSubmit(@RequestParam("id") Long id, // 1. Home 객체 대신 id를 직접 받습니다.
	                          @RequestParam("file") MultipartFile file,
	                          RedirectAttributes redirectAttributes) throws IOException {

		Home homeToUpdate = homeRepository.findById(id)
	            .orElseThrow(() -> new IllegalArgumentException("Invalid home Id:" + id));

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
	public ResponseEntity<Resource> downloadGuidanceFile(@RequestParam("id") Long id) {
	    // 1. ID로 Home 객체를 찾아 첨부파일 경로를 가져옵니다.
	    Home home = homeRepository.findById(id)
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
	    
	    redirectAttributes.addFlashAttribute("successMessage", "성공적으로 저장되었습니다.");
	    // 작업 후 현재 보고있던 사용자의 페이지로 리다이렉트
	    return "redirect:/admin/home?id=" + userId;
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
}