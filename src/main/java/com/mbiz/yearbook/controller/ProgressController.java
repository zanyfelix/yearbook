package com.mbiz.yearbook.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.mbiz.yearbook.model.Progress;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ProgressService;
import com.mbiz.yearbook.service.ProgressService;

import jakarta.servlet.http.HttpSession;

@Controller
public class ProgressController {
	
	@Autowired
    private YearbookRepository yearbookRepository;
	
	@Autowired
    private ProgressService progressService;

	@GetMapping("/progress")
	public String progressReport(HttpSession session, Model model) {
		
	    User user = (User) session.getAttribute("loginUser");
	    
	    Progress progress = progressService.getProgressForUser(Long.parseLong(user.getUserId()));
        model.addAttribute("progress", progress);
        
	    model.addAttribute("currentMenu", "progress");

	    return "progress";
	}
}