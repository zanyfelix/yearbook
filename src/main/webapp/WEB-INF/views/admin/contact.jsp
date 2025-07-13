<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Contact Us</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/contact.css"/>
</head>
<body>

<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    <a href="/admin/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/admin/edit?username=${sessionScope.loginUser.userId}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/admin/progress" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/admin/submit" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/admin/contact" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
</div>
<div class="content">
	<div class="top-bar">
	</div>

	<div class="container-fluid">
    <!-- 검색 바 -->
    <form method="get" action="${pageContext.request.contextPath}/admin/home">
      <select name="type">
        <option value="all"    ${type=='all'     ? 'selected':''}>all</option>
        <option value="userId" ${type=='userId'? 'selected':''}>userId</option>
        <option value="name" ${type=='name'? 'selected':''}>name</option>
      </select>
      <input type="text" value="">
      <button type="submit">SEARCH</button>
    </form>

    <p>Admin Email: <strong>${adminEmail}</strong></p>

    <table>
      <thead>
      	<tr>
	      <th>No</th>
	      <th>Name</th>
	      <th>Email</th>
	      <th>Subject</th>
	      <th>Message</th>
	      <th>Status</th>
	      <th>Select</th>
	    </tr>
      </thead>
      <tbody>
       <c:forEach var="item" items="${contacts}" varStatus="st">
          <tr>
            <td>${st.index + 1}</td>
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td>${item.subject}</td>
            <td>
            <a href="#"
             class="btn-open-detail"
             data-bs-toggle="modal"
             data-bs-target="#contactModal"
             data-user="${fn:escapeXml(item.name)}"
             data-email="${fn:escapeXml(item.email)}"
             data-subject="${fn:escapeXml(item.subject)}"
             data-message="${fn:escapeXml(item.message)}">
            Open</a></td>
            <td></td>
            <td><input type="checkbox" value="${item.id}" /></td>
          </tr>
        </c:forEach>
      </tbody>
    </table>

    <button>APPLY</button>
    <button>APPLY ALL</button>
    
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
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js"></script>
<script>
// Bootstrap 5: 모달의 show 이벤트를 활용
var contactModalEl = document.getElementById('contactModal');
contactModalEl.addEventListener('show.bs.modal', function (event) {
  var btn = event.relatedTarget;
  document.getElementById('modalUser').textContent    = btn.getAttribute('data-user');
  document.getElementById('modalEmail').textContent   = btn.getAttribute('data-email');
  document.getElementById('modalSubject').textContent = btn.getAttribute('data-subject');
  document.getElementById('modalMessage').textContent = btn.getAttribute('data-message');
});
</script>
</body>
</html>