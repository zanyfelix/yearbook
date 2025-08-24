package com.mbiz.yearbook.controller;

import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.HomeRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ProgressService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
public class HomeController {
	
	@Autowired
	UserService userService;
	
	@Autowired
    private YearbookRepository yearbookRepository;
	
	@Autowired
    private ContentsRepository contentsRepository;
	
	@Autowired
	private HomeRepository homeRepository;
	
	private final String UPLOAD_DIR = "uploads/";

	@GetMapping("/home")
	public String home(HttpSession session, @RequestParam Long id, Model model) {
		
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
        	List<Yearbook> existingPages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
        	groupCompleted += existingPages.size();
        }
        
        for(Contents content : allEventContents) {
        	eventTotal += content.getPages();
        	List<Yearbook> existingPages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
        	eventCompleted += existingPages.size();
        }
        
        int groupProgress = (groupTotal != 0) ? (groupCompleted * 100) / groupTotal : 0;
        int eventProgress = (eventTotal != 0) ? (eventCompleted * 100) / eventTotal : 0;

	    model.addAttribute("remainDays", remainDays);
	    model.addAttribute("groupProgress", groupProgress);
	    model.addAttribute("eventProgress", eventProgress);
	    
	    Home guidanceHome = homeRepository.findByUserIdAndType(loginUser.getId(),"main").get(0);
	    model.addAttribute("guidanceHome", guidanceHome);
	    
	    List<Home> homeList = homeRepository.findByUserIdAndType(id, "content");
	    model.addAttribute("homeList", homeList);
	    
	    model.addAttribute("currentMenu", "home");

	    return "home";
	}
	
	@GetMapping("/userDownloadGuidance")
	public ResponseEntity<Resource> downloadGuidanceFile(@RequestParam("id") Long id) {
	    // 1. ID로 Home 객체를 찾아 첨부파일 경로를 가져옵니다.
	    Home home = homeRepository.findById(id)
	            .orElseThrow(() -> new RuntimeException("Error: File not found."));

	    String storedFileName = home.getAttachmentPath().substring(home.getAttachmentPath().lastIndexOf("/") + 1);
	    String originalFileName = storedFileName.substring(storedFileName.indexOf("_") + 1);

	    try {
	        // 2. 파일 경로를 통해 리소스를 로드합니다.
	        Path filePath = Paths.get(UPLOAD_DIR).resolve(storedFileName).normalize();
	        Resource resource = new UrlResource(filePath.toUri());

	        if (resource.exists() && resource.isReadable()) {
	            // 3. 다운로드 시 사용할 원본 파일명으로 헤더를 설정합니다.
	            String encodedFileName = new String(originalFileName.getBytes(StandardCharsets.UTF_8), StandardCharsets.ISO_8859_1);
	            HttpHeaders headers = new HttpHeaders();
	            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"");

	            // 4. 파일을 ResponseEntity에 담아 반환합니다.
	            return ResponseEntity.ok()
	                    .headers(headers)
	                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
	                    .body(resource);
	        } else {
	            throw new RuntimeException("Error: File not found or is not readable.");
	        }
	    } catch (MalformedURLException e) {
	        throw new RuntimeException("Error: Malformed URL.", e);
	    }
	}
}