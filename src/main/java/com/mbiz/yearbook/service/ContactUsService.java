package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.repository.ContactUsRepository;

import jakarta.transaction.Transactional;

@Service
public class ContactUsService {

    @Autowired
    private ContactUsRepository contactUsRepository;
    
    public Optional<ContactUs> findById(Long id) {
        return contactUsRepository.findById(id);
    }
    
    public List<ContactUs> findAll() {
        return contactUsRepository.findAll();
    }

    public List<ContactUs> getContactUs(String type, String keyword) {
    	if (keyword == null || keyword.isBlank()) {
            return contactUsRepository.findAll();
        }
    	
    	switch (type) {
        case "name":
            return contactUsRepository.findByNameContainingIgnoreCase(keyword);
        case "schoolName":
            return contactUsRepository.findBySchoolNameContainingIgnoreCase(keyword);
        case "subject":
            return contactUsRepository.findBySubjectContainingIgnoreCase(keyword);
        default:
            return contactUsRepository.findAll();
    	}    
    }
    
    public void save(ContactUs contact) {
        contact.setCreatedAt(LocalDateTime.now());
        contact.setUpdatedAt(LocalDateTime.now());
        contactUsRepository.save(contact);
    }
    
    @Transactional
    public int markAsRepliedByIds(List<Long> ids) {
    	if (ids == null || ids.isEmpty()) {
            return 0;
        }
        int count = contactUsRepository.markAsRepliedByIds(ids, LocalDateTime.now());
        return count;
    }
    
    @Transactional
    public int deleteByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        // The repository will handle the actual deletion
        return contactUsRepository.deleteByIds(ids);
    }
}