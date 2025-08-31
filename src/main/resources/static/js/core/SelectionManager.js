// ============================================================================
// 📁 js/core/SelectionManager.js - 최종 수정본
// ============================================================================
class SelectionManager {
    constructor() {
        this.selectedMode = null;
        this.currentFrame = null;
        this.currentPhoto = null;
        this.currentElement = null;
        this.currentTextBox = null;
    }

    // --- Public Selection Methods ---

    selectFrame(frameGroup) {
        if (this.currentFrame === frameGroup) return;
        this.clearSelection();
        
        this.selectedMode = 'frame';
        this.currentFrame = frameGroup;
        
        frameGroup.addClass('selected-frame');
        FrameManager.addRotationHandle(frameGroup);
        UIManager.showFrameTooltip(frameGroup);
    }

    selectPhoto(photo, frameGroup) {
        if (this.currentPhoto === photo) return;
        this.clearSelection();
        
        this.selectedMode = 'photo';
        this.currentFrame = frameGroup;
        this.currentPhoto = photo;
        
        photo.addClass('selected-photo');
        
        PhotoManager.addSelectionUI(photo, frameGroup);
        UIManager.showPhotoTooltip(photo, frameGroup);
        PhotoManager.showOverlay(photo, frameGroup);
    }
    
    selectTextBox(textBox) {
        if (this.currentTextBox === textBox) return;
        this.clearSelection();
        
        this.selectedMode = 'text';
        this.currentTextBox = textBox;

        textBox.addClass('selected');
        
        this.addTextRotationHandle(textBox);
        UIManager.showTextTooltip(textBox);
        
        textBox.on('resize.selection', () => {
            if (textBox.hasClass('selected')) {
                this.addTextRotationHandle(textBox);
            }
        });
    }
    
    selectElement(elementGroup) {
        if (this.currentElement === elementGroup) return;
        this.clearSelection();

        this.selectedMode = 'element';
        this.currentElement = elementGroup;
        this.currentFrame = elementGroup;

        elementGroup.addClass('selected-frame selected-element');
        FrameManager.addRotationHandle(elementGroup);
        UIManager.showElementTooltip(elementGroup);
    }
    
    addTextRotationHandle(textBox) {
        textBox.find('.text-rotate-handle, .text-rotate-line').remove();
        
        const handle = $('<div class="text-rotate-handle"></div>');
        const line = $('<div class="text-rotate-line"></div>');
        
        textBox.append(handle).append(line);
    }
    
    clearSelection() {
        if (this.currentFrame) {
            this.currentFrame.removeClass('selected-frame selected-element');
            this.currentFrame.find('.frame-rotate-handle, .frame-rotate-line').remove();
        }
        
        if (this.currentPhoto) {
            this.currentPhoto.removeClass('selected-photo');
            PhotoManager.removeSelectionUI();
            PhotoManager.hideOverlay();
        }
        
        if (this.currentTextBox) {
            this.currentTextBox.removeClass('selected editing');
            this.currentTextBox.find('.text-rotate-handle, .text-rotate-line').remove();
        }

        UIManager.hideAllToolbars();
        
        this.selectedMode = null;
        this.currentFrame = null;
        this.currentPhoto = null;
        this.currentElement = null;
        this.currentTextBox = null;
    }
    
    // ▼▼▼ [핵심 추가] 누락되었던 applySafeLineConstraints 함수 ▼▼▼
    /**
     * 요소의 새로운 위치가 안전선(Safe Line)을 벗어나지 않도록 보정합니다.
     * @param {number} newLeft - 계산된 새로운 left 픽셀 위치
     * @param {number} newTop - 계산된 새로운 top 픽셀 위치
     * @param {jQuery} element - 위치를 보정할 대상 요소
     * @returns {{left: number, top: number}} - 보정된 픽셀 위치
     */
    applySafeLineConstraints(newLeft, newTop, element) {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (!actualBgRect) {
            console.warn("배경 이미지를 찾을 수 없어 안전선 제약을 적용할 수 없습니다.");
            return { left: newLeft, top: newTop };
        }
        
        const elementWidth = element.outerWidth();
        const elementHeight = element.outerHeight();
        
        const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
        const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;
        
        const minLeft = actualBgRect.left + safeMarginX;
        const maxLeft = actualBgRect.left + actualBgRect.width - safeMarginX - elementWidth;
        const minTop = actualBgRect.top + safeMarginY;
        const maxTop = actualBgRect.top + actualBgRect.height - safeMarginY - elementHeight;
        
        // 계산된 위치가 최소/최대 범위를 벗어나지 않도록 보정
        const constrainedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const constrainedTop = Math.max(minTop, Math.min(newTop, maxTop));
        
        return {
            left: constrainedLeft,
            top: constrainedTop
        };
    }
    // ▲▲▲ [핵심 추가] 종료 ▲▲▲
}