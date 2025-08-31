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
        this.bindRotationEvent(photo, rotateHandle);
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
            width: photo.width(),
            height: photo.height(),
            transform: photo.css('transform')
        });
    }
    
    static removeSelectionUI() {
        $('.photo-selection-box').remove();
    }
    
    // === 드래그 처리 ===
    
    static handleDrag(photo, frameGroup, maskContainer, e) {
        const dragData = {
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: photo.position().left,
            initialTop: photo.position().top,
            containerBounds: this.getContainerBounds(maskContainer, photo),
            rafId: null
        };
        
        const onMouseMove = (ev) => {
            if (dragData.rafId) cancelAnimationFrame(dragData.rafId);
            
            dragData.rafId = requestAnimationFrame(() => {
                const deltaX = ev.clientX - dragData.startX;
                const deltaY = ev.clientY - dragData.startY;
                
                const newPosition = this.calculateConstrainedPosition(
                    dragData.initialLeft + deltaX,
                    dragData.initialTop + deltaY,
                    dragData.containerBounds
                );
                
                photo.css(newPosition);
                $('.photo-silhouette').css(newPosition);
                this.updateSelectionUI(photo);
            });
        };
        
        const onMouseUp = () => {
            if (dragData.rafId) cancelAnimationFrame(dragData.rafId);
            $(document).off('.photoDrag');
            this.savePhotoState(photo, frameGroup);
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
    
    static calculateConstrainedPosition(newLeft, newTop, bounds) {
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
    
    // === 회전 처리 ===
    
    static bindRotationEvent(photo, handle) {
        handle.on('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rotationData = {
                center: this.getPhotoCenter(photo),
                initialAngle: Helpers.getPhotoRotation(photo),
                startAngleRad: null
            };
            
            rotationData.startAngleRad = Math.atan2(
                e.clientY - rotationData.center.y,
                e.clientX - rotationData.center.x
            );
            
            $(document).on('mousemove.photoRotate', (ev) => {
                const currentAngleRad = Math.atan2(
                    ev.clientY - rotationData.center.y,
                    ev.clientX - rotationData.center.x
                );
                
                const deltaAngle = (currentAngleRad - rotationData.startAngleRad) * (180 / Math.PI);
                const newAngle = rotationData.initialAngle + deltaAngle;
                
                this.applyRotation(photo, newAngle);
            });
            
            $(document).on('mouseup.photoRotate', () => {
                $(document).off('.photoRotate');
            });
        });
    }
    
    static getPhotoCenter(photo) {
        return {
            x: photo.offset().left + photo.width() / 2,
            y: photo.offset().top + photo.height() / 2
        };
    }
    
    static applyRotation(photo, angle) {
        const transform = `rotate(${angle}deg)`;
        photo.css('transform', transform);
        $('.photo-silhouette').css('transform', transform);
        this.updateSelectionUI(photo);
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
                this.savePhotoState(photo, photo.closest('.frame-group'));
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
    
    static savePhotoState(photo, frameGroup) {
        const frameW = frameGroup.width();
        const frameH = frameGroup.height();
        const photoPos = photo.position();
        
        const currentState = photo.data('relativeState') || {};
        
        currentState.position = {
            left: (photoPos.left / frameW) * 100,
            top: (photoPos.top / frameH) * 100
        };
        
        if (!currentState.size) {
            currentState.size = {
                width: (photo.width() / frameW) * 100,
                height: (photo.height() / frameH) * 100
            };
        }
        
        currentState.transform = photo.css('transform') || 'none';
        photo.data('relativeState', currentState);
    }
    
    // === 유틸리티 메서드 ===
    
    static rotate(photo, angle) {
        const current = Helpers.getPhotoRotation(photo);
        const newAngle = (current + angle + 360) % 360;
        photo.css('transform', `rotate(${newAngle}deg)`);
    }
}