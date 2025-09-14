package com.mbiz.yearbook.service;

import java.awt.AlphaComposite;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.RenderingHints;
import java.awt.Shape;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
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
import java.util.Map.Entry;
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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

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

	// --- 렌더링 상수 정의 ---
	private static final int RENDER_WIDTH = 2621; // 고해상도 렌더링 너비 (A4 300DPI)
	private static final int RENDER_HEIGHT = 3371; // 고해상도 렌더링 높이 (A4 300DPI)
	private static final double EDIT_WIDTH = 786.0; // 편집기 기준 너비
	private static final double EDIT_HEIGHT = 1011.0; // 편집기 기준 높이

	// 스케일 비율 (편집기 -> 렌더링)
	private static final double SCALE_RATIO = RENDER_WIDTH / EDIT_WIDTH; // 약 3.33

	// 파일 경로 관련 상수
	private static final String SUFFIX_ORIGINAL = "_B.png";
	private static final String SUFFIX_EDIT = "_M.png";

	// DPI 설정 상수
	private static final int TARGET_DPI = 300;
	private static final float JPEG_QUALITY = 1.0f;

	// --- 의존성 주입 ---
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

		// 경로 확인
		verifyPaths();

		// 폰트 디렉토리 확인
		verifyFontDirectory();

		// 폰트 로드
		loadFontsFromDatabase();
		registerSystemFonts();

		logger.info("==================================================");
		logger.info("=== 초기화 완료 - 로드된 폰트: {} 개 ===", customFonts.size());
		logger.info("==================================================");
	}

	public void verifyPaths() {
		logger.info("==============================================");
		logger.info("=== JpgRenderingService 경로 설정 확인 ===");
		logger.info("==============================================");
		logger.info("userPhotosPath: {}", userPhotosPath);

		File photoDir = new File(userPhotosPath);
		if (photoDir.exists()) {
			logger.info("✓ 사진 디렉토리 존재: {}", photoDir.getAbsolutePath());

			File originalsDir = new File(photoDir, "originals");
			File editsDir = new File(photoDir, "edits");

			logger.info("  - originals 디렉토리: {} ({})", originalsDir.exists() ? "존재" : "없음",
					originalsDir.getAbsolutePath());
			logger.info("  - edits 디렉토리: {} ({})", editsDir.exists() ? "존재" : "없음", editsDir.getAbsolutePath());

			if (originalsDir.exists()) {
				File[] files = originalsDir.listFiles();
				logger.info("  - originals 내 파일 수: {}", files != null ? files.length : 0);
				if (files != null && files.length > 0 && files.length <= 5) {
					// 처음 몇 개 파일명만 샘플로 출력
					for (int i = 0; i < Math.min(3, files.length); i++) {
						logger.info("    샘플 파일 {}: {}", i + 1, files[i].getName());
					}
				}
			}

			if (editsDir.exists()) {
				File[] files = editsDir.listFiles();
				logger.info("  - edits 내 파일 수: {}", files != null ? files.length : 0);
			}
		} else {
			logger.error("✗ 사진 디렉토리가 존재하지 않음: {}", photoDir.getAbsolutePath());
			logger.error("  디렉토리를 생성해주세요: {}", photoDir.getAbsolutePath());
		}
		logger.info("==============================================");
	}

	// PathUtils 클래스가 없다면 추가
	private static class InternalPathUtils {
		public static String normalizePath(String path) {
			if (path == null)
				return null;

			// Windows와 Unix 경로 구분자 통일
			String normalized = path.replace('\\', '/');

			// 중복된 구분자 제거
			while (normalized.contains("//")) {
				normalized = normalized.replace("//", "/");
			}

			// Windows 드라이브 문자 처리 (E:/ -> E:/)
			if (normalized.length() > 2 && normalized.charAt(1) == ':') {
				// Windows 경로는 그대로 유지
				return normalized;
			}

			return normalized;
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
						logger.info("✓ 폰트 로드 성공: {}", theme.getFilename());
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

	// 폰트 디렉토리 확인 메서드 추가
	private void verifyFontDirectory() {
		logger.info("=== 폰트 디렉토리 확인 ===");

		String[] possiblePaths = { themePath.replace("/theme", "/fonts"), themePath + "/fonts", "fonts",
				System.getProperty("user.dir") + "/fonts" };

		for (String path : possiblePaths) {
			File dir = new File(path);
			if (dir.exists() && dir.isDirectory()) {
				logger.info("✓ 폰트 디렉토리 발견: {}", dir.getAbsolutePath());
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
	 * 폰트 파일 경로로부터 폰트 로드
	 * 
	 * @return
	 */
	private boolean loadFontFromPath(String fontPath, String filename) {
		try {
			logger.info("=== 폰트 로드 시도 ===");
			logger.info("fontPath (DB): {}", fontPath);
			logger.info("filename: {}", filename);
			logger.info("themePath: {}", themePath);

			// 가능한 모든 경로 조합 시도
			String[] pathVariants = {
					// DB 경로 그대로
					fontPath,

					// /fonts/ 제거
					fontPath.replace("/fonts/", "fonts/"),

					// themePath와 조합
					themePath + "/" + fontPath, themePath + fontPath, themePath + "/" + fontPath.replace("/fonts/", ""),

					// 절대 경로
					System.getProperty("user.dir") + "/" + fontPath,
					System.getProperty("user.dir") + "/" + fontPath.replace("/fonts/", "fonts/"),

					// themePath가 E:/data/theme인 경우
					themePath.replace("/theme", "") + fontPath, // E:/data/fonts/...
			};

			File fontFile = null;
			for (String path : pathVariants) {
				if (path == null)
					continue;

				String normalizedPath = InternalPathUtils.normalizePath(path);
				File testFile = new File(normalizedPath);

				logger.debug("경로 시도: {}", normalizedPath);
				logger.debug("  -> 절대 경로: {}", testFile.getAbsolutePath());
				logger.debug("  -> 존재 여부: {}", testFile.exists());

				if (testFile.exists() && testFile.isFile()) {
					fontFile = testFile;
					logger.info("✓ 폰트 파일 발견!");
					logger.info("  최종 경로: {}", testFile.getAbsolutePath());
					break;
				}
			}

			if (fontFile == null) {
				logger.error("❌ 폰트 파일을 찾을 수 없음");

				// 디렉토리 구조 확인
				File fontsDir = new File(themePath.replace("/theme", "/fonts"));
				if (fontsDir.exists() && fontsDir.isDirectory()) {
					logger.info("폰트 디렉토리 존재: {}", fontsDir.getAbsolutePath());
					File[] files = fontsDir.listFiles();
					if (files != null && files.length > 0) {
						logger.info("폰트 디렉토리 내 파일들:");
						for (int i = 0; i < Math.min(5, files.length); i++) {
							logger.info("  - {}", files[i].getName());
						}
					}
				}

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

				// 한글 폰트명 처리 (예: "맑은 고딕", "나눔고딕" 등)
				if (filename.matches(".*[ㄱ-ㅎㅏ-ㅣ가-힣]+.*")) {
					String koreanName = filename.replaceAll("\\.(ttf|otf)$", "");
					customFonts.put(koreanName, baseFont);
				}

				logger.info("✓ 폰트 로드 성공!");
				logger.info("  Font Family: {}", baseFont.getFamily());
				logger.info("  Font Name: {}", baseFont.getName());
				logger.info("  Font Full Name: {}", baseFont.getFontName());
				logger.info("  저장된 키들: {}",
						Arrays.asList(filename, cleanName, baseFont.getFamily(), baseFont.getName()));

				return true;
			}

		} catch (Exception e) {
			logger.error("폰트 로드 중 예외 발생: {}", fontPath, e);
			e.printStackTrace();
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
		String[] defaultFonts = { "Arial", "Times New Roman", "Helvetica", "Verdana", "Sans-serif" };
		for (String fontName : defaultFonts) {
			Font font = new Font(fontName, Font.PLAIN, 12);
			if (font.getFamily().equals(fontName)) {
				customFonts.put(fontName, font);
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
						// 이동 값은 스케일 적용하지 않음 (이미 적용됨)
						parser.tx = Double.parseDouble(values[4].trim());
						parser.ty = Double.parseDouble(values[5].trim());
					}

					// 회전 각도 계산
					parser.rotation = Math.atan2(parser.b, parser.a);

					// 스케일 계산
					parser.scaleX = Math.sqrt(parser.a * parser.a + parser.b * parser.b);
					parser.scaleY = Math.sqrt(parser.c * parser.c + parser.d * parser.d);
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

	private String generateFileName(String title, int pageNo, String format) {
		return String.format("%s_%03d.%s", title.replaceAll("[^a-zA-Z0-9.-]", "_"), pageNo, format);
	}

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

		BufferedImage renderedImage = renderSinglePageHighQuality(designDataJson);
		saveHighQualityJpegWith300DPI(renderedImage, outputFile);
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

		// 렌더링 전 요약 출력
		logRenderingSummary(root);

		// 1. 배경 렌더링
		try {
			renderBackground(g2d, root);
		} catch (Exception e) {
			logger.error("배경 렌더링 실패", e);
			// 배경 실패해도 계속 진행
		}

		// 2. 프레임 렌더링 (사진 포함)
		renderFrames(g2d, root);

		// 3. 텍스트박스 렌더링
		renderTextBoxes(g2d, root);

		g2d.dispose();

		return convertToRGB(canvas);
	}

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
		logger.info("themePath 설정값: {}", themePath);

		if (bgEditPath == null || bgEditPath.isEmpty()) {
			logger.warn("배경 경로가 비어있음 - 배경 렌더링 스킵");
			return;
		}

		// _M.png를 _B.png로 교체
		String bgOriginalPath = bgEditPath.replace(SUFFIX_EDIT, SUFFIX_ORIGINAL);
		logger.info("편집용 경로: {}", bgEditPath);
		logger.info("원본 경로로 변환: {}", bgOriginalPath);

		// 경로 조합 시 중복 제거
		String fullPath;

		// DB 경로가 /theme/로 시작하고, themePath도 /theme로 끝나는 경우 중복 제거
		if (bgOriginalPath.startsWith("/theme/") && themePath.endsWith("/theme")) {
			// /theme/ 제거하고 조합
			String cleanPath = bgOriginalPath.substring(6); // "/theme" 제거
			fullPath = InternalPathUtils.normalizePath(themePath + cleanPath);
		} else if (bgOriginalPath.startsWith("/theme/") && !themePath.endsWith("/theme")) {
			// themePath에 theme가 없으면 /theme/ 제거
			String cleanPath = bgOriginalPath.substring(6);
			fullPath = InternalPathUtils.normalizePath(themePath + "/" + cleanPath);
		} else if (bgOriginalPath.startsWith("/")) {
			// 절대 경로인 경우
			fullPath = InternalPathUtils.normalizePath(themePath + bgOriginalPath);
		} else {
			// 상대 경로인 경우
			fullPath = InternalPathUtils.normalizePath(themePath + "/" + bgOriginalPath);
		}

		logger.info("최종 전체 경로: {}", fullPath);

		File bgFile = new File(fullPath);
		logger.info("파일 존재 여부: {}", bgFile.exists());

		if (!bgFile.exists()) {
			logger.error("배경 파일을 찾을 수 없음: {}", fullPath);

			// 디렉토리 내용 확인
			File parentDir = bgFile.getParentFile();
			if (parentDir != null && parentDir.exists()) {
				logger.error("디렉토리 {} 내의 파일들:", parentDir.getAbsolutePath());
				File[] files = parentDir.listFiles();
				if (files != null) {
					for (int i = 0; i < Math.min(5, files.length); i++) {
						logger.error("  - {}", files[i].getName());
					}
				}
			}

			// 대체 경로들 시도
			String[] alternativePaths = { bgEditPath, // 원본 편집 경로 그대로
					bgOriginalPath.replace("/theme/", "/"), // theme 중복 제거
					"/" + bgOriginalPath.replaceFirst("^/+", "") // 선행 슬래시 정리
			};

			for (String altPath : alternativePaths) {
				File altFile = new File(InternalPathUtils.normalizePath(themePath + altPath));
				logger.info("대체 경로 시도: {}", altFile.getAbsolutePath());
				if (altFile.exists()) {
					logger.info("대체 경로로 배경 발견!");
					bgFile = altFile;
					break;
				}
			}

			if (!bgFile.exists()) {
				logger.error("모든 경로에서 배경 파일을 찾을 수 없음");
				return;
			}
		}

		try {
			BufferedImage bgImage = ImageIO.read(bgFile);
			if (bgImage == null) {
				logger.error("배경 이미지 읽기 실패: {}", fullPath);
				return;
			}

			g2d.drawImage(bgImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT, null);
			logger.info("✓ 배경 렌더링 완료: {} (크기: {}x{})", bgFile.getName(), bgImage.getWidth(), bgImage.getHeight());

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
					try {
						// 사진 로드
						String originalSrc = convertToOriginalPath(src);
						byte[] imageBytes = loadImageBytes(originalSrc);
						if (imageBytes == null) {
							imageBytes = loadImageBytes(src);
						}

						if (imageBytes != null) {
							BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
							if (photoImage != null) {

								// 사진 위치와 크기 계산
								JsonNode position = photoNode.path("position");
								JsonNode size = photoNode.path("size");

								double photoX, photoY, photoWidth, photoHeight;

								if (position.has("leftPx")) {
									// 픽셀 단위 변환 - 간단하게
									photoX = position.path("leftPx").asDouble() * SCALE_RATIO;
									photoY = position.path("topPx").asDouble() * SCALE_RATIO;
									photoWidth = size.path("widthPx").asDouble() * SCALE_RATIO;
									photoHeight = size.path("heightPx").asDouble() * SCALE_RATIO;
								} else {
									// 퍼센트 단위
									photoX = frameWidth * (position.path("left").asDouble() / 100.0);
									photoY = frameHeight * (position.path("top").asDouble() / 100.0);
									photoWidth = frameWidth * (size.path("width").asDouble() / 100.0);
									photoHeight = frameHeight * (size.path("height").asDouble() / 100.0);
								}

								// 마스크 확인
								BufferedImage maskImage = null;
								if (theme.getOriginalMaskPath() != null && !theme.getOriginalMaskPath().isEmpty()) {
									maskImage = loadMaskImage(theme.getOriginalMaskPath());
								}

								if (maskImage != null) {
									// === 마스크가 있는 경우: 별도 레이어에서 마스킹 ===
									BufferedImage maskedPhoto = new BufferedImage(frameComposite.getWidth(),
											frameComposite.getHeight(), BufferedImage.TYPE_INT_ARGB);
									Graphics2D g2dMasked = maskedPhoto.createGraphics();
									setHighQualityRenderingHints(g2dMasked);

									// 사진 그리기
									drawPhoto(g2dMasked, photoImage, photoNode, photoX, photoY, photoWidth,
											photoHeight);

									// 마스크 적용
									g2dMasked.setComposite(AlphaComposite.DstIn);
									g2dMasked.drawImage(maskImage, 0, 0, frameComposite.getWidth(),
											frameComposite.getHeight(), null);
									g2dMasked.dispose();

									// 마스킹된 사진을 프레임에 그리기
									g2dFrame.drawImage(maskedPhoto, 0, 0, null);

								} else {
									// === 마스크가 없는 경우: 클리핑으로 프레임 영역 제한 ===
									Graphics2D g2dClipped = (Graphics2D) g2dFrame.create();

									// 중요: 프레임 영역으로 클리핑
									g2dClipped.setClip(0, 0, frameComposite.getWidth(), frameComposite.getHeight());

									// 사진 그리기
									drawPhoto(g2dClipped, photoImage, photoNode, photoX, photoY, photoWidth,
											photoHeight);

									g2dClipped.dispose();
								}
							}
						}
					} catch (Exception e) {
						logger.error("사진 렌더링 실패: {}", src, e);
					}
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
	 * 개선된 사진 렌더링 - 스케일 비율 정확히 적용
	 */
	private void renderPhotoImproved(Graphics2D g2d, JsonNode photoNode, Theme theme, int frameWidth, int frameHeight)
			throws IOException {

		String src = photoNode.path("src").asText();
		if (src == null || src.isEmpty()) {
			logger.warn("사진 src가 비어있음 - 사진 없이 프레임만 렌더링됨");
			return;
		}

		logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		logger.info("📸 사진 렌더링 시작");
		logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		logger.info("저장된 경로: {}", src);

		// 원본 경로로 변환
		String originalSrc = convertToOriginalPath(src);
		logger.info("변환된 원본 경로: {}", originalSrc);

		// 원본 이미지 로드 시도
		byte[] imageBytes = loadImageBytes(originalSrc);

		if (imageBytes == null) {
			logger.warn("⚠️ 원본 이미지 로드 실패, 편집용 이미지 시도");
			imageBytes = loadImageBytes(src);

			if (imageBytes == null) {
				logger.error("❌ 이미지를 전혀 로드할 수 없음 - 사진 없이 렌더링됨!");
				return;
			}
		}

		logger.info("✓ 이미지 로드 성공: {} MB", imageBytes.length / (1024.0 * 1024.0));

		BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
		if (photoImage == null) {
			logger.error("❌ 이미지 디코딩 실패");
			return;
		}

		logger.info("✓ 이미지 디코딩 성공: {}x{} pixels", photoImage.getWidth(), photoImage.getHeight());

		// 사진의 위치와 크기 정보 읽기
		JsonNode position = photoNode.path("position");
		JsonNode size = photoNode.path("size");

		double photoX, photoY, photoWidth, photoHeight;

		// 픽셀 단위로 저장된 경우 - 스케일 적용 필요!
		if (position.has("leftPx")) {
			// 편집기 픽셀값을 렌더링 크기로 스케일링
			double frameScaleX = (double) frameWidth / (EDIT_WIDTH * (frameWidth / RENDER_WIDTH * 100) / 100);
			double frameScaleY = (double) frameHeight / (EDIT_HEIGHT * (frameHeight / RENDER_HEIGHT * 100) / 100);

			photoX = position.path("leftPx").asDouble() * frameScaleX;
			photoY = position.path("topPx").asDouble() * frameScaleY;
			photoWidth = size.path("widthPx").asDouble() * frameScaleX;
			photoHeight = size.path("heightPx").asDouble() * frameScaleY;

			logger.debug("사진 위치(픽셀->스케일): 원본({}, {}) -> 스케일({}, {})", position.path("leftPx").asDouble(),
					position.path("topPx").asDouble(), photoX, photoY);
		} else {
			// 퍼센트로 저장된 경우
			photoX = frameWidth * (position.path("left").asDouble() / 100.0);
			photoY = frameHeight * (position.path("top").asDouble() / 100.0);
			photoWidth = frameWidth * (size.path("width").asDouble() / 100.0);
			photoHeight = frameHeight * (size.path("height").asDouble() / 100.0);
		}

		// Transform 정보 처리
		String photoTransform = photoNode.path("transform").asText("none");

		if (!"none".equals(photoTransform) && !photoTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
			Graphics2D g2dPhoto = (Graphics2D) g2d.create();
			TransformParser parser = TransformParser.parse(photoTransform);

			// 회전만 적용 (이동은 이미 position에 포함됨)
			if (parser.rotation != 0) {
				double centerX = photoX + photoWidth / 2;
				double centerY = photoY + photoHeight / 2;
				g2dPhoto.rotate(parser.rotation, centerX, centerY);
				logger.debug("사진 회전 적용: {} radians", parser.rotation);
			}

			g2dPhoto.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
			g2dPhoto.dispose();
		} else {
			g2d.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
		}

		g2d.setComposite(AlphaComposite.SrcOver);

		boolean hasMask = false;
		if (theme.getOriginalMaskPath() != null && !theme.getOriginalMaskPath().isEmpty()) {
			File maskFile = new File(InternalPathUtils.normalizePath(themePath + theme.getOriginalMaskPath()));
			if (maskFile.exists()) {
				hasMask = true;
				BufferedImage maskImage = ImageIO.read(maskFile);

				// 새로운 버퍼에 마스크 적용하여 그리기
				BufferedImage maskedPhoto = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
				Graphics2D g2dMask = maskedPhoto.createGraphics();
				setHighQualityRenderingHints(g2dMask);

				// 먼저 사진을 그리고
				if (!"none".equals(photoTransform) && !photoTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
					TransformParser parser = TransformParser.parse(photoTransform);
					if (parser.rotation != 0) {
						double centerX = photoX + photoWidth / 2;
						double centerY = photoY + photoHeight / 2;
						g2dMask.rotate(parser.rotation, centerX, centerY);
					}
				}
				g2dMask.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);

				// 마스크를 적용
				g2dMask.setComposite(AlphaComposite.DstIn);
				g2dMask.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);
				g2dMask.dispose();

				// 마스크 적용된 이미지를 메인 캔버스에 그리기
				g2d.drawImage(maskedPhoto, 0, 0, null);
			}
		}

		// 마스크가 없는 경우 직접 그리기
		if (!hasMask) {
			if (!"none".equals(photoTransform) && !photoTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
				Graphics2D g2dPhoto = (Graphics2D) g2d.create();
				TransformParser parser = TransformParser.parse(photoTransform);

				if (parser.rotation != 0) {
					double centerX = photoX + photoWidth / 2;
					double centerY = photoY + photoHeight / 2;
					g2dPhoto.rotate(parser.rotation, centerX, centerY);
				}

				g2dPhoto.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
				g2dPhoto.dispose();
			} else {
				g2d.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
			}
		}

		logger.info("✓ 사진 렌더링 완료");
		logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	}

	/**
	 * 개선된 개별 텍스트박스 렌더링
	 */
	private void renderSingleTextBoxImproved(Graphics2D g2d, JsonNode textBox) {
		// 위치와 크기 계산 (퍼센트 -> 픽셀)
		double boxX = RENDER_WIDTH * (textBox.path("position").path("left").asDouble() / 100.0);
		double boxY = RENDER_HEIGHT * (textBox.path("position").path("top").asDouble() / 100.0);
		double boxWidth = RENDER_WIDTH * (textBox.path("size").path("width").asDouble() / 100.0);
		double boxHeight = RENDER_HEIGHT * (textBox.path("size").path("height").asDouble() / 100.0);

		// 텍스트 내용
		String text = textBox.path("html").asText();
		if (text.isEmpty())
			return;

		// HTML 태그 제거
		text = text.replaceAll("<[^>]*>", "");

		// 스타일 정보
		JsonNode styles = textBox.path("styles");

		// 색상 파싱
		Color textColor = parseColor(styles.path("color").asText("rgb(0, 0, 0)"));

		// 폰트 정보
		String fontFamily = styles.path("fontFamily").asText("Arial");

		// fontSize 처리
		float baseFontSize = 12;
		JsonNode fontSizeNode = styles.path("fontSize");
		if (fontSizeNode.isNumber()) {
			baseFontSize = (float) fontSizeNode.asDouble();
		} else if (!fontSizeNode.isMissingNode()) {
			String fontSizeStr = fontSizeNode.asText();
			if (fontSizeStr.endsWith("px")) {
				fontSizeStr = fontSizeStr.replace("px", "");
			}
			try {
				baseFontSize = Float.parseFloat(fontSizeStr);
			} catch (NumberFormatException e) {
				// 기본값 사용
			}
		}

		// 스케일 적용
		int renderFontSize = (int) Math.round(baseFontSize * SCALE_RATIO);

		// 폰트 스타일 - 더 정확한 처리
		String fontWeight = styles.path("fontWeight").asText("normal");
		String fontStyle = styles.path("fontStyle").asText("normal");

		int javaFontStyle = Font.PLAIN;

		// fontWeight 처리 (100-900 또는 normal/bold)
		if (fontWeight.matches("\\d+")) {
			int weight = Integer.parseInt(fontWeight);
			if (weight >= 600) {
				javaFontStyle |= Font.BOLD;
			}
		} else if ("bold".equalsIgnoreCase(fontWeight) || "bolder".equalsIgnoreCase(fontWeight)) {
			javaFontStyle |= Font.BOLD;
		}

		// fontStyle 처리 (italic/oblique)
		if ("italic".equalsIgnoreCase(fontStyle) || "oblique".equalsIgnoreCase(fontStyle)) {
			javaFontStyle |= Font.ITALIC;
		}

		// 폰트 생성
		Font font = getFont(fontFamily, javaFontStyle, renderFontSize);

		logger.debug("폰트 스타일 - Weight: {}, Style: {}, Java Style: {}", fontWeight, fontStyle, javaFontStyle);

		// 텍스트 정렬
		String textAlign = styles.path("textAlign").asText("left");

		// Transform 정보
		String transform = textBox.path("transform").asText("none");
		String transformOrigin = textBox.path("transformOrigin").asText("50% 50%");

		// Graphics2D 생성
		Graphics2D g2dText = (Graphics2D) g2d.create();
		setHighQualityRenderingHints(g2dText);

		// Transform 적용 - 개선된 버전
		if (!"none".equals(transform) && !transform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
			// transformOrigin을 정확히 계산
			double[] origin = parseTransformOrigin(transformOrigin, boxWidth, boxHeight);

			// Transform 파싱
			TransformParser parser = TransformParser.parse(transform);

			// 회전 중심점을 박스의 절대 위치로 계산
			double pivotX = boxX + origin[0];
			double pivotY = boxY + origin[1];

			// Transform 적용
			AffineTransform at = g2dText.getTransform();
			at.translate(pivotX, pivotY); // 회전 중심으로 이동
			at.rotate(parser.rotation); // 회전
			at.translate(-origin[0], -origin[1]); // 원점으로 복귀

			g2dText.setTransform(at);

			logger.debug("텍스트 회전 - 각도: {} rad, 중심: ({}, {})", parser.rotation, pivotX, pivotY);
		} else {
			// 회전 없을 때는 단순 이동
			g2dText.translate(boxX, boxY);
		}

		// 텍스트 렌더링
		g2dText.setFont(font);
		g2dText.setColor(textColor);

		// 텍스트 위치 계산 - 더 정확한 메트릭 사용
		FontMetrics fm = g2dText.getFontMetrics(font);
		FontRenderContext frc = g2dText.getFontRenderContext();

		// 줄바꿈 처리
		String[] lines = text.split("\n");

		// 전체 텍스트 높이 계산
		int totalHeight = lines.length * fm.getHeight();
		int startY = fm.getAscent(); // 첫 줄 시작 위치

		// 수직 정렬 처리 (필요시)
		String verticalAlign = styles.path("verticalAlign").asText("top");
		if ("middle".equals(verticalAlign)) {
			startY = (int) (boxHeight - totalHeight) / 2 + fm.getAscent();
		} else if ("bottom".equals(verticalAlign)) {
			startY = (int) (boxHeight - totalHeight) + fm.getAscent();
		}

		for (int i = 0; i < lines.length; i++) {
			if (lines[i].trim().isEmpty())
				continue;

			// 각 줄의 정확한 바운드 계산
			Rectangle2D bounds = font.getStringBounds(lines[i], frc);

			// X 위치 계산 (정렬 고려)
			int textX = calculateTextXPrecise(lines[i], textAlign, (int) boxWidth, bounds);
			int textY = startY + (i * fm.getHeight());

			g2dText.drawString(lines[i], textX, textY);
		}

		g2dText.dispose();
	}

	// 더 정확한 X 위치 계산
	private int calculateTextXPrecise(String text, String align, int boxWidth, Rectangle2D bounds) {
		int textWidth = (int) bounds.getWidth();
		int padding = 10;

		switch (align.toLowerCase()) {
		case "center":
			return (boxWidth - textWidth) / 2;
		case "right":
			return boxWidth - textWidth - padding;
		case "justify":
			return padding; // justify는 별도 처리 필요
		default: // left
			return padding;
		}
	}

	/**
	 * 폰트 가져오기 (커스텀 폰트 우선, 대소문자 구분 없이 검색)
	 */
	private Font getFont(String fontFamily, int style, int size) {
		Font baseFont = null;

		// 1. 커스텀 폰트 검색
		if (!fontFamily.isEmpty()) {
			baseFont = customFonts.get(fontFamily);

			if (baseFont == null) {
				// 대소문자 구분 없이 검색
				for (Map.Entry<String, Font> entry : customFonts.entrySet()) {
					if (entry.getKey().equalsIgnoreCase(fontFamily)) {
						baseFont = entry.getValue();
						break;
					}
				}
			}
		}

		// 2. 시스템 폰트 시도
		if (baseFont == null) {
			baseFont = new Font(fontFamily, Font.PLAIN, size);
			if (baseFont.getFamily().equals(Font.DIALOG)) {
				baseFont = new Font("Arial", Font.PLAIN, size);
			}
		}

		// 3. 스타일 적용 - deriveFont 사용
		Font styledFont = baseFont.deriveFont(style, (float) size);

		// 4. Bold가 제대로 적용되지 않는 경우 강제 적용
		if ((style & Font.BOLD) != 0 && !styledFont.isBold()) {
			// 일부 폰트는 Bold 스타일이 없을 수 있음
			logger.debug("Bold 스타일 강제 적용 시도");

			// Bold 버전 폰트 찾기
			String boldVariant = fontFamily + " Bold";
			Font boldFont = customFonts.get(boldVariant);

			if (boldFont != null) {
				styledFont = boldFont.deriveFont((float) size);
				if ((style & Font.ITALIC) != 0) {
					styledFont = styledFont.deriveFont(Font.ITALIC);
				}
			}
		}

		logger.debug("최종 폰트 - Family: {}, Bold: {}, Italic: {}, Size: {}", styledFont.getFamily(), styledFont.isBold(),
				styledFont.isItalic(), styledFont.getSize());

		return styledFont;
	}

	/**
	 * 텍스트 정렬에 따른 X 위치 계산
	 */
	private int calculateTextX(String text, String align, int boxWidth, FontMetrics fm) {
		int textWidth = fm.stringWidth(text);
		int padding = 10;

		switch (align) {
		case "center":
			return (boxWidth - textWidth) / 2;
		case "right":
			return boxWidth - textWidth - padding;
		default: // left
			return padding;
		}
	}

	/**
	 * Transform Origin 파싱
	 */
	private double[] parseTransformOrigin(String origin, double width, double height) {
		String[] parts = origin.split(" ");
		double x = 0, y = 0;

		if (parts.length >= 1) {
			if (parts[0].endsWith("%")) {
				x = width * Double.parseDouble(parts[0].replace("%", "")) / 100.0;
			} else if (parts[0].endsWith("px")) {
				x = Double.parseDouble(parts[0].replace("px", ""));
			}
		}

		if (parts.length >= 2) {
			if (parts[1].endsWith("%")) {
				y = height * Double.parseDouble(parts[1].replace("%", "")) / 100.0;
			} else if (parts[1].endsWith("px")) {
				y = Double.parseDouble(parts[1].replace("px", ""));
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
				// /photo/ 제거하고 실제 경로와 조합
				String relativePath = src.substring(7); // "/photo/" 제거
				fullPath = InternalPathUtils.normalizePath(userPhotosPath + relativePath);
			} else if (src.startsWith("photo/")) {
				// photo/로 시작하는 경우
				String relativePath = src.substring(6); // "photo/" 제거
				fullPath = InternalPathUtils.normalizePath(userPhotosPath + relativePath);
			} else {
				// 이미 상대 경로인 경우
				fullPath = PathUtils.normalizePath(userPhotosPath + src);
			}

			File imageFile = new File(fullPath);

			logger.info("=== 이미지 로드 시도 ===");
			logger.info("원본 src: {}", src);
			logger.info("userPhotosPath: {}", userPhotosPath);
			logger.info("조합된 전체 경로: {}", fullPath);
			logger.info("파일 존재 여부: {}", imageFile.exists());

			if (imageFile.exists()) {
				logger.info("파일 크기: {}KB", imageFile.length() / 1024);
				byte[] imageData = Files.readAllBytes(imageFile.toPath());
				logger.info("이미지 데이터 로드 성공: {} bytes", imageData.length);
				return imageData;
			} else {
				logger.error("파일을 찾을 수 없음: {}", fullPath);

				// 디렉토리 내용 확인 (디버깅용)
				File parentDir = imageFile.getParentFile();
				if (parentDir != null && parentDir.exists()) {
					logger.error("디렉토리 {} 내의 파일들:", parentDir.getAbsolutePath());
					File[] files = parentDir.listFiles();
					if (files != null) {
						for (File f : files) {
							logger.error("  - {}", f.getName());
						}
					}
				}
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

			// ✅ 렌더링 결과 상세 로깅
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

	// 새로운 헬퍼 메서드 추가
	private String convertToOriginalPath(String editPath) {
		if (editPath == null)
			return null;

		logger.info("=== 원본 경로 변환 시작 ===");
		logger.info("입력 경로: {}", editPath);

		// 이미 원본 경로인 경우
		if (editPath.contains("/originals/")) {
			logger.info("이미 원본 경로입니다: {}", editPath);
			return editPath;
		}

		// 편집 경로를 원본 경로로 변환
		if (editPath.contains("/edits/")) {
			// UUID 추출 (예: uuid_edit.jpg에서 uuid 부분)
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

				String fullPath = InternalPathUtils.normalizePath(userPhotosPath + fsPath);
				File testFile = new File(fullPath);

				if (testFile.exists()) {
					logger.info("✓ 원본 파일 발견!");
					logger.info("  경로: {}", testPath);
					logger.info("  파일 크기: {} MB", testFile.length() / (1024.0 * 1024.0));
					return testPath;
				}
			}

			logger.warn("✗ 원본 파일을 찾을 수 없어 편집 파일 사용: {}", editPath);
		}

		return editPath;
	}

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

	private void renderPhotoSimplified(Graphics2D g2d, JsonNode photoNode, Theme theme, int frameWidth, int frameHeight)
			throws IOException {

		String src = photoNode.path("src").asText();
		if (src == null || src.isEmpty()) {
			logger.warn("사진 src가 비어있음");
			return;
		}

		logger.info("사진 렌더링 시작: {}", src);

// 원본 경로로 변환
		String originalSrc = convertToOriginalPath(src);

// 이미지 로드
		byte[] imageBytes = loadImageBytes(originalSrc);
		if (imageBytes == null) {
			imageBytes = loadImageBytes(src);
			if (imageBytes == null) {
				logger.error("이미지 로드 실패: {}", src);
				return;
			}
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

		if (position.has("leftPx")) {
// 픽셀 단위로 저장된 경우
			double frameScaleX = (double) frameWidth / (EDIT_WIDTH * (frameWidth / RENDER_WIDTH * 100) / 100);
			double frameScaleY = (double) frameHeight / (EDIT_HEIGHT * (frameHeight / RENDER_HEIGHT * 100) / 100);

			photoX = position.path("leftPx").asDouble() * frameScaleX;
			photoY = position.path("topPx").asDouble() * frameScaleY;
			photoWidth = size.path("widthPx").asDouble() * frameScaleX;
			photoHeight = size.path("heightPx").asDouble() * frameScaleY;
		} else {
// 퍼센트로 저장된 경우
			photoX = frameWidth * (position.path("left").asDouble() / 100.0);
			photoY = frameHeight * (position.path("top").asDouble() / 100.0);
			photoWidth = frameWidth * (size.path("width").asDouble() / 100.0);
			photoHeight = frameHeight * (size.path("height").asDouble() / 100.0);
		}

		logger.info("사진 위치: ({}, {}), 크기: ({}, {})", photoX, photoY, photoWidth, photoHeight);

// 마스크가 있는 경우 처리
		if (theme.getOriginalMaskPath() != null && !theme.getOriginalMaskPath().isEmpty()) {
			String maskPath = theme.getOriginalMaskPath();
			if (maskPath.startsWith("/theme/") && themePath.endsWith("/theme")) {
				maskPath = maskPath.substring(6);
			}

			File maskFile = new File(InternalPathUtils.normalizePath(themePath + "/" + maskPath));

			if (maskFile.exists()) {
				logger.info("마스크 적용: {}", maskFile.getName());

// 마스크를 적용한 이미지 생성
				BufferedImage maskedImage = new BufferedImage(frameWidth, frameHeight, BufferedImage.TYPE_INT_ARGB);
				Graphics2D g2dMask = maskedImage.createGraphics();
				setHighQualityRenderingHints(g2dMask);

// 사진 그리기
				g2dMask.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);

// 마스크 적용
				BufferedImage maskImage = ImageIO.read(maskFile);
				g2dMask.setComposite(AlphaComposite.DstIn);
				g2dMask.drawImage(maskImage, 0, 0, frameWidth, frameHeight, null);
				g2dMask.dispose();

// 마스크 적용된 이미지를 그리기
				g2d.drawImage(maskedImage, 0, 0, null);

			} else {
// 마스크 파일이 없으면 그냥 그리기
				g2d.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
			}
		} else {
// 마스크가 없으면 바로 그리기
			g2d.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
		}

		logger.info("사진 렌더링 완료");
	}

	// 이미지에 알파 채널(투명도)이 있는지 확인하는 헬퍼 메서드
	private boolean hasAlphaChannel(BufferedImage image) {
		if (image == null)
			return false;

		// 이미지 타입 확인
		int type = image.getType();
		if (type == BufferedImage.TYPE_INT_ARGB || type == BufferedImage.TYPE_4BYTE_ABGR
				|| type == BufferedImage.TYPE_INT_ARGB_PRE) {

			// 실제로 투명 픽셀이 있는지 확인
			for (int y = 0; y < Math.min(100, image.getHeight()); y += 10) {
				for (int x = 0; x < Math.min(100, image.getWidth()); x += 10) {
					int pixel = image.getRGB(x, y);
					int alpha = (pixel >> 24) & 0xff;
					if (alpha < 255) {
						return true; // 투명 픽셀 발견
					}
				}
			}
		}
		return false;
	}

	// 사진 렌더링 메서드 개선
	private void renderPhotoInFrame(Graphics2D g2d, JsonNode photoNode, Theme theme, int frameWidth, int frameHeight)
			throws IOException {

		String src = photoNode.path("src").asText();
		if (src == null || src.isEmpty()) {
			logger.error("❌ 사진 src가 비어있음!");
			return;
		}

		logger.info("사진 경로: {}", src);

		// 이미지 로드
		String originalSrc = convertToOriginalPath(src);
		byte[] imageBytes = loadImageBytes(originalSrc);
		if (imageBytes == null) {
			imageBytes = loadImageBytes(src);
			if (imageBytes == null) {
				logger.error("❌ 이미지 로드 완전 실패: {}", src);
				return;
			}
		}

		BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
		if (photoImage == null) {
			logger.error("❌ 이미지 디코딩 실패");
			return;
		}

		logger.info("✓ 이미지 로드 성공: {}x{}", photoImage.getWidth(), photoImage.getHeight());

		// 위치와 크기 계산
		JsonNode position = photoNode.path("position");
		JsonNode size = photoNode.path("size");

		double photoX, photoY, photoWidth, photoHeight;

		if (position.has("leftPx")) {
			double frameScaleX = (double) frameWidth / (EDIT_WIDTH * (frameWidth / RENDER_WIDTH * 100) / 100);
			double frameScaleY = (double) frameHeight / (EDIT_HEIGHT * (frameHeight / RENDER_HEIGHT * 100) / 100);

			photoX = position.path("leftPx").asDouble() * frameScaleX;
			photoY = position.path("topPx").asDouble() * frameScaleY;
			photoWidth = size.path("widthPx").asDouble() * frameScaleX;
			photoHeight = size.path("heightPx").asDouble() * frameScaleY;

			logger.info("픽셀 단위 위치 계산 - 원본: ({}, {}), 스케일: ({}, {})", position.path("leftPx").asDouble(),
					position.path("topPx").asDouble(), frameScaleX, frameScaleY);
		} else {
			photoX = frameWidth * (position.path("left").asDouble() / 100.0);
			photoY = frameHeight * (position.path("top").asDouble() / 100.0);
			photoWidth = frameWidth * (size.path("width").asDouble() / 100.0);
			photoHeight = frameHeight * (size.path("height").asDouble() / 100.0);

			logger.info("퍼센트 단위 위치 계산");
		}

		logger.info("최종 사진 위치: ({}, {}), 크기: ({}, {})", photoX, photoY, photoWidth, photoHeight);
		logger.info("프레임 크기: {}x{}", frameWidth, frameHeight);

		if (photoX < 0 || photoY < 0 || photoX > frameWidth || photoY > frameHeight) {
			logger.warn("⚠️ 사진이 프레임 영역 밖에 있을 수 있음!");
		}

		// ===================
		// 디버깅: 빨간 사각형 먼저 그리기
		// ===================
		g2d.setColor(Color.RED);
		g2d.fillRect((int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight);
		logger.info("🔴 빨간 사각형 그림 - 이게 보이면 위치는 맞음");

		// 그 다음 사진 그리기
		g2d.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);

		// ===================
		// 디버깅: 사진 위에 테두리 그리기
		// ===================
		g2d.setColor(Color.BLUE);
		g2d.setStroke(new BasicStroke(5));
		g2d.drawRect((int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight);
		logger.info("🔵 파란 테두리 그림 - 이게 보이면 사진 위치 확인 가능");

		// 마스크는 일단 무시하고 테스트
		logger.info("✓ 사진 렌더링 완료! (마스크 무시)");
	}

	// 간단한 사진 렌더링 메서드 (위치 계산 단순화)
	private void renderPhotoDirectly(Graphics2D g2d, JsonNode photoNode, int frameWidth, int frameHeight)
			throws IOException {

		String src = photoNode.path("src").asText();
		if (src == null || src.isEmpty())
			return;

		// 이미지 로드
		String originalSrc = convertToOriginalPath(src);
		byte[] imageBytes = loadImageBytes(originalSrc);
		if (imageBytes == null) {
			imageBytes = loadImageBytes(src);
		}
		if (imageBytes == null)
			return;

		BufferedImage photoImage = readAndCorrectImageOrientation(imageBytes);
		if (photoImage == null)
			return;

		// 실제 위치와 크기 계산
		JsonNode position = photoNode.path("position");
		JsonNode size = photoNode.path("size");

		double photoX, photoY, photoWidth, photoHeight;

		if (position.has("leftPx")) {
			// 픽셀 단위 - 간단한 스케일 적용
			double scaleRatio = 3.33; // SCALE_RATIO

			photoX = position.path("leftPx").asDouble() * scaleRatio;
			photoY = position.path("topPx").asDouble() * scaleRatio;
			photoWidth = size.path("widthPx").asDouble() * scaleRatio;
			photoHeight = size.path("heightPx").asDouble() * scaleRatio;
		} else {
			// 퍼센트 단위
			photoX = frameWidth * (position.path("left").asDouble() / 100.0);
			photoY = frameHeight * (position.path("top").asDouble() / 100.0);
			photoWidth = frameWidth * (size.path("width").asDouble() / 100.0);
			photoHeight = frameHeight * (size.path("height").asDouble() / 100.0);
		}

		// === 클리핑 영역 설정 (프레임 바깥으로 나가지 않도록) ===
		Shape originalClip = g2d.getClip();
		g2d.setClip(0, 0, frameWidth, frameHeight);

		// Transform 처리
		String photoTransform = photoNode.path("transform").asText("none");

		if (!"none".equals(photoTransform) && !photoTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
			Graphics2D g2dPhoto = (Graphics2D) g2d.create();
			setHighQualityRenderingHints(g2dPhoto);

			TransformParser parser = TransformParser.parse(photoTransform);

			if (parser.rotation != 0) {
				double centerX = photoX + photoWidth / 2;
				double centerY = photoY + photoHeight / 2;
				g2dPhoto.rotate(parser.rotation, centerX, centerY);
			}

			g2dPhoto.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
			g2dPhoto.dispose();
		} else {
			g2d.drawImage(photoImage, (int) photoX, (int) photoY, (int) photoWidth, (int) photoHeight, null);
		}

		// 클리핑 영역 복원
		g2d.setClip(originalClip);

		logger.info("✓ 사진 렌더링 완료: 위치({}, {}), 크기({}, {})", photoX, photoY, photoWidth, photoHeight);
	}

	private Font getFontImproved(String fontFamily, String fontFile, int style, int size) {
		logger.info("폰트 검색 - fontFamily: {}, fontFile: {}", fontFamily, fontFile);

		// 1. fontFile로 먼저 검색
		if (!fontFile.isEmpty()) {
			Font customFont = customFonts.get(fontFile);
			if (customFont != null) {
				logger.info("fontFile로 폰트 발견: {}", fontFile);
				return customFont.deriveFont(style, (float) size);
			}
		}

		// 2. fontFamily로 검색
		if (!fontFamily.isEmpty()) {
			// 정확한 매치
			Font customFont = customFonts.get(fontFamily);
			if (customFont != null) {
				logger.info("fontFamily로 폰트 발견: {}", fontFamily);
				return customFont.deriveFont(style, (float) size);
			}

			// 대소문자 구분 없이 검색
			String searchName = fontFamily.toLowerCase().replaceAll("\\s+", "");
			for (Map.Entry<String, Font> entry : customFonts.entrySet()) {
				String keyName = entry.getKey().toLowerCase().replaceAll("\\s+", "");
				if (keyName.contains(searchName) || searchName.contains(keyName)) {
					logger.info("부분 매치로 폰트 발견: {} -> {}", fontFamily, entry.getKey());
					return entry.getValue().deriveFont(style, (float) size);
				}
			}
		}

		// 3. 시스템 폰트 시도
		Font systemFont = new Font(fontFamily.isEmpty() ? "Arial" : fontFamily, style, size);

		// 시스템 폰트가 실제로 존재하는지 확인
		if (!systemFont.getFamily().equals(Font.DIALOG)) {
			logger.info("시스템 폰트 사용: {}", systemFont.getFamily());
			return systemFont;
		}

		// 4. 기본 폰트
		logger.warn("폰트를 찾을 수 없어 기본 폰트 사용: Arial");
		return new Font("Arial", style, size);
	}

	// 사진 그리기 헬퍼 메서드
	private void drawPhoto(Graphics2D g2d, BufferedImage photoImage, JsonNode photoNode, double photoX, double photoY,
			double photoWidth, double photoHeight) {

		String photoTransform = photoNode.path("transform").asText("none");

		if (!"none".equals(photoTransform) && !photoTransform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
			TransformParser parser = TransformParser.parse(photoTransform);

			if (Math.abs(parser.rotation) > 0.001) {
				Graphics2D g2dRotated = (Graphics2D) g2d.create();
				double centerX = photoX + photoWidth / 2;
				double centerY = photoY + photoHeight / 2;
				g2dRotated.rotate(parser.rotation, centerX, centerY);
				g2dRotated.drawImage(photoImage, (int) Math.round(photoX), (int) Math.round(photoY),
						(int) Math.round(photoWidth), (int) Math.round(photoHeight), null);
				g2dRotated.dispose();
			} else {
				g2d.drawImage(photoImage, (int) Math.round(photoX), (int) Math.round(photoY),
						(int) Math.round(photoWidth), (int) Math.round(photoHeight), null);
			}
		} else {
			g2d.drawImage(photoImage, (int) Math.round(photoX), (int) Math.round(photoY), (int) Math.round(photoWidth),
					(int) Math.round(photoHeight), null);
		}
	}

	// 프레임을 캔버스에 그리기
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

	// 마스크 이미지 로드 헬퍼
	private BufferedImage loadMaskImage(String maskPath) {
		if (maskPath == null || maskPath.isEmpty())
			return null;

		try {
			// 경로 정규화
			String normalizedPath = maskPath;
			if (normalizedPath.startsWith("/theme/")) {
				normalizedPath = normalizedPath.substring(7);
			}

			// 여러 경로 조합 시도
			String[] pathVariants = { themePath + "/" + normalizedPath, themePath + normalizedPath, normalizedPath };

			for (String path : pathVariants) {
				File file = new File(InternalPathUtils.normalizePath(path));
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

	// 테마 이미지 로드 헬퍼
	private BufferedImage loadThemeImage(String imagePath) {
		if (imagePath == null || imagePath.isEmpty())
			return null;

		try {
			// 경로 정규화
			String normalizedPath = imagePath;
			if (normalizedPath.startsWith("/theme/")) {
				normalizedPath = normalizedPath.substring(7);
			}

			// 여러 경로 조합 시도
			String[] pathVariants = { themePath + "/" + normalizedPath, themePath + normalizedPath, normalizedPath };

			for (String path : pathVariants) {
				File file = new File(InternalPathUtils.normalizePath(path));
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

	private void renderTextBoxes(Graphics2D g2d, JsonNode root) {
		int textBoxCount = 0;

		for (JsonNode textBox : root.path("textBoxes")) {
			textBoxCount++;
			logger.info("텍스트박스 {} 렌더링 시작", textBoxCount);

			// 텍스트 내용 확인
			String html = textBox.path("html").asText();
			logger.info("  HTML 내용: {}", html);

			// renderImage 경로 확인
			String renderImagePath = textBox.path("renderImage").asText();
			boolean isModified = textBox.path("isModified").asBoolean(true);

			logger.info("  renderImage: {}", renderImagePath);
			logger.info("  isModified: {}", isModified);

			if (!renderImagePath.isEmpty() && !isModified) {
				logger.info("  -> 저장된 이미지로 렌더링: {}", renderImagePath);
				renderTextBoxAsImage(g2d, textBox, renderImagePath);
			} else {
				logger.info("  -> 텍스트로 직접 렌더링");

				// 위치 정보 로그
				double boxX = RENDER_WIDTH * (textBox.path("position").path("left").asDouble() / 100.0);
				double boxY = RENDER_HEIGHT * (textBox.path("position").path("top").asDouble() / 100.0);
				logger.info("  위치: ({}, {})", boxX, boxY);

				renderSingleTextBoxImproved(g2d, textBox);
			}
		}

		logger.info("이 {} 개의 텍스트박스 렌더링 완료", textBoxCount);
	}

	private void renderTextBoxAsImage(Graphics2D g2d, JsonNode textBox, String imagePath) {
		try {
			BufferedImage textImage = loadTextImage(imagePath);
			if (textImage == null) {
				renderSingleTextBoxImproved(g2d, textBox);
				return;
			}

			// 이미지는 이미 RENDER_SCALE로 캡처되었음
			// 따라서 1:1로 그려야 함

			JsonNode captureInfo = textBox.path("captureInfo");
			JsonNode absolutePixels = captureInfo.path("absolutePixels");

			// 편집기에서의 원본 위치 (픽셀)
			double originalX = absolutePixels.path("x").asDouble();
			double originalY = absolutePixels.path("y").asDouble();

			// 편집기 배경 크기
			double editorBgWidth = captureInfo.path("editorBgWidth").asDouble(786.0);

			// 스케일 계산
			double scale = RENDER_WIDTH / editorBgWidth; // 3.33

			// 최종 위치만 계산 (크기는 이미지 그대로 사용)
			int drawX = (int) Math.round(originalX * scale);
			int drawY = (int) Math.round(originalY * scale);

			// Transform 처리
			String transform = textBox.path("transform").asText("none");
			Graphics2D g2dImage = (Graphics2D) g2d.create();

			if (!"none".equals(transform) && !transform.equals("matrix(1, 0, 0, 1, 0, 0)")) {
				TransformParser parser = TransformParser.parse(transform);
				if (Math.abs(parser.rotation) > 0.001) {
					// 이미지 중심점 계산
					double centerX = drawX + textImage.getWidth() / 2.0;
					double centerY = drawY + textImage.getHeight() / 2.0;
					g2dImage.rotate(parser.rotation, centerX, centerY);
				}
			}

			// 이미지를 원본 크기 그대로 그리기 (스케일링 없음!)
			g2dImage.drawImage(textImage, drawX, drawY, null);

			g2dImage.dispose();

			logger.info("텍스트 이미지 렌더링: 위치({}, {}), 이미지크기({}x{})", drawX, drawY, textImage.getWidth(),
					textImage.getHeight());

		} catch (Exception e) {
			logger.error("텍스트 이미지 렌더링 실패: {}", e.getMessage());
			renderSingleTextBoxImproved(g2d, textBox);
		}
	}

	// 헬퍼 메서드 수정
	private BufferedImage loadTextImage(String imagePath) throws IOException {
		String fullPath;
		if (imagePath.startsWith("/photo/text-images/")) {
			String fileName = imagePath.substring("/photo/text-images/".length());
			fullPath = userPhotosPath + "/text-images/" + fileName;
		} else {
			fullPath = userPhotosPath + imagePath;
		}

		File imageFile = new File(fullPath);
		if (!imageFile.exists()) {
			logger.warn("텍스트 이미지 파일을 찾을 수 없음: {}", fullPath);
			return null;
		}

		return ImageIO.read(imageFile);
	}
}