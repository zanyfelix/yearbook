package com.mbiz.yearbook.service;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User login(String username, String password) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        if (!user.isActive()) {
            throw new IllegalStateException("관리자에 의해 접근이 제한된 사용자입니다.");
        }

        if (!user.getPassword().equals(password)) {
            throw new IllegalArgumentException("비밀번호가 틀렸습니다.");
        }

        return user;
    }
}