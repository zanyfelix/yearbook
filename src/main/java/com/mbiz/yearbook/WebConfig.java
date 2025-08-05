package com.mbiz.yearbook;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
	
	@Autowired
    private SessionInterceptor sessionInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(sessionInterceptor)
                .addPathPatterns("/**")  // 모든 경로에 적용
                .excludePathPatterns(
                    "/login",           // 로그인 페이지
                    "/",               // 루트 경로
                    "/css/**",         // CSS 파일들
                    "/js/**",          // JavaScript 파일들
                    "/images/**",      // 이미지 파일들
                    "/static/**",      // 정적 리소스들
                    "/favicon.ico"     // 파비콘
                );
    }
	
	@Value("${file.upload-dir}")
    private String uploadPath;
	
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry
        		.addResourceHandler("/css/**", "/js/**", "/images/**", "/uploads/**", "/thumbnails/**")
                .addResourceLocations("classpath:/static/css/", "classpath:/static/js/", "classpath:/static/images/","file:uploads/","file:///" + uploadPath);
    }
}