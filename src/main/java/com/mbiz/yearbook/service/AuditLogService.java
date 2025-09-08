package com.mbiz.yearbook.service;

import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.AuditLog;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.AuditLogRepository;

@Service
public class AuditLogService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);
    
    @Autowired
    private AuditLogRepository auditLogRepository;
    
    /**
     * Impersonate 시작 로그
     */
    public void logImpersonate(User admin, User targetUser, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setAction("IMPERSONATE_START");
        log.setAdminId(admin.getId());
        log.setAdminUserId(admin.getUserId());
        log.setTargetUserId(targetUser.getId());
        log.setTargetUserName(targetUser.getUserId());
        log.setIpAddress(ipAddress);
        log.setTimestamp(new Date());
        log.setDetails(String.format("Admin [%s] started impersonating user [%s]", 
                                    admin.getUserId(), targetUser.getUserId()));
        
        auditLogRepository.save(log);
        
        logger.warn("IMPERSONATE START: Admin [{}] is now impersonating user [{}] from IP [{}]", 
                   admin.getUserId(), targetUser.getUserId(), ipAddress);
    }
    
    /**
     * Impersonate 종료 로그
     */
    public void logImpersonateEnd(User admin, User targetUser) {
        AuditLog log = new AuditLog();
        log.setAction("IMPERSONATE_END");
        log.setAdminId(admin.getId());
        log.setAdminUserId(admin.getUserId());
        log.setTargetUserId(targetUser.getId());
        log.setTargetUserName(targetUser.getUserId());
        log.setTimestamp(new Date());
        log.setDetails(String.format("Admin [%s] stopped impersonating user [%s]", 
                                    admin.getUserId(), targetUser.getUserId()));
        
        auditLogRepository.save(log);
        
        logger.info("IMPERSONATE END: Admin [{}] stopped impersonating user [{}]", 
                   admin.getUserId(), targetUser.getUserId());
    }
    
    /**
     * Impersonate 중 주요 작업 로그
     */
    public void logImpersonateAction(User admin, User targetUser, String action, String details) {
        AuditLog log = new AuditLog();
        log.setAction("IMPERSONATE_ACTION");
        log.setAdminId(admin.getId());
        log.setAdminUserId(admin.getUserId());
        log.setTargetUserId(targetUser.getId());
        log.setTargetUserName(targetUser.getUserId());
        log.setTimestamp(new Date());
        log.setDetails(String.format("Admin [%s] as user [%s]: %s - %s", 
                                    admin.getUserId(), targetUser.getUserId(), action, details));
        
        auditLogRepository.save(log);
        
        logger.info("IMPERSONATE ACTION: Admin [{}] as user [{}] performed: {} - {}", 
                   admin.getUserId(), targetUser.getUserId(), action, details);
    }
}