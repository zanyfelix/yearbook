package com.mbiz.yearbook.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Photo;
import com.mbiz.yearbook.repository.PhotoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PhotoService {
    private final PhotoRepository photoRepository;

    public List<Photo> findAll() {
        return photoRepository.findAll();
    }

    public List<Photo> findByCategory(Long categoryId) {
        return photoRepository.findByCategoryId(categoryId);
    }

    public Photo save(Photo photo) {
        return photoRepository.save(photo);
    }

    public Photo findById(Long id) {
        return photoRepository.findById(id).orElse(null);
    }

    public void delete(Long id) {
        photoRepository.deleteById(id);
    }
}