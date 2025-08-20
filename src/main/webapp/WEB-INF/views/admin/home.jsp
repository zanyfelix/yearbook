<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdminHome</title>
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

	<h5>${sessionScope.loginUser.schoolName}</h5>
	
	<form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
	
    <a href="/admin/user" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
	<a href="/admin/theme" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
	<a href="/admin/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
	<a href="/admin/contents" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
	<a href="/admin/submit" class="${currentMenu eq 'submisstion' ? 'active' : ''}">Submission</a>
	<a href="/admin/yearbook" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
    <a href="/admin/contactUs" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
</div>

<div class="content">
	<div class="container-fluid">
	
		<!-- 검색 바 -->
		<form method="get" action="${pageContext.request.contextPath}/admin/home" class="search-form">
		    <select name="userId" class="form-select">
		        <c:forEach var="item" items="${users}" varStatus="st">
		        	<option value="${item.id}" <c:if test="${item.id eq userId}">selected</c:if>>${item.schoolName}</option>
		        </c:forEach>
		    </select>
		    <button type="submit" class="btn btn-primary" id="search">SEARCH</button>
		</form>
		
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
				<p>- If you have any difficulties of using this program, please direct your inquiries by email to chris.kim@mbizkr.com</p>
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
	       <c:forEach var="item" items="${homeList}" varStatus="st">
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
	        </c:forEach>
	      </tbody>
	    </table>
	    
		<div class="btn-wrapper">
		    <button id="btn-register" type="button" data-bs-toggle="modal" data-bs-target="#registerModal">REGISTER</button>
		    <button id="btn-modify" type="button">MODIFY</button>
		    <button id="btn-delete" type="button">DELETE</button>
		    <button id="btn-apply-status" type="button">APPLY</button>
	    </div>
	    
	    <div class="modal fade" id="registerModal" tabindex="-1" aria-hidden="true">
		  <div class="modal-dialog">
		    <div class="modal-content">
		      <form id="registerForm"
			      action="${pageContext.request.contextPath}/admin/home/register"
			      method="post">
			      <input type="hidden" id="userId" name="userId" value="${userId}"/>
			  <div class="modal-header">
			    <h5 class="modal-title" id="registerModalLabel">REGISTRATION</h5>
			    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
			  </div>
			  <div class="modal-body">
			    <input type="hidden" id="id" name="id" value="${id}"/>
			    <input type="hidden" id="currentUserId" name="userId" value="${userId}" />
			
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
	    
	</div>
</div>
<script>
const ctx  = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/home.js'/>"></script>
</body>
</html>