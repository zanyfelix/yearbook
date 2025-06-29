package com.mbiz.yearbook.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.FileInfo;
import com.mbiz.yearbook.repository.FileInfoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileInfoService {
    private final FileInfoRepository fileInfoRepository;

    public List<FileInfo> findByPhoto(Long photoId) {
        return fileInfoRepository.findByPhotoId(photoId);
    }

    public FileInfo save(FileInfo fileInfo) {
        return fileInfoRepository.save(fileInfo);
    }

    public void delete(Long id) {
        fileInfoRepository.deleteById(id);
    }
}