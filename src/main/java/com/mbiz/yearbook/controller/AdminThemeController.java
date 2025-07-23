package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.service.ThemeService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminThemeController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
    private ThemeService themeService;
	
	@PostMapping("/theme")
	public String showForm(HttpSession session, @RequestParam Long userId, 
			@RequestParam(defaultValue = "background") String category, Model model) {
		
	    User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userService.findAll();
	    model.addAttribute("allUsers", allUsers);
	    model.addAttribute("userId", userId);
	    model.addAttribute("currentMenu", "theme");
	    
	    model.addAttribute("category", category);
	    
	    List<Long> selectedIds = themeService.findThemeIdsByUserAndCategory(userId, category);
	    model.addAttribute("selectedIds", selectedIds);
	    
	    // 카테고리별 테마 리스트
	    model.addAttribute("backgroundList", themeService.findByCategory("background"));
	    model.addAttribute("frameList", themeService.findByCategory("frame"));
	    model.addAttribute("fontList", themeService.findByCategory("font"));

	    return "admin/theme";
	}
	
	@PostMapping("/theme/save")
	public ResponseEntity<Map<String, String>> save(@RequestBody UserTheme userTheme) {
		themeService.saveUserTheme(userTheme.getId(), userTheme.getCategory(), userTheme.getThemeIds());
		return ResponseEntity.ok(Map.of("status", "success"));
	}
	
//	@PostMapping("/theme/register")
//	public String register(@ModelAttribute User user, BindingResult br, Model model) {
//        if (br.hasErrors()) {
//        	model.addAttribute("users", userService.findAll());
//            return "admin/user";
//        }
//        
//        try {
//        	userService.register(user);
//        } catch (DuplicateUserIdException ex) {
//            br.rejectValue("userId", "duplicate", ex.getMessage());
//            model.addAttribute("users", userService.findAll());
//            return "admin/user";
//        }
//        
//        return "redirect:/admin/user";
//    }
//	
//	@PostMapping("/theme/modify")
//	public String update(@ModelAttribute User user, RedirectAttributes attrs) {
//        userService.update(user);
//        attrs.addFlashAttribute("successMessage", "사용자 정보가 수정되었습니다.");
//        return "redirect:/admin/user";
//    }
//	
//	@PostMapping("/theme/delete")
//    public String delete(@RequestParam(value = "ids", required = false) List<Long> ids,
//                         RedirectAttributes attrs) {
//        if (ids == null || ids.isEmpty()) {
//            attrs.addFlashAttribute("errorMessage", "삭제할 사용자를 선택하세요.");
//        } else {
//        	int deleted = userService.deleteUsers(ids);
//            attrs.addFlashAttribute("successMessage", deleted + "명의 사용자가 삭제되었습니다.");
//        }
//        return "redirect:/admin/user";
//    }
//	
//	@PostMapping("/theme/toggle-active")
//	public ResponseEntity<Map<String, String>> toggleActive(@RequestBody ToggleActiveDto dto) {
//		userService.updateActive(dto.getId(), dto.isActive());
//        return ResponseEntity.ok().build();
//	}
}