package com.mbiz.yearbook;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.web.WebProperties.LocaleResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;
import org.springframework.web.servlet.i18n.SessionLocaleResolver;

@Configuration
public class WebConfig implements WebMvcConfigurer {
	
	@Autowired
    private SessionInterceptor sessionInterceptor;
	
	@Bean
    public SessionLocaleResolver localeResolver() {
        SessionLocaleResolver localeResolver = new SessionLocaleResolver();
        localeResolver.setDefaultLocale(Locale.US);  // 기본 로케일을 미국 영어로 설정
        return localeResolver;
    }

    // LocaleChangeInterceptor 설정 (URL 파라미터로 로케일 변경)
    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");  // URL에서 "lang" 파라미터로 로케일을 변경
        return interceptor;
    }
	
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
        
        registry.addInterceptor(localeChangeInterceptor())
        .addPathPatterns("/**");  // 모든 경로에 로케일 변경을 적용
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