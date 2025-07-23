package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.UserTheme;

@Repository
public interface UserThemeRepository extends JpaRepository<UserTheme, Long> {

	@Query("SELECT ut FROM UserTheme ut JOIN FETCH ut.theme WHERE ut.userId = :userId AND ut.category = :category")
	List<UserTheme> findByUserIdAndCategory(@Param("userId") Long userId, @Param("category") String category);
    
}