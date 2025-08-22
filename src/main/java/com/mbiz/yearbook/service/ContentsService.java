package com.mbiz.yearbook.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.ContentsRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ContentsService {
	
	private final ContentsRepository contentsRepository;
	
	public List<Contents> findAll() {
        return contentsRepository.findAll();
    }
	
    public List<Contents> findByUserId(Long userId) {
        return contentsRepository.findByUserId(userId);
    }
    
    public void register(Contents contents) {
    	
    	//기본 값은 0
    	contents.setCreatedAt(LocalDateTime.now());
    	contents.setUpdatedAt(LocalDateTime.now());
    	contentsRepository.save(contents);
    }
    
    @Transactional
    public void update(Contents contentForm) {
    	
    	// 1) 기존 엔티티를 조회
    	Contents persisted = contentsRepository.findById(contentForm.getId())
            .orElseThrow(() -> new EntityNotFoundException("Contents not found: " + contentForm.getId()));

        // 2) 수정할 필드만 덮어쓰기 (active는 건드리지 않음)
        if (StringUtils.hasText(contentForm.getTitle())) {
            persisted.setTitle(contentForm.getTitle());
        }
        
        persisted.setPages(contentForm.getPages());
        
        contentsRepository.save(persisted);
    }
    
    @Transactional
    public int deleteContents(List<Long> ids) {
    	if (ids == null || ids.isEmpty()) {
            return 0;
        }
        // 삭제 전 개수를 확인하거나, deleteAllById를 호출하고 반환값 처리
        int count = ids.size();
        contentsRepository.deleteAllById(ids);
        return count;
    }
    
    @Transactional
    public void updateActive(Long id, boolean active) {
        Contents contents = contentsRepository.findById(id)
            .orElseThrow(() ->
                new IllegalArgumentException("해당 사용자가 없습니다. id=" + id));
        contents.setActive(active);
        // save() 불필요 — 트랜잭션 커밋 시점에 JPA가 자동 업데이트합니다.
    }
    
}