package com.mbiz.yearbook.controller;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.YearbookSummary;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import jakarta.servlet.http.HttpSession;

@Controller
public class AdminProgressController {
	
	@Autowired
    private UserRepository userRepository;
	
	@Autowired
    private YearbookRepository yearbookRepository;
	
	@Autowired
    private ContentsRepository contentsRepository;

	@GetMapping("/admin/progress")
	public String adminProgressReport(
			HttpSession session, 
			@RequestParam(required = false) Long id,
			@RequestParam(required = false) String type,
			@RequestParam(required = false) String keyword,
			Model model) {
		
	    User loginUser = (User) session.getAttribute("loginUser");
		model.addAttribute("loginUser", loginUser);
		model.addAttribute("currentMenu", "progress");
		
		// 검색 파라미터 유지
		model.addAttribute("type", type);
		model.addAttribute("keyword", keyword);
		
		// 전체 사용자 목록 조회 (관리자 제외)
		List<User> allUsers;
		if (keyword != null && !keyword.trim().isEmpty()) {
			if ("userId".equals(type)) {
				allUsers = userRepository.findByRoleAndUserIdContaining("user", keyword);
			} else if ("schoolName".equals(type)) {
				allUsers = userRepository.findByRoleAndSchoolNameContaining("user", keyword);
			} else {
				allUsers = userRepository.findByRole("user");
			}
		} else {
			allUsers = userRepository.findByRole("user");
		}
		
		model.addAttribute("allUsers", allUsers);
		
		// 각 사용자의 진행 현황 계산
		List<Map<String, Object>> userProgressList = new ArrayList<>();
		LocalDate today = LocalDate.now();
		
		for (User user : allUsers) {
			Map<String, Object> userProgress = new HashMap<>();
			userProgress.put("user", user);
			
			// 남은 일수 계산
			if (user.getDeadline() != null) {
				LocalDate deadline = user.getDeadline().toInstant()
					.atZone(ZoneId.systemDefault()).toLocalDate();
				long remainDays = ChronoUnit.DAYS.between(today, deadline);
				userProgress.put("remainDays", remainDays);
			} else {
				userProgress.put("remainDays", 0L);
			}
			
			// 진행률 계산
			int overallCompleted = 0;
	        int overallTotal = 0;
	        int groupCompleted = 0;
	        int groupTotal = 0;
	        int eventCompleted = 0;
	        int eventTotal = 0;
	        
	        List<Contents> allContents = contentsRepository.findByUserId(user.getId());
	        List<Contents> allGroupContents = contentsRepository.findByUserIdAndCategory(user.getId(), "group");
	        List<Contents> allEventContents = contentsRepository.findByUserIdAndCategory(user.getId(), "event");
	        
	        for(Contents content : allContents) {
	        	overallTotal += content.getPages();
	        	List<YearbookSummary> existingPages = yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
	        	overallCompleted += existingPages.size();
	        }
	        
	        for(Contents content : allGroupContents) {
	        	groupTotal += content.getPages();
	        	List<YearbookSummary> existingPages = yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
	        	groupCompleted += existingPages.size();
	        }
	        
	        for(Contents content : allEventContents) {
	        	eventTotal += content.getPages();
	        	List<YearbookSummary> existingPages = yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
	        	eventCompleted += existingPages.size();
	        }
	        
	        int overallProgress = (overallTotal != 0) ? (overallCompleted * 100) / overallTotal : 0;
	        int groupProgress = (groupTotal != 0) ? (groupCompleted * 100) / groupTotal : 0;
	        int eventProgress = (eventTotal != 0) ? (eventCompleted * 100) / eventTotal : 0;
	        
	        userProgress.put("overallCompleted", overallCompleted);
	        userProgress.put("overallTotal", overallTotal);
	        userProgress.put("overallProgress", overallProgress);
	        userProgress.put("groupCompleted", groupCompleted);
	        userProgress.put("groupTotal", groupTotal);
	        userProgress.put("groupProgress", groupProgress);
	        userProgress.put("eventCompleted", eventCompleted);
	        userProgress.put("eventTotal", eventTotal);
	        userProgress.put("eventProgress", eventProgress);
	        
	        userProgressList.add(userProgress);
		}
		
		model.addAttribute("userProgressList", userProgressList);
		
	    return "admin/progress";
	}
}