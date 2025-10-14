<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<%@ page import="java.time.format.DateTimeFormatter" %>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>CAPTURECORD YB</title>
	<link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
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
	    <form method="get" action="${pageContext.request.contextPath}/admin/contactUs">
	      <select name="type">
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
        method="post">	

    <table>
      <thead>
      	<tr>
      	  <th>
		  	<input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		  </th>
	      <th>No</th>
	      <th>Name</th>
	      <th>Email</th>
	      <th>SCHOOL_NAME</th>
	      <th>SUBJECT</th>
	      <th>MESSAGE</th>
	      <th>RECEIVED_Time</th>
	      <th>STATUS</th>
	      <th>REPLIED_Time</th>
	    </tr>
      </thead>
      <tbody>
      	<c:if test="${empty contacts}">
	      	<tr>
	      <td colspan="10" style="text-align: center; padding: 20px; color: #666;">
	        no data
	      </td>
	    </tr>
	  </c:if>
       <c:forEach var="item" items="${contacts}" varStatus="st">
          <tr>
          	<td>
		    	<input type="checkbox" class="selectBox" name="ids" value="${item.id}" />
		    </td>
            <td>${st.index + 1}</td>
            <td>${item.name}</td>
            <td>${item.mail}</td>
            <td>${item.schoolName}</td>
            <td>${item.subject}</td>
            <td>
            <a href="#"
             class="btn-open-detail"
             data-bs-toggle="modal"
             data-bs-target="#contactModal"
             data-id="${item.id}"
             data-user="${fn:escapeXml(item.name)}"
             data-mail="${fn:escapeXml(item.mail)}"
             data-schoolName="${fn:escapeXml(item.schoolName)}"
             data-subject="${fn:escapeXml(item.subject)}"
             data-message="${fn:escapeXml(item.message)}"
             <c:if test="${not empty item.attachmentPath}">
           		data-attachment-path="${fn:escapeXml(item.attachmentPath)}"
		       </c:if>
		       >
		    Open</a>
		    </td>
		    <td>${item.createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))}</td>
            <td>${item.status}</td>
            <td>
            	<c:if test="${not empty item.status}">
            	${item.updatedAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))}
            	</c:if>
           </td>
          </tr>
        </c:forEach>
      </tbody>
    </table>

    <div class="btn-wrapper">
		<button id="btn-apply" type="button">APPLY</button>
		<button id="btn-delete" type="button">DELETE</button>
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
	      	<input type="hidden" id="modalContactId">
	        <p><strong>Name:</strong> <span id="modalUser"></span></p>
	        <p><strong>Email:</strong> <span id="modalEmail"></span></p>
	        <p><strong>Subject:</strong> <span id="modalSubject"></span></p>
	        <hr>
	        <strong>Message:</strong>
	        <pre id="modalMessage" style="white-space: pre-wrap; margin:0;"></pre>
	        
			<%-- ▼▼▼ 첨부파일 표시 영역 추가 ▼▼▼ --%>
		    <div id="modalAttachmentWrapper" style="display: none; margin-top: 15px;">
		        <hr>
		        <strong>Attachment:</strong>
		        <a href="#" id="modalAttachmentLink" download></a>
		    </div>
	      </div>
	      <div class="modal-footer">
	        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
	        <button type="button" id="forwardInquiryBtn" class="btn btn-primary">Forward to Admin</button>
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