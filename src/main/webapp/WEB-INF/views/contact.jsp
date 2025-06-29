<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Contact Us</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
/* 1) html, body에 높이를 100%로 지정 */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

.sidebar {
	width: 200px;
	background-color: #333;
	color: white;
	position: fixed;
	height: 100%;
	padding-top: 20px;
}

.sidebar h5 {
	text-align: center;
	margin-bottom: 30px;
	font-size: 1.1rem;
}

.sidebar a {
	display: block;
	padding: 12px 20px;
	color: white;
	text-decoration: none;
}

.sidebar a:hover {
	background-color: #555;
}

.content {
  margin-left: 200px;
  /* 기존 패딩 유지 */
  padding: 20px 30px;

  /* flex 설정 추가 */
  display: flex;
  flex-direction: column;
  height: 100vh;           /* 뷰포트 전체 높이 사용 */
  box-sizing: border-box;
}

.top-bar {
	background-color: #d2f4e8;
	border: 1px solid #ccc;
	padding: 10px 20px;
	border-radius: 8px;
	margin-bottom: 20px;
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.top-bar .badge {
	font-size: 0.95rem;
	padding: 10px 16px;
}

.contact-card {
  background-color: #888;
  padding: 30px;
  border-radius: 8px;

  flex: 1;                  /* 세로 방향 남은 공간 꽉 채우기 */
  overflow-y: auto;         /* 내용 넘칠 때 스크롤 */
  box-sizing: border-box;
}

.contact-card h2 {
	text-align: center;
	margin-bottom: 10px;
}

.contact-card p.subtitle {
	text-align: center;
	margin-bottom: 30px;
	font-size: 0.9rem;
	color: #eee;
}

form {
	max-width: 600px; /* 너비 제한 */
	margin: 0 auto; /* 수평 중앙 정렬 */
	padding: 20px;
}

.form-group {
	display: flex;
	align-items: center;
	margin-bottom: 20px;
}

.form-group label {
	width: 100px;
	background-color: #0047AB;
	color: white;
	text-align: center;
	padding: 10px;
	border-radius: 4px 0 0 4px;
	margin: 0;
}

.form-group .form-control {
	border-radius: 0 4px 4px 0;
	border: none;
	height: 40px;
}

.form-group textarea.form-control {
	height: 150px;
	resize: vertical;
}

.form-group-file {
	display: flex;
	align-items: center;
	margin-bottom: 5px;
}

.form-group-file label {
	width: 100px;
	background-color: #0047AB;
	color: white;
	text-align: center;
	padding: 10px;
	border-radius: 4px 0 0 4px;
	margin: 0;
}

.form-group-file input[type="file"] {
	border-radius: 0 4px 4px 0;
	border: none;
}

.note {
	font-size: 0.75rem;
	color: #ddd;
	margin-bottom: 20px;
	margin-left: 100px;
}

label {
	font-weight: bold;
	margin-bottom: 12px; /* 라벨과 인풋 사이 간격 넓힘 */
	font-size: 15px;
}

input[type="text"], input[type="email"], input[type="file"], textarea {
	width: 100%;
	padding: 10px;
	font-size: 14px;
	box-sizing: border-box;
	border: 1px solid #ccc;
	border-radius: 4px;
}

textarea {
	height: 130px;
	resize: vertical;
	text-align: left;
	vertical-align: top;
}

.btn-submit {
	display: block;
	margin: 0 auto;
	background-color: #0047AB;
	color: white;
	padding: 10px 30px;
	border: none;
	border-radius: 4px;
	font-size: 1rem;
}
</style>
</head>
<body>
<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    <a href="/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?username=${sessionScope.loginUser.username}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contact" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
</div>
<div class="content">
  	<div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: Mar. 31st. 2026 (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
	<div class="contact-card">
    	<h2>CONTACT US</h2>
    	<p class="subtitle">Please use the form below to submit any inquiries regarding the use of program</p>

    <form:form method="POST" modelAttribute="contact" enctype="multipart/form-data">
      <div class="form-group">
        <label for="name">NAME</label>
        <form:input path="name" id="name" cssClass="form-control" placeholder="Your name" />
      </div>

      <div class="form-group">
        <label for="email">EMAIL</label>
        <form:input path="email" id="email" type="email" cssClass="form-control" placeholder="youremail@example.com" />
      </div>

      <div class="form-group">
        <label for="subject">SUBJECT</label>
        <form:input path="subject" id="subject" cssClass="form-control" placeholder="Subject" />
      </div>

      <div class="form-group">
        <label for="message">MESSAGE</label>
        <form:textarea path="message" id="message" cssClass="form-control" placeholder="Your message..." />
      </div>

      <div class="form-group-file">
        <label for="file">FILE</label>
        <input type="file" name="file" id="file" class="form-control"/>
      </div>
      <p class="note">*Please upload any relevant files (e.g., photos, screenshots) for reference.</p>

      <button type="submit" class="btn-submit">SUBMIT</button>
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
</body>
</html>