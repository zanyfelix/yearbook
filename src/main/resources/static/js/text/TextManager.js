// ============================================================================
// 📁 js/text/TextManager.js
// ============================================================================
class TextManager {
    /**
     * 편집 영역에 새로운 텍스트 상자를 추가합니다.
     */
	static addTextBox() {
		// 1. 텍스트 상자를 생성하되, 위치는 아직 지정하지 않고 보이지 않게 처리
		const textBox = $('<div class="text-box" contenteditable="true"></div>')
			.text('Please enter your text')
			.attr('data-is-placeholder', 'true')
			.css({
				position: 'absolute',
				zIndex: 100,
				padding: '10px',
				border: '1px dashed #007bff',
				visibility: 'hidden' // 위치 계산 전까지 숨김
			});

		// 2. 너비/높이 계산을 위해 DOM에 먼저 추가
		$('#frame-container').append(textBox);

		// 3. 위치 계산에 필요한 요소들을 가져옴
		const bg = $('#page-preview-img');
		const bgPos = bg.position();
		if (!bgPos) return; // 배경 이미지가 없으면 중단

		const bgWidth = bg.width();
		const bgHeight = bg.height();

		// 4. 텍스트 상자의 실제 크기를 가져옴
		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

		// 5. 배경 이미지의 중앙 위치를 계산
		const newLeft = bgPos.left + (bgWidth - boxWidth) / 2;
		const newTop = bgPos.top + (bgHeight - boxHeight) / 2;

		// 6. 계산된 위치를 적용하고, 다시 보이게 처리
		textBox.css({
			top: `${newTop}px`,
			left: `${newLeft}px`,
			visibility: 'visible'
		});

		// 7. 이벤트 핸들러 설정
		EventManager.setupTextEvents(textBox);
	}
}