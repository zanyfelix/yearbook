<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CAPTURECORD YB</title>
    <link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/home.css"/>
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
		<form action="<c:url value='/admin/home' />" method="get"><!-- 관리자 사용자 시작은 테마가 먼저 -->
		<select name="userId" class="form-select" onchange="this.form.submit()">
		    	<c:forEach var="item" items="${allUsers}" varStatus="st">
		    		<option value="${item.id}" <c:if test="${item.id eq userId}">selected</c:if>>${item.schoolName}</option>
		    	</c:forEach>
		    </select>
		</form>
	</div>
	
    <a href="/admin/home?userId=${userId}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
	<a href="/admin/contents?userId=${userId}" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
	<a href="/admin/submit?userId=${userId}" class="${currentMenu eq 'submission' ? 'active' : ''}">Submission</a>
	
	<button type="button"
        id="impersonateBtn" 
        class="btn btn-primary w-100" 
        style="position: absolute; width: 90% !important; bottom: 4rem; left: 50%; transform: translateX(-50%);"
        onclick="openImpersonateWindow()">
    	view as client
	</button>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>

<div class="content">
	<div class="container-fluid">
	
		<form id="homeForm" class="mb-4" action="<c:url value='/uploadGuidance'/>" method="post" enctype="multipart/form-data">
			<input type="hidden" name="mainId" value="${main.id}"/>
			<div class="section-box">
				<h5>Yearbook Guidance</h5>
				<%-- 파일 존재 여부에 따라 분기 처리 --%>
			    <c:choose>
			        <%-- 1. 첨부파일이 있는 경우 --%>
			        <c:when test="${not empty guidanceFileName}">
			            <p>- Please click <a href="<c:url value='/downloadGuidance?mainId=${main.id}'/>"><strong>HERE</strong></a> to download the manual for this program</p>
			        </c:when>
			        <%-- 2. 첨부파일이 없는 경우 (링크 없음) --%>
			        <c:otherwise>
			            <p>- Please click HERE to download the manual for this program</p>
			        </c:otherwise>
			    </c:choose>
				<p>- Please review all the guidelines prior to commencing work on the yearbook pages</p>
				<p>- If you have any difficulties of using this program, please direct your inquiries by email to CAPTURECORD Yearbook Consultant.</p>
				<%-- 현재 저장된 파일명을 표시하는 부분 추가 --%>
			    <div class="file-upload-group">
					<input type="file" name="file" id="file" class="form-control"/>
					
					<c:if test="${not empty guidanceFileName}">
						<div class="current-file-display">
							<span>${guidanceFileName}</span>
						</div>
					</c:if>
					
					<button id="btn-apply" class="btn btn-primary" type="button">SAVE</button>
                </div>
			</div>
	    </form>
	    
		<table>
	      <thead>
	      	<tr>
		      <th>
		         <input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		      </th>
		      <th>TITLE</th>
		      <th>DESCRIPTION</th>
		      <th>APPLY</th>
		    </tr>
	      </thead>
	      <tbody>
			<c:if test="${empty homeList}">
				<tr>
					<td colspan="10" style="text-align: center; padding: 20px; color: #666;">no data</td>
				</tr>
			</c:if>
	       <c:forEach var="item" items="${homeList}" varStatus="st">
	       	  <c:if test="${item.type eq 'content'}">
	          <tr>
	          	<td>
		            <input type="checkbox" class="selectBox" name="ids" value="${item.id}" />
		        </td>
	            <td>${item.title}</td>
	            <td>
	            	<textarea rows="3" cols="110" disabled>${item.description}</textarea>
	            </td>
	            <td>
				  <label class="toggle-switch">
				    <!-- unchecked 시에도 값이 0으로 넘어가게 하는 hidden field -->
				    <input type="hidden" name="active" value="0"/>
				    <!-- 체크된 경우에만 value="1" 이 넘어갑니다 -->
				    <input
				      type="checkbox"
				      name="active"
				      value="1"
				      data-id="${item.id}"
				      ${item.isActive == true ? "checked" : ""}
				    />
				    <span class="slider"></span>
				  </label>
				</td>
	          </tr>
	          </c:if>
	        </c:forEach>
	      </tbody>
	    </table>
	    
		<div class="btn-wrapper">
		    <button id="btn-register" type="button" data-bs-toggle="modal" data-bs-target="#registerModal">REGISTER</button>
		    <button id="btn-modify" type="button">MODIFY</button>
		    <button id="btn-delete" type="button">DELETE</button>
		    <button id="btn-apply-status" type="button">APPLY</button>
		    <button id="btn-copy-to-all" type="button" class="btn-copy-all" onclick="showCopyToAllModal()">
		        COPY TO ALL USERS
		    </button>
	    </div>
	    
	    <div class="modal fade" id="registerModal" tabindex="-1" aria-hidden="true">
		  <div class="modal-dialog modal-dialog-centered">
		    <div class="modal-content">
		      <form id="registerForm"
			      action="${pageContext.request.contextPath}/admin/home/register"
			      method="post">
			      <input type="hidden" id="userId" name="userId" value="${userId}"/>
			      <input type="hidden" id="homeId" name="id" value=""/>
			      <input type="hidden" id="isActive" name="isActive" value=""/>
			  <div class="modal-header">
			    <h5 class="modal-title" id="registerModalLabel">REGISTRATION</h5>
			    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
			  </div>
			  <div class="modal-body">
			    <div class="mb-3">
			      <label for="title" class="form-label">TITLE</label>
			      <input type="text" class="form-control" id="title" name="title" required />
			    </div>
			    <div class="mb-3">
			      <label for="description" class="form-label">DESCRIPTION</label>
			      <textarea class="form-control" id="description" name="description" rows="3" cols="110"></textarea>
			    </div>
			  </div>
			  <div class="modal-footer">
			    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
			    <button type="submit" class="btn btn-primary" id="registerSubmitBtn">Save</button>
			  </div>
			</form>
		    </div>
		  </div>
		</div>
		
		<!-- ✨ 복사 확인 모달 추가 -->
		<div class="modal fade" id="copyToAllModal" tabindex="-1" aria-hidden="true">
		  <div class="modal-dialog modal-dialog-centered">
		    <div class="modal-content">
		      <div class="modal-header bg-warning">
		        <h5 class="modal-title">⚠️ Copy to All Users</h5>
		        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
		      </div>
		      <div class="modal-body">
		        <div class="alert alert-warning mb-3">
		          <strong>Warning:</strong> This action will overwrite Home settings for ALL users!
		        </div>
		        <p><strong>Current User:</strong> <span id="currentUserName" class="text-primary"></span></p>
		        <p>The following data will be copied to all users:</p>
		        <ul>
		          <li>All content titles and descriptions</li>
		          <li>Apply status (Active/Inactive)</li>
		        </ul>
		        <p class="text-danger"><strong>This action cannot be undone!</strong></p>
		      </div>
		      <div class="modal-footer">
		        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
		        <button type="button" class="btn btn-danger" onclick="executeCopyToAll()">
		          <i class="bi bi-check-circle"></i> Confirm & Copy
		        </button>
		      </div>
		    </div>
		  </div>
		</div>
		
	</div>
</div>
<script>
const ctx  = '${pageContext.request.contextPath}';
const currentUserId = '${userId}';
const currentUserName = '${userId}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/home.js'/>"></script>
</body>
</html>