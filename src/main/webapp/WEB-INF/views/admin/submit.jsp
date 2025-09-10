<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Progress</title>
<link rel="stylesheet"
	href="${pageContext.request.contextPath}/css/bootstrap.min.css" />
<link rel="stylesheet" type="text/css"
	href="${pageContext.request.contextPath}/css/admin/submit.css" />
</head>
<body>
	<c:if test="${not empty successMessage}">
		<script>
			alert("${successMessage}");
		</script>
	</c:if>
	<c:if test="${not empty errorMessage}">
		<script>
			alert("${errorMessage}");
		</script>
	</c:if>
	<div class="sidebar">

		<div class="userList">
			<form action="<c:url value='/admin/submit' />" method="get">
				<!-- 관리자 사용자 시작은 테마가 먼저 -->
				<select name="userId" class="form-select"
					onchange="this.form.submit()">
					<c:forEach var="item" items="${allUsers}" varStatus="st">
						<option value="${item.id}"
							<c:if test="${item.id eq userId}">selected</c:if>>${item.schoolName}</option>
					</c:forEach>
				</select>
			</form>
		</div>

		<a href="/admin/home?userId=${userId}"
			class="${currentMenu eq 'home' ? 'active' : ''}">Home</a> <a
			href="/admin/contents?userId=${userId}"
			class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a> <a
			href="/admin/submit?userId=${userId}"
			class="${currentMenu eq 'submission' ? 'active' : ''}">Submission</a>

		<form id="logoutForm"
			action="${pageContext.request.contextPath}/logout" method="post"
			style="margin-bottom: 1rem;">
			<button type="submit" class="btn btn-secondary w-100"
				style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
		</form>
	</div>

	<div class="content">
		<div class="container-fluid">

			<form action="${pageContext.request.contextPath}/admin/submit/save"
				method="post" id="submitForm">
				<input type="hidden" name="userId" value="${userId}">
				<%-- Submit to MBIZ - Overview 섹션 --%>
				<div class="section-box" data-section-id="overview"
					data-section-type="default">
					<div class="section-header">
						<h5>Submit to MBIZ</h5>
						<div class="section-controls">
							<button type="button" class="btn-edit" onclick="toggleEditMode('overview')">EDIT</button>
							<button type="button" class="btn-save" onclick="saveSection('overview')" style="display: none;">SAVE</button>
						</div>
					</div>
					<div class="section-content">
						<input type="hidden" name="sections[0].type" value="overview">
						<input type="hidden" name="sections[0].id"
							value="${overviewSection.id}">
						<h6>Overview</h6>
						<textarea name="sections[0].content"
							class="form-control readonly-mode" rows="4" readonly>${overviewSection.description}</textarea>
					</div>
				</div>
			</form>
		</div>
	</div>
	<script>
		const ctx = '${pageContext.request.contextPath}';
	</script>
	<script
		src="${pageContext.request.contextPath}/js/bootstrap.bundle.min.js"></script>
	<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
	<script src="<c:url value='/js/admin/submit.js'/>"></script>
</body>
</html>