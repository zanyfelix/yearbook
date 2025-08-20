package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.Home;

@Repository
public interface HomeRepository extends JpaRepository<Home, Long> {
	
	List<Home> findByUserId(Long userId);
	List<Home> findByUserIdAndType(Long userId, String type);
}
