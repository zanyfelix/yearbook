// UIManager.js - UI 관리 클래스 (다중 선택 지원)
class UIManager {

	// 모든 툴바 숨기기
	static hideAllToolbars() {
		console.log('[UIManager] hideAllToolbars 호출');
		console.trace('[UIManager] 호출 스택:');
		
		$('#frame-controls').addClass('d-none');
		$('#photo-controls').addClass('d-none');
		$('#text-controls').addClass('d-none');
		$('#element-controls').addClass('d-none');
		// ✅ multi-selection-controls도 숨김
		$('#multi-selection-controls').addClass('d-none').css('display', '');
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

	// ========================================================================
	// 다중 선택 툴바 표시 (신규)
	// ========================================================================
	static showMultiSelectionToolbar(elements) {
		console.log('[UIManager] showMultiSelectionToolbar 호출, 요소 개수:', elements.length);
		
		// ✅ hideAllToolbars 대신 개별 툴바만 숨기기 (multi-selection-controls 제외)
		$('#frame-controls').addClass('d-none');
		$('#photo-controls').addClass('d-none');
		$('#text-controls').addClass('d-none');
		$('#element-controls').addClass('d-none');
		
		const $controls = $('#multi-selection-controls');
		
		// ✅ 명시적으로 표시
		$controls.removeClass('d-none').css('display', 'flex');
		console.log('[UIManager] 툴바 표시 완료, display:', $controls.css('display'));
		
		this.bindMultiSelectionEvents(elements);
		
		// 선택된 개수 표시
		$('#multi-selection-count').text(`${elements.length} selected`);
	}
	
	// ========================================================================
	// 다중 선택 이벤트 바인딩 (신규)
	// ========================================================================
	static bindMultiSelectionEvents(elements) {
		const self = this;
		
		// ✅ 정렬 버튼 클릭 시 이벤트 버블링 방지 (page-preview click handler의 clearSelection 호출 방지)
		// 정렬 버튼들
		$('#multi-align-left').off('click').on('click', (e) => {
			e.stopPropagation();
			console.log('[UIManager] multi-align-left 클릭');
			window.alignmentManager.alignLeft(elements);
		});
		
		$('#multi-align-center-h').off('click').on('click', (e) => {
			e.stopPropagation();
			window.alignmentManager.alignCenterH(elements);
		});
		
		$('#multi-align-right').off('click').on('click', (e) => {
			e.stopPropagation();
			console.log('[UIManager] multi-align-right 클릭');
			window.alignmentManager.alignRight(elements);
		});
		
		$('#multi-align-top').off('click').on('click', (e) => {
			e.stopPropagation();
			window.alignmentManager.alignTop(elements);
		});
		
		$('#multi-align-center-v').off('click').on('click', (e) => {
			e.stopPropagation();
			window.alignmentManager.alignCenterV(elements);
		});
		
		$('#multi-align-bottom').off('click').on('click', (e) => {
			e.stopPropagation();
			window.alignmentManager.alignBottom(elements);
		});
		
		// 균등 배분 버튼
		$('#multi-distribute-h').off('click').on('click', (e) => {
			e.stopPropagation();
			window.alignmentManager.distributeH(elements);
		});
		
		$('#multi-distribute-v').off('click').on('click', (e) => {
			e.stopPropagation();
			window.alignmentManager.distributeV(elements);
		});
		
		// 정렬 기준 토글
		$('#multi-align-base-toggle').off('click').on('click', function(e) {
			e.stopPropagation();
			const newBase = window.alignmentManager.toggleAlignmentBase();
			$(this).text(newBase === 'page' ? '페이지 기준' : '선택 기준');
			$(this).toggleClass('active', newBase === 'selection');
		});
		
		// 다중 삭제
		$('#multi-delete').off('click').on('click', (e) => {
			e.stopPropagation();
			const count = elements.length;
			self.showDeleteConfirmModal(`Do you want to delete ${count} element?`, () => {
				elements.forEach($el => $el.remove());
				window.multiSelectionManager.clearSelection();
			});
		});
	}

	// 삭제 확인 모달 표시 (공통 메서드)
	static showDeleteConfirmModal(message, deleteCallback) {
		$('#delete-confirm-message').text(message);

		const modalElement = document.getElementById('deleteConfirmModal');
		const modal = new bootstrap.Modal(modalElement, {
			backdrop: 'static',
			keyboard: false
		});

		$('#btn-delete-confirm').off('click');

		$('#btn-delete-confirm').on('click', () => {
			$('#btn-delete-confirm').prop('disabled', true);
			deleteCallback();
			modal.hide();

			setTimeout(() => {
				$('#btn-delete-confirm').prop('disabled', false);
			}, 500);
		});

		modalElement.addEventListener('hidden.bs.modal', function cleanup() {
			$('#btn-delete-confirm').off('click');
			modalElement.removeEventListener('hidden.bs.modal', cleanup);
		});

		modal.show();
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

		// 정렬 버튼
		$('#frame-align-left').off('click').on('click', () => {
			window.alignmentManager.alignLeft([frameGroup]);
		});
		
		$('#frame-align-h').off('click').on('click', () => {
			window.selectionManager.alignHorizontalCenter();
		});
		
		$('#frame-align-right').off('click').on('click', () => {
			window.alignmentManager.alignRight([frameGroup]);
		});
		
		$('#frame-align-top').off('click').on('click', () => {
			window.alignmentManager.alignTop([frameGroup]);
		});

		$('#frame-align-v').off('click').on('click', () => {
			window.selectionManager.alignVerticalCenter();
		});
		
		$('#frame-align-bottom').off('click').on('click', () => {
			window.alignmentManager.alignBottom([frameGroup]);
		});

		$('#frame-align-center').off('click').on('click', () => {
			window.selectionManager.alignCenter();
		});

		$('#btn-delete-frame').off('click').on('click', () => {
			this.showDeleteConfirmModal('Do you want to delete the frame?', () => {
				frameGroup.remove();
				window.selectionManager.clearSelection();
			});
		});
	}

	// 사진 툴팁 이벤트 바인딩
	static bindPhotoTooltipEvents(photo, frameGroup) {
		this.bindPhotoRotationEvents(photo);

		// ── 원본 사진 다운로드 버튼 ──────────────────────────────
		const originalPath = photo.data('originalPath');
		const $dlBtn = $('#btn-download-original');
		if (originalPath && originalPath.includes('/originals/')) {
			$dlBtn.prop('disabled', false);
		} else {
			$dlBtn.prop('disabled', true);
		}

		$dlBtn.off('click').on('click', () => {
			const src = photo.data('originalPath');
			if (!src || !src.includes('/originals/')) {
				alert('No original photo available for download.');
				return;
			}
			window.location.href = `${ctx}/edit/downloadOriginalPhoto?src=${encodeURIComponent(src)}`;
		});

		// ── 사진 삭제 버튼 ──────────────────────────────────────
		$('#btn-delete-photo').off('click').on('click', () => {
			this.showDeleteConfirmModal('Are you sure you want to delete the photo?', () => {
				const placeholderLink = frameGroup.find('.place-image-here-link');
				photo.hide().attr('src', '');
				placeholderLink.show();
				window.selectionManager.clearSelection();
			});
		});
	}

	// 사진 회전 이벤트 바인딩
	static bindPhotoRotationEvents(photo) {
		const rotationHandler = new RotationHandler(photo);
		const $selectionBox = $('.photo-selection-box');
		const $silhouette = $('.photo-silhouette');

		$('#photo-rotate-left').off('click').on('click', () => {
			const newTransform = rotationHandler.rotateLeft();
			$selectionBox.css('transform', newTransform);
			$silhouette.css('transform', newTransform);
		});

		$('#photo-rotate-right').off('click').on('click', () => {
			const newTransform = rotationHandler.rotateRight();
			$selectionBox.css('transform', newTransform);
			$silhouette.css('transform', newTransform);
		});
	}

	// 텍스트 툴바 동기화
	static syncTextToolbar(textBox) {
		const previewState = window.textPreviewManager
			&& typeof window.textPreviewManager.getEffectiveState === 'function'
			? window.textPreviewManager.getEffectiveState(textBox)
			: null;
		const currentSize = previewState?.baseFontSize
			|| textBox.data('originalFontSize')
			|| this.getDefaultFontSize(textBox);
		const currentAlign = previewState?.textAlign || this.normalizeTextAlign(textBox.css('text-align'));
		const currentColor = previewState?.color || this.rgbToHex(textBox.css('color'));

		const sizeValue = parseInt(currentSize);
		const selectOption = $('#tooltip-size-select option[value="' + sizeValue + '"]');

		if (selectOption.length) {
			$('#tooltip-size-select').val(sizeValue);
			$('#tooltip-size').addClass('d-none');
		} else {
			$('#tooltip-size-select').val('');
			$('#tooltip-size').removeClass('d-none').val(sizeValue || 12);
		}

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
			TextManager.updateTextColor($(this).val());
		});

		$('#tooltip-size').on('change', function() {
			TextManager.updateFontSize($(this).val());
		});

		$('#tooltip-align').on('change', function() {
			TextManager.updateTextAlign($(this).val());
		});

		// 정렬 버튼
		$('#text-align-left').off('click').on('click', () => {
			window.alignmentManager.alignLeft([textBox]);
		});
		
		$('#text-align-h').off('click').on('click', () => {
			window.selectionManager.alignHorizontalCenter();
		});
		
		$('#text-align-right').off('click').on('click', () => {
			window.alignmentManager.alignRight([textBox]);
		});
		
		$('#text-align-top').off('click').on('click', () => {
			window.alignmentManager.alignTop([textBox]);
		});

		$('#text-align-v').off('click').on('click', () => {
			window.selectionManager.alignVerticalCenter();
		});
		
		$('#text-align-bottom').off('click').on('click', () => {
			window.alignmentManager.alignBottom([textBox]);
		});

		$('#text-align-center').off('click').on('click', () => {
			window.selectionManager.alignCenter();
		});

		$('#tooltip-remove').on('click', () => {
			this.showDeleteConfirmModal('Do you want to delete the text box?', () => {
				textBox.remove();
				window.selectionManager.clearSelection();
			});
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
		const rotationHandler = new RotationHandler(elementGroup);

		$('#element-rotate-left').off('click').on('click', () => {
			rotationHandler.rotateLeft();
			EventManager.updateElementResizeCursors(elementGroup);
		});

		$('#element-rotate-right').off('click').on('click', () => {
			rotationHandler.rotateRight();
			EventManager.updateElementResizeCursors(elementGroup);
		});

		// 정렬 버튼
		$('#element-align-left').off('click').on('click', () => {
			window.alignmentManager.alignLeft([elementGroup]);
		});
		
		$('#element-align-h').off('click').on('click', () => {
			window.selectionManager.alignHorizontalCenter();
		});
		
		$('#element-align-right').off('click').on('click', () => {
			window.alignmentManager.alignRight([elementGroup]);
		});
		
		$('#element-align-top').off('click').on('click', () => {
			window.alignmentManager.alignTop([elementGroup]);
		});

		$('#element-align-v').off('click').on('click', () => {
			window.selectionManager.alignVerticalCenter();
		});
		
		$('#element-align-bottom').off('click').on('click', () => {
			window.alignmentManager.alignBottom([elementGroup]);
		});

		$('#element-align-center').off('click').on('click', () => {
			window.selectionManager.alignCenter();
		});

		$('#btn-delete-element').off('click').on('click', () => {
			this.showDeleteConfirmModal('Do you want to delete the element?', () => {
				elementGroup.remove();
				window.selectionManager.clearSelection();
			});
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

		const rotateMatch = currentTransform.match(/rotate\(([-+]?\d*\.?\d+)(deg|rad)?\)/i);
		if (rotateMatch && rotateMatch[1]) {
			let angle = parseFloat(rotateMatch[1]);
			if (rotateMatch[2] === 'rad') {
				angle = angle * (180 / Math.PI);
			}
			return Math.round((angle % 360 + 360) % 360);
		}

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
		if (angle === 0 || angle === 360) return 270;
		if (angle === 90) return 0;
		if (angle === 180) return 90;
		if (angle === 270) return 180;

		if (angle > 0 && angle < 90) return 0;
		if (angle > 90 && angle < 180) return 90;
		if (angle > 180 && angle < 270) return 180;
		if (angle > 270 && angle < 360) return 270;

		return 0;
	}

	snapAngleRight(angle) {
		if (angle === 0 || angle === 360) return 90;
		if (angle === 90) return 180;
		if (angle === 180) return 270;
		if (angle === 270) return 0;

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
		return newTransform;
	}

	rotateRight() {
		const currentTransform = this.element.css('transform');
		const translate = window.getTranslateValues(currentTransform);
		const currentRotation = this.getCurrentRotation();
		const newRotation = this.snapAngleRight(currentRotation);
		const newTransform = `translate(${translate.x}px, ${translate.y}px) rotate(${newRotation}deg)`;
		this.element.css('transform', newTransform);
		return newTransform;
	}
}
