package com.mbiz.yearbook.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "category")
public class Category {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private LocalDateTime createdAt = LocalDateTime.now();
    
    private int pageLimit;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL)
    private List<Photo> photos = new ArrayList<>();
}