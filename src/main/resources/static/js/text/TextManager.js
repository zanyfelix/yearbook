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
		let newTop;

		// param 값에 따라 초기 수직 위치를 조정합니다.
		switch (param) {
			case 'Title':
				// Title은 배경 상단에서 15% 지점에 위치시킵니다.
				newTop = bgPos.top + (bgHeight * 0.01);
				break;
			case 'Sub-Title':
				// Sub-Title은 배경 상단에서 30% 지점에 위치시킵니다.
				newTop = bgPos.top + (bgHeight * 0.1);
				break;
			case 'text':
			default:
				// 'text' 및 기타 경우는 기존과 같이 중앙에 배치합니다.
				newTop = bgPos.top + (bgHeight - boxHeight) / 2;
				break;
		}
		
		textBox.css({
			top: `${newTop}px`,
			left: `${newLeft}px`,
			visibility: 'visible'
		});

		// ✨ 원본 폰트 크기와 relativeState 저장
		textBox.data('originalFontSize', baseFontSize + 'px');

		if (actualBgRect) {
			
			const relativeState = {
				position: {
					left: ((newLeft - actualBgRect.left) / actualBgRect.width) * 100,
					top: ((newTop - actualBgRect.top) / actualBgRect.height) * 100
				},
				size: {
					width: (boxWidth / actualBgRect.width) * 100,
					height: (boxHeight / actualBgRect.height) * 100
				},
				// ✨ transform 기본값 추가
				transform: 'none'
			};
			textBox.data('relativeState', relativeState);
		}

		EventManager.setupTextEvents(textBox);
		window.selectionManager.selectTextBox(textBox);
	}
}

// 텍스트박스 복원 시 자동 크기 조정 함수
function restoreTextBoxWithAutoSize(textBox) {
    const relativeState = textBox.data('relativeState');
    
    if (relativeState && relativeState.size && relativeState.size.autoSize) {
        // autoSize 플래그가 있으면 고정 크기를 설정하지 않음
        textBox.css({
            'width': 'auto',
            'height': 'auto',
            'white-space': 'nowrap',
            'min-width': '50px'
        });
        
        // 텍스트 내용에 맞게 크기 자동 조정
        setTimeout(() => {
            autoResizeTextBox(textBox);
        }, 10);
    } else if (relativeState && relativeState.size) {
        // autoSize 플래그가 없으면 기존 방식대로 크기 복원
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (actualBgRect) {
            const width = (relativeState.size.width * actualBgRect.width) / 100;
            const height = (relativeState.size.height * actualBgRect.height) / 100;
            
            textBox.css({
                'width': width + 'px',
                'height': height + 'px'
            });
        }
    }
}

// 텍스트박스 크기 자동 조정 함수 (전역으로 사용)
function autoResizeTextBox($box) {
    // 임시 span 요소를 생성하여 텍스트 실제 크기 측정
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
    const textWidth = $temp.width() + 20; // 여백 20px 추가
    const textHeight = $temp.height() + 16; // 여백 16px 추가
    $temp.remove();
    
    // 텍스트박스 크기를 측정된 크기로 설정
    $box.css({
        'width': 'auto',
        'min-width': textWidth + 'px',
        'height': 'auto',
        'min-height': textHeight + 'px'
    });
}

// 브라우저 리사이즈 시 텍스트박스 처리
$(window).on('resize', function() {
    $('.text-box').each(function() {
        const $this = $(this);
        const relativeState = $this.data('relativeState');
        
        if (relativeState && relativeState.size && relativeState.size.autoSize) {
            // autoSize가 설정된 텍스트박스는 자동 크기 조정
            autoResizeTextBox($this);
        }
    });
});