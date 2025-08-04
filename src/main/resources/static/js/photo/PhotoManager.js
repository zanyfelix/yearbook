// ============================================================================
// 📁 js/photo/PhotoManager.js - ✨ 기능 개선 최종 버전
// ============================================================================
class PhotoManager {
    static photoOverlay = null;

    /**
     * 사진 선택 시, 편집 UI(선택 상자, 조절 핸들, 회전 핸들)를 생성합니다.
     */
	static addSelectionUI(photo, frameGroup) {
		// 기존 UI 제거
		this.removeSelectionUI();

		// ✨✨✨ 수정된 부분 시작 ✨✨✨
		// 선택 상자를 photo.parent()가 아닌 frameGroup에 직접 추가하여
		// overflow:hidden 문제를 해결합니다.
		const parentContainer = frameGroup;
		// ✨✨✨ 수정된 부분 끝 ✨✨✨

		// 선택 상자 생성
		const selectionBox = $('<div class="photo-selection-box"></div>').css({
			position: 'absolute',
			pointerEvents: 'none'
		});

		// 회전 핸들 및 라인 추가
		const rotateHandle = $('<div class="photo-rotate-handle"></div>');
		const rotateLine = $('<div class="photo-rotate-line"></div>');

		// 리사이즈 핸들 추가 (네 모서리)
		const resizeHandles = ['nw', 'ne', 'sw', 'se'].map(pos =>
			$(`<div class="resize-handle handle-${pos}"></div>`)
		);
		
		// ✨ --- 핵심 수정 --- ✨
		const allHandles = [rotateHandle, ...resizeHandles];
		allHandles.forEach(handle => {
			handle.on('click', function(e) {
				e.stopPropagation();
			});
		});

		selectionBox.append(rotateHandle, rotateLine, ...resizeHandles);
		parentContainer.append(selectionBox); // 수정된 부모 컨테이너에 추가

		this.updateSelectionUI(photo); // UI 위치 및 크기 업데이트

		// 이벤트 핸들러 바인딩
		this._makeRotatable(photo, rotateHandle);
		resizeHandles.forEach(handle => this._makeResizable(photo, handle));
	}

    /**
     * 사진의 현재 상태(크기, 위치, 회전)에 맞춰 편집 UI를 업데이트합니다.
     */
    static updateSelectionUI(photo) {
        const selectionBox = $('.photo-selection-box');
        if (!selectionBox.length) return;

        selectionBox.css({
            left: photo.css('left'),
            top: photo.css('top'),
            width: photo.width(),
            height: photo.height(),
            transform: photo.css('transform') // 회전 동기화
        });
    }

    /**
     * 사진 편집 UI를 모두 제거합니다.
     */
    static removeSelectionUI() {
        $('.photo-selection-box').remove();
    }

    /**
     * 사진 드래그 처리 (성능 및 이동 제한 개선)
     */
	static handleDrag(photo, frameGroup, maskContainer, e) {
		const startX = e.clientX;
		const startY = e.clientY;
		const initialLeft = photo.position().left;
		const initialTop = photo.position().top;

		let rafId = null;

		const onMouseMove = (ev) => {
			if (rafId) cancelAnimationFrame(rafId);

			rafId = requestAnimationFrame(() => {
				const deltaX = ev.clientX - startX;
				const deltaY = ev.clientY - startY;

				let newLeft = initialLeft + deltaX;
				let newTop = initialTop + deltaY;

				// --- 드래그 이동 제한 로직 (수정) ---
				const containerWidth = maskContainer.width();
				const containerHeight = maskContainer.height();
				const photoWidth = photo.width();
				const photoHeight = photo.height();

				const minLeft = containerWidth - photoWidth;
				const maxLeft = 0;
				const minTop = containerHeight - photoHeight;
				const maxTop = 0;

				// 사진 너비가 컨테이너보다 클 때만 수평 제한 적용
				if (photoWidth > containerWidth) {
					newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
				} else {
					// 작거나 같으면 가운데 정렬
					newLeft = (containerWidth - photoWidth) / 2;
				}

				// 사진 높이가 컨테이너보다 클 때만 수직 제한 적용
				if (photoHeight > containerHeight) {
					newTop = Math.max(minTop, Math.min(newTop, maxTop));
				} else {
					// 작거나 같으면 가운데 정렬
					newTop = (containerHeight - photoHeight) / 2;
				}

				// 사진 위치 업데이트
				photo.css({ left: `${newLeft}px`, top: `${newTop}px` });

				// ✨✨✨ 추가된 부분 시작 ✨✨✨
				// 실루엣 위치를 사진과 동기화
				$('.photo-silhouette').css({ left: `${newLeft}px`, top: `${newTop}px` });
				// ✨✨✨ 추가된 부분 끝 ✨✨✨

				// 편집 UI 위치 업데이트
				this.updateSelectionUI(photo);
			});
		};

		const onMouseUp = () => {
			if (rafId) cancelAnimationFrame(rafId);
			$(document).off('mousemove.photoDrag mouseup.photoDrag');
		};

		$(document).on('mousemove.photoDrag', onMouseMove).on('mouseup.photoDrag', onMouseUp);
	}
    
    /**
     * 사진 회전 기능 구현
     */
    static _makeRotatable(photo, handle) {
        handle.on('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const photoCenter = {
                x: photo.offset().left + photo.width() / 2,
                y: photo.offset().top + photo.height() / 2
            };
            
            const initialAngle = Helpers.getPhotoRotation(photo);
            const startAngleRad = Math.atan2(e.clientY - photoCenter.y, e.clientX - photoCenter.x);

            $(document).on('mousemove.photoRotate', (ev) => {
                const currentAngleRad = Math.atan2(ev.clientY - photoCenter.y, ev.clientX - photoCenter.x);
                const deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
                let newAngle = initialAngle + deltaAngle;

                photo.css('transform', `rotate(${newAngle}deg)`);
				
				// ✨ 추가된 부분: 실루엣의 회전도 함께 업데이트
				$('.photo-silhouette').css('transform', `rotate(${newAngle}deg)`);
				                
                this.updateSelectionUI(photo);
            });

            $(document).on('mouseup.photoRotate', () => {
                $(document).off('mousemove.photoRotate mouseup.photoRotate');
            });
        });
    }

	/**
	     * 사진 크기 조절 기능 구현 (비율 유지 및 피벗 지점 고정)
	     */
	static _makeResizable(photo, handle) {
		handle.on('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();

			const startX = e.clientX;
			const startY = e.clientY;
			const startWidth = photo.width();
			const startHeight = photo.height();
			const startLeft = parseFloat(photo.css('left'));
			const startTop = parseFloat(photo.css('top'));
			const aspectRatio = startWidth / startHeight;

			$(document).on('mousemove.photoResize', (ev) => {
				let newWidth, newHeight;
				let newLeft = startLeft;
				let newTop = startTop;

				// 핸들 위치에 따라 계산 방식 변경
				if (handle.hasClass('handle-se')) {
					newWidth = startWidth + (ev.clientX - startX);
					newHeight = newWidth / aspectRatio;
				} else if (handle.hasClass('handle-sw')) {
					const deltaX = ev.clientX - startX;
					newWidth = startWidth - deltaX;
					newHeight = newWidth / aspectRatio;
					newLeft = startLeft + deltaX;
				} else if (handle.hasClass('handle-ne')) {
					const deltaY = ev.clientY - startY;
					newHeight = startHeight - deltaY;
					newWidth = newHeight * aspectRatio;
					newTop = startTop + deltaY;
				} else if (handle.hasClass('handle-nw')) {
					const deltaX = ev.clientX - startX;
					newWidth = startWidth - deltaX;
					newHeight = newWidth / aspectRatio;
					newLeft = startLeft + deltaX;
					newTop = startTop + (startHeight - newHeight);
				}

				// 최소 크기 제한
				if (newWidth < 50 || newHeight < 50) return;

				photo.css({
					width: `${newWidth}px`,
					height: `${newHeight}px`,
					left: `${newLeft}px`,
					top: `${newTop}px`
				});

				// 실루엣과 선택 UI도 함께 업데이트
				$('.photo-silhouette').css({
					width: `${newWidth}px`,
					height: `${newHeight}px`,
					left: `${newLeft}px`,
					top: `${newTop}px`
				});
				this.updateSelectionUI(photo);
			});

			$(document).on('mouseup.photoResize', () => {
				// 마우스 업 시, 이벤트 핸들러만 제거하고 선택 상태는 유지합니다.
				$(document).off('mousemove.photoResize mouseup.photoResize');
			});
		});
	}
	
	static showOverlay(photo, frameGroup) {
		this.hideOverlay();

		const frameTheme = frameGroup.data('frameTheme');
		if (!frameTheme?.editMaskPath) return;

		this.photoOverlay = $('<div id="photo-full-overlay"></div>').css({
			position: 'absolute', top: 0, left: 0,
			width: '100%', height: '100%',
			zIndex: 12, pointerEvents: 'none'
		});

		const silhouette = photo.clone().css({
			position: 'absolute',
			top: photo.css('top'), left: photo.css('left'),
			width: photo.css('width'), height: photo.css('height'),
			opacity: 0.4, border: '1px dashed #ff0000',
			zIndex: 1
		}).removeClass('selected-photo uploaded-photo').addClass('photo-silhouette');

		frameGroup.append(this.photoOverlay.append(silhouette));
	}

	static hideOverlay() {
		if (this.photoOverlay) {
			this.photoOverlay.remove();
			this.photoOverlay = null;
		}
		$('#photo-full-overlay, .photo-silhouette').remove();
	}

	static rotate(photo, angle) {
		const current = Helpers.getPhotoRotation(photo);
		const newAngle = (current + angle + 360) % 360;
		photo.css('transform', `rotate(${newAngle}deg)`);
	}
}