package com.mbiz.yearbook.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Category;
import com.mbiz.yearbook.repository.CategoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public List<Category> findAll() {
        return categoryRepository.findAll();
    }

    public Category save(Category category) {
        return categoryRepository.save(category);
    }

    public Category findById(Long id) {
        return categoryRepository.findById(id).orElse(null);
    }

    public void delete(Long id) {
        categoryRepository.deleteById(id);
    }
}