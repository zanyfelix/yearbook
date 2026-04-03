package com.mbiz.yearbook.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mbiz.yearbook.model.FontDto;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.ThemeDto;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Long> {
	
    List<Theme> findByCategory(String category);
    
    // ✨ parentId를 기준으로 모든 Theme 객체를 찾는 메서드 추가
    List<Theme> findByParentId(Long parentId);
    
    Optional<Theme> findByIdAndParentId(Long id, Long parentId);
    
    /**
     * 부모 ID로 모든 테마를 찾되, 파일명(fileName)을 기준으로 오름차순 정렬합니다.
     * findByParentId 대신 이 메소드를 사용하도록 Controller를 수정해야 합니다.
     */
    List<Theme> findByParentIdOrderByFilenameAsc(Long parentId);

    Optional<Theme> findFirstByEditPath(String editPath);

    Optional<Theme> findFirstByOriginalPath(String originalPath);
    
    @Query("SELECT new com.mbiz.yearbook.model.FontDto(t.id, t.filename, t.fontPath) " +
            "FROM Theme t WHERE t.themeNo = :themeNo AND t.category = 'font' ORDER BY t.filename ASC")
     List<FontDto> findFontsByThemeNo(@Param("themeNo") Long themeNo);
    
    Optional<Theme> findFirstByThemeNoOrderByIdAsc(Long themeNo);
    
    @Query("SELECT MIN(t.themeNo) FROM Theme t")
    Optional<Long> findMinThemeNo();
    
    @Query("SELECT new com.mbiz.yearbook.model.ThemeDto(MIN(t.id), t.themeNo) " +
            "FROM Theme t " +
            "GROUP BY t.themeNo " +
            "ORDER BY t.themeNo ASC")
     List<ThemeDto> findDistinctThemeSelections(); // 메소드 이름 변경
}
