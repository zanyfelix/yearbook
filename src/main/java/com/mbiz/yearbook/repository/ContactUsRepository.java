package com.mbiz.yearbook.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mbiz.yearbook.model.ContactUs;

public interface ContactUsRepository extends JpaRepository<ContactUs, Long> {
}