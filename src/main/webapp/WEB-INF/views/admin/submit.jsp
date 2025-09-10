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
				<div class="section-box" data-section-id="overview" data-section-type="default">
					<div class="section-header">
						<h5>Submit to MBIZ</h5>
						<div class="section-controls">
							<button type="button" class="btn-edit" onclick="toggleEditMode('overview')">EDIT</button>
							<button type="button" class="btn-save" onclick="saveSection('overview')" style="display: none;">SAVE</button>
						</div>
					</div>
					<div class="section-content">
						<input type="hidden" name="sections[0].type" value="overview">
						<input type="hidden" name="sections[0].id" value="${overviewSection.id}">
						<h6>Overview</h6>
						<textarea name="sections[0].content" class="form-control readonly-mode" rows="4" readonly>${overviewSection.description}</textarea>
					</div>
				</div>
				
				<%-- 2. Previews 섹션 --%>
                <div class="section-box" data-section-id="previews" data-section-type="default">
                    <div class="section-header">
                        <h5>Previews</h5>
                        <div class="section-controls">
                            <button type="button" class="btn-edit">EDIT</button>
                            <button type="button" class="btn-save" style="display:none;">SAVE</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <input type="hidden" name="sections[1].type" value="previews">
                        <input type="hidden" name="sections[1].id" value="${previewsSection.id}">
                        
                        <table class="preview-table">
                            <thead>
                                <tr>
                                    <th width="50%">Preview Title</th>
                                    <th width="25%" class="text-center">Status</th>
                                    <th width="25%" class="text-center">Page Confirm</th>
                                </tr>
                            </thead>
                            <tbody>
                                <c:forEach var="item" items="${contentsList}" varStatus="st">
                                    <tr data-completed="${item.savedPagesCount eq item.contentsInfo.pages}">
                                        <td>
                                            <c:choose>
                                                <c:when test="${item.savedPagesCount ne item.contentsInfo.pages}">
                                                    <span class="preview-incomplete" onclick="loadPreviewData('${item.contentsInfo.id}')">
                                                        ${item.contentsInfo.title}
                                                    </span>
                                                </c:when>
                                                <c:otherwise>
                                                    <span class="preview-complete" onclick="loadPreviewData('${item.contentsInfo.id}')">
                                                        ${item.contentsInfo.title}
                                                    </span>
                                                </c:otherwise>
                                            </c:choose>
                                        </td>
                                        <td class="text-center">
                                            <c:choose>
                                                <c:when test="${item.savedPagesCount eq item.contentsInfo.pages}">
                                                    <span class="badge bg-success">Complete</span>
                                                </c:when>
                                                <c:otherwise>
                                                    <span class="badge bg-danger">Incomplete</span>
                                                </c:otherwise>
                                            </c:choose>
                                        </td>
                                        <td class="text-center">
                                            <input type="checkbox" 
                                                   class="preview-confirm-check"
                                                   disabled>
                                        </td>
                                    </tr>
                                </c:forEach>
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 15px;">
                            <strong>Note</strong>
                            <textarea name="sections[1].note" 
                                      class="form-control note-textarea readonly-mode" 
                                      rows="2" 
                                      readonly>${noteSection.description}</textarea>
                        </div>
                    </div>
                </div>
				
				<%-- Page Submission 섹션 --%>
				<div class="section-box" data-section-id="submission" data-section-type="default">
	                <div class="section-header">
	                    <h5>Page Submission</h5>
	                    <div class="section-controls">
	                        <button type="button" class="btn-edit" onclick="toggleEditMode('submission')">EDIT</button>
	                        <button type="button" class="btn-save" onclick="saveSection('submission')" style="display:none;">SAVE</button>
	                    </div>
	                </div>
	                <div class="section-content">
	                    <input type="hidden" name="sections[2].type" value="submission">
	                    <input type="hidden" name="sections[2].id" value="${submissionSection.id}">
	                    <div id="submissionList">
				            <c:forEach var="item" items="${submissionItems}" varStatus="status">
				                <div class="submission-item" data-item-index="${status.index}">
				                    <textarea name="submissions[${status.index}].description" 
				                              class="form-control readonly-mode" 
				                              rows="2"
				                              readonly>${item.description}</textarea>
				                </div>
				            </c:forEach>
				        </div>
	                </div>
	            </div>
	            
	            <%-- 4. 커스텀 섹션들 --%>
                <div id="customSectionsContainer">
                    <c:forEach var="customSection" items="${customSections}" varStatus="status">
                        <div class="section-box custom-section" data-section-id="custom_${customSection.id}" data-section-type="custom">
                            <!-- 커스텀 섹션 내용 -->
                        </div>
                    </c:forEach>
                </div>
	            
			</form>
			
			<%-- 하단 버튼들 --%>
            <div class="btn-wrapper" style="text-align: center; margin-top: 30px;">
                <button type="button" class="btn btn-primary btn-lg" onclick="applyAllSettings()">
                    APPLY
                </button>
            </div>
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