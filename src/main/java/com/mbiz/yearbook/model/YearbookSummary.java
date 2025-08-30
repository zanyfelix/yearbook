package com.mbiz.yearbook.model;

import java.util.Date;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class YearbookSummary {
    private Long id;
    private Long userId;
    private Long contentsId;
    private Integer pageNo;
    private String thumbnailPath;
    private Date lastSaved;
    private String subcategory;
}