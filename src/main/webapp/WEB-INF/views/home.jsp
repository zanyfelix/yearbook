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
    <a href="/contactUs?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">Contact Us</a>
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
            <li>Please click HERE to download the manual for this program</li>
            <li>Please review all the guidelines prior to commencing work on the yearbook pages</li>
            <li>If you have any difficulties of using this program, please direct your inquiries by email to chris.kim@mbizkr.com</li>
        </ul>
    </div>

    <div class="section-box">
        <h5>NOTICE</h5>
        <ul>
            <li>The Due date for yearbook page submission is March 31st, 2026</li>
            <li>Please review the following guidelines below prior to commencing work on the yearbook</li>
            <li>If you have any difficulties using this program, please send your inquiries by email to
                <a href="mailto:chris.kim@mbizkr.com">chris.kim@mbizkr.com</a></li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Yearbook Edit</h5>
        <ul>
            <li>Click “+” to start making yearbook pages</li>
            <li>Please customize the pages by utilizing preferred backgrounds, frames, and text</li>
            <li>The number of pages per category is restricted by the administrator. Should additional pages be required, please contact the administrator.</li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Progress Report</h5>
        <ul>
            <li>Please ensure that all submissions are finalized before the designated deadline, as modifications to any page will not be possible thereafter.</li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Submit to MBIZ</h5>
        <ul>
            <li>Final Submission Date is March 31st, 2026</li>
            <li>Please ensure that all submissions are finalized before the designated deadline, as modifications to any page will not be possible thereafter.</li>
        </ul>
    </div>
    
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