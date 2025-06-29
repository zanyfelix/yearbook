package com.mbiz.yearbook.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "yearbook_pages")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YearbookPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private int pageNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String backgroundPath;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String framesJson;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String textsJson;

    private boolean submitted = false;

    private LocalDateTime lastSaved;
    
    private String thumbnailUrl;
}