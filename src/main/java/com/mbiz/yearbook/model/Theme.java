package com.mbiz.yearbook.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter
@NoArgsConstructor
public class Theme extends BaseTimeEntity {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
	
	@Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String path;  // ex) "backgrounds/bg1.jpg"
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "modified_at", nullable = false)
    private LocalDateTime updatedAt;
}
