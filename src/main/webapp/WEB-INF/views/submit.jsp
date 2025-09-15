<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Progress</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/submit.css"/>
    <script>
    	// 서버에서 yyyy-MM-dd 포맷으로 전달된 deadline
    	var deadlineStr = '${deadline}';
    </script>
</head>
<body>

<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    
    <a href="/home?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contactUs" class="${currentMenu eq 'contactUs' ? 'active' : ''}">Contact Us</a>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>

<div class="content">
	<input type="hidden" id="userId" value="${sessionScope.loginUser.id}">
	
    <div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: <fmt:formatDate value="${deadline}" pattern="MMMM dd, yyyy"/> (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    
	    <div class="section-box">
	    	<div class="section-header">
	    		<h5>Submit to MBIZ</h5>
	    	</div>
	        <div class="section-content">
	        	<h6>Overview</h6>
	        	<textarea class="form-control auto-resize" rows="4" readonly>${overviewSection.description}</textarea>
	        </div>
	    </div>
    
    <div class="section-box">
    	<div class="row">
    		<div class="col">
    			<table style="width: 100%; border-collapse: collapse;">
				    <thead>
				        <tr>
				            <th>Preview Title</th>
				            <th>Status</th>
				        </tr>
				    </thead>
				    <tbody>
				        <c:forEach var="item" items="${contentsList}" varStatus="st">
					        <%-- ▼▼▼ [핵심 수정] <tr> 태그에 data-completed 속성 추가 ▼▼▼ --%>
					        <tr data-completed="${item.savedPagesCount eq item.contentsInfo.pages}">
					            <td>
					                <%-- Preview Title (기존 코드와 동일) --%>
					                <c:if test="${item.savedPagesCount ne item.contentsInfo.pages}">
					                    <label style="color: red; cursor: pointer;" data-bs-toggle="modal" onclick="loadPreviewData('${item.contentsInfo.id}')">${item.contentsInfo.title}</label>
					                </c:if>
					                <c:if test="${item.savedPagesCount eq item.contentsInfo.pages}">
					                    <label style="color: blue; cursor: pointer;" data-bs-toggle="modal" onclick="loadPreviewData('${item.contentsInfo.id}')">${item.contentsInfo.title}</label>
					                </c:if>
					            </td>
					            <td>
					                <span>Page Confirm</span>
					                <input type="checkbox" id="confirm-${item.contentsInfo.id}" name="pageConfirmCheck"
					                <c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
					            </td>
					        </tr>
					    </c:forEach>
				    </tbody>
				</table>
    		</div>
    		<div class="col">
    			<div class="section-header">
	    			<strong>Note</strong>
	    		</div>
	        	<div class="section-content">
	        		<textarea class="form-control auto-resize" rows="1" readonly>${noteSection.description}</textarea>
	        	</div>
			</div>
		</div>
    </div>
    
    <div class="section-box">
    	<div class="section-header">
    		<h5>Page Submission</h5>
    	</div>
	    <div class="section-content">
				<div id="submissionList">
					<c:forEach var="item" items="${submissionItems}" varStatus="status">
						<div class="submission-item" data-item-index="${status.index}">
							<input type="checkbox" id="acknowledge" name="acknowledge" class="submission-check"<c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
							<textarea name="submissions[${status.index}].description"
								class="form-control readonly-mode auto-resize" rows="1" readonly>${item.description}</textarea>
						</div>
					</c:forEach>
				</div>
	    </div>            
        
        <c:if test="${!isAlreadySubmitted}">
		    <button class="btn btn-secondary" type="button" id="btn-page-submit">Page Submit</button>
		</c:if>
    </div>
    
    <!-- 프레임 선택용 모달 -->
	<div class="modal fade" id="previewModal" tabindex="-1" aria-hidden="true">
	    <div class="modal-dialog modal-dialog-centered"> 
	        <div class="modal-content">
	            <div class="modal-body" style="padding: 20px;">
	                
	                <div class="preview-container">
	                    <img id="previewImage" src="" alt="Preview Image">
	                    <button onclick="showPreviousImage()" class="arrow-btn prev-btn">&lt;</button>
	                    <button onclick="showNextImage()" class="arrow-btn next-btn">&gt;</button>
	                </div>
	
	                <div class="close-btn-container">
	                    <%-- 버튼 텍스트와 클래스 변경 --%>
	                    <button type="button" class="custom-close-btn" data-bs-dismiss="modal">CLOSE</button>
	                </div>
	
	            </div>
	        </div>
	    </div>
    </div>
</div>
<script>
const ctx = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.bundle.min.js"></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/submit.js'/>"></script>
</body>
</html>