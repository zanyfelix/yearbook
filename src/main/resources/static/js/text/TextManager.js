// TextManager.js - 텍스트 관리 클래스
class TextManager {
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
        
        this.updateUIControls(textStyles, selectedFont);
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
		
		// ✅ [핵심 수정] param에 따라 font-weight를 명확하게 설정합니다.
		styles['font-weight'] = (param === 'Title') ? 'bold' : 'normal';
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
        const sizes = {
            'Title': 24,
            'Sub-Title': 16,
            'text': 12
        };
        return sizes[param] || 12;
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
		textBox.data('savedFontFamily', selectedFont);

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (actualBgRect) {
			const relativeState = this.calculateRelativeState(textBox, actualBgRect);
			textBox.data('relativeState', relativeState);
		}
    }
    
    // UI 컨트롤 업데이트
    static updateUIControls(styles, selectedFont) {
		setTimeout(() => {
			if (selectedFont) {
				$('#tooltip-font').val(selectedFont);
			}
			$('#tooltip-size').val(styles['font-size']);

			// ✅ [핵심 수정] 정렬 컨트롤의 값을 'left'로 설정하는 코드를 추가합니다.
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
        
		// ✅ [핵심 수정] 숫자 값으로 통일하고 base-font-size에 저장
		const numericSize = parseInt(fontSize);
		selectedBox.data('base-font-size', numericSize);

		// 현재 화면 크기에 맞춰 스케일링된 폰트 적용
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

		selectedBox.css('font-size', scaledFontSize + 'px');

		this.resizeTextBox(selectedBox, scaledFontSize + 'px');

		if (selectedBox.hasClass('selected')) {
			selectedBox.trigger('resize');
		}
        
        setTimeout(() => this.updateTextBoxState(selectedBox), 50);
    }
    
    // 텍스트박스 크기 조절
    static resizeTextBox(textBox, fontSize) {
        const htmlContent = textBox.html();
        const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');
        
        const $temp = $('<div>')
            .html(htmlContent || ' ')
            .css({
                'position': 'absolute',
                'visibility': 'hidden',
                'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap',
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
            'height': newHeight + 'px'
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