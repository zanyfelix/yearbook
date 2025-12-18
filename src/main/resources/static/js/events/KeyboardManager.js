// ============================================================================
// 📁 js/events/KeyboardManager.js - 키보드 이벤트 관리 클래스
// ============================================================================

class KeyboardManager {
    constructor() {
        // 이동 거리 설정
        this.normalStep = 1;    // 일반 화살표: 1px
        this.shiftStep = 10;    // Shift+화살표: 10px
        
        // 삭제 확인 모드
        this.deleteConfirmRequired = true;
        
        this.init();
    }
    
    init() {
        this.bindKeyboardEvents();
    }
    
    // ========================================================================
    // 키보드 이벤트 바인딩
    // ========================================================================
    bindKeyboardEvents() {
        const self = this;
        
        $(document).off('keydown.keyboard').on('keydown.keyboard', function(e) {
            // 에디터 모달이 열려있을 때만 동작
            if (!$('#editModal').is(':visible')) return;
            
            // 텍스트 편집 중이면 무시
            if ($('.text-box.editing').length > 0) return;
            if ($(document.activeElement).is('input, textarea, select')) return;
            
            // 키 처리
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    self.handleArrowKey(e);
                    break;
                    
                case 'Delete':
                case 'Backspace':
                    self.handleDeleteKey(e);
                    break;
                    
                case 'Escape':
                    self.handleEscapeKey(e);
                    break;
                    
                case 'a':
                case 'A':
                    // Ctrl+A는 MultiSelectionManager에서 처리
                    break;
            }
        });
    }
    
    // ========================================================================
    // 화살표 키 처리
    // ========================================================================
    handleArrowKey(e) {
        // ✅ 사진 선택 상태를 먼저 확인
        if (window.selectionManager && 
            window.selectionManager.selectedMode === 'photo' &&
            window.selectionManager.currentPhoto) {
            
            e.preventDefault();
            
            const step = e.shiftKey ? this.shiftStep : this.normalStep;
            let deltaX = 0, deltaY = 0;
            
            switch (e.key) {
                case 'ArrowLeft':  deltaX = -step; break;
                case 'ArrowRight': deltaX = step;  break;
                case 'ArrowUp':    deltaY = -step; break;
                case 'ArrowDown':  deltaY = step;  break;
            }
            
            this.movePhoto(
                window.selectionManager.currentPhoto,
                window.selectionManager.currentFrame,
                deltaX, deltaY
            );
            return;
        }
        
        // 다중 선택 또는 일반 요소 선택
        const elements = window.multiSelectionManager 
            ? window.multiSelectionManager.getSelectedElements()
            : this.getSingleSelectedElement();
            
        if (!elements || elements.length === 0) return;
        
        e.preventDefault();
        
        // 이동 거리 계산
        const step = e.shiftKey ? this.shiftStep : this.normalStep;
        
        let deltaX = 0, deltaY = 0;
        
        switch (e.key) {
            case 'ArrowLeft':
                deltaX = -step;
                break;
            case 'ArrowRight':
                deltaX = step;
                break;
            case 'ArrowUp':
                deltaY = -step;
                break;
            case 'ArrowDown':
                deltaY = step;
                break;
        }
        
        // 모든 선택된 요소 이동
        this.moveElements(elements, deltaX, deltaY);
    }
    
    // ========================================================================
    // 요소들 이동
    // ========================================================================
    moveElements(elements, deltaX, deltaY) {
        elements.forEach(item => {
            // ✅ 사진 타입인 경우 별도 처리
            if (item.type === 'photo') {
                this.movePhoto(item.photo, item.frame, deltaX, deltaY);
            } else {
                this.moveSingleElement(item, deltaX, deltaY);
            }
        });
    }
    
    // ========================================================================
    // 사진 이동 (프레임 내에서)
    // ========================================================================
    movePhoto($photo, $frame, deltaX, deltaY) {
        // 현재 사진 위치
        const currentLeft = parseFloat($photo.css('left')) || 0;
        const currentTop = parseFloat($photo.css('top')) || 0;
        
        // 새 위치 계산
        let newLeft = currentLeft + deltaX;
        let newTop = currentTop + deltaY;
        
        // 마스크/프레임 경계 제약 적용
        const constrained = this.constrainPhotoPosition($photo, $frame, newLeft, newTop);
        
        // 위치 적용
        $photo.css({
            left: constrained.left + 'px',
            top: constrained.top + 'px'
        });
        
        // 상태 저장
        if (typeof PhotoManager !== 'undefined' && PhotoManager.savePhotoState) {
            PhotoManager.savePhotoState($photo, $frame);
        }
        
        // 선택 UI 업데이트
        this.updatePhotoSelectionUI($photo, $frame);
    }
    
    // ========================================================================
    // 사진 위치 제약 (프레임 밖으로 나가지 않도록)
    // ========================================================================
    constrainPhotoPosition($photo, $frame, newLeft, newTop) {
        const maskContainer = $frame.find('.mask-container');
        
        if (maskContainer.length === 0) {
            return { left: newLeft, top: newTop };
        }
        
        const maskWidth = maskContainer.width();
        const maskHeight = maskContainer.height();
        const photoWidth = $photo.width();
        const photoHeight = $photo.height();
        
        // 사진이 마스크보다 클 때: 사진이 마스크를 완전히 덮도록 제약
        // 사진이 마스크보다 작을 때: 사진이 마스크 안에 있도록 제약
        
        let minLeft, maxLeft, minTop, maxTop;
        
        if (photoWidth >= maskWidth) {
            // 사진이 마스크보다 크거나 같음
            minLeft = maskWidth - photoWidth;  // 음수
            maxLeft = 0;
        } else {
            // 사진이 마스크보다 작음
            minLeft = 0;
            maxLeft = maskWidth - photoWidth;
        }
        
        if (photoHeight >= maskHeight) {
            minTop = maskHeight - photoHeight;  // 음수
            maxTop = 0;
        } else {
            minTop = 0;
            maxTop = maskHeight - photoHeight;
        }
        
        return {
            left: Math.max(minLeft, Math.min(maxLeft, newLeft)),
            top: Math.max(minTop, Math.min(maxTop, newTop))
        };
    }
    
    // ========================================================================
    // 사진 선택 UI 업데이트
    // ========================================================================
    updatePhotoSelectionUI($photo, $frame) {
        if (typeof PhotoManager !== 'undefined') {
            if (PhotoManager.updateSelectionUI) {
                PhotoManager.updateSelectionUI($photo, $frame);
            }
            if (PhotoManager.showOverlay) {
                PhotoManager.showOverlay($photo, $frame);
            }
        }
    }
    
    // ========================================================================
    // 단일 요소 이동
    // ========================================================================
    moveSingleElement($element, deltaX, deltaY) {
        // 현재 위치 가져오기
        const currentLeft = parseFloat($element.css('left')) || 0;
        const currentTop = parseFloat($element.css('top')) || 0;
        
        // 새 위치 계산
        let newLeft = currentLeft + deltaX;
        let newTop = currentTop + deltaY;
        
        // SafeLine 제약 적용
        const constrained = window.selectionManager.applySafeLineConstraints(
            newLeft, newTop, $element
        );
        
        // 위치 적용
        $element.css({
            left: constrained.left + 'px',
            top: constrained.top + 'px'
        });
        
        // 상태 저장
        EventManager.saveElementPosition($element);
        
        // 선택 UI 업데이트
        this.updateSelectionUI($element);
    }
    
    // ========================================================================
    // 선택 UI 업데이트
    // ========================================================================
    updateSelectionUI($element) {
        // 사진이 선택된 경우 오버레이 업데이트
        if ($element.hasClass('selected-photo')) {
            const frameGroup = $element.closest('.frame-group');
            PhotoManager.updateSelectionUI($element, frameGroup);
        }
        
        // 텍스트박스 회전 핸들 업데이트
        if ($element.hasClass('text-box') && $element.hasClass('selected')) {
            window.selectionManager.addTextRotationHandle($element);
        }
        
        // 프레임/엘리먼트 회전 핸들 업데이트
        if ($element.hasClass('selected-frame') || $element.hasClass('selected-element')) {
            FrameManager.addRotationHandle($element);
        }
    }
    
    // ========================================================================
    // Delete/Backspace 키 처리
    // ========================================================================
    handleDeleteKey(e) {
        // ✅ 사진 선택 상태를 먼저 확인
        if (window.selectionManager && 
            window.selectionManager.selectedMode === 'photo' &&
            window.selectionManager.currentPhoto) {
            
            e.preventDefault();
            
            const message = 'Are you sure you want to delete the selected photos?';
            
            if (this.deleteConfirmRequired) {
                UIManager.showDeleteConfirmModal(message, () => {
                    if (typeof EventManager !== 'undefined' && EventManager.deletePhoto) {
                        EventManager.deletePhoto(
                            window.selectionManager.currentPhoto,
                            window.selectionManager.currentFrame
                        );
                    }
                    window.selectionManager.clearSelection();
                });
            } else {
                if (typeof EventManager !== 'undefined' && EventManager.deletePhoto) {
                    EventManager.deletePhoto(
                        window.selectionManager.currentPhoto,
                        window.selectionManager.currentFrame
                    );
                }
                window.selectionManager.clearSelection();
            }
            return;
        }
        
        // 다중 선택 또는 일반 요소 선택
        const elements = window.multiSelectionManager 
            ? window.multiSelectionManager.getSelectedElements()
            : this.getSingleSelectedElement();
            
        if (!elements || elements.length === 0) return;
        
        e.preventDefault();
        
        if (this.deleteConfirmRequired) {
            // 확인 모달 표시
            const count = elements.length;
            const message = count > 1 
                ? `Do you want to delete ${count} element?`
                : 'Do you want to delete the selected elements?';
            
            UIManager.showDeleteConfirmModal(message, () => {
                this.deleteElements(elements);
            });
        } else {
            this.deleteElements(elements);
        }
    }
    
    // ========================================================================
    // 요소들 삭제
    // ========================================================================
    deleteElements(elements) {
        elements.forEach(item => {
            // ✅ 사진 타입인 경우 별도 처리
            if (item.type === 'photo') {
                // 사진 삭제는 EventManager.deletePhoto 사용
                if (typeof EventManager !== 'undefined' && EventManager.deletePhoto) {
                    EventManager.deletePhoto(item.photo, item.frame);
                }
            } else {
                item.remove();
            }
        });
        
        // 선택 해제
        if (window.multiSelectionManager) {
            window.multiSelectionManager.clearSelection();
        } else {
            window.selectionManager.clearSelection();
        }
    }
    
    // ========================================================================
    // Escape 키 처리
    // ========================================================================
    handleEscapeKey(e) {
        e.preventDefault();
        
        // 다중 선택 해제
        if (window.multiSelectionManager) {
            window.multiSelectionManager.clearSelection();
        }
        
        // 단일 선택 해제
        if (window.selectionManager) {
            window.selectionManager.clearSelection();
        }
    }
    
    // ========================================================================
    // 단일 선택된 요소 가져오기
    // ========================================================================
    getSingleSelectedElement() {
        if (!window.selectionManager) return [];
        
        // ✅ 사진 선택 상태 확인 추가
        if (window.selectionManager.selectedMode === 'photo' && 
            window.selectionManager.currentPhoto) {
            return [{ 
                type: 'photo', 
                photo: window.selectionManager.currentPhoto,
                frame: window.selectionManager.currentFrame
            }];
        }
        
        const element = window.selectionManager.currentFrame || 
                       window.selectionManager.currentTextBox ||
                       window.selectionManager.currentElement;
        
        return element ? [element] : [];
    }
    
    // ========================================================================
    // 이동 거리 설정
    // ========================================================================
    setStepSize(normal, shift) {
        if (typeof normal === 'number' && normal > 0) {
            this.normalStep = normal;
        }
        if (typeof shift === 'number' && shift > 0) {
            this.shiftStep = shift;
        }
    }
    
    // ========================================================================
    // 삭제 확인 모드 설정
    // ========================================================================
    setDeleteConfirm(required) {
        this.deleteConfirmRequired = Boolean(required);
    }
    
    // ========================================================================
    // 정리
    // ========================================================================
    destroy() {
        $(document).off('keydown.keyboard');
    }
}