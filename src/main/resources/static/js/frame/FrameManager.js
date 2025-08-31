// ============================================================================
// 📁 js/frame/FrameManager.js - 최적화 버전
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
        frameOverlay.attr('src', frameTheme.editPath);
        
        if (savedState) {
            this.restoreFrameState(frameGroup, savedState, frameType);
        } else {
            this.setupNewFrame(frameGroup, frameTheme, frameType);
        }
        
        this.bindFrameEvents(frameGroup, frameType);
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
        const frameOverlay = $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
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
        const frameOverlay = this.createFrameOverlay(frameTheme);
        
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
    
    static createFrameOverlay(frameTheme) {
        return $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
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
        
        uploadedPhoto.on('load', function() {
            console.log('프레임 내 사진 로드 완료');
            placeholderLink.hide();
            window.updateElementPosition(uploadedPhoto, photoState);
        });
        
        uploadedPhoto.attr('src', photoState.src).css('display', 'block');
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
        if (!actualBgRect) return;
        
        // 프레임 크기 계산
        const dimensions = this.calculateFrameDimensions(frameTheme, actualBgRect);
        
        // 중앙 위치 계산
        const position = this.calculateCenterPosition(dimensions, actualBgRect);
        
        // CSS 적용
        frameGroup.css({
            left: `${position.left}px`,
            top: `${position.top}px`,
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`
        });
        
        // 상대 상태 저장
        this.saveRelativeState(frameGroup, position, dimensions, actualBgRect);
    }
    
    static calculateFrameDimensions(frameTheme, actualBgRect) {
        const originalWidth = frameTheme.editWidth;
        const originalHeight = frameTheme.editHeight;
        
        if (!originalWidth || !originalHeight) {
            console.error("프레임 원본 크기 데이터 없음:", frameTheme);
            return { width: 100, height: 100 }; // 기본값
        }
        
        const widthRatio = originalWidth / this.frameConfig.templateWidth;
        const frameAspectRatio = originalWidth / originalHeight;
        
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
            transform: this.frameConfig.defaultTransform
        };
        
        frameGroup.data('relativeState', relativeState);
    }
    
    static bindFrameEvents(frameGroup, frameType) {
        if (!frameType.isSimple) {
            const placeholderLink = frameGroup.find('.place-image-here-link');
            const uploadedPhoto = frameGroup.find('.uploaded-photo');
            const maskContainer = frameGroup.find('.mask-container');
            
            EventManager.setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer);
        } else if (frameType.isTextboxFrame) {
            EventManager.setupTextboxFrameEvents(frameGroup);
        } else if (frameType.isElement) {
            EventManager.setupElementEvents(frameGroup);
        }
    }
    
    static addRotationHandle(frameGroup) {
        $('.rotate-handle, .rotate-line').remove();
        
        const handle = $('<div class="rotate-handle"></div>');
        const line = $('<div class="rotate-line"></div>');
        
        frameGroup.append(handle).append(line);
        
        this.bindRotationEvent(frameGroup, handle);
    }
    
    static bindRotationEvent(frameGroup, handle) {
        let isRotating = false;
        let startAngle = 0;
        let startClientX, startClientY;
        
        handle.on('mousedown', (e) => {
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
            
            $(document).on('mousemove.frameRotate', (ev) => {
                if (!isRotating) return;
                
                const currentAngleRad = Math.atan2(ev.clientY - frameCenter.y, ev.clientX - frameCenter.x);
                const startAngleRad = Math.atan2(startClientY - frameCenter.y, startClientX - frameCenter.x);
                
                const deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
                const newAngle = (startAngle + deltaAngle) % 360;
                const normalizedAngle = newAngle < 0 ? newAngle + 360 : newAngle;
                
                frameGroup.css('transform', `rotate(${normalizedAngle}deg)`);
            });
            
            $(document).on('mouseup.frameRotate', () => {
                isRotating = false;
                $(document).off('.frameRotate');
                
                // 회전 상태 저장
                const currentState = frameGroup.data('relativeState') || {};
                currentState.transform = frameGroup.css('transform');
                frameGroup.data('relativeState', currentState);
            });
        });
    }
}