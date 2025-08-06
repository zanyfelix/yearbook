<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>AdminHome</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/home.css"/>
</head>
<body>
<c:if test="${not empty successMessage}">
  <div class="alert alert-success">${successMessage}</div>
</c:if>
<c:if test="${not empty errorMessage}">
  <div class="alert alert-warning">${errorMessage}</div>
</c:if>
<div class="sidebar">

	<div class="mb-3">
		<form action="<c:url value='/admin/home' />" method="get"><!-- 관리자 사용자 시작은 테마가 먼저 -->
		<select name="userId" class="form-select" onchange="this.form.submit()">
		    	<c:forEach var="item" items="${allUsers}" varStatus="st">
		    		<option value="${item.id}" <c:if test="${item.id == userId}">selected</c:if>>${item.schoolName}</option>
		    	</c:forEach>
		    </select>
		</form>
	</div>
	
	<form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
    <a href="/admin/home?userId=${userId}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/admin/contents?userId=${userId}" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
    <a href="/admin/submission?userId=${userId}" class="${currentMenu eq 'submisstion' ? 'active' : ''}">Submission</a>
    <a href="/admin/yearbook?userId=${userId}" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
    <a href="/admin/contactUs?userId=${userId}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
</div>

<div class="content">

		<div class="btn-wrapper">
			<button type="button" id="btn-create">Create</button>
			<button type="button" id="btn-delete">Delete</button>
			<button type="button" id="btn-edit">Edit</button>
		</div>

		<c:forEach var="item" items="${homeList}" varStatus="st">
			<div class="section-box">
				<h5>${item.title}</h5>
				<textarea rows="3" cols="110" disabled>${item.description}</textarea>
			</div>
		</c:forEach>

		<%-- <form id="settingsForm" method="post" enctype="multipart/form-data">
			<div class="settings-block" data-id="${guidanceFile.id}">
				<input type="checkbox" name="selectedIds" value="${guidanceFile.id}">
				<div class="block-content">
					<span>Yearbook Guidance</span>
					<p>
						- Please click <a href="<c:url value='/admin/download/guidance'/>">HERE</a>
						to download the guidance(manual) for this program
					</p>
				</div>
				<div class="file-upload-area">
					<span>${guidanceFile.originalFileName}</span> <input type="file"
						id="guidanceUpload" name="guidanceFile" style="display: none;">
					<button type="button" class="btn-upload"
						onclick="$('#guidanceUpload').click();">Upload</button>
				</div>
			</div>
		
			<div id="content-block-container">
				<c:forEach var="block" items="${contentBlocks}">
					<div class="settings-block" data-id="${block.id}">
						<input type="checkbox" name="selectedIds" value="${block.id}">
						<div class="block-content">
							<input type="text" name="title" class="title-input"
								value="${block.title}" readonly>
							<textarea name="content" class="text-input" readonly>${block.content}</textarea>
						</div>
					</div>
				</c:forEach>
			</div>
		</form> --%>
	
	<%-- 하단 적용 버튼 --%>
    <div class="bottom-buttons">
    	<button type="button" id="btn-apply">APPLY</button>
        <button type="button" id="btn-apply-all">APPLY ALL</button>
    </div>
</div>
<script>
	window.contextPath = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/home.js'/>"></script>
</body>
</html>