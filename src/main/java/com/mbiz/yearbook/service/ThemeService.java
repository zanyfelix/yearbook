package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.UserThemeRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ThemeService {
	
	private final UserRepository userRepository;
    private final ThemeRepository themeRepository;
    private final UserThemeRepository userThemeRepository;

    public List<Theme> findByCategory(String category) {
        return themeRepository.findByCategory(category);
    }
    
    @Transactional
    public void saveUserTheme(Long userId, String category, Long themeId) {
    	
    	UserTheme ut = new UserTheme();
    	
    	User userReference = userRepository.getReferenceById(userId);
        Theme themeReference = themeRepository.getReferenceById(themeId);
    	
    	ut.setUser(userReference);
	    ut.setTheme(themeReference);
	    ut.setCategory(category);
	    ut.setCreatedAt(LocalDateTime.now());
	    ut.setUpdatedAt(LocalDateTime.now());
    	
    	userThemeRepository.save(ut);
    }
    
    public List<Long> findThemeIdsByUserAndCategory(Long userId, String category) {
        return userThemeRepository
                .findUserThemesByUserIdAndThemeCategory(userId, category)
                .stream()
                .map(theme -> theme.getId()) // ✅ Theme 객체에서 직접 id 꺼냄
                .collect(Collectors.toList());
    }
    
    public List<UserTheme> findByUserIdAndCategory(Long userId, String category, String gubun) {
        List<Theme> userThemes;
        
        // 올바른 메소드 호출
        if (gubun != null && !gubun.isEmpty()) {
            userThemes = userThemeRepository.findUserThemesByUserIdAndThemeCategoryAndThemeGubun(userId, category, gubun);
        } else {
            userThemes = userThemeRepository.findUserThemesByUserIdAndThemeCategory(userId, category);
        }
        
        // parentId 수집 (중복 제거)
        Set<Long> parentIds = userThemes.stream()
            .map(Theme::getParentId)
            .collect(Collectors.toSet());
        
        // 각 parentId의 대표 테마 조회 - 올바른 Repository 사용
        List<Theme> representativeThemes = parentIds.stream()
            .map(parentId -> themeRepository.findByIdAndParentId(parentId, parentId))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.toList());
        
        // UserTheme 객체로 변환하여 반환
        return representativeThemes.stream()
            .map(theme -> {
                UserTheme ut = new UserTheme();
                ut.setTheme(theme);
                return ut;
            })
            .collect(Collectors.toList());
    }
}