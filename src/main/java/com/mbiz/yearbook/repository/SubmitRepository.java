package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Submit;

@Repository
public interface SubmitRepository extends JpaRepository<Submit, Long> {
	
    List<Submit> findByUserId(Long userId);
	
}
