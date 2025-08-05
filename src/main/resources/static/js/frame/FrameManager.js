// ============================================================================
// 📁 js/frame/FrameManager.js
// ============================================================================
class FrameManager {
	static applyFrame(frameTheme, savedState = null) {
		const frameContainer = $('#frame-container');
		const frameGroup = $('<div class="frame-group"></div>').css({
			position: 'absolute', cursor: 'move', zIndex: 15
		});

		const maskContainer = $('<div class="mask-container"></div>').css({
			position: 'absolute', top: 0, left: 0,
			width: '100%', height: '100%',
			overflow: 'hidden', zIndex: 16
		});
		
		const isTextboxFrame = frameTheme.category === 'textboxframe' ||
			frameTheme.type === 'textbox' ||
			frameTheme.name?.toLowerCase().includes('text');

		const photoContainer = $('<div class="photo-container"></div>').css({
			position: 'relative', width: '100%', height: '100%',
			display: 'flex', justifyContent: 'center', alignItems: 'center',
			backgroundColor: isTextboxFrame ? 'transparent' : 'black'
		});

		const placeholderLink = $('<a href="#" class="place-image-here-link">Place Image Here</a>').css({
			color: 'white', textDecoration: 'underline',
			fontWeight: 'bold',
			textAlign: 'center', display: 'block',
			position: 'relative',
			cursor: 'pointer'  // 포인터 커서 추가
		});

		const uploadedPhoto = $('<img class="uploaded-photo">').css({
			display: 'none', position: 'absolute',
			cursor: 'move', maxWidth: 'none', maxHeight: 'none',
			objectFit: 'cover', zIndex: 17
		});

		const frameOverlay = $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
			position: 'absolute', top: 0, left: 0,
			width: '100%', height: '100%',
			zIndex: 20, pointerEvents: 'none'  // frameOverlay의 pointer-events를 none으로 설정
		});

		photoContainer.append(placeholderLink).append(uploadedPhoto);
		maskContainer.append(photoContainer);
		frameGroup.append(maskContainer).append(frameOverlay);
		frameContainer.append(frameGroup);

		frameGroup.data('frameTheme', frameTheme);

		if (frameTheme.editMaskPath) {
			this.applyMasking(maskContainer, frameTheme);
		}

		frameOverlay.on('load', () => {
			this.setupPosition(frameGroup, frameTheme);
			EventManager.setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer);
			
			// ✨ 핵심 수정: 생성된 프레임을 즉시 선택 상태로 만듭니다.
			window.selectionManager.selectFrame(frameGroup);
		});
		
		frameOverlay.on('load', () => {
			if (savedState) {
				// ✨ 저장된 상태(savedState)가 있으면, 그 정보로 프레임 복원
				frameGroup.css({
					left: savedState.position.left + 'px',
					top: savedState.position.top + 'px',
					width: savedState.size.width + 'px',
					height: savedState.size.height + 'px',
					transform: savedState.transform
				});

				if (savedState.photo && savedState.photo.src) {
					uploadedPhoto.attr('src', savedState.photo.src)
						.css({
							display: 'block',
							left: savedState.photo.position.left + 'px',
							top: savedState.photo.position.top + 'px',
							width: savedState.photo.size.width + 'px',
							height: savedState.photo.size.height + 'px',
							transform: savedState.photo.transform
						});
					placeholderLink.hide();
				}
			} else {
				// ✨ 저장된 상태가 없으면, 새로 추가하는 로직 (기존과 동일)
				this.setupPosition(frameGroup, frameTheme);
				window.selectionManager.selectFrame(frameGroup);
			}

			EventManager.setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer);
		});
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
        const bgWidth = bg.width();
        const bgHeight = bg.height();
        const bgPos = bg.position();
        
		const frameOverlay = frameGroup.find('.frame-overlay');
		    
		// 실제 이미지 크기 기반으로 설정
		const img = frameOverlay[0];
		const frameWidth = img.naturalWidth || frameTheme.width || 200;
		const frameHeight = img.naturalHeight || frameTheme.height || 250;

		// 또는 비율 기반 크기 조정
		const maxSize = 300; // 최대 크기 제한
		let finalWidth = frameWidth;
		let finalHeight = frameHeight;

		if (frameWidth > maxSize || frameHeight > maxSize) {
			const ratio = Math.min(maxSize / frameWidth, maxSize / frameHeight);
			finalWidth = frameWidth * ratio;
			finalHeight = frameHeight * ratio;
		}
        
        const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * bgWidth;
        const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * bgHeight;
        
        const safeLeft = bgPos.left + safeMarginX;
        const safeTop = bgPos.top + safeMarginY;
        const safeRight = bgPos.left + bgWidth - safeMarginX;
        const safeBottom = bgPos.top + bgHeight - safeMarginY;
        
        const safeWidth = safeRight - safeLeft;
        const safeHeight = safeBottom - safeTop;
        
        const left = safeLeft + (safeWidth - frameWidth) / 2;
        const top = safeTop + (safeHeight - frameHeight) / 2;
        
        frameGroup.css({
            left: `${Math.max(safeLeft, Math.min(left, safeRight - frameWidth))}px`,
            top: `${Math.max(safeTop, Math.min(top, safeBottom - frameHeight))}px`,
            width: `${frameWidth}px`,
            height: `${frameHeight}px`
        });
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