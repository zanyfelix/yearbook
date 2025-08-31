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
        // ... (이하 다른 부분은 모두 동일) ...
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
        frameGroup.data('relativeState', savedState);
        window.updateElementPosition(frameGroup);
        
        if (!frameType.isSimple && savedState.photo?.src) {
            this.restorePhoto(frameGroup, savedState.photo);
        }
    }
    
    static restorePhoto(frameGroup, photoState) {
        const uploadedPhoto = frameGroup.find('.uploaded-photo');
        const placeholderLink = frameGroup.find('.place-image-here-link');
        
        uploadedPhoto.off('load').on('load', function() {
            placeholderLink.hide();
            window.updateElementPosition($(this), photoState);
        });
        
        uploadedPhoto.attr('src', photoState.src).css('display', 'block');
        
        if (photoState.filePath) {
            uploadedPhoto.data('filePath', photoState.filePath);
        }
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