package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.PageEditDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.YearbookPage;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookPageRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class YearbookService {

    private final YearbookPageRepository pageRepository;
    private final UserRepository userRepository;

    /**
     * 특정 사용자의 전체 이어북 페이지 목록 조회
     */
    public List<YearbookPage> getPagesForUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        return pageRepository.findByUser(user);
    }

    /**
     * 특정 페이지의 편집 데이터를 DTO로 조회
     */
    public PageEditDto getPageEditDto(Long pageId) {
        YearbookPage page = pageRepository.findById(pageId)
            .orElseThrow(() -> new IllegalArgumentException("페이지를 찾을 수 없습니다: " + pageId));

        return PageEditDto.builder()
            .pageId(page.getId())
            .backgroundPath(page.getBackgroundPath())
            .framesJson(page.getFramesJson())
            .textsJson(page.getTextsJson())
            .build();
    }

    /**
     * 페이지 저장
     */
    public void savePage(PageEditDto dto) {
        YearbookPage page = pageRepository.findById(dto.getPageId())
            .orElseThrow(() -> new IllegalArgumentException("페이지를 찾을 수 없습니다: " + dto.getPageId()));

        page.setBackgroundPath(dto.getBackgroundPath());
        page.setFramesJson(dto.getFramesJson());
        page.setTextsJson(dto.getTextsJson());
        page.setLastSaved(LocalDateTime.now());

        pageRepository.save(page);
    }

    /**
     * 페이지 리셋 (모든 편집 정보 초기화)
     */
    public void resetPage(Long pageId) {
        YearbookPage page = pageRepository.findById(pageId)
            .orElseThrow(() -> new IllegalArgumentException("페이지를 찾을 수 없습니다: " + pageId));

        page.setBackgroundPath(null);
        page.setFramesJson("{}");
        page.setTextsJson("{}");
        page.setLastSaved(LocalDateTime.now());

        pageRepository.save(page);
    }
}