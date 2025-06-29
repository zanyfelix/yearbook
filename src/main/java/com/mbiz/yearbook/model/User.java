package com.mbiz.yearbook.model;

import java.util.ArrayList;
import java.util.List;

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
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;  // ex: daegu_es

    @Column(nullable = false, length = 100)
    private String schoolName;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private boolean active = true;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<YearbookPage> yearbookPages = new ArrayList<>();
}