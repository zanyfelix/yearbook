package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;

import jakarta.transaction.Transactional;

public interface ContactUsRepository extends JpaRepository<ContactUs, Long> {
	
	List<ContactUs> findByUserId(String userId);
	List<ContactUs> findByName(String name);
	List<ContactUs> findByUserIdAndName(String userId, String name);
	
	@Modifying
	@Transactional
    @Query("UPDATE ContactUs c SET c.status = 'Replied' WHERE c.id IN :ids")
    int markAsRepliedByIds(@Param("ids") List<Long> ids);
	
	List<ContactUs> findByUserIdContainingIgnoreCase(String userId);
    List<ContactUs> findByNameContainingIgnoreCase(String name);
    List<ContactUs> findBySchoolNameContainingIgnoreCase(String schoolName);
    List<ContactUs> findBySubjectContainingIgnoreCase(String subject);
}