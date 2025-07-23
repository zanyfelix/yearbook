<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Yearbook Home</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/edit.css"/>
    <script src="<c:url value='/js/edit.js'/>"></script>
</head>
<body>

<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
    <a href="/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contact" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
</div>

<div class="content">
	<input type="hidden" id="id" name="id" value="${sessionScope.loginUser.id}"/>
	<div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: Mar. 31st. 2026 (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <!-- 각 카테고리별 섹션 -->
    <c:forEach var="item" items="${list}" varStatus="st">
        <div class="category-section">
            <h5 class="mb-3">${item.title} (${item.pages})</h5>
            
            <div class="position-relative">
            	<!-- 왼쪽 버튼 -->
            	<button class="slide-btn left" onclick="scrollLeft('${st.index}')">&#10094;</button>
            	
            	
            	<!-- 슬라이드 박스 -->
		        <div class="slide-container" id="slider-${st.index}">
		            <c:forEach var="i" begin="1" end="${item.pages}" varStatus="st2">
		                <div class="page-card" draggable="true">
		                    <img src="/images/placeholder.png" class="page-thumb" alt="Page Thumbnail"/>
		                    <button class="edit-btn mb-2" data-bs-toggle="modal" data-bs-target="#editModal">Edit</button>
		                </div>
		            </c:forEach>
		        </div>
            	
            	<!-- 오른쪽 버튼 -->
            	<button class="slide-btn right" onclick="scrollRight('${st.index}')">&#10095;</button>
            </div>
        </div>
    </c:forEach>
    
    <!-- Bootstrap Modal -->
	<div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
	  <div class="modal-dialog modal-dialog-scrollable" style="max-width: 90vw; width: 90vw; height: 90vh;">
	    <div class="modal-content border-0 rounded-3" style="height: 100%;">
	
	      <div class="modal-body d-flex p-3" style="height: 100vh; max-height: 90vh;">
	        <div class="d-grid gap-2">
              <button id="btn-background" class="btn btn-outline-secondary w-100 mb-2">Background</button>
              <button id="btn-frame" class="btn btn-outline-secondary w-100 mb-2">Frame</button>
              <button id="btn-text" class="btn btn-outline-secondary w-100">Text</button>
            </div>
	
	        <!-- 중앙 썸네일 선택 영역 -->
	        <div class="col-5 px-3 overflow-auto border-end" style="max-height: 100%;">
	        
	        	<!-- 공통 컨테이너 -->
	        	<div id="thumbnail-area">
	        		<!-- Background 패널 -->
	        		<div id="background-panel" class="row row-cols-2 g-3">
	        		</div>
	        		
	        		<!-- Frame 패널 (카테고리 + 아이템) -->
	        		<div id="frame-panel" class="d-none">
				      <div id="frame-category-area" class="mb-3">
				        <div class="row row-cols-3 g-2" id="frame-category-buttons"></div>
				      </div>
				      <div id="frame-item-area">
				        <div class="row row-cols-2 g-3" id="frame-item-list"></div>
				      </div>
				    </div>
	        		
	        		<!-- Text 패널 -->
	        		<div id="text-panel" class="d-none">
	        			<div class="mb-2">
						  <button id="add-text-btn" class="btn btn-outline-primary btn-sm">Add Text Box</button>
						</div>
						<div id="text-controls" class="d-none mb-2">
						    <label class="me-2">
						      Color:
						      <input type="color" id="text-color" />
						    </label>
						    <label class="me-2">
						      Size:
						      <select id="text-size" class="form-select form-select-sm d-inline-block w-auto">
						        <option value="12px">12px</option>
						        <option value="16px" selected>16px</option>
						        <option value="20px">20px</option>
						        <option value="24px">24px</option>
						        <option value="32px">32px</option>
						      </select>
						    </label>
						    <label class="me-2">
						      Alignment:
						      <select id="text-align" class="form-select form-select-sm d-inline-block w-auto">
						        <option value="left">Left</option>
						        <option value="center" selected>Center</option>
						        <option value="right">Right</option>
						      </select>
						    </label>
						    <button id="remove-text-btn" class="btn btn-outline-danger btn-sm">Remove</button>
						  </div>
	        		</div>
	        	</div>
	        </div>

	        <!-- 우측 미리보기 -->
	        <div class="col px-3 d-flex flex-column justify-content-between">
	          <div class="d-flex justify-content-end gap-2 mb-2">
	            <button id="btn-clear" class="btn btn-outline-secondary btn-sm">Clear</button>
	            <button class="btn btn-primary btn-sm">Save</button>
	            <button class="btn btn-danger btn-sm" data-bs-dismiss="modal">Close</button>
	          </div>
	
	          <div id="page-preview" class="mx-auto border rounded bg-white" style="width: 221.9mm; height: 285.4mm; position: relative;">
	            <img id="page-preview-img" src="/images/placeholder.png" class="img-fluid w-100 h-100 rounded" style="object-fit: cover;" />
	          </div>
	        </div>
	      </div> <!-- modal-body -->
	    </div>
	  </div>
	</div> <!-- modal -->
	
	<!-- 툴팁 플로팅 컨트롤 (초기엔 hidden) -->
	<div id="text-tooltip" class="d-none position-absolute p-2 bg-white border rounded shadow" style="z-index:9999;">
	  <input type="color" id="tooltip-color" title="Color" class="me-1" />
	  <select id="tooltip-size" class="form-select form-select-sm d-inline-block w-auto me-1">
	    <option value="12px">12px</option>
	    <option value="16px" selected>16px</option>
	    <option value="20px">20px</option>
	    <option value="24px">24px</option>
	    <option value="32px">32px</option>
	  </select>
	  <select id="tooltip-align" class="form-select form-select-sm d-inline-block w-auto me-1">
	    <option value="left">L</option>
	    <option value="center">C</option>
	    <option value="right">R</option>
	  </select>
	  <button id="tooltip-remove" class="btn btn-outline-danger btn-sm">×</button>
	</div>
	
	
	
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
const ctx = '${pageContext.request.contextPath}';
</script>
</body>
</html>