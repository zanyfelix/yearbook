package com.mbiz.yearbook.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
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
	    List<File> renderedFiles = new ArrayList<>();
	    
	 // 형식 검증
	    String normalizedFormat = format.toLowerCase();
	    if (!isValidFormat(normalizedFormat)) {
	        response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
	            "지원하지 않는 형식입니다. 지원 형식: jpg, png, tiff");
	        return;
	    }
	    
	    // 1. 각 선택된 사용자에 대해 이미지 파일 렌더링 및 임시 저장
	    for (Long userId : userIds) {
	        File userFile = jpgRenderingService.renderAndSaveImageForUser(userId, normalizedFormat);
	        if (userFile != null) {
	            renderedFiles.add(userFile);
	        }
	    }
	    
	    if (renderedFiles.isEmpty()) {
	        response.sendError(HttpServletResponse.SC_NOT_FOUND,
	                "선택된 사용자들에 대한 제출 가능한 yearbook을 찾을 수 없습니다.");
	        return;
	    }
	    
	    // 2. 파일 준비 및 다운로드 스트리밍
	    File finalFile = null;
	    try {
	        if (renderedFiles.size() == 1) {
	            // 한 명의 사용자만 선택된 경우, 해당 파일을 직접 다운로드
	            File userFile = renderedFiles.get(0);
	            String fileName = userFile.getName();
	            
	            if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
	                response.setContentType("image/jpeg");
	                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
	                streamFileToResponse(userFile, response);
	            } else if (fileName.endsWith(".png")) {
	                response.setContentType("image/png");
	                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
	                streamFileToResponse(userFile, response);
	            } else if (fileName.endsWith(".tiff") || fileName.endsWith(".tif")) {
	                response.setContentType("image/tiff");
	                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
	                streamFileToResponse(userFile, response);
	            } else if (fileName.endsWith(".zip")) {
	                response.setContentType("application/zip");
	                response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
	                streamFileToResponse(userFile, response);
	            }
	        } else {
	            // 여러 사용자가 선택된 경우, 모든 파일을 포함하는 마스터 ZIP 생성
	            finalFile = createMasterZipArchive(renderedFiles);
	            response.setContentType("application/zip");
	            
	            String zipFileName = "yearbooks_collection_" + normalizedFormat + ".zip";
	            response.setHeader("Content-Disposition", "attachment; filename=\"" + zipFileName + "\"");
	            streamFileToResponse(finalFile, response);
	        }
	    } finally {
	        // 3. 모든 임시 파일 정리
	        for (File file : renderedFiles) {
	            if (file != null && file.exists()) {
	                file.delete();
	            }
	        }
	        if (finalFile != null && finalFile.exists()) {
	            finalFile.delete();
	        }
	    }
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