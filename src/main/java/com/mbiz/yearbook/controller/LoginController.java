package com.mbiz.yearbook.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.exception.InvalidPasswordException;
import com.mbiz.yearbook.exception.UserNotFoundException;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
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
		} catch (UserNotFoundException e) { // 아이디가 없을 때 처리
			model.addAttribute("error", "No user found");
			return "login";
		} catch (InvalidPasswordException e) { // 비밀번호가 틀렸을 때 처리
			model.addAttribute("error", "Please check the password");
			return "login";
		} catch (Exception e) { // 그 외 모든 예외 처리
			model.addAttribute("error", "An unexpected error occurred.");
			return "login";
		}
	}

	@GetMapping("/logout")
	public String logoutGet(HttpSession session, HttpServletRequest request) {

		if (Boolean.TRUE.equals(session.getAttribute("isImpersonating"))) {
			User adminBackup = (User) session.getAttribute("adminBackup");
			Long selectedUserId = (Long) session.getAttribute("selectedUserId");

			if (adminBackup != null) {
				session.setAttribute("loginUser", adminBackup);
				session.removeAttribute("isImpersonating");
				session.removeAttribute("selectedUserId");

				// ✅ 선택했던 사용자 화면으로 복귀
				if (selectedUserId != null) {
					return "redirect:/admin/home?userId=" + selectedUserId;
				}
			}
		}

		session.invalidate();
		return "redirect:/login";
	}

	@PostMapping("/logout")
	public String logout(HttpSession session) {
		session.invalidate();
		return "redirect:/login";
	}
}