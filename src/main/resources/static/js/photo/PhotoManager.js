// ============================================================================
// 📁 js/photo/PhotoManager.js - 마스크 Bounds 기준 버전
// ============================================================================
class PhotoManager {
	static photoOverlay = null;

	static config = {
		minSize: 50,
		handleSize: 14,
		animationDuration: 300,
		silhouetteOpacity: 0.4
	};

	// ========== 마스크 Bounds 헬퍼 ==========

	/**
	 * 프레임에서 마스크 bounding box의 픽셀 좌표를 가져옵니다.
	 * @returns {Object} { x, y, width, height } 픽셀 단위
	 */
	static getMaskBoundsPixels(frameGroup) {
		const maskContainer = frameGroup.find('.mask-container');
		const maskBounds = frameGroup.data('maskBounds');

		const containerWidth = maskContainer.width();
		const containerHeight = maskContainer.height();

		if (maskBounds) {
			return {
				x: maskBounds.x * containerWidth,
				y: maskBounds.y * containerHeight,
				width: maskBounds.width * containerWidth,
				height: maskBounds.height * containerHeight
			};
		}

		// maskBounds가 없으면 전체 컨테이너 사용
		return {
			x: 0,
			y: 0,
			width: containerWidth,
			height: containerHeight
		};
	}

	// ========== 선택 UI 관리 ==========

	static addSelectionUI(photo, frameGroup) {
		this.removeSelectionUI();

		const selectionBox = this.createSelectionBox();
		const rotateHandle = this.createRotateHandle();
		const rotateLine = this.createRotateLine();
		const resizeHandles = this.createResizeHandles();

		[...resizeHandles, rotateHandle].forEach(handle => {
			handle.on('click', (e) => e.stopPropagation());
		});

		selectionBox.append(rotateHandle, rotateLine, ...resizeHandles);
		frameGroup.append(selectionBox);

		this.updateResizeCursors(photo);

		setTimeout(() => {
			this.updateSelectionUI(photo);
		}, 0);

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

		const photoTransform = photo.css('transform') || 'none';
		const photoTransformOrigin = photo.css('transform-origin') || '50% 50%';

		selectionBox.css({
			left: photo.css('left'),
			top: photo.css('top'),
			width: photo.outerWidth() + 'px',
			height: photo.outerHeight() + 'px',
			transform: photoTransform,
			'transform-origin': photoTransformOrigin
		});

		this.updateResizeCursors(photo);
	}

	static removeSelectionUI() {
		$('.photo-selection-box').remove();
	}

	// ========== 드래그 처리 (마스크 Bounds 기준) ==========

	static handleDrag(photo, frameGroup, maskContainer, e) {
		frameGroup.data('isDraggingPhoto', true);

		const initialTransform = photo.css('transform');
		const initialMatrix = TransformHelper.parseMatrix(initialTransform);

		// 프레임의 회전 확인
		const frameTransform = frameGroup.css('transform');
		const frameMatrix = TransformHelper.parseMatrix(frameTransform);
		const frameRotation = Math.atan2(frameMatrix.b, frameMatrix.a);

		// ✅ 마스크 bounds 가져오기
		const maskBoundsPixels = this.getMaskBoundsPixels(frameGroup);

		const dragData = {
			startX: e.clientX,
			startY: e.clientY,
			initialMatrix: initialMatrix,
			frameRotation: frameRotation,
			maskBounds: maskBoundsPixels  // 마스크 bounds 저장
		};

		const $selectionBox = $('.photo-selection-box');
		const $silhouette = $('.photo-silhouette');

		let animationId = null;
		let latestEvent = null;

		const updatePosition = () => {
			if (!latestEvent) return;

			const screenDeltaX = latestEvent.clientX - dragData.startX;
			const screenDeltaY = latestEvent.clientY - dragData.startY;

			// 프레임 회전의 역변환 적용
			const cos = Math.cos(-dragData.frameRotation);
			const sin = Math.sin(-dragData.frameRotation);
			const localDeltaX = screenDeltaX * cos - screenDeltaY * sin;
			const localDeltaY = screenDeltaX * sin + screenDeltaY * cos;

			let newTx = dragData.initialMatrix.tx + localDeltaX;
			let newTy = dragData.initialMatrix.ty + localDeltaY;

			// ✅ 마스크 영역과 사진이 항상 겹치도록 제한
			const mb = dragData.maskBounds;
			const pw = photo.outerWidth();
			const ph = photo.outerHeight();

			// 사진이 마스크를 완전히 덮어야 함 (cover 모드)
			if (pw >= mb.width) {
				// 사진이 마스크보다 클 때: 사진이 마스크를 벗어나지 않도록
				const minTx = mb.x + mb.width - pw;  // 사진 오른쪽 = 마스크 오른쪽
				const maxTx = mb.x;                   // 사진 왼쪽 = 마스크 왼쪽
				newTx = Math.max(minTx, Math.min(maxTx, newTx));
			}

			if (ph >= mb.height) {
				const minTy = mb.y + mb.height - ph;
				const maxTy = mb.y;
				newTy = Math.max(minTy, Math.min(maxTy, newTy));
			}

			const newMatrix = { ...dragData.initialMatrix };
			newMatrix.tx = newTx;
			newMatrix.ty = newTy;

			const newTransform = TransformHelper.composeMatrix(newMatrix);

			photo.css('transform', newTransform);
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

	/**
	 * 마스크 bounds의 네 꼭짓점 좌표를 반환 (교차 검사용)
	 */
	static getMaskBoundsCorners(frameGroup) {
		const maskBounds = this.getMaskBoundsPixels(frameGroup);

		return [
			{ x: maskBounds.x, y: maskBounds.y },
			{ x: maskBounds.x + maskBounds.width, y: maskBounds.y },
			{ x: maskBounds.x + maskBounds.width, y: maskBounds.y + maskBounds.height },
			{ x: maskBounds.x, y: maskBounds.y + maskBounds.height }
		];
	}

	// ========== 크기 조절 처리 ==========

	static bindResizeEvent(photo, handle) {
		handle.on('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const frameGroup = photo.closest('.frame-group');
			frameGroup.data('isResizingPhoto', true);

			const currentTransform = photo.css('transform');
			const currentMatrix = TransformHelper.parseMatrix(currentTransform);
			const photoRotation = Math.atan2(currentMatrix.b, currentMatrix.a);

			const frameTransform = frameGroup.css('transform');
			const frameMatrix = TransformHelper.parseMatrix(frameTransform);
			const frameRotation = Math.atan2(frameMatrix.b, frameMatrix.a);
			const totalRotation = photoRotation + frameRotation;

			const startWidth = photo.outerWidth();
			const startHeight = photo.outerHeight();
			const aspectRatio = startWidth / startHeight;

			// ✅ 마스크 bounds 가져오기
			const maskBoundsPixels = this.getMaskBoundsPixels(frameGroup);

			const resizeData = {
				startX: e.clientX,
				startY: e.clientY,
				startWidth: startWidth,
				startHeight: startHeight,
				currentTranslateX: currentMatrix.tx,
				currentTranslateY: currentMatrix.ty,
				currentMatrix: currentMatrix,
				aspectRatio: aspectRatio,
				rotation: photoRotation,
				totalRotation: totalRotation,
				handlePosition: this.getHandlePosition(handle),
				maskBounds: maskBoundsPixels  // 마스크 bounds 저장
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

				// 전체 회전(프레임+사진)의 역변환 적용
				const cos = Math.cos(-resizeData.totalRotation);
				const sin = Math.sin(-resizeData.totalRotation);
				const localDeltaX = screenDeltaX * cos - screenDeltaY * sin;
				const localDeltaY = screenDeltaX * sin + screenDeltaY * cos;

				let newWidth, newHeight, translateAdjustX = 0, translateAdjustY = 0;
				const pos = resizeData.handlePosition;

				// 핸들 위치에 따른 크기 조절
				if (pos === 'se') {
					newWidth = Math.max(this.config.minSize, resizeData.startWidth + localDeltaX);
				} else if (pos === 'sw') {
					newWidth = Math.max(this.config.minSize, resizeData.startWidth - localDeltaX);
				} else if (pos === 'ne') {
					newWidth = Math.max(this.config.minSize, resizeData.startWidth + localDeltaX);
				} else if (pos === 'nw') {
					newWidth = Math.max(this.config.minSize, resizeData.startWidth - localDeltaX);
				}

				newHeight = newWidth / resizeData.aspectRatio;

				// 위치 보정 계산
				const widthDiff = newWidth - resizeData.startWidth;
				const heightDiff = newHeight - resizeData.startHeight;

				const cosR = Math.cos(resizeData.rotation);
				const sinR = Math.sin(resizeData.rotation);

				if (pos === 'nw') {
					translateAdjustX = -widthDiff * cosR + heightDiff * sinR;
					translateAdjustY = -widthDiff * sinR - heightDiff * cosR;
				} else if (pos === 'ne') {
					translateAdjustX = heightDiff * sinR;
					translateAdjustY = -heightDiff * cosR;
				} else if (pos === 'sw') {
					translateAdjustX = -widthDiff * cosR;
					translateAdjustY = -widthDiff * sinR;
				}

				const newTranslateX = resizeData.currentTranslateX + translateAdjustX;
				const newTranslateY = resizeData.currentTranslateY + translateAdjustY;

				// 새 transform 적용
				const newMatrix = {
					a: resizeData.currentMatrix.a,
					b: resizeData.currentMatrix.b,
					c: resizeData.currentMatrix.c,
					d: resizeData.currentMatrix.d,
					tx: newTranslateX,
					ty: newTranslateY
				};

				photo.css({
					width: newWidth + 'px',
					height: newHeight + 'px',
					transform: TransformHelper.composeMatrix(newMatrix)
				});

				this.updateSelectionUI(photo);
				this.updateSilhouetteSize(photo);

				latestMouseEvent = null;
				animationId = null;
			};

			$(document).on('mousemove.photoResize', (ev) => {
				ev.preventDefault();
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

	// ========== 오버레이 관리 ==========

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
			pointerEvents: 'auto',
			cursor: 'move'
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

	// ========== 상태 저장 (마스크 Bounds 기준) ==========

	static savePhotoState(photo, frameGroup, options = {}) {
		const currentTransform = photo.css('transform');
		const matrix = TransformHelper.parseMatrix(currentTransform);

		const currentState = photo.data('relativeState') || {};

		// ✅ 마스크 bounds 픽셀 좌표 가져오기
		const maskBounds = this.getMaskBoundsPixels(frameGroup);

		// 사진의 실제 크기
		const photoWidth = photo.outerWidth();
		const photoHeight = photo.outerHeight();

		// ✅ 마스크 bounds 기준 백분율로 저장
		// translate 값에서 마스크 오프셋을 빼서 마스크 내부 기준으로 변환
		const relativeTranslateX = matrix.tx - maskBounds.x;
		const relativeTranslateY = matrix.ty - maskBounds.y;

		currentState.translateX = (relativeTranslateX / maskBounds.width) * 100;
		currentState.translateY = (relativeTranslateY / maskBounds.height) * 100;

		// 크기도 마스크 bounds 기준 백분율로 저장
		currentState.sizePercent = {
			width: (photoWidth / maskBounds.width) * 100,
			height: (photoHeight / maskBounds.height) * 100
		};

		// 회전 정보 저장 (라디안)
		currentState.rotation = Math.atan2(matrix.b, matrix.a);

		// transform (회전만, translate 제외)
		const rotationMatrix = { ...matrix, tx: 0, ty: 0 };
		currentState.transform = TransformHelper.composeMatrix(rotationMatrix);
		currentState.transformOrigin = photo.css('transform-origin') || '50% 50%';

		// 기존 픽셀 값도 보존 (하위 호환성)
		currentState.position = {
			leftPx: matrix.tx,
			topPx: matrix.ty
		};
		currentState.size = {
			widthPx: photoWidth,
			heightPx: photoHeight
		};

		if (typeof options.isManual === 'boolean') {
			currentState.isManuallyAdjusted = options.isManual;
		}

		// ✅ 마스크 bounds 기준임을 표시
		currentState.isMaskBoundsRelative = true;

		photo.data('relativeState', currentState);

		// percentState도 업데이트
		photo.data('percentState', {
			widthPercent: currentState.sizePercent.width,
			heightPercent: currentState.sizePercent.height,
			translateXPercent: currentState.translateX,
			translateYPercent: currentState.translateY,
			rotation: currentState.rotation
		});

		console.log('Photo state saved (mask-bounds-relative):', {
			maskBounds: maskBounds,
			photoSize: { width: photoWidth, height: photoHeight },
			sizePercent: currentState.sizePercent,
			translatePercent: { x: currentState.translateX, y: currentState.translateY },
			rotation: currentState.rotation
		});
	}

	// ========== 유틸리티 메서드 ==========

	static rotate(photo, angle) {
		const current = Helpers.getPhotoRotation(photo);
		const newAngle = (current + angle + 360) % 360;
		photo.css('transform', `rotate(${newAngle}deg)`);
	}

	static updateResizeCursors(photo) {
		const handles = photo.closest('.frame-group').find('.resize-handle');
		const frameGroup = photo.closest('.frame-group');

		const photoTransform = photo.css('transform');
		let photoRotation = 0;

		if (photoTransform && photoTransform !== 'none') {
			const matrix = photoTransform.match(/matrix\((.+)\)/);
			if (matrix) {
				const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
				photoRotation = Math.atan2(values[1], values[0]) * (180 / Math.PI);
			}
		}

		const frameTransform = frameGroup.css('transform');
		let frameRotation = 0;

		if (frameTransform && frameTransform !== 'none') {
			const matrix = frameTransform.match(/matrix\((.+)\)/);
			if (matrix) {
				const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
				frameRotation = Math.atan2(values[1], values[0]) * (180 / Math.PI);
			}
		}

		let totalRotation = photoRotation + frameRotation;
		totalRotation = ((totalRotation % 360) + 360) % 360;

		handles.each(function() {
			const $handle = $(this);
			const basePosition = $handle.attr('class').match(/handle-(\w+)/)[1];

			const cursorMap = {
				'nw': ['nw-resize', 'n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize'],
				'ne': ['ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize', 'n-resize'],
				'se': ['se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize', 'n-resize', 'ne-resize', 'e-resize'],
				'sw': ['sw-resize', 'w-resize', 'nw-resize', 'n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize']
			};

			const index = Math.round(totalRotation / 45) % 8;
			const newCursor = cursorMap[basePosition][index];

			$handle.css('cursor', newCursor);
		});
	}

	static updateSilhouetteSize(photo) {
		const $silhouette = $('.photo-silhouette');
		if ($silhouette.length) {
			$silhouette.css({
				width: photo.css('width'),
				height: photo.css('height'),
				transform: photo.css('transform')
			});
		}
	}
}