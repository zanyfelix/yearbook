// ============================================================================
// 📁 js/text/TextManager.js
// ============================================================================
class TextManager {
    /**
     * 편집 영역에 새로운 텍스트 상자를 추가합니다.
     */
	static addTextBox(param) {
		let textStyles = {}; // 스타일을 담을 빈 객체 생성
		
		let baseFontSize = 12; // 기본값
		if (param === 'Title') {
			baseFontSize = 24;
			textStyles['font-weight'] = 'bold';
		} else if (param === 'Sub-Title') {
			baseFontSize = 16;
			textStyles['font-weight'] = 'normal';
		} else if (param === 'text') {
			baseFontSize = 12;
			textStyles['font-weight'] = 'normal';
		}
		
		// ✨ 배경 이미지 비율 계산 추가
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (actualBgRect) {
			// 편집용 웹 배경의 원본 크기 (FrameManager와 동일한 상수 사용)
			const TEMPLATE_WEB_BG_WIDTH = 786;

			// 현재 표시되는 배경의 비율 계산
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;

			// 폰트 크기를 비율에 맞게 조정
			const adjustedFontSize = Math.round(baseFontSize * scaleRatio);
			textStyles['font-size'] = adjustedFontSize + 'px';
		} else {
			// 배경 정보를 얻을 수 없는 경우 기본값 사용
			textStyles['font-size'] = baseFontSize + 'px';
		}

		const textBox = $('<div class="text-box" contenteditable="true"></div>')
			.text('Enter ' + param + ' Here') // 이전 수정사항 반영
			.css({
				position: 'absolute',
				zIndex: 100,
				padding: '10px',
				visibility: 'hidden',
				...textStyles // ✨ 위에서 정의한 스타일 객체를 여기에 적용
			});

		// (이하 위치 계산 및 이벤트 설정 로직은 기존과 동일합니다)
		$('#frame-container').append(textBox);

		const bgPos = bg.position();
		if (!bgPos) return;

		const bgWidth = bg.width();
		const bgHeight = bg.height();

		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

		const newLeft = bgPos.left + (bgWidth - boxWidth) / 2;
		const newTop = bgPos.top + (bgHeight - boxHeight) / 2;
		
		$('#frame-container').append(textBox);

		textBox.css({
			top: `${newTop}px`,
			left: `${newLeft}px`,
			visibility: 'visible'
		});

		// ✨ 원본 폰트 크기와 relativeState 저장
		textBox.data('originalFontSize', baseFontSize + 'px');

		if (actualBgRect) {
			const boxWidth = textBox.outerWidth();
			const boxHeight = textBox.outerHeight();

			const relativeState = {
				position: {
					left: ((newLeft - actualBgRect.left) / actualBgRect.width) * 100,
					top: ((newTop - actualBgRect.top) / actualBgRect.height) * 100
				},
				size: {
					width: (boxWidth / actualBgRect.width) * 100,
					height: (boxHeight / actualBgRect.height) * 100
				}
			};
			textBox.data('relativeState', relativeState);
		}

		EventManager.setupTextEvents(textBox);
		window.selectionManager.selectTextBox(textBox);
	}
}