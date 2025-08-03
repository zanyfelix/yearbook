<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yearbook Home</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/edit.css"/>
</head>
<body>

<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    <form id="logoutForm" action="${pageContext.request.contextPath}/logout" method="post" style="margin-bottom: 1rem;">
        <button type="submit" class="btn btn-secondary w-100">Logout</button>
    </form>
    <a href="/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?id=${sessionScope.loginUser.id}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress" class="${currentMenu eq 'progress' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Progress Report</a>
    <a href="/submit" class="${currentMenu eq 'submit' ? 'active' : ''}" onclick="alert('준비중입니다.'); return false;">Submit to MBIZ</a>
    <a href="/contactUs" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
</div>

<div class="content">
    <input type="hidden" id="id" name="id" value="${sessionScope.loginUser.id}"/>
    <div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: Mar. 31st. 2026 (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <!-- 각 카테고리별 섹션 -->
    <c:forEach var="item" items="${list}" varStatus="st">
        <div class="category-section">
            <h5 class="mb-3">${item.title} (${item.pages})</h5>
            
            <div class="position-relative">
                <!-- 왼쪽 버튼 -->
                <%-- <button class="slide-btn left" onclick="scrollLeft('${st.index}')">&#10094;</button> --%>
                
                <!-- 슬라이드 박스 -->
                <div class="slide-container" id="slider-${st.index}">
                    <c:forEach var="i" begin="1" end="${item.pages}" varStatus="st2">
                        <div class="page-card" draggable="true">
                            <img src="/images/placeholder.png" class="page-thumb" alt="Page Thumbnail"/>
                            <button class="edit-btn mb-2" data-bs-toggle="modal" data-bs-target="#editModal">Edit</button>
                        </div>
                    </c:forEach>
                </div>
                
                <!-- 오른쪽 버튼 -->
                <%-- <button class="slide-btn right" onclick="scrollRight('${st.index}')">&#10095;</button> --%>
            </div>
        </div>
    </c:forEach>
    
    <!-- Bootstrap Modal - 전체 화면 크기 -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
        <div class="modal-dialog" style="max-width: 100vw; width: 100vw; height: 100vh; margin: 0;">
            <div class="modal-content border-0 rounded-0" style="height: 100vh;">

                <div class="modal-body d-flex p-0" style="height: 100vh;">
                    <!-- 좌측 버튼 영역 (고정 너비) -->
                    <div class="d-flex flex-column p-3 border-end" style="min-width: 150px;">
                        <button id="btn-background" class="btn btn-outline-secondary w-100 mb-2">Background</button>
                        <button id="btn-frame" class="btn btn-outline-secondary w-100 mb-2">Frame</button>
                        <button id="btn-text" class="btn btn-outline-secondary w-100">Text</button>
                    </div>

                    <!-- 중앙 썸네일 선택 영역 (40% - 2/5 비율) -->
                    <div class="px-3 py-3 overflow-auto border-end" style="width: 40%; max-height: 100vh;">
                        <!-- 공통 컨테이너 -->
                        <div id="thumbnail-area">
                            <!-- Background 패널 -->
                            <div id="background-panel" class="row row-cols-2 g-3">
                            </div>
                            
                            <!-- Frame 패널 (카테고리 + 아이템) -->
                            <div id="frame-panel" class="d-none">
                                <ul class="nav nav-tabs" id="frameTab" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="photo-tab"
                                            data-bs-toggle="tab" data-bs-target="#photoFrameList"
                                            type="button" role="tab">Photo Frame</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="text-tab" data-bs-toggle="tab"
                                            data-bs-target="#textBoxFrameList" type="button" role="tab">
                                            Text Box Frame</button>
                                    </li>
                                </ul>
                                
                                <!-- Tab panes -->
                                <div class="tab-content">
                                    <div class="tab-pane fade show active" id="photoFrameList" role="tabpanel">
                                        <!-- Photo Frame 썸네일이 여기에 동적으로 로드됩니다 -->
                                    </div>
                                    <div class="tab-pane fade" id="textBoxFrameList" role="tabpanel">
                                        <!-- Text Box Frame 썸네일이 여기에 동적으로 로드됩니다 -->
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Text 패널 -->
                            <div id="text-panel" class="d-none">
                                <div class="mb-2">
                                    <button id="add-text-btn" class="btn btn-outline-primary btn-sm">Add Text Box</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 우측 미리보기 영역 (60% - 3/5 비율) -->
                    <!-- 툴팁영역 -->
                    <div class="d-flex flex-column" style="width: 60%; height: 100%;"> 
                        
                        <div id="editor-toolbar" class="d-flex align-items-center">
                            <div id="frame-controls" class="d-none w-100">
                                <div class="control-buttons">
                                    <button id="frame-rotate-left" class="control-btn rotate-btn" title="왼쪽 회전"><img src="/images/icon/transform.png" alt="Rotate Left" style="transform: scaleX(-1);"></button>
                                    <button id="frame-rotate-right" class="control-btn rotate-btn" title="오른쪽 회전"><img src="/images/icon/transform.png" alt="Rotate Right"></button>
                                    <button id="btn-delete-frame" class="control-btn delete-btn" title="프레임 삭제"><i class="delete-icon">🗑️</i></button>
                                </div>
                            </div>
                            <div id="photo-controls" class="d-none w-100">
                                <div class="control-buttons">
                                    <button id="photo-rotate-left" class="control-btn rotate-btn" title="왼쪽 회전"><img src="/images/icon/transform.png" alt="Rotate Left" style="transform: scaleX(-1);"></button>
                                    <button id="photo-rotate-right" class="control-btn rotate-btn" title="오른쪽 회전"><img src="/images/icon/transform.png" alt="Rotate Right"></button>
                                    <button id="btn-delete-photo" class="control-btn delete-btn" title="사진 삭제"><i class="delete-icon">🗑️</i></button>
                                </div>
                            </div>
                            <div id="text-controls" class="d-none w-100">
                                <select id="tooltip-size" class="form-select form-select-sm"><option value="12px">12px</option><option value="16px" selected>16px</option><option value="20px">20px</option><option value="24px">24px</option><option value="32px">32px</option></select>
    							<select id="tooltip-align" class="form-select form-select-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
    							<input type="color" id="tooltip-color" title="Color">
    							<button type="button" id="tooltip-remove" class="control-btn delete-btn" title="텍스트 삭제"><i class="delete-icon">🗑️</i></button>
                            </div>
                        </div>

                        <div class="flex-grow-1 d-flex align-items-center justify-content-center p-2" style="min-height: 0; width: 100%;">
                            <div id="page-preview" class="border rounded bg-white d-flex flex-row h-100 w-100 flex-nowrap" style="position: relative;"> 
                                
                                <div class="page-preview-container flex-grow-1 d-flex justify-content-center h-100">
                                    <img id="page-preview-img" src="/images/placeholder.png" class="rounded">
                                </div>
                                
                                <div class="button-group-container d-flex flex-column justify-content-start gap-2 p-3 flex-shrink-0">
                                    <button id="btn-clear" class="btn btn-outline-secondary btn-sm">Clear</button>
                                    <button class="btn btn-primary btn-sm">Save</button>
                                    <button class="btn btn-danger btn-sm" data-bs-dismiss="modal">Close</button>
                                </div>
                            
                                <div id="frame-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                                <div id="safe-line-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;"></div>
                                <input type="file" id="image-upload-input" accept="image/*" style="display: none;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div><!-- 팝업 모달 -->
    
    <!-- 프레임 선택용 모달 -->
    <div class="modal fade" id="frameModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="frameModalLabel">Frames</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="modalFrameList" class="row gy-3">
                        <!-- 썸네일(col-4) 아이템이 여기에 로드됩니다 -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    
</div>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<!-- jQuery -->
<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>

<!-- ============================================================================
     모듈화된 JavaScript 파일들 (의존성 순서에 맞춰 로드)
     ============================================================================ -->

<!-- Core Classes (핵심 클래스) -->
<script src="<c:url value='/js/core/SelectionManager.js'/>"></script>
<script src="<c:url value='/js/core/SafeLineManager.js'/>"></script>

<!-- UI Management (UI 관리) -->
<script src="<c:url value='/js/ui/PanelManager.js'/>"></script>
<script src="<c:url value='/js/ui/UIManager.js'/>"></script>

<!-- Feature Modules (기능 모듈) -->
<script src="<c:url value='/js/frame/FrameManager.js'/>"></script>
<script src="<c:url value='/js/photo/PhotoManager.js'/>"></script>
<script src="<c:url value='/js/text/TextManager.js'/>"></script>

<!-- Events & Utils (이벤트 및 유틸리티) -->
<script src="<c:url value='/js/events/EventManager.js'/>"></script>
<script src="<c:url value='/js/utils/DataLoader.js'/>"></script>
<script src="<c:url value='/js/utils/Helpers.js'/>"></script>

<!-- Main Initialization (반드시 마지막에 로드) -->
<script src="<c:url value='/js/main.js'/>"></script>

<!-- 전역 변수 및 기존 함수들 -->
<script>
const ctx = '${pageContext.request.contextPath}';
let selectedFrame = null;
let selectedPhotoWrapper = null;
let selectedBox = null;
let selectedBackgroundPath = null;

// 슬라이드 기능 (기존 유지)
function scrollLeft(index) {
    const container = document.getElementById('slider-' + index);
    if (container) {
        container.scrollBy({ left: -240, behavior: 'smooth' });
    }
}

function scrollRight(index) {
    const container = document.getElementById('slider-' + index);
    if (container) {
        container.scrollBy({ left: 240, behavior: 'smooth' });
    }
}
</script>

</body>
</html>