<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page session="true" %>
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
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/progress.css"/>
</head>
<body>

<div class="sidebar">
	<div class="userList">
		<form action="<c:url value='/admin/home' />" method="get">
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
	    <form method="get" action="${pageContext.request.contextPath}/admin/progress">
	      <select name="type">
	        <option value="userId" ${type=='userId'? 'selected':''}>USER_ID</option>
	        <option value="schoolName" ${type=='schoolName'? 'selected':''}>SCHOOL_NAME</option>
	      </select>
	      <input type="text" name="keyword" value="${keyword != null ? keyword : ''}" />
	      <button type="submit">SEARCH</button>
	    </form>
    
	    <table class="progress-table">
	      <thead>
	      	<tr>
		      <th>No</th>
		      <th>USER_ID</th>
		      <th>SCHOOL_NAME</th>
		      <th>DEADLINE</th>
		      <th>D-DAY</th>
		      <th>Overall Progress</th>
		      <th>Group Photo</th>
		      <th>Event Photo</th>
		      <th>Status</th>
		    </tr>
	      </thead>
	      <tbody>
	       <c:forEach var="item" items="${userProgressList}" varStatus="st">
	          <tr>
	            <td>${st.index + 1}</td>
	            <td>${item.user.userId}</td>
	            <td>${item.user.schoolName}</td>
	            <td><fmt:formatDate value="${item.user.deadline}" pattern="yyyy-MM-dd"/></td>
	            <td class="${item.remainDays <= 7 ? 'text-danger' : (item.remainDays <= 14 ? 'text-warning' : '')}">
	            	<c:choose>
	            		<c:when test="${item.remainDays < 0}">
	            			D+${item.remainDays * -1}
	            		</c:when>
	            		<c:otherwise>
	            			D-${item.remainDays}
	            		</c:otherwise>
	            	</c:choose>
	            </td>
	            <td>
	            	<div class="progress-info">
	            		<span class="progress-text">${item.overallCompleted} / ${item.overallTotal}</span>
	            		<div class="progress-container">
			            	<div class="progress-bar" style="width: ${item.overallProgress}%">
			            		<span class="percentage-text">${item.overallProgress}%</span>
			            	</div>
			            </div>
	            	</div>
	            </td>
	            <td>
	            	<div class="progress-info">
	            		<span class="progress-text">${item.groupCompleted} / ${item.groupTotal}</span>
	            		<div class="progress-container">
			            	<div class="progress-bar" style="width: ${item.groupProgress}%">
			            		<span class="percentage-text">${item.groupProgress}%</span>
			            	</div>
			            </div>
	            	</div>
	            </td>
	            <td>
	            	<div class="progress-info">
	            		<span class="progress-text">${item.eventCompleted} / ${item.eventTotal}</span>
	            		<div class="progress-container">
			            	<div class="progress-bar" style="width: ${item.eventProgress}%">
			            		<span class="percentage-text">${item.eventProgress}%</span>
			            	</div>
			            </div>
	            	</div>
	            </td>
	            <td>
	            	<c:choose>
	            		<c:when test="${item.overallProgress >= 100}">
	            			<span class="badge bg-success">Completed</span>
	            		</c:when>
	            		<c:when test="${item.overallProgress >= 70}">
	            			<span class="badge bg-info">In Progress</span>
	            		</c:when>
	            		<c:when test="${item.overallProgress >= 30}">
	            			<span class="badge bg-warning">Getting Started</span>
	            		</c:when>
	            		<c:otherwise>
	            			<span class="badge bg-secondary">Not Started</span>
	            		</c:otherwise>
	            	</c:choose>
	            </td>
	          </tr>
	        </c:forEach>
	        <c:if test="${empty userProgressList}">
	        	<tr>
	        		<td colspan="9" class="text-center">No users found.</td>
	        	</tr>
	        </c:if>
	      </tbody>
	    </table>
	    
	    <!-- Summary Statistics -->
	    <div class="summary-section">
	    	<h5>Summary Statistics</h5>
	    	<div class="stats-grid">
	    		<div class="stat-card">
	    			<div class="stat-label">Total Users</div>
	    			<div class="stat-value">${userProgressList.size()}</div>
	    		</div>
	    		<div class="stat-card">
	    			<div class="stat-label">Completed</div>
	    			<div class="stat-value">
	    				<c:set var="completedCount" value="0" />
	    				<c:forEach var="item" items="${userProgressList}">
	    					<c:if test="${item.overallProgress >= 100}">
	    						<c:set var="completedCount" value="${completedCount + 1}" />
	    					</c:if>
	    				</c:forEach>
	    				${completedCount}
	    			</div>
	    		</div>
	    		<div class="stat-card">
	    			<div class="stat-label">In Progress</div>
	    			<div class="stat-value">
	    				<c:set var="inProgressCount" value="0" />
	    				<c:forEach var="item" items="${userProgressList}">
	    					<c:if test="${item.overallProgress > 0 && item.overallProgress < 100}">
	    						<c:set var="inProgressCount" value="${inProgressCount + 1}" />
	    					</c:if>
	    				</c:forEach>
	    				${inProgressCount}
	    			</div>
	    		</div>
	    		<div class="stat-card">
	    			<div class="stat-label">Not Started</div>
	    			<div class="stat-value">
	    				<c:set var="notStartedCount" value="0" />
	    				<c:forEach var="item" items="${userProgressList}">
	    					<c:if test="${item.overallProgress == 0}">
	    						<c:set var="notStartedCount" value="${notStartedCount + 1}" />
	    					</c:if>
	    				</c:forEach>
	    				${notStartedCount}
	    			</div>
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
<script src="<c:url value='/js/admin/progress.js'/>"></script>
</body>
</html>