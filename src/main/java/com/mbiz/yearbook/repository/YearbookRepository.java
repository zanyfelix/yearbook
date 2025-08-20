package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mbiz.yearbook.model.Yearbook;

public interface YearbookRepository extends JpaRepository<Yearbook, Long> {
	
	List<Yearbook> findByContentsId(Long contentsId);

    // ✨ 아래 메서드를 추가합니다.
    // contentsId와 pageNo로 yearbook 데이터를 조회하여 중복 생성을 방지합니다.
    Optional<Yearbook> findByContentsIdAndPageNo(Long contentsId, int pageNo);
    
    List<Yearbook> findByUserIdOrderByPageNoAsc(Long userId);
}