package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.YearbookPage;

public interface YearbookPageRepository extends JpaRepository<YearbookPage, Long> {

    // 특정 사용자(user)가 작성한 모든 페이지 조회
    List<YearbookPage> findByUser(User user);

    // 특정 사용자 + 카테고리로 필터링
    List<YearbookPage> findByUserAndCategory(User user, String category);

    // 카테고리별로 페이지 수 계산 (예: 제한 확인용)
    long countByUserAndCategory(User user, String category);
}