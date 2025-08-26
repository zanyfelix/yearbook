package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mbiz.yearbook.model.FontDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.model.UserWithThemeDto;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.UserThemeRepository;
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
	
	@Autowired
	private UserThemeRepository userThemeRepository;
	
	@GetMapping("/admin/theme")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, 
			@RequestParam(defaultValue = "background") String category, Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    List<User> userList = (id == null)
	            ? userRepository.findByRole("user")
	            : userRepository.findById(id).map(List::of).orElse(List.of());
	    
	 // 1. 모든 UserTheme 정보를 한 번에 가져와 Map으로 변환 (효율적인 조회를 위해)
        Map<Long, UserTheme> userThemeMap = userThemeRepository.findAll().stream()
                .collect(Collectors.toMap(ut -> ut.getUser().getId(), ut -> ut, (existing, replacement) -> existing));

        // 2. User 목록을 DTO 목록으로 변환합니다.
        List<UserWithThemeDto> userWithThemes = userList.stream()
                .map(user -> {
                    UserTheme userTheme = userThemeMap.get(user.getId());
                    return new UserWithThemeDto(user, userTheme);
                })
                .collect(Collectors.toList());

        // 3. 최종적으로 가공된 DTO 리스트를 모델에 담습니다.
        model.addAttribute("userWithThemes", userWithThemes);
        
	    //현재 사용자에 대한 아이디 값
        model.addAttribute("themes", themeRepository.findDistinctThemeSelections());
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
	            themeService.saveUserTheme(request.getUserId(), request.getThemeId(), request.getFontId());
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
	    private Long fontId;

	    // Getters and Setters
	    public Long getUserId() { return userId; }
	    public void setUserId(Long userId) { this.userId = userId; }
	    public Long getThemeId() { return themeId; }
	    public void setThemeId(Long themeId) { this.themeId = themeId; }
	    public Long getFontId() { return fontId; }
	    public void setFontId(Long fontId) { this.fontId = fontId; }
	}
	
	@GetMapping("/api/themes/{themeNo}/fonts")
    @ResponseBody
    public ResponseEntity<List<FontDto>> getFontsForTheme(@PathVariable Long themeNo) {
        List<FontDto> fonts = themeRepository.findFontsByThemeNo(themeNo);
        return ResponseEntity.ok(fonts);
    }
}