<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Progress</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/bootstrap.min.css"/>
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/admin/submit.css"/>
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
	
    <a href="/admin/user" class="${currentMenu eq 'user' ? 'active' : ''}">User</a>
	<a href="/admin/theme" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
	<a href="/admin/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
	<a href="/admin/contents" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
	<a href="/admin/submit" class="${currentMenu eq 'submit' ? 'active' : ''}">Submission</a>
	<a href="/admin/yearbook" class="${currentMenu eq 'yearbook' ? 'active' : ''}">Yearbook</a>
    <a href="/admin/contactUs" class="${currentMenu eq 'contactUs' ? 'active' : ''}">ContactUs</a>
    
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100" style="position: absolute; width: 80% !important; bottom: 1rem; left: 50%; transform: translateX(-50%);">Logout</button>
	</form>
</div>

<div class="content">
	<div class="container-fluid">
	
	<!-- 검색 바 -->
	<form method="get" action="${pageContext.request.contextPath}/admin/submit" class="search-form">
	    <select name="id" class="form-select">
	        <c:forEach var="item" items="${allUsers}" varStatus="st">
	        	<c:if test="${item.role ne 'admin'}">
	            	<option value="${item.id}" <c:if test="${item.id eq userId}">selected</c:if>>${item.schoolName}</option>
	            </c:if>
	        </c:forEach>
	    </select>
	    <button type="submit" class="btn btn-primary">SEARCH</button>
	</form>
    
    <form action="${pageContext.request.contextPath}/admin/submit/save" method="post">
            <%-- 섹션 1: Overview 관리 --%>
            <div class="setting-section">
                <h4>Submit to MBIZ</h4>
                <div id="overview-list">
		            <c:forEach var="item" items="${submitList}" varStatus="status">
		                <c:if test="${item.type eq 'Overview'}">
		                    <div class="setting-item">
		                        <%-- name 속성에 인덱스 추가: submit[0].id, submit[1].id ... --%>
		                        <input type="hidden" name="submit[${status.index}].id" value="${item.id}">
		                        <input type="hidden" name="submit[${status.index}].type" value="Overview">
		                        <div class="row">
		                            <div class="col-md-9">
		                                <%-- name 속성에 인덱스 추가: submit[0].description ... --%>
		                                <textarea name="submit[${status.index}].description" class="form-control">${item.description}</textarea>
		                            </div>
		                        </div>
		                    </div>
		                </c:if>
		            </c:forEach>
		        </div>
                <!-- <button type="button" class="btn btn-outline-secondary btn-sm" onclick="addItem('SUBMIT_OVERVIEW', 'overview-list')">Overview 항목 추가</button> -->
            </div>
            
            <%-- 섹션 2: Note 관리 --%>
            <div class="setting-section">
                 <h4>Note</h4>
                 <c:forEach var="item" items="${submitList}" varStatus="status">
                     <c:if test="${item.type eq 'Note'}">
                         <div class="setting-item">
                            <input type="hidden" name="submit[${status.index}].id" value="${item.id}">
                            <input type="hidden" name="submit[${status.index}].type" value="Note">
                            <input type="hidden" name="submit[${status.index}].displayOrder" value="1">
                            	<div class="col-md-9">
                             		<textarea name="submit[${status.index}].description" class="form-control">${item.description}</textarea>
                             	</div>
                         </div>
                     </c:if>
                 </c:forEach>
            </div>

            <%-- 섹션 3: Checklist 관리 --%>
            <div class="setting-section">
                <h4>Page Submission</h4>
                <div id="checklist-list">
                     <c:forEach var="item" items="${submitList}" varStatus="status">
                        <c:if test="${item.type eq 'Submission'}">
                             <div class="setting-item">
                                <input type="hidden" name="submit[${status.index}].id" value="${item.id}">
                                <input type="hidden" name="submit[${status.index}].type" value="Submission">
                                <div class="row">
                                    <div class="col-md-9">
                                        <textarea name="submit[${status.index}].description" class="form-control">${item.description}</textarea>
                                    </div>
                                </div>
                            </div>
                        </c:if>
                    </c:forEach>
                </div>
            </div>
            <hr class="my-4">
            <button type="submit" class="btn btn-primary btn-lg">SAVE ALL</button>
        </form>
    	
    	<div class="section-box">
	    	<div class="row">
	    		<div class="col">
	    			<table style="width: 100%; border-collapse: collapse;">
					    <thead>
					        <tr>
					            <th>Preview Title</th>
					            <th>Status</th>
					        </tr>
					    </thead>
					    <tbody>
					        <c:forEach var="item" items="${contentsList}" varStatus="st">
						        <%-- ▼▼▼ [핵심 수정] <tr> 태그에 data-completed 속성 추가 ▼▼▼ --%>
						        <tr data-completed="${item.savedPagesCount eq item.contentsInfo.pages}">
						            <td>
						                <%-- Preview Title (기존 코드와 동일) --%>
						                <c:if test="${item.savedPagesCount ne item.contentsInfo.pages}">
						                    <label style="color: red; cursor: pointer;" data-bs-toggle="modal" onclick="loadPreviewData('${item.contentsInfo.id}')">${item.contentsInfo.title}</label>
						                </c:if>
						                <c:if test="${item.savedPagesCount eq item.contentsInfo.pages}">
						                    <label style="color: blue; cursor: pointer;" data-bs-toggle="modal" onclick="loadPreviewData('${item.contentsInfo.id}')">${item.contentsInfo.title}</label>
						                </c:if>
						            </td>
						            <td>
						                <span>Page Confirm</span>
						                <input type="checkbox" id="confirm-${item.contentsInfo.id}" name="pageConfirmCheck"
						                <c:if test="${isAlreadySubmitted}">checked disabled</c:if>>
						            </td>
						        </tr>
						    </c:forEach>
					    </tbody>
					</table>
	    		</div>
			</div>
	    </div>
    <!-- 프레임 선택용 모달 -->
	<div class="modal fade" id="previewModal" tabindex="-1" aria-hidden="true">
	    <div class="modal-dialog modal-dialog-centered"> 
	        <div class="modal-content">
	            <div class="modal-body" style="padding: 20px;">
	                
	                <div class="preview-container">
	                    <img id="previewImage" src="" alt="Preview Image">
	                    <button onclick="showPreviousImage()" class="arrow-btn prev-btn">&lt;</button>
	                    <button onclick="showNextImage()" class="arrow-btn next-btn">&gt;</button>
	                </div>
	
	                <div class="close-btn-container">
	                    <%-- 버튼 텍스트와 클래스 변경 --%>
	                    <button type="button" class="custom-close-btn" data-bs-dismiss="modal">CLOSE</button>
	                </div>
	
	            </div>
	        </div>
	    </div>
    </div>
    
    </div>
</div>
<script>
const ctx = '${pageContext.request.contextPath}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.bundle.min.js"></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/submit.js'/>"></script>
</body>
</html>