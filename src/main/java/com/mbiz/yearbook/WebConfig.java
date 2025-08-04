package com.mbiz.yearbook;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
	
	@Value("${file.upload-dir}")
    private String uploadPath;
	
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry
        		.addResourceHandler("/css/**", "/js/**", "/images/**", "/uploads/**", "/thumbnails/**")
                .addResourceLocations("classpath:/static/css/", "classpath:/static/js/", "classpath:/static/images/","file:uploads/","file:///" + uploadPath);
    }
}