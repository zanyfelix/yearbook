package com.mbiz.yearbook.controller;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.Progress;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ProgressService;
import com.mbiz.yearbook.service.ProgressService;

import jakarta.servlet.http.HttpSession;

@Controller
public class SubmitController {
	
	@Autowired
    private YearbookRepository yearbookRepository;
	
	@GetMapping("/submit")
	public String submit(HttpSession session, @RequestParam Long id, Model model) {
		
	    User loginUser = (User) session.getAttribute("loginUser");
	    
		// 사용자 마감일을 yyyy-MM-dd 포맷 문자열로 변환
		String deadlineStr = new SimpleDateFormat("yyyy-MM-dd").format(loginUser.getDeadline());
		model.addAttribute("deadline", deadlineStr);

		LocalDate today = LocalDate.now();
		LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

		long remainDays = ChronoUnit.DAYS.between(today, deadline);

		int groupProgress = 60; // 예시: 실제 DB 조회 필요
		int eventProgress = 45;

		model.addAttribute("remainDays", remainDays);
		model.addAttribute("groupProgress", groupProgress);
		model.addAttribute("eventProgress", eventProgress);

	    model.addAttribute("currentMenu", "submit");

	    return "submit";
	}
}