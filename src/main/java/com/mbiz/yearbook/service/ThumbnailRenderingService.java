package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.Graphics2D;
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
    private String themePath; // 원본 테마 이미지를 읽기 위한 경로

    @Value("${file.path.thumbnail}")
    private String thumbnailPath; // 생성된 썸네일을 저장할 경로

    @Autowired
    private ThemeRepository themeRepository;

    // 썸네일 이미지 크기 (비율에 맞게 조정)
    private static final int THUMB_WIDTH = 314; // (786 / 2.5)
    private static final int THUMB_HEIGHT = 404; // (1011 / 2.5)

    /**
     * designData JSON을 기반으로 마스킹이 적용된 썸네일 이미지를 생성합니다.
     * @param designDataJson 페이지 디자인 정보
     * @param yearbookId 파일명 생성을 위한 ID
     * @return 웹에서 접근 가능한 저장된 썸네일 경로
     */
    public String generateThumbnail(String designDataJson, Long yearbookId) throws IOException {
    	ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(designDataJson);

        BufferedImage canvas = new BufferedImage(THUMB_WIDTH, THUMB_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = canvas.createGraphics();

        // 배경 렌더링
        String bgPath = root.path("background").asText();
        if (!bgPath.isEmpty()) {
            BufferedImage bgImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + bgPath)));
            g2d.drawImage(bgImage, 0, 0, THUMB_WIDTH, THUMB_HEIGHT, null);
        }

        // 프레임 및 사진 렌더링
        for (JsonNode frameNode : root.path("frames")) {
            Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
            if (theme == null) continue;

            // 프레임의 위치와 크기 (썸네일 기준)
            int frameX = (int) (THUMB_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0));
            int frameY = (int) (THUMB_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0));
            int frameWidth = (int) (THUMB_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0));
            int frameHeight = (int) (THUMB_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0));

            JsonNode photoNode = frameNode.path("photo");

            // ▼▼▼▼▼ 핵심 수정 부분 ▼▼▼▼▼
            // 마스킹을 적용하기 위한 임시 캔버스를 프레임 크기로 생성
            if (photoNode != null && photoNode.has("src") && theme.getEditMaskPath() != null) {
                BufferedImage frameCanvas = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
                Graphics2D frameG2d = frameCanvas.createGraphics();

                // 1. 마스크 이미지를 임시 캔버스에 그린다.
                BufferedImage maskImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditMaskPath())));
                frameG2d.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);

                // 2. Composite를 'SrcIn'으로 설정 (마스크 영역에만 그리도록)
                frameG2d.setComposite(AlphaComposite.SrcIn);

                // 3. JSON에서 사진의 상대 위치와 크기 정보를 읽어온다.
                JsonNode photoPos = photoNode.path("position");
                JsonNode photoSize = photoNode.path("size");
                int photoX = (int) (frameWidth * (photoPos.path("left").asDouble() / 100.0));
                int photoY = (int) (frameHeight * (photoPos.path("top").asDouble() / 100.0));
                int photoWidth = (int) (frameWidth * (photoSize.path("width").asDouble() / 100.0));
                int photoHeight = (int) (frameHeight * (photoSize.path("height").asDouble() / 100.0));

                // 4. Base64 사진을 디코딩하여 위에서 계산한 위치와 크기로 그린다.
                String base64Image = photoNode.path("src").asText().split(",")[1];
                byte[] imageBytes = Base64.getDecoder().decode(base64Image);
                BufferedImage photoImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
                frameG2d.drawImage(photoImage, photoX, photoY, photoWidth, photoHeight, null);

                frameG2d.dispose();

                // 5. 마스킹이 완료된 임시 캔버스를 메인 캔버스에 그린다.
                g2d.drawImage(frameCanvas, frameX, frameY, null);
            }
            // ▲▲▲▲▲ 핵심 수정 부분 ▲▲▲▲▲

            // 프레임 테두리 이미지를 마지막에 그린다.
            BufferedImage frameImage = ImageIO.read(new File(PathUtils.normalizePath(themePath + theme.getEditPath())));
            g2d.drawImage(frameImage, frameX, frameY, frameWidth, frameHeight, null);
        }

        g2d.dispose();

        // 최종 썸네일 파일 저장
        String filename = "thumbnail_" + yearbookId + "_" + System.currentTimeMillis() + ".png";
        Path destinationDir = Paths.get(thumbnailPath);
        Files.createDirectories(destinationDir); // 디렉터리가 없으면 생성
        Path destinationFile = destinationDir.resolve(filename);
        ImageIO.write(canvas, "png", destinationFile.toFile());

        return "/thumbnail/" + filename;
    }
}