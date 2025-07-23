document.addEventListener('DOMContentLoaded', () => {
	
	const thumbnailArea = document.getElementById('thumbnail-area');
	
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
	            selectBtn.onclick = () => selectSample(sample.theme.path);

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
		
		if(confirm("All designs on this page will be deleted and reset.\nPlease click \"Confirm\" to proceed.")) {
			document.getElementById("page-preview-img").src = "/images/placeholder.png";	
		}
	});
	//CLOSE 버튼
/*	const btnClose = document.getElementById('btn-close');
	const thumbnailArea = document.getElementById('thumbnail-area');
	const previewImg = document.getElementById('page-preview-img');
	
	btnClose.addEventListener('click', function () {
		if (thumbnailArea) {
			thumbnailArea.innerHTML = '';
		}
		if (previewImg) {
			previewImg.src = '/images/placeholder.png'; // 기본 이미지 경로
			previewImg.style.objectFit = 'cover';       // 필요 시 초기 스타일 복원
		}
		const previewContainer = document.getElementById('page-preview');
		if (previewContainer) {
			const overlays = previewContainer.querySelectorAll('.overlay, .text-layer, .frame-layer');
			overlays.forEach(el => el.remove());
		}
	});*/
	//SAVE 버튼
/*	document.getElementById('btn-save').addEventListener('click', function () {
		const payload = {
		    userId: currentUserId, // 전역변수 또는 hidden input 등에서 얻기
		    category: currentCategory,
		    pageNo: currentPageNo,
		    backgroundPath: selectedBackgroundPath,
		    framesJson: JSON.stringify(getCurrentFrames()),  // 프레임 위치, 크기 등
		    textsJson: JSON.stringify(getCurrentTexts()),    // 텍스트 내용 및 스타일 등
		    submitted: false,
		    lastSaved: new Date().toISOString()
		  };
		  
		  fetch('/admin/yearbook/save', {
		    method: 'POST',
		    headers: {
		      'Content-Type': 'application/json'
		    },
		    body: JSON.stringify(payload)
		  })
		  .then(res => res.json())
		  .then(data => {
		    alert('저장되었습니다!');
		    // 필요 시 미리보기 썸네일 갱신 등 추가 처리
		  })
		  .catch(err => {
		    console.error('저장 실패', err);
		    alert('저장 중 오류가 발생했습니다.');
		  });  
	});	*/
	
	const categories = document.getElementById('frame-category-buttons');
	const items = document.getElementById('frame-item-list');
	
	//frame 버튼
	document.getElementById("btn-frame").addEventListener("click", function() {
	    fetch(`${ctx}/edit/mainFrame` , {
		      method: 'POST',
			  headers: { 'Content-Type': 'application/json' },
			  body: JSON.stringify({
			      id: 11,
			      category: "frame"
			  })
		    })
	    .then(response => response.json())
	    .then(data => {
			thumbnailArea.innerHTML = '';
	        data.forEach(result => {
				const col = document.createElement('div');
				col.className = 'col';
				col.innerHTML = `<button class="btn btn-outline-primary w-100">${result.filename}</button>`;
				const btn = col.querySelector('button');
				btn.addEventListener('click', () => loadFrameItems(result.id, col));
				categories.appendChild(col);
	        });
	    });
	});
	
		
	
	function loadMainFrame() {
		fetch(`${ctx}/edit/mainFrame`		, {
			      method: 'POST',
				  headers: { 'Content-Type': 'application/json' },
				  body: JSON.stringify({
				      id: 11,
				      category: "frame"
				  })
			    })
			.then(response => response.json())
			.then(data => {
				console.log(data);
				categories.innerHTML = '';
				items.innerHTML = ''; // 카테고리 전환 시 하위 리스트 초기화
				data.forEach(cat => {
					const col = document.createElement('div');
					col.className = 'col';
					col.innerHTML = `<button class="btn btn-outline-primary w-100">${cat.filename}</button>`;
					col.querySelector('button')
						.addEventListener('click', () => loadFrameItems(cat.id, col));
					categories.appendChild(col);
				});
			});
	}
	
	const bgPanel = document.getElementById('background-panel');
	const framePanel = document.getElementById('frame-panel');
	const textPanel = document.getElementById('text-panel');
	
	function showPanel(panel) {
		[bgPanel, framePanel, textPanel].forEach(p => p.classList.add('d-none'));
		panel.classList.remove('d-none');
	}
	
	
	/*--------------------텍스트 패널--------------------*/
	
	const btnText      = document.getElementById('btn-text');
	const addTextBtn   = document.getElementById('add-text-btn');
	const ctrlColor    = document.getElementById('text-color');
	const ctrlSize     = document.getElementById('text-size');
	const ctrlAlign    = document.getElementById('text-align');
	const removeTextBtn= document.getElementById('remove-text-btn');
	const textCtrls    = document.getElementById('text-controls');
	const preview      = document.getElementById('page-preview');
	
	let selectedTxtEl = null;
	
	// 1) 탭 전환 시 text-panel 보이기
	btnText.addEventListener('click', () => {
		showPanel(textPanel);
		textCtrls.classList.add('d-none');
	});
	
	// 2) 새 텍스트 박스 추가
	addTextBtn.addEventListener('click', () => {
		const div = document.createElement('div');
		div.className = 'text-box position-absolute';
		div.contentEditable = 'true';
		div.innerText = 'Enter text';
		// 초기 스타일
		Object.assign(div.style, {
			left: '50%', top: '50%',
			transform: 'translate(-50%, -50%)',
			color: '#000000',
			fontSize: '16px',
			textAlign: 'center',
			minWidth: '80px',
			padding: '2px',
			border: '1px dashed #666',
			cursor: 'move',
			zIndex: 20
		});
		preview.appendChild(div);
		makeDraggable(div);
		// 새로 만든 요소 선택
		selectTextBox(div);
		div.focus();
	});
	
	// 3) 텍스트 박스 클릭 시 선택
	preview.addEventListener('click', e => {
	  if (e.target.classList.contains('text-box')) {
	    selectTextBox(e.target);
	  }
	});
	
	function selectTextBox(el) {
	  // 이전 선택 해제
	  if (selectedTxtEl) {
	    selectedTxtEl.style.border = '1px dashed #666';
	  }
	  // 새로 선택
	  selectedTxtEl = el;
	  selectedTxtEl.style.border = '1px solid #007bff';
	  // 컨트롤러 보이기 & 상태 동기화
	  textCtrls.classList.remove('d-none');
	  ctrlColor.value = rgbToHex(selectedTxtEl.style.color);
	  ctrlSize.value  = selectedTxtEl.style.fontSize;
	  ctrlAlign.value = selectedTxtEl.style.textAlign;
	}
	
	// 4) 컨트롤러 변경 시 스타일 적용
	ctrlColor.addEventListener('input', () => {
	  if (selectedTxtEl) selectedTxtEl.style.color = ctrlColor.value;
	});
	ctrlSize.addEventListener('change', () => {
	  if (selectedTxtEl) selectedTxtEl.style.fontSize = ctrlSize.value;
	});
	ctrlAlign.addEventListener('change', () => {
	  if (selectedTxtEl) selectedTxtEl.style.textAlign = ctrlAlign.value;
	});
	
	// 5) 삭제 버튼
	removeTextBtn.addEventListener('click', () => {
	  if (selectedTxtEl) {
	    selectedTxtEl.remove();
	    selectedTxtEl = null;
	    textCtrls.classList.add('d-none');
	  }
	});

	// 유틸: RGB → HEX
	function rgbToHex(rgb) {
	  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	  return m ? '#' + [1,2,3].map(i => parseInt(m[i]).toString(16).padStart(2,'0')).join('') : '#000000';
	}

	// 드래그 기능 (이전 makeDraggable 활용)
	function makeDraggable(el) {
	  let offsetX, offsetY;
	  el.onmousedown = e => {
	    offsetX = e.clientX - el.offsetLeft;
	    offsetY = e.clientY - el.offsetTop;
	    document.onmousemove = ev => {
	      el.style.left = (ev.clientX - offsetX) + 'px';
	      el.style.top  = (ev.clientY - offsetY) + 'px';
	    };
	    document.onmouseup = () => document.onmousemove = null;
	  };
	}
});