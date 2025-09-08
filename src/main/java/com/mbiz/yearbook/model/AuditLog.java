package com.mbiz.yearbook.model;

import java.util.Date;

import jakarta.persistence.*;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "action", nullable = false, length = 50)
    private String action;
    
    @Column(name = "admin_id")
    private Long adminId;
    
    @Column(name = "admin_user_id", length = 100)
    private String adminUserId;
    
    @Column(name = "target_user_id")
    private Long targetUserId;
    
    @Column(name = "target_user_name", length = 100)
    private String targetUserName;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "timestamp", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp;
    
    @Column(name = "details", columnDefinition = "TEXT")
    private String details;
    
    // Constructors
    public AuditLog() {
        this.timestamp = new Date();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getAction() {
        return action;
    }
    
    public void setAction(String action) {
        this.action = action;
    }
    
    public Long getAdminId() {
        return adminId;
    }
    
    public void setAdminId(Long adminId) {
        this.adminId = adminId;
    }
    
    public String getAdminUserId() {
        return adminUserId;
    }
    
    public void setAdminUserId(String adminUserId) {
        this.adminUserId = adminUserId;
    }
    
    public Long getTargetUserId() {
        return targetUserId;
    }
    
    public void setTargetUserId(Long targetUserId) {
        this.targetUserId = targetUserId;
    }
    
    public String getTargetUserName() {
        return targetUserName;
    }
    
    public void setTargetUserName(String targetUserName) {
        this.targetUserName = targetUserName;
    }
    
    public String getIpAddress() {
        return ipAddress;
    }
    
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
    
    public Date getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getDetails() {
        return details;
    }
    
    public void setDetails(String details) {
        this.details = details;
    }
}