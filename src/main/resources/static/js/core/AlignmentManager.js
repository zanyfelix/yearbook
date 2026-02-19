// ============================================================================
// 📁 js/core/AlignmentManager.js - PPT 스타일 정렬 관리 클래스
// ============================================================================

class AlignmentManager {
    constructor() {
        // 정렬 기준 모드: 'page' (페이지 기준) 또는 'selection' (선택 영역 기준)
        this.alignmentBase = 'selection';
    }
    
    // ========================================================================
    // 정렬 기준 영역 가져오기
    // ========================================================================
    getAlignmentBounds(elements) {
        if (this.alignmentBase === 'page' || elements.length <= 1) {
            // 페이지(안전선 내부) 기준
            return this.getPageBounds();
        } else {
            // 선택된 요소들의 경계 기준
            return this.getSelectionBounds(elements);
        }
    }
    
    // ========================================================================
    // 페이지 경계 가져오기 (SafeLine 내부 영역)
    // ========================================================================
    getPageBounds() {
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
        
        if (!actualBgRect) {
            return null;
        }
        
        // SafeLine 마진 계산
        const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
        const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;
        
        return {
            left: actualBgRect.left + safeMarginX,
            top: actualBgRect.top + safeMarginY,
            right: actualBgRect.left + actualBgRect.width - safeMarginX,
            bottom: actualBgRect.top + actualBgRect.height - safeMarginY,
            width: actualBgRect.width - (safeMarginX * 2),
            height: actualBgRect.height - (safeMarginY * 2)
        };
    }
    
    // ========================================================================
    // 선택된 요소들의 경계 가져오기
    // ========================================================================
    getSelectionBounds(elements) {
        if (elements.length === 0) return null;
        
        let minLeft = Infinity, minTop = Infinity;
        let maxRight = -Infinity, maxBottom = -Infinity;
        
        elements.forEach(($el, idx) => {
            const rect = this.getElementRect($el);
            console.log(`[AlignmentManager] getSelectionBounds 요소[${idx}]:`, 
                'class:', $el[0]?.className?.split(' ')[0],
                'left:', rect.left.toFixed(1), 'top:', rect.top.toFixed(1), 
                'width:', rect.width.toFixed(1), 'height:', rect.height.toFixed(1));
            minLeft = Math.min(minLeft, rect.left);
            minTop = Math.min(minTop, rect.top);
            maxRight = Math.max(maxRight, rect.left + rect.width);
            maxBottom = Math.max(maxBottom, rect.top + rect.height);
        });
        
        const result = {
            left: minLeft,
            top: minTop,
            right: maxRight,
            bottom: maxBottom,
            width: maxRight - minLeft,
            height: maxBottom - minTop
        };
        
        console.log('[AlignmentManager] getSelectionBounds 결과:', JSON.stringify(result));
        return result;
    }
    
    // ========================================================================
    // 요소의 실제 위치/크기 가져오기 (회전 고려)
    // ========================================================================
    getElementRect($element) {
        // Transform 임시 제거하여 정확한 위치 측정
        const currentTransform = $element.css('transform');
        $element.css('transform', 'none');
        
        const position = $element.position();
        const width = $element.outerWidth();
        const height = $element.outerHeight();
        
        $element.css('transform', currentTransform);
        
        // ✅ 비정상 값 감지
        if (width === 0 || height === 0) {
            console.warn('[AlignmentManager] getElementRect - 크기가 0!', 
                'class:', $element[0]?.className, 
                'width:', width, 'height:', height,
                'display:', $element.css('display'),
                'visibility:', $element.css('visibility'));
        }
        
        return {
            left: position.left,
            top: position.top,
            width: width,
            height: height,
            centerX: position.left + width / 2,
            centerY: position.top + height / 2
        };
    }
    
    // ========================================================================
    // 좌측 정렬 (Align Left)
    // ========================================================================
    alignLeft(elements) {
        if (!elements || elements.length === 0) {
            console.warn('[AlignmentManager] alignLeft - elements가 비어있음');
            return;
        }
        
        console.log('[AlignmentManager] alignLeft 시작 - 요소 개수:', elements.length);
        
        // ✅ 모든 요소가 이미 좌측 정렬이고 alignmentBounds가 있으면 스킵
        const allAligned = elements.every($el => {
            const state = $el.data('relativeState') || {};
            return state.alignment?.horizontal === 'left' && state.alignmentBounds !== undefined;
        });
        
        if (allAligned) {
            console.log('모든 요소가 이미 좌측 정렬 - 스킵');
            return;
        }
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) {
            console.warn('[AlignmentManager] alignLeft - bounds가 null');
            return;
        }
        
        console.log('[AlignmentManager] alignLeft bounds:', JSON.stringify(bounds));
        
        elements.forEach(($el, idx) => {
            // ✅ 개별 요소가 이미 좌측 정렬되고 alignmentBounds가 있으면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.horizontal === 'left' && existingState.alignmentBounds !== undefined) {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newLeft = bounds.left;
            
            console.log(`[AlignmentManager] alignLeft 요소[${idx}] - class: ${$el[0].className}, rect.left: ${rect.left}, newLeft: ${newLeft}, rect.top: ${rect.top}`);
            
            this.setElementPosition($el, newLeft, rect.top);
            
            // ✅ 적용 후 위치 확인
            const afterPos = $el.position();
            console.log(`[AlignmentManager] alignLeft 요소[${idx}] - 적용 후 position: left=${afterPos.left}, top=${afterPos.top}, css-left=${$el.css('left')}`);
        });
        
        // ✅ 수평 정렬 플래그와 기준 좌표 저장
        this.saveAllPositionsWithBounds(elements, 'left', null, bounds);
    }
    
    // ========================================================================
    // 수평 중앙 정렬 (Align Center Horizontal)
    // ========================================================================
    alignCenterH(elements) {
        if (!elements || elements.length === 0) return;
        
        // ✅ 모든 요소가 이미 수평 중앙 정렬이고 alignmentBounds가 있으면 스킵
        const allAligned = elements.every($el => {
            const state = $el.data('relativeState') || {};
            return state.alignment?.horizontal === 'center' && state.alignmentBounds !== undefined;
        });
        
        if (allAligned) {
            console.log('모든 요소가 이미 수평 중앙 정렬 - 스킵');
            return;
        }
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        const boundsCenter = bounds.left + bounds.width / 2;
        
        elements.forEach($el => {
            // ✅ 개별 요소가 이미 수평 중앙 정렬되고 alignmentBounds가 있으면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.horizontal === 'center' && existingState.alignmentBounds !== undefined) {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newLeft = boundsCenter - rect.width / 2;
            
            this.setElementPosition($el, newLeft, rect.top);
        });
        
        // ✅ 수평 정렬 플래그와 기준 좌표 저장
        this.saveAllPositionsWithBounds(elements, 'center', null, bounds);
    }
    
    // ========================================================================
    // 우측 정렬 (Align Right)
    // ========================================================================
    alignRight(elements) {
        if (!elements || elements.length === 0) {
            console.warn('[AlignmentManager] alignRight - elements가 비어있음');
            return;
        }
        
        console.log('[AlignmentManager] alignRight 시작 - 요소 개수:', elements.length);
        
        // ✅ 모든 요소가 이미 우측 정렬이고 alignmentBounds가 있으면 스킵
        const allAligned = elements.every($el => {
            const state = $el.data('relativeState') || {};
            return state.alignment?.horizontal === 'right' && state.alignmentBounds !== undefined;
        });
        
        if (allAligned) {
            console.log('모든 요소가 이미 우측 정렬 - 스킵');
            return;
        }
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) {
            console.warn('[AlignmentManager] alignRight - bounds가 null');
            return;
        }
        
        console.log('[AlignmentManager] alignRight bounds:', JSON.stringify(bounds));
        
        elements.forEach(($el, idx) => {
            // ✅ 개별 요소가 이미 우측 정렬되고 alignmentBounds가 있으면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.horizontal === 'right' && existingState.alignmentBounds !== undefined) {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newLeft = bounds.right - rect.width;
            
            console.log(`[AlignmentManager] alignRight 요소[${idx}] - class: ${$el[0].className}, rect.left: ${rect.left}, rect.width: ${rect.width}, newLeft: ${newLeft}`);
            
            this.setElementPosition($el, newLeft, rect.top);
            
            // ✅ 적용 후 위치 확인
            const afterPos = $el.position();
            console.log(`[AlignmentManager] alignRight 요소[${idx}] - 적용 후 position: left=${afterPos.left}, css-left=${$el.css('left')}`);
        });
        
        // ✅ 수평 정렬 플래그와 기준 좌표 저장
        this.saveAllPositionsWithBounds(elements, 'right', null, bounds);
    }
    
    // ========================================================================
    // 상단 정렬 (Align Top)
    // ========================================================================
    alignTop(elements) {
        if (!elements || elements.length === 0) return;
        
        // ✅ 모든 요소가 이미 상단 정렬이고 alignmentBounds가 있으면 스킵
        const allAligned = elements.every($el => {
            const state = $el.data('relativeState') || {};
            return state.alignment?.vertical === 'top' && state.alignmentBounds !== undefined;
        });
        
        if (allAligned) {
            console.log('모든 요소가 이미 상단 정렬 - 스킵');
            return;
        }
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        elements.forEach($el => {
            // ✅ 개별 요소가 이미 상단 정렬되고 alignmentBounds가 있으면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.vertical === 'top' && existingState.alignmentBounds !== undefined) {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newTop = bounds.top;
            
            this.setElementPosition($el, rect.left, newTop);
        });
        
        // ✅ 수직 정렬 플래그와 기준 좌표 저장
        this.saveAllPositionsWithBounds(elements, null, 'top', bounds);
    }
    
    // ========================================================================
    // 수직 중앙 정렬 (Align Center Vertical)
    // ========================================================================
    alignCenterV(elements) {
        if (!elements || elements.length === 0) return;
        
        // ✅ 모든 요소가 이미 수직 중앙 정렬이고 alignmentBounds가 있으면 스킵
        const allAligned = elements.every($el => {
            const state = $el.data('relativeState') || {};
            return state.alignment?.vertical === 'center' && state.alignmentBounds !== undefined;
        });
        
        if (allAligned) {
            console.log('모든 요소가 이미 수직 중앙 정렬 - 스킵');
            return;
        }
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        const boundsMiddle = bounds.top + bounds.height / 2;
        
        elements.forEach($el => {
            // ✅ 개별 요소가 이미 수직 중앙 정렬되고 alignmentBounds가 있으면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.vertical === 'center' && existingState.alignmentBounds !== undefined) {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newTop = boundsMiddle - rect.height / 2;
            
            this.setElementPosition($el, rect.left, newTop);
        });
        
        // ✅ 수직 정렬 플래그와 기준 좌표 저장
        this.saveAllPositionsWithBounds(elements, null, 'center', bounds);
    }
    
    // ========================================================================
    // 하단 정렬 (Align Bottom)
    // ========================================================================
    alignBottom(elements) {
        if (!elements || elements.length === 0) return;
        
        // ✅ 모든 요소가 이미 하단 정렬이고 alignmentBounds가 있으면 스킵
        const allAligned = elements.every($el => {
            const state = $el.data('relativeState') || {};
            return state.alignment?.vertical === 'bottom' && state.alignmentBounds !== undefined;
        });
        
        if (allAligned) {
            console.log('모든 요소가 이미 하단 정렬 - 스킵');
            return;
        }
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        elements.forEach($el => {
            // ✅ 개별 요소가 이미 하단 정렬되고 alignmentBounds가 있으면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.vertical === 'bottom' && existingState.alignmentBounds !== undefined) {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newTop = bounds.bottom - rect.height;
            
            this.setElementPosition($el, rect.left, newTop);
        });
        
        // ✅ 수직 정렬 플래그와 기준 좌표 저장
        this.saveAllPositionsWithBounds(elements, null, 'bottom', bounds);
    }
    
    // ========================================================================
    // 가로 균등 배분 (Distribute Horizontally)
    // ========================================================================
    distributeH(elements) {
        if (!elements || elements.length < 3) {
            // 2개 이하면 중앙 정렬로 대체
            if (elements && elements.length > 0) {
                this.alignCenterH(elements);
            }
            return;
        }
        
        // 요소들을 X 좌표 기준으로 정렬
        const sortedElements = [...elements].sort((a, b) => {
            return this.getElementRect(a).left - this.getElementRect(b).left;
        });
        
        // 첫 번째와 마지막 요소의 위치 고정
        const firstRect = this.getElementRect(sortedElements[0]);
        const lastRect = this.getElementRect(sortedElements[sortedElements.length - 1]);
        
        // 전체 사용 가능 너비 계산
        const totalWidth = (lastRect.left + lastRect.width) - firstRect.left;
        
        // 모든 요소의 너비 합 계산
        let totalElementWidth = 0;
        sortedElements.forEach($el => {
            totalElementWidth += this.getElementRect($el).width;
        });
        
        // 간격 계산
        const gap = (totalWidth - totalElementWidth) / (sortedElements.length - 1);
        
        // 각 요소 배치
        let currentLeft = firstRect.left;
        sortedElements.forEach(($el, index) => {
            const rect = this.getElementRect($el);
            
            if (index > 0) { // 첫 번째 요소는 그대로 유지
                this.setElementPosition($el, currentLeft, rect.top);
            }
            
            currentLeft += rect.width + gap;
        });
        
        // ✅ 균등 배분은 정렬이 아니므로 플래그 제거
        this.saveAllPositionsWithoutAlignment(elements);
    }
    
    // ========================================================================
    // 세로 균등 배분 (Distribute Vertically)
    // ========================================================================
    distributeV(elements) {
        if (!elements || elements.length < 3) {
            // 2개 이하면 중앙 정렬로 대체
            if (elements && elements.length > 0) {
                this.alignCenterV(elements);
            }
            return;
        }
        
        // 요소들을 Y 좌표 기준으로 정렬
        const sortedElements = [...elements].sort((a, b) => {
            return this.getElementRect(a).top - this.getElementRect(b).top;
        });
        
        // 첫 번째와 마지막 요소의 위치 고정
        const firstRect = this.getElementRect(sortedElements[0]);
        const lastRect = this.getElementRect(sortedElements[sortedElements.length - 1]);
        
        // 전체 사용 가능 높이 계산
        const totalHeight = (lastRect.top + lastRect.height) - firstRect.top;
        
        // 모든 요소의 높이 합 계산
        let totalElementHeight = 0;
        sortedElements.forEach($el => {
            totalElementHeight += this.getElementRect($el).height;
        });
        
        // 간격 계산
        const gap = (totalHeight - totalElementHeight) / (sortedElements.length - 1);
        
        // 각 요소 배치
        let currentTop = firstRect.top;
        sortedElements.forEach(($el, index) => {
            const rect = this.getElementRect($el);
            
            if (index > 0) { // 첫 번째 요소는 그대로 유지
                this.setElementPosition($el, rect.left, currentTop);
            }
            
            currentTop += rect.height + gap;
        });
        
        // ✅ 균등 배분은 정렬이 아니므로 플래그 제거
        this.saveAllPositionsWithoutAlignment(elements);
    }
    
    // ========================================================================
    // 동일 너비로 맞추기 (Match Width)
    // ========================================================================
    matchWidth(elements) {
        if (!elements || elements.length < 2) return;
        
        // 가장 넓은 요소의 너비 찾기
        let maxWidth = 0;
        elements.forEach($el => {
            const rect = this.getElementRect($el);
            maxWidth = Math.max(maxWidth, rect.width);
        });
        
        // 모든 요소에 적용 (텍스트박스와 엘리먼트만)
        elements.forEach($el => {
            if ($el.hasClass('text-box') || $el.hasClass('element-frame')) {
                const rect = this.getElementRect($el);
                const ratio = maxWidth / rect.width;
                
                $el.css({
                    width: maxWidth + 'px',
                    height: (rect.height * ratio) + 'px'
                });
            }
        });
        
        // ✅ 크기 변경은 정렬이 아니므로 플래그 제거
        this.saveAllPositionsWithoutAlignment(elements);
    }
    
    // ========================================================================
    // 동일 높이로 맞추기 (Match Height)
    // ========================================================================
    matchHeight(elements) {
        if (!elements || elements.length < 2) return;
        
        // 가장 높은 요소의 높이 찾기
        let maxHeight = 0;
        elements.forEach($el => {
            const rect = this.getElementRect($el);
            maxHeight = Math.max(maxHeight, rect.height);
        });
        
        // 모든 요소에 적용 (텍스트박스와 엘리먼트만)
        elements.forEach($el => {
            if ($el.hasClass('text-box') || $el.hasClass('element-frame')) {
                const rect = this.getElementRect($el);
                const ratio = maxHeight / rect.height;
                
                $el.css({
                    width: (rect.width * ratio) + 'px',
                    height: maxHeight + 'px'
                });
            }
        });
        
        // ✅ 크기 변경은 정렬이 아니므로 플래그 제거
        this.saveAllPositionsWithoutAlignment(elements);
    }
    
    // ========================================================================
    // 동일 크기로 맞추기 (Match Size)
    // ========================================================================
    matchSize(elements) {
        if (!elements || elements.length < 2) return;
        
        // 첫 번째 요소의 크기를 기준으로
        const baseRect = this.getElementRect(elements[0]);
        
        // 모든 요소에 적용 (텍스트박스와 엘리먼트만)
        elements.forEach(($el, index) => {
            if (index === 0) return; // 첫 번째는 건너뛰기
            
            if ($el.hasClass('text-box') || $el.hasClass('element-frame')) {
                $el.css({
                    width: baseRect.width + 'px',
                    height: baseRect.height + 'px'
                });
            }
        });
        
        // ✅ 크기 변경은 정렬이 아니므로 플래그 제거
        this.saveAllPositionsWithoutAlignment(elements);
    }
    
    // ========================================================================
    // 요소 위치 설정 (SafeLine 제약 적용)
    // ========================================================================
    setElementPosition($element, left, top) {
        // ✅ 입력값 검증
        if (isNaN(left) || isNaN(top)) {
            console.error('[AlignmentManager] setElementPosition - NaN 감지! left:', left, 'top:', top);
            return;
        }
        
        // SafeLine 제약 적용
        const constrained = window.selectionManager.applySafeLineConstraints(
            left, top, $element
        );
        
        // ✅ 제약 결과 검증
        if (isNaN(constrained.left) || isNaN(constrained.top)) {
            console.error('[AlignmentManager] setElementPosition - constrained 결과가 NaN! constrained:', constrained, 
                '| safeLineManager.safeMargin:', window.safeLineManager?.safeMargin,
                '| safeLineManager.actualWidth:', window.safeLineManager?.actualWidth);
            // NaN일 경우 제약 없이 원래 값 사용
            $element.css({
                left: left + 'px',
                top: top + 'px'
            });
            return;
        }
        
        $element.css({
            left: constrained.left + 'px',
            top: constrained.top + 'px'
        });
    }
    
    // ========================================================================
    // 모든 요소 위치 저장 (정렬 플래그 지원)
    // ========================================================================
    saveAllPositions(elements, horizontalAlign = null, verticalAlign = null) {
        elements.forEach($el => {
            // ✅ 정렬 플래그를 EventManager에 전달
            EventManager.saveElementPositionWithAlignment($el, horizontalAlign, verticalAlign, false);
        });
    }
    
    // ========================================================================
    // 모든 요소 위치 저장 (정렬 플래그 + 기준 좌표 지원)
    // ========================================================================
    saveAllPositionsWithBounds(elements, horizontalAlign = null, verticalAlign = null, bounds = null) {
        // bounds를 백분율로 변환
        const bg = $('#page-preview-img');
        const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);
        
        let alignmentBounds = null;
        if (bounds && actualBgRect) {
            alignmentBounds = {
                left: ((bounds.left - actualBgRect.left) / actualBgRect.width) * 100,
                top: ((bounds.top - actualBgRect.top) / actualBgRect.height) * 100,
                right: ((bounds.right - actualBgRect.left) / actualBgRect.width) * 100,
                bottom: ((bounds.bottom - actualBgRect.top) / actualBgRect.height) * 100,
                centerX: ((bounds.left + bounds.width / 2 - actualBgRect.left) / actualBgRect.width) * 100,
                centerY: ((bounds.top + bounds.height / 2 - actualBgRect.top) / actualBgRect.height) * 100
            };
        }
        
        elements.forEach($el => {
            // 정렬 플래그를 EventManager에 전달
            EventManager.saveElementPositionWithAlignment($el, horizontalAlign, verticalAlign, false);
            
            // ✅ 기준 좌표(alignmentBounds)를 relativeState에 추가 저장
            if (alignmentBounds) {
                const currentState = $el.data('relativeState') || {};
                currentState.alignmentBounds = alignmentBounds;
                $el.data('relativeState', currentState);
            }
        });
    }
    
    // ========================================================================
    // 모든 요소 위치 저장 (정렬 플래그 제거)
    // ========================================================================
    saveAllPositionsWithoutAlignment(elements) {
        elements.forEach($el => {
            EventManager.saveElementPosition($el);
        });
    }
    
    // ========================================================================
    // 정렬 기준 모드 토글
    // ========================================================================
    toggleAlignmentBase() {
        this.alignmentBase = this.alignmentBase === 'page' ? 'selection' : 'page';
        return this.alignmentBase;
    }
    
    // ========================================================================
    // 정렬 기준 모드 설정
    // ========================================================================
    setAlignmentBase(mode) {
        if (mode === 'page' || mode === 'selection') {
            this.alignmentBase = mode;
        }
    }
}