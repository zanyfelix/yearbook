package com.mbiz.yearbook.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Home;

@Repository
public interface HomeRepository extends JpaRepository<Home, Long> {
	
	
}
