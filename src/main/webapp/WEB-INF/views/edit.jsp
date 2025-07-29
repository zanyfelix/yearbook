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
    <script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
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
    <a href="/progress" class="${currentMenu eq 'progress' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Progress Report</a>
    <a href="/submit" class="${currentMenu eq 'submit' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Submit to MBIZ</a>
    <a href="/contactUs" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
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
    
    <!-- Bootstrap Modal - 전체 화면 크기 -->
	<div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
	  <div class="modal-dialog" style="max-width: 100vw; width: 100vw; height: 100vh; margin: 0;">
	    <div class="modal-content border-0 rounded-0" style="height: 100vh;">

	      <div class="modal-body d-flex p-0" style="height: 100vh;">
	        <!-- 좌측 버튼 영역 (고정 너비) -->
	        <div class="d-flex flex-column p-3 border-end" style="min-width: 150px;">
              <button id="btn-background" class="btn btn-outline-secondary w-100 mb-2">Background</button>
              <button id="btn-frame" class="btn btn-outline-secondary w-100 mb-2">Frame</button>
              <button id="btn-text" class="btn btn-outline-secondary w-100">Text</button>
            </div>

	        <!-- 중앙 썸네일 선택 영역 (40% - 2/5 비율) -->
	        <div class="px-3 py-3 overflow-auto border-end" style="width: 40%; max-height: 100vh;">
	        	<!-- 공통 컨테이너 -->
	        	<div id="thumbnail-area">
	        		<!-- Background 패널 -->
	        		<div id="background-panel" class="row row-cols-2 g-3">
	        		</div>
	        		
	        		<!-- Frame 패널 (카테고리 + 아이템) -->
	        		<div id="frame-panel" class="d-none">
						<ul class="nav nav-tabs" id="frameTab" role="tablist">
							<li class="nav-item" role="presentation">
								<button class="nav-link active" id="photo-tab"
									data-bs-toggle="tab" data-bs-target="#photoFrameList"
									type="button" role="tab">Photo Frame</button>
							</li>
							<li class="nav-item" role="presentation">
								<button class="nav-link" id="text-tab" data-bs-toggle="tab"
									data-bs-target="#textBoxFrameList" type="button" role="tab">
									Text Box Frame</button>
							</li>
						</ul>
						
						<!-- Tab panes -->
						<div class="tab-content">
							<div class="tab-pane fade show active" id="photoFrameList" role="tabpanel">
						      <!-- Photo Frame 썸네일이 여기에 동적으로 로드됩니다 -->
						    </div>
						    <div class="tab-pane fade" id="textBoxFrameList" role="tabpanel">
						      <!-- Text Box Frame 썸네일이 여기에 동적으로 로드됩니다 -->
						    </div>
						</div>
				    </div>
	        		
	        		<!-- Text 패널 -->
	        		<div id="text-panel" class="d-none">
	        			<div class="mb-2">
						  <button id="add-text-btn" class="btn btn-outline-primary btn-sm">Add Text Box</button>
						</div>
	        		</div>
	        	</div>
	        </div>

	        <!-- 우측 미리보기 영역 (60% - 3/5 비율) -->
	        <div class="px-3 py-3 d-flex flex-column" style="width: 60%;">
	          <!-- 상단 버튼 영역 -->
	          <div class="d-flex justify-content-end gap-2 mb-3">
	            <button id="btn-clear" class="btn btn-outline-secondary btn-sm">Clear</button>
	            <button class="btn btn-primary btn-sm">Save</button>
	            <button class="btn btn-danger btn-sm" data-bs-dismiss="modal">Close</button>
	          </div>

	          <!-- 미리보기 영역 (남은 공간을 모두 사용) -->
	          <div class="flex-grow-1 d-flex align-items-center justify-content-center p-2" style="min-height: 0;">
	            <div id="page-preview" class="border rounded bg-white" style="position: relative; width: 100%; height: 100%; max-width: 100%; max-height: 100%;">
	              <img id="page-preview-img" src="/images/placeholder.png" class="rounded" style="width: 100%; height: 100%; object-fit: contain;" />
				  <div id="frame-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
				  <input type="file" id="image-upload-input" accept="image/*" style="display: none;" />
				  
				  	<!-- frame 컨트롤 툴팁 -->
					<div id="frame-controls-tooltip" class="d-none" style="position: absolute; z-index: 99999; background: rgba(255, 255, 255, 0.9); border: 1px solid #ccc; padding: 5px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
					    <div class="d-inline-flex align-items-center">
					        <label for="frame-rotate-input" class="form-label me-1 mb-0">Rotate:</label>
					        <input type="number" id="frame-rotate-input" class="form-control form-control-sm w-auto me-1" value="0" min="0" max="360" step="1">
					        <span>°</span>
					    </div>
					    <button id="btn-delete-frame" class="btn btn-danger btn-sm me-2">X</button>
					</div>
					
					<div id="photo-controls-tooltip" class="d-none position-absolute p-2 bg-dark text-white rounded" style="z-index: 100;">
					    <div class="form-group mb-1">
					        <label for="photo-zoom-input" class="mb-0 small">Zoom</label>
					        <input type="range" id="photo-zoom-input" class="form-control-range form-control-range-sm" min="0.5" max="3" step="0.1" value="1">
					    </div>
					    <div class="form-group mb-1">
					        <label for="photo-rotate-input" class="mb-0 small">Rotate</label>
					        <input type="number" id="photo-rotate-input" class="form-control form-control-sm" min="0" max="360" value="0">
					    </div>
					    <button id="btn-delete-photo" class="btn btn-danger btn-sm me-2">X</button>
					</div>
					
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
	          </div>
	        </div>
	      </div> <!-- modal-body -->
	    </div>
	  </div>
	</div> <!-- modal -->
	
	<!-- 프레임 선택용 모달 -->
	<div class="modal fade" id="frameModal" tabindex="-1" aria-hidden="true">
	  <div class="modal-dialog modal-lg modal-dialog-centered">
	    <div class="modal-content">
	      <div class="modal-header">
	        <h5 class="modal-title" id="frameModalLabel">Frames</h5>
	        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
	      </div>
	      <div class="modal-body">
	        <div id="modalFrameList" class="row gy-3">
	          <!-- 썸네일(col-4) 아이템이 여기에 로드됩니다 -->
	        </div>
	      </div>
	    </div>
	  </div>
	</div>
	
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
const ctx = '${pageContext.request.contextPath}';
</script>
</body>
</html>