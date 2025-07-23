package com.mbiz.yearbook.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter
@NoArgsConstructor
public class Yearbook extends BaseTimeEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "subcategory_id")
    private Subcategory subcategory;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private int pageNo;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private boolean submitted;

    private LocalDateTime lastSaved;

    @OneToMany(mappedBy = "yearbook", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Photo> photos = new ArrayList<>();
}
