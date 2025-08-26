package com.mbiz.yearbook;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
public class JacksonConfig {
    
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        // StreamReadConstraints 생성
        StreamReadConstraints constraints = StreamReadConstraints.builder()
                .maxStringLength(100_000_000)
                .build();
        
        // JsonFactory 생성 및 제약 조건 설정
        JsonFactory factory = JsonFactory.builder()
                .streamReadConstraints(constraints)
                .build();
        
        // ObjectMapper 생성 및 설정
        ObjectMapper mapper = new ObjectMapper(factory);
        
        // Java 8 시간 모듈 등록
        mapper.registerModule(new JavaTimeModule());
        
        // 직렬화 설정
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
        
        // 역직렬화 설정
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mapper.disable(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE);
        
        return mapper;
    }
}