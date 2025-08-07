package com.mbiz.yearbook.controller;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.Progress;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ProgressService;
import com.mbiz.yearbook.service.ProgressService;

import jakarta.servlet.http.HttpSession;

@Controller
public class SubmitController {
	
	@Autowired
    private YearbookRepository yearbookRepository;
	
	@Autowired
    private ContentsRepository contentsRepository;
	
	@GetMapping("/submit")
	public String submit(HttpSession session, @RequestParam Long id, Model model) {
		
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
	    
	    List<Contents> allContents = contentsRepository.findByUserId(loginUser.getId());
	    List<ContentsData> contentsListForView = new ArrayList<>();
	    
	    for (Contents content : allContents) {
	    	List<Yearbook> existingPages = yearbookRepository.findByContentsId(content.getId());
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
	    model.addAttribute("currentMenu", "submit");

	    return "submit";
	}
	
	@PostMapping("/submit/previewData")
    @ResponseBody
    public List<Yearbook> backgroundList(@RequestBody Map<String, Object> param) {
    	Long contentsId = Long.parseLong(param.get("contentsId").toString());
        return yearbookRepository.findByContentsId(contentsId);
    }
}