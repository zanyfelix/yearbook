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

    public List<ContactUs> getContactUs(String userId, String name) {
        boolean allUserId   = "All".equalsIgnoreCase(userId);
        boolean allName = "All".equalsIgnoreCase(name);

        if (!allUserId && allName) {
            return contactUsRepository.findByUserId(userId);
        }
        if (allUserId && !allName) {
            return contactUsRepository.findByName(name);
        }
        return contactUsRepository.findByUserIdAndName(userId, name);
    }
    
    public void save(ContactUs contact) {
        contact.setSubmittedAt(LocalDateTime.now());
        contactUsRepository.save(contact);
    }
    
    @Transactional
    public void markSelectedAsReplied(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
        	contactUsRepository.markAsRepliedByIds(ids);
        }
    }
}