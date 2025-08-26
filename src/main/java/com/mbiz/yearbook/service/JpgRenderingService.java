package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataFormatImpl;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.plugins.jpeg.JPEGImageWriteParam;
import javax.imageio.stream.ImageOutputStream;

import org.apache.commons.imaging.formats.jpeg.exif.ExifRewriter;
import org.apache.commons.imaging.formats.tiff.constants.TiffTagConstants;
import org.apache.commons.imaging.formats.tiff.write.TiffOutputDirectory;
import org.apache.commons.imaging.formats.tiff.write.TiffOutputSet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import jakarta.annotation.PostConstruct;

@Service
public class JpgRenderingService {

    // --- 상수 정의 ---
    private static final int RENDER_WIDTH = 2621;  // 고해상도 렌더링 너비 (A4 300DPI 기준)
    private static final int RENDER_HEIGHT = 3371; // 고해상도 렌더링 높이 (A4 300DPI 기준)
    private static final double EDIT_WIDTH = 786.0;   // 편집기 기준 너비
    private static final double EDIT_HEIGHT = 1011.0; // 편집기 기준 높이
    @Value("${file.path.theme}")
    private String themePath;
    private static final String SUFFIX_ORIGINAL = "_B.png";
    private static final String SUFFIX_EDIT = "_M.png";
    
    // DPI 설정 상수
    private static final int TARGET_DPI = 300;
    private static final float JPEG_QUALITY = 1.0f; // 100% 품질 (무손실에 가까운 최고 품질)
    
    // --- 의존성 주입 ---
    @Autowired private YearbookRepository yearbookRepository;
    @Autowired private ThemeRepository themeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ContentsRepository contentsRepository;
    
    private Font funicornFont; // 커스텀 폰트 저장

    /**
     * 서비스 초기화 시 커스텀 폰트를 로드
     */
    @PostConstruct
    public void loadCustomFont() {
        try (InputStream fontStream = getClass().getClassLoader().getResourceAsStream("static/images/template/13/Font/Funicorn.ttf")) {
            if (fontStream == null) {
                System.err.println("Font 'Funicorn.ttf' not found in classpath!");
                return;
            }
            Font baseFont = Font.createFont(Font.TRUETYPE_FONT, fontStream);
            GraphicsEnvironment.getLocalGraphicsEnvironment().registerFont(baseFont);
            this.funicornFont = baseFont;
            System.out.println("Funicorn font loaded and registered successfully.");
        } catch (IOException | FontFormatException e) {
            e.printStackTrace();
            System.err.println("Failed to load Funicorn font.");
        }
    }

    /**
     * 사용자의 모든 페이지를 고해상도로 렌더링하여 폴더 구조로 압축하는 메인 메소드
     */
    public File renderAndZipUserYearbook(Long userId, String format) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Path tempUserDir = Files.createTempDirectory("user_" + userId + "_" + user.getSchoolName());
        Path groupPhotoDir = tempUserDir.resolve("Group Photo");
        Path eventPhotoDir = tempUserDir.resolve("Event Photo");
        Files.createDirectories(groupPhotoDir);
        Files.createDirectories(eventPhotoDir);

        List<Contents> userContents = contentsRepository.findByUserId(user.getId());

        for (Contents content : userContents) {
            List<Yearbook> pages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());
            
            for (Yearbook page : pages) {
                if (page.getDesignData() == null || page.getDesignData().isEmpty()) {
                    continue;
                }

                String fileName = String.format("%s_%03d.%s", 
                                                content.getTitle().replaceAll("[^a-zA-Z0-9.-]", "_"), 
                                                page.getPageNo(), 
                                                format);

                Path targetDir = "group".equalsIgnoreCase(content.getCategory()) ? groupPhotoDir : eventPhotoDir;
                Path finalOutputFile = targetDir.resolve(fileName);

                try {
                    renderAndSaveSinglePageHighQuality(page.getDesignData(), finalOutputFile.toFile(), format);
                } catch (Exception e) {
                    System.err.println("고해상도 페이지 렌더링 실패: Page ID " + page.getId() + ", Error: " + e.getMessage());
                    e.printStackTrace();
                }
            }
        }

        String zipFileName = String.format("%s_yearbook.zip", user.getSchoolName().replaceAll("[^a-zA-Z0-9.-]", "_"));
        File zipFile = new File(System.getProperty("java.io.tmpdir"), zipFileName);

        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipFile))) {
            Files.walk(tempUserDir)
                 .filter(path -> !Files.isDirectory(path))
                 .forEach(path -> {
                     try {
                         ZipEntry zipEntry = new ZipEntry(tempUserDir.relativize(path).toString().replace(File.separator, "/"));
                         zos.putNextEntry(zipEntry);
                         Files.copy(path, zos);
                         zos.closeEntry();
                     } catch (IOException e) {
                         e.printStackTrace();
                     }
                 });
        }
        
        // 임시 디렉토리 정리
        Files.walk(tempUserDir)
             .sorted((path1, path2) -> path2.compareTo(path1))
             .forEach(path -> {
                 try {
                     Files.delete(path);
                 } catch (IOException e) {
                     e.printStackTrace();
                 }
             });

        return zipFile;
    }
    
    /**
     * 초고품질 300 DPI로 이미지를 생성하여 저장하는 메소드
     */
    private void renderAndSaveSinglePageHighQuality(String designDataJson, File outputFile, String format) 
            throws IOException {
        
        // 1. 고해상도 이미지 렌더링 (더 높은 품질 설정)
        BufferedImage renderedImage = renderSinglePageHighQuality(designDataJson);

        // 2. 초고품질 JPEG로 저장 (300 DPI, 압축률 0%)
        saveHighQualityJpegWith300DPI(renderedImage, outputFile);
    }

    /**
     * 한 페이지를 초고해상도로 렌더링하는 메소드
     */
    private BufferedImage renderSinglePageHighQuality(String designDataJson) throws IOException {
        // TYPE_INT_ARGB로 변경하여 더 높은 색상 품질 확보
        BufferedImage canvas = new BufferedImage(RENDER_WIDTH, RENDER_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = canvas.createGraphics();
        
        // 최고 품질 렌더링을 위한 모든 힌트 설정
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_DITHERING, RenderingHints.VALUE_DITHER_ENABLE);
        g2d.setRenderingHint(RenderingHints.KEY_ALPHA_INTERPOLATION, RenderingHints.VALUE_ALPHA_INTERPOLATION_QUALITY);
        
        // 흰색 배경
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(designDataJson);

        // 배경 렌더링
        String bgEditPath = root.path("background").asText();
        if (!bgEditPath.isEmpty()) {
            String bgOriginalPath = bgEditPath.replace(SUFFIX_EDIT, SUFFIX_ORIGINAL);
            File bgFile = new File(themePath + bgOriginalPath);
            if (bgFile.exists()) {
                BufferedImage bgImage = ImageIO.read(bgFile);
                g2d.drawImage(bgImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT, null);
            }
        }

        // 프레임 렌더링
        for (JsonNode frameNode : root.path("frames")) {
            Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
            if (theme == null) continue;

            int frameX = (int) (RENDER_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
            int frameY = (int) (RENDER_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0));
            int frameWidth = (int) (RENDER_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
            int frameHeight = (int) (RENDER_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));
            
            BufferedImage finalComposite = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2dComposite = finalComposite.createGraphics();
            
            // 컴포지트에도 고품질 렌더링 힌트 적용
            g2dComposite.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2dComposite.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2dComposite.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            
            JsonNode photoNode = frameNode.path("photo");
            if (photoNode != null && photoNode.has("src")) {
                String src = photoNode.path("src").asText();
                if (src != null && src.contains(",")) {
                    byte[] imageBytes = Base64.getDecoder().decode(src.split(",", 2)[1]);
                    BufferedImage photoImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
                    if (photoImage != null) {
                        int photoX = (int) (frameWidth * (photoNode.path("position").path("left").asDouble() / 100.0));
                        int photoY = (int) (frameHeight * (photoNode.path("position").path("top").asDouble() / 100.0));
                        int photoWidth = (int) (frameWidth * (photoNode.path("size").path("width").asDouble() / 100.0));
                        int photoHeight = (int) (frameHeight * (photoNode.path("size").path("height").asDouble() / 100.0));
                        
                        if (theme.getOriginalMaskPath() != null && !theme.getOriginalMaskPath().isEmpty()) {
                            File maskFile = new File(themePath + theme.getOriginalMaskPath());
                            if(maskFile.exists()){
                                BufferedImage maskImage = ImageIO.read(maskFile);
                                g2dComposite.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);
                                g2dComposite.setComposite(AlphaComposite.SrcIn);
                            }
                        }
                        
                        g2dComposite.drawImage(photoImage, photoX, photoY, photoWidth, photoHeight, null);
                        g2dComposite.setComposite(AlphaComposite.SrcOver);
                    }
                }
            }
            
            if (theme.getOriginalPath() != null && !theme.getOriginalPath().isEmpty()) {
                File frameFile = new File(themePath + theme.getOriginalPath());
                if (frameFile.exists()) {
                    BufferedImage frameImage = ImageIO.read(frameFile);
                    g2dComposite.drawImage(frameImage, 0, 0, frameWidth, frameHeight, null);
                }
            }
            g2dComposite.dispose();
            g2d.drawImage(finalComposite, frameX, frameY, null);
        }

        // 텍스트 렌더링
        double scaleY = RENDER_HEIGHT / EDIT_HEIGHT;
        for (JsonNode textBox : root.path("textBoxes")) {
            int boxX = (int) (RENDER_WIDTH * (textBox.path("position").path("left").asDouble() / 100.0));
            int boxY = (int) (RENDER_HEIGHT * (textBox.path("position").path("top").asDouble() / 100.0));
            JsonNode styles = textBox.path("styles");
            String text = textBox.path("html").asText();
            String colorStr = styles.path("color").asText("rgb(0, 0, 0)");
            String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
            Color textColor = new Color(Integer.parseInt(rgb[0]), Integer.parseInt(rgb[1]), Integer.parseInt(rgb[2]));
            float fontSize = Float.parseFloat(styles.path("fontSize").asText("12px").replace("px", ""));
            float renderFontSize = (float) (fontSize * scaleY);
            
            if (this.funicornFont != null) {
                g2d.setFont(this.funicornFont.deriveFont(renderFontSize));
            }
            g2d.setColor(textColor);
            g2d.drawString(text, boxX, boxY + renderFontSize); 
        }

        g2d.dispose();
        
        // ARGB를 RGB로 변환 (JPEG는 알파 채널을 지원하지 않음)
        BufferedImage rgbImage = new BufferedImage(RENDER_WIDTH, RENDER_HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2dRgb = rgbImage.createGraphics();
        g2dRgb.setColor(Color.WHITE);
        g2dRgb.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
        g2dRgb.drawImage(canvas, 0, 0, null);
        g2dRgb.dispose();
        
        return rgbImage;
    }

    /**
     * 초고품질 JPEG 파일을 300 DPI로 저장하는 완전 새로운 메소드
     * ImageIO 대신 직접 바이트 조작 방식 사용
     */
    private void saveHighQualityJpegWith300DPI(BufferedImage image, File file) throws IOException {
        // Step 1: 먼저 PNG로 저장 (무손실)
        File tempPngFile = new File(file.getParentFile(), "temp_png_" + System.currentTimeMillis() + ".png");
        
        try {
            // PNG로 먼저 저장 (DPI 메타데이터 포함)
            savePngWithDPI(image, tempPngFile, 300);
            
            // Step 2: PNG를 읽어서 JPEG로 변환
            BufferedImage pngImage = ImageIO.read(tempPngFile);
            
            // Step 3: JPEG로 변환하되, 직접 DPI를 바이트 레벨에서 설정
            saveJpegWithManualDPI(pngImage, file);
            
        } finally {
            // 임시 PNG 파일 삭제
            Files.deleteIfExists(tempPngFile.toPath());
        }
    }
    
    /**
     * PNG 파일을 DPI 정보와 함께 저장
     */
    private void savePngWithDPI(BufferedImage image, File file, int dpi) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("png");
        if (!writers.hasNext()) {
            throw new IOException("PNG writer를 찾을 수 없습니다");
        }
        
        ImageWriter writer = writers.next();
        
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(file)) {
            writer.setOutput(ios);
            
            // PNG 메타데이터 설정
            ImageTypeSpecifier typeSpecifier = ImageTypeSpecifier.createFromBufferedImageType(image.getType());
            IIOMetadata metadata = writer.getDefaultImageMetadata(typeSpecifier, writer.getDefaultWriteParam());
            
            if (metadata != null) {
                // PNG pHYs 청크에 DPI 설정
                String formatName = metadata.getNativeMetadataFormatName();
                IIOMetadataNode root = (IIOMetadataNode) metadata.getAsTree(formatName);
                
                IIOMetadataNode pHYs_node = new IIOMetadataNode("pHYs");
                pHYs_node.setAttribute("pixelsPerUnitXAxis", String.valueOf(Math.round(dpi * 39.3701))); // DPI to pixels per meter
                pHYs_node.setAttribute("pixelsPerUnitYAxis", String.valueOf(Math.round(dpi * 39.3701)));
                pHYs_node.setAttribute("unitSpecifier", "meter");
                
                root.appendChild(pHYs_node);
                metadata.setFromTree(formatName, root);
            }
            
            IIOImage iioImage = new IIOImage(image, null, metadata);
            writer.write(iioImage);
            
        } finally {
            writer.dispose();
        }
    }
    
    /**
     * JPEG 저장 시 수동으로 DPI 바이트를 삽입하는 메소드
     */
    private void saveJpegWithManualDPI(BufferedImage image, File file) throws IOException {
        // Step 1: 일단 최고 품질로 JPEG 저장
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IOException("JPEG writer를 찾을 수 없습니다");
        }
        
        ImageWriter writer = writers.next();
        
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            
            // 최고 품질 설정
            JPEGImageWriteParam jpegParams = (JPEGImageWriteParam) writer.getDefaultWriteParam();
            jpegParams.setCompressionMode(JPEGImageWriteParam.MODE_EXPLICIT);
            jpegParams.setCompressionQuality(1.0f); // 100% 품질
            jpegParams.setProgressiveMode(JPEGImageWriteParam.MODE_DISABLED);
            
            IIOImage iioImage = new IIOImage(image, null, null);
            writer.write(null, iioImage, jpegParams);
            
        } finally {
            writer.dispose();
        }
        
        byte[] jpegData = baos.toByteArray();
        
        // Step 2: JPEG 바이트 배열에서 JFIF 세그먼트를 찾아 300 DPI로 수정
        byte[] modifiedJpeg = insertDPIIntoJpeg(jpegData, 300);
        
        // Step 3: 수정된 JPEG를 파일로 저장
        Files.write(file.toPath(), modifiedJpeg);
        
        // Step 4: EXIF로도 한 번 더 DPI 설정 (이중 보장)
        try {
            addExifDpiToFile(file, 300);
        } catch (Exception e) {
            System.err.println("EXIF DPI 추가 실패 (무시): " + e.getMessage());
        }
        
        System.out.println("JPEG 저장 완료: " + file.getName() + 
                         " (크기: " + (file.length() / 1024 / 1024) + "MB, DPI: 300)");
    }
    
    /**
     * JPEG 바이트 배열에 직접 DPI 정보를 삽입
     */
    private byte[] insertDPIIntoJpeg(byte[] jpegData, int dpi) {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        
        try {
            // JPEG SOI 마커 (0xFFD8)
            result.write(jpegData[0]);
            result.write(jpegData[1]);
            
            // JFIF APP0 세그먼트 생성 (300 DPI)
            byte[] app0 = createJFIFApp0Segment(dpi);
            result.write(app0);
            
            // 기존 JPEG 데이터에서 APP0을 건너뛰고 나머지 복사
            int pos = 2;
            
            // 기존 APP0 세그먼트가 있으면 건너뛰기
            if (jpegData.length > 4 && jpegData[2] == (byte)0xFF && jpegData[3] == (byte)0xE0) {
                // APP0 세그먼트 길이 읽기
                int segmentLength = ((jpegData[4] & 0xFF) << 8) | (jpegData[5] & 0xFF);
                pos = 2 + 2 + segmentLength; // SOI + APP0 marker + segment
            }
            
            // 나머지 데이터 복사
            result.write(jpegData, pos, jpegData.length - pos);
            
            return result.toByteArray();
            
        } catch (IOException e) {
            System.err.println("DPI 삽입 실패, 원본 반환: " + e.getMessage());
            return jpegData;
        }
    }
    
    /**
     * JFIF APP0 세그먼트 생성 (300 DPI 설정)
     */
    private byte[] createJFIFApp0Segment(int dpi) {
        ByteArrayOutputStream app0 = new ByteArrayOutputStream();
        
        try {
            // APP0 마커
            app0.write(0xFF);
            app0.write(0xE0);
            
            // 세그먼트 길이 (16 바이트: 길이 2 + JFIF\0 5 + 버전 2 + 단위 1 + DPI 4 + 썸네일 2)
            app0.write(0x00);
            app0.write(0x10);
            
            // JFIF 식별자
            app0.write("JFIF".getBytes("ASCII"));
            app0.write(0x00); // null terminator
            
            // JFIF 버전 (1.02)
            app0.write(0x01); // major version
            app0.write(0x02); // minor version
            
            // 단위 (1 = dots per inch)
            app0.write(0x01);
            
            // X 해상도 (300 DPI)
            app0.write((dpi >> 8) & 0xFF);
            app0.write(dpi & 0xFF);
            
            // Y 해상도 (300 DPI)
            app0.write((dpi >> 8) & 0xFF);
            app0.write(dpi & 0xFF);
            
            // 썸네일 크기 (없음)
            app0.write(0x00);
            app0.write(0x00);
            
        } catch (IOException e) {
            e.printStackTrace();
        }
        
        return app0.toByteArray();
    }
    
    /**
     * 기존 JPEG 파일에 EXIF DPI 정보 추가
     */
    private void addExifDpiToFile(File file, int dpi) throws Exception {
        byte[] imageBytes = Files.readAllBytes(file.toPath());
        
        TiffOutputSet outputSet = new TiffOutputSet();
        TiffOutputDirectory rootDir = outputSet.getOrCreateRootDirectory();
        
        // DPI 정보 설정
        rootDir.add(TiffTagConstants.TIFF_TAG_XRESOLUTION, 
                    new org.apache.commons.imaging.common.RationalNumber(dpi, 1));
        rootDir.add(TiffTagConstants.TIFF_TAG_YRESOLUTION, 
                    new org.apache.commons.imaging.common.RationalNumber(dpi, 1));
        rootDir.add(TiffTagConstants.TIFF_TAG_RESOLUTION_UNIT, (short) 2);
        
        // 임시 파일에 저장
        File tempFile = File.createTempFile("exif_", ".jpg");
        try (FileOutputStream fos = new FileOutputStream(tempFile);
             BufferedOutputStream bos = new BufferedOutputStream(fos)) {
            new ExifRewriter().updateExifMetadataLossless(imageBytes, bos, outputSet);
        }
        
        // 원본 파일 교체
        Files.move(tempFile.toPath(), file.toPath(), 
                  java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }
    
    /**
     * 자식 노드를 찾거나 생성하는 헬퍼 메소드
     */
    private IIOMetadataNode getOrCreateChild(IIOMetadataNode parent, String nodeName) {
        for (int i = 0; i < parent.getLength(); i++) {
            if (parent.item(i).getNodeName().equals(nodeName)) {
                return (IIOMetadataNode) parent.item(i);
            }
        }
        IIOMetadataNode child = new IIOMetadataNode(nodeName);
        parent.appendChild(child);
        return child;
    }
}