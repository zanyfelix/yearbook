package com.mbiz.yearbook.controller;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
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
	
	private final ObjectMapper objectMapper = new ObjectMapper();

	@GetMapping("/admin/progress")
	public String adminProgressReport(HttpSession session, @RequestParam(required = false) Long id,
			@RequestParam(required = false) String type, @RequestParam(required = false) String keyword, Model model) {

		if (id != null) {
			Optional<User> userOptional = userRepository.findById(id);
			if (userOptional.isPresent()) {
				User user = userOptional.get();
				String role = user.getRole().toUpperCase();

				switch (role) {
				case "USER":
					return "redirect:/admin/home?userId=" + id;
				default:
					break;
				}
			}
		}

		User loginUser = (User) session.getAttribute("loginUser");
		model.addAttribute("loginUser", loginUser);
		model.addAttribute("currentMenu", "progress");

		// 검색 파라미터 유지
		model.addAttribute("type", type);
		model.addAttribute("keyword", keyword);

		// 사이드바 드롭다운용 사용자 목록 (Admin 포함)
		List<User> allUsers = userRepository.findAll();
		model.addAttribute("allUsers", allUsers);

		// Progress 테이블용 사용자 목록 (Admin 제외)
		List<User> progressUsers;
		if (keyword != null && !keyword.trim().isEmpty()) {
			if ("userId".equals(type)) {
				progressUsers = userRepository.findByRoleAndUserIdContaining("user", keyword);
			} else if ("schoolName".equals(type)) {
				progressUsers = userRepository.findByRoleAndSchoolNameContaining("user", keyword);
			} else {
				progressUsers = userRepository.findByRole("user");
			}
		} else {
			progressUsers = userRepository.findByRole("user");
		}

		// 각 사용자의 진행 현황 계산
		List<Map<String, Object>> userProgressList = new ArrayList<>();
		LocalDate today = LocalDate.now();

		for (User user : progressUsers) {
			Map<String, Object> userProgress = new HashMap<>();
			userProgress.put("user", user);

			// 남은 일수 계산
			if (user.getDeadline() != null) {
				LocalDate deadline = user.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
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

			for (Contents content : allContents) {
				overallTotal += content.getPages();
				List<Yearbook> existingPages = yearbookRepository
						.findByContentsIdOrderByPageNoAsc(content.getId());
				overallCompleted += countCompletedPages(existingPages);
			}

			for (Contents content : allGroupContents) {
				groupTotal += content.getPages();
				List<Yearbook> existingPages = yearbookRepository
						.findByContentsIdOrderByPageNoAsc(content.getId());
				groupCompleted += countCompletedPages(existingPages);
			}

			for (Contents content : allEventContents) {
				eventTotal += content.getPages();
				List<Yearbook> existingPages = yearbookRepository
						.findByContentsIdOrderByPageNoAsc(content.getId());
				eventCompleted += countCompletedPages(existingPages);
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
	
	/**
	 * 완료된 페이지 수를 카운트합니다.
	 * 페이지가 완료되려면 모든 photoframe에 photo가 있어야 합니다.
	 */
	private int countCompletedPages(List<Yearbook> pages) {
		int completedCount = 0;
		
		for (Yearbook page : pages) {
			if (isPageCompleted(page)) {
				completedCount++;
			}
		}
		
		return completedCount;
	}
	
	/**
	 * 페이지의 완료 여부를 확인합니다.
	 * designData의 frames 배열에서 category가 "photoframe"인 frame에 photo가 존재해야 완료로 처리됩니다.
	 * element 등 다른 category는 photo 체크를 하지 않습니다.
	 */
	private boolean isPageCompleted(Yearbook page) {
		String designData = page.getDesignData();
		
		// designData가 없으면 미완료
		if (designData == null || designData.isEmpty()) {
			return false;
		}
		
		try {
			JsonNode rootNode = objectMapper.readTree(designData);
			JsonNode framesNode = rootNode.get("frames");
			
			// frames가 없거나 배열이 아니면 미완료
			if (framesNode == null || !framesNode.isArray()) {
				return false;
			}
			
			// photoframe이 하나라도 있는지 확인하는 플래그
			boolean hasPhotoFrame = false;
			
			// 모든 photoframe에 photo가 있는지 확인
			for (JsonNode frame : framesNode) {
				JsonNode themeNode = frame.get("theme");
				if (themeNode == null) {
					continue;
				}
				
				JsonNode categoryNode = themeNode.get("category");
				if (categoryNode == null) {
					continue;
				}
				
				// photoframe인 경우만 photo 체크
				if ("photoframe".equals(categoryNode.asText())) {
					hasPhotoFrame = true;
					
					JsonNode photoNode = frame.get("photo");
					
					// photo가 null이거나 없으면 미완료
					if (photoNode == null || photoNode.isNull()) {
						return false;
					}
					
					// photo.src가 없거나 비어있으면 미완료
					JsonNode srcNode = photoNode.get("src");
					if (srcNode == null || srcNode.isNull() || srcNode.asText().isEmpty()) {
						return false;
					}
				}
			}
			
			// photoframe이 하나도 없으면 미완료
			if (!hasPhotoFrame) {
				return false;
			}
			
			// 모든 photoframe에 photo가 있으면 완료
			return true;
			
		} catch (Exception e) {
			// JSON 파싱 오류 시 미완료로 처리
			return false;
		}
	}
}