document.addEventListener('DOMContentLoaded', () => {
	
	const btnBg = document.getElementById('btn-background');
	const btnFrame = document.getElementById('btn-frame');
	const btnText = document.getElementById('btn-text');

	const bgPanel = document.getElementById('background-panel');
	const framePanel = document.getElementById('frame-panel');
	const textPanel = document.getElementById('text-panel');

	const allBtns = [btnBg, btnFrame, btnText];

	function hideAllPanels() {
	  bgPanel.classList.add('d-none');
	  framePanel.classList.add('d-none');
	  textPanel.classList.add('d-none');
	}

	function activate(btn) {
	  [btnBg, btnFrame, btnText].forEach(b => b.classList.remove('active'));
	  btn.classList.add('active');
	}
	
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
	
	/*--------------------백그라운드 패널--------------------*/
	
	btnBg.addEventListener("click", function() {
		
		activate(btnBg);
		hideAllPanels();
		bgPanel.classList.remove('d-none');
		
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
	        data.forEach(sample => {
	            // 썸네일 컨테이너
	            const col = document.createElement("div");
	            col.classList.add("col-6", "text-center");

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
				selectBtn.onclick = () => {
					document.getElementById("page-preview-img").src = sample.theme.path;
					selectedBackgroundPath = sample.theme.path;
				};
	            overlay.appendChild(selectBtn);
				
				wrapper.appendChild(img);
				wrapper.appendChild(overlay);
				col.appendChild(wrapper);
				bgPanel.appendChild(col);
	        });
	    });
	});
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
	
	/*--------------------프레임 패널--------------------*/
	
	btnFrame.addEventListener("click", function() {
		
		activate(btnFrame);
		hideAllPanels();
		framePanel.classList.remove('d-none');
		
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
	
	/*--------------------텍스트 패널--------------------*/
	
	const addTextBtn   = document.getElementById('add-text-btn');
	const ctrlColor    = document.getElementById('text-color');
	const ctrlSize     = document.getElementById('text-size');
	const ctrlAlign    = document.getElementById('text-align');
	const removeTextBtn= document.getElementById('remove-text-btn');
	const textCtrls    = document.getElementById('text-controls');
	const preview      = document.getElementById('page-preview');
	
	const tooltip = document.getElementById('text-tooltip');
	const inColor = document.getElementById('tooltip-color');
	const inSize = document.getElementById('tooltip-size');
	const inAlign = document.getElementById('tooltip-align');
	const btnRemove = document.getElementById('tooltip-remove');
	
	let selectedBox  = null;
	
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
	
	btnText.addEventListener('click', () => {
		activate(btnText);
		hideAllPanels();
		textPanel.classList.remove('d-none');
	});
	
	preview.addEventListener('click', e => {
		const box = e.target.closest('.text-box');
		if (!box) {
			hideTooltip();
			return;
		}
		selectBox(box);
	});
	
	function selectBox(box) {
		
		// 이전 선택 해제
		if (selectedBox) selectedBox.classList.remove('selected');
		selectedBox = box;
		box.classList.add('selected');

		// 컨트롤 초기값 동기화
		inColor.value = rgbToHex(box.style.color);
		inSize.value = box.style.fontSize;
		inAlign.value = box.style.textAlign;

		// 툴팁 위치 계산
		const rect = box.getBoundingClientRect();
		tooltip.style.left = `${rect.right + 8 + window.pageXOffset}px`;
		tooltip.style.top = `${rect.top + window.pageYOffset}px`;

		// 툴팁 보이기
		tooltip.classList.remove('d-none');
	}
	
	function hideTooltip() {
	  if (selectedBox) selectedBox.classList.remove('selected');
	  selectedBox = null;
	  tooltip.classList.add('d-none');
	}
	
	// 2) 툴팁 입력 변경 시 스타일 적용
	inColor.addEventListener('input', () => {
	  if (selectedBox) selectedBox.style.color = inColor.value;
	});
	inSize.addEventListener('change', () => {
	  if (selectedBox) selectedBox.style.fontSize = inSize.value;
	});
	inAlign.addEventListener('change', () => {
	  if (selectedBox) selectedBox.style.textAlign = inAlign.value;
	});
	
	btnRemove.addEventListener('click', () => {
	  if (selectedBox) {
	    selectedBox.remove();
	    hideTooltip();
	  }
	});
	
	addTextBtn.addEventListener('click', () => {

		const box = document.createElement('div');
		box.className = 'text-box position-absolute';
		box.contentEditable = 'true';
		box.innerText = 'Enter text';
		Object.assign(box.style, {
			left: '50%', top: '50%',
			transform: 'translate(-50%, -50%)',
			color: '#000', fontSize: '16px',
			textAlign: 'center', padding: '2px',
			border: '1px dashed #666', minWidth: '80px',
			cursor: 'move', zIndex: 20
		});

		preview.appendChild(box);
		makeDraggable(box);

		// 클릭해도 툴팁 유지하도록 리스너
		box.addEventListener('click', e => {
			selectBox(box);
			e.stopPropagation();
		});

		// 생성 직후 자동 선택
		selectBox(box);
		box.focus();
	});
	
	document.addEventListener('click', e => {
	  if (!tooltip.contains(e.target) && !e.target.closest('.text-box')) {
	    hideTooltip();
	  }
	});

	// 유틸: RGB → HEX
	function rgbToHex(rgb) {
	  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	  return m ? '#' + [1,2,3].map(i => parseInt(m[i])
	    .toString(16).padStart(2,'0')).join('') : '#000000';
	}
});