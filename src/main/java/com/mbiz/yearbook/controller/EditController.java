package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.mbiz.yearbook.model.*;
import com.mbiz.yearbook.repository.*;
import com.mbiz.yearbook.service.*;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EditController {
    
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
    private UserThemeRepository userThemeRepository;
    
    @Autowired
    private ThumbnailRenderingService thumbnailRenderingService;

    @GetMapping("/edit")
    public String editMain(HttpSession session, @RequestParam Long id, Model model) {
        User loginUser = (User) session.getAttribute("loginUser");
        model.addAttribute("loginUser", loginUser);
        model.addAttribute("deadline", loginUser.getDeadline());

        // 날짜 계산
        LocalDate today = LocalDate.now();
        LocalDate deadline = loginUser.getDeadline()
                .toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();
        
        long remainDays = ChronoUnit.DAYS.between(today, deadline);
        
        // 진행률 계산
        Map<String, Integer> progressData = calculateProgress(loginUser.getId());
        
        model.addAttribute("remainDays", remainDays);
        model.addAttribute("groupProgress", progressData.get("groupProgress"));
        model.addAttribute("eventProgress", progressData.get("eventProgress"));

        // 콘텐츠 목록 생성
        List<ContentsData> contentsListForView = createContentsListForView(loginUser.getId());
        
        model.addAttribute("contentsList", contentsListForView);
        model.addAttribute("currentMenu", "edit");

        return "edit";
    }
    
    private Map<String, Integer> calculateProgress(Long userId) {
        Map<String, Integer> result = new HashMap<>();
        
        int groupCompleted = 0, groupTotal = 0;
        int eventCompleted = 0, eventTotal = 0;
        
        List<Contents> groupContents = contentsRepository.findByUserIdAndCategory(userId, "group");
        List<Contents> eventContents = contentsRepository.findByUserIdAndCategory(userId, "event");
        
        for (Contents content : groupContents) {
            groupTotal += content.getPages();
            groupCompleted += yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId()).size();
        }
        
        for (Contents content : eventContents) {
            eventTotal += content.getPages();
            eventCompleted += yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(content.getId()).size();
        }
        
        result.put("groupProgress", groupTotal != 0 ? (groupCompleted * 100) / groupTotal : 0);
        result.put("eventProgress", eventTotal != 0 ? (eventCompleted * 100) / eventTotal : 0);
        
        return result;
    }
    
    private List<ContentsData> createContentsListForView(Long userId) {
        List<Contents> allContents = contentsRepository.findByUserId(userId);
        List<ContentsData> contentsListForView = new ArrayList<>();

        for (Contents content : allContents) {
            List<YearbookSummary> existingPages = yearbookRepository
                    .findSummariesByContentsIdOrderByPageNoAsc(content.getId());
            
            List<YearbookSummary> fullPageList = new ArrayList<>();
            
            for (int i = 1; i <= content.getPages(); i++) {
                final int currentPageNo = i;
                YearbookSummary pageToAdd = existingPages.stream()
                        .filter(p -> p.getPageNo() == currentPageNo)
                        .findFirst()
                        .orElseGet(() -> createEmptyPage(content.getId(), currentPageNo));
                
                fullPageList.add(pageToAdd);
            }

            ContentsData data = new ContentsData();
            data.setContentsInfo(content);
            data.setYearbookPages(fullPageList);
            data.setSavedPagesCount(existingPages.size());
            
            contentsListForView.add(data);
        }

        return contentsListForView;
    }
    
    private YearbookSummary createEmptyPage(Long contentsId, int pageNo) {
        YearbookSummary emptyPage = new YearbookSummary();
        emptyPage.setContentsId(contentsId);
        emptyPage.setPageNo(pageNo);
        return emptyPage;
    }
    
    @GetMapping("/edit/theme")
    @ResponseBody
    public List<UserTheme> backgroundList(@RequestParam Long userId, 
                                         @RequestParam String category, 
                                         @RequestParam String gubun) {
        return themeService.findByUserIdAndCategory(userId, category, gubun);
    }
    
    @GetMapping("/edit/themesByParent")
    @ResponseBody
    public List<Theme> getThemesByParentId(@RequestParam Long themeId) {
        Theme currentTheme = themeRepository.findById(themeId)
                .orElseThrow(() -> new RuntimeException("Theme not found with id: " + themeId));
        
        Long parentId = currentTheme.getParentId();
        return parentId != null ? 
                themeRepository.findByParentIdOrderByFilenameAsc(parentId) : 
                Collections.emptyList();
    }
    
    @GetMapping("/edit/fonts")
    @ResponseBody
    public List<FontDto> getFonts(HttpSession session) {
        User loginUser = (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            return Collections.emptyList();
        }

        List<UserTheme> userThemes = userThemeRepository.findByUserId(loginUser.getId());
        if (userThemes.isEmpty() || userThemes.get(0).getFontIds() == null) {
            return Collections.emptyList();
        }

        String fontIdsString = userThemes.get(0).getFontIds();
        
        try {
            List<Long> fontIds = Arrays.stream(fontIdsString.split(","))
                    .map(String::trim)
                    .map(Long::parseLong)
                    .collect(Collectors.toList());
            
            List<Theme> themes = themeRepository.findAllById(fontIds);
            
            return themes.stream()
                    .map(theme -> new FontDto(theme.getId(), theme.getFilename(), theme.getFontPath()))
                    .collect(Collectors.toList());
        } catch (NumberFormatException e) {
            return Collections.emptyList();
        }
    }
    
    @PostMapping("/edit/savePage")
    @ResponseBody
    public Map<String, Object> savePage(@RequestBody Map<String, Object> payload) {
        Long yearbookId = parseId(payload.get("yearbookId"));
        String designDataJson = (String) payload.get("designData");

        Yearbook page = yearbookId != null ? 
                updateExistingPage(yearbookId) : 
                createNewPage(payload);

        page.setDesignData(designDataJson);
        page.setLastSaved(new Date());

        Yearbook savedPage = yearbookRepository.saveAndFlush(page);
        
        String newImagePath = generateThumbnail(designDataJson, savedPage.getId());
        savedPage.setThumbnailPath(newImagePath);
        yearbookRepository.saveAndFlush(savedPage);

        return createSaveResponse(savedPage, newImagePath);
    }
    
    private Long parseId(Object idObj) {
        return (idObj != null && !idObj.toString().isEmpty()) ? 
                Long.parseLong(idObj.toString()) : null;
    }
    
    private Yearbook updateExistingPage(Long yearbookId) {
        return yearbookRepository.findById(yearbookId)
                .orElseThrow(() -> new RuntimeException("페이지를 찾을 수 없습니다."));
    }
    
    private Yearbook createNewPage(Map<String, Object> payload) {
        Long contentsId = Long.parseLong(payload.get("contentsId").toString());
        Integer pageNo = Integer.parseInt(payload.get("pageNo").toString());
        Long userId = Long.parseLong(payload.get("userId").toString());

        Yearbook page = yearbookRepository.findByContentsIdAndPageNo(contentsId, pageNo)
                .orElse(new Yearbook());
        
        if (page.getId() == null) {
            page.setUserId(userId);
            page.setContentsId(contentsId);
            page.setPageNo(pageNo);
        }
        
        return page;
    }
    
    private String generateThumbnail(String designDataJson, Long pageId) {
        try {
            return thumbnailRenderingService.generateThumbnail(designDataJson, pageId);
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
    
    private Map<String, Object> createSaveResponse(Yearbook savedPage, String newImagePath) {
        Map<String, Object> response = new HashMap<>();
        response.put("newImagePath", newImagePath);
        response.put("newYearbookId", savedPage.getId());
        response.put("lastSaved", savedPage.getLastSaved());
        response.put("updatedSavedCount", 
                yearbookRepository.findByContentsIdOrderByPageNoAsc(savedPage.getContentsId()).size());
        response.put("contentsId", savedPage.getContentsId());
        return response;
    }
    
    @GetMapping("/edit/pageData")
    @ResponseBody
    public Yearbook getPageData(@RequestParam("id") Long yearbookId) {
        return yearbookRepository.findById(yearbookId)
                .orElseThrow(() -> new RuntimeException("Yearbook page not found with id: " + yearbookId));
    }
    
    @PostMapping("/edit/resetPage")
    @ResponseBody
    public Map<String, Object> resetPage(@RequestParam("id") Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            yearbookRepository.deleteById(id);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }
    
    @PostMapping("/edit/updatePageOrder")
    @ResponseBody
    public Map<String, Object> updatePageOrder(@RequestBody List<PageOrderDTO> pageOrders) {
        Map<String, Object> response = new HashMap<>();
        try {
            yearbookService.updatePageOrder(pageOrders);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            e.printStackTrace();
        }
        return response;
    }
    
    public static class PageOrderDTO {
        private Long id;
        private int pageNo;
        
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public int getPageNo() { return pageNo; }
        public void setPageNo(int pageNo) { this.pageNo = pageNo; }
    }
}