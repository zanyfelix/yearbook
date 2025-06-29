package com.mbiz.yearbook.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
}