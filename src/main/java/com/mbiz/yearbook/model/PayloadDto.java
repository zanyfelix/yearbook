package com.mbiz.yearbook.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true) // JSON에 있는데 DTO에 없는 필드는 무시
public class PayloadDto {
    private Long userId;
    private Long yearbookId;
    private Long contentsId;
    private int pageNo;
    private String designData;

    // --- Getters and Setters ---
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getYearbookId() { return yearbookId; }
    public void setYearbookId(Long yearbookId) { this.yearbookId = yearbookId; }
    public Long getContentsId() { return contentsId; }
    public void setContentsId(Long contentsId) { this.contentsId = contentsId; }
    public int getPageNo() { return pageNo; }
    public void setPageNo(int pageNo) { this.pageNo = pageNo; }
    public String getDesignData() { return designData; }
    public void setDesignData(String designData) { this.designData = designData; }
}