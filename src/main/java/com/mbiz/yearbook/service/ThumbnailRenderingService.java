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
        
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // 1. 배경 렌더링
        String bgPath = root.path("background").asText();
        if (!bgPath.isEmpty() && !bgPath.contains("data:image")) {
            try {
                BufferedImage bgImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + bgPath)));
                g2d.drawImage(bgImage, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, null);
            } catch (IOException e) { System.err.println("배경 이미지 로드 실패: " + bgPath); }
        }

        // 2. 프레임 및 사진 렌더링
        for (JsonNode frameNode : root.path("frames")) {
            Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
            if (theme == null) continue;

            int frameX = (int) Math.round(THUMB_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
            int frameY = (int) Math.round(THUMB_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0));
            int frameWidth = (int) Math.round(THUMB_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
            int frameHeight = (int) Math.round(THUMB_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));
            if (frameWidth <= 0 || frameHeight <= 0) continue;

            BufferedImage frameCanvas = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
            Graphics2D frameG2d = frameCanvas.createGraphics();
            frameG2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            frameG2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

            try {
                JsonNode photoNode = frameNode.path("photo");
                if (photoNode != null && photoNode.has("src") && !photoNode.path("src").asText().isEmpty()) {
                    byte[] imageBytes = getImageBytes(photoNode.path("src").asText());
                    if (imageBytes != null) {
                        BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
                        if (photoImage != null) {
                            // 1. 사진의 위치/회전이 적용된 이미지를 미리 준비합니다.
                            BufferedImage transformedPhoto = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
                            Graphics2D photoG2d = transformedPhoto.createGraphics();
                            photoG2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                            photoG2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

                            int photoX = (int) Math.round(frameWidth * (photoNode.path("position").path("left").asDouble() / 100.0));
                            int photoY = (int) Math.round(frameHeight * (photoNode.path("position").path("top").asDouble() / 100.0));
                            int photoWidth = (int) Math.round(frameWidth * (photoNode.path("size").path("width").asDouble() / 100.0));
                            int photoHeight = (int) Math.round(frameHeight * (photoNode.path("size").path("height").asDouble() / 100.0));
                            
                            if(photoWidth > 0 && photoHeight > 0) {
                                AffineTransform photoTransform = getTransformFromMatrix(photoNode.path("transform").asText("none"));
                                photoG2d.translate(photoX + photoWidth / 2.0, photoY + photoHeight / 2.0);
                                photoG2d.transform(photoTransform);
                                photoG2d.drawImage(photoImage, -photoWidth / 2, -photoHeight / 2, photoWidth, photoHeight, null);
                            }
                            photoG2d.dispose();
                            
                            // 2. 준비된 사진을 프레임 캔버스에 그립니다.
                            frameG2d.drawImage(transformedPhoto, 0, 0, null);
                        }
                    }
                }

                // 3. 'SrcIn' 모드로 마스크를 겹쳐 사진을 마스크 모양으로 잘라냅니다.
                if (theme.getEditMaskPath() != null && !theme.getEditMaskPath().isEmpty()) {
                    BufferedImage maskImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditMaskPath())));
                    frameG2d.setComposite(AlphaComposite.SrcIn);
                    frameG2d.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);
                }
                
                // 4. 'SrcOver' 모드로 프레임 테두리를 가장 위에 그립니다.
                frameG2d.setComposite(AlphaComposite.SrcOver);
                BufferedImage frameImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditPath())));
                frameG2d.drawImage(frameImage, 0, 0, frameWidth, frameHeight, null);

            } catch (Exception e) {
                System.err.println("프레임 렌더링 중 오류 발생: " + e.getMessage());
            } finally {
                frameG2d.dispose();
            }
            
            AffineTransform frameTransform = getTransformFromMatrix(frameNode.path("transform").asText("none"));
            AffineTransform savedCanvasTx = g2d.getTransform();
            g2d.translate(frameX + frameWidth / 2.0, frameY + frameHeight / 2.0);
            g2d.transform(frameTransform);
            g2d.drawImage(frameCanvas, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, null);
            g2d.setTransform(savedCanvasTx);
        }

        // 텍스트박스 렌더링 (선택사항)
        for (JsonNode textNode : root.path("textBoxes")) {
            try {
                // 1. 텍스트 스타일 정보 파싱
                JsonNode styles = textNode.path("styles");
                String html = textNode.path("html").asText("");
                String text = html.replaceAll("<br.*?>", "\n").replaceAll("<.*?>", "");
                
                // 2. 위치 및 크기 계산
                int boxX = (int) Math.round(THUMB_WIDTH * (textNode.path("position").path("left").asDouble() / 100.0));
                int boxY = (int) Math.round(THUMB_HEIGHT * (textNode.path("position").path("top").asDouble() / 100.0));
                int boxWidth = (int) Math.round(THUMB_WIDTH * (textNode.path("size").path("width").asDouble() / 100.0));
                int boxHeight = (int) Math.round(THUMB_HEIGHT * (textNode.path("size").path("height").asDouble() / 100.0));
                
                if (boxWidth <= 0 || boxHeight <= 0) {
                    System.err.println("크기가 0인 텍스트 박스는 썸네일 렌더링에서 제외됩니다.");
                    continue; // 다음 텍스트 박스로 넘어감
                }

                // 3. 폰트 설정
                String fontFamily = styles.path("fontFamily").asText("Arial");
                String fontSizeStr = styles.path("fontSize").asText("12px").replaceAll("px", "");
                int fontWeight = styles.path("fontWeight").asText("normal").equals("bold") ? Font.BOLD : Font.PLAIN;
                
                double fontSize = Double.parseDouble(fontSizeStr);
                double scaleRatio = (double)THUMB_WIDTH / 786.0;
                float scaledFontSize = (float) (fontSize * scaleRatio);

                Font font = new Font(fontFamily, fontWeight, (int)Math.max(1, scaledFontSize));
                g2d.setFont(font);

                // 4. 색상 설정
                String colorStr = styles.path("color").asText("rgb(0, 0, 0)");
                String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
                if (rgb.length == 3) {
                    g2d.setColor(new Color(Integer.parseInt(rgb[0]), Integer.parseInt(rgb[1]), Integer.parseInt(rgb[2])));
                }

                AffineTransform textTransform = getTransformFromMatrix(textNode.path("transform").asText("none"));
                AffineTransform savedTextTx = g2d.getTransform();
                try {
                    // ▼▼▼ [핵심 수정 2] 회전 중심점의 Y좌표를 boxHeight를 이용해 정확히 계산 ▼▼▼
                    g2d.translate(boxX + boxWidth / 2.0, boxY + boxHeight / 2.0);
                    g2d.transform(textTransform);

                    FontMetrics fm = g2d.getFontMetrics();
                    String textAlign = styles.path("textAlign").asText("left");
                    
                    String[] lines = text.split("\n");
                    
                    // ▼▼▼ [핵심 수정 3] 텍스트 블록 전체의 세로 위치를 중앙으로 정렬 ▼▼▼
                    int totalTextHeight = fm.getHeight() * lines.length;
                    int currentY = -totalTextHeight / 2 + fm.getAscent(); // 첫 줄의 Y위치

                    for (String line : lines) {
                        int textWidth = fm.stringWidth(line);
                        // X좌표는 박스의 가로 중앙(-boxWidth/2)을 기준으로 정렬
                        int startX = -boxWidth / 2;
                        if ("center".equals(textAlign)) {
                            startX = -textWidth / 2;
                        } else if ("right".equals(textAlign)) {
                            startX = boxWidth / 2 - textWidth;
                        }
                        g2d.drawString(line, startX, currentY);
                        currentY += fm.getHeight(); // 다음 줄로 이동
                    }
                } finally {
                    g2d.setTransform(savedTextTx);
                }
            } catch (Exception e) {
                System.err.println("텍스트박스 렌더링 실패: " + e.getMessage());
                e.printStackTrace();
            }
        }

        g2d.dispose();

        // 최종 썸네일 파일 저장
        String filename = "thumbnail_" + yearbookId + "_" + System.currentTimeMillis() + ".png";
        Path destinationDir = Paths.get(thumbnailPath);
        Files.createDirectories(destinationDir);
        Path destinationFile = destinationDir.resolve(filename);
        
        // PNG로 저장 (투명도 유지)
        ImageIO.write(canvas, "png", destinationFile.toFile());

        return "/thumbnail/" + filename;
    }
    
    /**
     * Base64 문자열 또는 파일 경로를 받아 이미지의 byte 배열을 반환합니다.
     */
    private byte[] getImageBytes(String src) {
        if (src == null || src.isEmpty()) return null;
        
        if (src.startsWith("data:image")) {
            if (src.contains(",")) {
                return Base64.getDecoder().decode(src.split(",", 2)[1]);
            }
        } else {
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
                    // e, f (translate) 값은 회전/크기 변환에만 사용하므로 여기서는 0으로 설정
                    return new AffineTransform(m00, m10, m01, m11, 0, 0);
                }
            } catch (NumberFormatException e) {
                System.err.println("Matrix 파싱 오류: " + transformValue);
            }
        }
        return new AffineTransform(); // 변환이 없으면 기본(단위) 행렬 반환
    }

    private BufferedImage readAndCorrectImageOrientation(byte[] imageBytes) {
        // ... (이 코드는 변경 없이 그대로 유지됩니다) ...
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

        } catch (java.io.IOException e) {
            e.printStackTrace();
            return null;
        }
    }
}