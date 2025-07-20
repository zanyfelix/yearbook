package com.mbiz.yearbook.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.repository.ContactUsRepository;

import jakarta.transaction.Transactional;

@Service
public class ContactUsService {

    @Autowired
    private ContactUsRepository contactUsRepository;
    
    public List<ContactUs> findAll() {
        return contactUsRepository.findAll();
    }

    public List<ContactUs> getContactUs(String type, String keyword) {
    	if (keyword == null || keyword.isBlank()) {
            return contactUsRepository.findAll();
        }
    	
    	switch (type) {
        case "userId":
            return contactUsRepository.findByUserIdContainingIgnoreCase(keyword);
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
        contactUsRepository.save(contact);
    }
    
    @Transactional
    public int markAsRepliedByIds(List<Long> ids) {
    	if (ids == null || ids.isEmpty()) {
            return 0;
        }
        int count = contactUsRepository.markAsRepliedByIds(ids);
        return count;
    }
}