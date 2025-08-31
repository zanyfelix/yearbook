package com.mbiz.yearbook.model;
public class FontDto {
    private Long id;
    private String filename; // 폰트 이름을 담을 필드
    private String fontPath;

    public FontDto(Long id, String filename, String fontPath) {
        this.id = id;
        this.filename = filename;
        this.fontPath = fontPath;
    }

    public Long getId() { return id; }
    public String getFilename() { return filename; }
    public String getFontPath() { return fontPath; }
}