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

   <div class="mb-3">
		<form action="<c:url value='/admin/home' />" method="get"><!-- 관리자 사용자 시작은 테마가 먼저 -->
		<select name="id" class="form-select" onchange="this.form.submit()">
		    	<c:forEach var="item" items="${allUsers}" varStatus="st">
		    		<option value="${item.id}" <c:if test="${item.id == id}">selected</c:if>>${item.schoolName}</option>
		    	</c:forEach>
		    </select>
		</form>
	</div>
	
	<form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
		<button type="submit" class="btn btn-secondary w-100">Logout</button>
	</form>
		
	<a href="/admin/home?id=${id}" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/admin/contents?id=${id}" class="${currentMenu eq 'contents' ? 'active' : ''}">Contents</a>
    <a href="/admin/theme?id=${id}" class="${currentMenu eq 'theme' ? 'active' : ''}">Theme</a>
    <a href="/admin/yearbook?id=${id}" class="${currentMenu eq 'yearbook' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Yearbook</a>
    <a href="/admin/submission?id=${id}" class="${currentMenu eq 'submisstion' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Submission</a>
</div>

<div class="content">
    <div class="container-fluid">

      <!-- themeForm: userIdBySchool + categoryType 를 POST -->
      <form id="themeForm"
            action="<c:url value='/admin/theme'/>"
            method="get">
        <input type="hidden" name="id" value="${id}" />

        <!-- 1) Nav Tabs -->
        <ul class="nav nav-tabs mb-4" role="tablist">
          <li class="nav-item">
            <button
              type="submit"
              name="category"
              value="background"
              class="nav-link ${category=='background' ? 'active' : ''}"
            >Background</button>
          </li>
          <li class="nav-item">
            <button
              type="submit"
              name="category"
              value="frame"
              class="nav-link ${category=='frame' ? 'active' : ''}"
            >Frame</button>
          </li>
          <li class="nav-item">
            <button
              type="submit"
              name="category"
              value="font"
              class="nav-link ${category=='font' ? 'active' : ''}"
            >Font</button>
          </li>
        </ul>
      </form>

      <!-- 2) Tab Content -->
      <div class="tab-content">
        <!-- Background -->
        <div
          class="tab-pane fade ${category=='background' ? 'show active' : ''}"
          id="background"
        >
          <table class="table table-striped">
            <thead>
              <tr>
              	<th>
		           <input type="checkbox" id="selectAll" onclick="toggleAll(this, '${category}')"/>
		        </th>
                <th>Filename</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="item" items="${backgroundList}" varStatus="st">
                <tr>
                  <td>
		            <input type="checkbox" class="selectBox" name="themeIds" value="${item.id}" 
		            	<c:if test="${fn:contains(selectedIds, item.id)}">
                 			disabled="disabled" title="이미 선택된 테마입니다."
               			</c:if>
		            />
		          </td> 
		          <td>${item.filename}</td>														
                  <td>
                    <img src="/${item.thumbnailPath}"
                         class="img-thumbnail"
                         width="60"/>
                  </td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>

        <!-- Frame -->
        <div
          class="tab-pane fade ${category=='frame' ? 'show active' : ''}"
          id="frame"
        >
          <table class="table table-striped">
            <thead>
              <tr>
                <tr>
              	<th>
		           <input type="checkbox" id="selectAll" onclick="toggleAll(this, '${category}')"/>
		        </th>
                <th>Filename</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="item" items="${frameList}" varStatus="st">
                <tr>
                  <td>
		            <input type="checkbox" class="selectBox" name="themeIds" value="${item.id}" 
		            	<c:if test="${fn:contains(selectedIds, item.id)}">
                 			disabled="disabled" title="이미 선택된 프레임입니다."
               			</c:if>
		            />
		          </td> 
		          <td>${item.filename}</td>														
                  <td>
                    <img src="<c:url value='${item.thumbnailPath}'/>"
                         class="img-thumbnail"
                         width="60"/>
                  </td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>

        <!-- Font -->
        <div
          class="tab-pane fade ${category=='font' ? 'show active' : ''}"
          id="font"
        >
          <table class="table table-striped">
            <thead>
              <tr>
                <tr>
              	<th>
		           <input type="checkbox" id="selectAll" onclick="toggleAll(this, '${category}')"/>
		        </th>
                <th>Filename</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              <c:forEach var="item" items="${fontList}" varStatus="st">
                <tr>
                  <td>
		            <input type="checkbox" class="selectBox" name="themeIds" value="${item.id}" 
		            	<c:if test="${fn:contains(selectedIds, item.id)}">
                 			disabled="disabled" title="이미 선택된 폰트입니다."
               			</c:if>
		            />
		          </td> 
		          <td>${item.filename}</td>														
                  <td>
                    <img src="<c:url value='${item.thumbnailPath}'/>"
                         class="img-thumbnail"
                         width="60"/>
                  </td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>

      </div><!-- /.tab-content -->

      <!-- 3) 저장 버튼 -->
      <div class="d-flex justify-content-start mt-3">
        <button id="btn-save" class="btn btn-success">Save</button>
      </div>

    </div><!-- /.container-fluid -->
  </div><!-- /.content -->
<script>
const ctx      = '${pageContext.request.contextPath}';
const id   = '${id}';
const category = '${category}';
const serverName      = '${pageContext.request.serverName}';
const serverPort      = '${pageContext.request.serverPort}';
</script>
<script src="${pageContext.request.contextPath}/js/bootstrap.min.js" defer></script>
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
<script src="<c:url value='/js/admin/theme.js'/>"></script>
</body>
</html>