package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.plugins.jpeg.JPEGImageWriteParam;
import javax.imageio.stream.ImageOutputStream;

import org.apache.commons.imaging.formats.jpeg.exif.ExifRewriter;
import org.apache.commons.imaging.formats.tiff.constants.TiffTagConstants;
import org.apache.commons.imaging.formats.tiff.write.TiffOutputDirectory;
import org.apache.commons.imaging.formats.tiff.write.TiffOutputSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import com.mbiz.yearbook.util.PathUtils;

import jakarta.annotation.PostConstruct;

/**
 * 고해상도 JPEG 렌더링 서비스 편집기 화면과 정확히 일치하는 실사이즈 출력용 이미지 생성
 */
@Service
public class JpgRenderingService {

	private static final Logger logger = LoggerFactory.getLogger(JpgRenderingService.class);

	// 렌더링 상수 정의
	private static final int RENDER_WIDTH = 2621; // 고해상도 렌더링 너비 (A4 300DPI)
	private static final int RENDER_HEIGHT = 3371; // 고해상도 렌더링 높이 (A4 300DPI)
	private static final double EDIT_WIDTH = 786.0; // 편집기 기준 너비
	private static final double EDIT_HEIGHT = 1011.0; // 편집기 기준 높이
	private static final double SCALE_RATIO = RENDER_WIDTH / EDIT_WIDTH; // 약 3.333...

	// 파일 경로 관련 상수
	private static final String SUFFIX_ORIGINAL = "_B.png";
	private static final String SUFFIX_EDIT = "_M.png";

	// DPI 설정 상수
	private static final int TARGET_DPI = 300;
	private static final float JPEG_QUALITY = 1.0f;

	// 의존성 주입
	@Autowired
	private YearbookRepository yearbookRepository;

	@Autowired
	private ThemeRepository themeRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ContentsRepository contentsRepository;

	@Value("${file.path.theme}")
	private String themePath;

	@Value("${file.path.user-photos}")
	private String userPhotosPath;

	private Map<String, Font> customFonts = new HashMap<>();
	private final ObjectMapper objectMapper = new ObjectMapper();

	/**
	 * 서비스 초기화 시 DB에서 폰트 정보를 로드
	 */
	@PostConstruct
	public void initialize() {
		logger.info("==================================================");
		logger.info("=== JpgRenderingService 초기화 시작 ===");
		logger.info("==================================================");
		logger.info("현재 시간: {}", new Date());
		logger.info("작업 디렉토리: {}", System.getProperty("user.dir"));
		logger.info("themePath 설정값: {}", themePath);
		logger.info("userPhotosPath 설정값: {}", userPhotosPath);

		verifyPaths();
		verifyFontDirectory();
		loadFontsFromDatabase();
		registerSystemFonts();

		logger.info("==================================================");
		logger.info("=== 초기화 완료 - 로드된 폰트: {} 개 ===", customFonts.size());
		logger.info("==================================================");
	}

	/**
	 * 경로 검증
	 */
	private void verifyPaths() {
		logger.info("==============================================");
		logger.info("=== JpgRenderingService 경로 설정 확인 ===");
		logger.info("==============================================");
		logger.info("userPhotosPath: {}", userPhotosPath);

		File photoDir = new File(userPhotosPath);
		if (photoDir.exists()) {
			logger.info("✔ 사진 디렉토리 존재: {}", photoDir.getAbsolutePath());

			File originalsDir = new File(photoDir, "originals");
			File editsDir = new File(photoDir, "edits");

			logger.info("  - originals 디렉토리: {} ({})", originalsDir.exists() ? "존재" : "없음",
					originalsDir.getAbsolutePath());
			logger.info("  - edits 디렉토리: {} ({})", editsDir.exists() ? "존재" : "없음", editsDir.getAbsolutePath());
		} else {
			logger.error("✗ 사진 디렉토리가 존재하지 않음: {}", photoDir.getAbsolutePath());
		}
		logger.info("==============================================");
	}

	/**
	 * 폰트 디렉토리 확인
	 */
	private void verifyFontDirectory() {
		logger.info("=== 폰트 디렉토리 확인 ===");

		String[] possiblePaths = { themePath.replace("/theme", "/fonts"), themePath + "/fonts", "fonts",
				System.getProperty("user.dir") + "/fonts" };

		for (String path : possiblePaths) {
			File dir = new File(path);
			if (dir.exists() && dir.isDirectory()) {
				logger.info("✔ 폰트 디렉토리 발견: {}", dir.getAbsolutePath());
				File[] fontFiles = dir.listFiles(
						(d, name) -> name.toLowerCase().endsWith(".ttf") || name.toLowerCase().endsWith(".otf"));

				if (fontFiles != null && fontFiles.length > 0) {
					logger.info("  폰트 파일 {} 개 발견:", fontFiles.length);
					for (File f : fontFiles) {
						logger.info("    - {} ({} KB)", f.getName(), f.length() / 1024);
					}
				}
			}
		}
	}

	/**
	 * DB의 Theme 테이블에서 폰트 정보를 로드
	 */
	private void loadFontsFromDatabase() {
		try {
			List<Theme> fontThemes = themeRepository.findByCategory("font");
			logger.info("=== 폰트 로딩 시작 ===");
			logger.info("DB에서 가져온 폰트 테마 수: {}", fontThemes.size());

			for (Theme theme : fontThemes) {
				logger.info("폰트 테마: ID={}, Name={}, FontPath={}", theme.getId(), theme.getFilename(),
						theme.getFontPath());

				if (theme.getFontPath() != null && !theme.getFontPath().isEmpty()) {
					boolean success = loadFontFromPath(theme.getFontPath(), theme.getFilename());
					if (success) {
						logger.info("✔ 폰트 로드 성공: {}", theme.getFilename());
					} else {
						logger.error("✗ 폰트 로드 실패: {}", theme.getFilename());
					}
				}
			}

			logger.info("최종 로드된 폰트 목록: {}", customFonts.keySet());

		} catch (Exception e) {
			logger.error("Failed to load fonts from database", e);
		}
	}

	/**
	 * 폰트 파일 경로로부터 폰트 로드
	 */
	private boolean loadFontFromPath(String fontPath, String filename) {
		try {
			logger.info("=== 폰트 로드 시도 ===");
			logger.info("fontPath (DB): {}", fontPath);
			logger.info("filename: {}", filename);

			// 가능한 모든 경로 조합 시도
			String[] pathVariants = { fontPath, fontPath.replace("/fonts/", "fonts/"), themePath + "/" + fontPath,
					themePath + fontPath, themePath + "/" + fontPath.replace("/fonts/", ""),
					System.getProperty("user.dir") + "/" + fontPath,
					System.getProperty("user.dir") + "/" + fontPath.replace("/fonts/", "fonts/"),
					themePath.replace("/theme", "") + fontPath, };

			File fontFile = null;
			for (String path : pathVariants) {
				if (path == null)
					continue;

				String normalizedPath = PathUtils.normalizePath(path);
				File testFile = new File(normalizedPath);

				if (testFile.exists() && testFile.isFile()) {
					fontFile = testFile;
					logger.info("✔ 폰트 파일 발견!");
					logger.info("  최종 경로: {}", testFile.getAbsolutePath());
					break;
				}
			}

			if (fontFile == null) {
				logger.error("❌ 폰트 파일을 찾을 수 없음");
				return false;
			}

			// 폰트 로드
			try (InputStream fontStream = new FileInputStream(fontFile)) {
				Font baseFont = Font.createFont(Font.TRUETYPE_FONT, fontStream);

				// 폰트 등록
				GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
				boolean registered = ge.registerFont(baseFont);
				logger.info("폰트 시스템 등록: {}", registered);

				// 여러 키로 저장
				String cleanName = cleanFontName(filename);

				customFonts.put(filename, baseFont); // 파일명
				customFonts.put(cleanName, baseFont); // 정리된 이름
				customFonts.put(baseFont.getFamily(), baseFont); // 폰트 패밀리
				customFonts.put(baseFont.getName(), baseFont); // 폰트 이름
				customFonts.put(baseFont.getFontName(), baseFont); // 폰트 전체 이름

				// 한글 폰트명 처리
				if (filename.matches(".*[ㄱ-ㅎㅏ-ㅣ가-힣]+.*")) {
					String koreanName = filename.replaceAll("\\.(ttf|otf)$", "");
					customFonts.put(koreanName, baseFont);
				}

				logger.info("✔ 폰트 로드 성공!");
				logger.info("  Font Family: {}", baseFont.getFamily());
				logger.info("  Font Name: {}", baseFont.getName());
				logger.info("  Font Full Name: {}", baseFont.getFontName());

				return true;
			}

		} catch (Exception e) {
			logger.error("폰트 로드 중 예외 발생: {}", fontPath, e);
			return false;
		}
	}

	/**
	 * 파일명에서 폰트 이름 정리
	 */
	private String cleanFontName(String filename) {
		if (filename == null)
			return "Unknown Font";

		return filename.replaceAll("\\.(ttf|otf|woff2?|eot)$", "").replaceAll("^[^a-zA-Z]+", "")
				.replaceAll("[_-]+", " ").trim();
	}

	/**
	 * 시스템 기본 폰트 등록
	 */
	private void registerSystemFonts() {
		// 기본 영문 폰트
		String[] defaultFonts = { "Arial", "Times New Roman", "Helvetica", "Verdana" };
		for (String fontName : defaultFonts) {
			Font font = new Font(fontName, Font.PLAIN, 12);
			if (!font.getFamily().equals(Font.DIALOG)) {
				customFonts.put(fontName, font);
			}
		}

		// 한글 폰트 추가
		String[] koreanFonts = { "맑은 고딕", "Malgun Gothic", "나눔고딕", "NanumGothic" };
		for (String fontName : koreanFonts) {
			Font font = new Font(fontName, Font.PLAIN, 12);
			if (!font.getFamily().equals(Font.DIALOG) && canDisplayKorean(font)) {
				customFonts.put(fontName, font);
				logger.info("한글 폰트 등록: {}", fontName);
			}
		}
	}

	/**
	 * Transform 문자열 파싱 유틸리티 클래스
	 */
	private static class TransformParser {
		double a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0;
		double rotation = 0;
		double scaleX = 1, scaleY = 1;

		static TransformParser parse(String transform) {
			TransformParser parser = new TransformParser();
			if (transform == null || "none".equals(transform)) {
				return parser;
			}

			Pattern matrixPattern = Pattern.compile("matrix\\(([^)]+)\\)");
			Matcher matcher = matrixPattern.matcher(transform);

			if (matcher.find()) {
				String[] values = matcher.group(1).split(",");
				if (values.length >= 4) {
					parser.a = Double.parseDouble(values[0].trim());
					parser.b = Double.parseDouble(values[1].trim());
					parser.c = Double.parseDouble(values[2].trim());
					parser.d = Double.parseDouble(values[3].trim());

					if (values.length >= 6) {
						// tx, ty는 편집기 좌표계 값이므로 스케일 적용하지 않음
						parser.tx = Double.parseDouble(values[4].trim());
						parser.ty = Double.parseDouble(values[5].trim());
					}

					parser.rotation = Math.atan2(parser.b, parser.a);
					parser.scaleX = Math.sqrt(parser.a * parser.a + parser.b * parser.b);
					parser.scaleY = Math.sqrt(parser.c * parser.c + parser.d * parser.d);

					if (parser.a < 0)
						parser.scaleX = -parser.scaleX;
					if (parser.d < 0)
						parser.scaleY = -parser.scaleY;
				}
			}
			return parser;
		}
	}

	/**
	 * 사용자의 모든 페이지를 고해상도로 렌더링하여 압축
	 */
	public File renderAndZipUserYearbook(Long userId, String format) throws IOException {
		logger.info("Starting yearbook rendering for user: {}", userId);

		User user = userRepository.findById(userId)
				.orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

		Path tempUserDir = Files.createTempDirectory("user_" + userId + "_" + user.getSchoolName());
		Path groupPhotoDir = tempUserDir.resolve("Group Photo");
		Path eventPhotoDir = tempUserDir.resolve("Event Photo");
		Files.createDirectories(groupPhotoDir);
		Files.createDirectories(eventPhotoDir);

		List<Contents> userContents = contentsRepository.findByUserId(user.getId());
		int totalRendered = 0;

		for (Contents content : userContents) {
			List<Yearbook> pages = yearbookRepository.findByContentsIdOrderByPageNoAsc(content.getId());

			for (Yearbook page : pages) {
				if (page.getDesignData() == null || page.getDesignData().isEmpty()) {
					continue;
				}

				String fileName = generateFileName(content.getTitle(), page.getPageNo(), format);
				Path targetDir = "group".equalsIgnoreCase(content.getCategory()) ? groupPhotoDir : eventPhotoDir;
				Path finalOutputFile = targetDir.resolve(fileName);

				try {
					renderAndSaveSinglePageHighQuality(page.getDesignData(), finalOutputFile.toFile(), format);
					totalRendered++;
					logger.debug("Successfully rendered page: {}", fileName);
				} catch (Exception e) {
					logger.error("페이지 렌더링 실패: Page ID {}", page.getId(), e);
				}
			}
		}

		logger.info("Total pages rendered: {}", totalRendered);

		String zipFileName = String.format("%s_yearbook.zip", user.getSchoolName().replaceAll("[^a-zA-Z0-9.-]", "_"));
		File zipFile = new File(System.getProperty("java.io.tmpdir"), zipFileName);

		createZipFile(tempUserDir, zipFile);
		cleanupTempDirectory(tempUserDir);

		return zipFile;
	}

	/**
	 * 파일명 생성
	 */
	private String generateFileName(String title, int pageNo, String format) {
		return String.format("%s_%03d.%s", title.replaceAll("[^a-zA-Z0-9.-]", "_"), pageNo, format);
	}

	/**
	 * ZIP 파일 생성
	 */
	private void createZipFile(Path sourceDir, File targetZip) throws IOException {
		try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(targetZip))) {
			Files.walk(sourceDir).filter(path -> !Files.isDirectory(path)).forEach(path -> {
				try {
					String entryName = sourceDir.relativize(path).toString().replace(File.separator, "/");
					ZipEntry zipEntry = new ZipEntry(entryName);
					zos.putNextEntry(zipEntry);
					Files.copy(path, zos);
					zos.closeEntry();
				} catch (IOException e) {
					logger.error("Failed to add file to ZIP: {}", path, e);
				}
			});
		}
	}

	/**
	 * 임시 디렉토리 정리
	 */
	private void cleanupTempDirectory(Path tempDir) {
		try {
			Files.walk(tempDir).sorted((path1, path2) -> path2.compareTo(path1)).forEach(path -> {
				try {
					Files.delete(path);
				} catch (IOException e) {
					logger.warn("Failed to delete temp file: {}", path, e);
				}
			});
		} catch (IOException e) {
			logger.error("Failed to cleanup temp directory: {}", tempDir, e);
		}
	}

	/**
	 * 초고품질 300 DPI로 이미지를 생성하여 저장
	 */
	private void renderAndSaveSinglePageHighQuality(String designDataJson, File outputFile, String format)
			throws IOException {
		BufferedImage renderedImage = null;
		try {
			renderedImage = renderSinglePageHighQuality(designDataJson);
			saveHighQualityJpegWith300DPI(renderedImage, outputFile);
		} finally {
			if (renderedImage != null) {
				renderedImage.flush();
			}
		}
	}

	/**
	 * 한 페이지를 초고해상도로 렌더링하는 핵심 메소드
	 */
	private BufferedImage renderSinglePageHighQuality(String designDataJson) throws IOException {
		BufferedImage canvas = new BufferedImage(RENDER_WIDTH, RENDER_HEIGHT, BufferedImage.TYPE_INT_ARGB);
		Graphics2D g2d = canvas.createGraphics();

		setHighQualityRenderingHints(g2d);

		// 흰색 배경
		g2d.setColor(Color.WHITE);
		g2d.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);

		JsonNode root = objectMapper.readTree(designDataJson);

		// JSON 구조 확인
		logger.info("=== 렌더링 데이터 구조 ===");
		logger.info("background 필드 존재: {}", root.has("background"));
		logger.info("frames 개수: {}", root.path("frames").size());
		logger.info("textBoxes 개수: {}", root.path("textBoxes").size());

		logRenderingSummary(root);

		// 1. 배경 렌더링
		try {
			renderBackground(g2d, root);
		} catch (Exception e) {
			logger.error("배경 렌더링 실패", e);
		}

		// 2. 프레임 렌더링 (사진 포함)
		renderFrames(g2d, root);

		// 3. 텍스트박스 렌더링
		renderTextBoxes(g2d, root);

		g2d.dispose();

		return convertToRGB(canvas);
	}

	/**
	 * 고품질 렌더링 힌트 설정
	 */
	private void setHighQualityRenderingHints(Graphics2D g2d) {
		g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
		g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
		g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
		g2d.setRenderingHint(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_QUALITY);
		g2d.setRenderingHint(RenderingHints.KEY_DITHERING, RenderingHints.VALUE_DITHER_ENABLE);
		g2d.setRenderingHint(RenderingHints.KEY_ALPHA_INTERPOLATION, RenderingHints.VALUE_ALPHA_INTERPOLATION_QUALITY);
		g2d.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
	}

	/**
	 * 배경 이미지 렌더링
	 */
	private void renderBackground(Graphics2D g2d, JsonNode root) throws IOException {
		String bgEditPath = root.path("background").asText();

		logger.info("=== 배경 렌더링 시작 ===");
		logger.info("background 필드값: {}", bgEditPath);

		if (bgEditPath == null || bgEditPath.isEmpty()) {
			logger.warn("배경 경로가 비어있음 - 배경 렌더링 스킵");
			return;
		}

		// _M.png를 _B.png로 교체
		String bgOriginalPath = bgEditPath.replace(SUFFIX_EDIT, SUFFIX_ORIGINAL);
		logger.info("원본 경로로 변환: {}", bgOriginalPath);

		// 경로 조합
		String fullPath;
		if (bgOriginalPath.startsWith("/theme/") && themePath.endsWith("/theme")) {
			String cleanPath = bgOriginalPath.substring(6);
			fullPath = PathUtils.normalizePath(themePath + cleanPath);
		} else if (bgOriginalPath.startsWith("/theme/") && !themePath.endsWith("/theme")) {
			String cleanPath = bgOriginalPath.substring(6);
			fullPath = PathUtils.normalizePath(themePath + "/" + cleanPath);
		} else if (bgOriginalPath.startsWith("/")) {
			fullPath = PathUtils.normalizePath(themePath + bgOriginalPath);
		} else {
			fullPath = PathUtils.normalizePath(themePath + "/" + bgOriginalPath);
		}

		logger.info("최종 전체 경로: {}", fullPath);

		File bgFile = new File(fullPath);
		logger.info("파일 존재 여부: {}", bgFile.exists());

		if (!bgFile.exists()) {
			logger.error("배경 파일을 찾을 수 없음: {}", fullPath);
			return;
		}

		try {
			BufferedImage bgImage = ImageIO.read(bgFile);
			if (bgImage == null) {
				logger.error("배경 이미지 읽기 실패: {}", fullPath);
				return;
			}

			g2d.drawImage(bgImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT, null);
			logger.info("✔ 배경 렌더링 완료: {} (크기: {}x{})", bgFile.getName(), bgImage.getWidth(), bgImage.getHeight());

		} catch (IOException e) {
			logger.error("배경 이미지 로드 중 오류: {}", fullPath, e);
			throw e;
		}
	}

	/**
	 * 프레임 렌더링 - 편집기와 정확히 일치하도록 개선
	 */
	private void renderFrames(Graphics2D g2d, JsonNode root) throws IOException {
		for (JsonNode frameNode : root.path("frames")) {
			Theme theme = themeRepository.findById(frameNode.path("theme").path("id").asLong()).orElse(null);
			if (theme == null)
				continue;

			// 프레임 위치와 크기
			double frameX = RENDER_WIDTH * (frameNode.path("position").path("left").asDouble() / 100.0);
			double frameY = RENDER_HEIGHT * (frameNode.path("position").path("top").asDouble() / 100.0);
			double frameWidth = RENDER_WIDTH * (frameNode.path("size").path("width").asDouble() / 100.0);
			double frameHeight = RENDER_HEIGHT * (frameNode.path("size").path("height").asDouble() / 100.0);

			// 프레임 컴포지트 생성
			BufferedImage frameComposite = new BufferedImage((int) Math.ceil(frameWidth), (int) Math.ceil(frameHeight),
					BufferedImage.TYPE_INT_ARGB);
			Graphics2D g2dFrame = frameComposite.createGraphics();
			setHighQualityRenderingHints(g2dFrame);

			// 투명 배경으로 초기화
			g2dFrame.setComposite(AlphaComposite.Clear);
			g2dFrame.fillRect(0, 0, frameComposite.getWidth(), frameComposite.getHeight());
			g2dFrame.setComposite(AlphaComposite.SrcOver);

			// 1. 사진 처리
			JsonNode photoNode = frameNode.path("photo");
			if (photoNode.has("src")) {
				String src = photoNode.path("src").asText();
				if (!src.isEmpty() && !"null".equals(src)) {
					renderPhotoInFrame(g2dFrame, photoNode, frameComposite.getWidth(), frameComposite.getHeight());
				}
			}

			// 2. 프레임 장식 이미지 오버레이
			if (theme.getOriginalPath() != null && !theme.getOriginalPath().isEmpty()) {
				BufferedImage frameImage = loadThemeImage(theme.getOriginalPath());
				if (frameImage != null) {
					g2dFrame.setComposite(AlphaComposite.SrcOver);
					g2dFrame.drawImage(frameImage, 0, 0, frameComposite.getWidth(), frameComposite.getHeight(), null);
				}
			}

			g2dFrame.dispose();

			// 3. 완성된 프레임을 메인 캔버스에 배치
			drawFrameToCanvas(g2d, frameComposite, frameNode, frameX, frameY, frameWidth, frameHeight);
		}
	}

	/**
	 * 프레임 내 사진 렌더링
	 */
	private void renderPhotoInFrame(Graphics2D g2dFrame, JsonNode photoNode, int frameWidth, int frameHeight) {
		try {
			String src = photoNode.path("src").asText();
			if (src == null || src.isEmpty()) {
				logger.warn("사진 src가 비어있음");
				return;
			}

			logger.debug("사진 렌더링 시작: {}", src);

			// 원본 경로로 변환
			String originalSrc = convertToOriginalPath(src);

			// 이미지 로드
			byte[] imageBytes = loadImageBytes(originalSrc);
			if (imageBytes == null) {
				imageBytes = loadImageBytes(src);
			}
			if (imageBytes == null) {
				logger.error("이미지 로드 실패: {}", src);
				return;
			}

			BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
			if (photoImage == null) {
				logger.error("이미지 디코딩 실패");
				return;
			}

			// 위치와 크기 계산
			JsonNode position = photoNode.path("position");
			JsonNode size = photoNode.path("size");

			double photoX, photoY, photoWidth, photoHeight;

			// main.js 분석: leftPx/topPx가 있으면 픽셀 단위로 저장됨
			if (position.has("leftPx")) {
				// 단순 스케일 적용
				photoX = position.path("leftPx").asDouble() * SCALE_RATIO;
				photoY = position.path("topPx").asDouble() * SCALE_RATIO;
				photoWidth = size.path("widthPx").asDouble() * SCALE_RATIO;
				photoHeight = size.path("heightPx").asDouble() * SCALE_RATIO;

				logger.debug("사진 픽셀 좌표: 원본({}, {}) -> 렌더링({}, {})", position.path("leftPx").asDouble(),
						position.path("topPx").asDouble(), photoX, photoY);
			} else {
				// 퍼센트 단위
				photoX = frameWidth * (position.path("left").asDouble() / 100.0);
				photoY = frameHeight * (position.path("top").asDouble() / 100.0);
				photoWidth = frameWidth * (size.path("width").asDouble() / 100.0);
				photoHeight = frameHeight * (size.path("height").asDouble() / 100.0);
			}

			// Transform은 회전 정보만 포함 (matrix(a,b,c,d,0,0) 형태)
			String photoTransform = photoNode.path("transform").asText("none");

			if (!"none".equals(photoTransform) && !photoTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {

				TransformParser parser = TransformParser.parse(photoTransform);

				if (Math.abs(parser.rotation) > 0.001) {
					Graphics2D g2dRotated = (Graphics2D) g2dFrame.create();
					double centerX = photoX + photoWidth / 2;
					double centerY = photoY + photoHeight / 2;
					g2dRotated.rotate(parser.rotation, centerX, centerY);
					g2dRotated.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight,
							null);
					g2dRotated.dispose();
				} else {
					g2dFrame.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight,
							null);
				}
			} else {
				g2dFrame.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
			}

			logger.debug("✔ 사진 렌더링 완료: 위치({}, {}), 크기({}, {})", photoX, photoY, photoWidth, photoHeight);

		} catch (Exception e) {
			logger.error("사진 렌더링 중 오류", e);
		}
	}

	/**
	 * 텍스트박스 렌더링
	 */
	private void renderTextBoxes(Graphics2D g2d, JsonNode root) {
		for (JsonNode textBox : root.path("textBoxes")) {
			renderSingleTextBoxImproved(g2d, textBox);
		}
	}

	/**
	 * 개선된 개별 텍스트박스 렌더링
	 */
	private void renderSingleTextBoxImproved(Graphics2D g2d, JsonNode textBox) {
		// 디버깅을 위한 상세 로깅
		logger.debug("=== 텍스트박스 렌더링 시작 ===");
		logger.debug("원본 데이터: {}", textBox.toString());

		// 위치와 크기 계산 (퍼센트 -> 픽셀)
		double boxX = RENDER_WIDTH * (textBox.path("position").path("left").asDouble() / 100.0);
		double boxY = RENDER_HEIGHT * (textBox.path("position").path("top").asDouble() / 100.0);
		double boxWidth = RENDER_WIDTH * (textBox.path("size").path("width").asDouble() / 100.0);
		double boxHeight = RENDER_HEIGHT * (textBox.path("size").path("height").asDouble() / 100.0);

		logger.debug("박스 위치: ({}, {}), 크기: ({}, {})", boxX, boxY, boxWidth, boxHeight);

		// 텍스트 내용
		String htmlText = textBox.path("html").asText();
		if (htmlText == null || htmlText.isEmpty()) {
			logger.warn("텍스트가 비어있음");
			return;
		}

		logger.info("원본 HTML 텍스트: {}", htmlText);

		String text = parseHtmlToPlainText(htmlText);
		if (text == null || text.trim().isEmpty()) {
			logger.warn("변환된 텍스트가 비어있음");
			return;
		}

		logger.info("변환된 텍스트: {}", text);

		// 스타일 정보
		JsonNode styles = textBox.path("styles");
		Color textColor = parseColor(styles.path("color").asText("rgb(0, 0, 0)"));
		logger.info("텍스트 색상: {}", textColor);

		String fontFamily = styles.path("fontFamily").asText("Arial");
		logger.info("폰트 패밀리: {}", fontFamily);

		// fontSize - main.js 분석 결과: 저장된 값은 원본 크기
		float baseFontSize = 12;
		JsonNode fontSizeNode = styles.path("fontSize");
		if (fontSizeNode.isNumber()) {
			baseFontSize = (float) fontSizeNode.asDouble();
		} else if (!fontSizeNode.isMissingNode()) {
			String fontSizeStr = fontSizeNode.asText();
			fontSizeStr = fontSizeStr.replace("px", "").trim();
			try {
				baseFontSize = Float.parseFloat(fontSizeStr);
			} catch (NumberFormatException e) {
				logger.warn("fontSize 파싱 실패: {}", fontSizeStr);
			}
		}

		// 스케일 적용
		int renderFontSize = (int) Math.round(baseFontSize * SCALE_RATIO);
		if (renderFontSize < 10) {
			renderFontSize = 10; // 최소 크기를 10으로 상향
		}

		logger.info("폰트 크기: 원본={}, 렌더링={}", baseFontSize, renderFontSize);

		// 폰트 스타일
		String fontWeight = styles.path("fontWeight").asText("normal");
		String fontStyle = styles.path("fontStyle").asText("normal");

		int javaFontStyle = Font.PLAIN;
		if ("bold".equalsIgnoreCase(fontWeight)
				|| (fontWeight.matches("\\d+") && Integer.parseInt(fontWeight) >= 600)) {
			javaFontStyle |= Font.BOLD;
		}
		if ("italic".equalsIgnoreCase(fontStyle)) {
			javaFontStyle |= Font.ITALIC;
		}

		// 폰트 생성
		Font font = getFont(fontFamily, javaFontStyle, renderFontSize);

		// 텍스트 정렬
		String textAlign = styles.path("textAlign").asText("left");
		String verticalAlign = styles.path("verticalAlign").asText("top");

		// Transform 정보
		String transform = textBox.path("transform").asText("none");
		String transformOrigin = textBox.path("transformOrigin").asText("50% 50%");

		logger.debug("Transform: {}", transform);
		logger.debug("TransformOrigin: {}", transformOrigin);

		// Graphics2D 생성
		Graphics2D g2dText = (Graphics2D) g2d.create();
		setHighQualityRenderingHints(g2dText);

		// Transform 적용 - main.js와 동일한 방식
		if (!"none".equals(transform) && !"matrix(1, 0, 0, 1, 0, 0)".equals(transform)) {
			// main.js 분석: CSS transform이 그대로 저장됨
			Pattern matrixPattern = Pattern.compile(
					"matrix\\s*\\(\\s*([^,]+),\\s*([^,]+),\\s*([^,]+),\\s*([^,]+),\\s*([^,]+),\\s*([^)]+)\\s*\\)");
			Matcher matcher = matrixPattern.matcher(transform);

			if (matcher.find()) {
				double a = Double.parseDouble(matcher.group(1).trim());
				double b = Double.parseDouble(matcher.group(2).trim());
				double c = Double.parseDouble(matcher.group(3).trim());
				double d = Double.parseDouble(matcher.group(4).trim());
				double tx = Double.parseDouble(matcher.group(5).trim());
				double ty = Double.parseDouble(matcher.group(6).trim());

				// transformOrigin 파싱
				double[] origin = parseTransformOrigin(transformOrigin, boxWidth, boxHeight);

				// AffineTransform 생성 - CSS와 동일한 순서
				AffineTransform at = new AffineTransform();

				// 1. 박스 위치로 이동
				at.translate(boxX, boxY);

				// 2. transform-origin으로 이동
				at.translate(origin[0], origin[1]);

				// 3. matrix 적용 (tx, ty는 편집기 좌표계 값이므로 그대로 사용)
				at.concatenate(new AffineTransform(a, b, c, d, tx, ty));

				// 4. transform-origin 복원
				at.translate(-origin[0], -origin[1]);

				g2dText.setTransform(at);
			} else {
				g2dText.translate(boxX, boxY);
			}
		} else {
			g2dText.translate(boxX, boxY);
		}

		// 텍스트 렌더링 설정
		g2dText.setFont(font);
		g2dText.setColor(textColor);

		// 한글 렌더링을 위한 추가 힌트
		if (containsKorean(text)) {
			g2dText.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
			g2dText.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
		}

		// 클리핑 영역 설정
		g2dText.setClip(0, 0, (int) boxWidth, (int) boxHeight);

		// 텍스트 렌더링
		renderTextContent(g2dText, text, font, textAlign, verticalAlign, (int) boxWidth, (int) boxHeight);

		g2dText.dispose();
	}

	/**
	 * 텍스트 내용 렌더링 헬퍼 메서드
	 */
	private void renderTextContent(Graphics2D g2d, String text, Font font, String textAlign, String verticalAlign,
			int boxWidth, int boxHeight) {
		FontMetrics fm = g2d.getFontMetrics(font);
		String[] lines = text.split("\n");

		int lineHeight = fm.getHeight();
		int lineSpacing = (int) (lineHeight * 0.2);

		// 전체 텍스트 높이 계산
		int totalHeight = calculateTotalTextHeight(lines, fm, lineSpacing, boxWidth);

		// 시작 Y 위치 계산 (수직 정렬)
		int startY;
		switch (verticalAlign.toLowerCase()) {
		case "middle":
		case "center":
			startY = (boxHeight - totalHeight) / 2 + fm.getAscent();
			break;
		case "bottom":
			startY = boxHeight - totalHeight + fm.getAscent();
			break;
		default:
			startY = fm.getAscent() + 10;
		}

		if (startY < fm.getAscent()) {
			startY = fm.getAscent();
		}

		int currentY = startY;

		for (String line : lines) {
			if (currentY > boxHeight - fm.getDescent())
				break;

			if (line.trim().isEmpty()) {
				currentY += lineHeight / 2;
				continue;
			}

			// Word wrap 처리
			List<String> wrappedLines = wrapText(line, fm, boxWidth - 20);

			for (String wrappedLine : wrappedLines) {
				if (currentY > boxHeight - fm.getDescent())
					break;

				// X 위치 계산 (정렬)
				int textWidth = fm.stringWidth(wrappedLine);
				int textX = 10; // 기본 padding

				switch (textAlign.toLowerCase()) {
				case "center":
					textX = (boxWidth - textWidth) / 2;
					break;
				case "right":
					textX = boxWidth - textWidth - 10;
					break;
				}

				g2d.drawString(wrappedLine, textX, currentY);
				currentY += lineHeight + lineSpacing;
			}
		}
	}

	/**
	 * 전체 텍스트 높이 계산
	 */
	private int calculateTotalTextHeight(String[] lines, FontMetrics fm, int lineSpacing, int boxWidth) {
		int totalHeight = 0;
		for (String line : lines) {
			if (line.trim().isEmpty()) {
				totalHeight += fm.getHeight() / 2;
			} else {
				List<String> wrappedLines = wrapText(line, fm, boxWidth - 20);
				totalHeight += wrappedLines.size() * (fm.getHeight() + lineSpacing);
			}
		}
		return totalHeight;
	}

	/**
	 * 폰트 가져오기 (커스텀 폰트 우선, 대소문자 구분 없이 검색)
	 */
	private Font getFont(String fontFamily, int style, int size) {
		Font baseFont = null;

		logger.info("폰트 요청: family='{}', style={}, size={}", fontFamily, style, size);

		// 1. 커스텀 폰트에서 검색
		if (fontFamily != null && !fontFamily.isEmpty()) {
			baseFont = customFonts.get(fontFamily);

			if (baseFont == null) {
				// 대소문자 무시 검색
				for (Map.Entry<String, Font> entry : customFonts.entrySet()) {
					if (entry.getKey().equalsIgnoreCase(fontFamily)) {
						baseFont = entry.getValue();
						logger.info("폰트 발견: {}", entry.getKey());
						break;
					}
				}
			}
		}

		// 2. 시스템 폰트 시도
		if (baseFont == null) {
			logger.info("커스텀 폰트에서 찾지 못함, 시스템 폰트 시도");
			baseFont = new Font(fontFamily, Font.PLAIN, size);

			// Dialog로 fallback 확인
			if (baseFont.getFamily().equals(Font.DIALOG)) {
				logger.warn("시스템 폰트 실패, 기본 폰트 사용");
				baseFont = new Font("Arial", Font.PLAIN, size);
			}
		}

		// 3. 스타일과 크기 적용
		Font finalFont = baseFont.deriveFont(style, (float) size);

		logger.info("최종 사용 폰트: family={}, canDisplayKorean={}", finalFont.getFamily(), canDisplayKorean(finalFont));

		return finalFont;
	}

	/**
	 * 한글 표시 가능 여부 확인
	 */
	private boolean canDisplayKorean(Font font) {
		// 자음, 모음, 완성형 테스트
		char[] testChars = { 'ㄱ', 'ㅏ', '가', '힣' };
		for (char c : testChars) {
			if (!font.canDisplay(c)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 한글 포함 여부 확인
	 */
	private boolean containsKorean(String text) {
		if (text == null)
			return false;
		return text.matches(".*[ㄱ-ㅎㅏ-ㅣ가-힣]+.*");
	}

	/**
	 * Transform Origin 파싱
	 */
	private double[] parseTransformOrigin(String origin, double width, double height) {
		if (origin == null || origin.isEmpty()) {
			return new double[] { width / 2, height / 2 }; // 기본값 50% 50%
		}

		String[] parts = origin.trim().split("\\s+");
		double x = width / 2, y = height / 2;

		// X 좌표
		if (parts.length >= 1) {
			String xStr = parts[0];
			if (xStr.endsWith("%")) {
				x = width * Double.parseDouble(xStr.replace("%", "")) / 100.0;
			} else if (xStr.endsWith("px")) {
				// px 단위는 편집기 좌표계 기준이므로 스케일 적용
				x = Double.parseDouble(xStr.replace("px", "")) * SCALE_RATIO;
			} else if (xStr.equals("center")) {
				x = width / 2;
			} else if (xStr.equals("left")) {
				x = 0;
			} else if (xStr.equals("right")) {
				x = width;
			}
		}

		// Y 좌표
		if (parts.length >= 2) {
			String yStr = parts[1];
			if (yStr.endsWith("%")) {
				y = height * Double.parseDouble(yStr.replace("%", "")) / 100.0;
			} else if (yStr.endsWith("px")) {
				// px 단위는 편집기 좌표계 기준이므로 스케일 적용
				y = Double.parseDouble(yStr.replace("px", "")) * SCALE_RATIO;
			} else if (yStr.equals("center")) {
				y = height / 2;
			} else if (yStr.equals("top")) {
				y = 0;
			} else if (yStr.equals("bottom")) {
				y = height;
			}
		}

		return new double[] { x, y };
	}

	/**
	 * 이미지 바이트 로드
	 */
	private byte[] loadImageBytes(String src) throws IOException {
		if (src == null || src.isEmpty()) {
			logger.error("이미지 경로가 null이거나 비어있음");
			return null;
		}

		if (src.startsWith("data:image")) {
			// Base64 데이터 처리
			if (src.contains(",")) {
				return Base64.getDecoder().decode(src.split(",", 2)[1]);
			}
		} else {
			// 실제 파일 경로 조합
			String fullPath;

			// /photo/로 시작하는 웹 경로 처리
			if (src.startsWith("/photo/")) {
				String relativePath = src.substring(7);
				fullPath = PathUtils.normalizePath(userPhotosPath + relativePath);
			} else if (src.startsWith("photo/")) {
				String relativePath = src.substring(6);
				fullPath = PathUtils.normalizePath(userPhotosPath + relativePath);
			} else {
				fullPath = PathUtils.normalizePath(userPhotosPath + src);
			}

			File imageFile = new File(fullPath);

			logger.debug("=== 이미지 로드 시도 ===");
			logger.debug("원본 src: {}", src);
			logger.debug("조합된 전체 경로: {}", fullPath);
			logger.debug("파일 존재 여부: {}", imageFile.exists());

			if (imageFile.exists()) {
				logger.debug("파일 크기: {}KB", imageFile.length() / 1024);
				byte[] imageData = Files.readAllBytes(imageFile.toPath());
				logger.debug("이미지 데이터 로드 성공: {} bytes", imageData.length);
				return imageData;
			} else {
				logger.error("파일을 찾을 수 없음: {}", fullPath);
			}
		}
		return null;
	}

	/**
	 * RGB 색상 파싱
	 */
	private Color parseColor(String colorStr) {
		try {
			if (colorStr.startsWith("#")) {
				return Color.decode(colorStr);
			} else if (colorStr.startsWith("rgb")) {
				String[] rgb = colorStr.replaceAll("[^0-9,]", "").split(",");
				return new Color(Integer.parseInt(rgb[0].trim()), Integer.parseInt(rgb[1].trim()),
						Integer.parseInt(rgb[2].trim()));
			}
		} catch (Exception e) {
			logger.warn("색상 파싱 실패: {}, 검정색 사용", colorStr);
		}
		return Color.BLACK;
	}

	/**
	 * ARGB를 RGB로 변환
	 */
	private BufferedImage convertToRGB(BufferedImage argbImage) {
		BufferedImage rgbImage = new BufferedImage(RENDER_WIDTH, RENDER_HEIGHT, BufferedImage.TYPE_INT_RGB);
		Graphics2D g2dRgb = rgbImage.createGraphics();
		g2dRgb.setColor(Color.WHITE);
		g2dRgb.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
		g2dRgb.drawImage(argbImage, 0, 0, null);
		g2dRgb.dispose();
		return rgbImage;
	}

	/**
	 * 초고품질 JPEG 파일을 300 DPI로 저장
	 */
	private void saveHighQualityJpegWith300DPI(BufferedImage image, File file) throws IOException {
		long startTime = System.currentTimeMillis();

		File tempPngFile = new File(file.getParentFile(), "temp_png_" + System.currentTimeMillis() + ".png");

		try {
			savePngWithDPI(image, tempPngFile, 300);
			BufferedImage pngImage = ImageIO.read(tempPngFile);
			saveJpegWithManualDPI(pngImage, file);

			long renderTime = System.currentTimeMillis() - startTime;

			logger.info("=== 고해상도 렌더링 완료 ===");
			logger.info("파일명: {}", file.getName());
			logger.info("이미지 크기: {}x{} pixels", image.getWidth(), image.getHeight());
			logger.info("파일 크기: {:.2f}MB", file.length() / (1024.0 * 1024.0));
			logger.info("DPI: 300");
			logger.info("렌더링 시간: {}ms", renderTime);
			logger.info("예상 인쇄 크기: {:.1f}x{:.1f}cm (A4)", image.getWidth() * 2.54 / 300,
					image.getHeight() * 2.54 / 300);

		} finally {
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

			ImageTypeSpecifier typeSpecifier = ImageTypeSpecifier.createFromBufferedImageType(image.getType());
			IIOMetadata metadata = writer.getDefaultImageMetadata(typeSpecifier, writer.getDefaultWriteParam());

			if (metadata != null) {
				String formatName = metadata.getNativeMetadataFormatName();
				IIOMetadataNode root = (IIOMetadataNode) metadata.getAsTree(formatName);

				IIOMetadataNode pHYs_node = new IIOMetadataNode("pHYs");
				pHYs_node.setAttribute("pixelsPerUnitXAxis", String.valueOf(Math.round(dpi * 39.3701)));
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
	 * JPEG 저장 시 수동으로 DPI 바이트를 삽입
	 */
	private void saveJpegWithManualDPI(BufferedImage image, File file) throws IOException {
		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
		if (!writers.hasNext()) {
			throw new IOException("JPEG writer를 찾을 수 없습니다");
		}

		ImageWriter writer = writers.next();

		try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
			writer.setOutput(ios);

			JPEGImageWriteParam jpegParams = (JPEGImageWriteParam) writer.getDefaultWriteParam();
			jpegParams.setCompressionMode(JPEGImageWriteParam.MODE_EXPLICIT);
			jpegParams.setCompressionQuality(1.0f);
			jpegParams.setProgressiveMode(JPEGImageWriteParam.MODE_DISABLED);

			IIOImage iioImage = new IIOImage(image, null, null);
			writer.write(null, iioImage, jpegParams);

		} finally {
			writer.dispose();
		}

		byte[] jpegData = baos.toByteArray();
		byte[] modifiedJpeg = insertDPIIntoJpeg(jpegData, 300);
		Files.write(file.toPath(), modifiedJpeg);

		try {
			addExifDpiToFile(file, 300);
		} catch (Exception e) {
			logger.warn("EXIF DPI 추가 실패 (무시): {}", e.getMessage());
		}

		logger.info("JPEG 저장 완료: {} (크기: {}MB, DPI: 300)", file.getName(), file.length() / 1024 / 1024);
	}

	/**
	 * JPEG 바이트 배열에 직접 DPI 정보를 삽입
	 */
	private byte[] insertDPIIntoJpeg(byte[] jpegData, int dpi) {
		ByteArrayOutputStream result = new ByteArrayOutputStream();

		try {
			result.write(jpegData[0]);
			result.write(jpegData[1]);

			byte[] app0 = createJFIFApp0Segment(dpi);
			result.write(app0);

			int pos = 2;

			if (jpegData.length > 4 && jpegData[2] == (byte) 0xFF && jpegData[3] == (byte) 0xE0) {
				int segmentLength = ((jpegData[4] & 0xFF) << 8) | (jpegData[5] & 0xFF);
				pos = 2 + 2 + segmentLength;
			}

			result.write(jpegData, pos, jpegData.length - pos);

			return result.toByteArray();

		} catch (IOException e) {
			logger.error("DPI 삽입 실패, 원본 반환: {}", e.getMessage());
			return jpegData;
		}
	}

	/**
	 * JFIF APP0 세그먼트 생성
	 */
	private byte[] createJFIFApp0Segment(int dpi) {
		ByteArrayOutputStream app0 = new ByteArrayOutputStream();

		try {
			app0.write(0xFF);
			app0.write(0xE0);
			app0.write(0x00);
			app0.write(0x10);

			app0.write("JFIF".getBytes("ASCII"));
			app0.write(0x00);

			app0.write(0x01);
			app0.write(0x02);

			app0.write(0x01);

			app0.write((dpi >> 8) & 0xFF);
			app0.write(dpi & 0xFF);

			app0.write((dpi >> 8) & 0xFF);
			app0.write(dpi & 0xFF);

			app0.write(0x00);
			app0.write(0x00);

		} catch (IOException e) {
			logger.error("JFIF APP0 세그먼트 생성 실패", e);
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

		rootDir.add(TiffTagConstants.TIFF_TAG_XRESOLUTION,
				new org.apache.commons.imaging.common.RationalNumber(dpi, 1));
		rootDir.add(TiffTagConstants.TIFF_TAG_YRESOLUTION,
				new org.apache.commons.imaging.common.RationalNumber(dpi, 1));
		rootDir.add(TiffTagConstants.TIFF_TAG_RESOLUTION_UNIT, (short) 2);

		File tempFile = File.createTempFile("exif_", ".jpg");
		try (FileOutputStream fos = new FileOutputStream(tempFile);
				BufferedOutputStream bos = new BufferedOutputStream(fos)) {
			new ExifRewriter().updateExifMetadataLossless(imageBytes, bos, outputSet);
		}

		Files.move(tempFile.toPath(), file.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
	}

	/**
	 * 이미지 자동 회전을 위한 헬퍼 메소드
	 */
	private BufferedImage readAndCorrectImageOrientation(byte[] imageBytes) {
		try {
			BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
			if (originalImage == null)
				return null;

			int orientation = 1;
			try {
				com.drew.metadata.Metadata metadata = com.drew.imaging.ImageMetadataReader
						.readMetadata(new ByteArrayInputStream(imageBytes));
				com.drew.metadata.exif.ExifIFD0Directory directory = metadata
						.getFirstDirectoryOfType(com.drew.metadata.exif.ExifIFD0Directory.class);

				if (directory != null
						&& directory.containsTag(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION)) {
					orientation = directory.getInt(com.drew.metadata.exif.ExifIFD0Directory.TAG_ORIENTATION);
				}
			} catch (Exception e) {
				return originalImage;
			}

			if (orientation <= 1) {
				return originalImage;
			}

			return applyOrientation(originalImage, orientation);

		} catch (IOException e) {
			logger.error("이미지 처리 중 오류 발생", e);
			return null;
		}
	}

	/**
	 * EXIF orientation 값에 따라 이미지 회전 적용
	 */
	private BufferedImage applyOrientation(BufferedImage originalImage, int orientation) {
		AffineTransform transform = new AffineTransform();
		int width = originalImage.getWidth();
		int height = originalImage.getHeight();

		switch (orientation) {
		case 2:
			transform.scale(-1.0, 1.0);
			transform.translate(-width, 0);
			break;
		case 3:
			transform.translate(width, height);
			transform.rotate(Math.PI);
			break;
		case 4:
			transform.scale(1.0, -1.0);
			transform.translate(0, -height);
			break;
		case 5:
			transform.rotate(Math.PI / 2);
			transform.scale(1.0, -1.0);
			break;
		case 6:
			transform.translate(height, 0);
			transform.rotate(Math.PI / 2);
			break;
		case 7:
			transform.rotate(Math.PI / 2);
			transform.scale(-1.0, 1.0);
			transform.translate(-height, 0);
			break;
		case 8:
			transform.translate(0, width);
			transform.rotate(-Math.PI / 2);
			break;
		default:
			return originalImage;
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
	}

	/**
	 * 편집 경로를 원본 경로로 변환
	 */
	private String convertToOriginalPath(String editPath) {
		if (editPath == null)
			return null;

		logger.debug("=== 원본 경로 변환 시작 ===");
		logger.debug("입력 경로: {}", editPath);

		// 이미 원본 경로인 경우
		if (editPath.contains("/originals/")) {
			logger.debug("이미 원본 경로입니다: {}", editPath);
			return editPath;
		}

		// 편집 경로를 원본 경로로 변환
		if (editPath.contains("/edits/")) {
			String baseName = editPath.replace("/edits/", "/originals/").replace("_edit.jpg", "");

			// 가능한 원본 확장자들 확인
			String[] extensions = { ".jpg", ".jpeg", ".png", ".heic" };

			for (String ext : extensions) {
				String testPath = baseName + "_original" + ext;

				// 실제 파일 확인
				String fsPath = testPath;
				if (testPath.startsWith("/photo/")) {
					fsPath = testPath.substring(7);
				}

				String fullPath = PathUtils.normalizePath(userPhotosPath + fsPath);
				File testFile = new File(fullPath);

				if (testFile.exists()) {
					logger.debug("✔ 원본 파일 발견!");
					logger.debug("  경로: {}", testPath);
					logger.debug("  파일 크기: {} MB", testFile.length() / (1024.0 * 1024.0));
					return testPath;
				}
			}

			logger.warn("✗ 원본 파일을 찾을 수 없어 편집 파일 사용: {}", editPath);
		}

		return editPath;
	}

	/**
	 * 렌더링 요약 정보 로깅
	 */
	private void logRenderingSummary(JsonNode root) {
		int frameCount = 0;
		int photoCount = 0;
		int textCount = 0;

		// 프레임과 사진 카운트
		for (JsonNode frameNode : root.path("frames")) {
			frameCount++;
			if (frameNode.path("photo").has("src")) {
				photoCount++;
			}
		}

		// 텍스트박스 카운트
		for (JsonNode textBox : root.path("textBoxes")) {
			if (!textBox.path("html").asText().isEmpty()) {
				textCount++;
			}
		}

		logger.info("=== 페이지 렌더링 요약 ===");
		logger.info("프레임 수: {}", frameCount);
		logger.info("사진 수: {}", photoCount);
		logger.info("텍스트박스 수: {}", textCount);

		if (photoCount == 0) {
			logger.warn("⚠️ 경고: 사진이 하나도 없습니다! 빈 프레임만 렌더링됩니다.");
		}
	}

	/**
	 * 프레임을 캔버스에 그리기
	 */
	private void drawFrameToCanvas(Graphics2D g2d, BufferedImage frameComposite, JsonNode frameNode, double frameX,
			double frameY, double frameWidth, double frameHeight) {
		String frameTransform = frameNode.path("transform").asText("none");

		if (!"none".equals(frameTransform) && !frameTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
			Graphics2D g2dTransformed = (Graphics2D) g2d.create();

			String transformOrigin = frameNode.path("transformOrigin").asText("50% 50%");
			double[] origin = parseTransformOrigin(transformOrigin, frameWidth, frameHeight);
			TransformParser parser = TransformParser.parse(frameTransform);

			if (Math.abs(parser.rotation) > 0.001) {
				double pivotX = frameX + origin[0];
				double pivotY = frameY + origin[1];
				g2dTransformed.rotate(parser.rotation, pivotX, pivotY);
			}

			g2dTransformed.drawImage(frameComposite, (int) Math.round(frameX), (int) Math.round(frameY), null);
			g2dTransformed.dispose();
		} else {
			g2d.drawImage(frameComposite, (int) Math.round(frameX), (int) Math.round(frameY), null);
		}
	}

	/**
	 * 마스크 이미지 로드 헬퍼
	 */
	private BufferedImage loadMaskImage(String maskPath) {
		if (maskPath == null || maskPath.isEmpty())
			return null;

		try {
			String normalizedPath = maskPath;
			if (normalizedPath.startsWith("/theme/")) {
				normalizedPath = normalizedPath.substring(7);
			}

			String[] pathVariants = { themePath + "/" + normalizedPath, themePath + normalizedPath, normalizedPath };

			for (String path : pathVariants) {
				File file = new File(PathUtils.normalizePath(path));
				if (file.exists()) {
					BufferedImage mask = ImageIO.read(file);
					logger.debug("마스크 로드 성공: {}", file.getName());
					return mask;
				}
			}

			logger.warn("마스크 파일을 찾을 수 없음: {}", maskPath);
		} catch (Exception e) {
			logger.error("마스크 로드 실패: {}", maskPath, e);
		}

		return null;
	}

	/**
	 * 테마 이미지 로드 헬퍼
	 */
	private BufferedImage loadThemeImage(String imagePath) {
		if (imagePath == null || imagePath.isEmpty())
			return null;

		try {
			String normalizedPath = imagePath;
			if (normalizedPath.startsWith("/theme/")) {
				normalizedPath = normalizedPath.substring(7);
			}

			String[] pathVariants = { themePath + "/" + normalizedPath, themePath + normalizedPath, normalizedPath };

			for (String path : pathVariants) {
				File file = new File(PathUtils.normalizePath(path));
				if (file.exists()) {
					BufferedImage image = ImageIO.read(file);
					logger.debug("프레임 이미지 로드 성공: {}", file.getName());
					return image;
				}
			}

			logger.warn("프레임 이미지를 찾을 수 없음: {}", imagePath);
		} catch (Exception e) {
			logger.error("프레임 이미지 로드 실패: {}", imagePath, e);
		}

		return null;
	}

	/**
	 * HTML을 평문 텍스트로 변환
	 */
	private String parseHtmlToPlainText(String html) {
		if (html == null || html.isEmpty()) {
			return "";
		}

		try {
			// HTML 디코딩
			html = html.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
					.replace("&quot;", "\"").replace("&#39;", "'");

			// <br> 태그를 줄바꿈으로 변환
			html = html.replaceAll("(?i)<br\\s*/?>", "\n");

			// <p>, <div> 태그 처리
			html = html.replaceAll("(?i)</p>", "\n").replaceAll("(?i)</div>", "\n").replaceAll("(?i)<p[^>]*>", "")
					.replaceAll("(?i)<div[^>]*>", "");

			// 모든 HTML 태그 제거
			html = html.replaceAll("<[^>]*>", "");

			// 연속된 공백 정리
			html = html.replaceAll("\\s+", " ");

			// 연속된 줄바꿈 정리
			html = html.replaceAll("\n\\s*\n", "\n");

			// 앞뒤 공백 제거
			html = html.trim();

			logger.debug("HTML 변환 결과: '{}'", html);

			return html;

		} catch (Exception e) {
			logger.error("HTML 파싱 중 오류", e);
			return html; // 오류 시 원본 반환
		}
	}

	/**
	 * 텍스트 줄바꿈 처리
	 */
	private List<String> wrapText(String text, FontMetrics fm, int maxWidth) {
		List<String> lines = new java.util.ArrayList<>();
		String[] words = text.split(" ");
		StringBuilder currentLine = new StringBuilder();

		for (String word : words) {
			String testLine = currentLine.length() > 0 ? currentLine + " " + word : word;

			if (fm.stringWidth(testLine) <= maxWidth) {
				if (currentLine.length() > 0)
					currentLine.append(" ");
				currentLine.append(word);
			} else {
				if (currentLine.length() > 0) {
					lines.add(currentLine.toString());
					currentLine = new StringBuilder(word);
				} else {
					// 단어가 너무 긴 경우 강제 분할
					lines.add(word);
				}
			}
		}

		if (currentLine.length() > 0) {
			lines.add(currentLine.toString());
		}

		return lines.isEmpty() ? Arrays.asList(text) : lines;
	}
}