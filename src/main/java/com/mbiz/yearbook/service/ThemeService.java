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
    public void saveUserTheme(Long userId, Long themeNo, List<Long> fontIds) {
        Objects.requireNonNull(userId, "User ID는 null일 수 없습니다.");
        Objects.requireNonNull(themeNo, "Theme Number는 null일 수 없습니다.");

        List<UserTheme> userThemes = userThemeRepository.findByUserId(userId);
        
        UserTheme ut;
        if (userThemes.isEmpty()) {
            // 리스트가 비어있으면(결과가 없으면) 새 객체를 생성합니다.
            ut = new UserTheme();
        } else {
            // 결과가 있으면 리스트의 첫 번째 항목을 사용합니다.
            ut = userThemes.get(0);
        }
        
        Theme themeToSave = themeRepository.findById(themeNo)
            .orElseThrow(() -> new EntityNotFoundException("ID(" + themeNo + ")를 가진 테마를 찾을 수 없습니다."));

        ut.setUser(userRepository.getReferenceById(userId));
        ut.setTheme(themeToSave);
        ut.setThemeNo(themeNo);
        
        // [수정] 폰트 ID 리스트를 콤마(,)로 구분된 문자열로 변환
        String fontIdsString = "";
        if (fontIds != null && !fontIds.isEmpty()) {
            fontIdsString = fontIds.stream()
                                   .map(String::valueOf)
                                   .collect(Collectors.joining(","));
        }
        ut.setFontIds(fontIdsString); // 변환된 문자열을 저장
        
        if (ut.getId() == null) {
            ut.setCreatedAt(LocalDateTime.now());
        }
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