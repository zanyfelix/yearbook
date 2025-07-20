package com.mbiz.yearbook.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.ToggleActiveDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminDeadlineController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
    private HomeService homeService;
	
	private final String UPLOAD_DIR = "uploads/";

	@GetMapping("/deadline")
	public String showForm(HttpSession session,
            @RequestParam(value = "keyword", required = false) String keyword,
			Model model) {
		
	    User user = (User) session.getAttribute("loginUser");
	    
	    List<User> users = userService.getUser("schoolName", keyword);
	    
	    model.addAttribute("users", users);
	    model.addAttribute("currentMenu", "deadline");

	    return "admin/deadline";
	}
	
//	@PostMapping("/home/register")
//	public String register(@RequestParam("title") String title,
//            @RequestParam("description") String description,
//            @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
//            @RequestParam(value = "id", required = false) Long id,
//            @RequestParam(value = "file", required = false) MultipartFile file,
//            HttpServletRequest request) {
//
//		String filePath = null;
//
//		try {
//			if (!file.isEmpty()) {
//	            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
//	            Path filepath = Paths.get(UPLOAD_DIR, filename);
//	            Files.createDirectories(filepath.getParent());
//	            Files.write(filepath, file.getBytes());
//	            home.setAttachmentPath("/" + filepath.toString().replace("\\", "/"));
//	        }
//			
//			homeService.save(home);
//		} catch (IOException e) {
//			e.printStackTrace();
//		}
//
//		HomeEntity home;
//		if (id != null) {
//			home = homeRepository.findById(id).orElse(new HomeEntity());
//		} else {
//			home = new HomeEntity();
//		}
//
//		home.setTitle(title);
//		home.setDescription(description);
//		home.setDisplayOrder(displayOrder != null ? displayOrder : 0);
//		if (filePath != null) {
//			home.setFilePath(filePath);
//		}
//
//		homeRepository.save(home);
//
//		return "redirect:/admin/home";
//	}
//	
//	@PostMapping("/home/modify")
//	public String update(@ModelAttribute User user, RedirectAttributes attrs) {
//        userService.update(user);
//        attrs.addFlashAttribute("successMessage", "사용자 정보가 수정되었습니다.");
//        return "redirect:/admin/home";
//    }
//	
//	@PostMapping("/home/delete")
//    public String delete(@RequestParam(value = "ids", required = false) List<Long> ids,
//                         RedirectAttributes attrs) {
//        if (ids == null || ids.isEmpty()) {
//            attrs.addFlashAttribute("errorMessage", "삭제할 사용자를 선택하세요.");
//        } else {
//        	int deleted = userService.deleteUsers(ids);
//            attrs.addFlashAttribute("successMessage", deleted + "명의 사용자가 삭제되었습니다.");
//        }
//        return "redirect:/admin/home";
//    }
//	
//	@PostMapping("/home/toggle-active")
//	public ResponseEntity<Map<String, String>> toggleActive(@RequestBody ToggleActiveDto dto) {
//		userService.updateActive(dto.getId(), dto.isActive());
//        return ResponseEntity.ok().build();
//	}
}