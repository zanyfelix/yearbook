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
			transformOriginY: savedState.transformOriginY || 50,
			// ✅ 정렬 플래그 복원
			alignment: savedState.alignment || { horizontal: null, vertical: null },
			// ✅ 정렬 기준 좌표 복원 (재정렬 시 위치 고정용)
			alignmentBounds: savedState.alignmentBounds || undefined
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
	    const placeholderLink = frameGroup.find('.place-image-here-link');

	    console.log('Restoring photo with state:', photoState);

	    // 1. relativeState 데이터 저장
	    const photoRelativeState = {
	        position: photoState.position || { leftPx: 0, topPx: 0 },
	        size: photoState.size || { widthPx: 100, heightPx: 100 },
	        transform: photoState.transform || 'none',
	        transformOrigin: photoState.transformOrigin || '50% 50%',
	        rotation: photoState.rotation,
	        translateX: photoState.translateX,
	        translateY: photoState.translateY,
	        sizePercent: photoState.sizePercent,
	        isFrameRelative: photoState.isFrameRelative  // 플래그 보존
	    };
	    uploadedPhoto.data('relativeState', photoRelativeState);

	    // 2. 이미지 경로 설정
	    let imageSrc = photoState.src.startsWith('data:') ? photoState.src : `${ctx}${photoState.src}`;
	    if (photoState.src && !photoState.src.startsWith('data:')) {
	        uploadedPhoto.data('filePath', photoState.src);
	    }

	    // 3. CSS 적용 함수
	    const applyPhotoCSS = () => {
	        // ✨ 핵심: 프레임 크기를 기준으로 계산
	        const frameWidth = frameGroup.width();
	        const frameHeight = frameGroup.height();

			if (frameWidth <= 0 || frameHeight <= 0) {
				console.log('Frame size invalid, retrying...', { frameWidth, frameHeight });
				setTimeout(applyPhotoCSS, 100);
				return;
			}

	        let pixelWidth, pixelHeight, translateX, translateY;

	        // ✨ 프레임 기준 백분율 데이터가 있는 경우 (새 형식)
	        if (photoState.sizePercent && (photoState.isFrameRelative || photoState.translateX !== undefined)) {
				// 마스크 bounds 기준 백분율 -> 픽셀 (저장 시와 동일한 기준)
				const maskBounds = PhotoManager.getMaskBoundsPixels(frameGroup);
				pixelWidth = (photoState.sizePercent.width / 100) * maskBounds.width;
				pixelHeight = (photoState.sizePercent.height / 100) * maskBounds.height;
				translateX = (photoState.translateX / 100) * maskBounds.width + maskBounds.x;
				translateY = (photoState.translateY / 100) * maskBounds.height + maskBounds.y;

	            console.log('Using frame-relative calculation:', {
	                frameSize: { width: frameWidth, height: frameHeight },
	                sizePercent: photoState.sizePercent,
	                translatePercent: { x: photoState.translateX, y: photoState.translateY },
	                calculatedSize: { width: pixelWidth, height: pixelHeight },
	                calculatedTranslate: { x: translateX, y: translateY }
	            });
	        }
	        // 기존 형식 (배경 이미지 기준 백분율) - 하위 호환성
	        else if (photoState.sizePercent) {
	            const bg = $('#page-preview-img');
	            const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);
	            
	            if (actualBgRect) {
	                // 배경 기준 -> 픽셀 -> 프레임 기준으로 변환
	                const bgPixelWidth = (photoState.sizePercent.width / 100) * actualBgRect.width;
	                const bgPixelHeight = (photoState.sizePercent.height / 100) * actualBgRect.height;
	                
	                // 프레임 크기에 맞게 재계산
	                pixelWidth = bgPixelWidth;
	                pixelHeight = bgPixelHeight;
	                translateX = photoState.translateX ? (photoState.translateX / 100) * actualBgRect.width : 0;
	                translateY = photoState.translateY ? (photoState.translateY / 100) * actualBgRect.height : 0;
	            } else {
	                // 기본값
	                pixelWidth = frameWidth;
	                pixelHeight = frameHeight;
	                translateX = 0;
	                translateY = 0;
	            }
	            
	            console.log('Using legacy (background-relative) calculation');
	        }
	        // 데이터 없음 - 이미지 비율 유지하면서 프레임 커버
	        else {
	            const img = uploadedPhoto[0];
	            if (img.naturalWidth && img.naturalHeight) {
	                const imgRatio = img.naturalWidth / img.naturalHeight;
	                const frameRatio = frameWidth / frameHeight;

	                if (frameRatio > imgRatio) {
	                    pixelWidth = frameWidth;
	                    pixelHeight = frameWidth / imgRatio;
	                } else {
	                    pixelHeight = frameHeight;
	                    pixelWidth = frameHeight * imgRatio;
	                }
	                // 중앙 정렬
	                translateX = (frameWidth - pixelWidth) / 2;
	                translateY = (frameHeight - pixelHeight) / 2;
	            } else {
	                pixelWidth = frameWidth;
	                pixelHeight = frameHeight;
	                translateX = 0;
	                translateY = 0;
	            }
	            
	            console.log('Using default (cover frame) calculation');
	        }

	        // transform 구성 (회전 + translate)
	        const rotation = photoState.rotation || 0;
	        let finalTransform;

	        if (rotation !== 0) {
	            const cos = Math.cos(rotation);
	            const sin = Math.sin(rotation);
	            finalTransform = `matrix(${cos.toFixed(6)}, ${sin.toFixed(6)}, ${(-sin).toFixed(6)}, ${cos.toFixed(6)}, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
	        } else {
	            finalTransform = `matrix(1, 0, 0, 1, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
	        }

	        // CSS 적용
	        uploadedPhoto.css({
	            display: 'block',
				visibility: 'visible',
	            position: 'absolute',
	            left: '0px',
	            top: '0px',
	            width: pixelWidth + 'px',
	            height: pixelHeight + 'px',
	            transform: finalTransform,
	            transformOrigin: photoState.transformOrigin || '50% 50%'
	        });

	        // placeholder 숨기기
	        placeholderLink.hide();

	        console.log('Photo CSS applied:', {
	            size: { width: pixelWidth, height: pixelHeight },
	            translate: { x: translateX, y: translateY },
	            rotation: rotation
	        });
	        
	        // ✅ CSS 적용 완료 후 renderPage의 카운팅을 위한 이벤트 트리거
	        uploadedPhoto.trigger('load.renderCount');
	    };

	    // 4. 이미지 로드 이벤트 처리
	    uploadedPhoto.off('load.restore error.restore');
	    uploadedPhoto.on('load.restore', function() {
	        applyPhotoCSS();
	        uploadedPhoto.off('load.restore error.restore');
	    });
	    uploadedPhoto.on('error.restore', function() {
	        console.error('Photo load error:', imageSrc);
	        placeholderLink.show();
	        uploadedPhoto.hide();
	        uploadedPhoto.off('load.restore error.restore');
	        // ✅ 에러 시에도 카운팅을 위한 이벤트 트리거
	        uploadedPhoto.trigger('error.renderCount');
	    });

	    // 5. 이미지 소스 설정
	    uploadedPhoto.attr('src', imageSrc);

	    // 6. 이미 로드된 이미지 처리 (캐시)
	    const img = uploadedPhoto[0];
	    if (img.complete && img.naturalWidth > 0) {
	        applyPhotoCSS();
	        uploadedPhoto.off('load.restore error.restore');
	    }
	}
	
	static normalizePhotoState(photoState) {
	    // 새 형식 (프레임 기준 백분율)인 경우
	    if (photoState.position?.translateXPercent !== undefined) {
	        return {
	            position: {
	                translateXPercent: photoState.position.translateXPercent,
	                translateYPercent: photoState.position.translateYPercent
	            },
	            size: {
	                widthPercent: photoState.size.widthPercent,
	                heightPercent: photoState.size.heightPercent
	            },
	            rotation: photoState.rotation || 0,
	            transform: photoState.transform || 'none',
	            transformOrigin: photoState.transformOrigin || '50% 50%',
	            isManuallyAdjusted: photoState.isManuallyAdjusted || false
	        };
	    }
	    
	    // 기존 형식 (배경 이미지 기준 백분율 또는 픽셀)인 경우 변환
	    // sizePercent와 translateX/translateY가 있으면 배경 기준 백분율
	    if (photoState.sizePercent || photoState.translateX !== undefined) {
	        console.log('Converting legacy photo state format to frame-relative format');
	        
	        // 배경 이미지 기준 -> 프레임 기준으로 대략 변환
	        // 정확한 변환은 프레임과 배경의 상대 크기를 알아야 하지만,
	        // 대부분의 경우 프레임이 배경보다 작으므로 비율을 조정
	        return {
	            position: {
	                translateXPercent: photoState.translateX || 0,
	                translateYPercent: photoState.translateY || 0
	            },
	            size: {
	                // sizePercent가 있으면 사용, 없으면 기본값
	                widthPercent: photoState.sizePercent?.width || 100,
	                heightPercent: photoState.sizePercent?.height || 100
	            },
	            rotation: photoState.rotation || 0,
	            transform: photoState.transform || 'none',
	            transformOrigin: photoState.transformOrigin || '50% 50%',
	            isManuallyAdjusted: photoState.isManuallyAdjusted || false
	        };
	    }
	    
	    // 픽셀 값만 있는 구형식인 경우 (leftPx, topPx, widthPx, heightPx)
	    if (photoState.position?.leftPx !== undefined || photoState.size?.widthPx !== undefined) {
	        console.log('Converting pixel-based photo state to frame-relative format');
	        
	        // 픽셀 값은 현재 프레임 크기를 모르므로 기본값 사용
	        // 실제 적용 시 applyPhotoPosition에서 조정됨
	        return {
	            position: {
	                translateXPercent: 0,
	                translateYPercent: 0
	            },
	            size: {
	                widthPercent: 100,
	                heightPercent: 100
	            },
	            rotation: photoState.rotation || 0,
	            transform: photoState.transform || 'none',
	            transformOrigin: photoState.transformOrigin || '50% 50%',
	            isManuallyAdjusted: false,
	            // 원본 픽셀 값 보존 (fallback용)
	            _legacyPixels: {
	                leftPx: photoState.position?.leftPx,
	                topPx: photoState.position?.topPx,
	                widthPx: photoState.size?.widthPx,
	                heightPx: photoState.size?.heightPx
	            }
	        };
	    }
	    
	    // 알 수 없는 형식 - 기본값 반환
	    console.warn('Unknown photo state format, using defaults');
	    return {
	        position: { translateXPercent: 0, translateYPercent: 0 },
	        size: { widthPercent: 100, heightPercent: 100 },
	        rotation: 0,
	        transform: 'none',
	        transformOrigin: '50% 50%',
	        isManuallyAdjusted: false
	    };
	}

	/**
	 * ✨ 사진 위치/크기를 프레임 기준으로 적용
	 */
	static applyPhotoPosition(frameGroup, photo, relativeState) {
		// 마스크 bounds 픽셀 좌표 가져오기
		const maskBounds = PhotoManager.getMaskBoundsPixels(frameGroup);

	    let pixelWidth, pixelHeight, translateX, translateY;

		// 마스크 bounds 기준 백분율에서 픽셀로 변환
		if (relativeState.isMaskBoundsRelative || relativeState.sizePercent) {
			// 크기 계산 (마스크 bounds 기준)
			pixelWidth = (relativeState.sizePercent?.width || relativeState.size?.widthPercent || 100) / 100 * maskBounds.width;
			pixelHeight = (relativeState.sizePercent?.height || relativeState.size?.heightPercent || 100) / 100 * maskBounds.height;

			// 위치 계산 (마스크 bounds 내부 기준 → 절대 좌표로 변환)
			const relTranslateX = (relativeState.translateX ?? relativeState.position?.translateXPercent ?? 0) / 100 * maskBounds.width;
			const relTranslateY = (relativeState.translateY ?? relativeState.position?.translateYPercent ?? 0) / 100 * maskBounds.height;

			// 마스크 오프셋 추가하여 실제 좌표 계산
			translateX = relTranslateX + maskBounds.x;
			translateY = relTranslateY + maskBounds.y;
		} else {
			// 레거시 픽셀 값 처리
			const frameWidth = frameGroup.width();
			const frameHeight = frameGroup.height();

			pixelWidth = relativeState.size?.widthPx || frameWidth;
			pixelHeight = relativeState.size?.heightPx || frameHeight;
			translateX = relativeState.position?.leftPx || 0;
			translateY = relativeState.position?.topPx || 0;
		}

		// transform 재구성 (회전 + translate)
		let finalTransform;
		const rotation = relativeState.rotation || 0;

		if (rotation !== 0) {
			const cos = Math.cos(rotation);
			const sin = Math.sin(rotation);
			finalTransform = `matrix(${cos.toFixed(6)}, ${sin.toFixed(6)}, ${(-sin).toFixed(6)}, ${cos.toFixed(6)}, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
		} else {
			finalTransform = `matrix(1, 0, 0, 1, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
		}

		// CSS 적용
		photo.css({
			display: 'block',
			position: 'absolute',
			left: '0px',
			top: '0px',
			width: pixelWidth + 'px',
			height: pixelHeight + 'px',
			transform: finalTransform,
			transformOrigin: relativeState.transformOrigin || '50% 50%'
		});

		console.log('Photo position applied (mask-bounds):', {
			maskBounds: maskBounds,
			photoSize: { width: pixelWidth, height: pixelHeight },
			translate: { x: translateX, y: translateY },
			rotation: rotation
		});
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