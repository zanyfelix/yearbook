package com.mbiz.yearbook.repository;

import java.util.Date;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.AuditLog;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    // 특정 관리자의 Impersonate 로그 조회
    List<AuditLog> findByAdminIdOrderByTimestampDesc(Long adminId);
    
    // 특정 사용자가 Impersonate된 로그 조회
    List<AuditLog> findByTargetUserIdOrderByTimestampDesc(Long targetUserId);
    
    // 특정 기간의 Impersonate 로그 조회
    @Query("SELECT a FROM AuditLog a WHERE a.action LIKE 'IMPERSONATE%' " +
           "AND a.timestamp BETWEEN :startDate AND :endDate " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findImpersonateLogsBetween(@Param("startDate") Date startDate, 
                                              @Param("endDate") Date endDate);
    
    // 특정 액션 타입별 로그 조회
    List<AuditLog> findByActionOrderByTimestampDesc(String action);
    
    // 현재 활성 Impersonate 세션 조회 (시작은 있지만 종료가 없는 경우)
    @Query("SELECT a FROM AuditLog a WHERE a.action = 'IMPERSONATE_START' " +
           "AND a.adminId = :adminId " +
           "AND NOT EXISTS (SELECT 1 FROM AuditLog a2 " +
           "WHERE a2.action = 'IMPERSONATE_END' " +
           "AND a2.adminId = a.adminId " +
           "AND a2.targetUserId = a.targetUserId " +
           "AND a2.timestamp > a.timestamp) " +
           "ORDER BY a.timestamp DESC")
    List<AuditLog> findActiveImpersonateSessions(@Param("adminId") Long adminId);
}