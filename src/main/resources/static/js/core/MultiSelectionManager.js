// ============================================================================
// 📁 js/core/MultiSelectionManager.js - 다중 선택 관리 클래스
// ============================================================================

class MultiSelectionManager {
    constructor() {
        // 선택된 요소들의 배열
        this.selectedElements = [];
        
        // 드래그 선택 관련
        this.isLassoSelecting = false;
        this.lassoStartX = 0;
        this.lassoStartY = 0;
        this.lassoBox = null;
        
        // ✅ 라쏘 선택 완료 후 click 이벤트 무시를 위한 플래그
        this.justFinishedLasso = false;
        
        // 선택 가능한 요소 셀렉터
        this.selectableSelector = '.frame-group, .text-box, .element-frame';
        
        // 이벤트 바인딩
        this.init();
    }
    
    init() {
        this.createLassoBox();
        this.bindEvents();
        console.log('[MultiSelectionManager] 초기화 완료');
    }
    
    // ========================================================================
    // 라쏘(드래그) 선택 박스 생성
    // ========================================================================
    createLassoBox() {
        if ($('#lasso-selection-box').length === 0) {
            this.lassoBox = $('<div id="lasso-selection-box"></div>').css({
                position: 'absolute',
                border: '2px dashed #007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                pointerEvents: 'none',
                zIndex: 10000,
                display: 'none'
            });
            $('#page-preview').append(this.lassoBox);
            console.log('[MultiSelectionManager] 라쏘 박스 생성됨');
        } else {
            this.lassoBox = $('#lasso-selection-box');
        }
    }
    
    // ========================================================================
    // 이벤트 바인딩
    // ========================================================================
    bindEvents() {
        const self = this;
        const $pagePreview = $('#page-preview');
        const pagePreviewEl = $pagePreview[0];
        
        // ✅ 클릭 시 겹친 요소 처리를 위한 캡처 단계 이벤트
        // (캡처 단계에서 처리하여 개별 요소의 이벤트보다 먼저 실행)
        if (pagePreviewEl) {
            // 기존 리스너 제거를 위한 참조 저장
            if (this._clickHandler) {
                pagePreviewEl.removeEventListener('click', this._clickHandler, true);
            }
            
            this._clickHandler = function(e) {
                // 클릭 위치에 있는 모든 요소 찾기
                const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
                
                // 선택 가능한 요소들만 필터링
                const selectableElements = [];
                for (const el of elementsAtPoint) {
                    const $el = $(el).closest(self.selectableSelector);
                    if ($el.length > 0) {
                        // 중복 방지
                        let isDuplicate = false;
                        for (const existing of selectableElements) {
                            if (existing[0] === $el[0]) {
                                isDuplicate = true;
                                break;
                            }
                        }
                        if (!isDuplicate) {
                            selectableElements.push($el);
                        }
                    }
                }
                
                // 겹친 요소가 2개 이상일 때만 특수 처리
                if (selectableElements.length < 2) return;
                
                // ========================================
                // Ctrl+클릭: 다중 선택 처리
                // ========================================
                if (e.ctrlKey || e.metaKey) {
                    console.log('[MultiSelectionManager] Ctrl+클릭 - 겹친 요소 감지:', selectableElements.length);
                    
                    // 선택되지 않은 요소 중 하나를 찾기
                    let targetElement = null;
                    for (const $el of selectableElements) {
                        const isAlreadySelected = self.findElementIndex($el) >= 0;
                        const isSingleSelected = (window.selectionManager && 
                            (window.selectionManager.currentFrame?.[0] === $el[0] ||
                             window.selectionManager.currentTextBox?.[0] === $el[0] ||
                             window.selectionManager.currentElement?.[0] === $el[0]));
                        
                        if (!isAlreadySelected && !isSingleSelected) {
                            targetElement = $el;
                            break;
                        }
                    }
                    
                    // 선택되지 않은 요소가 있고, 그것이 클릭한 요소가 아니면 가로채서 처리
                    if (targetElement) {
                        const clickedElement = $(e.target).closest(self.selectableSelector);
                        
                        // 클릭한 요소와 다른 요소(아래에 가려진 요소)를 선택해야 하는 경우
                        if (clickedElement.length > 0 && clickedElement[0] !== targetElement[0]) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            console.log('[MultiSelectionManager] 가려진 요소 선택:', targetElement[0].className);
                            self.toggleSelection(targetElement);
                            return;
                        }
                    }
                }
                // ========================================
                // 일반 클릭: 단일 선택 처리 (텍스트 우선)
                // ========================================
                else {
                    // 현재 선택된 요소 확인
                    const currentSelected = window.selectionManager?.currentFrame ||
                                           window.selectionManager?.currentTextBox ||
                                           window.selectionManager?.currentElement;
                    
                    // 클릭한 요소
                    const clickedElement = $(e.target).closest(self.selectableSelector);
                    if (!clickedElement.length) return;
                    
                    // 겹친 요소 중에서 텍스트(.text-box)를 우선적으로 찾기
                    let textBoxElement = null;
                    
                    for (const $el of selectableElements) {
                        // 현재 선택된 요소는 스킵
                        if (currentSelected && $el[0] === currentSelected[0]) continue;
                        
                        if ($el.hasClass('text-box')) {
                            textBoxElement = $el;
                            break; // 텍스트를 찾으면 바로 종료
                        }
                    }
                    
                    // 가려진 텍스트가 있고, 클릭한 요소가 텍스트가 아닌 경우
                    if (textBoxElement && !clickedElement.hasClass('text-box')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        console.log('[MultiSelectionManager] 단일선택 - 가려진 텍스트 선택:', textBoxElement[0].className);
                        window.selectionManager.selectTextBox(textBoxElement);
                        return;
                    }
                }
            };
            
            // 캡처 단계에서 이벤트 처리 (true = capture phase)
            pagePreviewEl.addEventListener('click', this._clickHandler, true);
        }
        
        // 드래그 선택 (라쏘) - 빈 영역에서만 시작
        $pagePreview.off('mousedown.lasso').on('mousedown.lasso', function(e) {
            // 요소 위에서 시작하면 라쏘 시작하지 않음
            if ($(e.target).closest(self.selectableSelector).length > 0) return;
            if ($(e.target).closest('#editor-toolbar').length > 0) return;
            if ($(e.target).closest('.control-btn, .btn').length > 0) return;
            if (e.button !== 0) return; // 좌클릭만
            
            // ✅ 이미지 기본 드래그 방지
            e.preventDefault();
            
            console.log('[MultiSelectionManager] 라쏘 시작');
            self.startLassoSelection(e);
        });
        
        // Ctrl+A 전체 선택 (또는 Cmd+A on Mac)
        $(document).off('keydown.multiSelectAll').on('keydown.multiSelectAll', function(e) {
            if (!$('#editModal').is(':visible')) return;
            
            // Ctrl+A (또는 Cmd+A on Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                // 텍스트 편집 중이면 무시
                if ($('.text-box.editing').length > 0) return;
                // input, textarea 등에 포커스가 있으면 무시
                if ($(document.activeElement).is('input, textarea, select, [contenteditable="true"]')) return;
                
                e.preventDefault();
                self.selectAll();
            }
            
            // ESC로 선택 해제
            if (e.key === 'Escape') {
                self.clearSelection();
            }
        });
        
        console.log('[MultiSelectionManager] 이벤트 바인딩 완료');
    }
    
    // ========================================================================
    // 라쏘 선택 시작
    // ========================================================================
    startLassoSelection(e) {
        const $pagePreview = $('#page-preview');
        const offset = $pagePreview.offset();
        
        this.isLassoSelecting = true;
        this.lassoStartX = e.pageX - offset.left;
        this.lassoStartY = e.pageY - offset.top;
        
        // Ctrl이 눌리지 않았으면 기존 선택 해제 (UI 숨기지 않고 배열만 비움)
        if (!e.ctrlKey && !e.metaKey) {
            // ✅ 다중 선택 요소들의 클래스만 제거
            this.selectedElements.forEach($el => {
                $el.removeClass('multi-selected');
            });
            this.selectedElements = [];
            
            // ✅ 단일 선택도 해제 (UI는 나중에 updateMultiSelectionUI에서 처리)
            if (window.selectionManager) {
                window.selectionManager.clearSelection();
            }
        }
        
        console.log('[MultiSelectionManager] 라쏘 시작');
        
        this.lassoBox.css({
            left: this.lassoStartX + 'px',
            top: this.lassoStartY + 'px',
            width: '0px',
            height: '0px',
            display: 'block'
        });
        
        const self = this;
        
        $(document).on('mousemove.lasso', function(ev) {
            self.updateLassoSelection(ev);
        });
        
        $(document).on('mouseup.lasso', function(ev) {
            self.endLassoSelection(ev);
        });
    }
    
    // ========================================================================
    // 라쏘 선택 업데이트
    // ========================================================================
    updateLassoSelection(e) {
        if (!this.isLassoSelecting) return;
        
        const $pagePreview = $('#page-preview');
        const offset = $pagePreview.offset();
        
        const currentX = e.pageX - offset.left;
        const currentY = e.pageY - offset.top;
        
        const left = Math.min(this.lassoStartX, currentX);
        const top = Math.min(this.lassoStartY, currentY);
        const width = Math.abs(currentX - this.lassoStartX);
        const height = Math.abs(currentY - this.lassoStartY);
        
        this.lassoBox.css({
            left: left + 'px',
            top: top + 'px',
            width: width + 'px',
            height: height + 'px'
        });
    }
    
    // ========================================================================
    // 라쏘 선택 종료
    // ========================================================================
    endLassoSelection(e) {
        if (!this.isLassoSelecting) return;
        
        console.log('[MultiSelectionManager] endLassoSelection 시작');
        
        $(document).off('mousemove.lasso mouseup.lasso');
        
        const lassoRect = {
            left: parseFloat(this.lassoBox.css('left')),
            top: parseFloat(this.lassoBox.css('top')),
            width: parseFloat(this.lassoBox.css('width')),
            height: parseFloat(this.lassoBox.css('height'))
        };
        
        console.log('[MultiSelectionManager] lassoRect:', lassoRect);
        
        // 최소 크기 체크 (클릭만 한 경우)
        if (lassoRect.width > 5 && lassoRect.height > 5) {
            this.selectElementsInRect(lassoRect, e.ctrlKey || e.metaKey);
        }
        
        this.lassoBox.css('display', 'none');
        this.isLassoSelecting = false;
        
        // ✅ 라쏘 완료 후 click 이벤트에서 선택 해제 방지
        this.justFinishedLasso = true;
        console.log('[MultiSelectionManager] justFinishedLasso = true, 선택 개수:', this.selectedElements.length);
        
        setTimeout(() => {
            this.justFinishedLasso = false;
        }, 100);
    }
    
    // ========================================================================
    // 영역 내 요소 선택 (라쏘)
    // ========================================================================
    selectElementsInRect(lassoRect, addToSelection) {
        const self = this;
        const $container = $('#frame-container');
        const pagePreviewOffset = document.getElementById('page-preview').getBoundingClientRect();
        
        console.log('[MultiSelectionManager] selectElementsInRect 시작, addToSelection:', addToSelection);
        
        // 라쏘 영역을 page-preview 기준에서 절대 좌표로 변환
        const lassoAbsRect = {
            left: pagePreviewOffset.left + lassoRect.left,
            top: pagePreviewOffset.top + lassoRect.top,
            right: pagePreviewOffset.left + lassoRect.left + lassoRect.width,
            bottom: pagePreviewOffset.top + lassoRect.top + lassoRect.height
        };
        
        console.log('[MultiSelectionManager] lassoAbsRect:', lassoAbsRect);
        
        let foundCount = 0;
        $container.find(this.selectableSelector).each(function() {
            const $el = $(this);
            const elRect = this.getBoundingClientRect();
            
            // 요소의 중심점이 라쏘 영역 안에 있는지 확인
            const centerX = elRect.left + elRect.width / 2;
            const centerY = elRect.top + elRect.height / 2;
            
            if (centerX >= lassoAbsRect.left && 
                centerX <= lassoAbsRect.right &&
                centerY >= lassoAbsRect.top && 
                centerY <= lassoAbsRect.bottom) {
                // ✅ 직접 추가 (clearSelection 호출 없이)
                if (self.findElementIndex($el) < 0) {
                    self.selectedElements.push($el);
                    $el.addClass('multi-selected');
                    foundCount++;
                    console.log('[MultiSelectionManager] 요소 추가:', $el[0].className);
                }
            }
        });
        
        console.log('[MultiSelectionManager] 라쏘에서 찾은 요소:', foundCount, '총 선택:', this.selectedElements.length);
        this.updateMultiSelectionUI();
    }
    
    // ========================================================================
    // 선택 토글 (Ctrl+클릭)
    // ========================================================================
    toggleSelection($element) {
        // ✅ 먼저 기존 단일 선택 요소를 확인
        let previousSingle = null;
        
        if (window.selectionManager) {
            previousSingle = window.selectionManager.currentFrame || 
                             window.selectionManager.currentTextBox ||
                             window.selectionManager.currentElement;
            
            // 단일 선택 UI 해제 (z-index 복원됨)
            if (previousSingle) {
                window.selectionManager.clearSelection();
            }
        }
        
        // ✅ 기존 단일 선택 요소를 selectedElements에 추가
        if (previousSingle && this.findElementIndex(previousSingle) < 0) {
            this.selectedElements.push(previousSingle);
            previousSingle.addClass('multi-selected');
            // z-index는 clearSelection에서 이미 원래 값으로 복원됨
        }
        
        const index = this.findElementIndex($element);
        
        if (index >= 0) {
            // 이미 선택됨 -> 선택 해제
            this.removeFromSelection($element);
        } else {
            // 선택되지 않음 -> 선택 추가
            this.selectedElements.push($element);
            $element.addClass('multi-selected');
            // 다중 선택 시에는 z-index를 올리지 않음 (기존 z-index 유지)
        }
        
        // ✅ UI 업데이트는 마지막에 한 번만
        this.updateMultiSelectionUI();
        console.log('[MultiSelectionManager] 토글 후 선택 개수:', this.selectedElements.length);
    }
    
    // ========================================================================
    // 선택에 추가
    // ========================================================================
    addToSelection($element) {
        // ✅ 기존 단일 선택된 요소가 있으면 먼저 다중선택에 포함
        if (window.selectionManager) {
            const currentSingle = window.selectionManager.currentFrame || 
                                  window.selectionManager.currentTextBox ||
                                  window.selectionManager.currentElement;
            
            if (currentSingle && this.findElementIndex(currentSingle) < 0) {
                // 기존 단일 선택 요소를 다중선택에 추가
                this.selectedElements.push(currentSingle);
                currentSingle.addClass('multi-selected');
            }
            
            // 단일 선택 UI 해제 (요소는 유지)
            window.selectionManager.clearSelection();
        }
        
        // 새 요소 추가
        if (this.findElementIndex($element) < 0) {
            this.selectedElements.push($element);
            $element.addClass('multi-selected');
        }
    }
    
    // ========================================================================
    // 선택에서 제거
    // ========================================================================
    removeFromSelection($element) {
        const index = this.findElementIndex($element);
        if (index >= 0) {
            this.selectedElements.splice(index, 1);
            $element.removeClass('multi-selected');
        }
    }
    
    // ========================================================================
    // 요소 인덱스 찾기
    // ========================================================================
    findElementIndex($element) {
        for (let i = 0; i < this.selectedElements.length; i++) {
            if (this.selectedElements[i][0] === $element[0]) {
                return i;
            }
        }
        return -1;
    }
    
    // ========================================================================
    // 전체 선택
    // ========================================================================
    selectAll() {
        const self = this;
        this.clearSelection();
        
        $('#frame-container').find(this.selectableSelector).each(function() {
            self.addToSelection($(this));
        });
        
        this.updateMultiSelectionUI();
    }
    
    // ========================================================================
    // 선택 해제
    // ========================================================================
    clearSelection() {
        this.selectedElements.forEach($el => {
            $el.removeClass('multi-selected');
        });
        this.selectedElements = [];
        
        // 단일 선택도 해제
        if (window.selectionManager) {
            window.selectionManager.clearSelection();
        }
        
        UIManager.hideAllToolbars();
    }
    
    // ========================================================================
    // 다중 선택 UI 업데이트
    // ========================================================================
    updateMultiSelectionUI() {
        console.log('[MultiSelectionManager] updateMultiSelectionUI - 선택 개수:', this.selectedElements.length);
        
        // ✅ 2개 이상 선택 시 다중 선택 툴바 표시
        if (this.selectedElements.length >= 2) {
            UIManager.showMultiSelectionToolbar(this.selectedElements);
        } else if (this.selectedElements.length === 1) {
            // 단일 선택으로 전환
            const $el = this.selectedElements[0];
            this.selectedElements = [];
            $el.removeClass('multi-selected');
            
            // 요소 타입에 따라 적절한 선택 메서드 호출
            if ($el.hasClass('text-box')) {
                window.selectionManager.selectTextBox($el);
            } else if ($el.hasClass('element-frame')) {
                window.selectionManager.selectElement($el);
            } else if ($el.hasClass('frame-group')) {
                window.selectionManager.selectFrame($el);
            }
        } else {
            UIManager.hideAllToolbars();
        }
    }
    
    // ========================================================================
    // 선택된 요소들 가져오기
    // ========================================================================
    getSelectedElements() {
        // 다중 선택이 있으면 반환
        if (this.selectedElements.length > 0) {
            return this.selectedElements;
        }
        
        // 단일 선택 확인
        if (window.selectionManager) {
            const single = window.selectionManager.currentFrame || 
                          window.selectionManager.currentTextBox ||
                          window.selectionManager.currentElement;
            if (single) {
                return [single];
            }
        }
        
        return [];
    }
    
    // ========================================================================
    // 다중 선택 여부 확인
    // ========================================================================
    hasMultipleSelection() {
        return this.selectedElements.length > 1;
    }
    
    // ========================================================================
    // 선택된 요소 개수
    // ========================================================================
    getSelectionCount() {
        return this.selectedElements.length || (this.getSelectedElements().length);
    }
}