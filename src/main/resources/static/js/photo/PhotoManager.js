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

		// 커서 업데이트 추가
		this.updateResizeCursors(photo);

		setTimeout(() => {
			this.updateSelectionUI(photo);
		}, 0);

		// 이벤트 바인딩 (중복 제거)
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

		// 사진의 현재 transform 가져오기
		const photoTransform = photo.css('transform') || 'none';
		const photoTransformOrigin = photo.css('transform-origin') || '50% 50%';

		// Selection box를 사진과 완전히 동기화
		selectionBox.css({
			left: photo.css('left'),
			top: photo.css('top'),
			width: photo.outerWidth() + 'px',
			height: photo.outerHeight() + 'px',
			transform: photoTransform,
			'transform-origin': photoTransformOrigin
		});

		// 커서도 함께 업데이트
		this.updateResizeCursors(photo);
	}

	static removeSelectionUI() {
		$('.photo-selection-box').remove();
	}

	// === 드래그 처리 ===

	static handleDrag(photo, frameGroup, maskContainer, e) {
		frameGroup.data('isDraggingPhoto', true);

		const initialTransform = photo.css('transform');
		const initialMatrix = TransformHelper.parseMatrix(initialTransform);

		// 프레임의 회전 확인
		const frameTransform = frameGroup.css('transform');
		const frameMatrix = TransformHelper.parseMatrix(frameTransform);
		const frameRotation = Math.atan2(frameMatrix.b, frameMatrix.a);

		const dragData = {
			startX: e.clientX,
			startY: e.clientY,
			initialMatrix: initialMatrix,
			frameRotation: frameRotation  // 프레임 회전 저장
		};

		const $selectionBox = $('.photo-selection-box');
		const $silhouette = $('.photo-silhouette');

		let animationId = null;
		let latestEvent = null;

		const updatePosition = () => {
			if (!latestEvent) return;

			const screenDeltaX = latestEvent.clientX - dragData.startX;
			const screenDeltaY = latestEvent.clientY - dragData.startY;

			// 프레임 회전의 역변환을 적용하여 프레임 로컬 좌표계에서의 이동량 계산
			const cos = Math.cos(-dragData.frameRotation);
			const sin = Math.sin(-dragData.frameRotation);
			const localDeltaX = screenDeltaX * cos - screenDeltaY * sin;
			const localDeltaY = screenDeltaX * sin + screenDeltaY * cos;

			const newMatrix = { ...dragData.initialMatrix };
			newMatrix.tx += localDeltaX;
			newMatrix.ty += localDeltaY;

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

			latestEvent = null;
			animationId = null;
		};

		const onMouseMove = (ev) => {
			ev.preventDefault();
			latestEvent = ev;

			if (!animationId) {
				animationId = requestAnimationFrame(updatePosition);
			}
		};

		const onMouseUp = (ev) => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}

			if (latestEvent) {
				latestEvent = ev;
				updatePosition();
			}

			$(document).off('.photoDrag');
			this.savePhotoState(photo, frameGroup, { isManual: true });
			window.selectionManager.selectPhoto(photo, frameGroup);
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
			const frameGroup = photo.closest('.frame-group');
			frameGroup.data('isResizingPhoto', true);

			// 현재 transform 매트릭스 파싱
			const currentTransform = photo.css('transform');
			const currentMatrix = TransformHelper.parseMatrix(currentTransform);

			// 현재 위치(translate) 및 회전 정보 추출
			const currentTranslateX = currentMatrix.tx;
			const currentTranslateY = currentMatrix.ty;
			const rotation = Math.atan2(currentMatrix.b, currentMatrix.a);

			const startWidth = photo.outerWidth();
			const startHeight = photo.outerHeight();
			const aspectRatio = startWidth / startHeight;

			const resizeData = {
				startX: e.clientX,
				startY: e.clientY,
				startWidth: startWidth,
				startHeight: startHeight,
				currentTranslateX: currentTranslateX,
				currentTranslateY: currentTranslateY,
				currentMatrix: currentMatrix,
				aspectRatio: aspectRatio,
				rotation: rotation,
				handlePosition: this.getHandlePosition(handle)
			};

			let animationId = null;
			let latestMouseEvent = null;
			let isResizing = true;

			const performResize = () => {
				if (!latestMouseEvent || !isResizing) {
					animationId = null;
					return;
				}

				const ev = latestMouseEvent;
				const screenDeltaX = ev.clientX - resizeData.startX;
				const screenDeltaY = ev.clientY - resizeData.startY;

				// 화면 좌표계를 로컬 좌표계로 변환
				const cos = Math.cos(-resizeData.rotation);
				const sin = Math.sin(-resizeData.rotation);
				const deltaX = screenDeltaX * cos - screenDeltaY * sin;
				const deltaY = screenDeltaX * sin + screenDeltaY * cos;

				let newWidth = resizeData.startWidth;
				let newHeight = resizeData.startHeight;
				let newTranslateX = resizeData.currentTranslateX;
				let newTranslateY = resizeData.currentTranslateY;

				// 각 핸들에 따른 크기 및 위치 계산
				switch (resizeData.handlePosition) {
					case 'se': // 우하단
						const deltaSE = Math.max(Math.abs(deltaX), Math.abs(deltaY)) *
							(deltaX > 0 ? 1 : -1);
						newWidth = Math.max(this.config.minSize, resizeData.startWidth + deltaSE);
						newHeight = newWidth / resizeData.aspectRatio;
						// 우하단은 위치 변경 없음
						break;

					case 'sw': // 좌하단
						const deltaSW = Math.max(Math.abs(deltaX), Math.abs(deltaY)) *
							(deltaX < 0 ? 1 : -1);
						newWidth = Math.max(this.config.minSize, resizeData.startWidth + deltaSW);
						newHeight = newWidth / resizeData.aspectRatio;
						// 좌측 이동 필요
						const offsetX_sw = resizeData.startWidth - newWidth;
						newTranslateX = resizeData.currentTranslateX +
							offsetX_sw * Math.cos(resizeData.rotation);
						newTranslateY = resizeData.currentTranslateY +
							offsetX_sw * Math.sin(resizeData.rotation);
						break;

					case 'ne': // 우상단
						const deltaNE = Math.max(Math.abs(deltaX), Math.abs(deltaY)) *
							(deltaY < 0 ? 1 : -1);
						newHeight = Math.max(this.config.minSize / resizeData.aspectRatio,
							resizeData.startHeight + deltaNE);
						newWidth = newHeight * resizeData.aspectRatio;
						// 상단 이동 필요
						const offsetY_ne = resizeData.startHeight - newHeight;
						newTranslateX = resizeData.currentTranslateX -
							offsetY_ne * Math.sin(resizeData.rotation);
						newTranslateY = resizeData.currentTranslateY +
							offsetY_ne * Math.cos(resizeData.rotation);
						break;

					case 'nw': // 좌상단
						const deltaNW = Math.max(Math.abs(deltaX), Math.abs(deltaY)) *
							((deltaX < 0 && deltaY < 0) ? 1 : -1);
						newWidth = Math.max(this.config.minSize, resizeData.startWidth + deltaNW);
						newHeight = newWidth / resizeData.aspectRatio;
						// 좌상단 이동 필요
						const offsetX_nw = resizeData.startWidth - newWidth;
						const offsetY_nw = resizeData.startHeight - newHeight;
						newTranslateX = resizeData.currentTranslateX +
							offsetX_nw * Math.cos(resizeData.rotation) -
							offsetY_nw * Math.sin(resizeData.rotation);
						newTranslateY = resizeData.currentTranslateY +
							offsetX_nw * Math.sin(resizeData.rotation) +
							offsetY_nw * Math.cos(resizeData.rotation);
						break;
				}

				// CSS는 left/top을 0으로, 크기만 변경
				photo.css({
					width: newWidth + 'px',
					height: newHeight + 'px',
					left: '0px',
					top: '0px'
				});

				// 위치와 회전을 transform으로 적용
				const newMatrix = {
					...resizeData.currentMatrix,
					tx: newTranslateX,
					ty: newTranslateY
				};
				photo.css('transform', TransformHelper.composeMatrix(newMatrix));

				// UI 업데이트
				this.updateSelectionUI(photo);

				$('.photo-silhouette').css({
					width: newWidth + 'px',
					height: newHeight + 'px',
					left: '0px',
					top: '0px',
					transform: photo.css('transform')
				});

				latestMouseEvent = null;
				animationId = null;
			};

			$(document).on('mousemove.photoResize', (ev) => {
				if (!isResizing) return;
				latestMouseEvent = ev;

				if (!animationId) {
					animationId = requestAnimationFrame(performResize);
				}
			});

			$(document).on('mouseup.photoResize', (ev) => {
				isResizing = false;

				if (animationId) {
					cancelAnimationFrame(animationId);
					animationId = null;
				}

				if (latestMouseEvent) {
					latestMouseEvent = ev;
					performResize();
				}

				latestMouseEvent = null;
				$(document).off('.photoResize');
				ev.stopPropagation();

				this.savePhotoState(photo, frameGroup, { isManual: true });

				setTimeout(() => {
					window.selectionManager.selectPhoto(photo, frameGroup);
					frameGroup.removeData('isResizingPhoto');
				}, 50);
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
			zIndex: 1,
			pointerEvents: 'auto',  // 명시적으로 auto 추가
			cursor: 'move'  // 드래그 가능 표시
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
		const matrix = TransformHelper.parseMatrix(currentTransform);

		const currentState = photo.data('relativeState') || {};

		// transform matrix에서 위치 추출 (픽셀 단위)
		currentState.position = {
			leftPx: matrix.tx,
			topPx: matrix.ty
		};

		// 실제 크기 저장 (픽셀 단위)
		currentState.size = {
			widthPx: photo.outerWidth(),
			heightPx: photo.outerHeight()
		};

		// 회전만 저장 (translate 제외)
		const rotationMatrix = {
			...matrix,
			tx: 0,
			ty: 0
		};
		currentState.transform = TransformHelper.composeMatrix(rotationMatrix);
		currentState.transformOrigin = photo.css('transform-origin') || '50% 50%';

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);
		if (actualBgRect) {
			currentState.rotation = Math.atan2(matrix.b, matrix.a);
			currentState.translateX = (matrix.tx / actualBgRect.width) * 100;
			currentState.translateY = (matrix.ty / actualBgRect.height) * 100;
		}

		if (typeof options.isManual === 'boolean') {
			currentState.isManuallyAdjusted = options.isManual;
		}

		photo.data('relativeState', currentState);

		console.log('Photo state saved:', {
			position: currentState.position,
			size: currentState.size,
			rotation: currentState.transform
		});
	}

	// === 유틸리티 메서드 ===

	static rotate(photo, angle) {
		const current = Helpers.getPhotoRotation(photo);
		const newAngle = (current + angle + 360) % 360;
		photo.css('transform', `rotate(${newAngle}deg)`);
	}

	static updateResizeCursors(photo) {
		const handles = photo.closest('.frame-group').find('.resize-handle');
		const frameGroup = photo.closest('.frame-group');

		// 사진의 회전
		const photoTransform = photo.css('transform');
		let photoRotation = 0;

		if (photoTransform && photoTransform !== 'none') {
			const matrix = photoTransform.match(/matrix\((.+)\)/);
			if (matrix) {
				const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
				photoRotation = Math.atan2(values[1], values[0]) * (180 / Math.PI);
			}
		}

		// 프레임의 회전도 고려
		const frameTransform = frameGroup.css('transform');
		let frameRotation = 0;

		if (frameTransform && frameTransform !== 'none') {
			const matrix = frameTransform.match(/matrix\((.+)\)/);
			if (matrix) {
				const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
				frameRotation = Math.atan2(values[1], values[0]) * (180 / Math.PI);
			}
		}

		// 전체 회전 = 사진 회전 + 프레임 회전
		let totalRotation = photoRotation + frameRotation;

		// 회전 각도를 0-360 범위로 정규화
		totalRotation = ((totalRotation % 360) + 360) % 360;

		handles.each(function() {
			const $handle = $(this);
			const basePosition = $handle.attr('class').match(/handle-(\w+)/)[1];

			// 커서 매핑 테이블 (45도 단위)
			const cursorMap = {
				'nw': ['nw-resize', 'n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize'],
				'ne': ['ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize', 'n-resize'],
				'se': ['se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize', 'n-resize', 'ne-resize', 'e-resize'],
				'sw': ['sw-resize', 'w-resize', 'nw-resize', 'n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize']
			};

			// 45도 단위로 커서 방향 결정
			const index = Math.round(totalRotation / 45) % 8;
			const newCursor = cursorMap[basePosition][index];

			$handle.css('cursor', newCursor);
		});
	}
}