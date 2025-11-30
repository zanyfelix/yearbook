package com.mbiz.yearbook;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class SessionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestURI = request.getRequestURI();
        
        // 로그인 페이지, CSS, JS, 이미지 파일 등은 세션 체크 제외
        if (requestURI.equals("/login") || 
            requestURI.equals("/") || 
            requestURI.startsWith("/css/") || 
            requestURI.startsWith("/js/") || 
            requestURI.startsWith("/images/") ||
            requestURI.equals("/payment") ||
            requestURI.startsWith("/static/")) {
            return true;
        }

        HttpSession session = request.getSession(false);
        
        // 세션이 없거나 로그인 사용자 정보가 없으면 로그인 페이지로 리다이렉트
        if (session == null || session.getAttribute("loginUser") == null) {
            // AJAX 요청인지 확인
            String ajaxHeader = request.getHeader("X-Requested-With");
            if ("XMLHttpRequest".equals(ajaxHeader)) {
                // AJAX 요청의 경우 JSON 응답
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"error\":\"SESSION_EXPIRED\",\"message\":\"세션이 만료되었습니다. 다시 로그인해주세요.\"}");
                return false;
            } else {
                // 일반 요청의 경우 로그인 페이지로 리다이렉트
                response.sendRedirect(request.getContextPath() + "/login?expired=true");
                return false;
            }
        }
        
        return true;
    }
}