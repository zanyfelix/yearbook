<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Home</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/home.css"/>
    <script src="<c:url value='/js/admin/home.js'/>"></script>
</head>
<body>
<c:if test="${not empty successMessage}">
  <div class="alert alert-success">${successMessage}</div>
</c:if>
<c:if test="${not empty errorMessage}">
  <div class="alert alert-warning">${errorMessage}</div>
</c:if>
<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
	<form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
	<a href="/admin/user" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
    <a href="/admin/theme" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
    <a href="/admin/deadline" class="${currentMenu eq 'deadline' ? 'active' : ''}">Deadline</a>
    <a href="/admin/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/admin/contents" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
    <a href="/admin/submission" class="${currentMenu eq 'submisstion' ? 'active' : ''}">Submission</a>
    <a href="/admin/yearbook" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
    <a href="/admin/contactUs" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
</div>

<div class="content">
	<div class="top-bar">
	</div>
	
	<div class="container-fluid">
	
	<!-- 검색 바 -->
    <form method="get" action="${pageContext.request.contextPath}/admin/user">
    	<select name="type">
    		<c:forEach var="item" items="${users}" varStatus="st">
    			<option value="userId" >${item.schoolName}</option>
	    	</c:forEach>
      </select>
      <button type="submit">SEARCH</button>
    </form>
    
    <button class="btn btn-success mb-3" id="addBtn">REGISTER</button>
    
    <!-- 삭제용 폼 시작 -->
  	<form id="deleteForm"
        action="${pageContext.request.contextPath}/admin/user/delete"
        method="post"
        onsubmit="return confirm('Are you sure you want to delete the selected users?');">
    
    <table>
      <thead>
      	<tr>
	      <th>
	         <input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
	      </th>
	      <th>No</th>
	      <th>USER_ID</th>
	      <th>PASSWORD</th>
	      <th>NAME</th>
	      <th>SCHOOL_NAME</th>
	      <th>MAIL</th>
	      <th>ROLE</th>
	      <th>ACTIVE</th>
	    </tr>
      </thead>
      <tbody>
       <c:forEach var="item" items="${users}" varStatus="st">
          <tr>
          	<td>
	            <input type="checkbox" class="selectBox" name="ids" value="${item.id}" />
	        </td>
            <td>${st.index + 1}</td>
            <td>${item.userId}</td>
            <td>${item.password}</td>
            <td>${item.name}</td>
            <td>${item.schoolName}</td>
            <td>${item.mail}</td>
            <td>${item.role}</td>
            <td>
			  <label class="toggle-switch">
			    <!-- unchecked 시에도 값이 0으로 넘어가게 하는 hidden field -->
			    <input type="hidden" name="active" value="0"/>
			    <!-- 체크된 경우에만 value="1" 이 넘어갑니다 -->
			    <input
			      type="checkbox"
			      name="active"
			      value="1"
			      data-user-id="${item.id}"
			      ${item.active == true ? "checked" : ""}
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
	    <button id="btn-delete" type="submit">DELETE</button>
    </div>
    </form>
    
    
    <!-- registerModal -->
	<div class="modal fade" id="registerModal" tabindex="-1" aria-hidden="true">
	  <div class="modal-dialog modal-lg">
	    <div class="modal-content">
	      <form id="registerForm" action="${pageContext.request.contextPath}/admin/home/register" method="post" enctype="multipart/form-data">
	        <div class="modal-header">
	          <!-- 제목은 JS로 바꿔줄 span -->
	          <h5 class="modal-title" id="registerModalLabel">HOME REGISTRATION</h5>
	          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
	        </div>
	        <div class="modal-body">
	          <!-- 수정 시 채울 hidden PK -->
	          <input type="hidden" id="idHidden" name="id" />
	
	          <div class="mb-3">
	            <label for="titleInput" class="form-label">TITLE</label>
	            <input type="text" class="form-control" id="titleInput" name="title" required />
	          </div>
	          
	          <div class="mb-3">
	            <label for="descriptionInput" class="form-label">DESCRIPTION</label>
	            <textarea class="form-control" id="descriptionInput" name="description" rows="4" required></textarea>
	          </div>
	          
	          <div class="mb-3">
	            <label for="displayOrderInput" class="form-label">DISPLAY ORDER</label>
	            <input type="number" class="form-control" id="displayOrderInput" name="displayOrder" min="0" />
	          </div>
	
	          <div class="mb-3">
	            <label for="fileInput" class="form-label">FILE UPLOAD</label>
	            <input type="file" class="form-control" id="fileInput" name="uploadFile" />
	          </div>
	          
	        </div>
	        
	        <div class="modal-footer">
	          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
	          <!-- 이 버튼 텍스트도 JS로 바꿔줌 -->
	          <button type="submit" class="btn btn-primary" id="registerSubmitBtn">등록</button>
	        </div>
	        
	      </form>
	    </div>
	  </div>
	</div>

</div>
</div>
<script>
window.contextPath = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
</body>
</html>