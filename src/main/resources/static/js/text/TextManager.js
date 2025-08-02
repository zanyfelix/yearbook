// ============================================================================
// 📁 js/text/TextManager.js
// ============================================================================
class TextManager {
    /**
     * 편집 영역에 새로운 텍스트 상자를 추가합니다.
     */
    static addTextBox() {
        const textBox = $('<div class="text-box" contenteditable="true"></div>')
            .text('텍스트를 입력하세요')
            .css({
                position: 'absolute',
                top: '150px',   // 초기 위치 Y
                left: '150px',  // 초기 위치 X
                zIndex: 100,    // 다른 요소들보다 위에 보이도록 z-index 설정
                padding: '10px',
                border: '1px dashed #007bff'
            });

        // 미리보기의 프레임 컨테이너에 텍스트 상자 추가
        $('#frame-container').append(textBox);
        
        // 텍스트 상자에 이벤트(드래그 등)를 설정
        EventManager.setupTextEvents(textBox);

        // 텍스트 상자를 바로 클릭(포커스)할 수 있도록 처리
        textBox.trigger('focus');
    }
}