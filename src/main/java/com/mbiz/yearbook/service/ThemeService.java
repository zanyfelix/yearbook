package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.UserThemeRepository;

import jakarta.persistence.EntityNotFoundException;
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
    public void saveUserTheme(Long userId, Long themeNo, Long fontId) {
    	
    	Objects.requireNonNull(userId, "User ID는 null일 수 없습니다.");
        Objects.requireNonNull(themeNo, "Theme Number는 null일 수 없습니다.");
        Objects.requireNonNull(fontId, "Font ID는 null일 수 없습니다.");

        UserTheme ut = userThemeRepository.findByUserId(userId)
                           .orElse(new UserTheme());
        
        // 1. 사용자가 선택한 themeNo 그룹의 대표 객체를 찾는 기존 로직은 그대로 둡니다.
        // (이 로직이 다른 곳에서 필요할 수 있으므로)
        Theme originalRepresentativeTheme = themeRepository.findFirstByThemeNoOrderByIdAsc(themeNo)
            .orElseThrow(() -> new EntityNotFoundException("해당 themeNo를 가진 테마를 찾을 수 없습니다: " + themeNo));
        
        // ================== [핵심 수정 사항] ==================
        
        // 2. 실제로 저장할 임의의 theme_id 값을 정의합니다. (예: 999)
        Long arbitraryThemeId = themeNo; 

        // 3. 임의의 ID 값으로 새로운 대표 객체를 다시 찾아옵니다.
        Theme finalThemeToSave = themeRepository.findById(arbitraryThemeId)
            .orElseThrow(() -> new EntityNotFoundException("임의로 지정한 ID(" + arbitraryThemeId + ")를 가진 테마를 찾을 수 없습니다."));
        
        // ======================================================

        
        ut.setUser(userRepository.getReferenceById(userId));
        
        // 4. 최종적으로 저장할 '새로운 대표 객체'와 관계를 맺어줍니다.
        ut.setTheme(finalThemeToSave); 
        ut.setThemeNo(arbitraryThemeId);
        ut.setCreatedAt(LocalDateTime.now());
        ut.setUpdatedAt(LocalDateTime.now());
        ut.setFontId(fontId);
        
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
        
        representativeThemes.sort(java.util.Comparator
                // 1순위: (Theme theme)으로 타입을 명시
                .comparingLong((Theme theme) -> (long) theme.getEditWidth() * theme.getEditHeight())
                // 2순위: 1순위 결과가 같으면 edit_width 내림차순
                .thenComparing(Theme::getEditWidth, java.util.Comparator.naturalOrder())
                // 3순위: 2순위 결과도 같으면 file_name 오름차순
                .thenComparing(Theme::getFilename)
            );
        
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