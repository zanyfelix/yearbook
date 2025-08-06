package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.User;
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
	
	private final String UPLOAD_DIR = "uploads/";

	@GetMapping("/admin/home")
	public String showForm(HttpSession session, @RequestParam Long userId, Model model) {
		
		if (userId != null) {
			Optional<User> selectedUser = userRepository.findById(userId);
			if (selectedUser.isPresent()) {
			    User user = selectedUser.get();
			    String role = user.getRole(); // 안전함
			    // 사용자 역할에 따라 다른 페이지로 리다이렉트
		        if ("admin".equals(role)) {
		            return "redirect:/admin/user?userId=" + userId;
		        }
			}
	    }
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    //사용자 리스트(항상)
	    List<User> allUsers = userService.findAll();
	    model.addAttribute("allUsers", allUsers);
	    
	    List<Home> homeList = homeService.findAll();
	    model.addAttribute("homeList", homeList);
	    
	    //현재 사용자에 대한 아이디 값
	    model.addAttribute("userId", userId);
	    model.addAttribute("currentMenu", "home");

	    return "admin/home";
	}
	
//	@PostMapping("/uploadGuidance")
//	public String handleGuidanceUpload(@RequestParam("guidanceFile") MultipartFile file) {
//		adminHomeService.storeGuidanceFile(file);
//		return "redirect:/admin/settings/home"; // 업로드 후 설정 페이지로 리다이렉트
//	}
//
//	// AJAX 요청 처리 (RequestBody로 JSON 데이터를 받음)
//	@PostMapping("/saveContents")
//	@ResponseBody // JSON/Text 등 응답을 직접 반환
//	public ResponseEntity<String> saveAllContents(@RequestBody List<ContentBlockDto> contentBlockDtos) {
//		try {
//			adminHomeService.saveContentBlocks(contentBlockDtos);
//			return ResponseEntity.ok("성공적으로 저장되었습니다.");
//		} catch (Exception e) {
//			return ResponseEntity.status(500).body("저장 중 오류가 발생했습니다.");
//		}
//	}
}