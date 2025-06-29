package com.mbiz.yearbook.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.mbiz.yearbook.service.FileInfoService;

import lombok.RequiredArgsConstructor;

@Controller
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileInfoController {

    private final FileInfoService fileInfoService;

    @GetMapping("/photo/{photoId}")
    public String listByPhoto(@PathVariable Long photoId, Model model) {
        model.addAttribute("files", fileInfoService.findByPhoto(photoId));
        return "file/list";
    }
}