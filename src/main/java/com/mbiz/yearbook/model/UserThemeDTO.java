package com.mbiz.yearbook.model;

import lombok.Data;

@Data // Getter, Setter, ToString 등을 자동으로 생성해주는 Lombok 어노테이션
public class UserThemeDTO {
    
    private Long themeId;
    private String thumbnailPath;
    private String editPath;

    // 기존 생성자는 그대로 두거나 삭제해도 됩니다.
    public UserThemeDTO(UserTheme userTheme) {
        // ...
    }

    /**
     * [✅ 새로 추가]
     * Theme 엔티티를 직접 받아서 DTO를 생성하는 생성자입니다.
     */
    public UserThemeDTO(Theme theme) {
        this.themeId = theme.getId();
        this.thumbnailPath = theme.getThumbnailPath();
        this.editPath = theme.getEditPath();
    }
}