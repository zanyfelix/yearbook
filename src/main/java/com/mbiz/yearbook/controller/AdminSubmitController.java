package com.mbiz.yearbook.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.mbiz.yearbook.model.Contents;
import com.mbiz.yearbook.model.ContentsData;
import com.mbiz.yearbook.model.Submit;
import com.mbiz.yearbook.model.SubmitForm;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.model.YearbookSummary;
import com.mbiz.yearbook.repository.ContentsRepository;
import com.mbiz.yearbook.repository.SubmitRepository;
import com.mbiz.yearbook.repository.UserRepository;
import com.mbiz.yearbook.repository.YearbookRepository;
import com.mbiz.yearbook.service.HomeService;
import com.mbiz.yearbook.service.UserService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/admin")
public class AdminSubmitController {

	@Autowired
	private UserService userService;

	@Autowired
	private HomeService homeService;

	private final String UPLOAD_DIR = "upload/";

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private SubmitRepository submitRepository;

	@Autowired
	private ContentsRepository contentsRepository;

	@Autowired
	private YearbookRepository yearbookRepository;

	@GetMapping("/submit")
	public String showForm(HttpSession session, @RequestParam(required = false) Long id,
			@RequestParam(required = false) Long userId, Model model) {

		if (userId != null) {
			Optional<User> userOptional = userRepository.findById(userId);
			if (userOptional.isPresent()) {
				User user = userOptional.get();
				String role = user.getRole().toUpperCase();

				switch (role) {
				case "ADMIN":
					return "redirect:/admin/user?id=" + userId;
				default:
					break;
				}
			}
		}

		User loginUser = (User) session.getAttribute("loginUser");
		model.addAttribute("loginUser", loginUser);

		List<User> allUsers = userRepository.findAll();
		model.addAttribute("allUsers", allUsers);

		if (userId == null) {
			List<User> users = userRepository.findByRole("user");
			model.addAttribute("users", users);
			userId = users.get(0).getId();
		} else {
			userRepository.findById(userId).ifPresent(user -> model.addAttribute("users", List.of(user)));
		}

		model.addAttribute("id", id);
		model.addAttribute("userId", userId);

		if (userId != null) {
			List<Contents> allContents = contentsRepository.findByUserId(userId);
			List<ContentsData> contentsListForView = new ArrayList<>();

			for (Contents content : allContents) {
				List<YearbookSummary> existingPages = yearbookRepository
						.findSummariesByContentsIdOrderByPageNoAsc(content.getId());
				List<YearbookSummary> fullPageList = new ArrayList<>();

				for (int i = 1; i <= content.getPages(); i++) {
					final int currentPageNo = i;

					YearbookSummary pageToAdd = existingPages.stream().filter(p -> p.getPageNo() == currentPageNo)
							.findFirst().orElse(null); // 없으면 null

					if (pageToAdd != null) {
						fullPageList.add(pageToAdd);
					} else {
						YearbookSummary emptyPage = new YearbookSummary();
						emptyPage.setContentsId(content.getId());
						emptyPage.setPageNo(currentPageNo);
						fullPageList.add(emptyPage);
					}
				}

				ContentsData data = new ContentsData();
				data.setContentsInfo(content);
				data.setYearbookPages(fullPageList); // 완성된 리스트를 DTO에 담습니다.

				data.setSavedPagesCount(existingPages.size());

				contentsListForView.add(data);
			}
			model.addAttribute("contentsList", contentsListForView);
		}

		// 개별 섹션들을 명확하게 조회
	    Submit overviewSection = submitRepository.findFirstByTypeAndUserIdIsNull("Overview")
	        .orElse(createDefaultSubmit("Overview", "Submit to MBIZ - Overview", 0));
	    
	    Submit previewsSection = submitRepository.findFirstByTypeAndUserIdIsNull("Previews")
	        .orElse(createDefaultSubmit("Previews", "Previews", 1));
	    
	    Submit noteSection = submitRepository.findFirstByTypeAndUserIdIsNull("Note")
	        .orElse(createDefaultSubmit("Note", "Note", 2));
	    
	    List<Submit> submissionItems = submitRepository.findByTypeAndUserIdIsNullOrderByDisplayOrder("Submission");
	    
	    // 모델에 개별 섹션 추가
	    model.addAttribute("overviewSection", overviewSection);
	    model.addAttribute("previewsSection", previewsSection);
	    model.addAttribute("noteSection", noteSection);
	    model.addAttribute("submissionItems", submissionItems);
	    
	    // 커스텀 섹션들 (사용자별)
	    List<Submit> customSections = new ArrayList<>();
	    if (userId != null) {
	        customSections = submitRepository.findByUserIdAndType(userId, "Custom");
	    }
	    model.addAttribute("customSections", customSections);
	    
	    // 전체 리스트 (하위 호환성을 위해 유지)
	    List<Submit> submitList = new ArrayList<>();
	    submitList.add(overviewSection);
	    submitList.add(previewsSection);
	    submitList.add(noteSection);
	    submitList.addAll(customSections);
	    model.addAttribute("submitList", submitList);
		model.addAttribute("currentMenu", "submission");

		return "admin/submit";
	}
	
	private Submit createDefaultSubmit(String type, String title, Integer displayOrder) {
	    Submit submit = new Submit();
	    submit.setType(type);
	    submit.setTitle(title);
	    submit.setDisplayOrder(displayOrder);
	    submit.setIsActive(true);
	    submit.setUserId(null);
	    return submit;
	}

	@PostMapping("/submit/save")
	public String saveSubmitSettings(SubmitForm form, RedirectAttributes redirectAttributes) { // 파라미터를 SubmitForm으로 변경
		// 래퍼 객체에서 리스트를 가져와서 저장
		submitRepository.saveAll(form.getSubmit());
		redirectAttributes.addFlashAttribute("successMessage", "save success.");
		return "redirect:/admin/submit";
	}

	@PostMapping("/submit/previewData")
	@ResponseBody
	public List<YearbookSummary> backgroundList(@RequestBody Map<String, Object> param) {
		Long contentsId = Long.parseLong(param.get("contentsId").toString());
		return yearbookRepository.findSummariesByContentsIdOrderByPageNoAsc(contentsId);
	}

	@PostMapping("/submit/section/save")
	@ResponseBody
	public Map<String, Object> saveSingleSection(@RequestBody Map<String, Object> sectionData) {
	    Map<String, Object> response = new HashMap<>();
	    
	    try {
	        String sectionId = (String) sectionData.get("sectionId");
	        String sectionType = (String) sectionData.get("type");
	        String content = (String) sectionData.get("content");
	        String title = (String) sectionData.get("title");
	        Long userId = sectionData.get("userId") != null ? 
	            Long.parseLong(sectionData.get("userId").toString()) : null;
	        Boolean isActive = (Boolean) sectionData.getOrDefault("isActive", true);
	        
	        Submit submit = null;
	        
	        if ("overview".equals(sectionType)) {
	            submit = submitRepository.findFirstByTypeAndUserIdIsNull("Overview")
	                    .orElse(new Submit());
	            submit.setType("Overview");
	            submit.setTitle("Submit to MBIZ - Overview");
	            submit.setDescription(content);
	            submit.setUserId(null);
	            submit.setDisplayOrder(0);
	            
	        } else if ("previews".equals(sectionType)) {
	            submit = submitRepository.findFirstByTypeAndUserIdIsNull("Previews")
	                    .orElse(new Submit());
	            submit.setType("Previews");
	            submit.setTitle("Previews");
	            submit.setDescription(content);
	            submit.setUserId(null);
	            submit.setDisplayOrder(1);
	            
	            // Note 처리
	            if (sectionData.get("note") != null) {
	                Submit noteSubmit = submitRepository.findFirstByTypeAndUserIdIsNull("Note")
	                        .orElse(new Submit());
	                noteSubmit.setType("Note");
	                noteSubmit.setTitle("Note");
	                noteSubmit.setDescription((String) sectionData.get("note"));
	                noteSubmit.setIsActive(true);
	                noteSubmit.setUserId(null);
	                noteSubmit.setDisplayOrder(2);
	                submitRepository.save(noteSubmit);
	            }
	            
	        } else if ("submission".equals(sectionType)) {
	        	if (sectionData.get("submissions") != null) {  // ← 복수형으로 변경
	                List<Map<String, Object>> submissions = 
	                    (List<Map<String, Object>>) sectionData.get("submissions");
	                
	                // 기존 Submission 타입 모두 삭제
	                List<Submit> existingSubmissions = submitRepository.findByTypeAndUserIdIsNull("Submission");
	                submitRepository.deleteAll(existingSubmissions);
	                
	                for (int i = 0; i < submissions.size(); i++) {
	                    Map<String, Object> item = submissions.get(i);
	                    Submit submissionItem = new Submit();
	                    submissionItem.setType("Submission");
	                    submissionItem.setTitle("Page Submission");
	                    submissionItem.setDescription((String) item.get("description"));
	                    submissionItem.setIsActive(true);  // 기본값 true
	                    submissionItem.setUserId(null);
	                    submissionItem.setDisplayOrder(3 + i);
	                    submitRepository.save(submissionItem);
	                }
	                
	                response.put("success", true);
	                response.put("message", "All submission items saved");
	            } else {
	                response.put("success", false);
	                response.put("message", "No submission items to save");
	            }
	            return response; // 여기서 리턴
	            
	        } else if ("custom".equals(sectionType)) {
	            // 커스텀 섹션 처리
	            String idStr = (String) sectionData.get("id");
	            if (idStr != null && !idStr.isEmpty()) {
	                try {
	                    Long id = Long.parseLong(idStr);
	                    submit = submitRepository.findById(id).orElse(null);
	                } catch (NumberFormatException e) {
	                    // 새로운 커스텀 섹션
	                }
	            }
	            
	            if (submit == null) {
	                submit = new Submit();
	                submit.setUserId(userId);
	                Integer maxOrder = submitRepository.findMaxDisplayOrderByUserId(userId);
	                submit.setDisplayOrder(maxOrder != null ? maxOrder + 1 : 100);
	            }
	            
	            submit.setType("Custom");
	            submit.setTitle(title != null ? title : "Custom Section");
	            submit.setDescription(content);
	        }
	        
	        if (submit != null) {
	            submit.setIsActive(isActive);
	            submitRepository.save(submit);
	            
	            response.put("success", true);
	            response.put("message", "Section saved successfully");
	            response.put("sectionId", submit.getId());
	        } else {
	            response.put("success", false);
	            response.put("message", "Failed to save section");
	        }
	        
	    } catch (Exception e) {
	        response.put("success", false);
	        response.put("message", "Error saving section: " + e.getMessage());
	        e.printStackTrace();
	    }
	    
	    return response;
	}

	// 체크박스 상태 저장을 위한 별도 메서드
	@PostMapping("/submit/section/updateCheckboxes")
	@ResponseBody
	public Map<String, Object> updateCheckboxes(@RequestBody Map<String, Object> data) {
		Map<String, Object> response = new HashMap<>();

		try {
			Long userId = Long.parseLong(data.get("userId").toString());
			List<Map<String, Object>> checkboxData = (List<Map<String, Object>>) data.get("checkboxes");

			for (Map<String, Object> item : checkboxData) {
				Long contentsId = Long.parseLong(item.get("contentsId").toString());
				Boolean confirmed = (Boolean) item.get("confirmed");

				// 체크박스 상태를 저장할 별도 테이블이나 로직 구현
				// 예: ContentsConfirmation 엔티티 사용
			}

			response.put("success", true);
			response.put("message", "Checkboxes updated successfully");

		} catch (Exception e) {
			response.put("success", false);
			response.put("message", "Error updating checkboxes: " + e.getMessage());
		}

		return response;
	}

	// 커스텀 섹션 삭제
	@PostMapping("/submit/section/delete")
	@ResponseBody
	public Map<String, Object> deleteSection(@RequestBody Map<String, Object> data) {
		Map<String, Object> response = new HashMap<>();

		try {
			Long sectionId = Long.parseLong(data.get("sectionId").toString());

			Optional<Submit> submit = submitRepository.findById(sectionId);
			if (submit.isPresent() && "Custom".equals(submit.get().getType())) {
				submitRepository.deleteById(sectionId);
				response.put("success", true);
				response.put("message", "Section deleted successfully");
			} else {
				response.put("success", false);
				response.put("message", "Cannot delete default sections");
			}

		} catch (Exception e) {
			response.put("success", false);
			response.put("message", "Error deleting section: " + e.getMessage());
		}

		return response;
	}

	// 모든 섹션 일괄 적용
	@PostMapping("/submit/applyAll")
	@ResponseBody
	public Map<String, Object> applyAllSettings(@RequestBody Map<String, Object> data) {
		Map<String, Object> response = new HashMap<>();

		try {
			Long sourceUserId = Long.parseLong(data.get("userId").toString());

			// 소스 사용자의 모든 설정 가져오기
			List<Submit> sourceSettings = submitRepository.findByUserId(sourceUserId);

			// 모든 사용자에게 적용
			List<User> allUsers = userRepository.findByRole("user");
			for (User targetUser : allUsers) {
				if (!targetUser.getId().equals(sourceUserId)) {
					// 기존 설정 삭제
					submitRepository.deleteByUserId(targetUser.getId());

					// 새 설정 복사
					for (Submit source : sourceSettings) {
						Submit copy = new Submit();
						copy.setUserId(targetUser.getId());
						copy.setType(source.getType());
						copy.setTitle(source.getTitle());
						copy.setDescription(source.getDescription());
						copy.setDisplayOrder(source.getDisplayOrder());
						copy.setIsActive(source.getIsActive());
						copy.setSchoolName(targetUser.getSchoolName());
						submitRepository.save(copy);
					}
				}
			}

			response.put("success", true);
			response.put("message", "Settings applied to all users successfully");

		} catch (Exception e) {
			response.put("success", false);
			response.put("message", "Error applying settings: " + e.getMessage());
		}

		return response;
	}
}