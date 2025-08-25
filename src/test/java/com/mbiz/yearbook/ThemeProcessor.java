package com.mbiz.yearbook;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;

public class ThemeProcessor {

    // --- 설정: 사용 전 이 부분을 환경에 맞게 수정하세요 ---
    private static final String DB_URL = "jdbc:mariadb://121.78.123.77:3306/yearbook";
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD = "root!23";
    private static final String THEME_ROOT_PATH = "D:\\theme";
    // ----------------------------------------------------

    /**
     * 테마 테이블의 한 행을 나타내는 데이터 객체 (DTO)
     */
    static class Theme {
        long id; // DB에 저장된 후 자신의 ID를 저장하기 위한 필드
        Integer editWidth;
        Integer editHeight;
        String editPath;
        String gubun;
        String category;
        String filename;
        Long parentId;
        String thumbnailPath;
        String originalPath;
        String path;
        String editMaskPath;
        String originalMaskPath;
        String font; // font_path 컬럼에 매핑될 필드
        Integer themeNo;
        
        String designCode;
        String colorCode;

        @Override
        public String toString() {
            return "Theme{" +
                    "gubun='" + gubun + '\'' +
                    ", category='" + category + '\'' +
                    ", themeNo=" + themeNo +
                    ", path='" + path + '\'' +
                    ", parentId=" + parentId +
                    '}';
        }
    }

    public static void main(String[] args) {
        File rootDir = new File(THEME_ROOT_PATH);
        if (!rootDir.exists() || !rootDir.isDirectory()) {
            System.err.println("지정된 경로를 찾을 수 없습니다: " + THEME_ROOT_PATH);
            return;
        }

        Map<String, Theme> themeMap = parseThemeDirectory(rootDir);
        if (themeMap.isEmpty()) {
            System.out.println("처리할 테마 파일이 없습니다.");
            return;
        }

        insertThemesIntoDatabase(new ArrayList<>(themeMap.values()));
    }

    private static Map<String, Theme> parseThemeDirectory(File rootDir) {
        System.out.println("'" + rootDir.getAbsolutePath() + "' 디렉토리 분석을 시작합니다...");
        Map<String, Theme> themeMap = new HashMap<>();
        findThemeLeafDirectories(rootDir, themeMap);
        System.out.println("총 " + themeMap.size() + "개의 테마 그룹을 분석했습니다.");
        return themeMap;
    }

    private static void findThemeLeafDirectories(File currentDir, Map<String, Theme> themeMap) {
        File[] files = currentDir.listFiles();
        if (files == null) return;

        boolean isLeaf = false;
        for (File file : files) {
            if (file.isFile()) {
                String lowerName = file.getName().toLowerCase();
                if (lowerName.endsWith("_b.png") || lowerName.endsWith("_m.png") || lowerName.endsWith("_s.png")) {
                    isLeaf = true;
                    break;
                }
                if (lowerName.endsWith(".woff") || lowerName.endsWith(".ttf")) {
                    processFontFile(file, themeMap);
                    return;
                }
            }
        }

        if (isLeaf) {
            processImageLeafDirectory(currentDir, themeMap);
        } else {
            for (File file : files) {
                if (file.isDirectory()) {
                    findThemeLeafDirectories(file, themeMap);
                }
            }
        }
    }

    private static void processFontFile(File fontFile, Map<String, Theme> themeMap) {
        String themeKey = getRelativePath(fontFile);
        Theme theme = new Theme();
        
        Path rootPath = Paths.get(THEME_ROOT_PATH);
        Path filePath = Paths.get(fontFile.getAbsolutePath());
        Path relativePath = rootPath.relativize(filePath);

        if (relativePath.getNameCount() > 1) {
            try {
                 theme.themeNo = Integer.parseInt(relativePath.getName(0).toString());
                 theme.category = "Font";
                 theme.gubun = relativePath.getName(1).toString();
            } catch(NumberFormatException e) {
                 System.err.println("경고: 폰트의 상위 테마 번호 폴더가 숫자가 아닙니다: " + relativePath.getName(0));
            }
        }
        
        theme.path = getRelativePath(fontFile.getParentFile());
        theme.font = themeKey; // font_path에 전체 상대 경로 저장
        theme.filename = fontFile.getName();
        theme.editPath = themeKey;

        themeMap.put(themeKey, theme);
    }

    private static void processImageLeafDirectory(File leafDir, Map<String, Theme> themeMap) {
        String themeKey = getRelativePath(leafDir);
        Theme theme = themeMap.computeIfAbsent(themeKey, k -> {
            Theme newTheme = new Theme();
            newTheme.path = k;

            Path rootPath = Paths.get(THEME_ROOT_PATH);
            Path dirPath = Paths.get(leafDir.getAbsolutePath());
            Path relativePath = rootPath.relativize(dirPath);

            if (relativePath.getNameCount() >= 5) {
                try {
                    newTheme.themeNo = Integer.parseInt(relativePath.getName(0).toString());
                    newTheme.gubun = relativePath.getName(1).toString();
                    newTheme.category = relativePath.getName(2).toString();
                    newTheme.designCode = relativePath.getName(3).toString();
                    newTheme.colorCode = relativePath.getName(4).toString();
                } catch (NumberFormatException e) {
                    System.err.println("경고: 테마 번호 폴더 이름이 숫자가 아닙니다: " + relativePath.getName(0));
                }
            }
            return newTheme;
        });

        File[] files = leafDir.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isFile()) {
                    processImageFile(file, theme);
                }
            }
        }
    }

    private static void processImageFile(File file, Theme theme) {
        String fileName = file.getName().toLowerCase();
        String relativePath = getRelativePath(file);

        if (fileName.endsWith("_m.png")) {
            theme.editPath = relativePath;
            theme.filename = file.getName();
            try {
                BufferedImage bimg = ImageIO.read(file);
                if (bimg != null) {
                    theme.editWidth = bimg.getWidth();
                    theme.editHeight = bimg.getHeight();
                }
            } catch (IOException e) {
                System.err.println("이미지 크기 읽기 오류: " + file.getAbsolutePath());
            }
        } else if (fileName.endsWith("_b.png")) {
            theme.originalPath = relativePath;
        } else if (fileName.endsWith("_s.png")) {
            theme.thumbnailPath = relativePath;
        } else if (fileName.endsWith("_mm.png")) {
            theme.editMaskPath = relativePath;
        } else if (fileName.endsWith("_mb.png")) {
            theme.originalMaskPath = relativePath;
        }
    }

    private static String getRelativePath(File file) {
        Path rootPath = Paths.get(THEME_ROOT_PATH);
        Path filePath = Paths.get(file.getAbsolutePath());
        return rootPath.relativize(filePath).toString().replace("\\", "/");
    }

    private static void insertThemesIntoDatabase(List<Theme> themes) {
        List<Theme> parentThemes = new ArrayList<>();
        List<Theme> childThemes = new ArrayList<>();
        for (Theme theme : themes) {
            if (theme.colorCode != null && theme.colorCode.equalsIgnoreCase("C1")) {
                parentThemes.add(theme);
            } else {
                childThemes.add(theme);
            }
        }
        
        Map<String, Long> parentIdMap = new HashMap<>();
        
        String insertSql = "INSERT INTO theme (edit_width, edit_height, edit_path, gubun, category, filename, parent_id, thumbnail_path, original_path, path, edit_mask_path, original_mask_path, font_path, theme_no) " +
                           "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        String updateSql = "UPDATE theme SET parent_id = ? WHERE id = ?";
        
        Connection conn = null;
        PreparedStatement insertPstmt = null;
        PreparedStatement updatePstmt = null;
        Statement stmt = null;

        try {
            Class.forName("org.mariadb.jdbc.Driver");
            conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
            conn.setAutoCommit(false);

            stmt = conn.createStatement();
            System.out.println("기존 theme 테이블의 데이터를 삭제합니다...");
            stmt.execute("SET FOREIGN_KEY_CHECKS = 0");
            stmt.execute("TRUNCATE TABLE theme");
            stmt.execute("SET FOREIGN_KEY_CHECKS = 1");
            System.out.println("테이블 데이터 삭제 완료.");

            // 1. 부모 테마(C1) 삽입 및 자신의 ID로 parent_id 업데이트
            insertPstmt = conn.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            updatePstmt = conn.prepareStatement(updateSql);
            
            System.out.println(parentThemes.size() + "개의 부모 테마를 처리합니다...");
            for (Theme parent : parentThemes) {
                // 먼저 parent_id를 null로 하여 삽입
                setPreparedStatementParams(insertPstmt, parent);
                insertPstmt.executeUpdate();

                // 생성된 ID 가져오기
                ResultSet rs = insertPstmt.getGeneratedKeys();
                if (rs.next()) {
                    long generatedId = rs.getLong(1);
                    parent.id = generatedId; // 객체에 ID 저장

                    // 자식들이 참조할 수 있도록 맵에 저장
                    String parentKey = parent.themeNo + "/" + parent.gubun + "/" + parent.category + "/" + parent.designCode;
                    parentIdMap.put(parentKey, generatedId);
                    
                    // 자신의 ID로 parent_id를 업데이트
                    updatePstmt.setLong(1, generatedId);
                    updatePstmt.setLong(2, generatedId);
                    updatePstmt.executeUpdate();
                    
                    System.out.println("부모 생성 및 업데이트: Key=[" + parentKey + "], ID=[" + generatedId + "]");
                }
            }
            System.out.println("부모 테마 처리 완료.");

            // 2. 자식 테마 삽입
            System.out.println(childThemes.size() + "개의 자식 테마를 삽입합니다...");
            for (Theme child : childThemes) {
                 if (child.designCode != null && child.gubun != null) {
                    String parentKey = child.themeNo + "/" + child.gubun + "/" + child.category + "/" + child.designCode;
                    Long pId = parentIdMap.get(parentKey);
                    child.parentId = pId;
                 }
                setPreparedStatementParams(insertPstmt, child);
                insertPstmt.addBatch();
            }
            insertPstmt.executeBatch();
            
            conn.commit();
            System.out.println("성공적으로 " + themes.size() + "개의 레코드를 삽입했습니다.");

        } catch (Exception e) {
            System.err.println("오류가 발생했습니다.");
            e.printStackTrace();
            if (conn != null) {
                try {
                    conn.rollback();
                } catch (SQLException ex) {
                    ex.printStackTrace();
                }
            }
        } finally {
            try {
                if (stmt != null) stmt.close();
                if (insertPstmt != null) insertPstmt.close();
                if (updatePstmt != null) updatePstmt.close();
                if (conn != null) conn.close();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
    }

    private static void setPreparedStatementParams(PreparedStatement pstmt, Theme theme) throws SQLException {
        pstmt.setObject(1, theme.editWidth);
        pstmt.setObject(2, theme.editHeight);
        pstmt.setString(3, theme.editPath);
        pstmt.setString(4, theme.gubun);
        pstmt.setString(5, theme.category);
        pstmt.setString(6, theme.filename);
        pstmt.setObject(7, theme.parentId);
        pstmt.setString(8, theme.thumbnailPath);
        pstmt.setString(9, theme.originalPath);
        pstmt.setString(10, theme.path);
        pstmt.setString(11, theme.editMaskPath);
        pstmt.setString(12, theme.originalMaskPath);
        pstmt.setString(13, theme.font); // font 필드 값을 font_path 컬럼 위치에 바인딩
        pstmt.setObject(14, theme.themeNo);
    }
}
