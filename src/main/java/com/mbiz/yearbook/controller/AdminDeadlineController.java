package com.mbiz.yearbook.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminDeadlineController {
	
	@Autowired
    private UserService userService;
	
	@GetMapping("/deadline")
	public String showForm(HttpSession session,
			@RequestParam(value = "type", defaultValue = "userId") String type,
            @RequestParam(value = "keyword", required = false) String keyword,
            Model model) {
		
		User user = (User) session.getAttribute("loginUser");
	    //사용자 리스트(항상)
	    List<User> allUsers = userService.findAll();
	    model.addAttribute("allUsers", allUsers);
	    
	    List<User> users = userService.getUser(type, keyword);
	    model.addAttribute("type", type);
        model.addAttribute("keyword", keyword);
	    model.addAttribute("users", users);
	    
	    model.addAttribute("currentMenu", "deadline");

	    return "admin/deadline";
	}
	
//	@PostMapping("/deadline/apply")
//    public String apply(@RequestParam(value = "ids", required = false) List<Long> ids,
//            			RedirectAttributes attrs) {
//        if (ids == null || ids.isEmpty()) {
//            attrs.addFlashAttribute("errorMessage", "Select the contactUs you want to apply.");
//        } else {
//        	int count = userService.update(ids);
//            attrs.addFlashAttribute("successMessage", count + "user has been applied.");
//        }
//        return "redirect:/admin/deadline";
//    }
}