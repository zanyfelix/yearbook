package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.util.DuplicateUserIdException;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    
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
            default:
                return userRepository.findAll();
        }
    }

    public User login(String userId, String password) {
    	User user = userRepository.findByUserId(userId)
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
    	
        if (!user.isActive()) {
            throw new IllegalStateException("관리자에 의해 접근이 제한된 사용자입니다.");
        }

        if (!user.getPassword().equals(password)) {
            throw new IllegalArgumentException("비밀번호가 틀렸습니다.");
        }

        return user;
    }
    
    public void register(User user) {
    	
    	if (userRepository.existsByUserId(user.getUserId())) {
            throw new DuplicateUserIdException("이미 사용 중인 아이디입니다.");
        }
    	
    	//기본 값은 0
    	user.setActive(false);
    	user.setCreatedAt(LocalDateTime.now());
    	user.setModifiedAt(LocalDateTime.now());
    	userRepository.save(user);
    }
    
    @Transactional
    public void update(User userFromForm) {
    	
    	// 1) 기존 엔티티를 조회
        User persisted = userRepository.findById(userFromForm.getId())
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userFromForm.getId()));

        // 2) 수정할 필드만 덮어쓰기 (active는 건드리지 않음)
        persisted.setUserId     (userFromForm.getUserId());
        persisted.setPassword   (userFromForm.getPassword());
        persisted.setName       (userFromForm.getName());
        persisted.setSchoolName (userFromForm.getSchoolName());
        persisted.setMail       (userFromForm.getMail());
        persisted.setRole       (userFromForm.getRole());
        
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