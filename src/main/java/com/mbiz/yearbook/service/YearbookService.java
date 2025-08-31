package com.mbiz.yearbook.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.mbiz.yearbook.controller.EditController;
import com.mbiz.yearbook.model.PayloadDto;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class YearbookService {

	private final UserRepository userRepository;
	
	@Autowired
    private YearbookRepository yearbookRepository;
	
	@Autowired
    private ThumbnailRenderingService thumbnailService;

	public void savePage(Yearbook yearbook) {
		yearbookRepository.save(yearbook);
	}
	
	/**
     * 컨트롤러로부터 받은 페이지 목록의 순서를 업데이트합니다.
     * @param pageOrders 새로운 순서 정보가 담긴 DTO 리스트
     */
    @Transactional
    public void updatePageOrder(List<EditController.PageOrderDTO> pageOrders) {
        if (pageOrders == null || pageOrders.isEmpty()) {
            return; // 업데이트할 데이터가 없으면 종료
        }

        // 리스트를 순회하며 각 페이지의 순서를 업데이트
        for (EditController.PageOrderDTO order : pageOrders) {
            yearbookRepository.updatePageOrder(order.getId(), order.getPageNo());
        }
    }
    
    @Transactional
    public Map<String, Object> savePageAndThumbnail(PayloadDto payload, MultipartFile thumbnailFile) throws IOException {
        
        // 1. Yearbook 엔티티 준비 (기존 페이지 or 새 페이지)
        Yearbook yearbook;
        // yearbookId가 null이거나 0이면 새 페이지로 간주합니다.
        boolean isNewPage = (payload.getYearbookId() == null || payload.getYearbookId() == 0);

        if (isNewPage) {
            // --- 새 페이지 저장 로직 ---
            yearbook = new Yearbook();
            yearbook.setUserId(payload.getUserId());
            
            // Contents 엔티티를 찾아 연결합니다.
            if (payload.getContentsId() != null) {
                 // 실제 Contents 엔티티를 찾아서 설정해야 합니다.
                 // 여기서는 ID만 저장하는 것으로 가정합니다.
                yearbook.setContentsId(payload.getContentsId());
            }
            yearbook.setPageNo(payload.getPageNo());
        } else {
            // --- 기존 페이지 업데이트 로직 ---
            // ID로 기존 Yearbook 데이터를 찾아옵니다. 데이터가 없으면 예외를 발생시킵니다.
            yearbook = yearbookRepository.findById(payload.getYearbookId())
                .orElseThrow(() -> new RuntimeException("Yearbook not found with id: " + payload.getYearbookId()));
        }

        // 2. 썸네일 파일 저장 및 경로 반환
        String thumbnailRelativePath = null;
        if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
            // 썸네일 서비스에 파일 저장을 위임합니다.
            // 새 페이지인 경우 ID가 없으므로 null을 전달하고, 기존 페이지는 ID를 전달합니다.
            thumbnailRelativePath = thumbnailService.saveThumbnail(thumbnailFile, isNewPage ? null : yearbook.getId());
        }
        
        // 3. Yearbook 엔티티 데이터 업데이트
        yearbook.setDesignData(payload.getDesignData()); // 디자인 JSON 데이터 설정
        if (thumbnailRelativePath != null) {
            yearbook.setThumbnailPath(thumbnailRelativePath); // 새 썸네일 경로 설정
        }
        yearbook.setLastSaved(new Date()); // 마지막 저장 시간을 현재 시간으로 설정
        
        // 4. DB에 최종 저장 (새 페이지면 insert, 기존 페이지면 update)
        Yearbook savedYearbook = yearbookRepository.save(yearbook);

        // 5. 프런트엔드로 보낼 응답 데이터 구성
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("newImagePath", savedYearbook.getThumbnailPath());
        response.put("newYearbookId", savedYearbook.getId()); // 새 페이지인 경우 새로운 ID 전달
        response.put("contentsId", savedYearbook.getContentsId()); // Contents ID 전달
        response.put("lastSaved", savedYearbook.getLastSaved());

        return response;
    }
}