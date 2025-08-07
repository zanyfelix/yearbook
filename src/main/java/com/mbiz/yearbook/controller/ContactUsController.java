package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.ContactUsService;

import jakarta.servlet.http.HttpSession;

import java.nio.file.Path;

@Controller
public class ContactUsController {

    @Autowired
    private ContactUsService contactUsService;

    private final String UPLOAD_DIR = "uploads/";

    @GetMapping("/contactUs")
    public String contactMain(HttpSession session, @RequestParam Long id, Model model) {
    	
    	User loginUser = (User) session.getAttribute("loginUser");
    	model.addAttribute("loginUser", loginUser);
    	
    	//사용자 마감일을 yyyy-MM-dd 포맷 문자열로 변환
	    String deadlineStr = new SimpleDateFormat("yyyy-MM-dd").format(loginUser.getDeadline());
	    model.addAttribute("deadline", deadlineStr);

	    LocalDate today = LocalDate.now();
	    LocalDate deadline = loginUser.getDeadline()
	                             .toInstant()
	                             .atZone(ZoneId.systemDefault())
	                             .toLocalDate();
	    
	    long remainDays = ChronoUnit.DAYS.between(today, deadline);

	    int groupProgress = 60; // 예시: 실제 DB 조회 필요
	    int eventProgress = 45;

	    model.addAttribute("remainDays", remainDays);
	    model.addAttribute("groupProgress", groupProgress);
	    model.addAttribute("eventProgress", eventProgress);
    	
        model.addAttribute("contact", new ContactUs());
        model.addAttribute("currentMenu", "contactUs");
        
        return "contactUs";
    }

    @PostMapping
    public String submitForm(@ModelAttribute ContactUs contact,
                              @RequestParam("file") MultipartFile file,
                              RedirectAttributes redirectAttributes) throws IOException {

        if (!file.isEmpty()) {
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filepath = Paths.get(UPLOAD_DIR, filename);
            Files.createDirectories(filepath.getParent());
            Files.write(filepath, file.getBytes());
            contact.setAttachmentPath("/" + filepath.toString().replace("\\", "/"));
        }

        contactUsService.save(contact);
        redirectAttributes.addFlashAttribute("success", true);
        return "redirect:/contactUs";
    }
}