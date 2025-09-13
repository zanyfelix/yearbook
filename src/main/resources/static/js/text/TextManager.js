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
		return $('<div class="text-box" contenteditable="true"></div>')
			.text('Enter ' + param + ' Here')
			.css(styles);
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

	// 상대 위치 계산
	static calculateRelativeState(textBox, actualBgRect) {
		const currentTransform = textBox.css('transform');
		textBox.css('transform', 'none');

		const position = textBox.position();
		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

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
			transformOrigin: textBox.css('transform-origin') || '50% 50%'
		};

		if (currentTransform && currentTransform !== 'none') {
			textBox.css('transform', currentTransform);
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

		const numericSize = parseInt(fontSize);
		selectedBox.data('base-font-size', numericSize);

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		let scaledFontSize;
		if (actualBgRect) {
			const TEMPLATE_WEB_BG_WIDTH = 786;
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
			scaledFontSize = Math.round(numericSize * scaleRatio);
		} else {
			scaledFontSize = numericSize;
		}

		// 폰트 크기 적용
		selectedBox.css('font-size', scaledFontSize + 'px');

		// 줄바꿈 구조를 유지하면서 크기 조정
		this.adjustBoxSizeForLineBreaks(selectedBox);

		if (selectedBox.hasClass('selected')) {
			selectedBox.trigger('resize');
		}

		setTimeout(() => this.updateTextBoxState(selectedBox), 50);
	}

	// 새로운 메서드: 줄바꿈을 유지하면서 박스 크기 조정
	static adjustBoxSizeForLineBreaks(textBox) {
		const htmlContent = textBox.html();
		const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');

		if (hasLineBreaks) {
			// 변경 전 상태 저장
			const oldWidth = textBox.outerWidth();
			const oldHeight = textBox.outerHeight();
			const currentTransform = textBox.css('transform');
			const hasRotation = currentTransform &&
				currentTransform !== 'none' &&
				currentTransform !== 'matrix(1, 0, 0, 1, 0, 0)';

			// 회전된 경우 현재 중심점 저장
			let oldCenterX, oldCenterY;
			if (hasRotation) {
				const rect = textBox[0].getBoundingClientRect();
				oldCenterX = rect.left + rect.width / 2;
				oldCenterY = rect.top + rect.height / 2;

				// 기존 transform-origin을 픽셀로 고정 (이전 크기 기준)
				textBox.css('transform-origin', `${oldWidth / 2}px ${oldHeight / 2}px`);
			}

			// 각 줄을 개별적으로 추출
			let lines = [];
			const tempDiv = $('<div>').html(htmlContent);

			if (htmlContent.includes('<div>')) {
				const firstLineText = tempDiv.contents().filter(function() {
					return this.nodeType === 3;
				}).text();
				if (firstLineText.trim()) lines.push(firstLineText);

				tempDiv.find('div').each(function() {
					lines.push($(this).text() || '\u00A0');
				});
			}
			else if (htmlContent.includes('<br>')) {
				const parts = htmlContent.split('<br>');
				parts.forEach(part => {
					const text = $('<div>').html(part).text();
					lines.push(text || '\u00A0');
				});
			}

			// 가장 긴 줄의 너비 측정
			let maxWidth = 0;
			lines.forEach(line => {
				const $temp = $('<span>')
					.text(line || '\u00A0')
					.css({
						'position': 'absolute',
						'visibility': 'hidden',
						'white-space': 'nowrap',
						'font-size': textBox.css('font-size'),
						'font-family': textBox.css('font-family'),
						'font-weight': textBox.css('font-weight'),
						'letter-spacing': textBox.css('letter-spacing')
					});

				$('body').append($temp);
				maxWidth = Math.max(maxWidth, $temp.width());
				$temp.remove();
			});

			// 정확한 높이 측정
			const $heightTemp = $('<div>')
				.html(htmlContent)
				.css({
					'position': 'absolute',
					'visibility': 'hidden',
					'width': (maxWidth + 20) + 'px',
					'white-space': 'pre-wrap',
					'word-break': 'keep-all',
					'font-size': textBox.css('font-size'),
					'font-family': textBox.css('font-family'),
					'font-weight': textBox.css('font-weight'),
					'line-height': textBox.css('line-height'),
					'padding': textBox.css('padding'),
					'box-sizing': 'border-box'
				});

			$('body').append($heightTemp);
			const measuredHeight = $heightTemp.outerHeight();
			$heightTemp.remove();

			const padding = parseInt(textBox.css('padding')) || 10;
			const newWidth = maxWidth + padding * 2 + 5;
			const newHeight = measuredHeight;

			// 크기 적용
			textBox.css({
				'width': newWidth + 'px',
				'height': newHeight + 'px',
				'white-space': 'pre-wrap',
				'word-break': 'keep-all',
				'overflow-wrap': 'normal'
			});

			// 회전된 경우 위치 보정
			if (hasRotation) {
				// 크기 변경 후 새 중심점 계산
				const newRect = textBox[0].getBoundingClientRect();
				const newCenterX = newRect.left + newRect.width / 2;
				const newCenterY = newRect.top + newRect.height / 2;

				// 중심점 차이만큼 위치 조정
				const offsetX = oldCenterX - newCenterX;
				const offsetY = oldCenterY - newCenterY;

				const currentLeft = parseFloat(textBox.css('left'));
				const currentTop = parseFloat(textBox.css('top'));

				textBox.css({
					'left': (currentLeft + offsetX) + 'px',
					'top': (currentTop + offsetY) + 'px'
				});

				// transform-origin을 새 크기 기준 픽셀값으로 업데이트
				textBox.css('transform-origin', `${newWidth / 2}px ${newHeight / 2}px`);
			} else {
				// 회전 없으면 퍼센트 유지
				textBox.css('transform-origin', '50% 50%');
			}
		} else {
			this.resizeTextBox(textBox, textBox.css('font-size'));
		}
	}

	// resizeTextBox는 줄바꿈 없는 경우에만 사용
	static resizeTextBox(textBox, fontSize) {
		const htmlContent = textBox.html();

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
			'white-space': 'nowrap'
		});
	}

	// 텍스트 정렬 변경
	static updateTextAlign(alignment) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (selectedBox && selectedBox.length > 0) {
			selectedBox.css('text-align', alignment);
		}
	}

	// 텍스트 색상 변경
	static updateTextColor(color) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (selectedBox && selectedBox.length > 0) {
			selectedBox.css('color', color);
		}
	}

	// 폰트 패밀리 변경
	static updateFontFamily(fontFamily) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (selectedBox && selectedBox.length > 0) {
			selectedBox.css('font-family', fontFamily);
			selectedBox.data('savedFontFamily', fontFamily);
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
	};

	// 텍스트 컨트롤 이벤트
	$('#tooltip-size').on('change', function() {
		TextManager.updateFontSize($(this).val());
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