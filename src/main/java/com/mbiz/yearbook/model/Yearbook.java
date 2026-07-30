package com.mbiz.yearbook.model;

import java.util.Date;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Yearbook extends BaseTimeEntity {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "contents_id")
    private Long contentsId;

    @Column(name = "page_no")
    private int pageNo;

    @Column(name = "thumbnail_path")
    private String thumbnailPath;

    @Column(name = "design_data", columnDefinition = "LONGTEXT")
    private String designData;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "last_saved")
    private Date lastSaved;
    
    @Column(name = "subcategory")
    private String subcategory;

    // 레거시 SafeFit 데이터가 있는 운영 DB와의 스키마 호환을 위해 유지한다.
    @JsonIgnore
    @Column(name = "backup_design_data", columnDefinition = "LONGTEXT")
    private String backupDesignData;
}
