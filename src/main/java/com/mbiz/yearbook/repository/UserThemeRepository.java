package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.UserTheme;

@Repository
public interface UserThemeRepository extends JpaRepository<UserTheme, Long> {

	List<UserTheme> findByUserIdAndCategory(Long userId, String category);
    
}