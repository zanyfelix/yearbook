package com.mbiz.yearbook.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.format.annotation.DateTimeFormat;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String userId;  // ex: daegu_es

    @Column(nullable = false, unique = true, length = 50)
    private String name;  // ex: daegu_es

    @Column(nullable = false, length = 100)
    private String schoolName;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private boolean active = true;
    
    @Column(nullable = false)
    private String role;
    
    @Column(nullable = false)
    private String mail;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "modified_at", nullable = false)
    private LocalDateTime modifiedAt;
    
    @Column(nullable = true)
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private Date deadline;
    
    @Column(name = "file_name")
    private String fileName;
    
    @Column(name = "submit_file_path")
    private String submitFilePath;
    
    @Column(name = "download")
    private Long download;
    
    @Column(name = "submitted")
    private boolean submitted = false;
    
}