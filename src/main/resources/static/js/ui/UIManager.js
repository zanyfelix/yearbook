// UIManager.js - UI 관리 클래스
class UIManager {

	// 모든 툴바 숨기기
	static hideAllToolbars() {
		$('#editor-toolbar .context-controls > div').addClass('d-none');
	}

	// 프레임 툴팁 표시
	static showFrameTooltip(frameGroup) {
		this.hideAllToolbars();
		$('#frame-controls').removeClass('d-none');
		this.bindFrameRotationEvents(frameGroup);
	}

	// 사진 툴팁 표시
	static showPhotoTooltip(photo, frameGroup) {
		this.hideAllToolbars();
		$('#photo-controls').removeClass('d-none');
		this.bindPhotoTooltipEvents(photo, frameGroup);
	}

	// 텍스트 툴팁 표시
	static showTextTooltip(textBox) {
		this.hideAllToolbars();
		$('#text-controls').removeClass('d-none');
		this.syncTextToolbar(textBox);
		this.bindTextTooltipEvents(textBox);
	}

	// Element 툴팁 표시
	static showElementTooltip(elementGroup) {
		this.hideAllToolbars();
		$('#element-controls').removeClass('d-none');
		this.bindElementTooltipEvents(elementGroup);
	}

	// 프레임 회전 이벤트 바인딩
	static bindFrameRotationEvents(frameGroup) {
		const rotationHandler = new RotationHandler(frameGroup);

		$('#frame-rotate-left').off('click').on('click', () => {
			rotationHandler.rotateLeft();
		});

		$('#frame-rotate-right').off('click').on('click', () => {
			rotationHandler.rotateRight();
		});

		$('#btn-delete-frame').off('click').on('click', () => {
			if (confirm("Do you want to delete the frame?")) {
				frameGroup.remove();
				window.selectionManager.clearSelection();
			}
		});
	}

	// 사진 툴팁 이벤트 바인딩
	static bindPhotoTooltipEvents(photo, frameGroup) {
		this.bindPhotoRotationEvents(photo);

		$('#btn-delete-photo').off('click').on('click', () => {
			if (confirm("Are you sure you want to delete the photo?")) {
				const placeholderLink = frameGroup.find('.place-image-here-link');
				photo.hide().attr('src', '');
				placeholderLink.show();
				window.selectionManager.clearSelection();
			}
		});
	}

	// 사진 회전 이벤트 바인딩
	static bindPhotoRotationEvents(photo) {
		const rotationHandler = new RotationHandler(photo);
		// ✨ 테두리와 실루엣을 미리 찾아 변수에 저장합니다.
		const $selectionBox = $('.photo-selection-box');
		const $silhouette = $('.photo-silhouette');

		$('#photo-rotate-left').off('click').on('click', () => {
			const newTransform = rotationHandler.rotateLeft(); // 완전한 transform 값을 받음
			// ✨ 테두리와 실루엣에도 완전한 transform 값을 적용합니다.
			$selectionBox.css('transform', newTransform);
			$silhouette.css('transform', newTransform);
		});

		$('#photo-rotate-right').off('click').on('click', () => {
			const newTransform = rotationHandler.rotateRight(); // 완전한 transform 값을 받음
			// ✨ 테두리와 실루엣에도 완전한 transform 값을 적용합니다.
			$selectionBox.css('transform', newTransform);
			$silhouette.css('transform', newTransform);
		});
	}

	// 텍스트 툴바 동기화
	static syncTextToolbar(textBox) {
		const currentSize = textBox.data('originalFontSize') || this.getDefaultFontSize(textBox);
		const currentAlign = this.normalizeTextAlign(textBox.css('text-align'));
		const currentColor = this.rgbToHex(textBox.css('color'));

		$('#tooltip-size').val(currentSize);
		$('#tooltip-align').val(currentAlign);
		$('#tooltip-color').val(currentColor);
	}

	// 기본 폰트 크기 가져오기
	static getDefaultFontSize(textBox) {
		const textContent = textBox.text();
		if (textContent.includes('Title') && !textContent.includes('Sub-Title')) {
			return '24px';
		} else if (textContent.includes('Sub-Title')) {
			return '16px';
		}
		return '12px';
	}

	// 텍스트 정렬 정규화
	static normalizeTextAlign(align) {
		return align === 'start' ? 'left' : (align || 'left');
	}

	// RGB를 HEX로 변환
	static rgbToHex(rgb) {
		if (!rgb || !rgb.startsWith('rgb')) return rgb;

		const values = rgb.split("(")[1].split(")")[0].split(",");
		return "#" + values.map(x => {
			const hex = parseInt(x).toString(16);
			return hex.length === 1 ? "0" + hex : hex;
		}).join("");
	}

	// 텍스트 툴팁 이벤트 바인딩
	static bindTextTooltipEvents(textBox) {
		$('#tooltip-color, #tooltip-size, #tooltip-align, #tooltip-remove').off();

		this.bindTextRotationEvents(textBox);

		$('#tooltip-color').on('input', function() {
			textBox.css('color', $(this).val());
		});

		// ✅ TextManager의 updateFontSize 사용
		$('#tooltip-size').on('change', function() {
			TextManager.updateFontSize($(this).val());
		});

		$('#tooltip-align').on('change', function() {
			TextManager.updateTextAlign($(this).val());
		});

		$('#tooltip-remove').on('click', function() {
			if (confirm('Do you want to delete the text box?')) {
				textBox.remove();
				window.selectionManager.clearSelection();
			}
		});
	}

	// 텍스트 회전 이벤트 바인딩
	static bindTextRotationEvents(textBox) {
		$('#text-rotate-left, #text-rotate-right').off('click');

		const rotationHandler = new RotationHandler(textBox);

		$('#text-rotate-left').on('click', () => {
			const newRotation = rotationHandler.rotateLeft();
			this.saveTextBoxRotation(textBox, newRotation);
		});

		$('#text-rotate-right').on('click', () => {
			const newRotation = rotationHandler.rotateRight();
			this.saveTextBoxRotation(textBox, newRotation);
		});
	}

	// 텍스트박스 회전 저장
	static saveTextBoxRotation(textBox, rotation) {
		const currentState = textBox.data('relativeState') || {};
		currentState.transform = `rotate(${rotation}deg)`;
		textBox.data('relativeState', currentState);
	}

	// Element 툴팁 이벤트 바인딩
	static bindElementTooltipEvents(elementGroup) {
		this.bindFrameRotationEvents(elementGroup);

		$('#btn-delete-element').off('click').on('click', function() {
			if (confirm("Do you want to delete the element?")) {
				elementGroup.remove();
				window.selectionManager.clearSelection();
			}
		});
	}

	// 요소 위치 업데이트
	static updateElementPosition($element) {
		const relativeState = $element.data('relativeState');
		if (!relativeState) return;

		const bg = $('#page-preview-img');
		const bgWidth = bg.width();
		const bgHeight = bg.height();

		const newPixelPos = {
			left: (relativeState.position.left / 100) * bgWidth,
			top: (relativeState.position.top / 100) * bgHeight,
		};

		const newPixelSize = {
			width: (relativeState.size.width / 100) * bgWidth,
			height: (relativeState.size.height / 100) * bgHeight,
		};

		$element.css({
			...newPixelPos,
			...newPixelSize,
			transform: relativeState.transform
		});

		if ($element.hasClass('selected-photo')) {
			PhotoManager.updateSelectionUI($element);
		}
	}

	// 모든 위치 업데이트
	static updateAllPositions() {
		$('#frame-container .frame-group, #frame-container .text-box').each(function() {
			UIManager.updateElementPosition($(this));
		});
	}
}

// 회전 핸들러 클래스
class RotationHandler {
	constructor(element) {
		this.element = element;
	}

	getCurrentRotation() {
		const currentTransform = this.element.css('transform');

		if (!currentTransform || currentTransform === 'none') {
			return 0;
		}

		// rotate(Xdeg) 형태 파싱
		const rotateMatch = currentTransform.match(/rotate\(([-+]?\d*\.?\d+)(deg|rad)?\)/i);
		if (rotateMatch && rotateMatch[1]) {
			let angle = parseFloat(rotateMatch[1]);
			if (rotateMatch[2] === 'rad') {
				angle = angle * (180 / Math.PI);
			}
			return Math.round((angle % 360 + 360) % 360);
		}

		// matrix() 형태 파싱
		const matrixMatch = currentTransform.match(/matrix\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)/);
		if (matrixMatch) {
			const a = parseFloat(matrixMatch[1]);
			const b = parseFloat(matrixMatch[2]);
			const angleRad = Math.atan2(b, a);
			const angleDeg = angleRad * (180 / Math.PI);
			return Math.round((angleDeg % 360 + 360) % 360);
		}

		return 0;
	}

	snapAngleLeft(angle) {
		// 정확한 90도 단위로 스냅
		if (angle === 0 || angle === 360) return 270;
		if (angle === 90) return 0;
		if (angle === 180) return 90;
		if (angle === 270) return 180;

		// 근사값 처리
		if (angle > 0 && angle < 90) return 0;
		if (angle > 90 && angle < 180) return 90;
		if (angle > 180 && angle < 270) return 180;
		if (angle > 270 && angle < 360) return 270;

		return 0;
	}

	snapAngleRight(angle) {
		// 정확한 90도 단위로 스냅
		if (angle === 0 || angle === 360) return 90;
		if (angle === 90) return 180;
		if (angle === 180) return 270;
		if (angle === 270) return 0;

		// 근사값 처리
		if (angle > 0 && angle < 90) return 90;
		if (angle > 90 && angle < 180) return 180;
		if (angle > 180 && angle < 270) return 270;
		if (angle > 270 && angle < 360) return 0;

		return 90;
	}

	rotateLeft() {
		const currentTransform = this.element.css('transform');
		const translate = window.getTranslateValues(currentTransform);
		const currentRotation = this.getCurrentRotation();
		const newRotation = this.snapAngleLeft(currentRotation);
		const newTransform = `translate(${translate.x}px, ${translate.y}px) rotate(${newRotation}deg)`;
		this.element.css('transform', newTransform);
		return newTransform; // ✨ 수정: newTransform 값을 반환
	}

	rotateRight() {
		const currentTransform = this.element.css('transform');
		const translate = window.getTranslateValues(currentTransform);
		const currentRotation = this.getCurrentRotation();
		const newRotation = this.snapAngleRight(currentRotation);
		const newTransform = `translate(${translate.x}px, ${translate.y}px) rotate(${newRotation}deg)`;
		this.element.css('transform', newTransform);
		return newTransform; // ✨ 수정: newTransform 값을 반환
	}
}