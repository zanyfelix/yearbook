package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.PageEditDto;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.Yearbook;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class YearbookService {

    private final YearbookRepository yearbookRepository;
    private final UserRepository userRepository;
    
	  public void savePage(Yearbook  yearbook) {
		  
		  
	
		  yearbookRepository.save(yearbook);
	}
}