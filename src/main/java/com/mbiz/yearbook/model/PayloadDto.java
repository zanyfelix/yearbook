package com.mbiz.yearbook.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true) // JSON에 있는데 DTO에 없는 필드는 무시
public class PayloadDto {
    private Long userId;
    private Long yearbookId;
    private Long contentsId;
    private int pageNo;
    private String designData;

    // ⚠️ Jackson은 boolean 필드 이름이 'is'로 시작하면 getter에서 'is'를 제거한 이름으로 JSON 키를 추론.
    // 즉 isEmptyPage getter → JSON 키 "emptyPage"로 매핑됨.
    // JS에서 "isEmptyPage"로 보내므로 @JsonProperty로 명시적 매핑 필요.
    @JsonProperty("isEmptyPage")
    private boolean emptyPage; // 빈 페이지 여부 (Clear 후 저장 시 thumbnailPath를 null로 초기화)

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
    public boolean isEmptyPage() { return emptyPage; }
    public void setEmptyPage(boolean emptyPage) { this.emptyPage = emptyPage; }
}