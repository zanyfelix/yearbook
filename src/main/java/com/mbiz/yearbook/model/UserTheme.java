package com.mbiz.yearbook.model;

import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter
@NoArgsConstructor
public class UserTheme extends BaseTimeEntity {

	@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 원시 ID 필드: 조회 전용으로만 사용 */
    @Column(name = "theme_id", nullable = false, insertable = false, updatable = false)
    private Long themeId;

    /** 실제 객체 연관관계 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "theme_id", nullable = false)
    private Theme theme;

    @Column(nullable = false)
    private String category;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    private List<Long> themeIds;
    
}
