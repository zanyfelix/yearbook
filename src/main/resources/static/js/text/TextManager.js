// TextManager.js - 텍스트 관리 클래스
class TextManager {

	static TEXT_TYPE_SIZES = {
		'Title': 24,
		'Sub-Title': 16,
		'text': 12
	};
	// 텍스트박스 추가
	static addTextBox(param) {
		if (!DataLoader.fontsLoaded) {
			console.log('폰트 로드 대기 중...');
			DataLoader.loadAndSetupFonts();
			setTimeout(() => this.addTextBox(param), 1000);
			return;
		}

		const selectedFont = this.getFontToApply();
		const textStyles = this.createTextStyles(param, selectedFont);
		const textBox = this.createTextBoxElement(param, textStyles);

		$('#frame-container').append(textBox);
		this.setTextBoxPosition(textBox, param);
		this.saveTextBoxData(textBox, textStyles, selectedFont, param);

		EventManager.setupTextEvents(textBox);
		window.selectionManager.selectTextBox(textBox);
		if (window.textPreviewManager) {
			window.textPreviewManager.registerTextBox(textBox);
			window.textPreviewManager.queuePreview(textBox, 'New text box added. Click Text Save to create the preview image.');
		}

		this.updateUIControls(textStyles, selectedFont, param);
	}

	// 텍스트 스타일 생성
	static createTextStyles(param, selectedFont) {
		const styles = {
			position: 'absolute',
			zIndex: 100,
			padding: '10px',
			visibility: 'hidden',
			transform: 'none',
			transformOrigin: '50% 50%',
			textAlign: 'left'
		};

		if (selectedFont) {
			styles['font-family'] = selectedFont;
		}

		styles['font-weight'] = (param === 'Title') ? 'bold' : 'normal';

		// 기본 크기 설정 (타입별 고정)
		const baseFontSize = this.getBaseFontSize(param);

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (actualBgRect) {
			const TEMPLATE_WEB_BG_WIDTH = 786;
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
			styles['font-size'] = Math.round(baseFontSize * scaleRatio) + 'px';
		} else {
			styles['font-size'] = baseFontSize + 'px';
		}

		return styles;
	}

	// 기본 폰트 크기 가져오기
	static getBaseFontSize(param) {
		return this.TEXT_TYPE_SIZES[param] || 12;
	}

	// 텍스트박스 엘리먼트 생성
	static createTextBoxElement(param, styles) {
		const textBox = $('<div class="text-box" contenteditable="false"></div>').css(styles);
		if (window.setTextBoxHtml) {
			window.setTextBoxHtml(textBox, `Enter ${param} Here`);
		} else {
			textBox.text('Enter ' + param + ' Here');
		}
		return textBox;
	}

	// 텍스트박스 위치 설정
	static setTextBoxPosition(textBox, param) {
		const bg = $('#page-preview-img');
		const bgPos = bg.position();
		if (!bgPos) return;

		const bgWidth = bg.width();
		const bgHeight = bg.height();
		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

		const newLeft = bgPos.left + (bgWidth - boxWidth) / 2;

		const positions = {
			'Title': bgPos.top + (bgHeight * 0.01),
			'Sub-Title': bgPos.top + (bgHeight * 0.1),
			'text': bgPos.top + (bgHeight - boxHeight) / 2
		};

		const newTop = positions[param] || positions['text'];

		textBox.css({
			top: `${newTop}px`,
			left: `${newLeft}px`,
			visibility: 'visible'
		});
	}

	// 텍스트박스 데이터 저장
	static saveTextBoxData(textBox, styles, selectedFont, param) {
		// param으로 넘어온 'Title', 'Sub-Title' 등을 이용해 순수 기본 크기를 가져옵니다.
		const baseFontSize = this.getBaseFontSize(param);

		// ✅ [핵심 수정] 모든 폰트 크기 관련 데이터를 통일
		textBox.data('base-font-size', baseFontSize);
		textBox.data('text-type', param); // 타입 정보 저장
		textBox.data('savedFontFamily', selectedFont);

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (actualBgRect) {
			const relativeState = this.calculateRelativeState(textBox, actualBgRect);
			textBox.data('relativeState', relativeState);
		}
	}

	// UI 컨트롤 업데이트
	static updateUIControls(styles, selectedFont, param) {
		setTimeout(() => {
			if (selectedFont) {
				$('#tooltip-font').val(selectedFont);
			}

			// 타입별 고정 크기 표시
			const baseFontSize = this.getBaseFontSize(param);
			$('#tooltip-size').val(baseFontSize);

			// 정렬 컨트롤 설정
			if (styles['textAlign']) {
				$('#tooltip-align').val(styles['textAlign']);
			}
		}, 150);
	}

	/**
		 * [신규 추가] 선택된 텍스트박스의 현재 상태에 맞춰 UI 컨트롤(툴팁)을 업데이트합니다.
		 * @param {jQuery} $textBox - 선택된 텍스트박스 요소
		 */
	static updateUIFromSelectedTextBox($textBox) {
		if (!$textBox || $textBox.length === 0) return;

		setTimeout(() => {
			// 저장된 폰트 패밀리 설정
			const fontFamily = $textBox.data('savedFontFamily');
			if (fontFamily) {
				$('#tooltip-font').val(fontFamily);
			}

			// 폰트 크기 설정
			const baseFontSize = $textBox.data('base-font-size');
			if (baseFontSize) {
				// Select 옵션에서 찾기
				const selectOption = $('#tooltip-size-select option[value="' + baseFontSize + '"]');

				if (selectOption.length) {
					// 정확한 값이 있으면 Select만 표시
					$('#tooltip-size-select').val(baseFontSize);
					$('#tooltip-size').addClass('d-none');
				} else {
					// Custom 값이면 Input 표시
					$('#tooltip-size-select').val('');
					$('#tooltip-size').removeClass('d-none').val(baseFontSize);
				}
			}

			// 텍스트 정렬 설정
			const textAlign = $textBox.css('text-align');
			$('#tooltip-align').val(textAlign);

			// 텍스트 색상 설정
			const color = $textBox.css('color');
			// $('#tooltip-color').val(rgbToHex(color));
		}, 150);
	}

	// 상대 위치 계산
	static calculateRelativeState(textBox, actualBgRect) {
		const currentTransform = textBox.css('transform');
		const currentTransformOrigin = textBox.css('transform-origin');

		// transform 임시 제거
		textBox.css('transform', 'none');

		const position = textBox.position();
		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

		// ⭐ 즉시 복원 (조건문 없이)
		textBox.css({
			'transform': currentTransform,
			'transform-origin': currentTransformOrigin
		});

		const relativeState = {
			position: {
				left: ((position.left - actualBgRect.left) / actualBgRect.width) * 100,
				top: ((position.top - actualBgRect.top) / actualBgRect.height) * 100
			},
			size: {
				width: (boxWidth / actualBgRect.width) * 100,
				height: (boxHeight / actualBgRect.height) * 100
			},
			transform: currentTransform || 'none',
			transformOrigin: currentTransformOrigin || '50% 50%'
		};

		// ✅ 기존 alignment 정보 보존 (폰트 변경 등으로 인한 center alignment 유실 방지)
		const existingState = textBox.data('relativeState') || {};
		if (existingState.alignment) {
			relativeState.alignment = existingState.alignment;
		}
		if (existingState.alignmentBounds) {
			relativeState.alignmentBounds = existingState.alignmentBounds;
		}

		return relativeState;
	}

	// 텍스트박스 상태 업데이트
	static updateTextBoxState($textBox) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		const newRelativeState = this.calculateRelativeState($textBox, actualBgRect);
		$textBox.data('relativeState', newRelativeState);
	}

	// 적용할 폰트 결정
	static getFontToApply() {
		const fontSelect = $('#tooltip-font');
		const firstOption = fontSelect.find('option:first').val();
		return (firstOption && firstOption.trim() !== '') ? firstOption : null;
	}

	// 폰트 크기 변경
	static updateFontSize(fontSize) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (!selectedBox || selectedBox.length === 0) return;


		// ✨ 입력값 검증 및 정제
		let numericSize = parseInt(fontSize);

		// 유효성 검사: 숫자가 아니거나 범위를 벗어난 경우
		if (isNaN(numericSize)) {
			console.warn('유효하지 않은 폰트 크기:', fontSize);
			return;
		}

		// 최소/최대값 제한
		numericSize = Math.max(8, Math.min(200, numericSize)); // 8px ~ 200px 범위로 제한

		// ⭐ transform과 관련 데이터 모두 저장
		const savedTransform = selectedBox.css('transform');
		const savedTransformOrigin = selectedBox.css('transform-origin');
		const savedRelativeState = selectedBox.data('relativeState');

		selectedBox.data('base-font-size', numericSize);

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		let scaledFontSize;
		if (actualBgRect) {
			const TEMPLATE_WEB_BG_WIDTH = 786;
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
			// ✅ updateElementPosition과 동일한 공식 사용 (소수 1자리)
			// Math.round(x)만 쓰면 정수로 반올림되어 updateElementPosition의 결과와 달라짐
			// → 재선택 시 font-size가 미세하게 달라져 텍스트·박스가 축소되는 버그 발생
			scaledFontSize = Math.round(numericSize * scaleRatio * 10) / 10;
		} else {
			scaledFontSize = numericSize;
		}

		// 폰트 크기 적용
		selectedBox.css('font-size', scaledFontSize + 'px');
		const shouldPreservePreviewGeometry = !!selectedBox.data('renderImagePath');
		if (shouldPreservePreviewGeometry) {
			$('#tooltip-size').val(numericSize);
			if (window.textPreviewManager) {
				window.textPreviewManager.onTextStyleChanged(selectedBox);
			}
			return;
		}

		// ⭐ resize 이벤트 임시 비활성화
		selectedBox.off('resize.selection');

		// 크기 조정
		this.adjustBoxSizeForLineBreaks(selectedBox);

		// ✅ center alignment 시 폰트 변경 후 시각적 재중앙 정렬
		// (adjustBoxSizeForLineBreaks가 width를 변경하므로, 중앙 기준으로 left 재계산)
		if (savedRelativeState?.alignment?.horizontal === 'center' && actualBgRect) {
			const newBoxWidth = selectedBox.outerWidth();
			const centerXRatio = savedRelativeState.alignmentBounds?.centerX ?? 50;
			const centerXPx = actualBgRect.left + (actualBgRect.width * centerXRatio) / 100;
			selectedBox.css('left', (centerXPx - newBoxWidth / 2) + 'px');
		}

		// ⭐ transform 확실히 복원
		selectedBox.css({
			'transform': savedTransform,
			'transform-origin': savedTransformOrigin
		});

		// ⭐ relativeState도 회전 정보를 유지하도록 업데이트
		// ✅ calculateRelativeState()가 기존 alignment 정보를 보존하므로 별도 복사 불필요
		if (savedRelativeState && savedRelativeState.rotation !== undefined) {
			const newRelativeState = this.calculateRelativeState(selectedBox, actualBgRect);
			newRelativeState.rotation = savedRelativeState.rotation;
			newRelativeState.translateX = savedRelativeState.translateX;
			newRelativeState.translateY = savedRelativeState.translateY;
			selectedBox.data('relativeState', newRelativeState);
		} else {
			this.updateTextBoxState(selectedBox);
		}

		// ⭐ transform 한번 더 복원 (안전장치)
		selectedBox.css({
			'transform': savedTransform,
			'transform-origin': savedTransformOrigin
		});

		// ⭐ resize 이벤트 재활성화
		if (selectedBox.hasClass('selected')) {
			selectedBox.on('resize.selection', () => {
				if (selectedBox.hasClass('selected')) {
					window.selectionManager.addTextRotationHandle(selectedBox);
				}
			});
		}

		$('#tooltip-size').val(numericSize);
		if (window.textPreviewManager) {
			window.textPreviewManager.onTextStyleChanged(selectedBox);
		}
	}

	// 새로운 메서드: 줄바꿈을 유지하면서 박스 크기 조정
	// ✅ measureTextBoxContentSize() 통합: +2 vs +15 버퍼 불일치 제거, center alignment 오차 방지
	static adjustBoxSizeForLineBreaks(textBox) {
		const fontSize = parseFloat(textBox.css('font-size'));

		if (window.measureTextBoxContentSize) {
			// ✅ main.js의 측정 함수 공유: 버퍼(+15), 줄 추출 로직, strippedHtml 처리 모두 일치
			const measuredSize = window.measureTextBoxContentSize(textBox, fontSize);

			// 줄바꿈 여부 판정 (white-space 설정에 사용)
			const rawHtml = window.getTextBoxHtml ? window.getTextBoxHtml(textBox) : textBox.html();
			const htmlContent = rawHtml.replace(/<div class="text-rotate-(?:handle|line)"[^>]*><\/div>/g, '');
			const strippedHtmlForCheck = htmlContent
				.replace(/<br\s*\/?>\s*$/gi, '')
				.replace(/(<div>\s*<br\s*\/?>\s*<\/div>\s*)+$/gi, '')
				.replace(/<div>\s*<\/div>\s*$/gi, '');
			const hasLineBreaks = strippedHtmlForCheck.includes('<br>') || strippedHtmlForCheck.includes('<div>');

			textBox.css({
				'width': measuredSize.width + 'px',
				'height': measuredSize.height + 'px',
				'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap',
				'word-break': hasLineBreaks ? 'keep-all' : 'normal',
				'overflow-wrap': 'normal'
			});
		} else {
			// fallback: measureTextBoxContentSize 미로드 시
			this.resizeTextBox(textBox, textBox.css('font-size'));
		}
	}

	// resizeTextBox는 줄바꿈 없는 경우에만 사용
	static resizeTextBox(textBox, fontSize) {
		const htmlContent = window.getTextBoxHtml ? window.getTextBoxHtml(textBox) : textBox.html();

		// 현재 transform 저장
		const currentTransform = textBox.css('transform');
		const currentTransformOrigin = textBox.css('transform-origin');

		const $temp = $('<div>')
			.html(htmlContent || ' ')
			.css({
				'position': 'absolute',
				'visibility': 'hidden',
				'white-space': 'nowrap',
				'font-size': fontSize,
				'font-family': textBox.css('font-family'),
				'font-weight': textBox.css('font-weight'),
				'padding': textBox.css('padding')
			});

		$('body').append($temp);
		const newWidth = $temp.outerWidth();
		const newHeight = $temp.outerHeight();
		$temp.remove();

		textBox.css({
			'width': newWidth + 'px',
			'height': newHeight + 'px',
			'white-space': 'nowrap',
			// ⭐ 중요: transform 유지
			'transform': currentTransform,
			'transform-origin': currentTransformOrigin
		});
	}

	// 텍스트 정렬 변경
	static updateTextAlign(alignment) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (selectedBox && selectedBox.length > 0) {
			selectedBox.css('text-align', alignment);
			if (window.textPreviewManager) {
				window.textPreviewManager.onTextStyleChanged(selectedBox);
			}
		}
	}

	// 텍스트 색상 변경
	static updateTextColor(color) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (selectedBox && selectedBox.length > 0) {
			if (window.textPreviewManager && typeof window.textPreviewManager.updateDraftState === 'function') {
				window.textPreviewManager.updateDraftState(selectedBox, { color: color });
				return;
			}
			selectedBox.css('color', color);
			if (window.textPreviewManager) {
				window.textPreviewManager.onTextStyleChanged(selectedBox);
			}
		}
	}

	// 폰트 패밀리 변경
	static updateFontFamily(fontFamily) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (!selectedBox || selectedBox.length === 0) return;

		selectedBox.css('font-family', fontFamily);
		selectedBox.data('savedFontFamily', fontFamily);
		if (window.textPreviewManager) {
			window.textPreviewManager.onTextStyleChanged(selectedBox);
		}
	}

	// 폰트 로드 완료 처리
	static onFontsLoaded() {
		const fontSelect = $('#tooltip-font');
		const firstFont = fontSelect.find('option:first').val();
		if (firstFont) {
			fontSelect.val(firstFont);
		}
	}
}

// 초기화 및 이벤트 리스너
$(document).ready(function() {
	// 폰트 로드 완료 후 처리
	const originalSetupFontEventListeners = DataLoader.setupFontEventListeners;
	DataLoader.setupFontEventListeners = function() {
		originalSetupFontEventListeners.call(this);
		TextManager.onFontsLoaded();
		if (window.textPreviewManager) {
			window.textPreviewManager.syncFontOptionsFromToolbar();
		}
	};

	// Select 변경 이벤트
	$('#tooltip-size-select').on('change', function() {
		const value = $(this).val();

		if (value === '') {
			// Custom 선택 시 Input 표시
			$('#tooltip-size').removeClass('d-none').focus();

			// 현재 텍스트박스의 폰트 크기를 Input에 설정
			const selectedBox = DataLoader.getCurrentSelectedTextBox();
			if (selectedBox && selectedBox.length > 0) {
				const currentSize = selectedBox.data('base-font-size') || 12;
				$('#tooltip-size').val(currentSize);
			}
		} else {
			// 특정 크기 선택 시 Input 숨김
			$('#tooltip-size').addClass('d-none');
			TextManager.updateFontSize(value);
		}
	});

	// Input 직접 입력
	$('#tooltip-size').on('input', function() {
		const value = $(this).val();

		clearTimeout(window.fontSizeTimer);
		window.fontSizeTimer = setTimeout(() => {
			if (value && !isNaN(value)) {
				TextManager.updateFontSize(value);
			}
		}, 300);
	});

	// Enter 키 입력 시 즉시 적용
	$('#tooltip-size').on('keypress', function(e) {
		if (e.which === 13) {
			e.preventDefault();
			const value = $(this).val();
			if (value && !isNaN(value)) {
				clearTimeout(window.fontSizeTimer);
				TextManager.updateFontSize(value);
			}
		}
	});

	// 포커스 아웃 시 적용
	$('#tooltip-size').on('blur', function() {
		const value = $(this).val();
		if (value && !isNaN(value)) {
			clearTimeout(window.fontSizeTimer);
			TextManager.updateFontSize(value);

			// Input 숨기기 (옵션: 값 적용 후 자동으로 숨길지 여부)
			// $(this).addClass('d-none');
		}
	});

	$('#tooltip-align').on('change', function() {
		TextManager.updateTextAlign($(this).val());
	});

	$('#tooltip-color').on('change', function() {
		TextManager.updateTextColor($(this).val());
	});

	$('#tooltip-font').on('change', function() {
		TextManager.updateFontFamily($(this).val());
	});
});

// 헬퍼 함수
function restoreTextBoxWithAutoSize(textBox) {
	const relativeState = textBox.data('relativeState');

	if (relativeState && relativeState.size) {
		if (relativeState.size.autoSize) {
			textBox.css({
				'width': 'auto',
				'height': 'auto',
				'white-space': 'nowrap',
				'min-width': '50px'
			});

			setTimeout(() => autoResizeTextBox(textBox), 10);
		} else {
			const bg = $('#page-preview-img');
			const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

			if (actualBgRect) {
				textBox.css({
					'width': (relativeState.size.width * actualBgRect.width / 100) + 'px',
					'height': (relativeState.size.height * actualBgRect.height / 100) + 'px'
				});
			}
		}
	}
}

function autoResizeTextBox($box) {
	const $temp = $('<span>')
		.text($box.text() || ' ')
		.css({
			'font-size': $box.css('font-size'),
			'font-family': $box.css('font-family'),
			'font-weight': $box.css('font-weight'),
			'white-space': 'nowrap',
			'position': 'absolute',
			'visibility': 'hidden'
		});

	$('body').append($temp);
	const textWidth = $temp.width() + 20;
	const textHeight = $temp.height() + 16;
	$temp.remove();

	$box.css({
		'width': 'auto',
		'min-width': textWidth + 'px',
		'height': 'auto',
		'min-height': textHeight + 'px'
	});
}
