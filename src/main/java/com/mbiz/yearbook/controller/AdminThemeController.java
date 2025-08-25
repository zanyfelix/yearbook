package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
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
	    
	    return "admin/theme";
	}
	
	@PostMapping("/theme/save")
	public ResponseEntity<Map<String, String>> save(@RequestBody UserTheme userTheme) {
		themeService.saveUserTheme(userTheme.getUser().getId(), userTheme.getCategory(), userTheme.getTheme().getId());
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