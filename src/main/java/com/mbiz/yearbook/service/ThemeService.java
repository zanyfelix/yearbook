package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
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
                .findWithUserAndThemeByUserIdAndCategory(userId, category)
                .stream()
                .map(ut -> ut.getTheme().getId())  // ✅ theme 객체에서 id 꺼냄
                .collect(Collectors.toList());
    }
    
    public List<UserTheme> findByUserIdAndCategory (Long userId, String category) {
    	return userThemeRepository.findWithUserAndThemeByUserIdAndCategory(userId, category);
    }
    
    
    
}