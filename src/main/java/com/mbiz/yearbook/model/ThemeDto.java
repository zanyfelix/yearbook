package com.mbiz.yearbook.model;

public class ThemeDto {
    private Long id;
    private Long themeNo;

    public ThemeDto(Long id, Long themeNo) {
        this.id = id;
        this.themeNo = themeNo;
    }

    public Long getId() { return id; }
    public Long getThemeNo() { return themeNo; }
}