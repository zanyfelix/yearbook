package com.mbiz.yearbook;

import java.util.Arrays;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Impersonate 기능 설정을 관리하는 Configuration 클래스
 */
@Configuration
@ConfigurationProperties(prefix = "impersonate")
public class ImpersonateConfig {
    
    private boolean enabled = false;
    private int tokenTimeout = 30; // 초
    private int sessionTimeout = 1800; // 초 (30분)
    private Audit audit = new Audit();
    private int maxConcurrentSessions = 5;
    private List<String> allowedRoles = Arrays.asList("ADMIN");
    private List<String> excludedUsers = Arrays.asList();
    private String logLevel = "INFO";
    
    // Getters and Setters
    public boolean isEnabled() {
        return enabled;
    }
    
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
    
    public int getTokenTimeout() {
        return tokenTimeout;
    }
    
    public void setTokenTimeout(int tokenTimeout) {
        this.tokenTimeout = tokenTimeout;
    }
    
    public int getSessionTimeout() {
        return sessionTimeout;
    }
    
    public void setSessionTimeout(int sessionTimeout) {
        this.sessionTimeout = sessionTimeout;
    }
    
    public Audit getAudit() {
        return audit;
    }
    
    public void setAudit(Audit audit) {
        this.audit = audit;
    }
    
    public int getMaxConcurrentSessions() {
        return maxConcurrentSessions;
    }
    
    public void setMaxConcurrentSessions(int maxConcurrentSessions) {
        this.maxConcurrentSessions = maxConcurrentSessions;
    }
    
    public List<String> getAllowedRoles() {
        return allowedRoles;
    }
    
    public void setAllowedRoles(List<String> allowedRoles) {
        this.allowedRoles = allowedRoles;
    }
    
    public List<String> getExcludedUsers() {
        return excludedUsers;
    }
    
    public void setExcludedUsers(List<String> excludedUsers) {
        this.excludedUsers = excludedUsers;
    }
    
    public String getLogLevel() {
        return logLevel;
    }
    
    public void setLogLevel(String logLevel) {
        this.logLevel = logLevel;
    }
    
    /**
     * 감사 로그 관련 설정
     */
    public static class Audit {
        private boolean enabled = false;
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
    
    /**
     * 설정 검증
     */
    public void validate() {
        if (tokenTimeout < 10 || tokenTimeout > 300) {
            throw new IllegalArgumentException(
                "Token timeout must be between 10 and 300 seconds");
        }
        
        if (sessionTimeout < 60 || sessionTimeout > 7200) {
            throw new IllegalArgumentException(
                "Session timeout must be between 60 and 7200 seconds (1 minute to 2 hours)");
        }
        
        if (maxConcurrentSessions < 1 || maxConcurrentSessions > 20) {
            throw new IllegalArgumentException(
                "Max concurrent sessions must be between 1 and 20");
        }
    }
    
    /**
     * 사용자가 Impersonate 가능한지 확인
     */
    public boolean canImpersonate(String userRole, String userId) {
        // 역할 확인
        if (!allowedRoles.contains(userRole.toUpperCase())) {
            return false;
        }
        
        // 제외된 사용자 확인
        if (excludedUsers.contains(userId)) {
            return false;
        }
        
        return enabled;
    }
    
    @Override
    public String toString() {
        return "ImpersonateConfig{" +
                "enabled=" + enabled +
                ", tokenTimeout=" + tokenTimeout +
                ", sessionTimeout=" + sessionTimeout +
                ", auditEnabled=" + audit.isEnabled() +
                ", maxConcurrentSessions=" + maxConcurrentSessions +
                ", allowedRoles=" + allowedRoles +
                ", excludedUsers=" + excludedUsers +
                ", logLevel='" + logLevel + '\'' +
                '}';
    }
}