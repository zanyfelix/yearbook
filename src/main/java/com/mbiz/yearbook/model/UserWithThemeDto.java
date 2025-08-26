package com.mbiz.yearbook.model;

import lombok.Getter;

@Getter
public class UserWithThemeDto {

    private final Long userId;
    private final String schoolName;
    private Long themeNo;
    private Long fontId;

    public UserWithThemeDto(User user, UserTheme userTheme) {
        this.userId = user.getId();
        this.schoolName = user.getSchoolName();
        if (userTheme != null && userTheme.getTheme() != null) {
            this.themeNo = userTheme.getThemeNo();
            this.fontId = userTheme.getFontId();
        }
    }
}