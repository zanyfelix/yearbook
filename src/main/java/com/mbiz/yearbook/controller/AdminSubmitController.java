package com.mbiz.yearbook.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.Submit;
import com.mbiz.yearbook.model.SubmitForm;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.SubmitRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminSubmitController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
    private HomeService homeService;
	
	private final String UPLOAD_DIR = "upload/";
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
	private SubmitRepository submitRepository;
	
	@Autowired
    private ContentsRepository contentsRepository;
	
	@Autowired
    private YearbookRepository yearbookRepository;

	@GetMapping("/submit")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, @RequestParam(required = false) Long userId, Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    if (userId == null) {
	        List<User> users = userRepository.findByRole("user");
	        model.addAttribute("users", users);
	        userId = users.get(0).getId();
	    } else {
	        userRepository.findById(userId).ifPresent(user -> model.addAttribute("users", List.of(user)));
	    }
	    
	    model.addAttribute("id", id);
	    model.addAttribute("userId", userId);
	    
	    if(userId != null) {
	    	List<Contents> allContents = contentsRepository.findByUserId(userId);
		    List<ContentsData> contentsListForView = new ArrayList<>();
		    
		    for (Contents content : allContents) {
		    	List<Yearbook> existingPages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
		    	List<Yearbook> fullPageList = new ArrayList<>();
		    	
				for (int i = 1; i <= content.getPages(); i++) {
					final int currentPageNo = i;

					Yearbook pageToAdd = existingPages.stream().filter(p -> p.getPageNo() == currentPageNo).findFirst()
							.orElse(null); // 없으면 null

					if (pageToAdd != null) {
						fullPageList.add(pageToAdd);
					} else {
						Yearbook emptyPage = new Yearbook();
						emptyPage.setContentsId(content.getId());
						emptyPage.setPageNo(currentPageNo);
						fullPageList.add(emptyPage);
					}
				}

				ContentsData data = new ContentsData();
				data.setContentsInfo(content);
				data.setYearbookPages(fullPageList); // 완성된 리스트를 DTO에 담습니다.

				data.setSavedPagesCount(existingPages.size());

				contentsListForView.add(data);
		    }
		    model.addAttribute("contentsList", contentsListForView);
	    }
	    
	    List<Submit> submitList = submitRepository.findAll();
	    
	    model.addAttribute("submitList", submitList);
	    model.addAttribute("currentMenu", "submit");

	    return "admin/submit";
	}
	
	@PostMapping("/submit/save")
	public String saveSubmitSettings(SubmitForm form, RedirectAttributes redirectAttributes) { // 파라미터를 SubmitForm으로 변경
	    // 래퍼 객체에서 리스트를 가져와서 저장
	    submitRepository.saveAll(form.getSubmit()); 
	    redirectAttributes.addFlashAttribute("successMessage", "save success.");
	    return "redirect:/admin/submit";
	}
	
	@PostMapping("/submit/previewData")
    @ResponseBody
    public List<Yearbook> backgroundList(@RequestBody Map<String, Object> param) {
    	Long contentsId = Long.parseLong(param.get("contentsId").toString());
        return yearbookRepository.findByContentsIdOrderByPageNoAsc(contentsId);
    }
}