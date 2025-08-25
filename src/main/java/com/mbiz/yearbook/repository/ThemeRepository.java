package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Theme;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Long> {
	
    List<Theme> findByCategory(String category);
    
    // ✨ parentId를 기준으로 모든 Theme 객체를 찾는 메서드 추가
    List<Theme> findByParentId(Long parentId);
    
    Optional<Theme> findByIdAndParentId(Long id, Long parentId);
}