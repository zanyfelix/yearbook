// ============================================================================
// 📁 js/core/SelectionManager.js - 다중 선택 통합 버전 (z-index 개선)
// ============================================================================
class SelectionManager {
	constructor() {
		this.selectedMode = null;
		this.currentFrame = null;
		this.currentPhoto = null;
		this.currentElement = null;
		this.currentTextBox = null;

		this.originalZIndex = null;
		
		// ✅ 요소 타입별 기본 z-index
		this.BASE_Z_INDEX = {
			text: 100,      // 텍스트 기본
			element: 80,    // 요소(스티커 등) 기본
			frame: 50,      // 사진 프레임 기본
			photo: 50       // 사진 기본
		};
		
		// ✅ 선택 시 올라가는 z-index (충분히 높게)
		this.SELECTED_Z_INDEX_BOOST = 10000;
		
		// ✅ 현재 최대 z-index 추적
		this.maxZIndex = 100;
	}

	// ✅ 요소의 현재 z-index를 가져오거나 기본값 반환
	getElementZIndex(element) {
		const current = parseInt(element.css('z-index')) || 0;
		if (current === 0 || isNaN(current)) {
			// 요소 타입에 따른 기본값 반환
			if (element.hasClass('textbox-frame')) return this.BASE_Z_INDEX.text;
			if (element.hasClass('element-frame')) return this.BASE_Z_INDEX.element;
			if (element.hasClass('frame-group')) return this.BASE_Z_INDEX.frame;
			return this.BASE_Z_INDEX.frame;
		}
		return current;
	}

	// ✅ 선택 시 z-index를 현재 최대값+1로 설정
	bringToFront(element) {
		this.originalZIndex = this.getElementZIndex(element);
		element.data('original-z-index', this.originalZIndex);
		
		// 현재 페이지의 모든 요소 중 최대 z-index 찾기
		let currentMax = this.maxZIndex;
		$('#page-preview').find('.frame-group, .textbox-frame, .element-frame').each(function() {
			const z = parseInt($(this).css('z-index')) || 0;
			if (z > currentMax && z < 9999) { // 선택된 요소 제외
				currentMax = z;
			}
		});
		
		this.maxZIndex = Math.max(currentMax + 1, this.maxZIndex);
		const newZIndex = this.maxZIndex + this.SELECTED_Z_INDEX_BOOST;
		
		element.css('z-index', newZIndex);
		return newZIndex;
	}

	// ✅ 겹친 요소들 중 실제 클릭된 요소 찾기
	findClickedElement(clickX, clickY, candidateElements) {
		let topElement = null;
		let topZIndex = -1;
		
		candidateElements.each(function() {
			const $el = $(this);
			const offset = $el.offset();
			const width = $el.outerWidth();
			const height = $el.outerHeight();
			
			// 클릭 지점이 요소 영역 내에 있는지 확인
			if (clickX >= offset.left && clickX <= offset.left + width &&
			    clickY >= offset.top && clickY <= offset.top + height) {
				const zIndex = parseInt($el.css('z-index')) || 0;
				if (zIndex > topZIndex) {
					topZIndex = zIndex;
					topElement = $el;
				}
			}
		});
		
		return topElement;
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

		// ✅ 선택 시 최상단으로 올림
		this.bringToFront(frameGroup);

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

		// ✅ 선택 시 최상단으로 올림
		this.bringToFront(frameGroup);

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

		// ✅ 선택 시 최상단으로 올림
		this.bringToFront(textBox);

		window.selectedBox = textBox;

		textBox.addClass('selected');
		// 페이지 로드 시와 동일한 측정/위치 계산으로 선택 시 위치 이동 방지
		if (window.updateElementPosition) {
			window.updateElementPosition(textBox);
		} else {
			EventManager.autoResizeTextBox(textBox);
		}
		this.addTextRotationHandle(textBox);
		UIManager.showTextTooltip(textBox);

		TextManager.updateUIFromSelectedTextBox(textBox);
		if (window.textPreviewManager) {
			window.textPreviewManager.activateTextBox(textBox);
		}

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

		// ✅ 선택 시 최상단으로 올림
		this.bringToFront(elementGroup);

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

			// 회전 핸들 먼저 제거 (html() 줄바꿈 오감지 방지)
			this.currentTextBox.find('.text-rotate-handle, .text-rotate-line').remove();

			const htmlContent = window.getTextBoxHtml
				? window.getTextBoxHtml(this.currentTextBox)
				: this.currentTextBox.html();
			const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');
			if (!hasLineBreaks) {
				this.currentTextBox.css('white-space', 'nowrap');
			}

			this.currentTextBox.removeClass('selected editing');
			this.currentTextBox.attr('contenteditable', 'false');

			if (window.getSelection) {
				window.getSelection().removeAllRanges();
			}
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
		if (window.textPreviewManager) {
			window.textPreviewManager.activateTextBox(null);
		}
	}

	getSelectedTextBox() {
		return this.currentTextBox;
	}

	applySafeLineConstraints(newLeft, newTop, element) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (!actualBgRect) {
			return { left: newLeft, top: newTop };
		}

		const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
		const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;

		// 안전 영역 경계
		const safeLeft = actualBgRect.left + safeMarginX;
		const safeTop = actualBgRect.top + safeMarginY;
		const safeRight = actualBgRect.left + actualBgRect.width - safeMarginX;
		const safeBottom = actualBgRect.top + actualBgRect.height - safeMarginY;

		// ✅ 텍스트박스: 방향별 독립 soft clamp
		//    현재 위치가 해당 경계선 안쪽일 때만 그 방향 제약 적용.
		//    element.css('left')는 오프셋 부모 좌표계 불일치·'auto' 반환 등 문제 있으므로
		//    반드시 position()을 사용. eps로 float 정밀도 오차 흡수.
		if (element.hasClass('text-box')) {
			const savedTransform = element.css('transform');
			element.css('transform', 'none');
			const curPos = element.position();   // transform 제거 후 현재 레이아웃 위치
			const elW    = element.outerWidth();
			const elH    = element.outerHeight();
			element.css('transform', savedTransform);

			// 0.5px 오차 허용: 경계선에 딱 걸쳤을 때 float 반올림으로 오판 방지
			const eps = 0.5;

			let cL = newLeft;
			let cT = newTop;

			// 좌측: 현재 좌측이 safeLeft 안쪽(≥)이면 좌측 제약 적용
			if (curPos.left >= safeLeft - eps)
				cL = Math.max(safeLeft, cL);

			// 우측: 현재 우측이 safeRight 안쪽(≤)이면 우측 제약 적용
			if ((curPos.left + elW) <= safeRight + eps)
				cL = Math.min(safeRight - elW, cL);

			// 상단: 현재 상단이 safeTop 안쪽(≥)이면 상단 제약 적용
			if (curPos.top >= safeTop - eps)
				cT = Math.max(safeTop, cT);

			// 하단: 현재 하단이 safeBottom 안쪽(≤)이면 하단 제약 적용
			if ((curPos.top + elH) <= safeBottom + eps)
				cT = Math.min(safeBottom - elH, cT);

			return { left: cL, top: cT };
		}

		// 회전 각도 먼저 확인 (transform 제거 전)
		const transform = element.css('transform');
		let rotation = 0;
		if (transform && transform !== 'none') {
			const matrix = transform.match(/matrix\(([^,]+),\s*([^,]+)/);
			if (matrix) {
				const a = parseFloat(matrix[1]);
				const b = parseFloat(matrix[2]);
				rotation = Math.atan2(b, a);
			}
		}

		// ✅ transform 임시 제거 후 원래 크기 측정
		element.css('transform', 'none');
		const originalWidth = element.outerWidth();
		const originalHeight = element.outerHeight();
		element.css('transform', transform);

		let constrainedLeft = newLeft;
		let constrainedTop = newTop;

		if (rotation !== 0) {
			// ✅ 회전된 경우: 바운딩 박스의 4개 꼭지점 기준으로 체크
			const cos = Math.cos(rotation);
			const sin = Math.sin(rotation);

			// 요소 중심점 (left/top 기준)
			const centerX = newLeft + originalWidth / 2;
			const centerY = newTop + originalHeight / 2;

			// 4개 꼭지점의 상대 좌표 (중심 기준)
			const corners = [
				{ x: -originalWidth / 2, y: -originalHeight / 2 }, // 좌상
				{ x: originalWidth / 2, y: -originalHeight / 2 },  // 우상
				{ x: originalWidth / 2, y: originalHeight / 2 },   // 우하
				{ x: -originalWidth / 2, y: originalHeight / 2 }   // 좌하
			];

			// 회전된 꼭지점의 실제 위치 계산
			let minX = Infinity, maxX = -Infinity;
			let minY = Infinity, maxY = -Infinity;

			corners.forEach(corner => {
				// 회전 적용
				const rotatedX = corner.x * cos - corner.y * sin + centerX;
				const rotatedY = corner.x * sin + corner.y * cos + centerY;

				minX = Math.min(minX, rotatedX);
				maxX = Math.max(maxX, rotatedX);
				minY = Math.min(minY, rotatedY);
				maxY = Math.max(maxY, rotatedY);
			});

			// 바운딩 박스가 안전 영역을 벗어나는 정도 계산
			const overflowLeft = safeLeft - minX;
			const overflowRight = maxX - safeRight;
			const overflowTop = safeTop - minY;
			const overflowBottom = maxY - safeBottom;

			// 벗어난 만큼 위치 보정
			if (overflowLeft > 0) {
				constrainedLeft = newLeft + overflowLeft;
			} else if (overflowRight > 0) {
				constrainedLeft = newLeft - overflowRight;
			}

			if (overflowTop > 0) {
				constrainedTop = newTop + overflowTop;
			} else if (overflowBottom > 0) {
				constrainedTop = newTop - overflowBottom;
			}
		} else {
			// 회전 없는 경우: 기존 로직
			const minLeft = safeLeft;
			const maxLeft = safeRight - originalWidth;
			const minTop = safeTop;
			const maxTop = safeBottom - originalHeight;

			constrainedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
			constrainedTop = Math.max(minTop, Math.min(newTop, maxTop));
		}

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

		// ✅ 정렬 플래그 방식으로 저장 (해상도 독립적)
		EventManager.saveElementPositionWithAlignment(element, 'center', null);
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

		// ✅ 정렬 플래그 방식으로 저장 (해상도 독립적)
		EventManager.saveElementPositionWithAlignment(element, null, 'center');
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

		// ✅ 정렬 플래그 방식으로 저장 (해상도 독립적)
		EventManager.saveElementPositionWithAlignment(element, 'center', 'center');
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
