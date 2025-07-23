package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;

public interface YearbookRepository extends JpaRepository<Yearbook, Long> {

//    List<Yearbook> findByUser(User user);
//
//    List<Yearbook> findByUserAndCategory(User user, String category);
//
//    long countByUserAndCategory(User user, String category);
//    
//    
//    
//    int countByUserIdAndCategory(Long userId, String category);
//    int countByUserIdAndCategoryAndSubmittedTrue(Long userId, String category);
//    int countByUserIdAndCategoryAndSubmittedFalse(Long userId, String category);
}