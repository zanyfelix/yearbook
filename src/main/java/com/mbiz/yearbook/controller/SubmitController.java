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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.Submit;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.model.YearbookSummary;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.SubmitRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import jakarta.servlet.http.HttpSession;

@Controller
public class SubmitController {

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private ContentsRepository contentsRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private SubmitRepository submitRepository;
	
	private final ObjectMapper objectMapper = new ObjectMapper();

	@GetMapping("/submit")
	public String submit(HttpSession session, @RequestParam Long id, Model model) {

		User loginUser = (User) session.getAttribute("loginUser");
		model.addAttribute("loginUser", loginUser);

		if (loginUser.isSubmitted()) {
			model.addAttribute("isAlreadySubmitted", true);
		} else {
			model.addAttribute("isAlreadySubmitted", false);
		}

		model.addAttribute("deadline", loginUser.getDeadline());

		LocalDate today = LocalDate.now();
		LocalDate deadline = loginUser.getDeadline().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

		long remainDays = ChronoUnit.DAYS.between(today, deadline);

		int groupCompleted = 0;
		int groupTotal = 0;
		int eventCompleted = 0;
		int eventTotal = 0;

		List<Contents> allGroupContents = contentsRepository.findByUserIdAndCategory(loginUser.getId(), "group");
		List<Contents> allEventContents = contentsRepository.findByUserIdAndCategory(loginUser.getId(), "event");

		for (Contents content : allGroupContents) {
			groupTotal += content.getPages();
			List<Yearbook> existingPages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
			groupCompleted += countCompletedPages(existingPages);
		}

		for (Contents content : allEventContents) {
			eventTotal += content.getPages();
			List<Yearbook> existingPages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
			eventCompleted += countCompletedPages(existingPages);
		}

		int groupProgress = (groupTotal != 0) ? (groupCompleted * 100) / groupTotal : 0;
		int eventProgress = (eventTotal != 0) ? (eventCompleted * 100) / eventTotal : 0;

		model.addAttribute("remainDays", remainDays);
		model.addAttribute("groupProgress", groupProgress);
		model.addAttribute("eventProgress", eventProgress);

		List<Contents> allContents = contentsRepository.findByUserId(loginUser.getId());
		List<ContentsData> contentsListForView = new ArrayList<>();

		for (Contents content : allContents) {
			List<YearbookSummary> existingPages = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
			List<YearbookSummary> fullPageList = new ArrayList<>();

			for (int i = 1; i <= content.getPages(); i++) {
				final int currentPageNo = i;

				YearbookSummary pageToAdd = existingPages.stream().filter(p -> p.getPageNo() == currentPageNo)
						.findFirst().orElse(null);

				if (pageToAdd != null) {
					fullPageList.add(pageToAdd);
				} else {
					YearbookSummary emptyPage = new YearbookSummary();
					emptyPage.setContentsId(content.getId());
					emptyPage.setPageNo(currentPageNo);
					fullPageList.add((YearbookSummary) emptyPage);
				}
			}

			ContentsData data = new ContentsData();
			data.setContentsInfo(content);
			data.setYearbookPages(fullPageList);

			// 완료된 페이지 수 계산 (photoframe에 photo가 있는 페이지만)
			List<Yearbook> yearbookPages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
			data.setSavedPagesCount(countCompletedPages(yearbookPages));

			contentsListForView.add(data);
		}
		model.addAttribute("contentsList", contentsListForView);

		Submit overviewSection = submitRepository.findFirstByTypeAndUserIdIsNull("Overview")
				.orElse(createDefaultSubmit("Overview", "Submit to MBIZ - Overview", 0));
		
		Submit noteSection = submitRepository.findFirstByTypeAndUserIdIsNull("Note")
				.orElse(createDefaultSubmit("Note", "Note", 2));
		
		List<Submit> submissionItems = submitRepository.findByTypeAndUserIdIsNullOrderByDisplayOrder("Submission");
		
		List<Submit> contentItems = submitRepository.findByUserIdAndType(loginUser.getId(), "content");
		List<Submit> activeContentItems = new ArrayList<>();
		for (Submit item : contentItems) {
			if (item.getIsActive() != null && item.getIsActive()) {
				activeContentItems.add(item);
			}
		}

		model.addAttribute("overviewSection", overviewSection);
		model.addAttribute("noteSection", noteSection);
		model.addAttribute("submissionItems", submissionItems);
		model.addAttribute("contentItems", activeContentItems);

		model.addAttribute("currentMenu", "submit");

		return "submit";
	}

	private Submit createDefaultSubmit(String type, String title, Integer displayOrder) {
		Submit submit = new Submit();
		submit.setType(type);
		submit.setTitle(title);
		submit.setDisplayOrder(displayOrder);
		submit.setIsActive(true);
		submit.setUserId(null);
		return submit;
	}

	@PostMapping("/submit/previewData")
	@ResponseBody
	public List<YearbookSummary> backgroundList(@RequestBody Map<String, Object> param) {
		Long contentsId = Long.parseLong(param.get("contentsId").toString());
		return yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(contentsId);
	}

	@PostMapping("/submit/finalize")
	@ResponseBody
	public Map<String, Object> finalizeSubmission(HttpSession session) {
		Map<String, Object> response = new HashMap<>();
		User loginUser = (User) session.getAttribute("loginUser");

		if (loginUser == null) {
			response.put("success", false);
			response.put("message", "Session expired. Please log in again.");
			return response;
		}

		try {
			User userToUpdate = userRepository.findById(loginUser.getId())
					.orElseThrow(() -> new RuntimeException("User not found"));

			userToUpdate.setSubmitted(true);

			userRepository.save(userToUpdate);

			session.setAttribute("loginUser", userToUpdate);

			response.put("success", true);
		} catch (Exception e) {
			response.put("success", false);
			response.put("message", "An error occurred during submission.");
			e.printStackTrace();
		}

		return response;
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
		
		if (designData == null || designData.isEmpty()) {
			return false;
		}
		
		try {
			JsonNode rootNode = objectMapper.readTree(designData);
			JsonNode framesNode = rootNode.get("frames");
			
			if (framesNode == null || !framesNode.isArray()) {
				return false;
			}
			
			boolean hasPhotoFrame = false;
			
			for (JsonNode frame : framesNode) {
				JsonNode themeNode = frame.get("theme");
				if (themeNode == null) {
					continue;
				}
				
				JsonNode categoryNode = themeNode.get("category");
				if (categoryNode == null) {
					continue;
				}
				
				if ("photoframe".equals(categoryNode.asText())) {
					hasPhotoFrame = true;
					
					JsonNode photoNode = frame.get("photo");
					
					if (photoNode == null || photoNode.isNull()) {
						return false;
					}
					
					JsonNode srcNode = photoNode.get("src");
					if (srcNode == null || srcNode.isNull() || srcNode.asText().isEmpty()) {
						return false;
					}
				}
			}
			
			if (!hasPhotoFrame) {
				return false;
			}
			
			return true;
			
		} catch (Exception e) {
			return false;
		}
	}
}