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
    // 사진 이동 (프레임 내에서) — 드래그와 동일한 좌표계(transform tx/ty) 사용
    // ========================================================================
    movePhoto($photo, $frame, deltaX, deltaY) {
        // ✅ 드래그(handleDrag)와 동일: transform matrix의 tx/ty로 위치 관리
        const currentTransform = $photo.css('transform');
        const matrix = TransformHelper.parseMatrix(currentTransform);

        const currentTx = matrix.tx;
        const currentTy = matrix.ty;

        let newTx = currentTx + deltaX;
        let newTy = currentTy + deltaY;

        // ✅ 드래그와 동일한 마스크 bounds 기준 제약
        const mb = PhotoManager.getMaskBoundsPixels($frame);
        const pw = $photo.outerWidth();
        const ph = $photo.outerHeight();

        // softClamp: 현재 위치가 범위 밖이더라도 더 벗어나는 방향만 차단
        const softClamp = (cur, next, min, max) => {
            if (cur < min) return Math.min(max, Math.max(cur, next));
            if (cur > max) return Math.max(min, Math.min(cur, next));
            return Math.max(min, Math.min(max, next));
        };

        if (pw >= mb.width) {
            const minTx = mb.x + mb.width - pw;  // 사진 우측 = 마스크 우측
            const maxTx = mb.x;                   // 사진 좌측 = 마스크 좌측
            newTx = softClamp(currentTx, newTx, minTx, maxTx);
        }
        if (ph >= mb.height) {
            const minTy = mb.y + mb.height - ph;
            const maxTy = mb.y;
            newTy = softClamp(currentTy, newTy, minTy, maxTy);
        }

        // transform으로 위치 적용 (rotation 등 기존 matrix 값 유지)
        const newMatrix = { ...matrix, tx: newTx, ty: newTy };
        $photo.css('transform', TransformHelper.composeMatrix(newMatrix));

        // 상태 저장
        if (typeof PhotoManager !== 'undefined' && PhotoManager.savePhotoState) {
            PhotoManager.savePhotoState($photo, $frame);
        }

        // 선택 UI 업데이트
        this.updatePhotoSelectionUI($photo, $frame);
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
        // 현재 CSS 위치 + transform translate 추출
        const currentTransform = $element.css('transform');
        let translateX = 0, translateY = 0, rotation = 0;
        if (currentTransform && currentTransform !== 'none') {
            const matrix = currentTransform.match(
                /matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/
            );
            if (matrix) {
                const a = parseFloat(matrix[1]);
                const b = parseFloat(matrix[2]);
                translateX = parseFloat(matrix[5]);
                translateY = parseFloat(matrix[6]);
                rotation   = Math.atan2(b, a); // 라디안
            }
        }

        // 현재 시각적 위치 = CSS left/top + alignment translate
        const currentLeft = (parseFloat($element.css('left')) || 0) + translateX;
        const currentTop  = (parseFloat($element.css('top'))  || 0) + translateY;

        // 새 시각적 위치에 delta 적용
        let newLeft = currentLeft + deltaX;
        let newTop  = currentTop  + deltaY;

        // SafeLine 제약 적용
        const constrained = window.selectionManager.applySafeLineConstraints(
            newLeft, newTop, $element
        );

        // translate 없이 left/top으로만 위치 적용 (rotation만 유지)
        const rotationTransform = (rotation !== 0)
            ? `rotate(${rotation}rad)`
            : 'none';

        $element.css({
            left:      constrained.left + 'px',
            top:       constrained.top  + 'px',
            transform: rotationTransform
        });

        // relativeState 저장
        EventManager.saveElementPosition($element);

        // ✅ 방향키 수동 이동 시 alignment 클리어 → 복원 시 snap-back 방지
        const relativeState = $element.data('relativeState');
        if (relativeState) {
            relativeState.alignment      = { horizontal: null, vertical: null };
            relativeState.alignmentBounds = null;
            relativeState.translateX      = 0;
            relativeState.translateY      = 0;
            $element.data('relativeState', relativeState);
        }

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