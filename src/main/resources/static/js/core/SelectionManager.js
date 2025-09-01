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

		// ✅ [핵심 수정] 통합된 폰트 크기 관리
		// 1. base-font-size가 우선, 없으면 현재 CSS에서 추출
		let baseFontSize = textBox.data('base-font-size');

		if (!baseFontSize) {
			// CSS 폰트 크기에서 기본 크기 역계산
			const currentCssSize = parseInt(textBox.css('font-size'));
			const bg = $('#page-preview-img');
			const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

			if (actualBgRect) {
				const TEMPLATE_WEB_BG_WIDTH = 786;
				const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
				baseFontSize = Math.round(currentCssSize / scaleRatio);
			} else {
				baseFontSize = currentCssSize;
			}

			// 계산된 기본 크기를 저장
			textBox.data('base-font-size', baseFontSize);
		}

		// 2. 다른 스타일 속성들 가져오기
		const currentFontFamily = textBox.data('savedFontFamily') ||
			textBox.css('font-family').split(',')[0].replace(/['"]/g, '').trim();
		const currentTextAlign = textBox.css('text-align');
		const currentColor = textBox.css('color');

		// 3. 툴바에 값들 설정 (약간 지연시켜 DOM 업데이트 보장)
		setTimeout(() => {
			$('#tooltip-size').val(baseFontSize);
			$('#tooltip-font').val(currentFontFamily);
			$('#tooltip-align').val(currentTextAlign || 'left');

			// 색상은 hex로 변환
			if (typeof rgbToHex === "function") {
				$('#tooltip-color').val(rgbToHex(currentColor));
			}
		}, 50);

		// 4. 리사이즈 이벤트 바인딩
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