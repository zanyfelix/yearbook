package com.mbiz.yearbook.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MainController {
	
	@GetMapping("/hi")
	public String main(Model model) {
		
		model.addAttribute("username","홍팍");
		return "greetings";
	}
}
