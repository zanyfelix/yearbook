// ============================================================================
// 📁 js/frame/FrameManager.js - 최종 수정본
// ============================================================================
class FrameManager {
    static frameConfig = {
        baseZIndex: 15,
        textboxZIndex: 10,
        defaultTransform: 'matrix(1, 0, 0, 1, 0, 0)',
        templateWidth: 786 // 편집용 웹 배경의 원본 너비
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
        // ▼▼▼ [수정] editPath가 null이 아닐 때만 src 설정
        if (frameTheme.editPath) {
            frameOverlay.attr('src', frameTheme.editPath);
        }
        
        if (savedState) {
            this.restoreFrameState(frameGroup, savedState, frameType);
        } else {
            this.setupNewFrame(frameGroup, frameTheme, frameType);
        }
        
        this.bindFrameEvents(frameGroup, frameType);
    }
	
	/**
	 * 프레임/요소에 회전 핸들을 추가하고 회전 가능하게 만듭니다.
	 * @param {jQuery} elementGroup - 회전 핸들을 추가할 대상 요소 (.frame-group)
	 */
	static addRotationHandle(elementGroup) {
		// 기존 핸들 제거
		elementGroup.find('.frame-rotate-handle, .frame-rotate-line').remove();

		const handle = $('<div class="frame-rotate-handle"></div>');
		const line = $('<div class="frame-rotate-line"></div>');

		elementGroup.append(handle).append(line);
		this.makeRotatable(elementGroup, handle);
	}

	/**
	 * 요소를 회전 가능하게 만드는 이벤트 핸들러를 바인딩합니다.
	 * @param {jQuery} element - 회전 대상 요소
	 * @param {jQuery} handle - 회전 트리거 핸들
	 */
	static makeRotatable(element, handle) {
		handle.on('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();

			const elementCenter = {
				x: element.offset().left + element.width() / 2,
				y: element.offset().top + element.height() / 2
			};

			const initialAngle = Helpers.getFrameRotation(element);
			const startAngleRad = Math.atan2(e.clientY - elementCenter.y, e.clientX - elementCenter.x);

			$(document).on('mousemove.frameRotate', (ev) => {
				const currentAngleRad = Math.atan2(ev.clientY - elementCenter.y, ev.clientX - elementCenter.x);
				const deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
				const newAngle = initialAngle + deltaAngle;

				element.css('transform', `rotate(${newAngle}deg)`);
			});

			$(document).on('mouseup.frameRotate', () => {
				$(document).off('.frameRotate');

				// 최종 상태 저장
				const currentState = element.data('relativeState') || {};
				currentState.transform = element.css('transform');
				element.data('relativeState', currentState);
			});
		});
	}
    
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
            pointerEvents: frameType.isTextboxFrame ? 'auto' : 'none'
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
        // main.js의 renderPage에서 photo.src를 fullSrc로, filePath를 filePath로 가공한 객체를 전달받음
        // (예: savedState.photo = { src: "/ctx/...", filePath: "/photo/..." })
        
        frameGroup.data('relativeState', savedState);
        window.updateElementPosition(frameGroup);
        
        if (!frameType.isSimple && savedState.photo?.src) {
            this.restorePhoto(frameGroup, savedState.photo);
        }
    }
    
    /**
     * 저장된 사진 정보를 복원하는 함수
     * @param {jQuery} frameGroup - 대상 프레임 그룹
     * @param {object} photoState - 사진 상태 정보 (src, filePath, position, size, transform 포함)
     */
    static restorePhoto(frameGroup, photoState) {
        const uploadedPhoto = frameGroup.find('.uploaded-photo');
        const placeholderLink = frameGroup.find('.place-image-here-link');
        
        // 이미지 로드가 완료되면 위치/크기를 최종 업데이트
        uploadedPhoto.off('load').on('load', function() {
            console.log('프레임 내 사진 로드 완료:', photoState.src);
            placeholderLink.hide();
            // photoState에는 사진 자체의 상대 위치/크기 정보가 들어있음
            window.updateElementPosition($(this), photoState);
        });
        
        // 1. src 속성 설정 (화면에 보여주기 위함)
        // photoState.src는 Base64 또는 전체 웹 경로(/ctx/...)이므로 바로 사용 가능
        uploadedPhoto.attr('src', photoState.src).css('display', 'block');
        
        // ▼▼▼ [핵심 수정] data-file-path 속성 설정 (DB에 저장할 상대 경로) ▼▼▼
        // photoState.filePath가 존재할 경우 (Base64가 아닌 파일 기반 이미지)
        // 이 데이터를 저장해둬야, 이미지를 교체하지 않고 다시 저장할 때 파일 경로가 유지됩니다.
        if (photoState.filePath) {
            uploadedPhoto.data('filePath', photoState.filePath);
        }
        // ▲▲▲ [수정 완료] ▲▲▲
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
            return { width: 150, height: 150 }; // 기본값
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
            photo: null // 새 프레임에는 사진 정보 없음
        };
        
        frameGroup.data('relativeState', relativeState);
    }
    
    static bindFrameEvents(frameGroup, frameType) {
        // EventManager가 각 프레임 타입에 맞는 이벤트를 설정하도록 위임
        if (!frameType.isSimple) {
            EventManager.setupPhotoFrameEvents(frameGroup);
        } else if (frameType.isTextboxFrame) {
            EventManager.setupTextboxFrameEvents(frameGroup);
        } else if (frameType.isElement) {
            EventManager.setupElementEvents(frameGroup);
        }
    }
}