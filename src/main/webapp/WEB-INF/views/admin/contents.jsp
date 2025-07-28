<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Theme</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/contents.css"/>
    <script src="<c:url value='/js/admin/contents.js'/>"></script>
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
    <div class="mb-3">
	<form action="<c:url value='/admin/contents' />" method="get">
		<select name="userId" class="form-select" onchange="this.form.submit()">
	    	<c:forEach var="item" items="${allUsers}" varStatus="st">
	    		<option value="${item.id}" ${item.id == userId ? 'selected="selected"' : ''}>${item.schoolName}</option>
	    	</c:forEach>
	    </select>
	</form>
	</div>
	
	<form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
		
	<a href="/admin/home?userId=${userId}" class="${currentMenu eq 'home' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Home</a>	
    <a href="/admin/theme?userId=${userId}" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
    <a href="/admin/contents?userId=${userId}" class="${currentMenu eq 'contents' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Contents</a>
    <a href="/admin/submission?userId=${userId}" class="${currentMenu eq 'submisstion' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Submission</a>
    <a href="/admin/yearbook" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
</div>

<div class="content">
    <div class="container-fluid">
    
    
    <form id="deleteForm"
        action="${pageContext.request.contextPath}/admin/contents/delete?userId=${userId}"
        method="post"
        onsubmit="return confirm('Are you sure you want to delete the selected contents?');">
        
        <table>
	      <thead>
	      	<tr>
		      <th>
		         <input type="checkbox" id="selectAll" onclick="toggleAll(this)"/>
		      </th>
		      <th>No</th>
		      <th>CATEGORY</th>
		      <th>TITLE</th>
		      <th>PAGES</th>
		    </tr>
	      </thead>
	      <tbody>
	       <c:forEach var="item" items="${list}" varStatus="st">
	          <tr>
	          	<td>
		            <input type="checkbox" class="selectBox" name="ids" value="${item.id}" />
		        </td>
	            <td>${st.index + 1}</td>
	            <td>${item.category}</td>
	            <td>${item.title}</td>
	            <td>${item.pages}</td>
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
		            action="${pageContext.request.contextPath}/admin/contents/register"
		            method="post">
		        <div class="modal-header">
		          <!-- 제목은 JS로 바꿔줄 span -->
		          <h5 class="modal-title" id="registerModalLabel">CONTENTS REGISTRATION</h5>
		          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
		        </div>
		        <div class="modal-body">
		          <!-- 수정 시 채울 hidden PK -->
		          <input type="hidden" id="userId" name="userId"/>
		          <input type="hidden" id="id" name="id"/>
					
				  <div class="mb-3">
		            <label for="categorySelect" class="form-label">CATEGORY</label>
		            <select class="form-select" id="categorySelect" name="category">
		              <option value="group">GROUP</option>
		              <option value="event">EVENT</option>
		            </select>
		          </div>
		          <div class="mb-3">
		            <label for="titleInput" class="form-label">TITLE</label>
		            <input type="text" class="form-control" id="titleInput" name="title" required />
		          </div>
		          <div class="mb-3">
		            <label for="pagesInput" class="form-label">PAGES</label>
		            <input type="number" class="form-control" id="pagesInput" name="pages" required min="1" step="1"/>
		          </div>
		        </div>
		        
		        <div class="modal-footer">
		          <button type="button"
		                  class="btn btn-secondary"
		                  data-bs-dismiss="modal">취소</button>
		          <button type="submit"
		                  class="btn btn-primary"
		                  id="registerSubmitBtn">등록</button>
		        </div>
		      </form>
		    </div>
		  </div>
		</div>
	</div>
</div>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script>
const ctx = '${pageContext.request.contextPath}';
const userId = '${userId}';
</script>
</body>
</html>