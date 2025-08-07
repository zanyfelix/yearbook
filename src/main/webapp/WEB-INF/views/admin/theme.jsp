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
    <title>Theme</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/theme.css"/>
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
		
	<a href="/admin/user?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
	<a href="/admin/theme?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
	<a href="/admin/deadline?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'deadline' ? 'active' : ''}">Deadline</a>
	<a href="/admin/home?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
	<a href="/admin/contents?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
	<a href="/admin/submission?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'submisstion' ? 'active' : ''}">Submission</a>
	<a href="/admin/yearbook?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
    <a href="/admin/contactUs?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
</div>

<div class="content">
    <div class="container-fluid">
    
    	<!-- 검색 바 -->
		<form method="get" action="${pageContext.request.contextPath}/admin/theme" class="search-form">
		    <select name="id" class="form-select">
		    	<option value="">All</option>
		        <c:forEach var="item" items="${allUsers}" varStatus="st">
		        	<c:if test="${item.role ne 'admin'}">
		            	<option value="${item.id}" <c:if test="${item.id eq id}">selected</c:if>>${item.schoolName}</option>
		            </c:if>
		        </c:forEach>
		    </select>
		    <button type="submit" class="btn btn-primary">SEARCH</button>
		</form>

      <table>
	      <thead>
	      	<tr>
		      <th>
		         <input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		      </th>
		      <th>SCHOOL NAME</th>
		      <th>THEME</th>
		      <th>FONT</th>
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
	            	<select class="form-select">
	            		<option>13</option>
	            	</select>
	            </td>
	            <td>
	            	<select class="form-select">
	            		<option>F_Funicorn</option>
	            	</select>
	            </td>
	          </tr>
	          </c:if>
	        </c:forEach>
	      </tbody>
	    </table>
    
	    <div class="btn-wrapper">
		    <button id="btn-apply" type="button">APPLY</button>
	    </div>

    </div><!-- /.container-fluid -->
  </div><!-- /.content -->
<script>
const ctx      = '${pageContext.request.contextPath}';
const id   = '${id}';
const category = '${category}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/theme.js'/>"></script>
</body>
</html>