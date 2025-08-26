package com.mbiz.yearbook.model;
public class FontDto {
    private Long id;
    private String filename; // 폰트 이름을 담을 필드

    public FontDto(Long id, String filename) {
        this.id = id;
        this.filename = filename;
    }

    public Long getId() { return id; }
    public String getFilename() { return filename; }
}