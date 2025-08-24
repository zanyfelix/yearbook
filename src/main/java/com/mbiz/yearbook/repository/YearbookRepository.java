package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mbiz.yearbook.model.Yearbook;

import jakarta.transaction.Transactional;

public interface YearbookRepository extends JpaRepository<Yearbook, Long> {
	
	List<Yearbook> findByContentsIdOrderByPageNoAsc(Long contentsId);

    // ✨ 아래 메서드를 추가합니다.
    // contentsId와 pageNo로 yearbook 데이터를 조회하여 중복 생성을 방지합니다.
    Optional<Yearbook> findByContentsIdAndPageNo(Long contentsId, int pageNo);
    
    List<Yearbook> findByUserIdOrderByPageNoAsc(Long userId);
    
    /**
     * 특정 페이지(id)의 순서(pageNo)를 업데이트합니다.
     * @param id 업데이트할 YearbookPage의 ID
     * @param pageNo 새로 지정할 페이지 순서
     */
    @Modifying
    @Transactional
    @Query("UPDATE Yearbook yp SET yp.pageNo = :pageNo WHERE yp.id = :id")
    void updatePageOrder(@Param("id") Long id, @Param("pageNo") int pageNo);
    
    
}