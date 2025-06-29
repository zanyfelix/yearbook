package com.mbiz.yearbook.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sample")
@Getter
@Setter
@NoArgsConstructor
public class Sample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String description;

    private String imagePath;

    private String fileName;

    private LocalDateTime uploadedAt;

    private String uploadedBy;

    private String gubun;

    private Long size;

    private Integer width;

    private Integer height;
}
