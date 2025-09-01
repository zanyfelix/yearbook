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
		
		window.selectedFrame = frameGroup;

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
	    
	    // 전역 변수 동기화
	    window.selectedPhotoWrapper = photo;
	    window.selectedFrame = frameGroup;
	    
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
	    
	    // 전역 변수 동기화
	    window.selectedBox = textBox;
	    
	    textBox.addClass('selected');
	    this.addTextRotationHandle(textBox);
	    UIManager.showTextTooltip(textBox);
		
		// ✅ [핵심 수정] 선택된 텍스트박스의 현재 상태를 툴바 UI에 반영합니다.
		    // --------------------------------------------------------------------
		    // 1. 기본 폰트 사이즈를 가져와서 해당하는 픽셀 값으로 설정
		    const baseFontSize = textBox.data('base-font-size') || 12;
		    const fontSizeInPx = baseFontSize + 'px'; // 12 -> "12px", 16 -> "16px", 24 -> "24px"
		
		// ✅ [핵심 수정] 선택된 텍스트박스의 현재 상태를 툴바 UI에 반영합니다.
		// --------------------------------------------------------------------
		// 1. 현재 텍스트박스의 스타일 값들을 가져옵니다.
		const currentFontFamily = textBox.data('savedFontFamily') || textBox.css('font-family').split(',')[0].replace(/['"]/g, '').trim();
		const currentTextAlign = textBox.css('text-align');
		const currentColor = textBox.css('color');
		
		// 2. 가져온 값들을 툴바의 각 컨트롤에 설정합니다.
		$('#tooltip-size').val(currentFontSize);
		$('#tooltip-font').val(currentFontFamily);
		$('#tooltip-align').val(currentTextAlign);
		
		// 색상 값은 rgb에서 hex로 변환해야 color input에 표시됩니다.
		if (typeof rgbToHex === "function") {
			$('#tooltip-color').val(rgbToHex(currentColor));
		}
	    
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
	    
	    // 전역 변수 동기화
	    window.selectedFrame = elementGroup;
	    
	    elementGroup.addClass('selected-frame selected-element');
	    FrameManager.addRotationHandle(elementGroup);
	    UIManager.showElementTooltip(elementGroup);
	}

	clearSelection() {
	    // 프레임/요소 선택 해제
	    if (this.currentFrame) {
	        this.currentFrame.removeClass('selected-frame selected-element');
	        this.currentFrame.find('.rotate-handle, .rotate-line').remove();
	    }
	    
	    // 사진 선택 해제
	    if (this.currentPhoto) {
	        this.currentPhoto.removeClass('selected-photo');
	        PhotoManager.removeSelectionUI();
	        PhotoManager.hideOverlay();
	    }
	    
	    // 텍스트박스 선택 해제
	    if (this.currentTextBox) {
	        this.currentTextBox.removeClass('selected editing');
	        this.currentTextBox.find('.text-rotate-handle, .text-rotate-line').remove();
	    }

	    UIManager.hideAllToolbars();
	    
	    // 상태 초기화
	    this.selectedMode = null;
	    this.currentFrame = null;
	    this.currentPhoto = null;
	    this.currentElement = null;
	    this.currentTextBox = null;
	    
	    // 전역 변수도 초기화
	    window.selectedFrame = null;
	    window.selectedPhotoWrapper = null;
	    window.selectedBox = null;
	}
    
    applySafeLineConstraints(newLeft, newTop, element) {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (!actualBgRect) {
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
        
        const constrainedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        const constrainedTop = Math.max(minTop, Math.min(newTop, maxTop));
        
        return {
            left: constrainedLeft,
            top: constrainedTop
        };
    }
	
	addTextRotationHandle(textBox) {
	    textBox.find('.text-rotate-handle, .text-rotate-line').remove();
	    const handle = $('<div class="text-rotate-handle"></div>');
	    const line = $('<div class="text-rotate-line"></div>');
	    textBox.append(handle).append(line);
	    EventManager.makeRotatable(textBox, handle);
	}
}

function rgbToHex(rgb) {
    if (!rgb || !rgb.startsWith('rgb')) {
        return rgb; // 이미 hex이거나 다른 형식이면 그대로 반환
    }
    // rgb 문자열에서 숫자만 추출
    let [r, g, b] = rgb.match(/\d+/g).map(Number);
    // 각 숫자를 16진수로 변환하고 두 자리로 맞춤
    const toHex = c => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}