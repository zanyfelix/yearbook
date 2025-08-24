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
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
    <a href="/home?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contactUs" class="${currentMenu eq 'contactUs' ? 'active' : ''}">Contact Us</a>
</div>

<div class="content">
	<input type="hidden" id="userId" value="${sessionScope.loginUser.id}">
	
    <div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: <fmt:formatDate value="${deadline}" pattern="MMMM dd, yyyy"/> (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <%-- <c:forEach var="item" items="${submitList}" varStatus="st"> --%>
    
	    <div class="section-box">
	        <h5>Submit to MBIZ</h5>
	        <div>
	            <h6>Overview</h6>
	            <p class="mb-1">1. Please review all yearbook pages by checking all previews below and click the check box (Page Confirm).</p>
	            <p class="mb-1">2. Once all previews are confirmed, proceed to "Page Submission".</p>
	            <p class="mb-1">3. Upon submission, a final review will be conducted by MBIZ. In this final review, MBIZ is not responsible for the contents including images, text, and layout of the pages designed by users.</p>
	            <p class="mb-1">4. Please ensure that final submission is carefully reviewed as no further modifications will be possible after submission.</p>
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
				<strong>Note</strong>
				<p>*Categories with incomplete pages are displayed in red for preview purposes, while those with fully completed pages are shown in blue.</p>
			</div>	
		</div>
    </div>
    
    <div class="section-box">
        <h5>Page Submission</h5>
        <div class="checklist mb-4">
            <input type="checkbox" id="acknowledge" name="acknowledge" class="submission-check"<c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
            <label for="acknowledge">I hereby acknowledge that I have reviewed and understand the aforementioned "Overview".</label><br>
            <input type="checkbox" id="no_changes" name="no_changes" class="submission-check"<c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
            <label for="no_changes">I am aware that no additional changes can be made once the submission is completed.</label><br>
            <input type="checkbox" id="confirm_all_pages" name="confirm_all_pages" class="submission-check"<c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
            <label for="confirm_all_pages">I have confirmed all Previews and all pages in sequential order. All yearbook pages are ready to submit.</label><br>
            <input type="checkbox" id="all_pages_ready" name="all_pages_ready" class="submission-check"<c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
            <label for="all_pages_ready">All yearbook pages are ready to submit.</label>
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