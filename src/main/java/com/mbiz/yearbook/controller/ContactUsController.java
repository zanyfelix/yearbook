package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ContactUsService;

import jakarta.servlet.http.HttpSession;

import java.nio.file.Path;

@Controller
public class ContactUsController {

    @Autowired
    private ContactUsService contactUsService;
    
    @Autowired
    private YearbookRepository yearbookRepository;
	
	@Autowired
    private ContentsRepository contentsRepository;

    private final String UPLOAD_DIR = "uploads/";

    @GetMapping("/contactUs")
    public String contactMain(HttpSession session, @RequestParam Long id, Model model) {
    	
    	User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    model.addAttribute("deadline", loginUser.getDeadline());

	    LocalDate today = LocalDate.now();
	    LocalDate deadline = loginUser.getDeadline()
	                             .toInstant()
	                             .atZone(ZoneId.systemDefault())
	                             .toLocalDate();
	    
	    long remainDays = ChronoUnit.DAYS.between(today, deadline);
	    
	    int groupCompleted = 0;
        int groupTotal = 0;
        int eventCompleted = 0;
        int eventTotal = 0;
        
        List<Contents> allGroupContents = contentsRepository.findByUserIdAndCategory(loginUser.getId(), "group");
        List<Contents> allEventContents = contentsRepository.findByUserIdAndCategory(loginUser.getId(), "event");
        
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
        
        int groupProgress = (groupTotal != 0) ? (groupCompleted * 100) / groupTotal : 0;
        int eventProgress = (eventTotal != 0) ? (eventCompleted * 100) / eventTotal : 0;

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