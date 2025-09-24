<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CAPTURECORD YB</title>
    <link rel="icon" type="image/png" sizes="32x32" href="<c:url value='/images/favicon_32.png'/>">
    <link rel="icon" type="image/png" sizes="196x196" href="<c:url value='/images/favicon_196.png'/>">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/yearbook.css"/>
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
		    		<option value="${item.id}">${item.schoolName}</option>
		    	</c:forEach>
		    </select>
		</form>
	</div>
	
	<a href="/admin/user?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
	<a href="/admin/theme?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
	<a href="/admin/yearbook?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
    <a href="/admin/contactUs?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>
<!-- Loading -->
<div id="loading-spinner" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; text-align: center; padding-top: 20%;">
  <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
    <span class="visually-hidden">Loading...</span>
  </div>
  <p style="margin-top: 1rem; font-size: 1.2rem;">Downloading and rendering yearbook... Please wait.</p>
</div>

<div class="content">
    <div class="container-fluid">

      <table>
	      <thead>
	      	<tr>
		      <th>
		         <input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		      </th>
		      <th>SCHOOL NAME</th>
		      <th>YEARBOOK</th>
		    </tr>
	      </thead>
	      <tbody>
	       <c:forEach var="item" items="${users}" varStatus="st">
	       	  <c:if test="${item.role ne 'admin'}">	
	          <tr>
	          	<td>
		            <input type="checkbox" class="selectBox" name="ids" value="${item.id}" />
		        </td>
	            <td>${item.schoolName}</td>
	            <td>
	            	<c:choose>
	            		<c:when test="${item.submitted eq true}">
	            			Submitted
	            		</c:when>
	                    <c:otherwise>
	                    	Not Submitted
	                    </c:otherwise>
	            	</c:choose>
	            </td>
	          </tr>
	          </c:if>
	        </c:forEach>
	      </tbody>
	    </table>
    
	    <div class="btn-wrapper">
		    <button id="btn-apply" type="button">DOWNLOAD</button>
	    </div>

    </div><!-- /.container-fluid -->
  </div><!-- /.content -->
<script>
const ctx  = '${pageContext.request.contextPath}';
const id   = '${id}';
const category = '${category}';
const userId = '${userId}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/yearbook.js'/>"></script>
</body>
</html>