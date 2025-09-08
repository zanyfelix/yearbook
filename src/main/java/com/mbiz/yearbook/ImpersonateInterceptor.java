package com.mbiz.yearbook;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import com.mbiz.yearbook.model.User;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class ImpersonateInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) 
            throws Exception {
        
        HttpSession session = request.getSession();
        Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
        
        // Impersonate 모드일 때만 처리
        if (Boolean.TRUE.equals(isImpersonating)) {
            User impersonatedUser = (User) session.getAttribute("impersonatedUser");
            
            if (impersonatedUser != null) {
                // 현재 loginUser를 백업 (이미 백업되어 있지 않은 경우에만)
                if (session.getAttribute("originalLoginUser") == null) {
                    User currentLoginUser = (User) session.getAttribute("loginUser");
                    if (currentLoginUser != null && !currentLoginUser.getId().equals(impersonatedUser.getId())) {
                        session.setAttribute("originalLoginUser", currentLoginUser);
                    }
                }
                
                // impersonatedUser를 loginUser로 설정
                session.setAttribute("loginUser", impersonatedUser);
                
                // 디버그 로깅
                System.out.println("[IMPERSONATE] Request: " + request.getRequestURI() + 
                                 " | User: " + impersonatedUser.getUserId());
            }
        }
        
        return true;
    }
    
    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
                          ModelAndView modelAndView) throws Exception {
        
        HttpSession session = request.getSession();
        Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
        
        // Impersonate 모드일 때 View에 정보 추가
        if (Boolean.TRUE.equals(isImpersonating) && modelAndView != null) {
            modelAndView.addObject("isImpersonating", true);
            modelAndView.addObject("originalAdmin", session.getAttribute("originalAdmin"));
            modelAndView.addObject("impersonateStartTime", session.getAttribute("impersonateStartTime"));
        }
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, 
                               Object handler, Exception ex) throws Exception {
        
        HttpSession session = request.getSession();
        Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
        
        // Impersonate 모드일 때 원래 loginUser 복원
        if (Boolean.TRUE.equals(isImpersonating)) {
            User originalLoginUser = (User) session.getAttribute("originalLoginUser");
            
            // 원래 세션이 있었다면 복원
            if (originalLoginUser != null) {
                session.setAttribute("loginUser", originalLoginUser);
                session.removeAttribute("originalLoginUser");
            }
        }
    }
}