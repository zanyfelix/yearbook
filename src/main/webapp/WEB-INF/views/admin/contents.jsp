<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true"%>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn"%>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CAPTURECORD YB</title>
<link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
<link rel="stylesheet"
	href="${pageContext.request.contextPath}/css/bootstrap.min.css" />
<link rel="stylesheet" type="text/css"
	href="${pageContext.request.contextPath}/css/admin/contents.css" />
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
			<form action="<c:url value='/admin/contents' />" method="get">
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

		<button type="button" id="impersonateBtn"
			class="btn btn-primary w-100"
			style="position: absolute; width: 90% !important; bottom: 4rem; left: 50%; transform: translateX(-50%);"
			onclick="openImpersonateWindow()">view as client</button>

		<form id="logoutForm"
			action="${pageContext.request.contextPath}/logout" method="post"
			style="margin-bottom: 1rem;">
			<button type="submit" class="btn btn-secondary w-100"
				style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
		</form>
	</div>

	<div class="content">
		<div class="container-fluid">

			<p>
				Total Pages: <strong id="totalPages">${totalPages}</strong>
				<!-- 수정 버튼 -->
			</p>

			<form id="deleteForm"
				action="${pageContext.request.contextPath}/admin/contents/delete?userId=${userId}"
				method="post"
				onsubmit="return confirm('Are you sure you want to delete the selected contents?');">

				<table>
					<thead>
						<tr>
							<th><input type="checkbox" id="selectAll"
								onclick="toggleAll(this)" /></th>
							<th>No</th>
							<th>CATEGORY</th>
							<th>TITLE</th>
							<th>PAGES</th>
							<th>ACTIVE</th>
						</tr>
					</thead>
					<tbody>
						<c:if test="${empty contentsList}">
							<tr>
								<td colspan="10" style="text-align: center; padding: 20px; color: #666;">no data</td>
							</tr>
						</c:if>
						<c:forEach var="item" items="${contentsList}" varStatus="st">
							<tr>
								<td><input type="checkbox" class="selectBox" name="ids"
									value="${item.id}" /></td>
								<td>${st.index + 1}</td>
								<td>${item.category}</td>
								<td>${item.title}</td>
								<td>${item.pages}</td>
								<td><label class="toggle-switch"> <!-- unchecked 시에도 값이 0으로 넘어가게 하는 hidden field -->
										<input type="hidden" name="active" value="0" /> <!-- 체크된 경우에만 value="1" 이 넘어갑니다 -->
										<input type="checkbox" name="active" value="1"
										data-id="${item.id}" ${item.active == true ? "checked" : ""} />
										<span class="slider"></span>
								</label></td>
							</tr>
						</c:forEach>
					</tbody>
				</table>

				<div class="btn-wrapper">
					<button id="btn-register" type="button" data-bs-toggle="modal"
						data-bs-target="#registerModal">REGISTER</button>
					<button id="btn-modify" type="button">MODIFY</button>
					<button id="btn-delete" type="submit">DELETE</button>
					<button id="btn-apply" type="button">APPLY</button>
				</div>
			</form>

			<div class="modal fade" id="registerModal" tabindex="-1"
				aria-hidden="true">
				<div class="modal-dialog">
					<div class="modal-content">
						<form id="registerForm"
							action="${pageContext.request.contextPath}/admin/contents/register"
							method="post">
							<div class="modal-header">
								<!-- 제목은 JS로 바꿔줄 span -->
								<h5 class="modal-title" id="registerModalLabel">CONTENTS
									REGISTRATION</h5>
								<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
							</div>
							<div class="modal-body">
								<!-- 수정 시 채울 hidden PK -->
								<input type="hidden" id="id" name="id" /> <input type="hidden"
									id="userId" name="userId" value="${userId}" />

								<div class="mb-3">
									<label for="categorySelect" class="form-label">CATEGORY</label>
									<select class="form-select" id="categorySelect" name="category">
										<option value="group">GROUP</option>
										<option value="event">EVENT</option>
									</select>
								</div>
								<div class="mb-3">
									<label for="titleInput" class="form-label">TITLE</label> <input
										type="text" class="form-control" id="titleInput" name="title"
										required />
								</div>
								<div class="mb-3">
									<label for="pagesInput" class="form-label">PAGES</label> <input
										type="number" class="form-control" id="pagesInput"
										name="pages" required min="1" step="1" />
								</div>
							</div>

							<div class="modal-footer">
								<button type="button" class="btn btn-secondary"
									data-bs-dismiss="modal">취소</button>
								<button type="submit" class="btn btn-primary"
									id="registerSubmitBtn">등록</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</div>
	<script>
		const ctx = '${pageContext.request.contextPath}';
		const userId = '${userId}';
	</script>
	<script src="${pageContext.request.contextPath}/js/bootstrap.min.js"
		defer></script>
	<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
	<script src="<c:url value='/js/admin/contents.js'/>"></script>
</body>
</html>