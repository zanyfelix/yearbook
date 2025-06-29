package com.mbiz.yearbook.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CategoryDto {
    private Long id;
    private String name;
    private String description;
    private int pageLimit;
    private int photoCount;
    private List<String> imageUrls;

    public static CategoryDto from(Category category) {
        return new CategoryDto(
            category.getId(),
            category.getName(),
            category.getDescription(),
            category.getPageLimit(),
            category.getPhotos().size(),
            category.getPhotos().stream().map(Photo::getImagePath).toList()
        );
    }
}