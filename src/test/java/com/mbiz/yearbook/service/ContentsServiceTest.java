package com.mbiz.yearbook.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.repository.ContentsRepository;

@ExtendWith(MockitoExtension.class)
class ContentsServiceTest {

    @Mock
    private ContentsRepository contentsRepository;

    @InjectMocks
    private ContentsService contentsService;

    @Test
    void updateChangesCategoryAlongWithOtherEditableFields() {
        Contents persisted = Contents.builder()
                .id(10L)
                .userId(20L)
                .category("group")
                .title("Original")
                .pages(2)
                .active(true)
                .build();
        Contents form = Contents.builder()
                .id(10L)
                .userId(20L)
                .category("event")
                .title("Updated")
                .pages(3)
                .build();

        when(contentsRepository.findById(10L)).thenReturn(Optional.of(persisted));

        contentsService.update(form);

        assertEquals("event", persisted.getCategory());
        assertEquals("Updated", persisted.getTitle());
        assertEquals(3, persisted.getPages());
        verify(contentsRepository).save(persisted);
    }
}
