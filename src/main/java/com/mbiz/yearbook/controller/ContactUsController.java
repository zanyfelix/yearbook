package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.YearbookSummary;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ContactUsService;
import com.mbiz.yearbook.service.EmailService;

import jakarta.servlet.http.HttpSession;

@Controller
public class ContactUsController {

	@Autowired
	private ContactUsService contactUsService;

	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ContentsRepository contentsRepository;

	@Autowired
	private EmailService emailService;

	@Value("${file.path.thumbnail}")
	private String uploadPath;

	@GetMapping("/contactUs")
	public String contactMain(HttpSession session, Model model) {

		User loginUser = (User) session.getAttribute("loginUser");
		model.addAttribute("loginUser", loginUser);

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

		model.addAttribute("contact", new ContactUs());
		model.addAttribute("currentMenu", "contactUs");

		return "contactUs";
	}

	// 새로 추가할 POST 매핑
	@PostMapping("/api/contactUs/submit")
	@ResponseBody
	public Map<String, Object> submitContactUs(@RequestParam("name") String name, @RequestParam("mail") String email,
			@RequestParam("subject") String subject, @RequestParam("message") String message,
			@RequestParam("userId") Long userId, @RequestParam(value = "file", required = false) MultipartFile file,
			HttpSession session) {

		Map<String, Object> response = new HashMap<>();

		try {
			// 세션에서 로그인 사용자 정보 가져오기
			User loginUser = (User) session.getAttribute("loginUser");

			// ContactUs 객체 생성
			ContactUs contact = new ContactUs();
			contact.setName(name);
			contact.setMail(email);
			contact.setSubject(subject);
			contact.setMessage(message);
			contact.setUserId(userId);
			contact.setCreatedAt(LocalDateTime.now());
			contact.setUpdatedAt(LocalDateTime.now());
			contact.setStatus("PENDING"); // 초기 상태 설정

			// 학교명 설정 (세션에서 가져오기)
			if (loginUser != null) {
				contact.setSchoolName(loginUser.getSchoolName());
			}

			// 파일 처리
			if (file != null && !file.isEmpty()) {
				try {
					// 파일명 생성 (UUID + 원본 파일명)
					String originalFilename = file.getOriginalFilename();
					String extension = "";
					if (originalFilename != null && originalFilename.contains(".")) {
						extension = originalFilename.substring(originalFilename.lastIndexOf("."));
					}
					String fileName = UUID.randomUUID().toString() + extension;

					// 업로드 디렉토리 확인 및 생성
					Path uploadDir = Paths.get(uploadPath);
					if (!Files.exists(uploadDir)) {
						Files.createDirectories(uploadDir);
					}

					// 파일 저장
					Path filePath = uploadDir.resolve(fileName);
					Files.copy(file.getInputStream(), filePath);

					// 파일 경로 설정 (상대 경로로 저장)
					contact.setAttachmentPath(fileName);

				} catch (IOException e) {
					// 파일 저장 실패 시 로그 출력하지만 전체 프로세스는 계속 진행
					System.err.println("File upload failed: " + e.getMessage());
				}
			}

			// DB에 저장
			contactUsService.save(contact);
			
			// 메일 발송 (관리자에게 문의 내용 전달)
			try {
			    emailService.sendContactUsEmail(contact);
			} catch (Exception e) {
			    // 메일 발송 실패 시 로그만 출력하고 DB 저장은 성공으로 처리
			    System.err.println("Email sending failed: " + e.getMessage());
			    e.printStackTrace();
			}

			response.put("success", true);
			response.put("message", "Your inquiry has been successfully submitted.");

		} catch (Exception e) {
			response.put("success", false);
			response.put("message", "Failed to submit inquiry: " + e.getMessage());
			e.printStackTrace();
		}

		return response;
	}
}