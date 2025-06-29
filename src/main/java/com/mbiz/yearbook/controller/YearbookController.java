package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mbiz.yearbook.model.PageEditDto;
import com.mbiz.yearbook.model.Sample;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.YearbookPage;
import com.mbiz.yearbook.repository.SampleRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookPageRepository;
import com.mbiz.yearbook.service.YearbookService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller

@RequiredArgsConstructor
public class YearbookController {
	
	private final YearbookPageRepository pageRepo;
    private final UserRepository userRepository;
    private final SampleRepository sampleRepository;

    private final YearbookService yearbookService;

    @GetMapping("/edit")
    public String editPage(HttpSession session, Model model) {
        User user = (User) session.getAttribute("loginUser");

        List<YearbookPage> userPages = pageRepo.findByUser(user);

        Map<String, List<YearbookPage>> groupedPages = userPages.stream()
                .collect(Collectors.groupingBy(YearbookPage::getCategory));

        model.addAttribute("groupedPages", groupedPages);
        
        model.addAttribute("currentMenu", "edit");
        return "edit";
    }
    
    //모달창 백그라운드 샘플 리스트 불러오기
    @GetMapping("/sample/background")
    @ResponseBody
    public List<Sample> loadBackgroundSamples() {
        return sampleRepository.findByGubun("background");
    }

    /**
     * 특정 페이지 편집창 열기
     */
    @GetMapping("/{pageId}")
    public String editPage(@PathVariable Long pageId, Model model) {
        PageEditDto dto = yearbookService.getPageEditDto(pageId);
        model.addAttribute("page", dto);
        return "edit_popup";  // edit_popup.jsp
    }

    /**
     * 페이지 저장 처리 (AJAX)
     */
    @PostMapping("/{pageId}/save")
    @ResponseBody
    public String savePage(@PathVariable Long pageId, @RequestBody PageEditDto dto) {
        dto.setPageId(pageId);  // 경로 파라미터로 전달된 pageId 설정
        yearbookService.savePage(dto);
        return "success";
    }

    /**
     * 페이지 리셋 처리 (AJAX)
     */
    @PostMapping("/{pageId}/reset")
    @ResponseBody
    public String resetPage(@PathVariable Long pageId) {
        yearbookService.resetPage(pageId);
        return "reset";
    }
}