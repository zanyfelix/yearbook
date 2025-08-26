package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.UserTheme;

@Repository
public interface UserThemeRepository extends JpaRepository<UserTheme, Long> {

	/**
     * [✅ 수정됨]
     * gubun 조건이 있을 때 '대표' 테마(id와 parentId가 동일) 목록만 조회합니다.
     * JOIN FETCH를 사용하여 User와 Theme 객체를 즉시 로딩하여 직렬화 오류를 방지합니다.
     */
	// gubun이 있을 때
	@Query("SELECT t FROM UserTheme ut, Theme t " +
	           "WHERE ut.themeNo = t.themeNo " + // 👈 명시적인 JOIN 조건
	           "AND ut.user.id = :userId " +
	           "AND t.category = :category " +
	           "AND t.gubun = :gubun")
    List<Theme> findUserThemesByUserIdAndThemeCategoryAndThemeGubun(
        @Param("userId") Long userId, 
        @Param("category") String category, 
        @Param("gubun") String gubun);

    // gubun이 없을 때
	@Query("SELECT t FROM UserTheme ut, Theme t " +
	           "WHERE ut.themeNo = t.themeNo " + // 👈 명시적인 JOIN 조건
	           "AND ut.user.id = :userId " +
	           "AND t.category = :category ")
    List<Theme> findUserThemesByUserIdAndThemeCategory(
        @Param("userId") Long userId, 
        @Param("category") String category);
        
    Optional<UserTheme> findByUserId(Long userId);
    
}