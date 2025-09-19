// ============================================================================
// 📁 js/frame/FrameManager.js - 최종 수정본
// ============================================================================
class FrameManager {
	static frameConfig = {
		baseZIndex: 15,
		textboxZIndex: 10,
		defaultTransform: 'matrix(1, 0, 0, 1, 0, 0)',
		templateWidth: 786
	};

	static applyFrame(frameTheme, savedState = null) {
		const frameContainer = $('#frame-container');
		const frameType = this.getFrameType(frameTheme);
		const frameGroup = this.createFrameGroup(frameType);

		let frameOverlay;

		if (frameType.isSimple) {
			frameOverlay = this.createSimpleFrame(frameTheme, frameGroup, frameType);
		} else {
			frameOverlay = this.createPhotoFrame(frameTheme, frameGroup);
		}

		frameContainer.append(frameGroup);
		frameGroup.data('frameTheme', frameTheme);

		if (frameTheme.editPath) {
			frameOverlay.attr('src', frameTheme.editPath);
		}

		if (!frameType.isSimple && frameTheme.editMaskPath) {
			MaskBoundsCalculator.getBounds(`${ctx}${frameTheme.editMaskPath}`)
				.then(bounds => {
					// 계산된 영역 정보를 프레임 요소의 데이터로 저장
					frameGroup.data('maskBounds', bounds);
				})
				.catch(err => {
					console.error("마스크 영역 계산 실패:", err);
				});
		}

		if (savedState) {
			this.restoreFrameState(frameGroup, savedState, frameType);
		} else {
			this.setupNewFrame(frameGroup, frameTheme, frameType);
		}

		if (!frameType.isSimple) {
			const placeholder = frameGroup.find('.place-image-here-link');
			const photo = frameGroup.find('.uploaded-photo');
			const mask = frameGroup.find('.mask-container');
			EventManager.setupFrameEvents(frameGroup, placeholder, photo, mask);
		} else if (frameType.isTextboxFrame) {
			EventManager.setupTextboxFrameEvents(frameGroup);
		} else if (frameType.isElement) {
			EventManager.setupElementEvents(frameGroup);
		}
	}

	// ▼▼▼ [핵심 수정] addRotationHandle 함수 내부 클래스 이름을 기존 이름으로 변경 ▼▼▼
	static addRotationHandle(elementGroup) {
		elementGroup.find('.rotate-handle, .rotate-line').remove();

		// 클래스 이름을 'frame-rotate-handle' -> 'rotate-handle'로 변경
		const handle = $('<div class="rotate-handle"></div>');
		// 클래스 이름을 'frame-rotate-line' -> 'rotate-line'으로 변경
		const line = $('<div class="rotate-line"></div>');

		elementGroup.append(handle).append(line);
		EventManager.makeRotatable(elementGroup, handle);
	}
	// ▲▲▲ [수정 완료] ▲▲▲

	static getFrameType(frameTheme) {
		const isTextboxFrame = frameTheme.category === 'textboxframe' ||
			frameTheme.type === 'textbox' ||
			frameTheme.name?.toLowerCase().includes('text');
		const isElement = frameTheme.category === 'element' ||
			frameTheme.type === 'element';

		return {
			isTextboxFrame,
			isElement,
			isSimple: isTextboxFrame || isElement,
			className: isTextboxFrame ? 'textbox-frame' : (isElement ? 'element-frame' : ''),
			zIndex: isTextboxFrame ? this.frameConfig.textboxZIndex : this.frameConfig.baseZIndex
		};
	}

	static createFrameGroup(frameType) {
		const frameGroup = $('<div class="frame-group"></div>').css({
			position: 'absolute',
			cursor: 'move',
			zIndex: frameType.zIndex
		});

		if (frameType.className) {
			frameGroup.addClass(frameType.className);
		}

		return frameGroup;
	}

	static createSimpleFrame(frameTheme, frameGroup, frameType) {
		const frameOverlay = $('<img class="frame-overlay">').css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: frameType.isTextboxFrame ? 5 : 20,
			pointerEvents: 'auto'
		});

		frameGroup.append(frameOverlay);
		return frameOverlay;
	}

	static createPhotoFrame(frameTheme, frameGroup) {
		const maskContainer = this.createMaskContainer();
		const photoContainer = this.createPhotoContainer();
		const placeholderLink = this.createPlaceholderLink();
		const uploadedPhoto = this.createUploadedPhoto();
		const frameOverlay = this.createFrameOverlay();

		photoContainer.append(placeholderLink).append(uploadedPhoto);
		maskContainer.append(photoContainer);
		frameGroup.append(maskContainer).append(frameOverlay);

		if (frameTheme.editMaskPath) {
			this.applyMasking(maskContainer, frameTheme);
		}

		return frameOverlay;
	}

	static createMaskContainer() {
		return $('<div class="mask-container"></div>').css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			zIndex: 16
		});
	}

	static createPhotoContainer() {
		return $('<div class="photo-container"></div>').css({
			position: 'relative',
			width: '100%',
			height: '100%',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: 'black'
		});
	}

	static createPlaceholderLink() {
		return $('<a href="#" class="place-image-here-link">Place Image Here</a>').css({
			color: 'white',
			textDecoration: 'underline',
			fontWeight: 'bold',
			textAlign: 'center',
			display: 'block',
			position: 'relative',
			cursor: 'pointer'
		});
	}

	static createUploadedPhoto() {
		return $('<img class="uploaded-photo">').css({
			display: 'none',
			position: 'absolute',
			cursor: 'move',
			maxWidth: 'none',
			maxHeight: 'none',
			objectFit: 'cover',
			zIndex: 17
		});
	}

	static createFrameOverlay() {
		return $('<img class="frame-overlay">').css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 20,
			pointerEvents: 'none'
		});
	}

	static applyMasking(container, frameTheme) {
		const maskUrl = `${ctx}${frameTheme.editMaskPath}`;
		const img = new Image();
		img.onload = () => {
			container.css({
				'-webkit-mask-image': `url(${maskUrl})`,
				'mask-image': `url(${maskUrl})`,
				'-webkit-mask-size': '100% 100%',
				'mask-size': '100% 100%',
				'mask-repeat': 'no-repeat',
				'mask-position': 'center'
			});
		};
		img.src = maskUrl;
	}

	static restoreFrameState(frameGroup, savedState, frameType) {
		const frameRelativeState = {
			position: savedState.position,
			size: savedState.size,
			rotation: savedState.rotation || 0,
			translateX: savedState.translateX || 0,
			translateY: savedState.translateY || 0,
			transformOriginX: savedState.transformOriginX || 50,
			transformOriginY: savedState.transformOriginY || 50
		};

		frameGroup.data('relativeState', frameRelativeState);

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);

		if (actualBgRect) {
			const frameLeft = (frameRelativeState.position.left / 100) * actualBgRect.width + actualBgRect.left;
			const frameTop = (frameRelativeState.position.top / 100) * actualBgRect.height + actualBgRect.top;
			const frameWidth = (frameRelativeState.size.width / 100) * actualBgRect.width;
			const frameHeight = (frameRelativeState.size.height / 100) * actualBgRect.height;

			// Transform 재구성
			let finalTransform = 'none';
			if (frameRelativeState.rotation !== 0) {
				const cos = Math.cos(frameRelativeState.rotation);
				const sin = Math.sin(frameRelativeState.rotation);
				const translateX = (frameRelativeState.translateX / 100) * actualBgRect.width;
				const translateY = (frameRelativeState.translateY / 100) * actualBgRect.height;

				finalTransform = `matrix(${cos.toFixed(6)}, ${sin.toFixed(6)}, ${(-sin).toFixed(6)}, ${cos.toFixed(6)}, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
			}

			// 중요: transform을 none으로 먼저 설정
			frameGroup.css({
				position: 'absolute',
				left: frameLeft + 'px',
				top: frameTop + 'px',
				width: frameWidth + 'px',
				height: frameHeight + 'px',
				transform: finalTransform,
				'transform-origin': `${frameRelativeState.transformOriginX}% ${frameRelativeState.transformOriginY}%`
			});

			// 사진이 있으면 복원
			if (!frameType.isSimple && savedState.photo?.src) {
				setTimeout(() => {
					this.restorePhoto(frameGroup, savedState.photo);
				}, 100);
			}
		}
	}

	static restorePhoto(frameGroup, photoState) {
		const uploadedPhoto = frameGroup.find('.uploaded-photo');

		// 1. relativeState 데이터 저장 (핵심)
		const photoRelativeState = {
			position: photoState.position || { leftPx: 0, topPx: 0 },  // leftPx, topPx로 수정
			size: photoState.size || { widthPx: 100, heightPx: 100 },  // widthPx, heightPx로 수정
			transform: photoState.transform || 'none',
			transformOrigin: photoState.transformOrigin || '50% 50%',
			// 새로운 필드 추가 (중요!)
			rotation: photoState.rotation,
			translateX: photoState.translateX,
			translateY: photoState.translateY
		};
		uploadedPhoto.data('relativeState', photoRelativeState);

		// 2. 이미지 경로(src)와 파일 경로(filePath) 데이터 설정
		let imageSrc = photoState.src.startsWith('data:') ? photoState.src : `${ctx}${photoState.src}`;
		if (photoState.src && !photoState.src.startsWith('data:')) {
			uploadedPhoto.data('filePath', photoState.src);
		}

		// 3. 이미지 소스 설정
		uploadedPhoto.attr('src', imageSrc);
	}

	static setupNewFrame(frameGroup, frameTheme, frameType) {
		this.setupPosition(frameGroup, frameTheme);

		if (frameType.isElement) {
			window.selectionManager.selectElement(frameGroup);
		} else {
			window.selectionManager.selectFrame(frameGroup);
		}
	}

	static setupPosition(frameGroup, frameTheme) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);
		if (!actualBgRect) {
			console.warn("배경 이미지를 찾을 수 없어 프레임 위치를 설정할 수 없습니다.");
			return;
		}

		const dimensions = this.calculateFrameDimensions(frameTheme, actualBgRect);
		const position = this.calculateCenterPosition(dimensions, actualBgRect);

		frameGroup.css({
			left: `${position.left}px`,
			top: `${position.top}px`,
			width: `${dimensions.width}px`,
			height: `${dimensions.height}px`
		});

		this.saveRelativeState(frameGroup, position, dimensions, actualBgRect);
	}

	static calculateFrameDimensions(frameTheme, actualBgRect) {
		const originalWidth = frameTheme.editWidth;
		const originalHeight = frameTheme.editHeight;

		if (!originalWidth || !originalHeight) {
			return { width: 150, height: 150 };
		}

		const widthRatio = originalWidth / this.frameConfig.templateWidth;
		const frameAspectRatio = originalHeight > 0 ? originalWidth / originalHeight : 1;

		const newWidth = actualBgRect.width * widthRatio;
		const newHeight = newWidth / frameAspectRatio;

		return { width: newWidth, height: newHeight };
	}

	static calculateCenterPosition(dimensions, actualBgRect) {
		return {
			left: actualBgRect.left + (actualBgRect.width - dimensions.width) / 2,
			top: actualBgRect.top + (actualBgRect.height - dimensions.height) / 2
		};
	}

	static saveRelativeState(frameGroup, position, dimensions, actualBgRect) {
		const relativeState = {
			position: {
				left: ((position.left - actualBgRect.left) / actualBgRect.width) * 100,
				top: ((position.top - actualBgRect.top) / actualBgRect.height) * 100
			},
			size: {
				width: (dimensions.width / actualBgRect.width) * 100,
				height: (dimensions.height / actualBgRect.height) * 100
			},
			transform: this.frameConfig.defaultTransform,
			photo: null
		};

		frameGroup.data('relativeState', relativeState);
	}
}