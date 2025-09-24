<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>CAPTURECORD YB</title>
	<link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
	<link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
	<link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/contactUs.css"/>
	<script>
    	// 서버에서 yyyy-MM-dd 포맷으로 전달된 deadline
    	var deadlineStr = '${deadline}';
    </script>
</head>
<body>
<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    
    <a href="/home?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contactUs" class="${currentMenu eq 'contactUs' ? 'active' : ''}">Contact Us</a>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>
<div class="content">
  	<div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: <fmt:formatDate value="${deadline}" pattern="MMMM dd, yyyy"/> (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
	<div class="contact-card">
    	<h2>CONTACT US</h2>
    	<p class="subtitle">Please use the form below to submit any inquiries regarding the use of program</p>

    <form:form method="POST" modelAttribute="contact" enctype="multipart/form-data" id="contactForm">
    	<form:input type="hidden" path="userId" id="userId" value="${sessionScope.loginUser.id}"  />
      <div class="form-group">
        <label for="name">NAME</label>
        <form:input path="name" id="name" cssClass="form-control" placeholder="Your name" />
      </div>

      <div class="form-group">
        <label for="mail">EMAIL</label>
        <form:input path="mail" id="mail" type="email" cssClass="form-control" placeholder="youremail@example.com" />
      </div>

      <div class="form-group">
        <label for="subject">SUBJECT</label>
        <form:input path="subject" id="subject" cssClass="form-control" placeholder="Subject" />
      </div>

      <div class="form-group">
        <label for="message" style="height: 150px;">MESSAGE</label>
        <form:textarea path="message" id="message" cssClass="form-control" placeholder="Your message..." />
      </div>

      <div class="form-group-file">
        <label for="file">FILE</label>
        <input type="file" name="file" id="file" class="form-control"/>
      </div>
      <p class="note">*Please upload any relevant files (e.g., photos, screenshots) for reference.</p>

      <button type="button" class="btn-submit" id="submitBtn">SUBMIT</button>
    </form:form>
    
      <!-- Bootstrap 모달 마크업 -->
	  <div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" aria-hidden="true">
	    <div class="modal-dialog modal-dialog-centered">
	      <div class="modal-content">
	        <div class="modal-header border-0">
	          <h5 class="modal-title" id="successModalLabel">Contact Us</h5>
	        </div>
	        <div class="modal-body">
	          <p class="mb-0">
	            Your inquiry has been successfully submitted.<br/>
	            We will review your request and respond via email as soon as possible.
	          </p>
	        </div>
	        <div class="modal-footer border-0">
	          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
	            Close
	          </button>
	        </div>
	      </div>
	    </div>
	  </div>
	  
	  <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
	  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js"></script>
	  <!-- FlashAttribute(success)가 있으면 모달 띄우기 -->
	  <c:if test="${success}">
	    <script>
	      document.addEventListener('DOMContentLoaded', function() {
	        const modal = new bootstrap.Modal(
	          document.getElementById('successModal')
	        );
	        modal.show();
	      });
	    </script>
	  </c:if>
	  
  </div>
</div>
<!-- jQuery -->
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/contactUs.js'/>"></script>
</body>
</html>