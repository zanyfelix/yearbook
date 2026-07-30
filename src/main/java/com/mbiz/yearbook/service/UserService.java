package com.mbiz.yearbook.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.mbiz.yearbook.exception.InvalidPasswordException;
import com.mbiz.yearbook.exception.UserNotFoundException;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.HomeRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.util.DuplicateUserIdException;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    
    private final HomeRepository homeRepository;
    
    public List<User> findAll() {
        return userRepository.findAll();
    }
    
    public List<User> getUser(String type, String keyword) {
    	if (keyword == null || keyword.isBlank()) {
            return userRepository.findAll();
        }
        switch (type) {
            case "userId":
                return userRepository.findByUserIdContainingIgnoreCase(keyword);
            case "name":
                return userRepository.findByNameContainingIgnoreCase(keyword);
            case "schoolName":
                return userRepository.findBySchoolNameContainingIgnoreCase(keyword);
            default:
                return userRepository.findAll();
        }
    }

    public User login(String userId, String password) {
    	User user = userRepository.findByUserId(userId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new UserNotFoundException("No user found"));
    	
        if (!user.isActive()) {
            throw new IllegalStateException("access to the system has been restricted by an administrator");
        }

        if (!user.getPassword().equals(password)) {
            throw new InvalidPasswordException("Please check the password"); // [수정됨]
        }

        return user;
    }
    
    public void register(User user) {
    	
    	if (userRepository.existsByUserId(user.getUserId())) {
            throw new DuplicateUserIdException("이미 사용 중인 아이디입니다.");
        }
    	
    	//기본 값은 0
    	user.setActive(false);
        user.setSafeMargin(6);
    	user.setCreatedAt(LocalDateTime.now());
    	user.setModifiedAt(LocalDateTime.now());
    	user.setPassword(user.getPassword().toLowerCase());
    	userRepository.save(user);
    }
    
    @Transactional
    public void update(User userFromForm) {
    	
    	// 1) 기존 엔티티를 조회
        User persisted = userRepository.findById(userFromForm.getId())
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userFromForm.getId()));

        // 2) 수정할 필드만 덮어쓰기 (active는 건드리지 않음)
        if (StringUtils.hasText(userFromForm.getUserId())) {
            persisted.setUserId(userFromForm.getUserId());
        }
        if (StringUtils.hasText(userFromForm.getPassword())) {
            persisted.setPassword(userFromForm.getPassword().toLowerCase());
        }
        if (StringUtils.hasText(userFromForm.getName())) {
            persisted.setName(userFromForm.getName());
        }
        if (StringUtils.hasText(userFromForm.getSchoolName())) {
            persisted.setSchoolName(userFromForm.getSchoolName());
        }
        if (StringUtils.hasText(userFromForm.getMail())) {
            persisted.setMail(userFromForm.getMail());
        }
        if (userFromForm.getDeadline() != null) {
            persisted.setDeadline(userFromForm.getDeadline());
            
            LocalDate dlDate = persisted.getDeadline()
                    .toInstant()
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate();
            
            LocalDate today = LocalDate.now();

            // deadline 이 오늘이거나 과거면 active=false
            if (!dlDate.isAfter(today)) {
                persisted.setActive(false);
            }
        }
        if (StringUtils.hasText(userFromForm.getRole())) {
            persisted.setRole(userFromForm.getRole());
        }
        
    	userRepository.save(persisted);
    }
    
    @Transactional
    public int deleteUsers(List<Long> ids) {
    	if (ids == null || ids.isEmpty()) {
            return 0;
        }
        // 삭제 전 개수를 확인하거나, deleteAllById를 호출하고 반환값 처리
        int count = ids.size();
        userRepository.deleteAllById(ids);
        return count;
    }
    
    @Transactional
    public void updateActive(Long id, boolean active) {
        User user = userRepository.findById(id)
            .orElseThrow(() ->
                new IllegalArgumentException("해당 사용자가 없습니다. id=" + id));
        user.setActive(active);
        // save() 불필요 — 트랜잭션 커밋 시점에 JPA가 자동 업데이트합니다.
    }

}
