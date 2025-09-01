package com.mbiz.yearbook.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mbiz.yearbook.model.ContactUs;

import jakarta.transaction.Transactional;

public interface ContactUsRepository extends JpaRepository<ContactUs, Long> {
	
	List<ContactUs> findByUserId(Long userId);
	List<ContactUs> findByName(String name);
	List<ContactUs> findByUserIdAndName(Long userId, String name);
	
	@Modifying
	@Transactional
    @Query("UPDATE ContactUs c SET c.status = 'Replied', c.updatedAt = :now WHERE c.id IN :ids")
    int markAsRepliedByIds(@Param("ids") List<Long> ids, @Param("now") LocalDateTime now);
	
    List<ContactUs> findByNameContainingIgnoreCase(String name);
    List<ContactUs> findBySchoolNameContainingIgnoreCase(String schoolName);
    List<ContactUs> findBySubjectContainingIgnoreCase(String subject);
    
    @Modifying
    @Query("DELETE FROM ContactUs c WHERE c.id IN :ids")
    int deleteByIds(@Param("ids") List<Long> ids);
}