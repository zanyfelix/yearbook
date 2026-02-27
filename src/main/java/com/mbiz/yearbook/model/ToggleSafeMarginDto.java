package com.mbiz.yearbook.model;

public class ToggleSafeMarginDto {
    private Long id;
    private int safeMargin;  // 3 또는 6 (mm)

    public ToggleSafeMarginDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public int getSafeMargin() { return safeMargin; }
    public void setSafeMargin(int safeMargin) { this.safeMargin = safeMargin; }
}
