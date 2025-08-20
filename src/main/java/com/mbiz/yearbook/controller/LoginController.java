package com.mbiz.yearbook.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
public class LoginController {

	private final UserService userService;

	public LoginController(UserService userService) {
		this.userService = userService;
	}

	@GetMapping("/")
	public String redirectToLogin() {
		return "redirect:/login";
	}

	@GetMapping("/login")
	public String loginForm() {
		return "login"; // login.jsp
	}

	@PostMapping("/login")
	public String login(@RequestParam String userId, @RequestParam String password, HttpSession session, Model model) {

		try {
			User user = userService.login(userId, password.toLowerCase());
			session.setAttribute("loginUser", user);
			if ("ADMIN".equalsIgnoreCase(user.getRole())) {
				return "redirect:/admin/user?id=" + user.getId(); // 관리자 전용 페이지
			} else {
				return "redirect:/home?id=" + user.getId(); // 일반 사용자
			}
		} catch (Exception e) {
			model.addAttribute("error", e.getMessage());
			return "login";
		}
	}

	@PostMapping("/logout")
	public String logout(HttpSession session) {
		session.invalidate();
		return "redirect:/login";
	}
}