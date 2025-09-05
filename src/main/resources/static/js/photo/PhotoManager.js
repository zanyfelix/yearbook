// ============================================================================
// 📁 js/photo/PhotoManager.js - 최적화 버전
// ============================================================================
class PhotoManager {
	static photoOverlay = null;

	static config = {
		minSize: 50,
		handleSize: 14,
		animationDuration: 300,
		silhouetteOpacity: 0.4
	};

	// === 선택 UI 관리 ===

	static addSelectionUI(photo, frameGroup) {
		this.removeSelectionUI();

		const selectionBox = this.createSelectionBox();
		const rotateHandle = this.createRotateHandle();
		const rotateLine = this.createRotateLine();
		const resizeHandles = this.createResizeHandles();

		// 핸들 클릭 이벤트 차단
		[...resizeHandles, rotateHandle].forEach(handle => {
			handle.on('click', (e) => e.stopPropagation());
		});

		selectionBox.append(rotateHandle, rotateLine, ...resizeHandles);
		frameGroup.append(selectionBox);

		this.updateSelectionUI(photo);

		// 이벤트 바인딩
		EventManager.makeRotatable(photo, rotateHandle);
		resizeHandles.forEach(handle => this.bindResizeEvent(photo, handle));
	}

	static createSelectionBox() {
		return $('<div class="photo-selection-box"></div>').css({
			position: 'absolute',
			pointerEvents: 'none'
		});
	}

	static createRotateHandle() {
		return $('<div class="photo-rotate-handle"></div>');
	}

	static createRotateLine() {
		return $('<div class="photo-rotate-line"></div>');
	}

	static createResizeHandles() {
		return ['nw', 'ne', 'sw', 'se'].map(pos =>
			$(`<div class="resize-handle handle-${pos}"></div>`)
		);
	}

	static updateSelectionUI(photo) {
		const selectionBox = $('.photo-selection-box');
		if (!selectionBox.length) return;

		selectionBox.css({
			left: photo.css('left'),
			top: photo.css('top'),
			width: photo.outerWidth(),
			height: photo.outerHeight(),
			transform: photo.css('transform')
		});
	}

	static removeSelectionUI() {
		$('.photo-selection-box').remove();
	}

	// === 드래그 처리 ===

	static handleDrag(photo, frameGroup, maskContainer, e) {
		
		frameGroup.data('isDraggingPhoto', true);
		
		// 1. 움직일 요소들을 한 번만 찾아 변수에 저장(캐싱)합니다.
		const $selectionBox = $('.photo-selection-box');
		const $silhouette = $('.photo-silhouette');

		// 2. 드래그에 필요한 초기 정보를 계산합니다.
		const initialTransform = photo.css('transform');
		const photoOffset = photo.offset();
		const frameOffset = frameGroup.offset();

		const dragData = {
			offsetX: e.clientX - photoOffset.left,
			offsetY: e.clientY - photoOffset.top,
			frameOffsetX: frameOffset.left,
			frameOffsetY: frameOffset.top,
			baseTransform: window.getRotationMatrix(photo),
			latestMouseX: e.clientX,
			latestMouseY: e.clientY,
			ticking: false
		};

		// 3. 드래그 중 위치를 업데이트하는 함수입니다. (프레임 이탈 방지 로직 포함)
		const updatePositions = () => {
			const newAbsoluteX = dragData.latestMouseX - dragData.offsetX;
			const newAbsoluteY = dragData.latestMouseY - dragData.offsetY;

			const newTranslateX = newAbsoluteX - dragData.frameOffsetX;
			const newTranslateY = newAbsoluteY - dragData.frameOffsetY;

			const newTransform = `${dragData.baseTransform} translate(${newTranslateX}px, ${newTranslateY}px)`;

			// 이동하기 전에 교차 여부를 확인합니다.
			const originalTransform = photo.css('transform');
			photo.css('transform', newTransform); // 임시로 이동

			const photoCorners = GeometryHelper.getRotatedCorners(photo);
			const frameCorners = GeometryHelper.getRotatedCorners(frameGroup);

			if (GeometryHelper.checkIntersection(photoCorners, frameCorners)) {
				// 교차하면(프레임에 걸쳐있으면) 이동을 확정하고 나머지 요소들도 업데이트합니다.
				$selectionBox.css('transform', newTransform);
				$silhouette.css('transform', newTransform);
			} else {
				// 교차하지 않으면(프레임을 완전히 벗어나면), 원래 위치로 되돌립니다.
				photo.css('transform', originalTransform);
			}

			dragData.ticking = false;
		};

		// 4. 마우스 움직임에 따라 업데이트를 요청합니다.
		const onMouseMove = (ev) => {
			ev.preventDefault();
			dragData.latestMouseX = ev.clientX;
			dragData.latestMouseY = ev.clientY;

			if (!dragData.ticking) {
				requestAnimationFrame(updatePositions);
				dragData.ticking = true;
			}
		};

		// 5. 마우스를 놓았을 때 드래그를 종료하고 상태를 저장합니다.
		const onMouseUp = () => {
			$(document).off('.photoDrag');
			if (dragData.ticking) {
				updatePositions();
			}
			this.savePhotoState(photo, frameGroup, { isManual: true });
			window.selectionManager.selectPhoto(photo, frameGroup);

			// ✨ 드래그 종료 후 아주 잠시 뒤에 플래그 해제 (click 이벤트가 먼저 체크할 시간을 줌)
			setTimeout(() => {
				frameGroup.removeData('isDraggingPhoto');
			}, 0);
		};

		$(document).on('mousemove.photoDrag', onMouseMove)
			.on('mouseup.photoDrag', onMouseUp);
	}

	static getContainerBounds(maskContainer, photo) {
		const containerWidth = maskContainer.width();
		const containerHeight = maskContainer.height();
		const photoWidth = photo.width();
		const photoHeight = photo.height();

		return {
			containerWidth,
			containerHeight,
			photoWidth,
			photoHeight,
			minLeft: containerWidth - photoWidth,
			maxLeft: 0,
			minTop: containerHeight - photoHeight,
			maxTop: 0
		};
	}

	static calculateConstrainedPosition(newLeft, newTop, bounds, photo) {
		const currentState = photo.data('relativeState');

		if (currentState && currentState.isManuallyAdjusted) {
			return {
				left: `${newLeft}px`,
				top: `${newTop}px`
			};
		}

		let constrainedLeft = newLeft;
		let constrainedTop = newTop;

		// 수평 제약
		if (bounds.photoWidth > bounds.containerWidth) {
			constrainedLeft = Math.max(bounds.minLeft, Math.min(newLeft, bounds.maxLeft));
		} else {
			constrainedLeft = (bounds.containerWidth - bounds.photoWidth) / 2;
		}

		// 수직 제약
		if (bounds.photoHeight > bounds.containerHeight) {
			constrainedTop = Math.max(bounds.minTop, Math.min(newTop, bounds.maxTop));
		} else {
			constrainedTop = (bounds.containerHeight - bounds.photoHeight) / 2;
		}

		return {
			left: `${constrainedLeft}px`,
			top: `${constrainedTop}px`
		};
	}

	// === 크기 조절 처리 ===

	static bindResizeEvent(photo, handle) {
		handle.on('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();

			const resizeData = {
				startX: e.clientX,
				startY: e.clientY,
				startWidth: photo.width(),
				startHeight: photo.height(),
				startLeft: parseFloat(photo.css('left')),
				startTop: parseFloat(photo.css('top')),
				aspectRatio: photo.width() / photo.height(),
				handlePosition: this.getHandlePosition(handle)
			};

			$(document).on('mousemove.photoResize', (ev) => {
				const deltaX = ev.clientX - resizeData.startX;
				const deltaY = ev.clientY - resizeData.startY;

				const newDimensions = this.calculateNewDimensions(
					resizeData,
					deltaX,
					deltaY
				);

				if (newDimensions.width >= this.config.minSize &&
					newDimensions.height >= this.config.minSize) {
					this.applyDimensions(photo, newDimensions);
				}
			});

			$(document).on('mouseup.photoResize', () => {
				$(document).off('.photoResize');
				const state = photo.data('relativeState') || {};
				state.isManuallyAdjusted = true; // '수동 조절됨' 플래그 추가
				this.savePhotoState(photo, photo.closest('.frame-group'), { isManual: true });
			});
		});
	}

	static getHandlePosition(handle) {
		const classes = handle.attr('class');
		if (classes.includes('handle-se')) return 'se';
		if (classes.includes('handle-sw')) return 'sw';
		if (classes.includes('handle-ne')) return 'ne';
		if (classes.includes('handle-nw')) return 'nw';
		return 'se';
	}

	static calculateNewDimensions(resizeData, deltaX, deltaY) {
		let newWidth = resizeData.startWidth;
		let newHeight = resizeData.startHeight;
		let newLeft = resizeData.startLeft;
		let newTop = resizeData.startTop;

		switch (resizeData.handlePosition) {
			case 'se':
				newWidth = resizeData.startWidth + deltaX;
				newHeight = newWidth / resizeData.aspectRatio;
				break;

			case 'sw':
				newWidth = resizeData.startWidth - deltaX;
				newHeight = newWidth / resizeData.aspectRatio;
				newLeft = resizeData.startLeft + deltaX;
				break;

			case 'ne':
				newHeight = resizeData.startHeight - deltaY;
				newWidth = newHeight * resizeData.aspectRatio;
				newTop = resizeData.startTop + deltaY;
				break;

			case 'nw':
				newWidth = resizeData.startWidth - deltaX;
				newHeight = newWidth / resizeData.aspectRatio;
				newLeft = resizeData.startLeft + deltaX;
				newTop = resizeData.startTop + (resizeData.startHeight - newHeight);
				break;
		}

		return { width: newWidth, height: newHeight, left: newLeft, top: newTop };
	}

	static applyDimensions(photo, dimensions) {
		photo.css({
			width: `${dimensions.width}px`,
			height: `${dimensions.height}px`,
			left: `${dimensions.left}px`,
			top: `${dimensions.top}px`
		});

		$('.photo-silhouette').css({
			width: `${dimensions.width}px`,
			height: `${dimensions.height}px`,
			left: `${dimensions.left}px`,
			top: `${dimensions.top}px`
		});

		this.updateSelectionUI(photo);
	}

	// === 오버레이 관리 ===

	static showOverlay(photo, frameGroup) {
		this.hideOverlay();

		const frameTheme = frameGroup.data('frameTheme');
		if (!frameTheme?.editMaskPath) return;

		this.photoOverlay = this.createOverlay();
		const silhouette = this.createSilhouette(photo);

		frameGroup.append(this.photoOverlay.append(silhouette));
	}

	static createOverlay() {
		return $('<div id="photo-full-overlay"></div>').css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 12,
			pointerEvents: 'none'
		});
	}

	static createSilhouette(photo) {
		return photo.clone().css({
			position: 'absolute',
			top: photo.css('top'),
			left: photo.css('left'),
			width: photo.css('width'),
			height: photo.css('height'),
			opacity: this.config.silhouetteOpacity,
			border: '1px dashed #ff0000',
			zIndex: 1
		}).removeClass('selected-photo uploaded-photo')
			.addClass('photo-silhouette');
	}

	static hideOverlay() {
		if (this.photoOverlay) {
			this.photoOverlay.remove();
			this.photoOverlay = null;
		}
		$('#photo-full-overlay, .photo-silhouette').remove();
	}

	// === 상태 저장 ===

	static savePhotoState(photo, frameGroup, options = {}) {
		const frameW = frameGroup.width();
		const frameH = frameGroup.height();

		// 현재 transform에서 translate 값(px)을 읽어옴
		const currentTransform = photo.css('transform');
		const translateValues = window.getTranslateValues(currentTransform);

		const currentState = photo.data('relativeState') || {};

		// translate 값을 %로 변환하여 position에 저장
		currentState.position = {
			left: frameW > 0 ? (translateValues.x / frameW) * 100 : 0,
			top: frameH > 0 ? (translateValues.y / frameH) * 100 : 0
		};

		// translate를 제외한 나머지 transform 정보(회전, 크기)를 저장
		let transformNoTranslate = window.getRotationMatrix(photo); // matrix(a,b,c,d,0,0) 또는 'none':contentReference[oaicite:2]{index=2}
		if (transformNoTranslate === 'none' && currentTransform && currentTransform !== 'none') {
			// rotate/scale로만 구성된 비-matrix 문자열일 경우(브라우저에 따라 다름) 방어적으로 translate를 제거
			transformNoTranslate = currentTransform.replace(/translate\([^)]+\)/, '').trim() || 'none';
		}
		currentState.transform = transformNoTranslate;

		// 3) 크기 저장(필요 시 항상 갱신해도 무방)
		currentState.size = {
			width: (photo.width() / frameW) * 100,
			height: (photo.height() / frameH) * 100
		};

		// 4) transform-origin 저장
		currentState.transformOrigin = photo.css('transform-origin') || '50% 50%';

		// 5) 수동 조절 플래그 반영
		if (typeof options.isManual === 'boolean') {
			currentState.isManuallyAdjusted = options.isManual;
		}

		photo.data('relativeState', currentState);
	}

	// === 유틸리티 메서드 ===

	static rotate(photo, angle) {
		const current = Helpers.getPhotoRotation(photo);
		const newAngle = (current + angle + 360) % 360;
		photo.css('transform', `rotate(${newAngle}deg)`);
	}
}