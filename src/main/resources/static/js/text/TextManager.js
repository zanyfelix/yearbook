// ============================================================================
// 📁 js/text/TextManager.js
// ============================================================================
class TextManager {
    /**
     * 편집 영역에 새로운 텍스트 상자를 추가합니다.
     */
	static addTextBox(param) {
		let textStyles = {}; // 스타일을 담을 빈 객체 생성

		// ✨ 추가된 부분: 파라미터 값에 따라 스타일을 다르게 적용
		if (param === 'Title') {
			// 'Title'일 경우: 글자 크기 24px, 굵게
			textStyles = {
				'font-size': '24px',
				'font-weight': 'bold'
			};
		} if (param === 'Sub-Title') {
			textStyles = {
				'font-size': '16px',
				'font-weight': 'normal'
			};
		} if (param === 'text') {
			textStyles = {
				'font-size': '12px',
				'font-weight': 'normal'
			};
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

		const bg = $('#page-preview-img');
		const bgPos = bg.position();
		if (!bgPos) return;

		const bgWidth = bg.width();
		const bgHeight = bg.height();

		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

		const newLeft = bgPos.left + (bgWidth - boxWidth) / 2;
		const newTop = bgPos.top + (bgHeight - boxHeight) / 2;

		textBox.css({
			top: `${newTop}px`,
			left: `${newLeft}px`,
			visibility: 'visible'
		});

		EventManager.setupTextEvents(textBox);
		
		// ✨ 핵심 수정: 생성된 텍스트 상자를 즉시 선택 상태로 만듭니다.
		window.selectionManager.selectTextBox(textBox);
	}
}