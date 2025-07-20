package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.ToggleActiveDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.UserService;
import com.mbiz.yearbook.util.DuplicateUserIdException;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminThemeController {
	
	@Autowired
    private UserService userService;

	@GetMapping("/theme")
	public String showForm(HttpSession session,
			@RequestParam(value = "type", defaultValue = "userId") String type,
            @RequestParam(value = "keyword", required = false) String keyword,
            Model model) {
		
	    User user = (User) session.getAttribute("loginUser");
	    
	    List<User> users = userService.getUser(type, keyword);
	    model.addAttribute("type", type);
        model.addAttribute("keyword", keyword);
	    model.addAttribute("users", users);
	    
	    model.addAttribute("currentMenu", "user");

	    return "admin/user";
	}
	
	@PostMapping("/theme/register")
	public String register(@ModelAttribute User user, BindingResult br, Model model) {
        if (br.hasErrors()) {
        	model.addAttribute("users", userService.findAll());
            return "admin/user";
        }
        
        try {
        	userService.register(user);
        } catch (DuplicateUserIdException ex) {
            br.rejectValue("userId", "duplicate", ex.getMessage());
            model.addAttribute("users", userService.findAll());
            return "admin/user";
        }
        
        return "redirect:/admin/user";
    }
	
	@PostMapping("/theme/modify")
	public String update(@ModelAttribute User user, RedirectAttributes attrs) {
        userService.update(user);
        attrs.addFlashAttribute("successMessage", "사용자 정보가 수정되었습니다.");
        return "redirect:/admin/user";
    }
	
	@PostMapping("/theme/delete")
    public String delete(@RequestParam(value = "ids", required = false) List<Long> ids,
                         RedirectAttributes attrs) {
        if (ids == null || ids.isEmpty()) {
            attrs.addFlashAttribute("errorMessage", "삭제할 사용자를 선택하세요.");
        } else {
        	int deleted = userService.deleteUsers(ids);
            attrs.addFlashAttribute("successMessage", deleted + "명의 사용자가 삭제되었습니다.");
        }
        return "redirect:/admin/user";
    }
	
	@PostMapping("/theme/toggle-active")
	public ResponseEntity<Map<String, String>> toggleActive(@RequestBody ToggleActiveDto dto) {
		userService.updateActive(dto.getId(), dto.isActive());
        return ResponseEntity.ok().build();
	}
}