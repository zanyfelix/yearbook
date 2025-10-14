package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;

import jakarta.transaction.Transactional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
	
	boolean existsByUserId(String userId);
	
    List<User> findByUserId(String userId);
	List<User> findByName(String name);
	List<User> findByUserIdAndName(String userId, String name);
	List<User> findByRole(String role);
	
	List<User> findByUserIdContainingIgnoreCase(String userId);
    List<User> findByNameContainingIgnoreCase(String name);
    List<User> findBySchoolNameContainingIgnoreCase(String schoolName);
	
    // 주어진 name과 email을 가진 사용자가 존재하는지 확인하는 메서드
    Optional<User> findByNameAndMail(String name, String email);
    
 // Role과 UserId로 검색
    List<User> findByRoleAndUserIdContaining(String role, String userId);
    
    // Role과 SchoolName으로 검색
    List<User> findByRoleAndSchoolNameContaining(String role, String schoolName);
}
