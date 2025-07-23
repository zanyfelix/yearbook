package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Photo;
import com.mbiz.yearbook.model.Theme;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Long> {
	
    List<Theme> findByCategory(String category);
}