package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ContentsService;
import com.mbiz.yearbook.service.ThemeService;
import com.mbiz.yearbook.service.ThumbnailRenderingService;
import com.mbiz.yearbook.service.YearbookService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EditController {
	
	@Value("${file.upload-dir}") // 프로퍼티 값 주입
    private String uploadPath;

    @Autowired
    private ContentsService contentsService;
    
    @Autowired
    private ThemeService themeService;
    
    @Autowired
    private YearbookService yearbookService;
    
    @Autowired
    private ContentsRepository contentsRepository;
    
    @Autowired
    private YearbookRepository yearbookRepository;
    
    @Autowired
    private ThemeRepository themeRepository;
    
    @Autowired
    private ThumbnailRenderingService thumbnailRenderingService;

	@GetMapping("/edit")
	public String editMain(HttpSession session, @RequestParam Long id, Model model) {

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
			// 1. 해당 contents에 대해 DB에 이미 저장된 yearbook 페이지들을 가져옵니다.
			List<Yearbook> existingPages = yearbookRepository.findByContentsId(content.getId());

			// 2. contents.pages 개수만큼 채울 최종 페이지 리스트를 생성합니다.
			List<Yearbook> fullPageList = new ArrayList<>();

			// 3. 1페이지부터 contents.pages 만큼 반복합니다.
			for (int i = 1; i <= content.getPages(); i++) {
				final int currentPageNo = i;

				// 4. 이미 저장된 페이지 목록(existingPages)에서 현재 페이지 번호와 일치하는 것을 찾습니다.
				Yearbook pageToAdd = existingPages.stream().filter(p -> p.getPageNo() == currentPageNo).findFirst()
						.orElse(null); // 없으면 null

				if (pageToAdd != null) {
					// 5a. 일치하는 페이지가 있으면, 그 데이터를 리스트에 추가합니다.
					fullPageList.add(pageToAdd);
				} else {
					// 5b. 일치하는 페이지가 없으면, JSP에서 placeholder를 표시할 수 있도록
					// contentsId와 pageNo만 가진 '빈' Yearbook 객체를 만들어 추가합니다.
					Yearbook emptyPage = new Yearbook();
					emptyPage.setContentsId(content.getId());
					emptyPage.setPageNo(currentPageNo);
					// id, thumbnailPath 등은 null인 상태로 둡니다.
					fullPageList.add(emptyPage);
				}
			}

			// DTO 객체 생성 및 데이터 설정
			ContentsData data = new ContentsData();
			data.setContentsInfo(content);
			data.setYearbookPages(fullPageList); // 완성된 리스트를 DTO에 담습니다.
			
			data.setSavedPagesCount(existingPages.size());

			contentsListForView.add(data);
		}

		model.addAttribute("contentsList", contentsListForView);
		model.addAttribute("currentMenu", "edit");

		return "edit";
	}
    
	@GetMapping("/edit/theme")
    @ResponseBody
    public List<UserTheme> backgroundList(@RequestParam Long userId, @RequestParam String category) {
        return themeService.findByUserIdAndCategory(userId, category);
    }
    
    /**
     * 특정 테마 ID를 받아, 해당 테마와 동일한 부모 ID를 가진 모든 테마 목록을 반환합니다.
     */
    @GetMapping("/edit/themesByParent") // 새로운 GET 요청 주소
    @ResponseBody
    public List<Theme> getThemesByParentId(@RequestParam Long themeId) {
        // 1. 전달받은 themeId로 현재 테마를 조회하여 parentId를 얻습니다.
        Theme currentTheme = themeRepository.findById(themeId)
                .orElseThrow(() -> new RuntimeException("Theme not found with id: " + themeId));
        
        Long parentId = currentTheme.getParentId();

        // 2. parentId가 있으면, 해당 parentId를 가진 모든 테마 목록을 조회하여 반환합니다.
        if (parentId != null) {
            return themeRepository.findByParentId(parentId);
        }

        // parentId가 없는 경우, 빈 리스트나 적절한 예외 처리를 합니다.
        return Collections.emptyList();
    }
    
    @PostMapping("/edit/savePage")
    @ResponseBody // @ResponseBody를 추가하여 JSON 응답을 보장합니다.
    public Map<String, Object> savePage(@RequestBody Map<String, Object> payload) {
        Object yearbookIdObj = payload.get("yearbookId");
        Long yearbookId = (yearbookIdObj != null && !yearbookIdObj.toString().isEmpty()) ? Long.parseLong(yearbookIdObj.toString()) : null;

        String designDataJson = (String) payload.get("designData");
        String imageData = (String) payload.get("imageData");

        Yearbook page;

        // ID 존재 여부에 따라 분기
        if (yearbookId != null) {
            // ID가 있으면 기존 데이터 수정 (Update)
            page = yearbookRepository.findById(yearbookId).orElseThrow(() -> new RuntimeException("페이지를 찾을 수 없습니다."));
        } else {
            // ID가 없으면 신규 데이터 생성 (Create)
            Long contentsId = Long.parseLong(payload.get("contentsId").toString());
            Integer pageNo = Integer.parseInt(payload.get("pageNo").toString());
            Long userId = Long.parseLong(payload.get("userId").toString());

            page = yearbookRepository.findByContentsIdAndPageNo(contentsId, pageNo)
                                      .orElse(new Yearbook());
            
            if (page.getId() == null) {
                page.setUserId(userId);
                page.setContentsId(contentsId);
                page.setPageNo(pageNo);
            }
        }

        page.setDesignData(designDataJson);
        page.setLastSaved(new Date());

        Yearbook savedPage = yearbookRepository.save(page);
        
        int updatedSavedCount = yearbookRepository.findByContentsId(savedPage.getContentsId()).size();

        // 변경: 서버에서 designData를 기반으로 직접 썸네일 렌더링
        String newImagePath = null;
        try {
            newImagePath = thumbnailRenderingService.generateThumbnail(designDataJson, savedPage.getId());
        } catch (IOException e) {
            e.printStackTrace();
            // 썸네일 생성 실패 시 에러 처리 (예: 기본 이미지 경로 반환 또는 null 처리)
        }
        
        savedPage.setThumbnailPath(newImagePath);
        yearbookRepository.save(savedPage);

        Map<String, Object> response = new HashMap<>();
        response.put("newImagePath", newImagePath);
        response.put("newYearbookId", savedPage.getId());
        response.put("lastSaved", savedPage.getLastSaved());
        
        response.put("updatedSavedCount", updatedSavedCount);
        response.put("contentsId", savedPage.getContentsId());
        
        return response;
    }
    
    /**
     * 특정 yearbook ID에 해당하는 페이지의 저장된 디자인 데이터를 반환합니다.
     */
    @GetMapping("/edit/pageData")
    @ResponseBody
    public Yearbook getPageData(@RequestParam("id") Long yearbookId) {
        return yearbookRepository.findById(yearbookId)
                .orElseThrow(() -> new RuntimeException("Yearbook page not found with id: " + yearbookId));
    }
    
    /**
     * 페이지 디자인을 리셋(삭제)하는 메소드
     * @param id yearbookId
     * @return 성공 여부를 담은 JSON 객체
     */
    @PostMapping("/edit/resetPage")
    @ResponseBody // JSON 형태로 응답하기 위함
    public Map<String, Object> resetPage(@RequestParam("id") Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 여기에 yearbookId(id)를 사용하여 데이터베이스에서
            // 해당 레코드를 삭제하는 서비스 로직을 호출합니다.
            // 예: yearbookService.deletePage(id);
        	yearbookRepository.deleteById(id);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            // 로그 기록
        }
        return response;
    }
}