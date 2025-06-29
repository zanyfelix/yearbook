package com.mbiz.yearbook.service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.repository.ContactUsRepository;

@Service
public class ContactUsService {

    @Autowired
    private ContactUsRepository contactUsRepository;

    public void save(ContactUs contact) {
        contact.setSubmittedAt(LocalDateTime.now());
        contactUsRepository.save(contact);
    }
}