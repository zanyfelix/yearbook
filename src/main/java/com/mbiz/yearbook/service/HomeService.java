package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.HomeRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HomeService {

	private final HomeRepository homeRepository;

	public List<Home> findAll() {
		return homeRepository.findAll();
	}

	public void save(Home home) {
		home.setCreatedAt(LocalDateTime.now());
		homeRepository.save(home);
	}

	public void register(Home home) {

		// 기본 값은 0
		home.setCreatedAt(LocalDateTime.now());
		home.setUpdatedAt(LocalDateTime.now());
		homeRepository.save(home);
	}

	@Transactional
	public void delete(Long id) {
		homeRepository.deleteById(id);
	}

	@Transactional
	public void updateActive(Long id, boolean active) {
		Home home = homeRepository.findById(id)
				.orElseThrow(() -> new IllegalArgumentException("해당 사용자가 없습니다. id=" + id));
		home.setIsActive(active);
		// save() 불필요 — 트랜잭션 커밋 시점에 JPA가 자동 업데이트합니다.
	}

	@Transactional
	public void deleteByUserId(Long userId) {
		homeRepository.deleteByUserId(userId);
	}

	@Transactional
	public void copyHomeToAllUsers(Long sourceUserId, List<User> allUsers) {
		List<Home> sourceContents = homeRepository.findByUserId(sourceUserId);
		int affectedUsers = 0;

		for (User user : allUsers) {
			if (!user.getId().equals(sourceUserId) && "user".equals(user.getRole())) {
				// 기존 데이터 삭제
				homeRepository.deleteByUserId(user.getId());

				// 새 데이터 복사
				for (Home source : sourceContents) {
					Home copy = new Home();
					copy.setUserId(user.getId());
					copy.setTitle(source.getTitle());
					copy.setDescription(source.getDescription());
					copy.setIsActive(source.getIsActive());
					copy.setDisplayOrder(source.getDisplayOrder());
					copy.setType(source.getType());
					copy.setCreatedAt(LocalDateTime.now());
					copy.setUpdatedAt(LocalDateTime.now());

					homeRepository.save(copy);
				}
				affectedUsers++;
			}
		}
	}
}