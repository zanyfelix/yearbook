package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.Photo;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {
    List<Photo> findByCategoryId(Long categoryId);
}