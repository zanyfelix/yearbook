package com.mbiz.yearbook.model;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContentsData {
    private Contents contentsInfo;        // Contents 엔티티 정보
    private List<YearbookSummary> yearbookPages; // 해당 Contents에 속한 Yearbook 페이지 목록
    private int savedPagesCount;
}