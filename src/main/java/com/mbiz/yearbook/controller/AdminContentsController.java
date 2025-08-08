package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.ContentsService;
import com.mbiz.yearbook.service.UserService;
import com.mbiz.yearbook.util.DuplicateUserIdException;

import jakarta.servlet.http.HttpSession;

@Controller
public class AdminContentsController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
    private ContentsService contentsService;
	
	@Autowired
	private UserRepository userRepository;
	
	@GetMapping("/admin/contents")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, @RequestParam(required = false) Long userId, Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    if (userId == null) {
	        List<User> users = userRepository.findByRole("user");
	        model.addAttribute("users", users);
	        //사용자 id 값 없을 경우 첫번째 보여준다.
	        userId = users.get(0).getId();
	    } else {
	        userRepository.findById(userId).ifPresent(user -> model.addAttribute("users", List.of(user)));
	    }
	    
	    model.addAttribute("userId", userId);
	    
	    model.addAttribute("currentMenu", "contents");
	    
	    List<Contents> list = contentsService.findByUserId(userId);
	    model.addAttribute("list", list);
	    
	    return "admin/contents";
	}
	
	@PostMapping("/admin/contents/register")
	public String register(@ModelAttribute Contents contents, BindingResult br, Model model, RedirectAttributes redirectAttributes) {
        if (br.hasErrors()) {
        	model.addAttribute("contents", contentsService.findAll());
            return "admin/contents";
        }
        
        try {
        	contentsService.register(contents);
        	redirectAttributes.addFlashAttribute("successMessage", "registration complete");
        } catch (DuplicateUserIdException ex) {
            br.rejectValue("userId", "duplicate", ex.getMessage());
            model.addAttribute("contents", contentsService.findAll());
            return "admin/contents";
        }
        
        return "redirect:/admin/contents?userId=" + contents.getUserId();
    }
	
	@PostMapping("/admin/contents/modify")
	public String update(@ModelAttribute Contents contents, RedirectAttributes attrs, Model model) {
		contentsService.update(contents);
        attrs.addFlashAttribute("successMessage", "Content information has been modified.");
        return "redirect:/admin/contents?userId=" + contents.getUserId();
    }
	
	@PostMapping("/admin/contents/delete")
    public String delete(@RequestParam(value = "ids", required = false) List<Long> ids, @RequestParam(required = false) Long userId, 
                         RedirectAttributes attrs) {
        if (ids == null || ids.isEmpty()) {
            attrs.addFlashAttribute("errorMessage", "Select the contents you want to delete.");
        } else {
        	int deleted = contentsService.deleteContents(ids);
            attrs.addFlashAttribute("successMessage", deleted + " contents has been deleted.");
        }
        return "redirect:/admin/contents?userId=" + userId;
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