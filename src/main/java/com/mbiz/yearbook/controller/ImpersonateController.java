package com.mbiz.yearbook.controller;

import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.ImpersonateConfig;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.AuditLogService;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class ImpersonateController {
    
    private static final Logger logger = LoggerFactory.getLogger(ImpersonateController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired(required = false)
    private AuditLogService auditLogService;
    
    @Autowired
    private ImpersonateConfig impersonateConfig;
    
    /**
     * 초기화 시 설정 검증 및 로그 출력
     */
    @PostConstruct
    public void init() {
        try {
            impersonateConfig.validate();
            logger.info("Impersonate Configuration Loaded: {}", impersonateConfig);
        } catch (Exception e) {
            logger.error("Invalid Impersonate Configuration: {}", e.getMessage());
        }
    }
    
    /**
     * 관리자가 사용자로 Impersonate 시작
     */
    @GetMapping("/impersonate")
    public String showImpersonateForm(@RequestParam Long userId, 
                                      HttpSession session, 
                                      Model model) {
        
        // 기능 활성화 확인
        if (!impersonateConfig.isEnabled()) {
            logger.warn("Impersonate attempt blocked - feature is disabled");
            model.addAttribute("error", "Impersonate feature is disabled");
            return "redirect:/admin/user";
        }
        
        // 관리자 권한 확인
        User adminUser = (User) session.getAttribute("loginUser");
        if (adminUser == null) {
            return "redirect:/login";
        }
        
        // 권한 확인 (설정된 역할만 허용)
        if (!impersonateConfig.canImpersonate(adminUser.getRole(), adminUser.getUserId())) {
            logger.warn("Impersonate attempt blocked - User {} with role {} is not authorized", 
                       adminUser.getUserId(), adminUser.getRole());
            model.addAttribute("error", "You are not authorized to use Impersonate feature");
            return "redirect:/admin/user";
        }
        
        // 대상 사용자 조회
        Optional<User> targetUserOpt = userRepository.findById(userId);
        if (!targetUserOpt.isPresent()) {
            logger.error("Target user not found: {}", userId);
            return "redirect:/admin/user";
        }
        
        User targetUser = targetUserOpt.get();
        
        // 제외된 사용자 확인
        if (impersonateConfig.getExcludedUsers().contains(targetUser.getUserId())) {
            logger.warn("Cannot impersonate excluded user: {}", targetUser.getUserId());
            model.addAttribute("error", "This user cannot be impersonated");
            return "redirect:/admin/user";
        }
        
        // 동시 세션 수 확인 (선택사항)
        int currentSessions = countActiveImpersonateSessions(session);
        if (currentSessions >= impersonateConfig.getMaxConcurrentSessions()) {
            logger.warn("Max concurrent impersonate sessions reached: {}", currentSessions);
            model.addAttribute("error", "Maximum concurrent impersonate sessions reached");
            return "redirect:/admin/user";
        }
        
        // 임시 토큰 생성
        String impersonateToken = UUID.randomUUID().toString();
        
        // 세션에 임시 토큰 저장
        session.setAttribute("impersonateToken_" + impersonateToken, targetUser);
        session.setAttribute("impersonateTokenTime_" + impersonateToken, System.currentTimeMillis());
        
        // 자동 로그인 폼 페이지로 이동
        model.addAttribute("token", impersonateToken);
        model.addAttribute("targetUser", targetUser);
        model.addAttribute("adminUser", adminUser);
        model.addAttribute("config", impersonateConfig);
        
        logger.info("Impersonate form shown - Admin: {}, Target: {}", 
                   adminUser.getUserId(), targetUser.getUserId());
        
        return "admin/impersonateForm";
    }
    
    /**
     * 팝업창에서 자동 로그인 처리
     */
    @PostMapping("/impersonate/login")
    public String processImpersonateLogin(@RequestParam String token,
                                          HttpServletRequest request,
                                          RedirectAttributes redirectAttributes) {
        
        HttpSession parentSession = request.getSession(false);
        if (parentSession == null) {
            return "redirect:/login";
        }
        
        // 토큰 검증
        User targetUser = (User) parentSession.getAttribute("impersonateToken_" + token);
        Long tokenTime = (Long) parentSession.getAttribute("impersonateTokenTime_" + token);
        
        if (targetUser == null || tokenTime == null) {
            logger.error("Invalid token: {}", token);
            redirectAttributes.addFlashAttribute("error", "Invalid or expired token");
            return "redirect:/login";
        }
        
        // 토큰 타임아웃 확인
        long timeoutMillis = impersonateConfig.getTokenTimeout() * 1000L;
        if (System.currentTimeMillis() - tokenTime > timeoutMillis) {
            parentSession.removeAttribute("impersonateToken_" + token);
            parentSession.removeAttribute("impersonateTokenTime_" + token);
            logger.warn("Token expired: {} (timeout: {} seconds)", 
                       token, impersonateConfig.getTokenTimeout());
            redirectAttributes.addFlashAttribute("error", "Token expired");
            return "redirect:/login";
        }
        
        // 원본 관리자 정보
        User adminUser = (User) parentSession.getAttribute("loginUser");
        
        // 새로운 세션 생성
        HttpSession newSession = request.getSession(true);
        
        // 세션 타임아웃 설정
        newSession.setMaxInactiveInterval(impersonateConfig.getSessionTimeout());
        
        // 사용자로 로그인 처리
        newSession.setAttribute("loginUser", targetUser);
        newSession.setAttribute("isImpersonating", true);
        newSession.setAttribute("originalAdmin", adminUser);
        newSession.setAttribute("impersonateStartTime", new Date());
        newSession.setAttribute("impersonatedUser", targetUser);
        newSession.setAttribute("impersonateConfig", impersonateConfig);
        
        // 토큰 정리
        parentSession.removeAttribute("impersonateToken_" + token);
        parentSession.removeAttribute("impersonateTokenTime_" + token);
        
        // 감사 로그 기록
        if (impersonateConfig.getAudit().isEnabled() && auditLogService != null) {
            auditLogService.logImpersonate(adminUser, targetUser, request.getRemoteAddr());
        }
        
        logger.info("Impersonate session started - Admin: {}, Target: {}, Timeout: {}s",
                   adminUser.getUserId(), targetUser.getUserId(), 
                   impersonateConfig.getSessionTimeout());
        
        // 사용자 홈으로 리다이렉트
        return "redirect:/home?id=" + targetUser.getId();
    }
    
    /**
     * Impersonate 종료
     */
    @GetMapping("/impersonate/stop")
    public String stopImpersonate(HttpSession session) {
        
        User originalAdmin = (User) session.getAttribute("originalAdmin");
        User impersonatedUser = (User) session.getAttribute("loginUser");
        
        if (originalAdmin != null && impersonatedUser != null) {
            // 감사 로그 기록
            if (impersonateConfig.getAudit().isEnabled() && auditLogService != null) {
                auditLogService.logImpersonateEnd(originalAdmin, impersonatedUser);
            }
            
            logger.info("Impersonate session ended - Admin: {}, Target: {}",
                       originalAdmin.getUserId(), impersonatedUser.getUserId());
        }
        
        // 세션 무효화
        session.invalidate();
        
        return "admin/closeWindow";
    }
    
    /**
     * 활성 Impersonate 세션 수 카운트 (간단한 구현)
     */
    private int countActiveImpersonateSessions(HttpSession session) {
        // 실제 구현에서는 Redis나 DB를 사용하여 전역적으로 관리
        // 여기서는 간단히 세션 속성으로 카운트
        Integer count = (Integer) session.getAttribute("impersonateSessionCount");
        return count != null ? count : 0;
    }
}