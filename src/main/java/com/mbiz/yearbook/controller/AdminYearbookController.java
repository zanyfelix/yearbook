package com.mbiz.yearbook.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.JpgRenderingService;
import com.mbiz.yearbook.service.PdfRenderingService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Controller
public class AdminYearbookController {
	
	@Autowired
    private UserService userService;
	
	@Autowired
	private UserRepository userRepository;
	
	@Autowired
    private HomeService homeService;
	
	@Autowired
	private PdfRenderingService pdfRenderingService;
	
	@Autowired
	private JpgRenderingService jpgRenderingService;
	
	private final String UPLOAD_DIR = "uploads/";

	@GetMapping("/admin/yearbook")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id, @RequestParam(required = false) Long userId, Model model) {
		
		User loginUser = (User) session.getAttribute("loginUser");
	    model.addAttribute("loginUser", loginUser);
	    
	    List<User> allUsers = userRepository.findAll();
	    model.addAttribute("allUsers", allUsers);
		
	    if (userId == null) {
	        List<User> users = userRepository.findByRole("user");
	        model.addAttribute("users", users);
	        //사용자 id 값 없을 경우 첫번째 보여준다.
	        userId = users.get(0).getId();
	    } else {
	        userRepository.findById(userId).ifPresent(user -> model.addAttribute("users", List.of(user)));
	    }
	    
	    model.addAttribute("id", id);
	    model.addAttribute("userId", userId);
	    
	    model.addAttribute("currentMenu", "yearbook");

	    return "admin/yearbook";
	}
	
	@GetMapping("/admin/yearbook/download")
	public void downloadYearbooks(@RequestParam("ids") List<Long> userIds, 
	                             @RequestParam(value = "format", defaultValue = "jpg") String format,
	                             HttpServletResponse response) throws IOException {
		String normalizedFormat = format.toLowerCase();
	    if (!"jpg".equals(normalizedFormat)) {
	        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "지원하지 않는 형식입니다. jpg만 가능합니다.");
	        return;
	    }

	    List<File> userZipFiles = new ArrayList<>();
	    File masterZipFile = null; // 마스터 ZIP 파일도 finally에서 정리하기 위해 밖으로 뺍니다.

	    try {
	        for (Long userId : userIds) {
	            // JpgRenderingService에서 사용자별로 폴더 구조화된 ZIP 파일을 생성합니다.
	            File userZip = jpgRenderingService.renderAndZipUserYearbook(userId, normalizedFormat);
	            if (userZip != null) {
	                userZipFiles.add(userZip);
	            }
	        }

	        if (userZipFiles.isEmpty()) {
	            response.sendError(HttpServletResponse.SC_NOT_FOUND, "렌더링할 페이지가 없습니다.");
	            return;
	        }

	        if (userZipFiles.size() == 1) {
	            // 사용자가 한 명이면 해당 ZIP 파일을 바로 다운로드
	            File fileToDownload = userZipFiles.get(0);
	            response.setContentType("application/zip");
	            response.setHeader("Content-Disposition", "attachment; filename=\"" + fileToDownload.getName() + "\"");
	            streamFileToResponse(fileToDownload, response);
	        } else {
	            // 사용자가 여러 명이면, 마스터 ZIP으로 묶어서 다운로드
	            masterZipFile = createMasterZipFromZips(userZipFiles);
	            response.setContentType("application/zip");
	            response.setHeader("Content-Disposition", "attachment; filename=\"Yearbooks_Collection.zip\"");
	            
	            // ▼▼▼ [핵심 수정] 올바른 인자로 메소드 호출 ▼▼▼
	            streamFileToResponse(masterZipFile, response);
	        }

	    } finally {
	        // 모든 임시 파일들을 안전하게 삭제
	        for (File zipFile : userZipFiles) {
	            if (zipFile != null && zipFile.exists()) {
	                zipFile.delete();
	            }
	        }
	        if (masterZipFile != null && masterZipFile.exists()) {
	            masterZipFile.delete();
	        }
	    }
	}
	
    // 여러 개의 ZIP 파일을 하나의 마스터 ZIP으로 묶는 헬퍼 메소드
	private File createMasterZipFromZips(List<File> zipFiles) throws IOException {
	    File masterZip = File.createTempFile("master_collection_", ".zip");
	    try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(masterZip))) {
	        for (File zipFile : zipFiles) {
	            zos.putNextEntry(new ZipEntry(zipFile.getName()));
	            Files.copy(zipFile.toPath(), zos);
	            zos.closeEntry();
	        }
	    }
	    return masterZip;
	}

	private boolean isValidFormat(String format) {
	    return "jpg".equals(format) || "jpeg".equals(format) || 
	           "png".equals(format) || "tiff".equals(format) || "tif".equals(format);
	}
	
	/**
	 * Creates a master ZIP archive containing all user files (JPGs or ZIPs)
	 */
	private File createMasterZipArchive(List<File> userFiles) throws IOException {
	    File masterZipFile = File.createTempFile("yearbooks_collection", ".zip");
	    
	    try (ZipOutputStream zipOut = new ZipOutputStream(new FileOutputStream(masterZipFile))) {
	        for (File userFile : userFiles) {
	            if (userFile.getName().endsWith(".jpg")) {
	                // Direct JPG file - add to ZIP
	                ZipEntry zipEntry = new ZipEntry(userFile.getName());
	                zipOut.putNextEntry(zipEntry);
	                java.nio.file.Files.copy(userFile.toPath(), zipOut);
	                zipOut.closeEntry();
	            } else if (userFile.getName().endsWith(".zip")) {
	                // User's ZIP file - extract and add contents to master ZIP
	                extractZipToMasterZip(userFile, zipOut);
	            }
	        }
	    }
	    
	    return masterZipFile;
	}

	/**
	 * Extracts contents of a user's ZIP file and adds them to the master ZIP
	 */
	private void extractZipToMasterZip(File userZipFile, ZipOutputStream masterZipOut) throws IOException {
	    try (ZipInputStream userZipIn = new ZipInputStream(new FileInputStream(userZipFile))) {
	        ZipEntry entry;
	        while ((entry = userZipIn.getNextEntry()) != null) {
	            // Create a new entry in the master ZIP
	            ZipEntry newEntry = new ZipEntry(entry.getName());
	            masterZipOut.putNextEntry(newEntry);
	            
	            // Copy the file content
	            byte[] buffer = new byte[8192];
	            int length;
	            while ((length = userZipIn.read(buffer)) != -1) {
	                masterZipOut.write(buffer, 0, length);
	            }
	            
	            masterZipOut.closeEntry();
	            userZipIn.closeEntry();
	        }
	    }
	}

	/**
	 * Streams a file to the HTTP response
	 */
	private void streamFileToResponse(File file, HttpServletResponse response) throws IOException {
	    response.setContentLength((int) file.length());
	    
	    try (FileInputStream fileInputStream = new FileInputStream(file);
	         OutputStream responseOutputStream = response.getOutputStream()) {
	        
	        byte[] buffer = new byte[8192];
	        int bytesRead;
	        while ((bytesRead = fileInputStream.read(buffer)) != -1) {
	            responseOutputStream.write(buffer, 0, bytesRead);
	        }
	        responseOutputStream.flush();
	    }
	}
}