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

		this.originalZIndex = null; // 원래 z-index 저장용
		this.SELECTED_Z_INDEX = 9999; // 선택 시 적용할 최상위 z-index

	}

	// --- Public Selection Methods ---

	selectFrame(frameGroup) {
		if (this.selectedMode === 'frame' && this.currentFrame === frameGroup) return;
		this.clearSelection();

		this.selectedMode = 'frame';
		this.currentFrame = frameGroup;

		// 원래 z-index 저장 후 최상위로 올리기
		this.originalZIndex = frameGroup.css('z-index');
		frameGroup.data('original-z-index', this.originalZIndex);
		frameGroup.css('z-index', this.SELECTED_Z_INDEX);

		window.selectedFrame = frameGroup;
		frameGroup.addClass('selected-frame');
		FrameManager.addRotationHandle(frameGroup);
		UIManager.showFrameTooltip(frameGroup);
	}

	selectPhoto(photo, frameGroup) {
		if (this.selectedMode === 'photo' && this.currentPhoto === photo) return;
		this.clearSelection();

		this.selectedMode = 'photo';
		this.currentFrame = frameGroup;
		this.currentPhoto = photo;

		// 프레임 그룹 전체를 최상위로
		this.originalZIndex = frameGroup.css('z-index');
		frameGroup.data('original-z-index', this.originalZIndex);
		frameGroup.css('z-index', this.SELECTED_Z_INDEX);

		// 전역 변수 동기화
		window.selectedPhotoWrapper = photo;
		window.selectedFrame = frameGroup;

		photo.addClass('selected-photo');
		PhotoManager.addSelectionUI(photo, frameGroup);
		PhotoManager.showOverlay(photo, frameGroup);
		UIManager.showPhotoTooltip(photo, frameGroup);
	}

	selectTextBox(textBox) {
		if (this.currentTextBox === textBox) return;
		this.clearSelection();

		this.selectedMode = 'text';
		this.currentTextBox = textBox;

		// 텍스트박스 최상위로
		this.originalZIndex = textBox.css('z-index');
		textBox.data('original-z-index', this.originalZIndex);
		textBox.css('z-index', this.SELECTED_Z_INDEX);

		window.selectedBox = textBox;

		textBox.addClass('selected');
		this.addTextRotationHandle(textBox);
		UIManager.showTextTooltip(textBox);

		TextManager.updateUIFromSelectedTextBox(textBox);

		// 리사이즈 이벤트 바인딩
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

		// 요소 최상위로
		this.originalZIndex = elementGroup.css('z-index');
		elementGroup.data('original-z-index', this.originalZIndex);
		elementGroup.css('z-index', this.SELECTED_Z_INDEX);

		// 전역 변수 동기화
		window.selectedFrame = elementGroup;

		elementGroup.addClass('selected-frame selected-element');
		FrameManager.addRotationHandle(elementGroup);
		this.addElementResizeHandles(elementGroup);
		UIManager.showElementTooltip(elementGroup);
	}

	// ✅ Element 크기 조절 핸들 추가 메소드
	addElementResizeHandles(elementGroup) {
		// 기존 핸들 제거
		elementGroup.find('.element-resize-handle').remove();

		// 4개 모서리에 resize 핸들 추가
		const handles = ['nw', 'ne', 'sw', 'se'];
		handles.forEach(position => {
			const handle = $(`<div class="element-resize-handle handle-${position}"></div>`);
			elementGroup.append(handle);

			// resize 이벤트 바인딩
			EventManager.bindElementResizeEvent(elementGroup, handle, position);
		});
	}

	clearSelection() {
		// 프레임/요소 선택 해제
		if (this.currentFrame) {
			const originalZ = this.currentFrame.data('original-z-index');
			if (originalZ !== undefined) {
				this.currentFrame.css('z-index', originalZ);
				this.currentFrame.removeData('original-z-index');
			}
			this.currentFrame.removeClass('selected-frame selected-element');
			this.currentFrame.find('.rotate-handle, .rotate-line').remove();
		}

		if (this.currentElement) {
			this.currentElement.find('.element-resize-handle').remove();
		}

		// 사진 선택 해제
		if (this.currentPhoto) {
			// 사진의 부모 프레임 z-index 복원
			const frameGroup = this.currentPhoto.closest('.frame-group');
			const originalZ = frameGroup.data('original-z-index');
			if (originalZ !== undefined) {
				frameGroup.css('z-index', originalZ);
				frameGroup.removeData('original-z-index');
			}
			this.currentPhoto.removeClass('selected-photo');
			PhotoManager.removeSelectionUI();
			PhotoManager.hideOverlay();
		}

		// 텍스트박스 선택 해제
		if (this.currentTextBox) {
			const originalZ = this.currentTextBox.data('original-z-index');
			if (originalZ !== undefined) {
				this.currentTextBox.css('z-index', originalZ);
				this.currentTextBox.removeData('original-z-index');
			}
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
		this.originalZIndex = null;

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

		// SafeLine 마진 계산 (3mm)
		const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
		const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;

		// 회전 여부와 관계없이 요소의 외곽 박스 기준으로 제약 적용
		const elementWidth = element.outerWidth();
		const elementHeight = element.outerHeight();

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