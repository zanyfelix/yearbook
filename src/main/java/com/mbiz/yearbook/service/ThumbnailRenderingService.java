package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.util.PathUtils;

@Service
public class ThumbnailRenderingService {

    @Value("${file.path.theme}")
    private String themePath;

    @Value("${file.path.thumbnail}")
    private String thumbnailPath;
    
    @Value("${file.path.user-photos}")
    private String userPhotosPath;

    @Autowired
    private ThemeRepository themeRepository;

    private static final int THUMB_WIDTH = 314;
    private static final int THUMB_HEIGHT = 404;

    public String generateThumbnail(String designDataJson, Long yearbookId) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(designDataJson);

        BufferedImage canvas = new BufferedImage(THUMB_WIDTH, THUMB_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = canvas.createGraphics();
        
        // 고품질 렌더링 설정
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // 1. 배경 렌더링
        String bgPath = root.path("background").asText();
        if (!bgPath.isEmpty() && !bgPath.contains("data:image")) {
            try {
                BufferedImage bgImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + bgPath)));
                g2d.drawImage(bgImage, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, null);
            } catch (IOException e) { 
                System.err.println("배경 이미지 로드 실패: " + bgPath); 
            }
        }

        // 2. 프레임 및 사진 렌더링
        JsonNode frames = root.path("frames");
        if (frames.isArray()) {
            for (JsonNode frameNode : frames) {
                renderFrame(g2d, frameNode);
            }
        }

        // 3. 텍스트박스 렌더링 (최상위 레이어)
        JsonNode textBoxes = root.path("textBoxes");
        if (textBoxes.isArray()) {
            for (JsonNode textNode : textBoxes) {
                renderTextBox(g2d, textNode);
            }
        }

        g2d.dispose();

        // 최종 썸네일 파일 저장
        String filename = "thumbnail_" + yearbookId + "_" + System.currentTimeMillis() + ".png";
        Path destinationDir = Paths.get(thumbnailPath);
        Files.createDirectories(destinationDir);
        Path destinationFile = destinationDir.resolve(filename);
        
        ImageIO.write(canvas, "png", destinationFile.toFile());

        return "/thumbnail/" + filename;
    }
    
    /**
     * 프레임과 사진을 렌더링합니다.
     */
    private void renderFrame(Graphics2D g2d, JsonNode frameNode) {
        Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
        if (theme == null) return;

     // 프레임 위치와 크기 계산
        int frameX = (int) Math.round(THUMB_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
        int frameY = (int) Math.round(THUMB_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0));
        int frameWidth = (int) Math.round(THUMB_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
        int frameHeight = (int) Math.round(THUMB_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));

        if (frameWidth <= 0 || frameHeight <= 0) return;

        // 프레임용 임시 캔버스 생성
        BufferedImage frameCanvas = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D frameG2d = frameCanvas.createGraphics();
        frameG2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        frameG2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        try {
            // 투명 배경으로 초기화
            frameG2d.setComposite(AlphaComposite.Clear);
            frameG2d.fillRect(0, 0, frameWidth, frameHeight);
            frameG2d.setComposite(AlphaComposite.SrcOver);
            
            // 사진 렌더링
            JsonNode photoNode = frameNode.path("photo");
            boolean hasPhoto = false;
            if (photoNode != null && photoNode.has("src") && !photoNode.path("src").asText().isEmpty()) {
                byte[] imageBytes = getImageBytes(photoNode.path("src").asText());
                if (imageBytes != null) {
                    BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
                    if (photoImage != null) {
                        hasPhoto = true;
                        int photoX = (int) Math.round(frameWidth * (photoNode.path("position").path("left").asDouble(0) / 100.0));
                        int photoY = (int) Math.round(frameHeight * (photoNode.path("position").path("top").asDouble(0) / 100.0));
                        int photoWidth = (int) Math.round(frameWidth * (photoNode.path("size").path("width").asDouble(100) / 100.0));
                        int photoHeight = (int) Math.round(frameHeight * (photoNode.path("size").path("height").asDouble(100) / 100.0));
                        
                        if (photoWidth > 0 && photoHeight > 0) {
                            // ✅ 사진 렌더링도 프레임과 동일한 방식으로 수정 (중심점 계산 제거)
                            AffineTransform savedPhotoTx = frameG2d.getTransform();
                            try {
                                frameG2d.translate(photoX, photoY);
                                AffineTransform photoTransform = getTransformFromMatrix(photoNode.path("transform").asText("none"));
                                frameG2d.transform(photoTransform);
                                frameG2d.drawImage(photoImage, 0, 0, photoWidth, photoHeight, null);
                            } finally {
                                frameG2d.setTransform(savedPhotoTx);
                            }
                        }
                    }
                }
            }

            // 마스크 적용 (사진이 있을 때만)
            if (hasPhoto && theme.getEditMaskPath() != null && !theme.getEditMaskPath().isEmpty()) {
                try {
                    BufferedImage maskImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditMaskPath())));
                    frameG2d.setComposite(AlphaComposite.DstIn);
                    frameG2d.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);
                    frameG2d.setComposite(AlphaComposite.SrcOver);
                } catch (IOException e) {
                    System.err.println("마스크 이미지 로드 실패: " + theme.getEditMaskPath());
                }
            }
            
            // 프레임 테두리 그리기
            if (theme.getEditPath() != null && !theme.getEditPath().isEmpty()) {
                try {
                    BufferedImage frameImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditPath())));
                    frameG2d.setComposite(AlphaComposite.SrcOver);
                    frameG2d.drawImage(frameImage, 0, 0, frameWidth, frameHeight, null);
                } catch (IOException e) {
                    System.err.println("프레임 이미지 로드 실패: " + theme.getEditPath());
                }
            }

        } catch (Exception e) {
            System.err.println("프레임 렌더링 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
        } finally {
            frameG2d.dispose();
        }

        // --- [핵심 수정 2] 최종 프레임을 메인 캔버스에 그리는 로직 ---
        AffineTransform savedCanvasTx = g2d.getTransform();
        try {
            // 1. CSS의 'position' 값 만큼 이동
            g2d.translate(frameX, frameY);
            
            // 2. CSS의 'transform' matrix 값을 가져와 적용 (이 안에 모든 변형 정보가 담겨 있음)
            AffineTransform frameTransform = getTransformFromMatrix(frameNode.path("transform").asText("none"));
            g2d.transform(frameTransform);
            
            // 3. (0, 0) 위치에 프레임 이미지를 그리기
            g2d.drawImage(frameCanvas, 0, 0, frameWidth, frameHeight, null);
        } finally {
            // 4. 다음 요소를 위해 캔버스 상태 복원
            g2d.setTransform(savedCanvasTx);
        }
    }
    
    /**
     * 텍스트박스를 렌더링합니다.
     */
    private void renderTextBox(Graphics2D g2d, JsonNode textNode) {
        try {
            // 텍스트 스타일 정보 파싱
            JsonNode styles = textNode.path("styles");
            String html = textNode.path("html").asText("");
            
            // HTML 태그 제거하여 순수 텍스트 추출
            String text = html.replaceAll("<br.*?>", "\n")
                              .replaceAll("<.*?>", "")
                              .trim();
            
            // 텍스트가 비어있으면 스킵
            if (text.isEmpty()) {
                return;
            }
            
            // 위치 및 크기 계산
            double leftPercent = textNode.path("position").path("left").asDouble(0);
            double topPercent = textNode.path("position").path("top").asDouble(0);
            double widthPercent = textNode.path("size").path("width").asDouble(0);
            double heightPercent = textNode.path("size").path("height").asDouble(0);
            
            int boxX = (int) Math.round(THUMB_WIDTH * (leftPercent / 100.0));
            int boxY = (int) Math.round(THUMB_HEIGHT * (topPercent / 100.0));
            int boxWidth = (int) Math.round(THUMB_WIDTH * (widthPercent / 100.0));
            int boxHeight = (int) Math.round(THUMB_HEIGHT * (heightPercent / 100.0));
            
            // 최소 크기 보장
            if (boxWidth < 10) boxWidth = 10;
            if (boxHeight < 10) boxHeight = 10;
            
            // 폰트 설정
            String fontFamily = styles.path("fontFamily").asText("Arial");
            String fontSizeStr = styles.path("fontSize").asText("12px").replaceAll("[^0-9.]", "");
            boolean isBold = "bold".equals(styles.path("fontWeight").asText("normal"));
            
            double fontSize = 12.0;
            try {
                fontSize = Double.parseDouble(fontSizeStr);
            } catch (NumberFormatException e) {
                fontSize = 12.0;
            }
            
            double scaleRatio = (double)THUMB_WIDTH / 786.0;
            float scaledFontSize = Math.max(8.0f, (float)(fontSize * scaleRatio));
            
            Font font = new Font(fontFamily, isBold ? Font.BOLD : Font.PLAIN, Math.round(scaledFontSize));
            g2d.setFont(font);
            
            // 색상 설정
            String colorStr = styles.path("color").asText("rgb(0, 0, 0)");
            Color textColor = parseColor(colorStr);
            g2d.setColor(textColor);
            
            // Transform 적용 및 텍스트 그리기
            AffineTransform textTransform = getTransformFromMatrix(textNode.path("transform").asText("none"));
            AffineTransform savedTextTx = g2d.getTransform();
            
            // 회전 중심점 설정
            g2d.translate(boxX + boxWidth / 2.0, boxY + boxHeight / 2.0);
            g2d.transform(textTransform);
            
            // 텍스트 정렬 처리
            FontMetrics fm = g2d.getFontMetrics();
            String textAlign = styles.path("textAlign").asText("left");
            String[] lines = text.split("\n");
            
            // 전체 텍스트 높이 계산
            int lineHeight = fm.getHeight();
            int totalTextHeight = lineHeight * lines.length;
            int startY = -totalTextHeight / 2 + fm.getAscent();
            
            // 각 줄 그리기
            for (String line : lines) {
                if (line.trim().isEmpty()) {
                    startY += lineHeight;
                    continue;
                }
                
                int textWidth = fm.stringWidth(line);
                int startX = -boxWidth / 2; // 기본값 (left align)
                
                if ("center".equals(textAlign)) {
                    startX = -textWidth / 2;
                } else if ("right".equals(textAlign)) {
                    startX = boxWidth / 2 - textWidth;
                }
                
                g2d.drawString(line, startX, startY);
                startY += lineHeight;
            }
            
            g2d.setTransform(savedTextTx);
            
        } catch (Exception e) {
            System.err.println("텍스트박스 렌더링 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 색상 문자열을 Color 객체로 파싱합니다.
     */
    private Color parseColor(String colorStr) {
        try {
            if (colorStr.startsWith("rgb")) {
                String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
                if (rgb.length >= 3) {
                    return new Color(
                        Integer.parseInt(rgb[0].trim()), 
                        Integer.parseInt(rgb[1].trim()), 
                        Integer.parseInt(rgb[2].trim())
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("색상 파싱 실패: " + colorStr);
        }
        return Color.BLACK;
    }
    
    /**
     * Base64 문자열 또는 파일 경로를 받아 이미지의 byte 배열을 반환합니다.
     */
    private byte[] getImageBytes(String src) {
        if (src == null || src.isEmpty()) return null;
        
        if (src.startsWith("data:image")) {
            // Base64 인코딩된 이미지
            if (src.contains(",")) {
                return Base64.getDecoder().decode(src.split(",", 2)[1]);
            }
        } else {
            // 파일 경로
            File imageFile = new File(PathUtils.normalizePath(userPhotosPath + src));
            if (imageFile.exists()) {
                try {
                    return Files.readAllBytes(imageFile.toPath());
                } catch (IOException e) {
                    System.err.println("이미지 파일 읽기 실패: " + src);
                }
            } else {
                System.err.println("이미지 파일을 찾을 수 없음: " + src);
            }
        }
        return null;
    }

    /**
     * CSS matrix 문자열을 Java AffineTransform 객체로 변환합니다.
     */
    private AffineTransform getTransformFromMatrix(String transformValue) {
    	if (!"none".equals(transformValue) && transformValue.startsWith("matrix")) {
            try {
                String matrixStr = transformValue.substring(transformValue.indexOf("(") + 1, transformValue.indexOf(")"));
                String[] values = matrixStr.split(",");
                if (values.length == 6) {
                    double m00 = Double.parseDouble(values[0].trim()); // a
                    double m10 = Double.parseDouble(values[1].trim()); // b
                    double m01 = Double.parseDouble(values[2].trim()); // c
                    double m11 = Double.parseDouble(values[3].trim()); // d
                    
                    // ✅ 수정: tx, ty 값을 정상적으로 파싱하여 적용합니다.
                    double m02 = Double.parseDouble(values[4].trim()); // tx
                    double m12 = Double.parseDouble(values[5].trim()); // ty

                    return new AffineTransform(m00, m10, m01, m11, m02, m12);
                }
            } catch (NumberFormatException e) {
                System.err.println("Matrix 파싱 오류: " + transformValue);
            }
        }
        return new AffineTransform(); // 기본(단위) 행렬 반환
    }

    /**
     * EXIF 정보를 읽어 이미지 방향을 보정합니다.
     */
    private BufferedImage readAndCorrectImageOrientation(byte[] imageBytes) {
        try {
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (originalImage == null) return null;

            int orientation = 1; 
            try {
                com.drew.metadata.Metadata metadata = com.drew.imaging.ImageMetadataReader.readMetadata(new ByteArrayInputStream(imageBytes));
                com.drew.metadata.exif.ExifIFD0Directory directory = metadata.getFirstDirectoryOfType(com.drew.metadata.exif.ExifIFD0Directory.class);
                if (directory != null && directory.containsTag(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION)) {
                    orientation = directory.getInt(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION);
                }
            } catch (Exception e) {
                return originalImage; 
            }

            if (orientation <= 1) {
                return originalImage; 
            }

            AffineTransform transform = new AffineTransform();
            int width = originalImage.getWidth();
            int height = originalImage.getHeight();

            switch (orientation) {
                case 2: transform.scale(-1.0, 1.0); transform.translate(-width, 0); break;
                case 3: transform.translate(width, height); transform.rotate(Math.PI); break;
                case 4: transform.scale(1.0, -1.0); transform.translate(0, -height); break;
                case 5: transform.rotate(Math.PI / 2); transform.scale(1.0, -1.0); break;
                case 6: transform.translate(height, 0); transform.rotate(Math.PI / 2); break;
                case 7: transform.rotate(Math.PI / 2); transform.scale(-1.0, 1.0); transform.translate(-height, 0); break;
                case 8: transform.translate(0, width); transform.rotate(-Math.PI / 2); break;
                default: break;
            }

            AffineTransformOp op = new AffineTransformOp(transform, AffineTransformOp.TYPE_BILINEAR);
            
            BufferedImage rotatedImage;
            if (orientation >= 5 && orientation <= 8) {
                rotatedImage = new BufferedImage(height, width, originalImage.getType());
            } else {
                rotatedImage = new BufferedImage(width, height, originalImage.getType());
            }

            op.filter(originalImage, rotatedImage);
            return rotatedImage;

        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
}