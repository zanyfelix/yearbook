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
	
	List<User> findByUserIdContainingIgnoreCase(String userId);
    List<User> findByNameContainingIgnoreCase(String name);
    List<User> findBySchoolNameContainingIgnoreCase(String schoolName);
	
}
