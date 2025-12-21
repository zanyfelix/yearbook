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
        
        elements.forEach($el => {
            const rect = this.getElementRect($el);
            minLeft = Math.min(minLeft, rect.left);
            minTop = Math.min(minTop, rect.top);
            maxRight = Math.max(maxRight, rect.left + rect.width);
            maxBottom = Math.max(maxBottom, rect.top + rect.height);
        });
        
        return {
            left: minLeft,
            top: minTop,
            right: maxRight,
            bottom: maxBottom,
            width: maxRight - minLeft,
            height: maxBottom - minTop
        };
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
        if (!elements || elements.length === 0) return;
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        elements.forEach($el => {
            // ✅ 이미 좌측 정렬된 상태면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.horizontal === 'left') {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newLeft = bounds.left;
            
            this.setElementPosition($el, newLeft, rect.top);
        });
        
        // ✅ 수평 정렬 플래그: 'left'
        this.saveAllPositions(elements, 'left', null);
    }
    
    // ========================================================================
    // 수평 중앙 정렬 (Align Center Horizontal)
    // ========================================================================
    alignCenterH(elements) {
        if (!elements || elements.length === 0) return;
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        const boundsCenter = bounds.left + bounds.width / 2;
        
        elements.forEach($el => {
            // ✅ 이미 수평 중앙 정렬된 상태면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.horizontal === 'center') {
                console.log('이미 수평 중앙 정렬 상태 - 스킵');
                return;
            }
            
            const rect = this.getElementRect($el);
            const newLeft = boundsCenter - rect.width / 2;
            
            this.setElementPosition($el, newLeft, rect.top);
        });
        
        // ✅ 수평 정렬 플래그: 'center'
        this.saveAllPositions(elements, 'center', null);
    }
    
    // ========================================================================
    // 우측 정렬 (Align Right)
    // ========================================================================
    alignRight(elements) {
        if (!elements || elements.length === 0) return;
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        elements.forEach($el => {
            // ✅ 이미 우측 정렬된 상태면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.horizontal === 'right') {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newLeft = bounds.right - rect.width;
            
            this.setElementPosition($el, newLeft, rect.top);
        });
        
        // ✅ 수평 정렬 플래그: 'right'
        this.saveAllPositions(elements, 'right', null);
    }
    
    // ========================================================================
    // 상단 정렬 (Align Top)
    // ========================================================================
    alignTop(elements) {
        if (!elements || elements.length === 0) return;
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        elements.forEach($el => {
            // ✅ 이미 상단 정렬된 상태면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.vertical === 'top') {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newTop = bounds.top;
            
            this.setElementPosition($el, rect.left, newTop);
        });
        
        // ✅ 수직 정렬 플래그: 'top'
        this.saveAllPositions(elements, null, 'top');
    }
    
    // ========================================================================
    // 수직 중앙 정렬 (Align Center Vertical)
    // ========================================================================
    alignCenterV(elements) {
        if (!elements || elements.length === 0) return;
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        const boundsMiddle = bounds.top + bounds.height / 2;
        
        elements.forEach($el => {
            // ✅ 이미 수직 중앙 정렬된 상태면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.vertical === 'center') {
                console.log('이미 수직 중앙 정렬 상태 - 스킵');
                return;
            }
            
            const rect = this.getElementRect($el);
            const newTop = boundsMiddle - rect.height / 2;
            
            this.setElementPosition($el, rect.left, newTop);
        });
        
        // ✅ 수직 정렬 플래그: 'center'
        this.saveAllPositions(elements, null, 'center');
    }
    
    // ========================================================================
    // 하단 정렬 (Align Bottom)
    // ========================================================================
    alignBottom(elements) {
        if (!elements || elements.length === 0) return;
        
        const bounds = this.getAlignmentBounds(elements);
        if (!bounds) return;
        
        elements.forEach($el => {
            // ✅ 이미 하단 정렬된 상태면 스킵
            const existingState = $el.data('relativeState') || {};
            if (existingState.alignment?.vertical === 'bottom') {
                return;
            }
            
            const rect = this.getElementRect($el);
            const newTop = bounds.bottom - rect.height;
            
            this.setElementPosition($el, rect.left, newTop);
        });
        
        // ✅ 수직 정렬 플래그: 'bottom'
        this.saveAllPositions(elements, null, 'bottom');
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
        // SafeLine 제약 적용
        const constrained = window.selectionManager.applySafeLineConstraints(
            left, top, $element
        );
        
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
            EventManager.saveElementPositionWithAlignment($el, horizontalAlign, verticalAlign, false);
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