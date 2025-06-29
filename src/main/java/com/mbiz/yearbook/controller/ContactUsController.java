package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
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
import com.mbiz.yearbook.service.ContactUsService;

import java.nio.file.Path;

@Controller
@RequestMapping("/contact")
public class ContactUsController {

    @Autowired
    private ContactUsService contactUsService;

    private final String UPLOAD_DIR = "uploads/";

    @GetMapping
    public String showForm(Model model) {
        model.addAttribute("contact", new ContactUs());
        return "contact";
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
        return "redirect:/contact";
    }
}