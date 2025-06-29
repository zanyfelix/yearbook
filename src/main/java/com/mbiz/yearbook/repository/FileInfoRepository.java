package com.mbiz.yearbook.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.FileInfo;

@Repository
public interface FileInfoRepository extends JpaRepository<FileInfo, Long> {
    List<FileInfo> findByPhotoId(Long photoId);
}