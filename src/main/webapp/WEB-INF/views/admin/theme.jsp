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

<div class="content">
    <div class="container-fluid">
    
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
	       <c:forEach var="userDto" items="${userWithThemes}">
	          <tr>
	          	<td>
		            <input type="checkbox" class="selectBox" name="ids" value="${userDto.userId}" />
		        </td>
	            <td>${userDto.schoolName}</td>
	            <td>
	            	<select class="form-select theme-select">
                        <%-- 전체 테마 목록을 사용 --%>
                        <c:forEach var="theme" items="${themes}">
                            <option value="${theme.themeNo}" 
					                data-theme-no="${theme.themeNo}" 
					                data-user-id="${userDto.userId}" <%-- 이 부분이 정확히 있는지 확인 --%>
					                <c:if test="${theme.themeNo eq userDto.themeNo}">selected</c:if>>
					            ${theme.themeNo}
					        </option>
                        </c:forEach>
	            	</select>
	            </td>
	            <td>
		            <select class="form-select font-select" 
	            			multiple="multiple"
	            			data-saved-font-ids="<c:forEach items="${userDto.fontIds}" var="fontId" varStatus="status">${fontId}<c:if test="${!status.last}">,</c:if></c:forEach>">
	        				<!-- 폰트 옵션은 JavaScript로 동적 로드 -->
	    			</select>
	            </td>
	          </tr>
	        </c:forEach>
	      </tbody>
	    </table>
    
	    <div class="btn-wrapper">
		    <button id="btn-apply" type="button">APPLY</button>
	    </div>

    </div><!-- /.container-fluid -->
  </div><!-- /.content -->
<script>
const ctx  = '${pageContext.request.contextPath}';
const id   = '${id}';
const category = '${category}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/theme.js'/>"></script>
</body>
</html>