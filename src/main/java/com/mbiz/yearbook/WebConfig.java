package com.mbiz.yearbook;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

	@Autowired
	private ImpersonateInterceptor impersonateInterceptor;

	@Value("${file.path.theme}")
	private String themePath;

	@Value("${file.path.upload}")
	private String uploadPath;

	@Value("${file.path.thumbnail}")
	private String thumbnailPath;

	@Value("${file.path.user-photos}")
	private String userPhotosPath;

	@Bean
	public SessionLocaleResolver localeResolver() {
		SessionLocaleResolver localeResolver = new SessionLocaleResolver();
		localeResolver.setDefaultLocale(Locale.US);
		return localeResolver;
	}

	@Bean
	public LocaleChangeInterceptor localeChangeInterceptor() {
		LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
		interceptor.setParamName("lang");
		return interceptor;
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(sessionInterceptor)
				.addPathPatterns("/**")
				.excludePathPatterns(
						"/",
						"/main",
						"/login",
						"/render/browser/**",
						"/admin/impersonate/**",
						"/css/**",
						"/js/**",
						"/images/**",
						"/static/**",
						"/favicon.ico");

		registry.addInterceptor(localeChangeInterceptor())
				.addPathPatterns("/**");

		registry.addInterceptor(impersonateInterceptor)
				.addPathPatterns(
						"/home/**",
						"/edit/**",
						"/progress/**",
						"/submit/**",
						"/contactUs/**",
						"/userDownloadGuidance/**")
				.excludePathPatterns(
						"/css/**",
						"/js/**",
						"/images/**",
						"/admin/**",
						"/login",
						"/logout");
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/css/**", "/js/**", "/images/**")
				.addResourceLocations("classpath:/static/css/", "classpath:/static/js/", "classpath:/static/images/");

		registry.addResourceHandler("/theme/**")
				.addResourceLocations("file:" + themePath)
				.setCachePeriod(3600);

		registry.addResourceHandler("/upload/**")
				.addResourceLocations("file:" + uploadPath)
				.setCachePeriod(3600);

		registry.addResourceHandler("/thumbnail/**")
				.addResourceLocations("file:" + thumbnailPath)
				.setCachePeriod(3600);

		registry.addResourceHandler("/photo/**")
				.addResourceLocations("file:" + userPhotosPath);

		System.out.println("Theme Path: " + themePath);
		System.out.println("Upload Path: " + uploadPath);
		System.out.println("Thumbnail Path: " + thumbnailPath);
		System.out.println("User Photos Path: " + userPhotosPath);
	}
}
