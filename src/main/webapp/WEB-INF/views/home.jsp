<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Home</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/home.css"/>
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
    <div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: <fmt:formatDate value="${deadline}" pattern="MMMM dd, yyyy"/> (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <div class="section-box">
        <h5>Yearbook Guidance</h5>
        <ul>
        <c:choose>
        	<c:when test="${not empty guidanceHome.attachmentPath}">
				<li>- Please click <a href="<c:url value='/userDownloadGuidance?id=${guidanceHome.id}'/>"><strong>HERE</strong></a> to download the manual for this program<//li>
			</c:when>
			<c:otherwise>
			    <li>- Please click HERE to download the manual for this program</li>
			</c:otherwise>
		</c:choose>
            <li>- Please review all the guidelines prior to commencing work on the yearbook pages</li>
            <li>- If you have any difficulties of using this program, please direct your inquiries by email to CAPTURECORD Yearbook Consultant.</li>
        </ul>
    </div>

	<c:forEach var="item" items="${homeList}" varStatus="st">
		<c:if test="${item.isActive eq true}">
			<c:if test="${item.type eq 'content'}">
				<div class="section-box">
			        <h5>${item.title}</h5>
			        <textarea class="auto-resize-textarea" disabled>${item.description}</textarea>
			    </div>
			</c:if>
		</c:if>
	</c:forEach>
    
	<!-- 페이지 어디든, body 끝 직전에 위치시켜 주세요 -->
	<div id="deadlineModalOverlay" class="modal-overlay">
	  <div class="modal-box">
	    <div class="modal-header">MBIZ Yearbook</div>
	    <div class="modal-body">
	      <p id="deadlineText"></p>
	      <div class="form-check">
	        <input class="form-check-input" type="checkbox" id="dontShowCheckbox">
	        <label class="form-check-label" for="dontShowCheckbox">
	          Don't show again for the day
	        </label>
	      </div>
	      <button id="modalCloseBtn" class="btn-custom">Close</button>
	    </div>
	  </div>
	</div>
</div>

<script src="${pageContext.request.contextPath}/js/bootstrap.bundle.min.js"></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/home.js'/>"></script>
</body>
</html>