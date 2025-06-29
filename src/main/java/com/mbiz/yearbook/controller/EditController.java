package com.mbiz.yearbook.controller;

import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import com.mbiz.yearbook.model.Category;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.CategoryService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EditController {

    private final CategoryService categoryService;

//    //편집 메인화면
//    @GetMapping("/edit")
//    public String editMain(HttpSession session, Model model) {
//		User user = (User) session.getAttribute("user");
//		if (user == null) {
//			return "redirect:/login";
//		}
//		model.addAttribute("user", user);
//		
//		List<Category> categories = categoryService.getAllCategories();
//        model.addAttribute("categories", categories);
//        return "userMain";
//    }

    @PostMapping
    public String create(@ModelAttribute Category category) {
        categoryService.save(category);
        return "redirect:/categories";
    }
}