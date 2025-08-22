package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOInvalidTreeException;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import jakarta.annotation.PostConstruct;

@Service
public class JpgRenderingService {

    // --- 상수 및 의존성 주입 (기존과 동일) ---
    private static final int RENDER_WIDTH = 2621;
    private static final int RENDER_HEIGHT = 3371;
    private static final double EDIT_WIDTH = 786.0;
    private static final double EDIT_HEIGHT = 1011.0;
    private static final String BASE_IMAGE_PATH = "E:/spring-tools-for-eclipse-4.30.0.RELEASE-e4.35.0-win32.win32.x86_64/workspace/yearbook/src/main/resources/static/";
    private static final String SUFFIX_ORIGINAL = "_B.png";
    private static final String SUFFIX_EDIT = "_M.png";
    
    @Autowired
    private YearbookRepository yearbookRepository;
    @Autowired
    private ThemeRepository themeRepository;
    @Autowired
    private UserRepository userRepository;

    // --- 폰트 객체를 저장할 필드 추가 ---
    private Font funicornFont;

    /**
     * [수정됨] 서비스 초기화 시 커스텀 폰트를 로드하는 메서드
     */
    @PostConstruct
    public void loadCustomFont() {
        // Funicorn.ttf 폰트 파일을 classpath에서 읽어옵니다.
        try (InputStream fontStream = getClass().getClassLoader().getResourceAsStream("static/images/template/13/Font/Funicorn.ttf")) {
            if (fontStream == null) {
                System.err.println("Font 'Funicorn.ttf' not found in classpath!");
                return;
            }
            // 스트림으로부터 Font 객체 생성
            Font baseFont = Font.createFont(Font.TRUETYPE_FONT, fontStream);
            // 자바 그래픽 환경에 폰트 등록
            GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
            ge.registerFont(baseFont);
            // 나중에 사용하기 위해 필드에 저장
            this.funicornFont = baseFont;
             System.out.println("Funicorn font loaded and registered successfully.");
        } catch (IOException | FontFormatException e) {
            e.printStackTrace();
            System.err.println("Failed to load Funicorn font.");
        }
    }
    
    // renderAndSaveImageForUser, saveImageWithDPI, setDPI, getNode 메서드는 기존과 동일

    public File renderAndSaveImageForUser(Long userId, String format) {
        List<Yearbook> pages = yearbookRepository.findByUserIdOrderByPageNoAsc(userId);
        if (pages.isEmpty()) {
            return null;
        }

        try {
            User user = userRepository.findById(userId).orElseThrow();
            String fileName = user.getSchoolName() + "_" + user.getName();
            Yearbook firstPage = pages.get(0);
            
            BufferedImage renderedImage = renderSinglePage(firstPage.getDesignData());
            
            File tempImageFile = File.createTempFile(fileName, "." + format);
            saveImageWithDPI(renderedImage, tempImageFile, format);
            
            return tempImageFile;
            
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    private BufferedImage renderSinglePage(String designDataJson) throws IOException {
        BufferedImage canvas = new BufferedImage(RENDER_WIDTH, RENDER_HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = canvas.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(designDataJson);

        // 배경 및 프레임 렌더링 (기존과 동일)
        String bgEditPath = root.path("background").asText();
        if (!bgEditPath.isEmpty()) {
            String bgOriginalPath = bgEditPath.replace(SUFFIX_EDIT, SUFFIX_ORIGINAL);
            File bgFile = new File(BASE_IMAGE_PATH + bgOriginalPath);
            if (bgFile.exists()) {
                BufferedImage bgImage = ImageIO.read(bgFile);
                g2d.drawImage(bgImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT, null);
            }
        }

        for (JsonNode frameNode : root.path("frames")) {
            Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
            if (theme == null) continue;

            int frameX = (int) (RENDER_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
            int frameWidth = (int) (RENDER_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
            int frameHeight = (int) (RENDER_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));
            int frameY = (int) (RENDER_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0));
            
            BufferedImage finalComposite = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2dComposite = finalComposite.createGraphics();
            
            JsonNode photoNode = frameNode.path("photo");
            if (photoNode != null && photoNode.has("src")) {
                String src = photoNode.path("src").asText();
                if (src != null && !src.isEmpty() && src.contains(",")) {
                    String base64Image = src.split(",", 2)[1];
                    byte[] imageBytes = Base64.getDecoder().decode(base64Image);
                    BufferedImage photoImage = ImageIO.read(new ByteArrayInputStream(imageBytes));

                    if (photoImage != null) {
                        JsonNode photoPos = photoNode.path("position");
                        JsonNode photoSize = photoNode.path("size");
                        int photoX = (int) (frameWidth * (photoPos.path("left").asDouble() / 100.0));
                        int photoY = (int) (frameHeight * (photoPos.path("top").asDouble() / 100.0));
                        int photoWidth = (int) (frameWidth * (photoSize.path("width").asDouble() / 100.0));
                        int photoHeight = (int) (frameHeight * (photoSize.path("height").asDouble() / 100.0));
                        
                        if (theme.getOriginalMaskPath() != null && !theme.getOriginalMaskPath().isEmpty()) {
                            File maskFile = new File(BASE_IMAGE_PATH + theme.getOriginalMaskPath());
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

            String frameOriginalPath = theme.getOriginalPath();
            if (frameOriginalPath != null && !frameOriginalPath.isEmpty()) {
                File frameFile = new File(BASE_IMAGE_PATH + frameOriginalPath);
                if (frameFile.exists()) {
                    BufferedImage frameImage = ImageIO.read(frameFile);
                    g2dComposite.drawImage(frameImage, 0, 0, frameWidth, frameHeight, null);
                }
            }
            g2dComposite.dispose();
            g2d.drawImage(finalComposite, frameX, frameY, frameWidth, frameHeight, null);
        }

        // 3. 텍스트 렌더링
        double scaleY = RENDER_HEIGHT / EDIT_HEIGHT;
        for (JsonNode textBox : root.path("textBoxes")) {
            int boxX = (int) (RENDER_WIDTH * (textBox.path("position").path("left").asDouble() / 100.0));
            int boxHeight = (int) (RENDER_HEIGHT * (textBox.path("size").path("height").asDouble() / 100.0));
            // 텍스트 박스 Y 위치 계산 수정
            int boxY = (int) (RENDER_HEIGHT * (textBox.path("position").path("top").asDouble() / 100.0));

            JsonNode styles = textBox.path("styles");
            String text = textBox.path("html").asText();
            String colorStr = styles.path("color").asText("rgb(0, 0, 0)");
            String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
            Color textColor = new Color(Integer.parseInt(rgb[0]), Integer.parseInt(rgb[1]), Integer.parseInt(rgb[2]));
            
            float fontSize = Float.parseFloat(styles.path("fontSize").asText("12px").replace("px", ""));
            float renderFontSize = (float) (fontSize * scaleY);
            
            // --- [수정됨] 로드된 폰트 적용 ---
            if (this.funicornFont != null) {
                // 저장된 폰트 객체로부터 렌더링할 크기의 폰트 인스턴스 생성
                Font sizedFont = this.funicornFont.deriveFont(renderFontSize);
                g2d.setFont(sizedFont);
            }
            g2d.setColor(textColor);
            // 텍스트 위치를 박스 상단에 맞춤
            g2d.drawString(text, boxX, boxY + renderFontSize); 
        }

        g2d.dispose();
        return canvas;
    }

    private void saveImageWithDPI(BufferedImage image, File file, String format) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName(format).next();
        
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(file)) {
            writer.setOutput(ios);

            ImageWriteParam param = writer.getDefaultWriteParam();
            if (format.equalsIgnoreCase("jpg") || format.equalsIgnoreCase("jpeg")) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(1.0f); // Highest quality
            }

            IIOMetadata metadata = writer.getDefaultImageMetadata(new javax.imageio.ImageTypeSpecifier(image), param);
            setDPI(metadata);

            writer.write(null, new IIOImage(image, null, metadata), param);
        } finally {
            writer.dispose();
        }
    }

    private void setDPI(IIOMetadata metadata) throws IIOInvalidTreeException {
        String nativeMetadataFormat = metadata.getNativeMetadataFormatName();
        if (nativeMetadataFormat == null) return;
        
        IIOMetadataNode root = (IIOMetadataNode) metadata.getAsTree(nativeMetadataFormat);
        IIOMetadataNode jfif = getNode(root, "app0JFIF");

        if (jfif == null) {
            jfif = new IIOMetadataNode("app0JFIF");
            jfif.setAttribute("majorVersion", "1");
            jfif.setAttribute("minorVersion", "1");
            jfif.setAttribute("resUnits", "1"); // 1 = dots per inch
            jfif.setAttribute("Xdensity", "300");
            jfif.setAttribute("Ydensity", "300");
            jfif.setAttribute("thumbWidth", "0");
            jfif.setAttribute("thumbHeight", "0");
            
            IIOMetadataNode markerSequence = getNode(root, "markerSequence");
            if (markerSequence != null) {
                markerSequence.insertBefore(jfif, markerSequence.getFirstChild());
            } else {
                root.appendChild(jfif);
            }
        } else {
            jfif.setAttribute("resUnits", "1");
            jfif.setAttribute("Xdensity", "300");
            jfif.setAttribute("Ydensity", "300");
        }

        metadata.setFromTree(nativeMetadataFormat, root);
    }
    
    private IIOMetadataNode getNode(IIOMetadataNode root, String nodeName) {
        for (int i = 0; i < root.getLength(); i++) {
            if (root.item(i).getNodeName().equalsIgnoreCase(nodeName)) {
                return (IIOMetadataNode) root.item(i);
            }
        }
        for (int i = 0; i < root.getLength(); i++) {
            IIOMetadataNode found = getNode((IIOMetadataNode) root.item(i), nodeName);
            if(found != null) {
                return found;
            }
        }
        return null;
    }
}