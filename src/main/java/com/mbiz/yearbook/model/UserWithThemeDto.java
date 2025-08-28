package com.mbiz.yearbook.model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import lombok.Getter;

@Getter
public class UserWithThemeDto {

    private final Long userId;
    private final String schoolName;
    private Long themeNo;
    private List<Long> fontIds;

 // ⭐ 새로운 메서드 추가: fontIds를 콤마로 구분된 문자열로 반환
    public String getFontIdsAsString() {
        if (fontIds == null || fontIds.isEmpty()) {
            return "";
        }
        return fontIds.stream()
                     .map(String::valueOf)
                     .collect(Collectors.joining(","));
    }

    public UserWithThemeDto(User user, UserTheme userTheme) {
        this.userId = user.getId();
        this.schoolName = user.getSchoolName();
        
        this.fontIds = new ArrayList<>();

        if (userTheme != null) {
            this.themeNo = userTheme.getThemeNo();
            
            String fontIdsString = userTheme.getFontIds();
            if (fontIdsString != null && !fontIdsString.isEmpty()) {
                this.fontIds = Arrays.stream(fontIdsString.split(","))
                                     .map(Long::parseLong)
                                     .collect(Collectors.toList());
            }
        }
    }
}