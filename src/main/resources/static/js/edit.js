document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('.sortable').forEach(container => {
	    let draggedItem = null;

	    container.addEventListener("dragstart", function (e) {
	        if (e.target.classList.contains("page-card")) {
	            draggedItem = e.target;
	            e.dataTransfer.effectAllowed = "move";
	        }
	    });

	    container.addEventListener("dragover", function (e) {
	        e.preventDefault();
	        const target = e.target.closest(".page-card");
	        if (target && target !== draggedItem) {
	            const bounding = target.getBoundingClientRect();
	            const offset = bounding.y + bounding.height / 2;
	            const after = (e.clientY - offset) > 0;
	            container.insertBefore(draggedItem, after ? target.nextSibling : target);
	        }
	    });

	    container.addEventListener("drop", function (e) {
	        e.preventDefault();
	        draggedItem = null;
	    });
	});
	
	//바뀐순서 저장 필요
	//const order = Array.from(container.children).map(card => card.dataset.pageId);
	
	//background 버튼
	document.getElementById("btn-background").addEventListener("click", function() {
	    fetch(`${ctx}/edit/background` , {
		      method: 'POST',
			  headers: { 'Content-Type': 'application/json' },
			  body: JSON.stringify({
			      id: document.getElementById("id").value,
			      category: "background"
			  })
		    })
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
	            img.src = sample.theme.path;
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
});