package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

@Service
public class PdfRenderingService {

    // --- 상수 정의 ---
    private static final double EDIT_WIDTH = 786.0;
    private static final double EDIT_HEIGHT = 1011.0;
    private static final int RENDER_WIDTH = 2621;
    private static final int RENDER_HEIGHT = 3371;
    private static final String BASE_IMAGE_PATH = "E:/spring-tools-for-eclipse-4.30.0.RELEASE-e4.35.0-win32.win32.x86_64/workspace/yearbook/src/main/resources/static/";
    private static final String SUFFIX_ORIGINAL = "_B.png";
    private static final String SUFFIX_EDIT = "_M.png";

    @Autowired
    private YearbookRepository yearbookRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ThemeRepository themeRepository;

    private PDType0Font funicornFont;

    public File renderAndSavePdfForUser(Long userId) {
        List<Yearbook> pages = yearbookRepository.findByUserIdOrderByPageNoAsc(userId);
        if (pages.isEmpty()) {
            return null;
        }

        File tempPdfFile;
        String schoolName = userRepository.findById(userId).orElseThrow().getSchoolName();
        try {
            tempPdfFile = File.createTempFile(schoolName, ".pdf");
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }

        try (PDDocument document = new PDDocument()) {
            loadFonts(document);
            ObjectMapper objectMapper = new ObjectMapper();

            for (Yearbook pageData : pages) {
                PDPage pdfPage = new PDPage(new PDRectangle(RENDER_WIDTH, RENDER_HEIGHT));
                document.addPage(pdfPage);
                try (PDPageContentStream contentStream = new PDPageContentStream(document, pdfPage)) {
                    renderSinglePage(contentStream, pageData.getDesignData(), objectMapper, document);
                }
            }
            document.save(tempPdfFile);
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
        return tempPdfFile;
    }

    private void loadFonts(PDDocument document) throws IOException {
        try (InputStream fontStream = getClass().getClassLoader()
                .getResourceAsStream("static/images/template/13/Font/Funicorn.ttf")) {
            if (fontStream == null) {
                throw new IOException("Font '13_F_Funicorn.ttf' not found in classpath!");
            }
            this.funicornFont = PDType0Font.load(document, fontStream);
        }
    }

    private void renderSinglePage(PDPageContentStream contentStream, String designDataJson, ObjectMapper mapper,
            PDDocument document) throws IOException {
        JsonNode root = mapper.readTree(designDataJson);

        // 1. 배경 렌더링
        String bgEditPath = root.path("background").asText();
        if (!bgEditPath.isEmpty()) {
            String bgOriginalPath = bgEditPath.replace(SUFFIX_EDIT, SUFFIX_ORIGINAL);
            File bgFile = new File(BASE_IMAGE_PATH + bgOriginalPath);
            if (bgFile.exists()) {
                PDImageXObject pdImage = PDImageXObject.createFromFileByExtension(bgFile, document);
                contentStream.drawImage(pdImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT);
            }
        }

        // 2. 프레임 및 사진 렌더링
        for (JsonNode frameNode : root.path("frames")) {
            Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
            if (theme == null) {
                System.out.println("테마를 찾을 수 없음");
                continue;
            }

            // 프레임 위치/크기 계산 (PDF 기준)
            int frameX = (int) (RENDER_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
            int frameWidth = (int) (RENDER_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
            int frameHeight = (int) (RENDER_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));
            int frameY = RENDER_HEIGHT - (int) (RENDER_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0)) - frameHeight;

            // ✅ translateX/Y 적용 (position과 별도로 저장된 이동 오프셋)
            double translateXPercent = frameNode.path("translateX").asDouble(0);
            double translateYPercent = frameNode.path("translateY").asDouble(0);
            if (translateXPercent != 0 || translateYPercent != 0) {
                frameX += (int) (RENDER_WIDTH * (translateXPercent / 100.0));
                // PDF는 Y축이 반전이므로 translateY는 빼야 함
                frameY -= (int) (RENDER_HEIGHT * (translateYPercent / 100.0));
            }

            System.out.println("=== 프레임 처리 시작 ===");
            System.out.println("프레임 위치: " + frameX + ", " + frameY);
            System.out.println("프레임 크기: " + frameWidth + " x " + frameHeight);

            // 최종 합성 이미지 생성
            BufferedImage finalComposite = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = finalComposite.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

            try {
                // STEP 1: 사진 처리
                boolean hasPhoto = false;
                JsonNode photoNode = frameNode.path("photo");
                if (photoNode != null && photoNode.has("src")) {
                    String src = photoNode.path("src").asText();
                    if (src != null && !src.isEmpty() && src.contains(",")) {
                        try {
                            System.out.println("사진 데이터 발견");
                            
                            // Base64 디코딩
                            String base64Image = src.split(",", 2)[1];
                            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
                            BufferedImage photoImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
                            
                            if (photoImage != null) {
                                System.out.println("사진 이미지 로드 성공: " + photoImage.getWidth() + "x" + photoImage.getHeight());
                                
                                // 사진 위치/크기 계산
                                JsonNode photoPos = photoNode.path("position");
                                JsonNode photoSize = photoNode.path("size");
                                int photoX = (int) (frameWidth * (photoPos.path("left").asDouble() / 100.0));
                                int photoY = (int) (frameHeight * (photoPos.path("top").asDouble() / 100.0));
                                int photoWidth = (int) (frameWidth * (photoSize.path("width").asDouble() / 100.0));
                                int photoHeight = (int) (frameHeight * (photoSize.path("height").asDouble() / 100.0));
                                
                                System.out.println("사진 위치(상대): " + photoX + ", " + photoY);
                                System.out.println("사진 크기: " + photoWidth + " x " + photoHeight);
                                
                                // 마스크가 있는 경우
                                if (theme.getOriginalMaskPath() != null && !theme.getOriginalMaskPath().isEmpty()) {
                                    System.out.println("마스크 경로: " + theme.getOriginalMaskPath());
                                    File maskFile = new File(BASE_IMAGE_PATH + theme.getOriginalMaskPath());
                                    
                                    if (maskFile.exists()) {
                                        System.out.println("마스크 파일 존재함");
                                        
                                        // 마스크 이미지를 먼저 그림 (배경으로)
                                        BufferedImage maskImage = ImageIO.read(maskFile);
                                        g2d.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);
                                        
                                        // SrcIn 모드로 변경 - 마스크의 불투명한 부분에만 사진이 그려짐
                                        g2d.setComposite(AlphaComposite.SrcIn);
                                        
                                        // 사진 그리기
                                        g2d.setClip(0, 0, frameWidth, frameHeight);
                                        g2d.drawImage(photoImage, photoX, photoY, photoWidth, photoHeight, null);
                                        
                                        // 다시 기본 모드로 복원
                                        g2d.setComposite(AlphaComposite.SrcOver);
                                        g2d.setClip(null);
                                        
                                        hasPhoto = true;
                                        System.out.println("마스킹된 사진 그리기 완료");
                                    } else {
                                        System.out.println("마스크 파일이 존재하지 않음: " + maskFile.getAbsolutePath());
                                    }
                                } else {
                                    // 마스크가 없는 경우 - 사진을 그대로 그림
                                    System.out.println("마스크 없음 - 사진을 직접 그림");
                                    g2d.setClip(0, 0, frameWidth, frameHeight);
                                    g2d.drawImage(photoImage, photoX, photoY, photoWidth, photoHeight, null);
                                    g2d.setClip(null);
                                    hasPhoto = true;
                                    System.out.println("사진 그리기 완료");
                                }
                            } else {
                                System.out.println("사진 이미지 디코딩 실패");
                            }
                        } catch (Exception e) {
                            System.err.println("사진 처리 중 오류: " + e.getMessage());
                            e.printStackTrace();
                        }
                    } else {
                        System.out.println("사진 src가 비어있거나 잘못됨");
                    }
                } else {
                    System.out.println("사진 노드가 없음");
                }

                // STEP 2: 프레임 테두리 그리기
                String frameOriginalPath = theme.getOriginalPath();
                if (frameOriginalPath != null && !frameOriginalPath.isEmpty()) {
                    System.out.println("프레임 경로: " + frameOriginalPath);
                    File frameFile = new File(BASE_IMAGE_PATH + frameOriginalPath);
                    if (frameFile.exists()) {
                        BufferedImage frameImage = ImageIO.read(frameFile);
                        g2d.drawImage(frameImage, 0, 0, frameWidth, frameHeight, null);
                        System.out.println("프레임 이미지 그리기 완료");
                    } else {
                        System.out.println("프레임 파일이 존재하지 않음: " + frameFile.getAbsolutePath());
                    }
                } else {
                    System.out.println("프레임 경로가 비어있음");
                }

                // 디버깅용: 이미지가 완전히 투명한지 확인
                boolean hasContent = false;
                for (int y = 0; y < Math.min(10, finalComposite.getHeight()); y++) {
                    for (int x = 0; x < Math.min(10, finalComposite.getWidth()); x++) {
                        int pixel = finalComposite.getRGB(x, y);
                        if ((pixel >> 24) != 0) { // 알파 채널이 0이 아니면
                            hasContent = true;
                            break;
                        }
                    }
                    if (hasContent) break;
                }
                System.out.println("최종 이미지에 내용 있음: " + hasContent);
                
            } finally {
                g2d.dispose();
            }

            // STEP 3: PDF에 그리기
            PDImageXObject finalPdImage = LosslessFactory.createFromImage(document, finalComposite);
            contentStream.drawImage(finalPdImage, frameX, frameY, frameWidth, frameHeight);
            System.out.println("PDF에 최종 이미지 그리기 완료");
            System.out.println("=== 프레임 처리 종료 ===\n");
        }

        // 3. 텍스트 렌더링
        double scaleY = RENDER_HEIGHT / EDIT_HEIGHT;
        for (JsonNode textBox : root.path("textBoxes")) {
            int boxX = (int) (RENDER_WIDTH * (textBox.path("position").path("left").asDouble() / 100.0));
            int boxHeight = (int) (RENDER_HEIGHT * (textBox.path("size").path("height").asDouble() / 100.0));
            int boxY = RENDER_HEIGHT - (int) (RENDER_HEIGHT * (textBox.path("position").path("top").asDouble() / 100.0))
                    - boxHeight;

            JsonNode styles = textBox.path("styles");
            String text = textBox.path("html").asText();
            String colorStr = styles.path("color").asText("rgb(0, 0, 0)");
            String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
            Color textColor = new Color(Integer.parseInt(rgb[0]), Integer.parseInt(rgb[1]), Integer.parseInt(rgb[2]));

            float fontSize = Float.parseFloat(styles.path("fontSize").asText("12px").replace("px", ""));
            float renderFontSize = (float) (fontSize * scaleY);

            contentStream.beginText();
            contentStream.setFont(this.funicornFont, renderFontSize);
            contentStream.setNonStrokingColor(textColor);
            contentStream.newLineAtOffset(boxX, boxY + boxHeight - renderFontSize);
            contentStream.showText(text);
            contentStream.endText();
        }
    }
}