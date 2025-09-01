package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.ContactUsService;
import com.mbiz.yearbook.service.EmailService;

@RestController
@RequestMapping("/api") // API 요청을 위한 별도 경로
public class ContactUsRestController {

    @Autowired
    private ContactUsService contactUsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;
    
    @Value("${file.path.thumbnail}")
    private String uploadPath;

    @PostMapping("/contactUs/submit")
    public ResponseEntity<Map<String, Object>> submitForm(
        @RequestParam("userId") Long userId,
        @RequestParam("name") String name,
        @RequestParam("mail") String email,
        @RequestParam("subject") String subject,
        @RequestParam("message") String message,
        @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        Map<String, Object> response = new HashMap<>();

        // 1. name과 email로 사용자 존재 여부 확인
        Optional<User> existingUserOpt = userRepository.findByNameAndMail(name, email);

	     // Optional 객체를 사용하여 사용자가 존재하는지 확인
	     if (!existingUserOpt.isPresent()) {
	         response.put("success", false);
	         response.put("message", "Invalid user credentials. Please ensure your name and email are correct.");
	         return ResponseEntity.badRequest().body(response);
	     }
	
	     // 사용자 객체를 가져와서 사용
	     User existingUser = existingUserOpt.get();
	     if (!existingUser.getId().equals(userId)) {
	         response.put("success", false);
	         response.put("message", "Invalid user credentials. Please ensure your name and email are correct.");
	         return ResponseEntity.badRequest().body(response);
	     }
        
        // 2. ContactUs 객체 생성 및 데이터 설정
        ContactUs contact = new ContactUs();
        contact.setUserId(userId);
        contact.setName(name);
        contact.setMail(email);
        contact.setSchoolName(existingUser.getSchoolName());
        contact.setSubject(subject);
        contact.setMessage(message);
        
        // 3. 파일 처리
        if (file != null && !file.isEmpty()) {
            try {
                String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
                Path filepath = Paths.get(uploadPath, filename);
                Files.createDirectories(filepath.getParent());
                Files.write(filepath, file.getBytes());
                contact.setAttachmentPath("/" + filepath.toString().replace("\\", "/"));
            } catch (IOException e) {
                response.put("success", false);
                response.put("message", "File upload failed.");
                return ResponseEntity.status(500).body(response);
            }
        }

        // 4. 문의 내용 저장 및 이메일 발송
        try {
            contactUsService.save(contact);
            emailService.sendContactUsEmail(contact, file);
            
            response.put("success", true);
            response.put("message", "Your inquiry has been successfully submitted.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error processing contact form: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "An unexpected error occurred. Please try again later.");
            return ResponseEntity.status(500).body(response);
        }
    }
}