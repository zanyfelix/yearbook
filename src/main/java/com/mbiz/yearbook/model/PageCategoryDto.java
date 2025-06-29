package com.mbiz.yearbook.model;

import java.util.List;

public class PageCategoryDto {
    private String name;              // 예: Group Photo_UPK
    private int limit;               // 총 허용 페이지 수
    private List<YearbookPage> pages;
}