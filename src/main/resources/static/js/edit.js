$(document).ready(function() {

	let selectedBox = null;
	let selectedFrame = null;
	let selectedPhotoWrapper = null; // 현재 선택된 사진 래퍼

	const btnBg = $('#btn-background');
	const btnFrame = $('#btn-frame');
	const btnText = $('#btn-text');
	const bgPanel = $('#background-panel');
	const framePanel = $('#frame-panel');
	const textPanel = $('#text-panel');
	const photoFrameList = $('#photoFrameList');
	const thumbnailArea = $('#thumbnail-area');
	const preview = $('#page-preview');
	const tooltip = $('#text-tooltip');
	const inColor = $('#tooltip-color');
	const inSize = $('#tooltip-size');
	const inAlign = $('#tooltip-align');
	const btnRemove = $('#tooltip-remove');
	const addTextBtn = $('#add-text-btn');

	const frameControlsTooltip = $('#frame-controls-tooltip');
	const btnDeleteFrame = $('#btn-delete-frame');
	const frameRotateInput = $('#frame-rotate-input');
	
	const photoControlsTooltip = $('#photo-controls-tooltip');


	const allBtns = [btnBg, btnFrame, btnText];

	function hideAllPanels() {
		bgPanel.addClass('d-none');
		framePanel.addClass('d-none');
		textPanel.addClass('d-none');
	}

	function activate(btn) {
		allBtns.forEach(b => b.removeClass('active'));
		btn.addClass('active');
	}

	// Background Panel
	btnBg.on("click", function() {
		activate(btnBg);
		hideAllPanels();
		bgPanel.removeClass('d-none');

		bgPanel.empty();

		$.ajax({
			url: `${ctx}/edit/background`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				id: 11,
				category: "background"
			}),
			success: function(data) {
				data.forEach(function(result) {
					const col = $('<div class="col-4 text-center">');
					const wrapper = $('<div class="thumbnail-wrapper position-relative">');
					const img = $('<img class="img-thumbnail preview-img">').attr('src', result.theme.thumbnailPath);
					const overlay = $('<div class="overlay d-flex justify-content-center align-items-center">');
					const selectBtn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', function() {
						$('#page-preview-img').attr('src', result.theme.editPath);
						selectedBackgroundPath = result.theme.editPath;
					});

					overlay.append(selectBtn);
					wrapper.append(img).append(overlay);
					col.append(wrapper);
					bgPanel.append(col);
				});
			}
		});
	});

	// Frame Panel
	btnFrame.on("click", function() {
		activate(btnFrame);
		hideAllPanels();
		framePanel.removeClass('d-none');

		photoFrameList.empty();

		$.ajax({
			url: `${ctx}/edit/mainFrame`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				id: 11,
				category: "frame"
			}),
			success: function(data) {
				data.forEach(function(result) {
					const col = $('<div class="col-4 text-center">');
					const wrapper = $('<div class="thumbnail-wrapper position-relative">');
					const img = $('<img class="img-thumbnail preview-img">').attr('src', result.theme.thumbnailPath);
					const overlay = $('<div class="overlay d-flex justify-content-center align-items-center">');
					const selectBtn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', function() {
						const frameModalEl = $('#frameModal');
						const frameModal = new bootstrap.Modal(frameModalEl[0]);
						$('#modalFrameList').empty();
						loadFramesModal();
						frameModal.show();
					});

					overlay.append(selectBtn);
					wrapper.append(img).append(overlay);
					col.append(wrapper);
					photoFrameList.append(col);
				});
			}
		});
	});

	// Load Frames Modal - 프레임 데이터 로깅 추가
	function loadFramesModal() {
		$.ajax({
			url: `${ctx}/edit/mainFrame`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				id: 11,
				category: "frame"
			}),
			success: function(data) {

				const listEl = $('#modalFrameList');
				listEl.empty();

				data.forEach(function(result) {

					const col = $('<div class="col-4 text-center">');
					const wrapper = $('<div class="thumbnail-wrapper position-relative">');
					const img = $('<img class="img-thumbnail preview-img">').attr('src', result.theme.thumbnailPath);
					const overlay = $('<div class="overlay d-flex justify-content-center align-items-center">');
					const selectBtn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', function() {
						applyFrame(result.theme);
					});

					overlay.append(selectBtn);
					wrapper.append(img).append(overlay);
					col.append(wrapper);
					listEl.append(col);
				});
			}
		});
	}

	// 개선된 Frame 적용 함수 - 올바른 레이어 구조와 마스킹
	function applyFrame(frameTheme) {
		const frameContainer = $('#frame-container');
		frameContainer.css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 10
		});

		// 프레임 그룹 생성 (전체 프레임 컴포넌트를 담는 컨테이너)
		const frameGroup = $('<div class="frame-group"></div>').css({
			position: 'absolute',
			cursor: 'move',
			zIndex: 15
		});

		// 1. 마스킹 컨테이너 (사진이 마스크 영역에서만 보이도록)
		const maskContainer = $('<div class="mask-container"></div>').css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			zIndex: 16 // 프레임보다 아래
		});

		// 2. 사진 컨테이너 (실제 사진이 들어갈 공간)
		const photoContainer = $('<div class="photo-container"></div>').css({
			position: 'relative',
			width: '100%',
			height: '100%',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center'
		});

		// 3. 플레이스홀더
		const placeholderLink = $('<a href="#" class="place-image-here-link">Place Image Here</a>').css({
			color: '#007bff',
			textDecoration: 'underline',
			fontSize: '14px',
			fontWeight: 'bold',
			textAlign: 'center',
			display: 'block',
			zIndex: 19,
			position: 'relative'
		});

		// 4. 업로드된 사진 (마스킹될 대상)
		const uploadedPhoto = $('<img class="uploaded-photo">').css({
			display: 'none',
			position: 'absolute',
			cursor: 'move',
			maxWidth: 'none',
			maxHeight: 'none',
			objectFit: 'cover',
			zIndex: 17
		});

		// 5. 프레임 오버레이 (가장 위에 표시될 프레임 테두리)
		const frameOverlay = $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 20, // 가장 위에
			pointerEvents: 'none' // 클릭 이벤트가 하위 요소로 전달되도록
		});
		
		// 6. 클릭 감지용 투명 레이어 추가 (핵심 해결책!)
		const clickDetector = $('<div class="frame-click-detector"></div>').css({
		    position: 'absolute',
		    top: 0,
		    left: 0,
		    width: '100%',
		    height: '100%',
		    zIndex: 18, // 모든 것보다 위에
		    backgroundColor: 'transparent',
		    cursor: 'move',
			pointerEvents: 'none'
		});

		// DOM 구조 조립
		photoContainer.append(placeholderLink).append(uploadedPhoto);
		maskContainer.append(photoContainer);
		frameGroup.append(maskContainer).append(frameOverlay).append(clickDetector);;
		frameContainer.append(frameGroup);

		// frameTheme 데이터 저장 (나중에 참조용)
		frameGroup.data('frameTheme', frameTheme);

		// 마스킹 적용 - 프레임 생성 시 한 번만 적용 (복잡한 모양 지원)
		if (frameTheme.editMaskPath) {
			applyComplexShapeMasking(maskContainer, frameTheme);
		}

		// 프레임 이미지가 로드된 후 위치 및 크기 설정
		frameOverlay.on('load', function() {
			setupFramePosition(frameGroup, frameTheme, this);
			makeFrameDraggable(frameGroup);
		}).on('error', function() {
			setupFramePosition(frameGroup, frameTheme, null);
			makeFrameDraggable(frameGroup);
		});

		// 이벤트 핸들러 설정
		setupEnhancedFrameEventHandlers(frameGroup, placeholderLink, uploadedPhoto, maskContainer, clickDetector);

		// 모달 닫기
		$('#frameModal').modal('hide');
	}

	// 복잡한 모양 마스킹 적용 함수
	function applyComplexShapeMasking(maskContainer, frameTheme) {

		if (!frameTheme.editMaskPath) {
			console.warn('No mask path provided - photo will fill entire frame');
			return;
		}

		const maskImg = new Image();
		maskImg.crossOrigin = 'anonymous';

		maskImg.onload = function() {
			// CSS mask 적용 - 복잡한 모양 지원을 위한 향상된 설정
			const maskStyles = {
				// WebKit 기반 브라우저 (Chrome, Safari, Edge)
				'-webkit-mask-image': `url(${frameTheme.editMaskPath})`,
				'-webkit-mask-size': '100% 100%',
				'-webkit-mask-repeat': 'no-repeat',
				'-webkit-mask-position': 'center center',
				'-webkit-mask-origin': 'border-box',
				'-webkit-mask-clip': 'border-box',

				// 표준 CSS Mask (Firefox, 최신 브라우저)
				'mask-image': `url(${frameTheme.editMaskPath})`,
				'mask-size': '100% 100%',
				'mask-repeat': 'no-repeat',
				'mask-position': 'center center',
				'mask-origin': 'border-box',
				'mask-clip': 'border-box',
				'mask-mode': 'alpha', // 알파 채널 기반 마스킹

				// 추가 설정
				'overflow': 'hidden', // 마스크 밖으로 나가는 내용 숨김
				'isolation': 'isolate' // 스택킹 컨텍스트 생성
			};

			maskContainer.css(maskStyles);
		};

		maskImg.onerror = function() {
			console.error('Failed to load complex shape mask:', frameTheme.editMaskPath);

			// 대체 마스킹 방법 시도
			applyFallbackMasking(maskContainer, frameTheme);
		};

		maskImg.src = frameTheme.editMaskPath;
	}

	// 대체 마스킹 방법
	function applyFallbackMasking(maskContainer, frameTheme) {
		console.log('Applying fallback masking method');

		// Canvas 기반 마스킹 시도
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		const maskImg = new Image();
		maskImg.crossOrigin = 'anonymous';

		maskImg.onload = function() {
			canvas.width = maskImg.width;
			canvas.height = maskImg.height;
			ctx.drawImage(maskImg, 0, 0);

			const maskDataURL = canvas.toDataURL();

			maskContainer.css({
				'-webkit-mask-image': `url(${maskDataURL})`,
				'mask-image': `url(${maskDataURL})`,
				'-webkit-mask-size': '100% 100%',
				'mask-size': '100% 100%'
			});

			console.log('Fallback canvas masking applied');
		};

		maskImg.src = frameTheme.editMaskPath;
	}

	// 프레임 위치 및 크기 설정
	function setupFramePosition(frameGroup, frameTheme, frameImage) {
		const backgroundImage = $('#page-preview-img');
		const bgDisplayWidth = backgroundImage.width();
		const bgDisplayHeight = backgroundImage.height();

		// 프레임 크기 결정
		const frameWidth = frameTheme.width || (frameImage ? frameImage.naturalWidth : 200);
		const frameHeight = frameTheme.height || (frameImage ? frameImage.naturalHeight : 250);

		// 백그라운드 이미지 중앙에 프레임 배치
		const initialTop = (bgDisplayHeight - frameHeight) / 2;
		const initialLeft = (bgDisplayWidth - frameWidth) / 2;

		frameGroup.css({
			top: `${initialTop}px`,
			left: `${initialLeft}px`,
			width: `${frameWidth}px`,
			height: `${frameHeight}px`
		});
	}

	// 프레임 이벤트 핸들러 설정
	function setupEnhancedFrameEventHandlers(frameGroup, placeholderLink, uploadedPhoto, maskContainer, clickDetector) {
		// 이미지 업로드 클릭
		placeholderLink.on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();

			const fileInput = $('#image-upload-input');
			fileInput.data('targetFrameGroup', frameGroup);
			fileInput.data('targetUploadedPhoto', uploadedPhoto);
			fileInput.data('targetPlaceholderLink', placeholderLink);
			fileInput.data('targetMaskContainer', maskContainer);
			fileInput.trigger('click');
		});

		// 사진 클릭 시 사진 선택
		// 이 이벤트가 가장 먼저 발생하고, e.stopPropagation()으로 상위 클릭 이벤트 차단
		uploadedPhoto.on('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
		    selectPhoto(uploadedPhoto, frameGroup);
		});
		
		uploadedPhoto.on('load', function() {
		    if (uploadedPhoto.is(':visible')) {
		        //clickDetector.css('pointerEvents', 'auto'); // 사진이 있을 때만 클릭 감지 활성화
		    }
		});
		
		clickDetector.on('click', function(e) {
		    e.preventDefault();
		    e.stopPropagation();
		    selectFrame(frameGroup);
		});

		// 프레임 그룹 클릭 시 (사진 외 영역 클릭) 프레임 선택
		frameGroup.on('click', function(e) {
			
			if (!$(e.target).hasClass('uploaded-photo') && 
			    !$(e.target).hasClass('rotate-handle') && 
			    !$(e.target).hasClass('selection-handle') &&
			    !$(e.target).hasClass('place-image-here-link')) {
			    
				e.preventDefault();
			    e.stopPropagation(); // 이벤트를 여기서 멈춰 document 클릭 이벤트로 전달되지 않게 함 (중요!)
			    selectFrame(frameGroup);
			}
		});

		// 사진 드래그 기능 (makePhotoDraggable 내부에서 stopPropagation 처리됨)
		makePhotoDraggable(uploadedPhoto, maskContainer);
	}

	// 개선된 프레임 드래그 기능
	function makeFrameDraggable(frameGroup) {
		const backgroundImage = $('#page-preview-img');
		const bgDisplayWidth = backgroundImage.width();
		const bgDisplayHeight = backgroundImage.height();
		let isDragging = false;
		let startX, startY;

		frameGroup.on('mousedown', function(e) {
			// 사진 또는 핸들을 드래그하는 경우 프레임 드래그 방지
			if ($(e.target).hasClass('uploaded-photo') || 
			    $(e.target).hasClass('rotate-handle') || 
			    $(e.target).hasClass('selection-handle') || 
			    $(e.target).hasClass('place-image-here-link')) {
			    return; // 해당 요소들이 클릭/드래그될 때는 프레임 선택을 방지하고, 해당 요소의 드래그 로직으로 넘어감
			}

			isDragging = true;
			const frameGroupOffset = frameGroup.offset();
			const containerOffset = $('#frame-container').offset();

			startX = e.clientX - frameGroupOffset.left;
			startY = e.clientY - frameGroupOffset.top;

			selectFrame(frameGroup);

			$(document).on('mousemove', function(ev) {
				if (!isDragging) return;

				let newLeft = ev.clientX - startX - containerOffset.left;
				let newTop = ev.clientY - startY - containerOffset.top;

				// 배경 영역 내에서만 이동 제한
				newLeft = Math.max(0, Math.min(newLeft, bgDisplayWidth - frameGroup.width()));
				newTop = Math.max(0, Math.min(newTop, bgDisplayHeight - frameGroup.height()));

				frameGroup.css({
					left: `${newLeft}px`,
					top: `${newTop}px`
				});

				// Update tooltip position while dragging
				showFrameControlsTooltip(frameGroup);
			});

			$(document).on('mouseup', function() {
				isDragging = false;
				$(document).off('mousemove mouseup');
			});

			e.preventDefault();
			e.stopPropagation();
		});
	}

	// 사진 드래그 시 프레임 경계 내에서만 이동하도록 개선된 드래그 기능
	function makePhotoDraggable(photo, maskContainer) {
		let isDraggingPhoto = false;
		let photoStartX, photoStartY;
		let initialPhotoLeft, initialPhotoTop;

		photo.on('mousedown', function(e) {
			if (e.button !== 0) return; 
			
			e.preventDefault();
			e.stopPropagation(); // 이벤트 전파 중단
			
			isDraggingPhoto = true;

			// 사진 선택 (드래그 시작 시)
			const frameGroup = photo.closest('.frame-group');
			selectPhoto(photo, frameGroup);

			// 현재 사진의 위치 저장
			const photoPosition = photo.position();
			initialPhotoLeft = photoPosition.left;
			initialPhotoTop = photoPosition.top;

			photoStartX = e.clientX;
			photoStartY = e.clientY;

			$(document).on('mousemove', function(ev) {
				if (!isDraggingPhoto) return;

				// 마우스 이동 거리 계산
				const deltaX = ev.clientX - photoStartX;
				const deltaY = ev.clientY - photoStartY;

				// 새로운 위치 계산
				let newLeft = initialPhotoLeft + deltaX;
				let newTop = initialPhotoTop + deltaY;

				// maskContainer 경계 내에서만 이동 허용
				const containerWidth = maskContainer.width();
				const containerHeight = maskContainer.height();
				const photoWidth = photo.width();
				const photoHeight = photo.height();

				// 프레임 경계를 벗어나지 않도록 제한 (오버플로우 최소화)
				const allowOverflow = 20; // 20px까지만 오버플로우 허용
				newLeft = Math.max(-photoWidth + allowOverflow, Math.min(newLeft, containerWidth - allowOverflow));
				newTop = Math.max(-photoHeight + allowOverflow, Math.min(newTop, containerHeight - allowOverflow));

				photo.css({
					left: `${newLeft}px`,
					top: `${newTop}px`
				});
			});

			$(document).on('mouseup', function() {
				isDraggingPhoto = false;
				$(document).off('mousemove mouseup');
			});
		});
	}

	// 프레임 선택 기능 (개선된 시각적 피드백 포함)
	function selectFrame(frameGroup) {
		
		clearSelection();
		
		// 기존 선택 해제
		$('.frame-group').removeClass('selected-frame');
		$('.uploaded-photo').removeClass('selected-photo');

		selectedFrame = frameGroup;
		frameGroup.addClass('selected-frame');

		// 프레임 선택 시각적 효과
		frameGroup.css({
		    'box-shadow': '0 0 0 3px rgba(40, 167, 69, 0.8)', // 진한 녹색 그림자
		    'border': '2px solid #28a745', // 진한 녹색 테두리
			'outline': '2px solid #28a745', // 추가 아웃라인으로 더 명확하게
			'outline-offset': '2px'
		});

		// 선택 핸들(크기 조정 점) 추가
		addSelectionHandles(frameGroup);
		// NEW: 회전 핸들 추가
		addRotationHandle(frameGroup);
		// NEW: 프레임 컨트롤 툴팁 표시
		showFrameControlsTooltip(frameGroup);

	}

	// 사진 선택 기능 추가
	function selectPhoto(photo, frameGroup) {
		
		clearSelection(); 
		
		// 기존 선택 해제
		$('.frame-group').removeClass('selected-frame');
		$('.uploaded-photo').removeClass('selected-photo');

		// Hide frame controls when photo is selected
		frameControlsTooltip.addClass('d-none');
		$('.rotate-handle').remove(); // Remove all rotation handles

		// 사진 선택 효과
		photo.addClass('selected-photo');
		photo.css({
		    'box-shadow': '0 0 0 2px rgba(255, 165, 0, 0.8)', // 주황색 그림자
		    'border': '2px solid #FFA500', // 주황색 테두리
			'outline': '2px solid #FFA500', // 추가 아웃라인
			'outline-offset': '1px'
		});

		// 부모 프레임도 약간의 표시
		frameGroup.css({
		    'box-shadow': '0 0 0 1px rgba(255, 165, 0, 0.3)', // 연한 주황색 그림자
			'border': '1px solid rgba(255, 165, 0, 0.5)'
		});

		selectedPhotoWrapper = photo;
		
		addPhotoSelectionHandles(photo); // 크기 조절 핸들 추가
		addPhotoRotationHandle(photo); // 회전 핸들 추가
		showPhotoControlsTooltip(photo, frameGroup); // 컨트롤 툴팁 표시

	}
	
	//사진 컨트롤 툴팁 표시 함수
	function showPhotoControlsTooltip(photo, frameGroup) {
	    const frameRect = frameGroup[0].getBoundingClientRect();
	    const pagePreviewRect = $('#page-preview')[0].getBoundingClientRect();

	    const frameRelativeLeft = frameRect.left - pagePreviewRect.left;
	    const frameRelativeTop = frameRect.top - pagePreviewRect.top;

	    const tooltipWidth = photoControlsTooltip.outerWidth();
	    const tooltipHeight = photoControlsTooltip.outerHeight();

	    // ★★★ 프레임 툴팁과 동일한 위치 계산 로직 ★★★
	    // 툴팁을 프레임의 오른쪽 상단에 위치시킵니다.
	    let topPos = frameRelativeTop - tooltipHeight - 10;
	    let leftPos = frameRelativeLeft + frameRect.width + 10;

	    // --- 경계 확인 및 조정 로직 (기존 프레임 툴팁과 동일하게) ---
	    const pagePreviewWidth = $('#page-preview').width();
	    const pagePreviewHeight = $('#page-preview').height();

	    // 툴팁이 오른쪽으로 벗어날 경우
	    if (leftPos + tooltipWidth > pagePreviewWidth) {
	        // 프레임의 왼쪽으로 위치 변경
	        leftPos = frameRelativeLeft - tooltipWidth - 10;
	        if (leftPos < 0) {
	            leftPos = pagePreviewWidth - tooltipWidth;
	        }
	    }

	    // 툴팁이 위쪽으로 벗어날 경우
	    if (topPos < 0) {
	        // 프레임 아래로 위치 변경
	        topPos = frameRelativeTop + frameGroup.outerHeight() + 10;
	        if (topPos + tooltipHeight > pagePreviewHeight) {
	            topPos = pagePreviewHeight - tooltipHeight;
	        }
	    }

	    // 계산된 위치에 툴팁 표시
	    photoControlsTooltip.removeClass('d-none').css({
	        top: `${topPos}px`,
	        left: `${leftPos}px`
	    });

	    // 툴팁 컨트롤 값 초기화
	    const currentTransform = getPhotoTransform(photo);
		const inputZoomValue = ((currentTransform.scale - 0.5) / 2.5) * 100;
		
	    $('#photo-zoom-input').val(inputZoomValue);
	    $('#photo-rotate-input').val(currentTransform.rotation);
	}
	
	//사진 변환 정보(회전, 스케일) 가져오는 함수
	function getPhotoTransform(photo) {
	    const transform = photo.css('transform');
	    let scale = 1;
	    let rotation = 0;

	    if (transform && transform !== 'none') {
	        const matrix = transform.match(/matrix\((.+)\)/);
	        if (matrix) {
	            const values = matrix[1].split(', ').map(parseFloat);
	            const a = values[0];
	            const b = values[1];
	            
	            // 스케일 계산 ( assuming uniform scaling )
	            scale = Math.sqrt(a*a + b*b);
	            
	            // 회전각 계산
	            rotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
	            if (rotation < 0) rotation += 360;
	        }
	    }
	    return { scale, rotation };
	}

	//사진 크기 조절(Zoom) 및 회전 적용 함수
	function applyPhotoTransform(photo, scale, rotation) {
	    photo.css('transform', `rotate(${rotation}deg) scale(${scale})`);
	}

	//사진 크기 조절 핸들 추가 함수
	function addPhotoSelectionHandles(photo) {
	    $('.selection-handle').remove();
	    const handles = ['nw', 'ne', 'sw', 'se']; // 대각선 핸들만 사용
	    handles.forEach(position => {
	        const handle = $('<div class="selection-handle">').addClass(`handle-${position}`).css({
	            position: 'absolute',
	            width: '10px',
	            height: '10px',
	            backgroundColor: '#FFA500', // 주황색
	            border: '1px solid white',
	            cursor: getResizeCursor(position),
	            zIndex: 30
	        });

	        handle.css(getHandlePosition(position));
	        photo.append(handle);
	        
	        // 크기 조절 로직 추가
	        makePhotoResizable(photo, handle, position);
	    });
	}

	//사진 회전 핸들 추가 함수
	function addPhotoRotationHandle(photo) {
	    $('.rotate-handle').remove();
	    const rotateHandle = $('<div class="rotate-handle"></div>').css({
	        /* 스타일은 기존 addRotationHandle 함수와 유사하게 설정 */
	    });
	    photo.append(rotateHandle);

	    let isRotating = false;
	    let startAngle, photoCenter;

	    rotateHandle.on('mousedown', function(e) {
	        e.preventDefault();
	        e.stopPropagation();
	        isRotating = true;

	        const currentTransform = getPhotoTransform(photo);
	        startAngle = currentTransform.rotation;

	        const photoOffset = photo.offset();
	        photoCenter = {
	            x: photoOffset.left + photo.width() / 2,
	            y: photoOffset.top + photo.height() / 2
	        };
	        
	        const startRad = Math.atan2(e.clientY - photoCenter.y, e.clientX - photoCenter.x);

	        $(document).on('mousemove', function(ev) {
	            if (!isRotating) return;
	            const moveRad = Math.atan2(ev.clientY - photoCenter.y, ev.clientX - photoCenter.x);
	            const deltaAngle = (moveRad - startRad) * (180 / Math.PI);
	            let newAngle = (startAngle + deltaAngle);

	            applyPhotoTransform(photo, currentTransform.scale, newAngle);
	            $('#photo-rotate-input').val(Math.round(newAngle % 360));
	        });

	        $(document).on('mouseup', function() {
	            isRotating = false;
	            $(document).off('mousemove mouseup');
	        });
	    });
	}

	//사진 크기 조절 로직
	function makePhotoResizable(photo, handle, position) {
	    let isResizing = false;
	    
	    handle.on('mousedown', function(e) {
	        e.preventDefault();
	        e.stopPropagation();
	        isResizing = true;
	        
	        $(document).on('mousemove', function(ev) {
	            if (!isResizing) return;
	            // 크기 조절 로직 구현 (간단한 예시: 스케일 조정)
	            const currentTransform = getPhotoTransform(photo);
	            
	            // 마우스 이동에 따라 스케일 값을 간단히 증감시키는 로직
	            // (더 정교한 계산이 필요할 수 있음)
	            const movement = (ev.movementX - ev.movementY) * 0.001;
	            let newScale = parseFloat(currentTransform.scale) + movement;
	            newScale = Math.max(0.5, Math.min(newScale, 3)); // 최소/최대 스케일 제한

	            applyPhotoTransform(photo, newScale, currentTransform.rotation);
	            $('#photo-zoom-input').val(newScale);
	        });
	        
	        $(document).on('mouseup', function() {
	            isResizing = false;
	            $(document).off('mousemove mouseup');
	        });
	    });
	}

	// 선택 해제 기능
	function clearSelection() {
		// 프레임 선택 해제
		$('.frame-group').removeClass('selected-frame').css({
			'box-shadow': 'none',
			'border': 'none',
			'outline': 'none' // 아웃라인도 제거
		});

		// 사진 선택 해제
		$('.uploaded-photo').removeClass('selected-photo').css({
			'box-shadow': 'none',
			'border': 'none',
			'outline': 'none' // 아웃라인도 제거			
		});

		// 선택 핸들 제거
		$('.selection-handle').remove();
		$('.rotate-handle').remove();
		// NEW: 프레임 컨트롤 툴팁 숨기기
		frameControlsTooltip.addClass('d-none');
		photoControlsTooltip.addClass('d-none');

		selectedFrame = null;
		selectedPhotoWrapper = null;
		selectedBox = null;
		tooltip.addClass('d-none'); // Hide text tooltip
	}

	// 선택 핸들 추가 (프레임 크기 조정용) - (현재는 미구현, 시각적 표시만)
	// 이 함수는 현재 핸들을 추가하지만, 실제 리사이징 로직은 포함되어 있지 않습니다.
	// 리사이징을 구현하려면 mousedown/mousemove/mouseup 이벤트 핸들러를 추가해야 합니다.
	function addSelectionHandles(frameGroup) {
		// 기존 핸들 제거
		$('.selection-handle').remove();

		const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

		handles.forEach(position => {
			const handle = $('<div class="selection-handle">').addClass(`handle-${position}`).css({
			    position: 'absolute',
			    width: '8px',
			    height: '8px',
			    backgroundColor: '#28a745', // 녹색으로 변경 (프레임 테두리 색상과 맞춤)
			    border: '1px solid white',
			    borderRadius: '50%',
			    cursor: getResizeCursor(position),
			    zIndex: '25' // Ensure handles are above frame
			});

			// 핸들 위치 설정
			const handlePosition = getHandlePosition(position);
			handle.css(handlePosition);

			frameGroup.append(handle);

			// TODO: Add mousedown/mousemove/mouseup for actual resizing logic here
		});
	}

	// 핸들 위치 계산
	function getHandlePosition(position) {
		const offset = -4; // 핸들 크기의 절반

		switch (position) {
			case 'nw':
				return {
					top: `${offset}px`,
					left: `${offset}px`
				};
			case 'ne':
				return {
					top: `${offset}px`,
					right: `${offset}px`
				};
			case 'sw':
				return {
					bottom: `${offset}px`,
					left: `${offset}px`
				};
			case 'se':
				return {
					bottom: `${offset}px`,
					right: `${offset}px`
				};
			case 'n':
				return {
					top: `${offset}px`,
					left: '50%',
					transform: 'translateX(-50%)'
				};
			case 's':
				return {
					bottom: `${offset}px`,
					left: '50%',
					transform: 'translateX(-50%)'
				};
			case 'e':
				return {
					top: '50%',
					right: `${offset}px`,
					transform: 'translateY(-50%)'
				};
			case 'w':
				return {
					top: '50%',
					left: `${offset}px`,
					transform: 'translateY(-50%)'
				};
		}
	}

	// 리사이즈 커서 설정
	function getResizeCursor(position) {
		const cursors = {
			'nw': 'nw-resize',
			'ne': 'ne-resize',
			'sw': 'sw-resize',
			'se': 'se-resize',
			'n': 'n-resize',
			's': 's-resize',
			'e': 'e-resize',
			'w': 'w-resize'
		};
		return cursors[position];
	}

	// 개선된 파일 업로드 처리 - 마스킹 유지
	$('#image-upload-input').off('change').on('change', function(e) {
	    const file = e.target.files[0];
	    const $fileInput = $(this);
	    const targetFrameGroup = $fileInput.data('targetFrameGroup');
	    const targetUploadedPhoto = $fileInput.data('targetUploadedPhoto');
	    const targetPlaceholderLink = $fileInput.data('targetPlaceholderLink');
	    const targetMaskContainer = $fileInput.data('targetMaskContainer');

	    if (file && targetFrameGroup && targetUploadedPhoto && targetPlaceholderLink && targetMaskContainer) {
	        const reader = new FileReader();
	        reader.onload = function(event) {
	            // 사진 설정
	            targetUploadedPhoto.attr('src', event.target.result).css({
	                display: 'block',
	                position: 'absolute'
	            });

	            // 이미지 로드 완료 후 크기 조정
	            targetUploadedPhoto.on('load', function() {
	                const maskWidth = targetMaskContainer.width();
	                const maskHeight = targetMaskContainer.height();

	                // 이미지를 마스크 컨테이너에 맞게 크기 조정
	                const imgAspectRatio = this.naturalWidth / this.naturalHeight;
	                const containerAspectRatio = maskWidth / maskHeight;

	                let newWidth, newHeight;

	                // 컨테이너를 완전히 덮도록 크기 조정
	                if (imgAspectRatio > containerAspectRatio) {
	                    newHeight = maskHeight * 1.2;
	                    newWidth = newHeight * imgAspectRatio;
	                } else {
	                    newWidth = maskWidth * 1.2;
	                    newHeight = newWidth / imgAspectRatio;
	                }

	                // 사진 크기 및 중앙 배치
	                targetUploadedPhoto.css({
	                    width: `${newWidth}px`,
	                    height: `${newHeight}px`,
	                    left: `${(maskWidth - newWidth) / 2}px`,
	                    top: `${(maskHeight - newHeight) / 2}px`
	                });

	                // 사진이 업로드되면 clickDetector 활성화
	                const clickDetector = targetFrameGroup.find('.frame-click-detector');
	                clickDetector.css('pointerEvents', 'none');

	                // 사진 업로드 후 자동으로 사진 선택
	                selectPhoto(targetUploadedPhoto, targetFrameGroup);
	            });

	            // 플레이스홀더 숨기기
	            targetPlaceholderLink.hide();
	            $fileInput.val('');
	        };
	        reader.readAsDataURL(file);
	    }
	});

	// Clear 기능 (선택 상태도 함께 초기화)
	$('#btn-clear').on('click', function() {
		if (confirm("All designs on this page will be deleted and reset.\nPlease click \"Confirm\" to proceed.")) {
			$('#page-preview-img').attr('src', '/images/placeholder.png');
			$('#frame-container').empty();
			clearSelection(); // 선택 상태 초기화
		}
	});

	// 프레임 외부 클릭시 선택 해제 (개선됨)
	$(document).on('click', function(e) {
		const clickedOnFrame = $(e.target).closest('.frame-group').length > 0;
		const clickedOnTextBox = $(e.target).closest('.text-box').length > 0;
		const clickedOnTextTooltip = $(e.target).closest('#text-tooltip').length > 0;
		const clickedOnFrameTooltip = $(e.target).closest('#frame-controls-tooltip').length > 0;
		
		const clickedOnPhotoTooltip = $(e.target).closest('#photo-controls-tooltip').length > 0;

		if (!clickedOnFrame && !clickedOnTextBox && !clickedOnTextTooltip && !clickedOnFrameTooltip && !clickedOnPhotoTooltip) {
		        clearSelection();
		    }
	});

	// Text Panel
	btnText.on("click", function() {
		activate(btnText);
		hideAllPanels();
		textPanel.removeClass('d-none');
	});

	// Add Text Box 기능
	addTextBtn.on('click', function() {
		const preview = $('#page-preview');
		const frameContainer = $('#frame-container');

		// 텍스트 박스 생성
		const textBox = $('<div class="text-box" contenteditable="true">').css({
			position: 'absolute',
			top: '50px',
			left: '50px',
			padding: '8px',
			border: '2px dashed #007bff',
			backgroundColor: 'rgba(255, 255, 255, 0.8)',
			fontSize: '16px',
			color: '#000',
			minWidth: '100px',
			minHeight: '30px',
			cursor: 'text',
			zIndex: 20,
			outline: 'none'
		}).text('텍스트를 입력하세요');

		frameContainer.append(textBox);

		// 텍스트 박스 드래그 기능
		makeTextBoxDraggable(textBox);

		// 텍스트 박스 클릭 시 선택
		textBox.on('click', function(e) {
			e.stopPropagation();
			selectTextBox(textBox);
		});

		// 텍스트 박스 포커스 시 편집 모드
		textBox.on('focus', function() {
			$(this).css('border', '2px solid #007bff');
		});

		textBox.on('blur', function() {
			$(this).css('border', '2px dashed #007bff');
		});

		// 생성 직후 선택 상태로 설정
		selectTextBox(textBox);
	});

	// 텍스트 박스 드래그 기능
	function makeTextBoxDraggable(textBox) {
		let isDragging = false;
		let startX, startY;

		textBox.on('mousedown', function(e) {
			// contenteditable 영역에서의 텍스트 선택을 위해 일부 영역은 제외
			if (e.target === this && !$(this).is(':focus')) {
				isDragging = true;
				const textBoxOffset = textBox.offset();
				const containerOffset = $('#frame-container').offset();

				startX = e.clientX - textBoxOffset.left;
				startY = e.clientY - textBoxOffset.top;

				$(document).on('mousemove', function(ev) {
					if (!isDragging) return;

					let newLeft = ev.clientX - startX - containerOffset.left;
					let newTop = ev.clientY - startY - containerOffset.top;

					// 컨테이너 영역 내에서만 이동
					const containerWidth = $('#page-preview').width();
					const containerHeight = $('#page-preview').height();

					newLeft = Math.max(0, Math.min(newLeft, containerWidth - textBox.width()));
					newTop = Math.max(0, Math.min(newTop, containerHeight - textBox.height()));

					textBox.css({
						left: `${newLeft}px`,
						top: `${newTop}px`
					});
				});

				$(document).on('mouseup', function() {
					isDragging = false;
					$(document).off('mousemove mouseup');
				});

				e.preventDefault();
			}
		});
	}

	// 텍스트 박스 선택 기능
	function selectTextBox(textBox) {
		// Clear other selections
		clearSelection();

		selectedBox = textBox;
		textBox.addClass('selected-text').css('border', '2px solid #28a745');

		// 툴팁 표시
		showTextTooltip(textBox);
	}

	// 텍스트 툴팁 표시
	function showTextTooltip(textBox) {
		const textBoxOffset = textBox.offset();
		const containerOffset = $('#page-preview').offset();

		tooltip.removeClass('d-none').css({
			top: textBoxOffset.top - containerOffset.top - 40,
			left: textBoxOffset.left - containerOffset.left
		});

		// 현재 스타일 값으로 툴팁 초기화
		inColor.val(rgbToHex(textBox.css('color')));
		inSize.val(textBox.css('font-size'));
		inAlign.val(textBox.css('text-align') || 'left');
	}

	// 툴팁 컨트롤 이벤트
	inColor.on('change', function() {
		if (selectedBox) {
			selectedBox.css('color', $(this).val());
		}
	});

	inSize.on('change', function() {
		if (selectedBox) {
			selectedBox.css('font-size', $(this).val());
		}
	});

	inAlign.on('change', function() {
		if (selectedBox) {
			selectedBox.css('text-align', $(this).val());
		}
	});

	btnRemove.on('click', function() {
		if (selectedBox) {
			selectedBox.remove();
			selectedBox = null;
			tooltip.addClass('d-none');
		}
	});

	// NEW: Frame delete button event
	btnDeleteFrame.on('click', function() {
		if (selectedFrame && confirm("Are you sure you want to delete this frame?")) {
			selectedFrame.remove();
			clearSelection(); // Clear selection after deleting
		}
	});

	// NEW: Frame rotation input event
	frameRotateInput.on('change', function() {
		if (selectedFrame) {
			let angle = parseInt($(this).val());
			if (isNaN(angle)) angle = 0;
			angle = Math.max(0, Math.min(360, angle)); // Keep within 0-360
			$(this).val(angle); // Update input value if clamped
			applyFrameRotation(selectedFrame, angle);
		}
	});
	
	// NEW: Photo controls tooltip events
	$('#photo-zoom-input').on('input change', function() {
	    if (selectedPhotoWrapper) {
			const newScale = parseFloat($(this).val()); // parseFloat 추가
			const currentTransform = getPhotoTransform(selectedPhotoWrapper);
	        applyPhotoTransform(selectedPhotoWrapper, newScale, currentTransform.rotation);
	    }
	});
	
	$('#photo-rotate-input').on('change', function() {
	    if (selectedPhotoWrapper) {
	        let newAngle = parseInt($(this).val());
	        if (isNaN(newAngle)) newAngle = 0;
	        const currentTransform = getPhotoTransform(selectedPhotoWrapper);
	        applyPhotoTransform(selectedPhotoWrapper, currentTransform.scale, newAngle);
	    }
	});

	// NEW: Function to get current rotation of a frame
	function getFrameRotation(frameGroup) {
		const transform = frameGroup.css('transform');
		if (transform && transform !== 'none') {
			const matrix = transform.match(/^matrix\((.+)\)$/);
			if (matrix) {
				const values = matrix[1].split(',').map(Number);
				const a = values[0];
				const b = values[1];
				const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
				return angle < 0 ? angle + 360 : angle; // Ensure positive angle
			}
		}
		return 0;
	}

	// NEW: Function to apply rotation to a frame
	function applyFrameRotation(frameGroup, angle) {
		frameGroup.css('transform', `rotate(${angle}deg)`);
	}

	// NEW: Add Rotation Handle to frame
	function addRotationHandle(frameGroup) {
		// Remove existing handle first
		$('.rotate-handle').remove(); // Ensure only one handle exists at a time

		const rotateHandle = $('<div class="rotate-handle"></div>');
		frameGroup.append(rotateHandle);

		let isRotating = false;
		let startAngle = 0;
		let startClientX, startClientY;

		rotateHandle.on('mousedown', function(e) {
			e.stopPropagation(); // Prevent frame drag
			e.preventDefault(); // Prevent text selection
			
			isRotating = true;
			
			const frameCenter = {
				x: frameGroup.offset().left + frameGroup.width() / 2,
				y: frameGroup.offset().top + frameGroup.height() / 2
			};

			startClientX = e.clientX;
			startClientY = e.clientY;
			startAngle = getFrameRotation(frameGroup);

			$(document).on('mousemove', function(ev) {
				if (!isRotating) return;

				const currentAngleRad = Math.atan2(ev.clientY - frameCenter.y, ev.clientX - frameCenter.x);
				const startAngleRad = Math.atan2(startClientY - frameCenter.y, startClientX - frameCenter.x);

				let deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
				let newAngle = (startAngle + deltaAngle) % 360;
				if (newAngle < 0) newAngle += 360; // Ensure positive

				applyFrameRotation(frameGroup, newAngle);
				frameRotateInput.val(Math.round(newAngle)); // Update input field
			});

			$(document).on('mouseup', function() {
				isRotating = false;
				$(document).off('mousemove mouseup');
			});
		});
	}

	// NEW: Show and position frame controls tooltip
	function showFrameControlsTooltip(frameGroup) {
		
		const frameRect = frameGroup[0].getBoundingClientRect(); // 브라우저 뷰포트 기준
		const pagePreviewRect = $('#page-preview')[0].getBoundingClientRect(); // 브라우저 뷰포트 기준
		
	    // #page-preview 내부에서의 프레임 상대적 위치
		const frameRelativeLeft = frameRect.left - pagePreviewRect.left;
		const frameRelativeTop = frameRect.top - pagePreviewRect.top;

	    // 툴팁의 실제 너비와 높이
	    const tooltipWidth = frameControlsTooltip.outerWidth();
	    const tooltipHeight = frameControlsTooltip.outerHeight();

	    // 툴팁을 프레임의 오른쪽 상단에 위치시키되, 프레임 내부에 들어가지 않도록 약간 밖으로 빼는 계산
	    // 예: 프레임의 오른쪽 모서리 + 약간의 간격
		let topPos = frameRelativeTop - tooltipHeight - 10;
		let leftPos = frameRelativeLeft + frameRect.width + 10; // frameRect.width 사용

	    // --- 경계 확인 및 조정 로직 (이전 답변과 동일) ---
	    const pagePreviewWidth = $('#page-preview').width();
	    const pagePreviewHeight = $('#page-preview').height();

	    // 툴팁이 #page-preview 영역을 벗어나지 않도록 조정
	    if (leftPos < 0) {
	        leftPos = 0;
	    }
	    if (leftPos + tooltipWidth > pagePreviewWidth) {
	        leftPos = frameRelativeLeft - tooltipWidth - 10;
	        if (leftPos < 0) {
	            leftPos = pagePreviewWidth - tooltipWidth;
	        }
	    }

	    if (topPos < 0) {
	        topPos = frameRelativeTop + frameGroup.outerHeight() + 10;
	        if (topPos + tooltipHeight > pagePreviewHeight) {
	             topPos = pagePreviewHeight - tooltipHeight;
	        }
	    }
	    if (topPos + tooltipHeight > pagePreviewHeight) {
	        topPos = pagePreviewHeight - tooltipHeight;
	    }

	    frameControlsTooltip.removeClass('d-none').css({
	        top: `${topPos}px`,
	        left: `${leftPos}px`
	    });
	}


	// RGB를 HEX로 변환하는 유틸리티 함수
	function rgbToHex(rgb) {
		if (rgb.indexOf('#') === 0) return rgb;
		const result = rgb.match(/\d+/g);
		if (!result) return '#000000';
		return '#' + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
	}

	// 마스킹 디버깅 함수 (개발용)
	function debugMasking(frameGroup) {
		const frameTheme = frameGroup.data('frameTheme');
		const maskContainer = frameGroup.find('.mask-container');

		console.log('=== Masking Debug Info ===');
		console.log('Frame theme:', frameTheme);
		console.log('Mask path:', frameTheme?.editMaskPath);
		console.log('Mask container CSS:', {
			'mask-image': maskContainer.css('mask-image'),
			'-webkit-mask-image': maskContainer.css('-webkit-mask-image'),
			'mask-size': maskContainer.css('mask-size'),
			'overflow': maskContainer.css('overflow')
		});
		console.log('Photo elements:', frameGroup.find('.uploaded-photo').length);
		console.log('=========================');
	}

	// 글로벌 디버그 함수 (개발자 콘솔에서 사용 가능)
	window.debugAllFrames = function() {
		$('.frame-group').each(function(index) {
			console.log(`Frame ${index + 1}:`);
			debugMasking($(this));
		});
	};

	window.debugSelectedFrame = function() {
		if (selectedFrame) {
			debugMasking(selectedFrame);
		} else {
			console.log('No frame selected');
		}
	};
	
	// Delete 키로 프레임/사진 삭제
	$(document).on('keydown', function(e) {
	    if ((e.keyCode === 46 || e.key === 'Delete' || e.keyCode === 8 || e.key === 'Backspace')) {
	        const focusedElement = document.activeElement;
	        if (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA' || focusedElement.tagName === 'SELECT' || $(focusedElement).is('[contenteditable="true"]')) {
	            return;
	        }

	        if (selectedBox && selectedBox.is(focusedElement)) {
	            return;
	        }
	        
	        e.preventDefault();

	        // 사진이 선택된 경우 사진 삭제
	        if (selectedPhotoWrapper) {
	            if (confirm("Are you sure you want to delete this photo?")) {
	                const frameGroup = selectedPhotoWrapper.closest('.frame-group');
	                const placeholderLink = frameGroup.find('.place-image-here-link');
	                
	                selectedPhotoWrapper.hide().attr('src', '');
	                placeholderLink.show();
	                
	                const clickDetector = frameGroup.find('.frame-click-detector');
	                clickDetector.css('pointerEvents', 'none');
	                
	                clearSelection();
	                console.log("사진이 Delete/Backspace 키로 삭제되었습니다.");
	            }
	        }
	        // 프레임이 선택된 경우 프레임 삭제
	        else if (selectedFrame) {
	            if (confirm("Are you sure you want to delete this frame?")) {
	                selectedFrame.remove();
	                clearSelection();
	                console.log("프레임이 Delete/Backspace 키로 삭제되었습니다.");
	            }
	        }
	    }
	});
});