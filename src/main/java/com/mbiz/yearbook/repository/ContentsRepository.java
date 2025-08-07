package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.Sample;

public interface ContentsRepository extends JpaRepository<Contents, Long> {

    List<Contents> findByUserId(Long userId);
    List<Contents> findByUserIdAndCategory(Long userId, String category);
}