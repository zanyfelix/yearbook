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
    public void saveUserTheme(Long id, String category, List<Long> themeIds) {
    	
    	User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    
    	List<UserTheme> newMappings = new ArrayList<>();
    	for (int i = 0; i < themeIds.size(); i++) {
    		Long themeId = themeIds.get(i);
    	    Theme theme = themeRepository.findById(themeId)
    	                     .orElseThrow(() -> new EntityNotFoundException("Theme not found: " + themeId));

    	    UserTheme ut = new UserTheme();
    	    ut.setUserId(id);
    	    ut.setTheme(theme);
    	    ut.setCategory(category);
    	    ut.setCreatedAt(LocalDateTime.now());
    	    ut.setUpdatedAt(LocalDateTime.now());
    	    newMappings.add(ut);
    	}
    	
    	userThemeRepository.saveAll(newMappings);
    }
    
    public List<Long> findThemeIdsByUserAndCategory(Long userId, String category) {
    	return userThemeRepository
                .findByUserIdAndCategory(userId, category)
                .stream()
                .map(ut -> ut.getTheme().getId())  // ✅ theme 객체에서 id 꺼냄
                .collect(Collectors.toList());
    }
    
    public List<UserTheme> findByUserIdAndCategory (Long userId, String category) {
    	return userThemeRepository.findByUserIdAndCategory(userId, category);
    }
    
    
    
}