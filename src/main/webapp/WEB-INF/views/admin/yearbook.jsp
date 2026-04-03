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
	<a href="/admin/progress?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress</a>
    <a href="/admin/contactUs?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 90% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>
<!-- ===== Download Rendering Progress Overlay ===== -->
<div id="download-progress-overlay">
  <div class="dl-progress-card">

    <!-- Header: spinner + title -->
    <div class="dl-progress-header">
      <div class="dl-mini-spinner"></div>
      <div>
        <div class="dl-title">Rendering</div>
        <div id="dl-school-name" class="dl-subtitle">Preparing...</div>
      </div>
    </div>

    <!-- Overall progress bar -->
    <div class="dl-section-label">Overall Progress</div>
    <div class="dl-bar-track">
      <div id="dl-overall-fill" class="dl-bar-fill"></div>
    </div>
    <div class="dl-bar-meta">
      <span id="dl-overall-pct">0%</span>
      <span id="dl-school-counter">0 / 0</span>
    </div>

    <!-- Stage indicator -->
    <div class="dl-section-label" style="margin-top:16px;">Current Stage</div>
    <div class="dl-step-row">
      <div class="dl-step-item" id="dl-step-render">
        <div class="dl-step-dot"></div><span>Rendering</span>
      </div>
      <div class="dl-step-connector"></div>
      <div class="dl-step-item" id="dl-step-zip">
        <div class="dl-step-dot"></div><span>ZIP</span>
      </div>
      <div class="dl-step-connector"></div>
      <div class="dl-step-item" id="dl-step-download">
        <div class="dl-step-dot"></div><span>Download</span>
      </div>
    </div>

    <!-- Elapsed time -->
    <div class="dl-elapsed">Elapsed: <span id="dl-elapsed-time">0s</span></div>

  </div>
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
		      <th>PAGES</th>
		      <th>ORIGINALS</th>
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
	            <td>
	              <button class="btn-select-pages"
	                      data-userid="${item.id}"
	                      data-schoolname="${item.schoolName}"
	                      type="button">Select Pages</button>
	            </td>
	            <td>
	              <button class="btn-dl-originals"
	                      data-userid="${item.id}"
	                      data-schoolname="${item.schoolName}"
	                      type="button">Download Originals</button>
	            </td>
	          </tr>
	          </c:if>
	        </c:forEach>
	      </tbody>
	    </table>

	    <div class="btn-wrapper">
	    	<div class="render-format-control">
	    		<label for="render-format">Format</label>
	    		<select id="render-format" class="form-select form-select-sm">
	    			<option value="png" selected>PNG</option>
	    			<option value="jpg">JPG</option>
	    		</select>
	    	</div>
		    <button id="btn-apply" type="button">DOWNLOAD</button>
		    <button id="btn-dl-originals-all" type="button">DOWNLOAD ORIGINALS</button>
	    </div>

    </div><!-- /.container-fluid -->
  </div><!-- /.content -->
<!-- ===== Page Selection Modal ===== -->
<div id="page-select-modal" class="ps-modal-overlay" style="display:none;">
  <div class="ps-modal-box">

    <!-- Header -->
    <div class="ps-modal-header">
      <span id="ps-modal-title">Page Selection</span>
      <button class="ps-modal-close" id="ps-modal-close-btn" type="button">&times;</button>
    </div>

    <!-- Body: category → group → thumbnail grid (rendered by JS) -->
    <div class="ps-modal-body" id="ps-modal-body">
      <div class="ps-loading">Loading...</div>
    </div>

    <!-- Footer -->
    <div class="ps-modal-footer">
      <span id="ps-selected-count" class="ps-sel-count">0 selected</span>
      <div class="ps-footer-btns">
        <button id="ps-cancel-btn" class="ps-btn-cancel" type="button">Cancel</button>
        <button id="ps-download-btn" class="ps-btn-download" type="button" disabled>Download Selected</button>
      </div>
    </div>

  </div>
</div>

<!-- ===== Originals Selection Modal ===== -->
<div id="originals-select-modal" class="ps-modal-overlay" style="display:none;">
  <div class="ps-modal-box">

    <!-- Header -->
    <div class="ps-modal-header">
      <span id="os-modal-title">Originals Download</span>
      <button class="ps-modal-close" id="os-modal-close-btn" type="button">&times;</button>
    </div>

    <!-- Body: category → group → thumbnail grid (rendered by JS) -->
    <div class="ps-modal-body" id="os-modal-body">
      <div class="ps-loading">Loading...</div>
    </div>

    <!-- Footer -->
    <div class="ps-modal-footer">
      <span id="os-selected-count" class="ps-sel-count">0 selected</span>
      <div class="ps-footer-btns">
        <button id="os-cancel-btn" class="ps-btn-cancel" type="button">Cancel</button>
        <button id="os-download-btn" class="os-btn-download" type="button" disabled>Download Originals</button>
      </div>
    </div>

  </div>
</div>

<script>
const ctx  = '${pageContext.request.contextPath}';
const id   = '${id}';
const category = '${category}';
const userId = '${userId}';
const loginUserId = '${sessionScope.loginUser.userId}';
const loginUserRole = '${sessionScope.loginUser.role}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/yearbook.js'/>"></script>
<!-- ===== Preview Loader (originals download) ===== -->
<div id="preview-loader" style="display:none;">
  <div style="text-align:center;">
    <div class="spinner"></div>
    <p id="loader-msg" style="margin-top:14px; font-size:1rem; color:#555; font-weight:500;">Preparing download...</p>
  </div>
</div>

</body>
</html>
