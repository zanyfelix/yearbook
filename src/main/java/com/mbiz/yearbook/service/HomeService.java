package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Home;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.HomeRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HomeService {

    private final HomeRepository repo;
    
    public List<Home> findAll() {
        return repo.findAll();
    }
    

    public void register(Home home) {
    	
    	//기본 값은 0
    	home.setCreatedAt(LocalDateTime.now());
    	home.setModifiedAt(LocalDateTime.now());
    	repo.save(home);
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }
}