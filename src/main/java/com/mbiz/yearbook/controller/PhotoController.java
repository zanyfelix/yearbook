package com.mbiz.yearbook.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.Category;
import com.mbiz.yearbook.model.Photo;
import com.mbiz.yearbook.service.CategoryService;
import com.mbiz.yearbook.service.PhotoService;

import lombok.RequiredArgsConstructor;

@Controller
@RequestMapping("/photos")
@RequiredArgsConstructor
public class PhotoController {

    private final PhotoService photoService;
    private final CategoryService categoryService;

    @GetMapping("/category/{categoryId}")
    public String listByCategory(@PathVariable Long categoryId, Model model) {
        model.addAttribute("photos", photoService.findByCategory(categoryId));
        model.addAttribute("category", categoryService.findById(categoryId));
        return "photo/list";
    }

    @PostMapping
    public String create(@RequestParam Long categoryId, @ModelAttribute Photo photo) {
        Category category = categoryService.findById(categoryId);
        if (category == null) {
            throw new IllegalArgumentException("Invalid categoryId");
        }
        photo.setCategory(category);
        photoService.save(photo);
        return "redirect:/photos/category/" + categoryId;
    }
}