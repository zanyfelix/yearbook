package com.mbiz.yearbook.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mbiz.yearbook.model.CategoryDto;
import com.mbiz.yearbook.repository.CategoryRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class CategoryApiController {

	private final CategoryRepository categoryRepository;

    @GetMapping("/categories")
    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryDto::from)
                .toList();
    }
}
