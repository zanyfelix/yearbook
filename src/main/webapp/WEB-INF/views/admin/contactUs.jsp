<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Contact Us</title>
	<link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/contactUs.css"/>
</head>
<body>
<c:if test="${not empty successMessage}">
  <script>
    alert("${successMessage}");
  </script>
</c:if>
<div class="sidebar">
	<div class="mb-3">
	<form action="<c:url value='/admin/theme' />" method="get">
	<select name="userId" class="form-select" onchange="this.form.submit()">
	    	<c:forEach var="item" items="${allUsers}" varStatus="st">
	    		<option value="${item.id}">${item.schoolName}</option>
	    	</c:forEach>
	    </select>
	</form>
	</div>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
    
    <a href="/admin/user?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
    <a href="/admin/submission?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'submisstion' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Submission</a>
    <a href="/admin/yearbook?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'yearbook' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Yearbook</a>
    <a href="/admin/contactUs?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
</div>
<div class="content">

	<div class="container-fluid">
    
		<!-- 검색 바 -->
	    <form method="get" action="${pageContext.request.contextPath}/admin/user">
	      <select name="type">
	        <option value="userId" ${type=='userId'? 'selected':''}>USER_ID</option>
	        <option value="name" ${type=='name'? 'selected':''}>NAME</option>
	        <option value="schoolName" ${type=='schoolName'? 'selected':''}>SCHOOL_NAME</option>
	        <option value="subject" ${type=='subject'? 'selected':''}>SUBJECT</option>
	      </select>
	      <input type="text" name="keyword" value="${keyword != null ? keyword : ''}" />
	      <button type="submit">SEARCH</button>
	    </form>
	
	<p>
      Admin Email:
      <strong id="currentAdminEmail">${mail}</strong>
      <!-- 수정 버튼 -->
      <button type="button"
              class="btn btn-sm btn-outline-secondary ms-2"
              data-bs-toggle="modal"
              data-bs-target="#editAdminEmailModal">
        Edit
      </button>
    </p>
    	
    <form id="applyForm"
        action="${pageContext.request.contextPath}/admin/contactUs/apply"
        method="post"
        onsubmit="return confirm('Are you sure you want to apply the selected users?');">	

    <table>
      <thead>
      	<tr>
      	  <th>
		  	<input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		  </th>
	      <th>No</th>
	      <th>USER_ID</th>
	      <th>Name</th>
	      <th>Email</th>
	      <th>SCHOOL_NAME</th>
	      <th>SUBJECT</th>
	      <th>MESSAGE</th>
	      <th>STATUS</th>
	    </tr>
      </thead>
      <tbody>
       <c:forEach var="item" items="${contacts}" varStatus="st">
          <tr>
          	<td>
		    	<input type="checkbox" class="selectBox" name="ids" value="${item.id}" />
		    </td>
            <td>${st.index + 1}</td>
            <td>${item.userId}</td>
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td>${item.schoolName}</td>
            <td>${item.subject}</td>
            <td>
            <a href="#"
             class="btn-open-detail"
             data-bs-toggle="modal"
             data-bs-target="#contactModal"
             data-user="${fn:escapeXml(item.name)}"
             data-email="${fn:escapeXml(item.email)}"
             data-schoolName="${fn:escapeXml(item.schoolName)}"
             data-subject="${fn:escapeXml(item.subject)}"
             data-message="${fn:escapeXml(item.message)}">
            Open</a></td>
            <td>${item.status}</td>
          </tr>
        </c:forEach>
      </tbody>
    </table>

    <div class="btn-wrapper">
		<button id="btn-apply" type="submit">APPLY</button>
	</div>
    </form>
    
    <!-- 관리자 이메일 수정 모달 -->
    <div class="modal fade" id="editAdminEmailModal" tabindex="-1" aria-labelledby="editAdminEmailLabel" aria-hidden="true">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <form action="${pageContext.request.contextPath}/admin/contactUs/updateAdminEmail"
                method="post"
                onsubmit="return confirm('Would you like to change the administrator email?');">
            <div class="modal-header">
              <h5 class="modal-title" id="editAdminEmailLabel">administrator mail</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
               <input type="hidden" id="userIdHidden" name="id" value="${id}" />
            	
              <div class="mb-3">
                <label for="inputAdminEmail" class="form-label">Email</label>
                <input type="email"
                       class="form-control"
                       id="inputAdminEmail"
                       name="adminEmail"
                       value="${mail}"
                       required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- 문의 상세 모달 -->
	<div class="modal fade" id="contactModal" tabindex="-1" aria-labelledby="contactModalLabel" aria-hidden="true">
	  <div class="modal-dialog modal-lg modal-dialog-centered">
	    <div class="modal-content">
	      <div class="modal-header">
	        <h5 class="modal-title" id="contactModalLabel">ContactUs</h5>
	        <button type="button" class="btn-close" data-bs-dismiss="modal"
	                aria-label="Close"></button>
	      </div>
	      <div class="modal-body">
	        <p><strong>Name:</strong> <span id="modalUser"></span></p>
	        <p><strong>Email:</strong> <span id="modalEmail"></span></p>
	        <p><strong>Subject:</strong> <span id="modalSubject"></span></p>
	        <hr>
	        <strong>Message:</strong>
	        <pre id="modalMessage" style="white-space: pre-wrap; margin:0;"></pre>
	      </div>
	      <div class="modal-footer">
	        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
	      </div>
	    </div>
	  </div>
	</div>
  </div>
  
</div>
<script>
window.contextPath = '${pageContext.request.contextPath}';
</script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js"></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/contactUs.js'/>"></script>
</body>
</html>