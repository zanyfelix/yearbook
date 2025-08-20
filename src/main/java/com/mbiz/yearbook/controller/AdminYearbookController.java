package com.mbiz.yearbook.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.service.HomeService;
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
	public void downloadYearbooks(@RequestParam("ids") List<Long> userIds, HttpServletResponse response)
			throws IOException {

		List<File> renderedPdfs = new ArrayList<>();

		// 1. Render a PDF for each selected user and store it temporarily
		for (Long userId : userIds) {
			// This service method should find the user, render their yearbook,
			// and return the generated temporary file.
			File userPdf = pdfRenderingService.renderAndSavePdfForUser(userId);
			if (userPdf != null) {
				renderedPdfs.add(userPdf);
			}
		}

		if (renderedPdfs.isEmpty()) {
			// Handle case where no PDFs could be generated
			response.sendError(HttpServletResponse.SC_NOT_FOUND,
					"No submittable yearbooks found for the selected users.");
			return;
		}

		// 2. Prepare the ZIP file and stream it for download
		File zipFile = null;
		try {
			if (renderedPdfs.size() == 1) {
				// If only one file, download it directly without zipping
				File pdf = renderedPdfs.get(0);
				response.setContentType("application/pdf");
				response.setHeader("Content-Disposition", "attachment; filename=\"" + pdf.getName() + "\"");
				streamFileToResponse(pdf, response);
			} else {
				// If multiple files, create a ZIP archive
				zipFile = createZipArchive(renderedPdfs);
				response.setContentType("application/zip");
				response.setHeader("Content-Disposition", "attachment; filename=\"yearbooks.zip\"");
				streamFileToResponse(zipFile, response);
			}
		} finally {
			// 3. Clean up all temporary files (PDFs and ZIP)
			for (File pdf : renderedPdfs) {
				pdf.delete();
			}
			if (zipFile != null) {
				zipFile.delete();
			}
		}
	}

	/**
	 * Creates a temporary ZIP file containing all the provided PDF files.
	 */
	private File createZipArchive(List<File> files) throws IOException {
		File zipFile = File.createTempFile("yearbooks_", ".zip");
		try (FileOutputStream fos = new FileOutputStream(zipFile); ZipOutputStream zos = new ZipOutputStream(fos)) {

			for (File file : files) {
				zos.putNextEntry(new ZipEntry(file.getName()));
				try (FileInputStream fis = new FileInputStream(file)) {
					byte[] buffer = new byte[1024];
					int len;
					while ((len = fis.read(buffer)) > 0) {
						zos.write(buffer, 0, len);
					}
				}
				zos.closeEntry();
			}
		}
		return zipFile;
	}

	/**
	 * Writes a file's content to the HttpServletResponse output stream.
	 */
	private void streamFileToResponse(File file, HttpServletResponse response) throws IOException {
		response.setContentLength((int) file.length());
		try (FileInputStream fis = new FileInputStream(file)) {
			org.apache.commons.io.IOUtils.copy(fis, response.getOutputStream());
		}
		response.flushBuffer();
	}
}