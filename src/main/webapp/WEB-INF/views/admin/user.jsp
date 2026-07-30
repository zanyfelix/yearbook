<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CAPTURECORD YB</title>
    <link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/user.css"/>
</head>
<body>
<c:if test="${not empty successMessage}">
  <script>
    alert("${successMessage}");
  </script>
</c:if>
<div class="sidebar">
	<div class="userList">
		<form action="<c:url value='/admin/home' />" method="get"><!-- 관리자 사용자 시작은 테마가 먼저 -->
		<select name="userId" class="form-select" onchange="this.form.submit()">
		    	<c:forEach var="item" items="${allUsers}" varStatus="st">
		    		<option value="${item.id}">${item.schoolName}</option>
		    	</c:forEach>
		    </select>
		</form>
	</div>
    
	<a href="/admin/user?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
	<a href="/admin/theme?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
	<a href="/admin/yearbook?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
	<a href="/admin/progress?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress</a>
    <a href="/admin/contactUs?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>

<div class="content">
	<div class="container-fluid">
	
		<!-- 검색 바 -->
	    <form method="get" action="${pageContext.request.contextPath}/admin/user">
	      <select name="type">
	        <option value="userId" ${type=='userId'? 'selected':''}>USER_ID</option>
	        <option value="name" ${type=='name'? 'selected':''}>NAME</option>
	      </select>
	      <input type="text" name="keyword" value="${keyword != null ? keyword : ''}" />
	      <button type="submit">SEARCH</button>
	    </form>
    
    	<!-- 삭제용 폼 시작 -->
  		<form id="deleteForm"
        action="${pageContext.request.contextPath}/admin/user/delete"
        method="post"
        onsubmit="return confirm('Are you sure you want to delete the selected users?');">
    
	    <table class="user-table">
	      <thead>
	      	<tr>
		      <th>
		         <input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		      </th>
		      <th>No</th>
		      <th>USER_ID</th>
		      <th>PASSWORD</th>
		      <th>SCHOOL_NAME</th>
		      <th>DEADLINE</th>
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
	            <td>${item.schoolName}</td>
	            <td><fmt:formatDate value="${item.deadline}" pattern="yyyy-MM-dd"/></td>
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
		  <div class="modal-dialog">
		    <div class="modal-content">
		      <form id="registerForm"
		            action="${pageContext.request.contextPath}/admin/user/register"
		            method="post">
		        <div class="modal-header">
		          <!-- 제목은 JS로 바꿔줄 span -->
		          <h5 class="modal-title" id="registerModalLabel">USER REGISTRATION</h5>
		          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
		        </div>
		        <div class="modal-body">
		          <!-- 수정 시 채울 hidden PK -->
		          <input type="hidden" id="userIdHidden" name="id" />
		
		          <div class="mb-3">
		            <label for="userIdInput" class="form-label">USER_ID</label>
		            <input type="text" class="form-control" id="userIdInput" name="userId" required />
		          </div>
		          <div class="mb-3">
		            <label for="passwordInput" class="form-label">PASSWORD</label>
		            <input type="text" class="form-control" id="passwordInput" name="password" required />
		          </div>
		          <div class="mb-3">
		            <label for="schoolInput" class="form-label">SCHOOL_NAME</label>
		            <input type="text" class="form-control" id="schoolInput" name="schoolName" required />
		          </div>
		          <%
					  String today = new java.text.SimpleDateFormat("yyyy-MM-dd")
					                     .format(new java.util.Date());
					%>
		          <div class="mb-3">
		            <label for="deadlineInput" class="form-label">DEADLINE</label>
		            <input type="date" class="form-control" id="deadlineInput" name="deadline" value="<%= today %>" required/>
		          </div>
		          <div class="mb-3">
		            <label for="roleSelect" class="form-label">ROLE</label>
		            <select class="form-select" id="roleSelect" name="role">
		              <option value="admin">admin</option>
		              <option value="user" selected>user</option>
		            </select>
		          </div>
		        </div>
		        
		        <div class="modal-footer">
		          <button type="button"
		                  class="btn btn-secondary"
		                  data-bs-dismiss="modal">Cancel</button>
		          <button type="submit"
		                  class="btn btn-primary"
		                  id="registerSubmitBtn">Save</button>
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
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/user.js'/>"></script>
</body>
</html>
