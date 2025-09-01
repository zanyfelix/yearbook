package com.mbiz.yearbook.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.ContactUsService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminContactUsController {

    @Autowired
    private ContactUsService contactUsService;
    
    @Autowired
	private UserRepository userRepository;
    
    @Autowired
    private UserService userService;

    @GetMapping("/contactUs")
    public String showForm(HttpSession session, @RequestParam(required = false) Long id, 
			@RequestParam(value = "type", defaultValue = "userId") String type,
            @RequestParam(value = "keyword", required = false) String keyword,
            Model model) {
    	
    	User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    //사용자 리스트(항상)
	    List<User> allUsers = userService.findAll();
	    model.addAttribute("allUsers", allUsers);
	    
	    //관리자메일
	    List<User> admin = userService.getUser("userId", "admin");
	    model.addAttribute("mail", admin.get(0).getMail());
    	model.addAttribute("id", admin.get(0).getId());
	    
	    List<ContactUs> contacts = contactUsService.getContactUs(type, keyword);
	    model.addAttribute("type", type);
        model.addAttribute("keyword", keyword);
	    model.addAttribute("contacts", contacts);
	    
	    model.addAttribute("currentMenu", "contactUs");

	    return "admin/contactUs";
	}
    
    @PostMapping("/contactUs/apply")
    public String apply(@RequestParam(value = "ids", required = false) List<Long> ids,
            			RedirectAttributes attrs) {
        if (ids == null || ids.isEmpty()) {
            attrs.addFlashAttribute("errorMessage", "Select the contactUs you want to apply.");
        } else {
        	int count = contactUsService.markAsRepliedByIds(ids);
            attrs.addFlashAttribute("successMessage", count + "user has been applied.");
        }
        return "redirect:/admin/contactUs";
    }
    
    @PostMapping("/contactUs/updateAdminEmail")
    public String updateAdminEmail(@RequestParam String adminEmail,
    								@RequestParam long id, 
    								RedirectAttributes ra) {
    	User user = new User();
    	user.setId(id);
    	user.setMail(adminEmail);
    	userService.update(user);
        ra.addFlashAttribute("successMessage", "The administrator email has been updated.");
        return "redirect:/admin/contactUs";
    }
    
    /**
     * 첨부파일 다운로드 처리를 위한 수정된 메소드
     * @param attachmentPath 서버에 저장된 파일의 전체 경로
     * @return 파일 리소스
     */
    @GetMapping("/contactUs/download")
    public ResponseEntity<Resource> downloadAttachment(@RequestParam String attachmentPath) {
        
        // attachmentPath에서 원본 파일명 추출 (첫 번째 '_' 이후)
        String originalFileName = attachmentPath; // 기본값은 전체 경로
        int underscoreIndex = attachmentPath.indexOf('_');
        if (underscoreIndex != -1) {
            originalFileName = attachmentPath.substring(underscoreIndex + 1);
        }

        try {
            Path filePath = Paths.get(attachmentPath).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                // 추출한 원본 파일명으로 인코딩 처리
                String encodedOriginalFileName = URLEncoder.encode(originalFileName, StandardCharsets.UTF_8.toString()).replaceAll("\\+", "%20");
                
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedOriginalFileName + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            // e.printStackTrace(); // 개발 중에는 오류 확인을 위해 로그를 남기는 것이 좋습니다.
            return ResponseEntity.internalServerError().build();
        }
    }
}