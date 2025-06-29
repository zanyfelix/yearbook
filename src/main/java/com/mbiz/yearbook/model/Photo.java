package com.mbiz.yearbook.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "photo")
public class Photo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String description;
    private String uploadedBy;
    private LocalDateTime uploadedAt = LocalDateTime.now();
    
    private String imagePath;
    
    private String gubun;
    private long size;
    private Integer width;
    private Integer height;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany(mappedBy = "photo", cascade = CascadeType.ALL)
    private List<FileInfo> files = new ArrayList<>();
}