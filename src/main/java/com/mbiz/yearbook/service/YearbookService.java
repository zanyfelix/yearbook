package com.mbiz.yearbook.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.controller.EditController;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class YearbookService {

	private final YearbookRepository yearbookRepository;
	private final UserRepository userRepository;

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
}