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
	
	@Column(nullable = true)
    private String filename;

    @Column(nullable = true)
    private String category;

    @Column(nullable = true)
    private String editPath;
    
    @Column(nullable = true)
    private String editMaskPath;
    
    @Column(nullable = true)
    private String thumbnailPath;
    
    @Column(nullable = true)
    private String originalPath;
    
    @Column(nullable = true)
    private String originalMaskPath;
    
    @Column(name = "parent_id")
    private Long parentId;
    
    @Column(name = "edit_width")
    private Integer editWidth;
    
    @Column(name = "edit_height")
    private Integer editHeight;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = true, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "modified_at", nullable = true)
    private LocalDateTime updatedAt;
    
    @Column(name = "font_path" , nullable = true)
    private String fontPath;
    
    @Column(name = "gubun" , nullable = true)
    private String gubun;
    
    @Column(name = "theme_no" , nullable = true)
    private Long themeNo;
}
