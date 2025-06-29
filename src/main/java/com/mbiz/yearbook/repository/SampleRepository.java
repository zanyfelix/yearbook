package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mbiz.yearbook.model.Sample;

public interface SampleRepository extends JpaRepository<Sample, Long> {

    List<Sample> findByGubun(String gubun);

    List<Sample> findAllByOrderByUploadedAtDesc();
}