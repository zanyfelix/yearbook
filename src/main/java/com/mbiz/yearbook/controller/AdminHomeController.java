package com.mbiz.yearbook.controller;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.mbiz.yearbook.model.User;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminHomeController {

	@GetMapping("/home")
	public String home(HttpSession session, Model model) {
	    User user = (User) session.getAttribute("loginUser");

	    long remainDays = ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.of(2026, 3, 31));

	    int groupProgress = 60; // 예시: 실제 DB 조회 필요
	    int eventProgress = 45;

	    model.addAttribute("remainDays", remainDays);
	    model.addAttribute("groupProgress", groupProgress);
	    model.addAttribute("eventProgress", eventProgress);
	    
	    model.addAttribute("currentMenu", "home");

	    return "admin/home";
	}
}