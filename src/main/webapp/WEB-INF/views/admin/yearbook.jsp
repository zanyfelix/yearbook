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
<!-- ===== 다운로드 렌더링 진행 오버레이 ===== -->
<div id="download-progress-overlay" style="display: none;">
  <div class="dl-progress-card">

    <!-- 상단 헤더: 아이콘 + 제목 -->
    <div class="dl-progress-header">
      <div class="dl-mini-spinner"></div>
      <div>
        <div class="dl-title">연감 렌더링 중</div>
        <div id="dl-school-name" class="dl-subtitle">준비 중...</div>
      </div>
    </div>

    <!-- 전체 진행바 -->
    <div class="dl-section-label">전체 진행률</div>
    <div class="dl-bar-track">
      <div id="dl-overall-fill" class="dl-bar-fill"></div>
    </div>
    <div class="dl-bar-meta">
      <span id="dl-overall-pct">0%</span>
      <span id="dl-school-counter">0 / 0 학교</span>
    </div>

    <!-- 현재 단계 표시 -->
    <div class="dl-section-label" style="margin-top:16px;">현재 단계</div>
    <div class="dl-step-row">
      <div class="dl-step-item" id="dl-step-render">
        <div class="dl-step-dot"></div><span>렌더링</span>
      </div>
      <div class="dl-step-connector"></div>
      <div class="dl-step-item" id="dl-step-zip">
        <div class="dl-step-dot"></div><span>ZIP 생성</span>
      </div>
      <div class="dl-step-connector"></div>
      <div class="dl-step-item" id="dl-step-download">
        <div class="dl-step-dot"></div><span>다운로드</span>
      </div>
    </div>

    <!-- 경과 시간 -->
    <div class="dl-elapsed">
      경과 시간: <span id="dl-elapsed-time">0s</span>
    </div>

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
<!-- ===== 개별 페이지 선택 모달 ===== -->
<div id="page-select-modal" class="ps-modal-overlay" style="display:none;">
  <div class="ps-modal-box">

    <!-- 헤더 -->
    <div class="ps-modal-header">
      <span id="ps-modal-title">페이지 선택</span>
      <button class="ps-modal-close" id="ps-modal-close-btn" type="button">&times;</button>
    </div>

    <!-- 본문: 카테고리 → 그룹 → 썸네일 그리드 (JS 동적 생성) -->
    <div class="ps-modal-body" id="ps-modal-body">
      <div class="ps-loading">페이지 정보를 불러오는 중...</div>
    </div>

    <!-- 푸터 -->
    <div class="ps-modal-footer">
      <span id="ps-selected-count" class="ps-sel-count">0개 선택됨</span>
      <div class="ps-footer-btns">
        <button id="ps-cancel-btn" class="ps-btn-cancel" type="button">취소</button>
        <button id="ps-download-btn" class="ps-btn-download" type="button" disabled>선택 다운로드</button>
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
</body>
</html>