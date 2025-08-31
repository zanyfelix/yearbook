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

        // 배경 렌더링
        String bgPath = root.path("background").asText();
        if (!bgPath.isEmpty() && !bgPath.contains("data:image")) {
            try {
                BufferedImage bgImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + bgPath)));
                g2d.drawImage(bgImage, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, null);
            } catch (Exception e) {
                System.err.println("배경 이미지 로드 실패: " + e.getMessage());
            }
        }

        // 프레임 및 사진 렌더링
        for (JsonNode frameNode : root.path("frames")) {
            Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
            if (theme == null) continue;

            // 프레임 위치와 크기 (썸네일 기준)
            int frameX = (int) Math.round(THUMB_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
            int frameY = (int) Math.round(THUMB_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0));
            int frameWidth = (int) Math.round(THUMB_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
            int frameHeight = (int) Math.round(THUMB_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));

            JsonNode photoNode = frameNode.path("photo");

            // 마스킹된 사진 처리
            if (photoNode != null && photoNode.has("src") && !photoNode.path("src").asText().isEmpty() 
                && theme.getEditMaskPath() != null) {
                
                // 프레임 크기의 임시 캔버스 생성
                BufferedImage frameCanvas = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
                Graphics2D frameG2d = frameCanvas.createGraphics();
                
                // 렌더링 품질 설정
                frameG2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                frameG2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                frameG2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

                try {
                    // 1. 마스크 이미지를 프레임 캔버스에 그리기
                    BufferedImage maskImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditMaskPath())));
                    frameG2d.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);

                    // 2. 마스크 영역에만 그리도록 Composite 설정
                    frameG2d.setComposite(AlphaComposite.SrcIn);

                    // 3. 사진 정보 읽기
                    JsonNode photoPos = photoNode.path("position");
                    JsonNode photoSize = photoNode.path("size");
                    
                    // 사진의 상대 위치와 크기를 픽셀로 변환
                    double photoX = frameWidth * (photoPos.path("left").asDouble() / 100.0);
                    double photoY = frameHeight * (photoPos.path("top").asDouble() / 100.0);
                    double photoWidth = frameWidth * (photoSize.path("width").asDouble() / 100.0);
                    double photoHeight = frameHeight * (photoSize.path("height").asDouble() / 100.0);

                    // 4. Base64 이미지 디코딩
                    String base64Src = photoNode.path("src").asText();
                    if (base64Src.contains(",")) {
                        base64Src = base64Src.split(",")[1];
                    }
                    byte[] imageBytes = Base64.getDecoder().decode(base64Src);
                    // 수정: EXIF 정보를 읽어 이미지를 자동으로 회전시키는 메소드 호출
                    BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);

                    if (photoImage != null) {
                        // 5. Transform 처리
                        String transform = photoNode.path("transform").asText("none");
                        
                        // START: CSS transform(matrix) 처리 로직 수정
                        if (!"none".equals(transform) && transform.contains("matrix")) {
                            AffineTransform savedTransform = frameG2d.getTransform();
                            try {
                                // CSS matrix(a,b,c,d,e,f) 파싱
                                String matrixStr = transform.substring(transform.indexOf("(") + 1, transform.indexOf(")"));
                                String[] values = matrixStr.split(",");
                                
                                if (values.length == 6) {
                                    double a = Double.parseDouble(values[0].trim());
                                    double b = Double.parseDouble(values[1].trim());
                                    double c = Double.parseDouble(values[2].trim());
                                    double d = Double.parseDouble(values[3].trim());
                                    // 수정: e, f 값은 픽셀 값이므로 스케일링하지 않고 그대로 사용합니다.
                                    double e = Double.parseDouble(values[4].trim());
                                    double f = Double.parseDouble(values[5].trim());

                                    // 이하는 CSS transform을 Java Graphics2D에서 정확히 재현하는 로직입니다.
                                    // 1단계: 사진의 원래 위치(top, left)로 좌표계를 이동합니다.
                                    frameG2d.translate(photoX, photoY);
                                    
                                    // 2단계: 변환의 기준점인 사진의 중심으로 좌표계를 이동합니다 (transform-origin: 50% 50% 에뮬레이션).
                                    frameG2d.translate(photoWidth / 2.0, photoHeight / 2.0);
                                    
                                    // 3단계: CSS matrix 값을 이용해 변환(회전, 크기조절 등)을 적용합니다.
                                    frameG2d.transform(new AffineTransform(a, b, c, d, e, f));
                                    
                                    // 4단계: 중심점 이동을 원래대로 되돌립니다.
                                    frameG2d.translate(-photoWidth / 2.0, -photoHeight / 2.0);
                                    
                                    // 5단계: 모든 변환이 적용된 좌표계의 원점(0,0)에 사진을 그립니다.
                                    // 이렇게 하면 사진이 정확한 위치, 크기, 회전값으로 렌더링됩니다.
                                    frameG2d.drawImage(photoImage, 0, 0, (int)Math.round(photoWidth), (int)Math.round(photoHeight), null);
                                } else {
                                     // matrix 형식이 잘못된 경우, 변환 없이 기본 위치에 그립니다.
                                     frameG2d.drawImage(photoImage, (int)Math.round(photoX), (int)Math.round(photoY), (int)Math.round(photoWidth), (int)Math.round(photoHeight), null);
                                }
                            } catch (Exception e) {
                                System.err.println("Transform 파싱 또는 적용 오류: " + e.getMessage());
                                // 오류 발생 시 변환 없이 기본 위치에 그립니다.
                                frameG2d.setTransform(savedTransform); // 오류 전 상태로 복원
                                frameG2d.drawImage(photoImage, (int)Math.round(photoX), (int)Math.round(photoY), (int)Math.round(photoWidth), (int)Math.round(photoHeight), null);
                            } finally {
                                // 어떤 경우에도 Graphics2D 상태를 원래대로 복원하여 다음 객체 렌더링에 영향을 주지 않도록 합니다.
                                frameG2d.setTransform(savedTransform);
                            }
                        } else {
                            // Transform이 없는 경우, 지정된 위치와 크기로 이미지를 그립니다.
                            frameG2d.drawImage(photoImage, (int)Math.round(photoX), (int)Math.round(photoY), (int)Math.round(photoWidth), (int)Math.round(photoHeight), null);
                        }
                        // END: CSS transform(matrix) 처리 로직 수정
                    }
                    
                } catch (Exception e) {
                    System.err.println("사진 처리 오류: " + e.getMessage());
                    e.printStackTrace();
                } finally {
                    frameG2d.dispose();
                }

                // 6. 마스킹이 완료된 임시 캔버스를 메인 캔버스에 그리기
                g2d.drawImage(frameCanvas, frameX, frameY, null);
            }

            // 프레임 테두리 이미지를 마지막에 그리기
            try {
                BufferedImage frameImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditPath())));
                g2d.drawImage(frameImage, frameX, frameY, frameWidth, frameHeight, null);
            } catch (Exception e) {
                System.err.println("프레임 이미지 로드 실패: " + e.getMessage());
            }
        }

        // 텍스트박스 렌더링 (선택사항)
        for (JsonNode textNode : root.path("textBoxes")) {
            try {
                // 1. 텍스트 스타일 정보 파싱
                JsonNode styles = textNode.path("styles");
                String html = textNode.path("html").asText("");
                // 간단하게 HTML 태그를 제거 (더 복잡한 파싱이 필요할 수 있음)
                String text = html.replaceAll("<br.*?>", "\n").replaceAll("<.*?>", "");
                
                // 2. 위치 및 크기 계산 (썸네일 기준)
                double leftPercent = textNode.path("position").path("left").asDouble();
                double topPercent = textNode.path("position").path("top").asDouble();
                double widthPercent = textNode.path("size").path("width").asDouble();
                
                int boxX = (int) Math.round(THUMB_WIDTH * (leftPercent / 100.0));
                int boxY = (int) Math.round(THUMB_HEIGHT * (topPercent / 100.0));
                int boxWidth = (int) Math.round(THUMB_WIDTH * (widthPercent / 100.0));

                // 3. 폰트 설정
                String fontFamily = styles.path("fontFamily").asText("Arial");
                String fontSizeStr = styles.path("fontSize").asText("12px").replaceAll("px", "");
                int fontWeight = styles.path("fontWeight").asText("normal").equals("bold") ? Font.BOLD : Font.PLAIN;
                
                // 폰트 크기를 썸네일 비율에 맞게 스케일링 (786px는 웹 편집기의 기준 너비)
                double fontSize = Double.parseDouble(fontSizeStr);
                double scaleRatio = (double)THUMB_WIDTH / 786.0;
                float scaledFontSize = (float) (fontSize * scaleRatio);

                // 서버에 설치된 폰트를 사용하도록 Font 객체 생성
                Font font = new Font(fontFamily, fontWeight, (int)scaledFontSize);
                g2d.setFont(font);

                // 4. 색상 설정
                String colorStr = styles.path("color").asText("rgb(0, 0, 0)");
                // "rgb(r, g, b)" 형식 파싱
                String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
                if (rgb.length == 3) {
                    Color textColor = new Color(Integer.parseInt(rgb[0]), Integer.parseInt(rgb[1]), Integer.parseInt(rgb[2]));
                    g2d.setColor(textColor);
                }

                // 5. Transform(회전 등) 처리
                String transform = textNode.path("transform").asText("none");
                AffineTransform savedTransform = g2d.getTransform();
                if (!"none".equals(transform) && transform.contains("matrix")) {
                    // (사진 Transform 처리 로직과 유사하게 AffineTransform 설정)
                    // 간단한 예시: g2d.rotate(angle, centerX, centerY);
                }
                
                // 6. 텍스트 그리기 (정렬 처리)
                FontMetrics fm = g2d.getFontMetrics();
                String textAlign = styles.path("textAlign").asText("left");
                
                String[] lines = text.split("\n");
                int currentY = boxY + fm.getAscent();

                for (String line : lines) {
                    int textWidth = fm.stringWidth(line);
                    int startX = boxX;
                    if ("center".equals(textAlign)) {
                        startX = boxX + (boxWidth - textWidth) / 2;
                    } else if ("right".equals(textAlign)) {
                        startX = boxX + boxWidth - textWidth;
                    }
                    g2d.drawString(line, startX, currentY);
                    currentY += fm.getHeight();
                }
                
                g2d.setTransform(savedTransform); // Transform 복원

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
    
 // START: 이미지 자동 회전을 위한 헬퍼 메소드 (클래스 내부에 추가)
    private BufferedImage readAndCorrectImageOrientation(byte[] imageBytes) {
        try {
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (originalImage == null) return null;

            int orientation = 1; // 기본값: 정상 방향
            try {
                com.drew.metadata.Metadata metadata = com.drew.imaging.ImageMetadataReader.readMetadata(new ByteArrayInputStream(imageBytes));
                com.drew.metadata.exif.ExifIFD0Directory directory = metadata.getFirstDirectoryOfType(com.drew.metadata.exif.ExifIFD0Directory.class);
                if (directory != null && directory.containsTag(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION)) {
                    orientation = directory.getInt(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION);
                }
            } catch (Exception e) {
                System.err.println("EXIF 메타데이터를 읽을 수 없습니다: " + e.getMessage());
                return originalImage; // 메타데이터 읽기 실패 시 원본 이미지 반환
            }

            if (orientation <= 1) {
                return originalImage; // 회전 필요 없음
            }

            AffineTransform transform = new AffineTransform();
            int width = originalImage.getWidth();
            int height = originalImage.getHeight();

            switch (orientation) {
                case 2: transform.scale(-1.0, 1.0); transform.translate(-width, 0); break; // 좌우 반전
                case 3: transform.translate(width, height); transform.rotate(Math.PI); break; // 180도 회전
                case 4: transform.scale(1.0, -1.0); transform.translate(0, -height); break; // 상하 반전
                case 5: transform.rotate(Math.PI / 2); transform.scale(1.0, -1.0); break;
                case 6: transform.translate(height, 0); transform.rotate(Math.PI / 2); break; // 오른쪽으로 90도 회전
                case 7: transform.rotate(Math.PI / 2); transform.scale(-1.0, 1.0); transform.translate(-height, 0); break;
                case 8: transform.translate(0, width); transform.rotate(-Math.PI / 2); break; // 왼쪽으로 90도 회전
                default: break;
            }

            AffineTransformOp op = new AffineTransformOp(transform, AffineTransformOp.TYPE_BILINEAR);
            
            BufferedImage rotatedImage;
            if (orientation >= 5 && orientation <= 8) { // 90도 회전 시 너비와 높이가 바뀜
                rotatedImage = new BufferedImage(height, width, originalImage.getType());
            } else {
                rotatedImage = new BufferedImage(width, height, originalImage.getType());
            }

            op.filter(originalImage, rotatedImage);
            return rotatedImage;

        } catch (java.io.IOException e) {
            System.err.println("이미지 처리 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
}