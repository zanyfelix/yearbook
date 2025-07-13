package com.mbiz.yearbook.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.ContactUsService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin/contact")
public class AdminContactUsController {

    @Autowired
    private ContactUsService contactUsService;

    private final String UPLOAD_DIR = "uploads/";

    @GetMapping
    public String showForm(Model model, 
    		@RequestParam(defaultValue="") String userId,
            @RequestParam(defaultValue="") String name,
    		HttpSession session) {
    	
    	User admin = (User) session.getAttribute("loginUser");
    	model.addAttribute("adminEmail", admin.getMail());
    	
    	List<ContactUs> results;
    	if (userId.isEmpty() && name.isEmpty()) {
            // 전체 조회
            results = contactUsService.findAll();
        } else {
            // userId 또는 name 이 하나라도 들어오면 조건 검색
            results = contactUsService.getContactUs(userId, name);
        }
    	
        model.addAttribute("contacts", results);
        
        model.addAttribute("userId", userId);
        model.addAttribute("name", name);
    	
        return "admin/contact";
    }
}