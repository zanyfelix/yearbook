package com.mbiz.yearbook.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Transient;
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
    private String editPath;
    
    @Column(nullable = false)
    private String editMaskPath;
    
    @Column(nullable = false)
    private String thumbnailPath;
    
    @Column(nullable = false)
    private String originalPath;
    
    @Column(nullable = false)
    private String originalMaskPath;
    
    @Column(name = "parent_id")
    private Long parentId;
    
    @Column(name = "edit_width")
    private int editWidth;
    
    @Column(name = "edit_height")
    private int editHeight;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "modified_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "font_path")
    private String fontPath;
    
    @Column(name = "gubun")
    private String gubun;
    
    @Column(name = "theme_no")
    private Long themeNo;
}
