package com.mbiz.yearbook;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.service.AuditLogService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Aspect
@Component
public class ImpersonateLoggingAspect {
    
    @Autowired
    private AuditLogService auditLogService;
    
    /**
     * 사용자 컨트롤러의 모든 메소드를 포인트컷으로 정의
     */
    @Pointcut("@within(org.springframework.stereotype.Controller) && " +
              "(execution(* com.mbiz.yearbook.controller.HomeController.*(..)) || " +
              "execution(* com.mbiz.yearbook.controller.EditController.*(..)) || " +
              "execution(* com.mbiz.yearbook.controller.ProgressController.*(..)) || " +
              "execution(* com.mbiz.yearbook.controller.SubmitController.*(..)))")
    public void userControllerMethods() {}
    
    /**
     * POST 요청만 대상으로 하는 포인트컷
     */
    @Pointcut("@annotation(org.springframework.web.bind.annotation.PostMapping)")
    public void postMappingMethods() {}
    
    /**
     * Impersonate 모드에서 사용자 액션 로깅
     */
    @AfterReturning(pointcut = "userControllerMethods() && postMappingMethods()", 
                    returning = "result")
    public void logImpersonateAction(JoinPoint joinPoint, Object result) {
        HttpServletRequest request = ((ServletRequestAttributes) 
            RequestContextHolder.currentRequestAttributes()).getRequest();
        HttpSession session = request.getSession();
        
        // Impersonate 모드인지 확인
        Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
        if (!Boolean.TRUE.equals(isImpersonating)) {
            return; // Impersonate 모드가 아니면 로깅하지 않음
        }
        
        User originalAdmin = (User) session.getAttribute("originalAdmin");
        User impersonatedUser = (User) session.getAttribute("loginUser");
        
        if (originalAdmin != null && impersonatedUser != null) {
            String methodName = joinPoint.getSignature().getName();
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String action = className + "." + methodName;
            
            // 요청 파라미터 정보 수집
            StringBuilder details = new StringBuilder();
            details.append("Method: ").append(action);
            details.append(", URI: ").append(request.getRequestURI());
            
            if (request.getQueryString() != null) {
                details.append(", Query: ").append(request.getQueryString());
            }
            
            // 주요 파라미터 로깅 (민감한 정보 제외)
            Object[] args = joinPoint.getArgs();
            if (args != null && args.length > 0) {
                details.append(", Args: [");
                for (int i = 0; i < args.length && i < 3; i++) { // 최대 3개 파라미터만
                    if (args[i] != null && 
                        !(args[i] instanceof HttpSession) && 
                        !(args[i] instanceof HttpServletRequest)) {
                        details.append(args[i].getClass().getSimpleName()).append(" ");
                    }
                }
                details.append("]");
            }
            
            // 감사 로그 기록
            auditLogService.logImpersonateAction(
                originalAdmin, 
                impersonatedUser, 
                action, 
                details.toString()
            );
        }
    }
    
    /**
     * 파일 다운로드 액션 로깅
     */
    @Before("execution(* com.mbiz.yearbook.controller.*Controller.*download*(..))")
    public void logDownloadAction(JoinPoint joinPoint) {
        HttpServletRequest request = ((ServletRequestAttributes) 
            RequestContextHolder.currentRequestAttributes()).getRequest();
        HttpSession session = request.getSession();
        
        Boolean isImpersonating = (Boolean) session.getAttribute("isImpersonating");
        if (!Boolean.TRUE.equals(isImpersonating)) {
            return;
        }
        
        User originalAdmin = (User) session.getAttribute("originalAdmin");
        User impersonatedUser = (User) session.getAttribute("loginUser");
        
        if (originalAdmin != null && impersonatedUser != null) {
            String methodName = joinPoint.getSignature().getName();
            String details = "File download: " + methodName + 
                           ", URI: " + request.getRequestURI();
            
            auditLogService.logImpersonateAction(
                originalAdmin, 
                impersonatedUser, 
                "FILE_DOWNLOAD", 
                details
            );
        }
    }
}