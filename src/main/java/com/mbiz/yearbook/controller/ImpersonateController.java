package com.mbiz.yearbook.controller;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
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
import org.springframework.web.bind.annotation.ResponseBody;
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
        
        User currentUser = (User) session.getAttribute("loginUser");
        
        // ★★★ 수정 1: Impersonate 중이면 관리자 복원 (위치 변경) ★★★
        if (Boolean.TRUE.equals(session.getAttribute("isImpersonating"))) {
            User adminBackup = (User) session.getAttribute("adminBackup");
            if (adminBackup != null) {
                session.setAttribute("loginUser", adminBackup);
                session.removeAttribute("isImpersonating");
                currentUser = adminBackup;
                logger.info("Admin restored from backup: {}", adminBackup.getUserId());
            }
        }
        
        // 관리자 권한 확인
        if (currentUser == null || !"admin".equalsIgnoreCase(currentUser.getRole())) {
            logger.warn("Not admin user, redirecting. Current user: {}", 
                       currentUser != null ? currentUser.getUserId() : "null");
            return "redirect:/login";
        }
        
        // 권한 확인 (설정된 역할만 허용)
        if (!impersonateConfig.canImpersonate(currentUser.getRole(), currentUser.getUserId())) {
            logger.warn("Impersonate attempt blocked - User {} with role {} is not authorized", 
                       currentUser.getUserId(), currentUser.getRole());
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
        model.addAttribute("adminUser", currentUser);
        model.addAttribute("config", impersonateConfig);
        
        logger.info("Impersonate form shown - Admin: {}, Target: {}", 
                   currentUser.getUserId(), targetUser.getUserId());
        
        return "admin/impersonateForm";
    }
    
    /**
     * 팝업창에서 자동 로그인 처리
     */
    @PostMapping("/impersonate/login")
    public String processImpersonateLogin(@RequestParam String token,
                                          HttpServletRequest request,
                                          RedirectAttributes redirectAttributes) {
        
        // ★★★ 수정 2: 기존 세션 사용 (새 세션 생성하지 않음) ★★★
        HttpSession session = request.getSession();  // getSession(true) 대신 getSession() 사용
        
        // 토큰 검증
        User targetUser = (User) session.getAttribute("impersonateToken_" + token);
        Long tokenTime = (Long) session.getAttribute("impersonateTokenTime_" + token);
        
        if (targetUser == null || tokenTime == null) {
            logger.error("Invalid token: {}", token);
            redirectAttributes.addFlashAttribute("error", "Invalid or expired token");
            return "redirect:/login";
        }
        
        //선택한 사용자 ID 저장
        session.setAttribute("selectedUserId", targetUser.getId());
        
        // 토큰 타임아웃 확인
        long timeoutMillis = impersonateConfig.getTokenTimeout() * 1000L;
        if (System.currentTimeMillis() - tokenTime > timeoutMillis) {
            session.removeAttribute("impersonateToken_" + token);
            session.removeAttribute("impersonateTokenTime_" + token);
            logger.warn("Token expired: {} (timeout: {} seconds)", 
                       token, impersonateConfig.getTokenTimeout());
            redirectAttributes.addFlashAttribute("error", "Token expired");
            return "redirect:/login";
        }
        
        // 현재 로그인 사용자 (관리자)
        User currentUser = (User) session.getAttribute("loginUser");
        
        // ★★★ 수정 3: 관리자 백업 (중요!) ★★★
        if (!Boolean.TRUE.equals(session.getAttribute("isImpersonating"))) {
            session.setAttribute("adminBackup", currentUser);
            logger.info("Admin backup saved: {}", currentUser.getUserId());
        }
        
        // 세션 타임아웃 설정
        session.setMaxInactiveInterval(impersonateConfig.getSessionTimeout());
        
        // 사용자로 로그인 처리
        session.setAttribute("loginUser", targetUser);
        session.setAttribute("isImpersonating", Boolean.TRUE);  // Boolean 객체 사용
        session.setAttribute("originalAdmin", currentUser);  // 호환성을 위해 유지
        session.setAttribute("impersonateStartTime", new Date());
        session.setAttribute("impersonatedUser", targetUser);
        session.setAttribute("impersonateConfig", impersonateConfig);
        
        // 토큰 정리
        session.removeAttribute("impersonateToken_" + token);
        session.removeAttribute("impersonateTokenTime_" + token);
        
        // 감사 로그 기록
        if (impersonateConfig.getAudit().isEnabled() && auditLogService != null) {
            auditLogService.logImpersonate(currentUser, targetUser, request.getRemoteAddr());
        }
        
        logger.info("Impersonate session started - Admin: {}, Target: {}, Timeout: {}s",
                   currentUser.getUserId(), targetUser.getUserId(), 
                   impersonateConfig.getSessionTimeout());
        
        // 사용자 홈으로 리다이렉트
        return "redirect:/home?id=" + targetUser.getId();
    }
    
    /**
     * Impersonate 종료 (팝업창 닫을 때)
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
        
        // ★★★ 수정 4: 세션 무효화 대신 관리자 복원 ★★★
        User adminBackup = (User) session.getAttribute("adminBackup");
        if (adminBackup != null) {
            session.setAttribute("loginUser", adminBackup);
            session.removeAttribute("isImpersonating");
            session.removeAttribute("originalAdmin");
            session.removeAttribute("impersonatedUser");
            session.removeAttribute("impersonateStartTime");
            logger.info("Admin session restored on stop: {}", adminBackup.getUserId());
        } else {
            // 백업이 없으면 세션 무효화
            session.invalidate();
        }
        
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
    
    /**
     * 관리자 세션 복원 (팝업창 닫을 때 호출)
     */
    @GetMapping("/impersonate/restore")
    @ResponseBody
    public Map<String, Object> restoreAdminSession(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Impersonate 중인지 확인
            if (Boolean.TRUE.equals(session.getAttribute("isImpersonating"))) {
                // 백업된 관리자 정보 복원
                User adminBackup = (User) session.getAttribute("adminBackup");
                
                if (adminBackup != null) {
                    // 관리자로 복원
                    session.setAttribute("loginUser", adminBackup);
                    session.removeAttribute("isImpersonating");
                    session.removeAttribute("originalAdmin");
                    session.removeAttribute("impersonatedUser");
                    session.removeAttribute("impersonateStartTime");
                    // adminBackup은 유지 (다음 Impersonate를 위해)
                    
                    response.put("success", true);
                    response.put("message", "Admin session restored");
                    response.put("adminId", adminBackup.getUserId());
                    
                    logger.info("Admin session restored via restore endpoint: {}", adminBackup.getUserId());
                } else {
                    response.put("success", false);
                    response.put("message", "No admin backup found");
                }
            } else {
                response.put("success", false);
                response.put("message", "Not in impersonate mode");
            }
            
            // 현재 사용자 정보 추가
            User currentUser = (User) session.getAttribute("loginUser");
            response.put("currentUser", currentUser != null ? currentUser.getUserId() : "null");
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            logger.error("Error restoring admin session", e);
        }
        
        return response;
    }
}