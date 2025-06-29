package com.mbiz.yearbook.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageEditDto {
    private Long pageId;
    private String backgroundPath;
    private String framesJson;
    private String textsJson;
}