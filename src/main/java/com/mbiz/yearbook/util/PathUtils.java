package com.mbiz.yearbook.util;

import java.nio.file.Paths;

/**
 * 파일 경로 처리를 위한 유틸리티 클래스
 */
public class PathUtils {
    
    /**
     * 파일 경로를 정규화하여 중복 슬래시와 중복 폴더명을 제거합니다.
     * @param path 원본 경로
     * @return 정규화된 경로
     */
    public static String normalizePath(String path) {
        if (path == null || path.trim().isEmpty()) {
            return path;
        }
        
        // 백슬래시를 슬래시로 변경하고 경로 정규화
        String normalized = Paths.get(path).normalize().toString().replace("\\", "/");
        
        // 중복된 슬래시 제거
        normalized = normalized.replaceAll("/+", "/");
        
        // 중복된 폴더명 제거
        normalized = removeDuplicateFolderNames(normalized);
        
        // 끝에 슬래시 추가 (디렉토리 경로인 경우)
        if (!normalized.endsWith("/") && !normalized.contains(".")) {
            normalized += "/";
        }
        
        return normalized;
    }
    
    /**
     * 경로에서 연속된 중복 폴더명을 제거합니다.
     * 예: /data/theme/theme/ -> /data/theme/
     * @param path 원본 경로
     * @return 중복 폴더명이 제거된 경로
     */
    private static String removeDuplicateFolderNames(String path) {
        String[] parts = path.split("/");
        StringBuilder result = new StringBuilder();
        String lastPart = "";
        
        for (String part : parts) {
            if (!part.isEmpty()) {
                // 연속된 동일한 폴더명 제거
                if (!part.equals(lastPart)) {
                    if (result.length() > 0 || path.startsWith("/")) {
                        result.append("/");
                    }
                    result.append(part);
                }
                lastPart = part;
            }
        }
        
        // 원본이 /로 끝났다면 결과도 /로 끝나도록
        if (path.endsWith("/") && result.length() > 0 && !result.toString().endsWith("/")) {
            result.append("/");
        }
        
        return result.toString();
    }
    
    /**
     * 두 경로를 안전하게 결합합니다.
     * @param basePath 기본 경로
     * @param relativePath 상대 경로
     * @return 결합된 경로
     */
    public static String combinePaths(String basePath, String relativePath) {
        if (basePath == null) basePath = "";
        if (relativePath == null) relativePath = "";
        
        basePath = basePath.trim();
        relativePath = relativePath.trim();
        
        if (basePath.isEmpty()) return normalizePath(relativePath);
        if (relativePath.isEmpty()) return normalizePath(basePath);
        
        // 끝의 슬래시와 시작의 슬래시 정리
        if (basePath.endsWith("/") && relativePath.startsWith("/")) {
            return normalizePath(basePath + relativePath.substring(1));
        } else if (!basePath.endsWith("/") && !relativePath.startsWith("/")) {
            return normalizePath(basePath + "/" + relativePath);
        } else {
            return normalizePath(basePath + relativePath);
        }
    }
    
    /**
     * 파일 URL을 생성합니다.
     * @param contextPath 컨텍스트 경로
     * @param resourceType 리소스 타입 (theme, upload, thumbnail 등)
     * @param filePath 파일 경로
     * @return 완성된 URL
     */
    public static String buildFileUrl(String contextPath, String resourceType, String filePath) {
        StringBuilder url = new StringBuilder();
        
        if (contextPath != null && !contextPath.isEmpty()) {
            url.append(contextPath);
        }
        
        url.append("/").append(resourceType);
        
        if (filePath != null && !filePath.isEmpty()) {
            if (!filePath.startsWith("/")) {
                url.append("/");
            }
            url.append(filePath);
        }
        
        return url.toString().replaceAll("/+", "/");
    }
}