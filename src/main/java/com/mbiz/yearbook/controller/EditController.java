package com.mbiz.yearbook.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.service.ContentsService;
import com.mbiz.yearbook.service.ThemeService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EditController {

    @Autowired
    private ContentsService contentsService;
    
    @Autowired
    private ThemeService themeService;

    @GetMapping("/edit")
    public String editMain(HttpSession session, @RequestParam Long id, Model model) {
		User loginUser = (User) session.getAttribute("user");
		model.addAttribute("loginUser", loginUser);
		
		List<Contents> list = contentsService.findByUserId(id);
        model.addAttribute("list", list);
        
        return "edit";
    }
    
    @PostMapping("/edit/background")
    @ResponseBody
    public List<UserTheme> backgroundList(@RequestBody Map<String, Object> param) {
    	Long id = Long.parseLong(param.get("id").toString());
        String category = (String) param.get("category");
        return themeService.findByUserIdAndCategory(id, category);
    }

//    @PostMapping
//    public String create(@ModelAttribute Category category) {
//        categoryService.save(category);
//        return "redirect:/categories";
//    }
}