package com.mbiz.yearbook.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.Theme;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.UserTheme;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.ThemeRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.ContentsService;
import com.mbiz.yearbook.service.ThemeService;
import com.mbiz.yearbook.service.YearbookService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EditController {
	
	@Value("${file.upload-dir}") // 프로퍼티 값 주입
    private String uploadPath;

    @Autowired
    private ContentsService contentsService;
    
    @Autowired
    private ThemeService themeService;
    
    @Autowired
    private YearbookService yearbookService;
    
    @Autowired
    private ContentsRepository contentsRepository;
    @Autowired
    private YearbookRepository yearbookRepository;
    
    @Autowired
    private ThemeRepository themeRepository;

    @GetMapping("/edit")
    public String editMain(HttpSession session, @RequestParam Long id, Model model) {
    	
		User loginUser = (User) session.getAttribute("user");
		model.addAttribute("loginUser", loginUser);
		
		List<Contents> allContents = contentsRepository.findAll();
		
		// 2. 화면에 전달할 DTO 리스트 생성
        List<ContentsData> contentsListForView = new ArrayList<>();
        
        for (Contents content : allContents) {
            // 해당 contents_id를 가진 yearbook 페이지들을 모두 조회
            List<Yearbook> pages = yearbookRepository.findByContentsId(content.getId());

            // DTO 객체 생성 및 데이터 설정
            ContentsData data = new ContentsData();
            data.setContentsInfo(content);
            data.setYearbookPages(pages);

            // 최종 리스트에 추가
            contentsListForView.add(data);
        }

        // 4. 최종적으로 만들어진 DTO 리스트를 모델에 담아 JSP로 전달
        model.addAttribute("contentsList", contentsListForView);
        model.addAttribute("currentMenu", "edit");
        
        return "edit";
    }
    
    @PostMapping("/edit/background")
    @ResponseBody
    public List<UserTheme> backgroundList(@RequestBody Map<String, Object> param) {
    	Long id = Long.parseLong(param.get("id").toString());
        String category = (String) param.get("category");
        return themeService.findByUserIdAndCategory(id, category);
    }
    
    /**
     * 특정 테마 ID를 받아, 해당 테마와 동일한 부모 ID를 가진 모든 테마 목록을 반환합니다.
     */
    @GetMapping("/edit/themesByParent") // 새로운 GET 요청 주소
    @ResponseBody
    public List<Theme> getThemesByParentId(@RequestParam("themeId") Long themeId) {
        // 1. 전달받은 themeId로 현재 테마를 조회하여 parentId를 얻습니다.
        Theme currentTheme = themeRepository.findById(themeId)
                .orElseThrow(() -> new RuntimeException("Theme not found with id: " + themeId));
        
        Long parentId = currentTheme.getParentId();

        // 2. parentId가 있으면, 해당 parentId를 가진 모든 테마 목록을 조회하여 반환합니다.
        if (parentId != null) {
            return themeRepository.findByParentId(parentId);
        }

        // parentId가 없는 경우, 빈 리스트나 적절한 예외 처리를 합니다.
        return Collections.emptyList();
    }
    
    @PostMapping("/edit/mainFrame")
    @ResponseBody
    public List<UserTheme> mainFrameList(@RequestBody Map<String, Object> param) {
    	Long id = Long.parseLong(param.get("id").toString());
        String category = (String) param.get("category");
        return themeService.findByUserIdAndCategory(id, category);
    }
    
    @PostMapping("/edit/subFrame")
    @ResponseBody
    public List<UserTheme> subFrameList(@RequestBody Map<String, Object> param) {
    	Long id = Long.parseLong(param.get("id").toString());
        String category = (String) param.get("category");
        return themeService.findByUserIdAndCategory(id, category);
    }
    
    @PostMapping("/savePage")
    public Map<String, Object> savePage(@RequestBody Map<String, Object> payload) {
        // 1. 데이터 추출 (Long, Integer 타입 캐스팅 주의)
        // yearbookId는 null일 수 있으므로 Long 대신 Object로 받고 확인
        Object yearbookIdObj = payload.get("yearbookId");
        Long yearbookId = (yearbookIdObj != null) ? Long.parseLong(yearbookIdObj.toString()) : null;

        Long contentsId = Long.parseLong(payload.get("contentsId").toString());
        Integer pageNo = Integer.parseInt(payload.get("pageNo").toString());
        Long userId = 1L; // TODO: 실제 로그인된 사용자 ID를 가져와야 합니다. (예: 세션 등)

        String designDataJson = (String) payload.get("designData");
        String imageData = (String) payload.get("imageData");

        Yearbook page;

        // 2. ID 존재 여부에 따라 분기
        if (yearbookId != null) {
            // ID가 있으면 기존 데이터 수정 (Update)
            page = yearbookRepository.findById(yearbookId).orElseThrow(() -> new RuntimeException("페이지를 찾을 수 없습니다."));
        } else {
            // ID가 없으면 신규 데이터 생성 (Create)
            // 혹시 모를 중복 생성을 방지하기 위해 DB를 한번 더 확인
            page = yearbookRepository.findByContentsIdAndPageNo(contentsId, pageNo)
                                      .orElse(new Yearbook()); // 없으면 새 객체 생성
            
            if (page.getId() == null) { // 새로 생성된 객체일 경우 초기값 설정
                page.setUserId(userId);
                page.setContentsId(contentsId);
                page.setPageNo(pageNo);
            }
        }

        // 3. 공통 데이터 업데이트
        page.setDesignData(designDataJson);
        page.setLastSaved(new Date());

        // 4. DB에 저장하여 ID를 먼저 확정 (신규 생성 시 ID가 부여됨)
        Yearbook savedPage = yearbookRepository.save(page);

        // 5. 확정된 ID로 썸네일 파일 저장
        String newImagePath = saveThumbnailFile(imageData, savedPage.getId());
        
        // 6. 썸네일 경로를 다시 업데이트하고 최종 저장
        savedPage.setThumbnailPath(newImagePath);
        yearbookRepository.save(savedPage);

        // 7. 클라이언트에 새 경로와 새로 생성된 ID 응답
        Map<String, Object> response = new HashMap<>();
        response.put("newImagePath", newImagePath);
        response.put("newYearbookId", savedPage.getId()); // 새로 생성된 ID 전달
        return response;
    }
    
    /**
     * Base64 이미지 데이터를 서버에 파일로 저장하고 웹 경로를 반환하는 메서드
     * @param imageData Base64로 인코딩된 이미지 데이터
     * @param yearbookId 파일명을 생성하기 위한 페이지 ID
     * @return 웹에서 접근 가능한 파일 경로 (예: /thumbnails/thumbnail_123.png)
     */
    private String saveThumbnailFile(String imageData, Long yearbookId) {
        if (imageData == null || imageData.isEmpty()) {
            return null;
        }

        // "data:image/png;base64," 부분 제거
        String base64Image = imageData.split(",")[1];
        byte[] imageBytes = Base64.getDecoder().decode(base64Image);

        // 파일명 생성 (이름이 겹치지 않도록 시간 정보 추가)
        String filename = "thumbnail_" + yearbookId + "_" + System.currentTimeMillis() + ".png";
        
        try {
            // 지정된 경로에 파일 저장
            Path destinationFile = Paths.get(uploadPath, filename);
            Files.write(destinationFile, imageBytes);
        } catch (IOException e) {
            e.printStackTrace();
            // 실제 프로덕션 코드에서는 로깅 및 예외 처리가 필요합니다.
            return null;
        }

        // WebMvcConfig에 설정한 URL 경로를 기준으로 최종 경로 반환
        return "/thumbnails/" + filename;
    }
}