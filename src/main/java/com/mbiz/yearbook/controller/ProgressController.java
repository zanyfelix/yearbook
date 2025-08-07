package com.mbiz.yearbook.controller;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.Progress;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
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
	
	@Autowired
    private ContentsRepository contentsRepository;

	@GetMapping("/progress")
	public String progressReport(HttpSession session, @RequestParam Long id, Model model) {
		
	    User loginUser = (User) session.getAttribute("loginUser");
		model.addAttribute("loginUser", loginUser);

		model.addAttribute("deadline", loginUser.getDeadline());

		LocalDate today = LocalDate.now();
		LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

		long remainDays = ChronoUnit.DAYS.between(today, deadline);

		model.addAttribute("remainDays", remainDays);
		
		int overallCompleted = 0;
        int overallTotal = 0;
        int groupCompleted = 0;
        int groupTotal = 0;
        int eventCompleted = 0;
        int eventTotal = 0;
        
        List<Contents> allContents = contentsRepository.findByUserId(loginUser.getId());
        List<Contents> allGroupContents = contentsRepository.findByUserIdAndCategory(loginUser.getId(), "group");
        List<Contents> allEventContents = contentsRepository.findByUserIdAndCategory(loginUser.getId(), "event");
        
        for(Contents content : allContents) {
        	overallTotal += content.getPages();
        	List<Yearbook> existingPages = yearbookRepository.findByContentsId(content.getId());
        	overallCompleted += existingPages.size();
        }
        
        for(Contents content : allGroupContents) {
        	groupTotal += content.getPages();
        	List<Yearbook> existingPages = yearbookRepository.findByContentsId(content.getId());
        	groupCompleted += existingPages.size();
        }
        
        for(Contents content : allEventContents) {
        	eventTotal += content.getPages();
        	List<Yearbook> existingPages = yearbookRepository.findByContentsId(content.getId());
        	eventCompleted += existingPages.size();
        }
        
        model.addAttribute("overallCompleted", overallCompleted);
        model.addAttribute("overallTotal", overallTotal);
        model.addAttribute("groupCompleted", groupCompleted);
        model.addAttribute("groupTotal", groupTotal);
        model.addAttribute("eventCompleted", eventCompleted);
        model.addAttribute("eventTotal", eventTotal);

        // Calculate progress percentages
        int overallProgress = (overallTotal != 0) ? (overallCompleted * 100) / overallTotal : 0;
        int groupProgress = (groupTotal != 0) ? (groupCompleted * 100) / groupTotal : 0;
        int eventProgress = (eventTotal != 0) ? (eventCompleted * 100) / eventTotal : 0;

        // Set values in request scope
        model.addAttribute("overallProgress", overallProgress);
        model.addAttribute("groupProgress", groupProgress);
        model.addAttribute("eventProgress", eventProgress);
        
	    model.addAttribute("currentMenu", "progress");

	    return "progress";
	}
}