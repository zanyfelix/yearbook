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
import com.mbiz.yearbook.repository.YearbookRepository;
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

	// ✅ [추가] pages 수 감소 시 초과 Yearbook 레코드 정리를 위해 주입
	@Autowired
	private YearbookRepository yearbookRepository;
	
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
	
	// =========================================================================
	// ✅ [수정] /admin/contents/modify - pages 감소 시 초과 Yearbook 레코드 자동 정리
	//
	//    기존: contentsService.update()만 호출 → pages 줄여도 초과 레코드 잔존
	//    수정:
	//      1. 수정 전 기존 pages 값 조회
	//      2. 새 pages < 기존 pages 이면 초과 Yearbook 레코드 삭제
	//      3. Contents 업데이트 수행
	//      4. 삭제된 레코드 수를 성공 메시지에 포함
	// =========================================================================
	@PostMapping("/admin/contents/modify")
	public String update(@ModelAttribute Contents contents, RedirectAttributes attrs, Model model) {

		// 1. 수정 전 기존 pages 값 조회
		Contents existing = contentsRepository.findById(contents.getId()).orElse(null);

		int deletedCount = 0;
		if (existing != null) {
			int oldPages = existing.getPages();
			int newPages = contents.getPages();

			// 2. pages 수가 줄어든 경우 → 초과 Yearbook 레코드 삭제
			if (newPages < oldPages) {
				List<com.mbiz.yearbook.model.Yearbook> excessPages = yearbookRepository
						.findByContentsIdOrderByPageNoAsc(contents.getId())
						.stream()
						.filter(p -> p.getPageNo() > newPages)
						.collect(java.util.stream.Collectors.toList());

				if (!excessPages.isEmpty()) {
					List<Long> excessIds = excessPages.stream()
							.map(com.mbiz.yearbook.model.Yearbook::getId)
							.collect(java.util.stream.Collectors.toList());
					yearbookRepository.deleteAllById(excessIds);
					deletedCount = excessIds.size();
				}
			}
		}

		// 3. Contents 업데이트
		contentsService.update(contents);

		// 4. 결과 메시지
		if (deletedCount > 0) {
			attrs.addFlashAttribute("successMessage",
				"Content information has been modified. (초과 페이지 " + deletedCount + "건 자동 삭제됨)");
		} else {
			attrs.addFlashAttribute("successMessage", "Content information has been modified.");
		}

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