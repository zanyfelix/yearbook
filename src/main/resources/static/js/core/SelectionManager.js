// ============================================================================
// 📁 js/core/SelectionManager.js - 다중 선택 통합 버전
// ============================================================================
class SelectionManager {
	constructor() {
		this.selectedMode = null;
		this.currentFrame = null;
		this.currentPhoto = null;
		this.currentElement = null;
		this.currentTextBox = null;

		this.originalZIndex = null;
		this.SELECTED_Z_INDEX = 9999;
	}

	// --- Public Selection Methods ---

	selectFrame(frameGroup) {
		// ✅ Ctrl 체크는 EventManager에서 처리 - 여기서는 제거
		
		// 다중 선택 해제
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			window.multiSelectionManager.clearSelection();
		}
		
		if (this.selectedMode === 'frame' && this.currentFrame === frameGroup) return;
		this.clearSelection();

		this.selectedMode = 'frame';
		this.currentFrame = frameGroup;

		this.originalZIndex = frameGroup.css('z-index');
		frameGroup.data('original-z-index', this.originalZIndex);
		frameGroup.css('z-index', this.SELECTED_Z_INDEX);

		window.selectedFrame = frameGroup;
		frameGroup.addClass('selected-frame');
		FrameManager.addRotationHandle(frameGroup);
		UIManager.showFrameTooltip(frameGroup);
	}

	selectPhoto(photo, frameGroup) {
		// 다중 선택 해제
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			window.multiSelectionManager.clearSelection();
		}
		
		if (this.selectedMode === 'photo' && this.currentPhoto === photo) return;
		this.clearSelection();

		this.selectedMode = 'photo';
		this.currentFrame = frameGroup;
		this.currentPhoto = photo;

		this.originalZIndex = frameGroup.css('z-index');
		frameGroup.data('original-z-index', this.originalZIndex);
		frameGroup.css('z-index', this.SELECTED_Z_INDEX);

		window.selectedPhotoWrapper = photo;
		window.selectedFrame = frameGroup;

		photo.addClass('selected-photo');
		PhotoManager.addSelectionUI(photo, frameGroup);
		PhotoManager.showOverlay(photo, frameGroup);
		UIManager.showPhotoTooltip(photo, frameGroup);
	}

	selectTextBox(textBox) {
		// ✅ Ctrl 체크는 EventManager에서 처리 - 여기서는 제거
		
		// 다중 선택 해제
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			window.multiSelectionManager.clearSelection();
		}
		
		if (this.currentTextBox === textBox) return;
		this.clearSelection();

		this.selectedMode = 'text';
		this.currentTextBox = textBox;

		this.originalZIndex = textBox.css('z-index');
		textBox.data('original-z-index', this.originalZIndex);
		textBox.css('z-index', this.SELECTED_Z_INDEX);

		window.selectedBox = textBox;

		textBox.addClass('selected');
		this.addTextRotationHandle(textBox);
		UIManager.showTextTooltip(textBox);

		TextManager.updateUIFromSelectedTextBox(textBox);

		textBox.on('resize.selection', () => {
			if (textBox.hasClass('selected')) {
				this.addTextRotationHandle(textBox);
			}
		});
	}

	selectElement(elementGroup) {
		// ✅ Ctrl 체크는 EventManager에서 처리 - 여기서는 제거
		
		// 다중 선택 해제
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			window.multiSelectionManager.clearSelection();
		}
		
		if (this.currentElement === elementGroup) return;
		this.clearSelection();

		this.selectedMode = 'element';
		this.currentElement = elementGroup;
		this.currentFrame = elementGroup;

		this.originalZIndex = elementGroup.css('z-index');
		elementGroup.data('original-z-index', this.originalZIndex);
		elementGroup.css('z-index', this.SELECTED_Z_INDEX);

		window.selectedFrame = elementGroup;

		elementGroup.addClass('selected-frame selected-element');
		FrameManager.addRotationHandle(elementGroup);
		this.addElementResizeHandles(elementGroup);

		EventManager.updateElementResizeCursors(elementGroup);

		UIManager.showElementTooltip(elementGroup);
	}

	addElementResizeHandles(elementGroup) {
		elementGroup.find('.element-resize-handle').remove();

		const handles = ['nw', 'ne', 'sw', 'se'];
		handles.forEach(position => {
			const handle = $(`<div class="element-resize-handle handle-${position}"></div>`);
			elementGroup.append(handle);

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
			this.currentTextBox.attr('contenteditable', 'false');
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

		// 전역 변수 초기화
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

		const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
		const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;

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

	/**
	 * 선택된 요소를 수평 중앙으로 정렬 (단일 선택용)
	 */
	alignHorizontalCenter() {
		// 다중 선택이 있으면 AlignmentManager 사용
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			window.alignmentManager.alignCenterH(window.multiSelectionManager.getSelectedElements());
			return;
		}
		
		const element = this.getCurrentElement();
		if (!element) return;

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		const currentTransform = element.css('transform');
		element.css('transform', 'none');

		const elementWidth = element.outerWidth();
		const newLeft = actualBgRect.left + (actualBgRect.width - elementWidth) / 2;

		element.css('transform', currentTransform);

		element.css('left', newLeft + 'px');

		EventManager.saveElementPosition(element);
	}

	/**
	 * 선택된 요소를 수직 중앙으로 정렬 (단일 선택용)
	 */
	alignVerticalCenter() {
		// 다중 선택이 있으면 AlignmentManager 사용
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			window.alignmentManager.alignCenterV(window.multiSelectionManager.getSelectedElements());
			return;
		}
		
		const element = this.getCurrentElement();
		if (!element) return;

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		const currentTransform = element.css('transform');
		element.css('transform', 'none');

		const elementHeight = element.outerHeight();
		const newTop = actualBgRect.top + (actualBgRect.height - elementHeight) / 2;

		element.css('transform', currentTransform);

		element.css('top', newTop + 'px');

		EventManager.saveElementPosition(element);
	}

	/**
	 * 선택된 요소를 수평/수직 중앙으로 정렬 (단일 선택용)
	 */
	alignCenter() {
		// 다중 선택이 있으면 AlignmentManager 사용
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			const elements = window.multiSelectionManager.getSelectedElements();
			window.alignmentManager.alignCenterH(elements);
			window.alignmentManager.alignCenterV(elements);
			return;
		}
		
		const element = this.getCurrentElement();
		if (!element) return;

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		const currentTransform = element.css('transform');
		element.css('transform', 'none');

		const elementWidth = element.outerWidth();
		const elementHeight = element.outerHeight();

		const newLeft = actualBgRect.left + (actualBgRect.width - elementWidth) / 2;
		const newTop = actualBgRect.top + (actualBgRect.height - elementHeight) / 2;

		element.css('transform', currentTransform);

		element.css({
			left: newLeft + 'px',
			top: newTop + 'px'
		});

		EventManager.saveElementPosition(element);
	}

	/**
	 * 현재 선택된 요소 가져오기 (헬퍼 메서드)
	 */
	getCurrentElement() {
		switch (this.selectedMode) {
			case 'frame':
				return this.currentFrame;
			case 'text':
				return this.currentTextBox;
			case 'element':
				return this.currentElement;
			default:
				return null;
		}
	}
	
	/**
	 * 선택된 요소들 모두 가져오기 (다중 선택 포함)
	 */
	getAllSelectedElements() {
		if (window.multiSelectionManager && window.multiSelectionManager.hasMultipleSelection()) {
			return window.multiSelectionManager.getSelectedElements();
		}
		
		const single = this.getCurrentElement();
		return single ? [single] : [];
	}
}

function rgbToHex(rgb) {
	if (!rgb || !rgb.startsWith('rgb')) {
		return rgb;
	}
	let [r, g, b] = rgb.match(/\d+/g).map(Number);
	const toHex = c => ('0' + c.toString(16)).slice(-2);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}