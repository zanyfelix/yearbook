// ============================================================================
// 📁 js/events/EventManager.js - 최적화 버전
// ============================================================================
class EventManager {
    // 공통 드래그 설정
    static dragConfig = {
        minMoveDistance: 5,
        tooltipUpdateInterval: 100
    };
    
    // 프레임 이벤트 설정
    static setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer) {
        this.clearEvents(frameGroup, placeholderLink, uploadedPhoto);
        
        // Placeholder 클릭 이벤트
        placeholderLink.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.triggerImageUpload(frameGroup, uploadedPhoto, placeholderLink, maskContainer);
        });
        
        // 프레임 클릭 이벤트
        frameGroup.on('click', (e) => {
            if (this.isPlaceholderClick(e)) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.isFrameSelected(frameGroup)) {
                window.selectionManager.selectFrame(frameGroup);
            }
        });
        
        // 프레임 더블클릭 이벤트
        frameGroup.on('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFrameDoubleClick(e, frameGroup, uploadedPhoto);
        });
        
        // 사진 이벤트 설정
        this.setupPhotoEvents(uploadedPhoto, frameGroup, maskContainer);
        
        // 프레임 드래그 설정
        this.setupDragHandler(frameGroup, 'frame', (pos) => {
            this.saveFramePosition(frameGroup, pos);
        });
    }
    
    // 텍스트박스 이벤트 설정
    static setupTextEvents(textBox) {
        textBox.off('click dblclick mousedown keydown input blur');
        
        // 클릭: 선택 상태
        textBox.on('click', (e) => {
            e.stopPropagation();
            if (!textBox.hasClass('selected')) {
                window.selectionManager.selectTextBox(textBox);
            }
        });
        
        // 더블클릭: 편집 상태
        textBox.on('dblclick', (e) => {
            e.stopPropagation();
            if (textBox.hasClass('selected')) {
                this.enterEditMode(textBox);
            }
        });
        
        // 입력 이벤트
        textBox.on('input', () => this.handleTextInput(textBox));
        
        // 포커스 해제
        textBox.on('blur', () => this.handleTextBlur(textBox));
        
        // 드래그 설정
        this.setupTextDrag(textBox);
    }
    
    // 텍스트박스프레임 이벤트
    static setupTextboxFrameEvents(frameGroup) {
        frameGroup.find('.frame-overlay').css('pointer-events', 'auto');
        
        frameGroup.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isFrameSelected(frameGroup)) {
                window.selectionManager.selectFrame(frameGroup);
            }
        });
        
        this.setupDragHandler(frameGroup, 'frame');
    }
    
    // Element 이벤트
    static setupElementEvents(frameGroup) {
        frameGroup.find('.frame-overlay').css('pointer-events', 'auto');
        
        frameGroup.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isElementSelected(frameGroup)) {
                window.selectionManager.selectElement(frameGroup);
            }
        });
        
        this.setupDragHandler(frameGroup, 'element');
    }
    
    // 공통 드래그 핸들러
    static setupDragHandler(element, type, onComplete) {
        let dragData = null;
        
        element.on('mousedown', (e) => {
            if (e.button !== 0 || !this.canDrag(element, type)) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            dragData = {
                startX: e.clientX,
                startY: e.clientY,
                initialLeft: parseFloat(element.css('left')) || 0,
                initialTop: parseFloat(element.css('top')) || 0,
                isDragging: false,
                lastTooltipUpdate: 0
            };
            
            $(document).on('mousemove.drag', (ev) => {
                const deltaX = ev.clientX - dragData.startX;
                const deltaY = ev.clientY - dragData.startY;
                
                if (!dragData.isDragging && this.exceedsMinDistance(deltaX, deltaY)) {
                    dragData.isDragging = true;
                    element.addClass('dragging');
                }
                
                if (dragData.isDragging) {
                    const newPos = this.calculateNewPosition(element, dragData, deltaX, deltaY);
                    element.css(newPos);
                    this.updateTooltipIfNeeded(element, type, dragData);
                }
            });
            
            $(document).on('mouseup.drag', () => {
                $(document).off('.drag');
                element.removeClass('dragging');
                
                if (dragData.isDragging) {
                    const position = this.saveElementPosition(element);
                    if (onComplete) onComplete(position);
                }
                
                dragData = null;
            });
        });
    }
    
    // 텍스트 드래그 전용 처리
    static setupTextDrag(textBox) {
        textBox.on('mousedown', (e) => {
            e.stopPropagation();
            
            if (textBox.hasClass('editing')) {
                return; // 편집 중에는 드래그 비활성화
            }
            
            if (!textBox.hasClass('selected')) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            
            const dragData = {
                startX: e.clientX,
                startY: e.clientY,
                initialLeft: textBox.position().left,
                initialTop: textBox.position().top
            };
            
            const isOverflowing = this.checkTextOverflow(textBox);
            
            $(document).on('mousemove.textDrag', (ev) => {
                const newLeft = dragData.initialLeft + (ev.clientX - dragData.startX);
                const newTop = dragData.initialTop + (ev.clientY - dragData.startY);
                
                const constrained = isOverflowing ? 
                    { left: newLeft, top: newTop } : 
                    window.selectionManager.applySafeLineConstraints(newLeft, newTop, textBox);
                
                textBox.css({
                    left: Math.max(0, constrained.left) + 'px',
                    top: Math.max(0, constrained.top) + 'px'
                });
            });
            
            $(document).on('mouseup.textDrag', () => {
                $(document).off('.textDrag');
                this.saveElementPosition(textBox);
            });
        });
    }
    
    // 사진 이벤트 설정
    static setupPhotoEvents(photo, frameGroup, maskContainer) {
        photo.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const selectionMode = window.selectionManager.selectedMode;
            
            if (!selectionMode) {
                window.selectionManager.selectFrame(frameGroup);
            } else if (selectionMode === 'frame' && this.isFrameSelected(frameGroup)) {
                // 프레임 선택 상태에서 사진 클릭은 무시
            } else if (selectionMode === 'photo' && this.isPhotoSelected(photo)) {
                // 이미 선택된 사진 클릭은 무시
            } else {
                window.selectionManager.selectFrame(frameGroup);
            }
        });
        
        photo.on('mousedown', (e) => {
            if (e.button !== 0) return;
            
            if (this.isPhotoSelected(photo)) {
                e.preventDefault();
                e.stopPropagation();
                PhotoManager.handleDrag(photo, frameGroup, maskContainer, e);
            }
        });
    }
    
    // 전역 이벤트 설정
    static setupGlobalEvents() {
        // 클릭 영역 외부 클릭 시 선택 해제
        document.getElementById('page-preview').addEventListener('click', (e) => {
            if (!this.isSelectableElement(e.target)) {
                window.selectionManager.clearSelection();
            }
        }, true);
        
        // Delete/Backspace 키 처리
        $(document).on('keydown', (e) => {
            if (this.shouldHandleDelete(e)) {
                e.preventDefault();
                this.handleDeleteKey();
            }
        });
        
        // 텍스트 추가 버튼들
        $('#add-title-btn').on('click', () => TextManager.addTextBox('Title'));
        $('#add-subtitle-btn').on('click', () => TextManager.addTextBox('Sub-Title'));
        $('#add-text-btn').on('click', () => TextManager.addTextBox('text'));
    }
    
    // === Helper Methods ===
    
    static clearEvents(frameGroup, placeholderLink, uploadedPhoto) {
        frameGroup.off('mousedown click dblclick');
        placeholderLink.off('click');
        uploadedPhoto.off('mousedown click dblclick');
    }
    
    static isPlaceholderClick(e) {
        const target = $(e.target);
        return target.hasClass('place-image-here-link') || 
               target.closest('.place-image-here-link').length > 0;
    }
    
    static isFrameSelected(frameGroup) {
        return window.selectionManager.selectedMode === 'frame' &&
               window.selectionManager.currentFrame === frameGroup;
    }
    
    static isElementSelected(element) {
        return window.selectionManager.selectedMode === 'element' &&
               window.selectionManager.currentElement === element;
    }
    
    static isPhotoSelected(photo) {
        return window.selectionManager.selectedMode === 'photo' &&
               window.selectionManager.currentPhoto === photo;
    }
    
    static canDrag(element, type) {
        switch (type) {
            case 'frame':
                return this.isFrameSelected(element);
            case 'element':
                return this.isElementSelected(element);
            case 'photo':
                return this.isPhotoSelected(element);
            default:
                return false;
        }
    }
    
    static exceedsMinDistance(deltaX, deltaY) {
        return Math.abs(deltaX) > this.dragConfig.minMoveDistance || 
               Math.abs(deltaY) > this.dragConfig.minMoveDistance;
    }
    
    static calculateNewPosition(element, dragData, deltaX, deltaY) {
        const newLeft = dragData.initialLeft + deltaX;
        const newTop = dragData.initialTop + deltaY;
        const constrained = window.selectionManager.applySafeLineConstraints(newLeft, newTop, element);
        
        return {
            left: `${constrained.left}px`,
            top: `${constrained.top}px`
        };
    }
    
    static updateTooltipIfNeeded(element, type, dragData) {
        const now = Date.now();
        if (now - dragData.lastTooltipUpdate > this.dragConfig.tooltipUpdateInterval) {
            dragData.lastTooltipUpdate = now;
            
            switch (type) {
                case 'frame':
                    UIManager.showFrameTooltip(element);
                    break;
                case 'element':
                    UIManager.showElementTooltip(element);
                    break;
            }
        }
    }
    
    static saveElementPosition(element) {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (!actualBgRect) return null;
        
        const elementPos = element.position();
        const currentState = element.data('relativeState') || {};
        
        currentState.position = {
            left: ((elementPos.left - actualBgRect.left) / actualBgRect.width) * 100,
            top: ((elementPos.top - actualBgRect.top) / actualBgRect.height) * 100
        };
        
        if (!currentState.size) {
            currentState.size = {
                width: (element.outerWidth() / actualBgRect.width) * 100,
                height: (element.outerHeight() / actualBgRect.height) * 100
            };
        }
        
        currentState.transform = element.css('transform') || 'none';
        element.data('relativeState', currentState);
        
        return currentState.position;
    }
    
    static saveFramePosition(frameGroup, position) {
        const currentState = frameGroup.data('relativeState') || {};
        if (position) {
            currentState.position = position;
            frameGroup.data('relativeState', currentState);
        }
    }
    
    static triggerImageUpload(frameGroup, uploadedPhoto, placeholderLink, maskContainer) {
        const fileInput = $('#image-upload-input');
        fileInput.data({
            targetFrameGroup: frameGroup,
            targetUploadedPhoto: uploadedPhoto,
            targetPlaceholderLink: placeholderLink,
            targetMaskContainer: maskContainer
        }).trigger('click');
    }
    
    static handleFrameDoubleClick(e, frameGroup, uploadedPhoto) {
        const target = $(e.target);
        const isPhotoClick = target.hasClass('uploaded-photo') || 
                            target.closest('.uploaded-photo').length > 0;
        
        if (isPhotoClick && uploadedPhoto.is(':visible')) {
            if (window.selectionManager.selectedMode === 'photo') {
                window.selectionManager.selectFrame(frameGroup);
            } else {
                window.selectionManager.selectPhoto(uploadedPhoto, frameGroup);
            }
        } else if (window.selectionManager.selectedMode === 'photo' && 
                   window.selectionManager.currentPhoto === uploadedPhoto) {
            window.selectionManager.selectFrame(frameGroup);
        }
    }
    
    static enterEditMode(textBox) {
        textBox.addClass('editing');
        textBox.focus();
        this.autoResizeTextBox(textBox);
    }
    
    static handleTextInput(textBox) {
        this.autoResizeTextBox(textBox);
        setTimeout(() => this.saveElementPosition(textBox), 10);
    }
    
    static handleTextBlur(textBox) {
        textBox.removeClass('editing');
        
        if (textBox.text().trim() === '') {
            textBox.text('Enter Text Here');
        }
        
        this.autoResizeTextBox(textBox);
        
        if (textBox.hasClass('selected')) {
            textBox.trigger('resize');
        }
        
        setTimeout(() => this.saveElementPosition(textBox), 10);
    }
    
    static autoResizeTextBox($box) {
        const htmlContent = $box.html();
        const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');
        
        const $temp = $('<div>')
            .html(htmlContent || ' ')
            .css({
                'position': 'absolute',
                'visibility': 'hidden',
                'height': 'auto',
                'width': 'auto',
                'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap',
                'font-size': $box.css('font-size'),
                'font-family': $box.css('font-family'),
                'font-weight': $box.css('font-weight'),
                'padding': $box.css('padding'),
                'border': $box.css('border'),
                'box-sizing': 'border-box',
                'max-width': '500px'
            });
        
        $('body').append($temp);
        
        const measuredWidth = $temp.outerWidth();
        const measuredHeight = $temp.outerHeight();
        $temp.remove();
        
        $box.css({
            'width': measuredWidth + 'px',
            'height': measuredHeight + 'px',
            'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap'
        });
    }
    
    static checkTextOverflow(textBox) {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (!actualBgRect) return false;
        
        const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
        const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;
        const safeRight = actualBgRect.left + actualBgRect.width - safeMarginX;
        const safeBottom = actualBgRect.top + actualBgRect.height - safeMarginY;
        
        const boxPos = textBox.position();
        const boxWidth = textBox.outerWidth();
        const boxHeight = textBox.outerHeight();
        
        return (boxPos.left + boxWidth > safeRight) || (boxPos.top + boxHeight > safeBottom);
    }
    
    static isSelectableElement(target) {
        const selectors = [
            '.frame-group',
            '.uploaded-photo',
            '.text-box',
            '#frame-controls-tooltip',
            '#photo-controls-tooltip',
            '#text-tooltip'
        ];
        
        return selectors.some(selector => $(target).closest(selector).length > 0);
    }
    
    static shouldHandleDelete(e) {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return false;
        
        const focused = document.activeElement;
        const isEditing = focused.tagName === 'INPUT' || 
                         focused.tagName === 'TEXTAREA' || 
                         focused.contentEditable === 'true';
        
        return !isEditing;
    }
    
    static handleDeleteKey() {
        const deleteHandlers = [
            { selector: window.selectedPhotoWrapper, message: "사진을 삭제하시겠습니까?", handler: this.deletePhoto },
            { selector: window.selectedFrame, message: "프레임을 삭제하시겠습니까?", handler: this.deleteFrame },
            { selector: window.selectedBox, message: "텍스트를 삭제하시겠습니까?", handler: this.deleteText },
            { 
                selector: window.selectionManager.selectedMode === 'element' && window.selectionManager.currentElement,
                message: "요소를 삭제하시겠습니까?",
                handler: this.deleteElement
            }
        ];
        
        for (const { selector, message, handler } of deleteHandlers) {
            if (selector && confirm(message)) {
                handler.call(this, selector);
                break;
            }
        }
    }
    
    static deletePhoto(photo) {
        const frameGroup = photo.closest('.frame-group');
        const placeholder = frameGroup.find('.place-image-here-link');
        photo.hide().attr('src', '');
        placeholder.show();
        window.selectionManager.clearSelection();
    }
    
    static deleteFrame(frame) {
        frame.remove();
        window.selectionManager.clearSelection();
    }
    
    static deleteText(textBox) {
        textBox.remove();
        window.selectionManager.clearSelection();
    }
    
    static deleteElement(element) {
        element.remove();
        window.selectionManager.clearSelection();
    }
}