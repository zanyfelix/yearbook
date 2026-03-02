package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.model.YearbookSummary;

import jakarta.transaction.Transactional;

public interface YearbookRepository extends JpaRepository<Yearbook, Long> {
	
	@Query("SELECT NEW com.mbiz.yearbook.model.YearbookSummary(y.id, y.userId, y.contentsId, y.pageNo, y.thumbnailPath, y.lastSaved, y.subcategory) " +
	           "FROM Yearbook y " +
	           "WHERE y.contentsId = :contentsId " +
	           "ORDER BY y.pageNo ASC")
	List<YearbookSummary> findSummariesByContentsIdOrderByPageNoAsc(Long contentsId);
	
	List<Yearbook> findByContentsIdOrderByPageNoAsc(Long contentsId);
	
    // ✨ 아래 메서드를 추가합니다.
    // contentsId와 pageNo로 yearbook 데이터를 조회하여 중복 생성을 방지합니다.
    Optional<Yearbook> findByContentsIdAndPageNo(Long contentsId, int pageNo);
    
    List<Yearbook> findByUserIdOrderByPageNoAsc(Long userId);

    /**
     * 선택된 ID 목록을 contentsId ASC, pageNo ASC 순으로 조회.
     * 개별 페이지 선택 렌더링에 사용.
     */
    @Query("SELECT y FROM Yearbook y WHERE y.id IN :ids ORDER BY y.contentsId ASC, y.pageNo ASC")
    List<Yearbook> findByIdInOrderedByContentsAndPage(@Param("ids") List<Long> ids);

    /**
     * 특정 페이지(id)의 순서(pageNo)를 업데이트합니다.
     * @param id 업데이트할 YearbookPage의 ID
     * @param pageNo 새로 지정할 페이지 순서
     */
    @Modifying
    @Transactional
    @Query("UPDATE Yearbook yp SET yp.pageNo = :pageNo WHERE yp.id = :id")
    void updatePageOrder(@Param("id") Long id, @Param("pageNo") int pageNo);

    /**
     * UNIQUE 충돌 없이 pageNo를 음수(임시값)로 변경합니다.
     * 2-phase update의 1단계에서 사용합니다.
     * @param id 업데이트할 Yearbook의 ID
     * @param tempPageNo 임시로 설정할 음수 pageNo 값
     */
    @Modifying
    @Transactional
    @Query("UPDATE Yearbook yp SET yp.pageNo = :tempPageNo WHERE yp.id = :id")
    void updatePageOrderToTemp(@Param("id") Long id, @Param("tempPageNo") int tempPageNo);
    
 // 중복 방어를 위해 Optional → List 반환 메서드 추가 필요
    List<Yearbook> findAllByContentsIdAndPageNo(Long contentsId, Integer pageNo);
    
}