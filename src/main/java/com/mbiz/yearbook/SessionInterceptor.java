package com.mbiz.yearbook;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class SessionInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
			throws Exception {
		String requestURI = request.getRequestURI();
		String contextPath = request.getContextPath();
		String normalizedPath = requestURI;
		if (contextPath != null && !contextPath.isBlank() && requestURI.startsWith(contextPath)) {
			normalizedPath = requestURI.substring(contextPath.length());
		}

		if (normalizedPath.equals("/login")
				|| normalizedPath.equals("/")
				|| normalizedPath.startsWith("/render/browser/")
				|| normalizedPath.startsWith("/css/")
				|| normalizedPath.startsWith("/js/")
				|| normalizedPath.startsWith("/images/")
				|| normalizedPath.startsWith("/thumbnail/")
				|| normalizedPath.startsWith("/theme/")
				|| normalizedPath.startsWith("/upload/")
				|| normalizedPath.startsWith("/photo/")
				|| normalizedPath.equals("/payment")
				|| normalizedPath.startsWith("/static/")) {
			return true;
		}

		HttpSession session = request.getSession(false);
		if (session == null || session.getAttribute("loginUser") == null) {
			String ajaxHeader = request.getHeader("X-Requested-With");
			if ("XMLHttpRequest".equals(ajaxHeader)) {
				response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				response.setContentType("application/json;charset=UTF-8");
				response.getWriter().write("{\"error\":\"SESSION_EXPIRED\",\"message\":\"Session expired. Please log in again.\"}");
				return false;
			}

			response.sendRedirect(request.getContextPath() + "/login?expired=true");
			return false;
		}

		return true;
	}
}
