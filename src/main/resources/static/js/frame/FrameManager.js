// ============================================================================
// 📁 js/frame/FrameManager.js
// ============================================================================
class FrameManager {
	static applyFrame(frameTheme, savedState = null) {
		const frameContainer = $('#frame-container');
		
		let baseZIndex = 15;
		const isTextboxFrame = frameTheme.category === 'textboxframe' || frameTheme.type === 'textbox' ||
					frameTheme.name?.toLowerCase().includes('text');
		const isElement = frameTheme.category === 'element' || frameTheme.type === 'element';
		
		if (isTextboxFrame) {
				baseZIndex = 10; // 텍스트박스(z-index: 100)보다 낮게
			}
				
		const frameGroup = $('<div class="frame-group"></div>').css({
			position: 'absolute', cursor: 'move', zIndex: baseZIndex
		});
		

		let frameOverlay; // frameOverlay를 상위 스코프에 선언

		if (isTextboxFrame || isElement) {
			// 텍스트박스프레임인 경우: 마스크 없이 단순하게 구성
			frameOverlay = $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
				position: 'absolute', top: 0, left: 0,
				width: '100%', height: '100%',
				zIndex: isTextboxFrame ? 5 : 20, pointerEvents: 'none'
			});

			frameGroup.append(frameOverlay);
			if (isTextboxFrame) {
				frameGroup.addClass('textbox-frame');
			} else if (isElement) {
				frameGroup.addClass('element-frame');
			}
		} else {
			// 포토프레임인 경우: 기존 로직 유지
			const maskContainer = $('<div class="mask-container"></div>').css({
				position: 'absolute', top: 0, left: 0,
				width: '100%', height: '100%',
				overflow: 'hidden', zIndex: 16
			});

			const photoContainer = $('<div class="photo-container"></div>').css({
				position: 'relative', width: '100%', height: '100%',
				display: 'flex', justifyContent: 'center', alignItems: 'center',
				backgroundColor: 'black'
			});

			const placeholderLink = $('<a href="#" class="place-image-here-link">Place Image Here</a>').css({
				color: 'white', textDecoration: 'underline',
				fontWeight: 'bold',
				textAlign: 'center', display: 'block',
				position: 'relative',
				cursor: 'pointer'
			});

			const uploadedPhoto = $('<img class="uploaded-photo">').css({
				display: 'none', position: 'absolute',
				cursor: 'move', maxWidth: 'none', maxHeight: 'none',
				objectFit: 'cover', zIndex: 17
			});

			frameOverlay = $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
				position: 'absolute', top: 0, left: 0,
				width: '100%', height: '100%',
				zIndex: 20, pointerEvents: 'none'
			});

			photoContainer.append(placeholderLink).append(uploadedPhoto);
			maskContainer.append(photoContainer);
			frameGroup.append(maskContainer).append(frameOverlay);

			// 마스크 적용 (마스크 경로가 있는 경우에만)
			if (frameTheme.editMaskPath) {
				this.applyMasking(maskContainer, frameTheme);
			}
		}

		frameContainer.append(frameGroup);
		frameGroup.data('frameTheme', frameTheme);

		// DB에서 width/height를 가져오므로 프리로딩 없이 바로 진행
		frameOverlay.attr('src', frameTheme.editPath);

		if (savedState) {
			frameGroup.data('relativeState', savedState);
			window.updateElementPosition(frameGroup);
			
			if (!isTextboxFrame && !isElement && savedState.photo && savedState.photo.src) {
				const uploadedPhoto = frameGroup.find('.uploaded-photo');
				const placeholderLink = frameGroup.find('.place-image-here-link');

				uploadedPhoto.on('load', function() {
					console.log('프레임 내 사진 로드 완료');
					placeholderLink.hide();
					window.updateElementPosition(uploadedPhoto, savedState.photo);

					if (typeof onComplete === 'function') {
						setTimeout(onComplete, 50);
					}
				});

				uploadedPhoto.attr('src', savedState.photo.src).css('display', 'block');
			} else {
				if (typeof onComplete === 'function') {
					setTimeout(onComplete, 50);
				}
			}
		} else {
			// 새로운 프레임 추가
			this.setupPosition(frameGroup, frameTheme);
			if (isElement) window.selectionManager.selectElement(frameGroup);
			else window.selectionManager.selectFrame(frameGroup);
			
			if (typeof onComplete === 'function') {
				setTimeout(onComplete, 50);
			}
		}

		// 이벤트 핸들러 바인딩
		if (!isTextboxFrame && !isElement) EventManager.setupFrameEvents(frameGroup, frameGroup.find('.place-image-here-link'), frameGroup.find('.uploaded-photo'), frameGroup.find('.mask-container'));
		else if (isTextboxFrame) EventManager.setupTextboxFrameEvents(frameGroup);
		else if (isElement) EventManager.setupElementEvents(frameGroup);
	}
    
    static applyMasking(container, frameTheme) {
        const img = new Image();
        img.onload = () => {
            container.css({
                '-webkit-mask-image': `url(${frameTheme.editMaskPath})`,
                'mask-image': `url(${frameTheme.editMaskPath})`,
                '-webkit-mask-size': '100% 100%',
                'mask-size': '100% 100%',
                'mask-repeat': 'no-repeat',
                'mask-position': 'center'
            });
        };
        img.src = frameTheme.editMaskPath;
    }
    
	static setupPosition(frameGroup, frameTheme) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		// DB에서 가져온 프레임의 원본 크기 (px)
		const originalFrameWidth = frameTheme.editWidth;
		const originalFrameHeight = frameTheme.editHeight;

		if (!originalFrameWidth || !originalFrameHeight) {
			console.error("프레임의 원본 크기(editWidth, editHeight) 데이터가 없습니다.", frameTheme);
			return;
		}

		// ✨ 핵심 수정: 기준이 되는 편집용 웹 배경의 원본 크기를 상수로 정의
		const TEMPLATE_WEB_BG_WIDTH = 786; // 편집용 배경 이미지의 원본 너비

		// 1. 편집용 웹 배경 대비 프레임의 상대적 너비 비율 계산
		const widthRatio = originalFrameWidth / TEMPLATE_WEB_BG_WIDTH;

		// 2. 프레임의 가로세로 비율 계산
		const frameAspectRatio = originalFrameWidth / originalFrameHeight;

		// 3. 현재 보이는 배경에 상대 비율을 적용하여 새 프레임의 크기 계산
		const newWidth = actualBgRect.width * widthRatio;
		const newHeight = newWidth / frameAspectRatio;

		// 계산된 위치/크기를 적용 (화면 중앙에 배치)
		const left = actualBgRect.left + (actualBgRect.width - newWidth) / 2;
		const top = actualBgRect.top + (actualBgRect.height - newHeight) / 2;

		frameGroup.css({ left: `${left}px`, top: `${top}px`, width: `${newWidth}px`, height: `${newHeight}px` });

		// 퍼센트(%)로 변환하여 data 속성에 저장
		const relativeState = {
			position: {
				left: ((left - actualBgRect.left) / actualBgRect.width) * 100,
				top: ((top - actualBgRect.top) / actualBgRect.height) * 100
			},
			size: {
				width: (newWidth / actualBgRect.width) * 100,
				height: (newHeight / actualBgRect.height) * 100
			},
			transform: 'matrix(1, 0, 0, 1, 0, 0)'
		};
		frameGroup.data('relativeState', relativeState);
	}
    
	static addRotationHandle(frameGroup) {
	    $('.rotate-handle, .rotate-line').remove();
	    const handle = $('<div class="rotate-handle"></div>');
	    const line = $('<div class="rotate-line"></div>');
	    
	    frameGroup.append(handle).append(line);
	    
	    // 회전 이벤트 복원
	    let isRotating = false;
	    let startAngle = 0;
	    let startClientX, startClientY;

	    handle.on('mousedown', function(e) {
	        e.stopPropagation();
	        e.preventDefault();
	        
	        isRotating = true;
	        
	        const frameCenter = {
	            x: frameGroup.offset().left + frameGroup.width() / 2,
	            y: frameGroup.offset().top + frameGroup.height() / 2
	        };

	        startClientX = e.clientX;
	        startClientY = e.clientY;
	        startAngle = Helpers.getFrameRotation(frameGroup);

	        $(document).on('mousemove', function(ev) {
	            if (!isRotating) return;

	            const currentAngleRad = Math.atan2(ev.clientY - frameCenter.y, ev.clientX - frameCenter.x);
	            const startAngleRad = Math.atan2(startClientY - frameCenter.y, startClientX - frameCenter.x);

	            let deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
	            let newAngle = (startAngle + deltaAngle) % 360;
	            if (newAngle < 0) newAngle += 360;

	            frameGroup.css('transform', `rotate(${newAngle}deg)`);
	        });

	        $(document).on('mouseup', function() {
	            isRotating = false;
	            $(document).off('mousemove mouseup');
	        });
	    });
	}
    
	static handleDrag(frameGroup, e) {
		
		const startX = e.clientX;
		const startY = e.clientY;
		const initialLeft = parseFloat(frameGroup.css('left')) || 0;
		const initialTop = parseFloat(frameGroup.css('top')) || 0;

		let rafId = null;
		let lastTooltipUpdate = 0;

		// 드래그 시작 시 클래스 추가
		frameGroup.addClass('dragging');

		const updatePosition = (clientX, clientY) => {
			const deltaX = clientX - startX;
			const deltaY = clientY - startY;

			let newLeft = initialLeft + deltaX;
			let newTop = initialTop + deltaY;

			const constrained = window.selectionManager.applySafeLineConstraints(newLeft, newTop, frameGroup);

			frameGroup.css({
				left: `${constrained.left}px`,
				top: `${constrained.top}px`
			});

			// 툴팁 업데이트는 100ms마다만
			const now = Date.now();
			if (now - lastTooltipUpdate > 100) {
				lastTooltipUpdate = now;
			}
		};

		$(document).on('mousemove.frameDrag', (ev) => {
			// 이전 애니메이션 프레임 취소
			if (rafId) {
				cancelAnimationFrame(rafId);
			}

			// requestAnimationFrame으로 부드럽게 처리
			rafId = requestAnimationFrame(() => {
				updatePosition(ev.clientX, ev.clientY);
			});
		});

		$(document).on('mouseup.frameDrag', () => {
			if (rafId) {
				cancelAnimationFrame(rafId);
			}
			$(document).off('mousemove.frameDrag mouseup.frameDrag');

			// 드래그 종료 시 클래스 제거
			frameGroup.removeClass('dragging');

			// 마지막 툴팁 위치 업데이트
			UIManager.showFrameTooltip(frameGroup);
		});
	}
}