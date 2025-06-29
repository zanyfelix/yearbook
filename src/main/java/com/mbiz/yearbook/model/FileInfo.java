package com.mbiz.yearbook.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "file_info")
public class FileInfo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private LocalDateTime uploadedAt = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "photo_id")
    private Photo photo;
}