package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.ToggleActiveDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.ContentsRepository;
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
    private ContentsRepository contentsRepository;
	
	@Autowired
	private UserRepository userRepository;
	
	@GetMapping("/admin/contents")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, @RequestParam(required = false) Long userId, Model model) {
		
		if (userId != null) {
			Optional<User> userOptional = userRepository.findById(userId);
			if (userOptional.isPresent()) {
	            User user = userOptional.get();
	            String role = user.getRole().toUpperCase();
	            
	            switch (role) {
	                case "ADMIN":
	                    return "redirect:/admin/user?id="+userId;
	                default:
	                    break;
	            }
	        }
	    }
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userService.findAll();
	    model.addAttribute("allUsers", allUsers);
        
        model.addAttribute("id", id);
	    model.addAttribute("userId", userId);
        
        List<Contents> contents = contentsRepository.findByUserId(userId);
        
        int totalPages = 0;
        for(Contents content : contents) {
        	totalPages += content.getPages();
        }
	    
	    model.addAttribute("totalPages", totalPages);
	    model.addAttribute("currentMenu", "contents");
	    
	    List<Contents> contentsList = contentsService.findByUserId(userId);
	    model.addAttribute("contentsList", contentsList);
	    model.addAttribute("contentsSize", contentsList.size());
	    
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
	
	@PostMapping("/admin/contents/apply")
    public String apply(@RequestParam(value = "ids", required = false) List<Long> ids, @RequestParam(required = false) Long userId, RedirectAttributes attrs) {
		
		List<Contents> contentsUpdate = contentsRepository.findAllById(ids);
        for (Contents contents : contentsUpdate) {
        	contents.setActive(true);
        }
        contentsRepository.saveAll(contentsUpdate);
        return "redirect:/admin/contents?userId=" + userId;
    }
	
	@PostMapping("/admin/contents/toggle-active")
	public ResponseEntity<Map<String, String>> toggleActive(@RequestBody ToggleActiveDto dto) {
		contentsService.updateActive(dto.getId(), dto.isActive());
        return ResponseEntity.ok().build();
	}
}