package com.mbiz.yearbook.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.mbiz.yearbook.model.User;

import jakarta.servlet.http.HttpSession;

@Controller
public class ContentController {
	
	@GetMapping("/content/{page}")
    public String loadContent(@PathVariable String page) {
        return "content/" + page;
    }

    @GetMapping("/userMain")
    public String userMain(HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        model.addAttribute("user", user);

        return "userMain";
    }
    
    @GetMapping("/progress")
    public String progress(HttpSession session, Model model) {
    	 User user = (User) session.getAttribute("user");
         if (user == null) {
             return "redirect:/login";
         }
         model.addAttribute("user", user);

        return "userMain";
    }
    
    @GetMapping("/submit")
    public String submit(HttpSession session, Model model) {
    	 User user = (User) session.getAttribute("user");
         if (user == null) {
             return "redirect:/login";
         }
         model.addAttribute("user", user);

        return "userMain";
    }
    
    @GetMapping("/contactUs")
    public String contactUs(HttpSession session, Model model) {
    	 User user = (User) session.getAttribute("user");
         if (user == null) {
             return "redirect:/login";
         }
         model.addAttribute("user", user);

        return "userMain";
    }
}
