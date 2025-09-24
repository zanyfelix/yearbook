<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>CAPTURECORD YB</title>
    <link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/progress.css"/>
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
    <div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: <fmt:formatDate value="${deadline}" pattern="MMMM dd, yyyy"/> (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <div class="section-box">
        <h5>Progress Report</h5>
        <ul>
            <li>Yearbook Submisstion Due Date: <fmt:formatDate value="${deadline}" pattern="MMMM dd, yyyy"/></li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Overall Status - ${overallCompleted} / ${overallTotal}</h5>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${overallProgress}% ; background-color: #4CAF50;">
                <span class="percentage-text">${overallProgress}%</span>
            </div>
        </div>
    </div>

    <div class="section-box">
        <h5>Group Photo Page - ${groupCompleted} / ${groupTotal}</h5>
        <div class="progress-container mb-4">
            <div class="progress-bar" style="width: ${groupProgress}% ; background-color: #4CAF50;">
                <span class="percentage-text">${groupProgress}%</span>
            </div>
        </div>
        <h5>Event Photo Page - ${eventCompleted} / ${eventTotal}</h5>
        <div class="progress-container">
            <div class="progress-bar" style="width: ${eventProgress}% ; background-color: #4CAF50;">
                <span class="percentage-text">${eventProgress}%</span>
            </div>
        </div>
    </div>

</div>

<script src="${pageContext.request.contextPath}/js/bootstrap.bundle.min.js"></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/progress.js'/>"></script>
</body>
</html>