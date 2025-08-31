// SelectionManager.js - 선택 관리 클래스
class SelectionManager {
    constructor() {
        this.selectedMode = null;
        this.currentFrame = null;
        this.currentPhoto = null;
        this.currentElement = null;
        this.photoOverlay = null;
        this.safeConstraintsCache = null;
        this.setupCache();
    }

    setupCache() {
        const updateCache = () => {
            const bg = $('#page-preview-img');
            if (!bg.length) return;

            const bgPos = bg.position();
            const bgWidth = bg.width();
            const bgHeight = bg.height();

            const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * bgWidth;
            const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * bgHeight;

            this.safeConstraintsCache = {
                safeLeft: bgPos.left + safeMarginX,
                safeTop: bgPos.top + safeMarginY,
                safeRight: bgPos.left + bgWidth - safeMarginX,
                safeBottom: bgPos.top + bgHeight - safeMarginY
            };
        };

        setTimeout(updateCache, 100);
        $('#page-preview-img').on('load', updateCache);
        $(window).on('resize', updateCache);
    }

    // 프레임 선택
    selectFrame(frameGroup) {
        this.clearSelection();
        
        selectedFrame = frameGroup;
        this.selectedMode = 'frame';
        this.currentFrame = frameGroup;
        
        const isTextboxFrame = frameGroup.hasClass('textbox-frame');
        const isElement = frameGroup.hasClass('element-frame');
        
        frameGroup.addClass('selected-frame').css('border', '1px dashed #ff0000');
        FrameManager.addRotationHandle(frameGroup);
        
        if (isElement) {
            this.addElementResizeHandles(frameGroup);
        }
        
        UIManager.showFrameTooltip(frameGroup);
    }

    // 사진 선택
    selectPhoto(photo, frameGroup) {
        this.clearSelection();
        
        selectedPhotoWrapper = photo;
        this.selectedMode = 'photo';
        this.currentFrame = frameGroup;
        this.currentPhoto = photo;
        
        photo.addClass('selected-photo');
        
        PhotoManager.removeSelectionUI();
        PhotoManager.addSelectionUI(photo, frameGroup);
        UIManager.showPhotoTooltip(photo, frameGroup);
        PhotoManager.showOverlay(photo, frameGroup);
    }
    
    // 텍스트박스 선택
    selectTextBox(textBox) {
        this.clearSelection();
        
        selectedBox = textBox;
        this.selectedMode = 'text';

        textBox.removeClass('editing').addClass('selected').blur();
        
        this.addTextRotationHandle(textBox);
        UIManager.showTextTooltip(textBox);
        
        // 텍스트박스 크기 변경 감지
        textBox.on('resize.selection', () => {
            if (textBox.hasClass('selected')) {
                $('.text-rotate-handle, .text-rotate-line').remove();
                this.addTextRotationHandle(textBox);
            }
        });
    }
    
    // Element 선택
    selectElement(elementGroup) {
        this.clearSelection();

        this.selectedMode = 'element';
        this.currentElement = elementGroup;
        this.currentFrame = elementGroup;

        elementGroup.addClass('selected-frame selected-element')
                   .css('border', '1px dashed #ff0000');

        FrameManager.addRotationHandle(elementGroup);
        this.addElementResizeHandles(elementGroup);
        UIManager.showElementTooltip(elementGroup);
    }
    
    // 텍스트 회전 핸들 추가
    addTextRotationHandle(textBox) {
        $('.text-rotate-handle, .text-rotate-line').remove();
        
        const handle = $('<div class="text-rotate-handle"></div>');
        const line = $('<div class="text-rotate-line"></div>');
        
        textBox.append(handle).append(line);
        this.makeTextRotatable(textBox, handle);
    }

    // 텍스트박스 회전 기능
    makeTextRotatable(textBox, handle) {
        handle.on('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const boxCenter = {
                x: textBox.offset().left + textBox.width() / 2,
                y: textBox.offset().top + textBox.height() / 2
            };
            
            const initialAngle = this.getCurrentRotation(textBox);
            const startAngleRad = Math.atan2(e.clientY - boxCenter.y, e.clientX - boxCenter.x);
            
            $(document).on('mousemove.textRotate', (ev) => {
                const currentAngleRad = Math.atan2(ev.clientY - boxCenter.y, ev.clientX - boxCenter.x);
                const deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
                const newAngle = initialAngle + deltaAngle;
                
                textBox.css('transform', `rotate(${newAngle}deg)`);
            });
            
            $(document).on('mouseup.textRotate', () => {
                $(document).off('mousemove.textRotate mouseup.textRotate');
                this.saveTextBoxTransform(textBox);
            });
        });
    }
    
    // 현재 회전각도 가져오기
    getCurrentRotation(element) {
        const transform = element.css('transform');
        if (!transform || transform === 'none') return 0;
        
        const match = transform.match(/rotate\(([-\d.]+)deg\)/);
        if (match) return parseFloat(match[1]);
        
        const matrix = transform.match(/matrix\((.+)\)/);
        if (matrix) {
            const values = matrix[1].split(',').map(Number);
            return Math.atan2(values[1], values[0]) * (180 / Math.PI);
        }
        return 0;
    }
    
    // 텍스트박스 변환 저장
    saveTextBoxTransform(textBox) {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (actualBgRect) {
            const currentState = textBox.data('relativeState') || {};
            currentState.transform = textBox.css('transform') || 'none';
            textBox.data('relativeState', currentState);
        }
    }
    
    // Element 리사이즈 핸들 추가
    addElementResizeHandles(elementGroup) {
        $('.element-resize-handle').remove();
        
        const handles = ['nw', 'ne', 'sw', 'se'];
        handles.forEach(position => {
            const handle = $('<div class="element-resize-handle"></div>')
                .addClass(`handle-${position}`)
                .css({
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'rgb(255, 255, 255)',
                    border: '1px solid rgb(255, 0, 0)',
                    cursor: `${position}-resize`,
                    zIndex: 30
                });

            // 위치 설정
            this.setHandlePosition(handle, position);
            elementGroup.append(handle);
            this.makeElementResizable(elementGroup, handle, position);
        });
    }
    
    // 핸들 위치 설정
    setHandlePosition(handle, position) {
        const positions = {
            'nw': { top: '-4px', left: '-4px' },
            'ne': { top: '-4px', right: '-4px' },
            'sw': { bottom: '-4px', left: '-4px' },
            'se': { bottom: '-4px', right: '-4px' }
        };
        handle.css(positions[position]);
    }
    
    // Element 리사이즈 기능
    makeElementResizable(elementGroup, handle, position) {
        handle.on('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = elementGroup.width();
            const startHeight = elementGroup.height();
            const startLeft = parseFloat(elementGroup.css('left'));
            const startTop = parseFloat(elementGroup.css('top'));
            const aspectRatio = startWidth / startHeight;

            $(document).on('mousemove.elementResize', (ev) => {
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;
                
                const newDimensions = this.calculateNewDimensions(
                    position, deltaX, deltaY, 
                    startWidth, startHeight, startLeft, startTop, aspectRatio
                );
                
                if (newDimensions.width >= 30 && newDimensions.height >= 30) {
                    elementGroup.css(newDimensions);
                }
            });

            $(document).on('mouseup.elementResize', () => {
                $(document).off('mousemove.elementResize mouseup.elementResize');
            });
        });
    }
    
    // 새로운 크기 계산
    calculateNewDimensions(position, deltaX, deltaY, startWidth, startHeight, startLeft, startTop, aspectRatio) {
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        switch (position) {
            case 'se':
                newWidth = startWidth + deltaX;
                newHeight = newWidth / aspectRatio;
                break;
            case 'sw':
                newWidth = startWidth - deltaX;
                newHeight = newWidth / aspectRatio;
                newLeft = startLeft + deltaX;
                break;
            case 'ne':
                newHeight = startHeight - deltaY;
                newWidth = newHeight * aspectRatio;
                newTop = startTop + deltaY;
                break;
            case 'nw':
                newWidth = startWidth - deltaX;
                newHeight = newWidth / aspectRatio;
                newLeft = startLeft + deltaX;
                newTop = startTop + (startHeight - newHeight);
                break;
        }

        return {
            width: `${newWidth}px`,
            height: `${newHeight}px`,
            left: `${newLeft}px`,
            top: `${newTop}px`
        };
    }
    
    // 선택 해제
    clearSelection() {
        // 프레임 선택 해제
        $('.frame-group').removeClass('selected-frame').css({
            'border': '1px solid transparent',
            'box-shadow': 'none'
        });
        
        $('.frame-group.element-frame').removeClass('selected-element').css({
            'border': '1px solid transparent',
            'box-shadow': 'none'
        });
        
        $('.element-resize-handle').remove();

        // 사진 선택 해제
        $('.uploaded-photo').removeClass('selected-photo').css({
            'border': 'none',
            'box-shadow': 'none'
        });
        
        // 텍스트박스 선택 해제
        $('.text-box').removeClass('selected editing');
        $('#text-tooltip').addClass('d-none');
        
        // 툴팁 숨기기
        UIManager.hideAllToolbars();

        // 핸들 제거
        $('.selection-handle, .rotate-handle, .rotate-line').remove();
        $('#frame-controls-tooltip, #photo-controls-tooltip, #text-tooltip').addClass('d-none');
        $('.text-rotate-handle, .text-rotate-line').remove();
        
        // PhotoManager 정리
        PhotoManager.removeSelectionUI();
        PhotoManager.hideOverlay();
        
        // 전역 변수 초기화
        selectedFrame = null;
        selectedPhotoWrapper = null;
        selectedBox = null;
        
        // 내부 상태 초기화
        this.selectedMode = null;
        this.currentFrame = null;
        this.currentPhoto = null;
        this.currentElement = null;
    }

    // SafeLine 제약 적용
    applySafeLineConstraints(newLeft, newTop, frameGroup) {
        if (!this.safeConstraintsCache) {
            this.updateSafeConstraintsCache();
        }

        const cache = this.safeConstraintsCache;
        const frameW = frameGroup.outerWidth();
        const frameH = frameGroup.outerHeight();

        return {
            left: Math.max(cache.safeLeft, Math.min(newLeft, cache.safeRight - frameW)),
            top: Math.max(cache.safeTop, Math.min(newTop, cache.safeBottom - frameH))
        };
    }
    
    // SafeLine 캐시 업데이트
    updateSafeConstraintsCache() {
        const bg = $('#page-preview-img');
        const bgPos = bg.position();
        const bgWidth = bg.width();
        const bgHeight = bg.height();

        const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * bgWidth;
        const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * bgHeight;

        this.safeConstraintsCache = {
            safeLeft: bgPos.left + safeMarginX,
            safeTop: bgPos.top + safeMarginY,
            safeRight: bgPos.left + bgWidth - safeMarginX,
            safeBottom: bgPos.top + bgHeight - safeMarginY
        };
    }
}