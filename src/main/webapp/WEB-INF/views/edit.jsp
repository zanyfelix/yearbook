<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Yearbook Home</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }

        .sidebar {
            width: 200px;
            background-color: #333;
            color: white;
            position: fixed;
            height: 100%;
            padding-top: 20px;
        }

        .sidebar h5 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.1rem;
        }

        .sidebar a {
            display: block;
            padding: 12px 20px;
            color: white;
            text-decoration: none;
        }

        .sidebar a:hover {
            background-color: #555;
        }

        .content {
            margin-left: 200px;
            padding: 20px 30px;
        }

        .top-bar {
            background-color: #d2f4e8;
            border: 1px solid #ccc;
            padding: 10px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .top-bar .badge {
            font-size: 0.95rem;
            padding: 10px 16px;
        }

        .section-box {
            background-color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 5px solid #ccc;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }

        .section-box h5 {
            font-weight: bold;
            margin-bottom: 12px;
        }

        .section-box ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .sidebar a.active {
        	background-color: #28a745;
        	font-weight: bold;
    	}
    	
    	.category-section {
            background-color: #f0f0f0;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
        }
        .page-card {
            width: 120px;
            text-align: center;
            margin-right: 15px;
            margin-bottom: 20px;
        }
        .page-thumb {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border: 1px solid #ccc;
            background-color: #eee;
            margin-bottom: 10px;
        }
        .edit-btn {
            font-weight: bold;
            text-decoration: underline;
            cursor: pointer;
        }
        
        /* #thumbnail-area img {
		  transition: transform 0.2s ease;
		}
		#thumbnail-area img:hover {
		  transform: scale(1.05);
		  cursor: pointer;
		}
		.selected-thumbnail {
		  border: 3px solid #007bff;
		} */
		
		.thumbnail-wrapper {
		  position: relative;
		  overflow: hidden;
		}
		
		.thumbnail-wrapper .overlay {
		  position: absolute;
		  top: 0; left: 0; right: 0; bottom: 0;
		  background-color: rgba(0, 0, 0, 0.4); /* 어두운 반투명 배경 */
		  opacity: 0;
		  transition: opacity 0.3s ease;
		}
		
		.thumbnail-wrapper:hover .overlay {
		  opacity: 1;
		}
    </style>
</head>
<body>

<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    <a href="/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?username=${sessionScope.loginUser.username}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contact" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
</div>

<div class="content">
	<div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: Mar. 31st. 2026 (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <!-- 각 카테고리별 섹션 -->
    <c:forEach var="entry" items="${groupedPages}">
        <div class="category-section">
            <h5 class="mb-3">${entry.key} (${fn:length(entry.value)})</h5>
            <div class="d-flex flex-wrap">
                <c:forEach var="page" items="${entry.value}">
                    <div class="page-card">
                        <img src="${page.thumbnailUrl != null ? page.thumbnailUrl : '/images/placeholder.png'}"
                             class="page-thumb"
                             alt="Page Thumbnail" />
                        <div class="edit-btn" data-bs-toggle="modal" data-bs-target="#editModal">Edit</div>
                    </div>
                </c:forEach>
            </div>
        </div>
    </c:forEach>
    
    <!-- Bootstrap Modal -->
	<div class="modal fade" id="editModal" tabindex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
	  <div class="modal-dialog modal-dialog-scrollable" style="max-width: 90vw; width: 90vw; height: 90vh;">
	    <div class="modal-content border-0 rounded-3" style="height: 100%;">
	
	      <div class="modal-body d-flex p-3" style="height: 100vh; max-height: 90vh;">
	        <div class="d-grid gap-2">
              <button id="btn-background" class="btn btn-outline-secondary w-100 mb-2">Background</button>
              <button id="btn-frame" class="btn btn-outline-secondary w-100 mb-2">Frame</button>
              <button id="btn-text" class="btn btn-outline-secondary w-100">Text</button>
            </div>
	
	        <!-- 중앙 썸네일 선택 영역 -->
	        <div class="col-5 px-3 overflow-auto border-end" style="max-height: 100%;">
	          <div class="row row-cols-2 g-3" id="thumbnail-area">
	            <!-- JS로 채워짐 -->
	          </div>
	        </div>

	        <!-- 우측 미리보기 -->
	        <div class="col px-3 d-flex flex-column justify-content-between">
	          <div class="d-flex justify-content-end gap-2 mb-2">
	            <button id="btn-clear" class="btn btn-outline-secondary btn-sm">Clear</button>
	            <button class="btn btn-primary btn-sm">Save</button>
	            <button class="btn btn-danger btn-sm" data-bs-dismiss="modal">Close</button>
	          </div>
	
	          <div id="page-preview" class="mx-auto border rounded bg-white" style="width: 221.9mm; height: 285.4mm; position: relative;">
	            <img id="page-preview-img" src="/images/placeholder.png" class="img-fluid w-100 h-100 rounded" style="object-fit: cover;" />
	          </div>
	        </div>
	      </div> <!-- modal-body -->
	    </div>
	  </div>
	</div> <!-- modal -->
</div>
<script>
document.getElementById("btn-background").addEventListener("click", function() {
    fetch("/sample/background")
    .then(response => response.json())
    .then(data => {
        const area = document.getElementById("thumbnail-area");
        area.innerHTML = ""; // 초기화

        data.forEach(sample => {
            // 썸네일 컨테이너
            const container = document.createElement("div");
            container.classList.add("col-6", "text-center");

            // 래퍼 div (hover용)
            const wrapper = document.createElement("div");
            wrapper.classList.add("thumbnail-wrapper", "position-relative");

            // 이미지
            const img = document.createElement("img");
            img.src = sample.imagePath;
            img.classList.add("img-thumbnail", "preview-img");

            // 오버레이
            const overlay = document.createElement("div");
            overlay.classList.add("overlay", "d-flex", "justify-content-center", "align-items-center");

            // Select 버튼
            const selectBtn = document.createElement("button");
            selectBtn.classList.add("btn", "btn-primary", "btn-sm");
            selectBtn.innerText = "Select";
            selectBtn.onclick = () => selectSample(sample.imagePath);

            overlay.appendChild(selectBtn);
            wrapper.appendChild(img);
            wrapper.appendChild(overlay);
            container.appendChild(wrapper);
            area.appendChild(container);
        });
    });
});
//샘플 이미지 전송
function selectSample(imagePath) {
    // 선택 시 미리보기 이미지 변경
    document.getElementById("page-preview-img").src = imagePath;
}
//CLEAR 버튼
document.getElementById("btn-clear").addEventListener("click", function () {
    document.getElementById("page-preview-img").src = "/images/placeholder.png";
});
</script>
</body>
</html>