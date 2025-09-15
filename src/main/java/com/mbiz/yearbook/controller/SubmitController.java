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
			List<YearbookSummary> existingPages = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
			groupCompleted += existingPages.size();
		}

		for (Contents content : allEventContents) {
			eventTotal += content.getPages();
			List<YearbookSummary> existingPages = yearbookRepository
					.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
			eventCompleted += existingPages.size();
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
						.findFirst().orElse(null); // 없으면 null

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
			data.setYearbookPages(fullPageList); // 완성된 리스트를 DTO에 담습니다.

			data.setSavedPagesCount(existingPages.size());

			contentsListForView.add(data);
		}
		model.addAttribute("contentsList", contentsListForView);

		// 개별 섹션들을 명확하게 조회
		Submit overviewSection = submitRepository.findFirstByTypeAndUserIdIsNull("Overview")
				.orElse(createDefaultSubmit("Overview", "Submit to MBIZ - Overview", 0));
		
		Submit noteSection = submitRepository.findFirstByTypeAndUserIdIsNull("Note")
				.orElse(createDefaultSubmit("Note", "Note", 2));
		
		List<Submit> submissionItems = submitRepository.findByTypeAndUserIdIsNullOrderByDisplayOrder("Submission");
		

		// 모델에 개별 섹션 추가
		model.addAttribute("overviewSection", overviewSection);
		model.addAttribute("noteSection", noteSection);
		model.addAttribute("submissionItems", submissionItems);

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

	/**
	 * 최종 제출을 처리하고 사용자의 submitted 상태를 업데이트합니다.
	 */
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
			// 현재 로그인한 사용자의 정보를 DB에서 다시 조회 (최신 정보 확인)
			User userToUpdate = userRepository.findById(loginUser.getId())
					.orElseThrow(() -> new RuntimeException("User not found"));

			// submitted 상태를 true(1)로 변경
			userToUpdate.setSubmitted(true);

			// 변경된 사용자 정보를 DB에 저장
			userRepository.save(userToUpdate);

			// 세션 정보도 갱신
			session.setAttribute("loginUser", userToUpdate);

			response.put("success", true);
		} catch (Exception e) {
			response.put("success", false);
			response.put("message", "An error occurred during submission.");
			e.printStackTrace(); // 서버 로그에 에러 기록
		}

		return response;
	}
}