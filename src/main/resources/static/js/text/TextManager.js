// ============================================================================
// 📁 js/text/TextManager.js (Transform 처리 완전 수정 버전)
// ============================================================================
class TextManager {
    /**
     * 편집 영역에 새로운 텍스트 상자를 추가합니다.
     */
    static addTextBox(param) {
        if (!DataLoader.fontsLoaded) {
            console.log('폰트가 아직 로드되지 않음. 폰트 로드 후 텍스트박스 생성...');
            DataLoader.loadAndSetupFonts();
            setTimeout(() => {
                this.addTextBox(param);
            }, 1000);
            return;
        }

        const selectedFont = this.getFontToApply();
        console.log('적용할 폰트:', selectedFont);

        let textStyles = {
            position: 'absolute',
            zIndex: 100,
            padding: '10px',
            visibility: 'hidden',
            // ✅ Transform 기본값 명시적 설정
            transform: 'none',
            transformOrigin: '50% 50%'
        };
        
        if (selectedFont) {
            textStyles['font-family'] = selectedFont;
        }
        
        let baseFontSize = 12;
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
        
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

        if (actualBgRect) {
            const TEMPLATE_WEB_BG_WIDTH = 786;
            const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
            const adjustedFontSize = Math.round(baseFontSize * scaleRatio);
            textStyles['font-size'] = adjustedFontSize + 'px';
        } else {
            textStyles['font-size'] = baseFontSize + 'px';
        }

        const textBox = $('<div class="text-box" contenteditable="true"></div>')
            .text('Enter ' + param + ' Here')
            .css(textStyles);

        console.log('TextBox 생성됨 - 스타일:', textStyles);

        $('#frame-container').append(textBox);
        this.setTextBoxPosition(textBox, param, bg);

        // ✅ 저장할 데이터 설정 (Transform 정보 포함)
        textBox.data('originalFontSize', baseFontSize + 'px');
        textBox.data('savedFontSize', textStyles['font-size']);
        textBox.data('savedFontFamily', selectedFont);

        if (actualBgRect) {
            const relativeState = this.calculateRelativeStateWithTransform(textBox, actualBgRect);
            textBox.data('relativeState', relativeState);
        }

        EventManager.setupTextEvents(textBox);
        window.selectionManager.selectTextBox(textBox);
        
        setTimeout(() => {
            this.resetFontDropdownToDefault(selectedFont);
            $('#tooltip-size').val(textStyles['font-size']);
        }, 150);

        setTimeout(() => {
            this.ensureStylesApplied(textBox, textStyles);
        }, 200);
    }

    /**
     * ✅ Transform을 고려한 상대 위치 계산
     */
    static calculateRelativeStateWithTransform(textBox, actualBgRect) {
        // Transform을 제거한 상태에서 위치 계산
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
        
        // Transform 복원
        if (currentTransform && currentTransform !== 'none') {
            textBox.css('transform', currentTransform);
        }
        
        return relativeState;
    }

    /**
     * ✅ 텍스트박스 이동 시 상태 업데이트
     */
    static updateTextBoxState($textBox) {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        if (!actualBgRect) return;

        const newRelativeState = this.calculateRelativeStateWithTransform($textBox, actualBgRect);
        $textBox.data('relativeState', newRelativeState);
        
        console.log('텍스트박스 상태 업데이트:', newRelativeState);
    }

    /**
     * 적용할 폰트를 결정합니다.
     */
    static getFontToApply() {
        const fontSelect = $('#tooltip-font');
        const firstOption = fontSelect.find('option:first').val();
        if (firstOption && firstOption.trim() !== '') {
            console.log('첫 번째 폰트 사용:', firstOption);
            return firstOption;
        }
        console.log('사용 가능한 폰트가 없음. 기본 폰트 사용');
        return null;
    }
    
    /**
     * 새로운 텍스트박스 생성 시 폰트 드롭다운을 기본값으로 리셋합니다.
     */
    static resetFontDropdownToDefault(appliedFont) {
        const fontSelect = $('#tooltip-font');
        const firstFont = fontSelect.find('option:first').val();
        
        if (firstFont && appliedFont) {
            console.log('폰트 드롭다운을 기본값으로 리셋:', firstFont);
            fontSelect.val(firstFont);
        }
    }

    static setTextBoxPosition(textBox, param, bg) {
        const bgPos = bg.position();
        if (!bgPos) return;

        const bgWidth = bg.width();
        const bgHeight = bg.height();
        const boxWidth = textBox.outerWidth();
        const boxHeight = textBox.outerHeight();

        const newLeft = bgPos.left + (bgWidth - boxWidth) / 2;
        let newTop;

        switch (param) {
            case 'Title':
                newTop = bgPos.top + (bgHeight * 0.01);
                break;
            case 'Sub-Title':
                newTop = bgPos.top + (bgHeight * 0.1);
                break;
            case 'text':
            default:
                newTop = bgPos.top + (bgHeight - boxHeight) / 2;
                break;
        }
        
        textBox.css({
            top: `${newTop}px`,
            left: `${newLeft}px`,
            visibility: 'visible'
        });
    }

    static ensureStylesApplied(textBox, originalStyles) {
        const appliedFont = textBox.css('font-family');
        const appliedSize = textBox.css('font-size');
        const appliedWeight = textBox.css('font-weight');

        console.log('최종 적용된 스타일:', {
            fontFamily: appliedFont,
            fontSize: appliedSize,
            fontWeight: appliedWeight
        });

        if (originalStyles['font-family'] && 
            (!appliedFont || appliedFont.includes('serif') || appliedFont.includes('sans-serif'))) {
            
            console.log('폰트 재적용 중...');
            textBox.css('font-family', originalStyles['font-family']);
            
            setTimeout(() => {
                const reappliedFont = textBox.css('font-family');
                console.log('재적용 후 폰트:', reappliedFont);
            }, 200);
        }
    }

    static onFontsLoaded() {
        console.log('폰트 로딩 완료. 기본 폰트 선택...');
        const fontSelect = $('#tooltip-font');
        const firstFont = fontSelect.find('option:first').val();
        if (firstFont) {
            fontSelect.val(firstFont);
            console.log('기본 폰트로 설정:', firstFont);
        }
    }

    static createTextBox(param) {
        console.log(`텍스트박스 생성 요청: ${param}`);
        this.addTextBox(param);
    }

    /**
     * ✅ 폰트 크기 변경 처리 (개선된 버전)
     */
    static updateFontSize(fontSize) {
		const selectedBox = DataLoader.getCurrentSelectedTextBox();
		if (selectedBox && selectedBox.length > 0) {
			console.log('폰트 크기 변경:', fontSize);

			// CSS 적용
			selectedBox.css('font-size', fontSize);

			// ✨ 저장된 데이터를 현재 값으로 업데이트
			selectedBox.data('savedFontSize', fontSize);
			selectedBox.data('originalFontSize', fontSize);  // originalFontSize도 업데이트

			// 강제 적용
			selectedBox[0].style.setProperty('font-size', fontSize, 'important');

			// 상태 업데이트
			setTimeout(() => {
				this.updateTextBoxState(selectedBox);
			}, 50);

			console.log('폰트 크기 적용 완료:', fontSize);
		}
    }

    /**
     * ✅ 텍스트 정렬 변경 처리
     */
    static updateTextAlign(alignment) {
        const selectedBox = DataLoader.getCurrentSelectedTextBox();
        if (selectedBox && selectedBox.length > 0) {
            console.log('텍스트 정렬 변경:', alignment);
            selectedBox.css('text-align', alignment);
        }
    }

    /**
     * ✅ 텍스트 색상 변경 처리
     */
    static updateTextColor(color) {
        const selectedBox = DataLoader.getCurrentSelectedTextBox();
        if (selectedBox && selectedBox.length > 0) {
            console.log('텍스트 색상 변경:', color);
            selectedBox.css('color', color);
        }
    }

    /**
     * ✅ 텍스트박스 회전 처리
     */
    static rotateTextBox(degrees) {
        const selectedBox = DataLoader.getCurrentSelectedTextBox();
        if (selectedBox && selectedBox.length > 0) {
            const currentTransform = selectedBox.css('transform');
            let newTransform;
            
            if (currentTransform === 'none' || !currentTransform) {
                newTransform = `rotate(${degrees}deg)`;
            } else if (currentTransform.includes('rotate')) {
                // 기존 회전값 업데이트
                newTransform = currentTransform.replace(/rotate\([^)]*\)/, `rotate(${degrees}deg)`);
            } else {
                // 기존 transform에 회전 추가
                newTransform = currentTransform + ` rotate(${degrees}deg)`;
            }
            
            console.log('텍스트박스 회전:', degrees, '도 ->', newTransform);
            
            selectedBox.css({
                'transform': newTransform,
                'transform-origin': '50% 50%'
            });
            
            // 상태 업데이트
            setTimeout(() => {
                this.updateTextBoxState(selectedBox);
            }, 50);
        }
    }
}

// DataLoader 완료 이벤트 리스너 (기존 코드 유지)
$(document).ready(function() {
    const originalSetupFontEventListeners = DataLoader.setupFontEventListeners;
    DataLoader.setupFontEventListeners = function() {
        originalSetupFontEventListeners.call(this);
        TextManager.onFontsLoaded();
    };
    
    // ✅ 텍스트 컨트롤 이벤트 리스너 추가
    $('#tooltip-size').on('change', function() {
        const fontSize = $(this).val();
        TextManager.updateFontSize(fontSize);
    });
    
    $('#tooltip-align').on('change', function() {
        const alignment = $(this).val();
        TextManager.updateTextAlign(alignment);
    });
    
    $('#tooltip-color').on('change', function() {
        const color = $(this).val();
        TextManager.updateTextColor(color);
    });
    
    // ✅ 텍스트 회전 버튼 이벤트
    $('#text-rotate-left').on('click', function() {
        const selectedBox = DataLoader.getCurrentSelectedTextBox();
        if (selectedBox && selectedBox.length > 0) {
            const currentRotation = getCurrentRotation(selectedBox);
            TextManager.rotateTextBox(currentRotation - 15);
        }
    });
    
    $('#text-rotate-right').on('click', function() {
        const selectedBox = DataLoader.getCurrentSelectedTextBox();
        if (selectedBox && selectedBox.length > 0) {
            const currentRotation = getCurrentRotation(selectedBox);
            TextManager.rotateTextBox(currentRotation + 15);
        }
    });
    
    // ✅ 현재 회전값 추출 헬퍼 함수
    function getCurrentRotation($element) {
        const transform = $element.css('transform');
        if (!transform || transform === 'none') return 0;
        
        const values = transform.split('(')[1].split(')')[0].split(',');
        if (values.length >= 6) {
            const a = parseFloat(values[0]);
            const b = parseFloat(values[1]);
            return Math.round(Math.atan2(b, a) * (180/Math.PI));
        }
        return 0;
    }
});

// 기존 함수들 (유지)
function restoreTextBoxWithAutoSize(textBox) {
    const relativeState = textBox.data('relativeState');
    
    if (relativeState && relativeState.size && relativeState.size.autoSize) {
        textBox.css({
            'width': 'auto',
            'height': 'auto',
            'white-space': 'nowrap',
            'min-width': '50px'
        });
        
        setTimeout(() => {
            autoResizeTextBox(textBox);
        }, 10);
    } else if (relativeState && relativeState.size) {
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

$(window).on('resize', function() {
    $('.text-box').each(function() {
        const $this = $(this);
        const relativeState = $this.data('relativeState');
        
        if (relativeState && relativeState.size && relativeState.size.autoSize) {
            autoResizeTextBox($this);
        }
    });
});