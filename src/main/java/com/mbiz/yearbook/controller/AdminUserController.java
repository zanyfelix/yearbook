package com.mbiz.yearbook.controller;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.propertyeditors.CustomDateEditor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.InitBinder;
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
public class AdminUserController {
	
	@Autowired
    private UserService userService;
	
	@InitBinder
    public void initBinder(WebDataBinder binder) {
        var df = new SimpleDateFormat("yyyy-MM-dd");
        df.setLenient(false);
        // allowEmpty=true 로, 빈 문자열은 null로 처리
        binder.registerCustomEditor(Date.class, "deadline", new CustomDateEditor(df, true));
    }

	@GetMapping("/user")
	public String showForm(HttpSession session,
			@RequestParam(value = "type", defaultValue = "userId") String type,
            @RequestParam(value = "keyword", required = false) String keyword,
            Model model) {
		
	    User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    //사용자 리스트(항상)
	    List<User> allUsers = userService.findAll();
	    model.addAttribute("allUsers", allUsers);
	    
	    List<User> users = userService.getUser(type, keyword);
	    model.addAttribute("type", type);
        model.addAttribute("keyword", keyword);
	    model.addAttribute("users", users);
	    
	    model.addAttribute("currentMenu", "user");

	    return "admin/user";
	}
	
	@PostMapping("/user/register")
	public String register(@ModelAttribute User user, BindingResult br, Model model, RedirectAttributes redirectAttributes) {
        if (br.hasErrors()) {
        	model.addAttribute("users", userService.findAll());
            return "admin/user";
        }
        
        try {
        	userService.register(user);
        	redirectAttributes.addFlashAttribute("successMessage", "registration complete");
        } catch (DuplicateUserIdException ex) {
            br.rejectValue("userId", "duplicate", ex.getMessage());
            model.addAttribute("users", userService.findAll());
            return "admin/user";
        }
        
        return "redirect:/admin/user";
    }
	
	@PostMapping("/user/modify")
	public String update(@ModelAttribute User user, RedirectAttributes attrs) {
        userService.update(user);
        attrs.addFlashAttribute("successMessage", "Your user information has been modified.");
        return "redirect:/admin/user";
    }
	
	@PostMapping("/user/delete")
    public String delete(@RequestParam(value = "ids", required = false) List<Long> ids,
                         RedirectAttributes attrs) {
        if (ids == null || ids.isEmpty()) {
            attrs.addFlashAttribute("errorMessage", "Select the user you want to delete.");
        } else {
        	int deleted = userService.deleteUsers(ids);
            attrs.addFlashAttribute("successMessage", deleted + " user has been deleted.");
        }
        return "redirect:/admin/user";
    }
	
	@PostMapping("/user/toggle-active")
	public ResponseEntity<Map<String, String>> toggleActive(@RequestBody ToggleActiveDto dto) {
		userService.updateActive(dto.getId(), dto.isActive());
        return ResponseEntity.ok().build();
	}
}