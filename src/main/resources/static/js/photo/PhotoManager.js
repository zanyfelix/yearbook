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

		setTimeout(() => {
			this.updateSelectionUI(photo);
		}, 0);

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

		const initialTransform = photo.css('transform');
		// ✨ TransformHelper를 사용하여 초기 행렬을 정확히 파싱합니다.
		const initialMatrix = TransformHelper.parseMatrix(initialTransform);

		const dragData = {
			startX: e.clientX,
			startY: e.clientY,
			initialMatrix: initialMatrix, // ✨ 초기 행렬 전체를 저장합니다.
			ticking: false
		};

		const $selectionBox = $('.photo-selection-box');
		const $silhouette = $('.photo-silhouette');

		const updatePositions = (latestEvent) => {
			const deltaX = latestEvent.clientX - dragData.startX;
			const deltaY = latestEvent.clientY - dragData.startY;

			// ✨ TransformHelper를 사용해 초기 행렬에 이동 변화량을 정확히 더합니다.
			const newMatrix = { ...dragData.initialMatrix };
			newMatrix.tx += deltaX;
			newMatrix.ty += deltaY;

			let newTransform = TransformHelper.composeMatrix(newMatrix);

			const originalTransform = photo.css('transform');
			photo.css('transform', newTransform);

			const photoCorners = GeometryHelper.getRotatedCorners(photo);
			const maskCorners = GeometryHelper.getMaskedAreaCorners(frameGroup);

			if (maskCorners && GeometryHelper.checkIntersection(photoCorners, maskCorners)) {
				// 교차하면 이동 확정
			} else {
				newTransform = originalTransform;
				photo.css('transform', newTransform);
			}

			$selectionBox.css('transform', newTransform);
			$silhouette.css('transform', newTransform);

			dragData.ticking = false;
		};

		const onMouseMove = (ev) => {
			ev.preventDefault();
			if (!dragData.ticking) {
				requestAnimationFrame(() => updatePositions(ev));
				dragData.ticking = true;
			}
		};

		const onMouseUp = (ev) => {
			$(document).off('.photoDrag');
			updatePositions(ev);
			this.savePhotoState(photo, frameGroup, { isManual: true });
			window.selectionManager.selectPhoto(photo, frameGroup);
			setTimeout(() => {
				frameGroup.removeData('isDraggingPhoto');
			}, 0);
		};

		$(document).on('mousemove.photoDrag', onMouseMove).on('mouseup.photoDrag', onMouseUp);
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

			const initialTransform = photo.css('transform');
			const initialMatrix = TransformHelper.parseMatrix(initialTransform);
			const startWidth = photo.outerWidth();
			const startHeight = photo.outerHeight();
			const handleClass = handle.attr('class');

			// 회전 각도 및 중심점 계산
			const angle = Math.atan2(initialMatrix.b, initialMatrix.a);
			const rect = photo[0].getBoundingClientRect();
			const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

			const resizeData = {
				startX: e.clientX,
				startY: e.clientY,
				initialMatrix: initialMatrix,
				startWidth: startWidth,
				startHeight: startHeight,
				aspectRatio: startWidth / startHeight,
				angle: angle,
				center: center,
				// 핸들 위치에 따라 크기 조절 기준점을 설정
				anchor: {
					x: handleClass.includes('handle-w') ? 1 : -1,
					y: handleClass.includes('handle-n') ? 1 : -1
				}
			};

			$(document).on('mousemove.photoResize', (ev) => {
				// 마우스 이동량을 회전된 사진의 좌표계에 맞게 변환
				let dx = ev.clientX - resizeData.startX;
				let dy = ev.clientY - resizeData.startY;
				const cos = Math.cos(-resizeData.angle);
				const sin = Math.sin(-resizeData.angle);
				let rotatedDx = dx * cos - dy * sin;
				let rotatedDy = dx * sin + dy * cos;

				// 핸들 위치에 따라 최종 변화량 결정
				const deltaW = rotatedDx * resizeData.anchor.x;
				const deltaH = rotatedDy * resizeData.anchor.y;

				// 가로/세로 중 더 많이 변한 쪽을 기준으로 비율 유지
				let newWidth, newHeight;
				if (Math.abs(deltaW) > Math.abs(deltaH * resizeData.aspectRatio)) {
					newWidth = resizeData.startWidth + deltaW;
					newHeight = newWidth / resizeData.aspectRatio;
				} else {
					newHeight = resizeData.startHeight + deltaH;
					newWidth = newHeight * resizeData.aspectRatio;
				}

				if (newWidth < this.config.minSize || newHeight < this.config.minSize) return;

				// 새로운 크기 비율(scale) 계산
				const scaleX = newWidth / resizeData.startWidth;
				const scaleY = newHeight / resizeData.startHeight;

				// 기존 행렬에 scale 변환을 곱하여 최종 행렬 계산
				const newMatrix = { ...resizeData.initialMatrix };
				newMatrix.a *= scaleX;
				newMatrix.b *= scaleX;
				newMatrix.c *= scaleY;
				newMatrix.d *= scaleY;

				// 크기 조절로 인한 위치 이동 보정
				const newCenterX = resizeData.center.x + (dx / 2);
				const newCenterY = resizeData.center.y + (dy / 2);
				const finalRect = { left: newCenterX - newWidth / 2, top: newCenterY - newHeight / 2 };

				// 이 부분은 복잡하므로, 일단 크기 조절만 적용
				const finalTransform = TransformHelper.composeMatrix(newMatrix);

				photo.css({
					'transform': finalTransform
				});

				this.updateSelectionUI(photo);
				$('.photo-silhouette').css('transform', finalTransform);
			});

			$(document).on('mouseup.photoResize', () => {
				$(document).off('.photoResize');
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
		const currentTransform = photo.css('transform');
		// transform에서 이동(translate) 픽셀 값을 가져옵니다.
		const translateValues = window.getTranslateValues(currentTransform);

		const currentState = photo.data('relativeState') || {};

		// ✨ 위치를 %가 아닌 픽셀(px)로 저장합니다.
		currentState.position = {
			leftPx: translateValues.x,
			topPx: translateValues.y
		};

		// ✨ 크기도 %가 아닌 픽셀(px)로 저장합니다.
		currentState.size = {
			widthPx: photo.outerWidth(),
			heightPx: photo.outerHeight()
		};

		// ✨ 회전/크기 정보(translate 제외)를 저장합니다.
		currentState.transform = window.getRotationMatrix(photo);
		currentState.transformOrigin = photo.css('transform-origin') || '50% 50%';

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