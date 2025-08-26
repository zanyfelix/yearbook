package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.ThemeService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
public class AdminThemeController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
    private ThemeService themeService;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private ThemeRepository themeRepository;
	
	@GetMapping("/admin/theme")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, 
			@RequestParam(defaultValue = "background") String category, Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    if (id == null) {
	    	List<User> users = userRepository.findByRole("user");
	        model.addAttribute("users", users);
	    } else {
	        userRepository.findById(id).ifPresent(user -> model.addAttribute("users", List.of(user)));
	    }
	    
	    //현재 사용자에 대한 아이디 값
	    model.addAttribute("id", id);
	    model.addAttribute("currentMenu", "theme");
	    
	    model.addAttribute("category", category);
	    
	    //List<Long> selectedIds = themeService.findThemeIdsByUserAndCategory(id, category,"");
	    //model.addAttribute("selectedIds", selectedIds);
	    
	    //List<Theme> themes = themeRepository.findAll();
        //model.addAttribute("themes", themes);
	    
	    return "admin/theme";
	}
	
	/**
	 * [수정] 여러 사용자의 테마와 폰트를 개별적으로 저장하고 업데이트하는 API
	 * @param requests 사용자별 설정 정보를 담은 요청 객체 리스트
	 * @return 처리 결과
	 */
	@PostMapping("/admin/theme/apply")
	public ResponseEntity<?> applyThemeToUsers(@RequestBody List<ThemeUpdateRequest> requests) {
	    if (requests == null || requests.isEmpty()) {
	        return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "No data to save."));
	    }

	    try {
	        // 각 사용자에 대해 테마와 폰트 정보를 저장합니다.
	        for (ThemeUpdateRequest request : requests) {
	            themeService.saveUserTheme1(request.getUserId(), request.getThemeId());
	            
	            // TODO: 폰트 저장 로직 추가 (필요시)
	            // 예: userService.updateUserFont(request.getUserId(), request.getFont());
	        }
	        return ResponseEntity.ok(Map.of("status", "success", "message", "Changes applied successfully."));
	    } catch (Exception e) {
	        // 예외 발생 시 서버 로그에 기록하고 500 에러를 반환합니다.
	        // log.error("Error applying themes", e);
	        return ResponseEntity.status(500).body(Map.of("status", "error", "message", "An error occurred: " + e.getMessage()));
	    }
	}

	// JavaScript에서 데이터를 받기 위한 DTO(Data Transfer Object) 클래스
	public static class ThemeUpdateRequest {
	    private Long userId;
	    private Long themeId;
	    private String font;

	    // Getters and Setters
	    public Long getUserId() { return userId; }
	    public void setUserId(Long userId) { this.userId = userId; }
	    public Long getThemeId() { return themeId; }
	    public void setThemeId(Long themeId) { this.themeId = themeId; }
	    public String getFont() { return font; }
	    public void setFont(String font) { this.font = font; }
	}
	
	// 단일 저장 로직 (기존 코드 유지)
	@PostMapping("/theme/save")
	public ResponseEntity<Map<String, String>> save(@RequestBody UserTheme userTheme) {
		themeService.saveUserTheme(userTheme.getUser().getId(), userTheme.getCategory(), userTheme.getTheme().getId());
		return ResponseEntity.ok(Map.of("status", "success"));
	}
}