// ============================================================================
// 📁 js/text/TextManager.js (폰트 자동 선택 버전)
// ============================================================================
class TextManager {
    /**
     * 편집 영역에 새로운 텍스트 상자를 추가합니다.
     * 현재 선택된 폰트나 리스트의 첫 번째 폰트를 자동으로 적용합니다.
     */
    static addTextBox(param) {
        // 1. 폰트가 로드되지 않았으면 먼저 로드
        if (!DataLoader.fontsLoaded) {
            console.log('폰트가 아직 로드되지 않음. 폰트 로드 후 텍스트박스 생성...');
            DataLoader.loadAndSetupFonts();
            setTimeout(() => {
                this.addTextBox(param);
            }, 1000); // 폰트 로딩 대기 시간을 1초로 증가
            return;
        }

        // 2. 사용할 폰트 결정 (현재 선택된 폰트 또는 첫 번째 폰트)
        const selectedFont = this.getFontToApply();
        console.log('적용할 폰트:', selectedFont);

        // 3. 기본 스타일 객체 생성
        let textStyles = {
            position: 'absolute',
            zIndex: 100,
            padding: '10px',
            visibility: 'hidden'
        };
        
        // 4. 폰트 패밀리 적용
        if (selectedFont) {
            textStyles['font-family'] = selectedFont;
        }
        
        // 5. 파라미터별 기본 설정
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
        
        // 6. 배경 이미지 비율에 따른 폰트 크기 조정
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

        // 7. 텍스트박스 생성
        const textBox = $('<div class="text-box" contenteditable="true"></div>')
            .text('Enter ' + param + ' Here')
            .css(textStyles);

        console.log('TextBox 생성됨 - 스타일:', textStyles);

        // 8. DOM에 추가
        $('#frame-container').append(textBox);

        // 9. 위치 계산 및 설정
        this.setTextBoxPosition(textBox, param, bg);

        // 10. 데이터 저장
        textBox.data('originalFontSize', baseFontSize + 'px');

        if (actualBgRect) {
            const relativeState = this.calculateRelativeState(textBox, actualBgRect);
            textBox.data('relativeState', relativeState);
        }

        // 11. 이벤트 설정 및 선택
        EventManager.setupTextEvents(textBox);
        window.selectionManager.selectTextBox(textBox);

        // 12. 폰트 드롭다운에 현재 폰트 표시
        if (selectedFont) {
            $('#tooltip-font').val(selectedFont);
        }

        // 13. 스타일 적용 확인 및 강제 재적용 (필요한 경우)
        setTimeout(() => {
            this.ensureStylesApplied(textBox, textStyles);
        }, 100);
    }

    /**
     * 적용할 폰트를 결정합니다.
     * 우선순위: 1) 현재 선택된 폰트 2) 첫 번째 사용 가능한 폰트 3) 기본 폰트
     */
    static getFontToApply() {
        const fontSelect = $('#tooltip-font');
        
        // 1. 현재 선택된 폰트 확인
        const currentSelected = fontSelect.val();
        if (currentSelected && currentSelected.trim() !== '') {
            console.log('현재 선택된 폰트 사용:', currentSelected);
            return currentSelected;
        }

        // 2. 첫 번째 옵션 사용
        const firstOption = fontSelect.find('option:first').val();
        if (firstOption && firstOption.trim() !== '') {
            console.log('첫 번째 폰트 사용:', firstOption);
            // 드롭다운에도 자동 선택
            fontSelect.val(firstOption);
            return firstOption;
        }

        // 3. 폰트 옵션이 없으면 기본값 반환
        console.log('사용 가능한 폰트가 없음. 기본 폰트 사용');
        return null;
    }

    /**
     * 텍스트박스 위치를 설정합니다.
     */
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

    /**
     * 상대적 위치 상태를 계산합니다.
     */
    static calculateRelativeState(textBox, actualBgRect) {
        const position = textBox.position();
        const boxWidth = textBox.outerWidth();
        const boxHeight = textBox.outerHeight();

        return {
            position: {
                left: ((position.left - actualBgRect.left) / actualBgRect.width) * 100,
                top: ((position.top - actualBgRect.top) / actualBgRect.height) * 100
            },
            size: {
                width: (boxWidth / actualBgRect.width) * 100,
                height: (boxHeight / actualBgRect.height) * 100
            },
            transform: 'none'
        };
    }

    /**
     * 스타일이 제대로 적용되었는지 확인하고 필요하면 재적용합니다.
     */
    static ensureStylesApplied(textBox, originalStyles) {
        const appliedFont = textBox.css('font-family');
        const appliedSize = textBox.css('font-size');
        const appliedWeight = textBox.css('font-weight');

        console.log('최종 적용된 스타일:', {
            fontFamily: appliedFont,
            fontSize: appliedSize,
            fontWeight: appliedWeight
        });

        // 폰트가 제대로 적용되지 않았으면 재시도
        if (originalStyles['font-family'] && 
            (!appliedFont || appliedFont.includes('serif') || appliedFont.includes('sans-serif'))) {
            
            console.log('폰트 재적용 중...');
            textBox.css('font-family', originalStyles['font-family']);
            
            // 한 번 더 확인
            setTimeout(() => {
                const reappliedFont = textBox.css('font-family');
                console.log('재적용 후 폰트:', reappliedFont);
            }, 200);
        }
    }

    /**
     * 폰트 목록이 변경되었을 때 호출되는 메소드
     */
    static onFontsLoaded() {
        console.log('폰트 로딩 완료. 기본 폰트 선택...');
        
        // 첫 번째 폰트를 기본 선택으로 설정
        const fontSelect = $('#tooltip-font');
        const firstFont = fontSelect.find('option:first').val();
        if (firstFont) {
            fontSelect.val(firstFont);
            console.log('기본 폰트로 설정:', firstFont);
        }
    }

    /**
     * 안전한 텍스트박스 생성 (외부에서 호출용)
     */
    static createTextBox(param) {
        console.log(`텍스트박스 생성 요청: ${param}`);
        this.addTextBox(param);
    }
}

// DataLoader 완료 이벤트 리스너 추가
$(document).ready(function() {
    // DataLoader의 폰트 로딩 완료를 감지하고 TextManager에 알림
    const originalSetupFontEventListeners = DataLoader.setupFontEventListeners;
    DataLoader.setupFontEventListeners = function() {
        originalSetupFontEventListeners.call(this);
        // 폰트 로딩 완료 후 TextManager에 알림
        TextManager.onFontsLoaded();
    };
});

// 텍스트박스 복원 시 자동 크기 조정 함수 (기존 코드 유지)
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

// 텍스트박스 크기 자동 조정 함수 (기존 코드 유지)
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

// 브라우저 리사이즈 시 텍스트박스 처리 (기존 코드 유지)
$(window).on('resize', function() {
    $('.text-box').each(function() {
        const $this = $(this);
        const relativeState = $this.data('relativeState');
        
        if (relativeState && relativeState.size && relativeState.size.autoSize) {
            autoResizeTextBox($this);
        }
    });
});