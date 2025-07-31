// ============================================================================
// 📁 js/events/EventManager.js
// ============================================================================
class EventManager {
    static setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer) {
        placeholderLink.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const fileInput = $('#image-upload-input');
            fileInput.data({
                targetFrameGroup: frameGroup,
                targetUploadedPhoto: uploadedPhoto,
                targetPlaceholderLink: placeholderLink,
                targetMaskContainer: maskContainer
            }).trigger('click');
        });

        frameGroup.off('mousedown click dblclick').on('mousedown', (e) => {
            if (e.button !== 0) return;
            
            if (window.selectionManager.selectedMode === 'frame' && window.selectionManager.currentFrame === frameGroup) {
                e.preventDefault();
                e.stopPropagation();
                FrameManager.handleDrag(frameGroup, e);
                return;
            }
            e.preventDefault();
        });

        frameGroup.on('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.selectionManager.selectFrame(frameGroup);
        });

        frameGroup.on('dblclick', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            
            if (uploadedPhoto.is(':visible')) {
                if (window.selectionManager.currentPhoto === uploadedPhoto) {
                    window.selectionManager.selectFrame(frameGroup);
                } else {
                    window.selectionManager.selectPhoto(uploadedPhoto, frameGroup);
                }
            }
        });

        this.setupPhotoEvents(uploadedPhoto, frameGroup, maskContainer);
    }

    static setupPhotoEvents(photo, frameGroup, maskContainer) {
        photo.off('mousedown').on('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();

            if (!photo.hasClass('selected-photo')) {
                window.selectionManager.selectPhoto(photo, frameGroup);
                return;
            }

            PhotoManager.handleDrag(photo, frameGroup, maskContainer, e);
        });
    }
    
    static setupGlobalEvents() {
		// page-preview 영역에 캡처 단계 이벤트 리스너 추가
		document.getElementById('page-preview').addEventListener('click', function(e) {
			const target = e.target;

			// 클릭한 요소가 프레임이나 사진이 아닌 경우에만 선택 해제
			if (!target.closest('.frame-group') &&
				!target.closest('.uploaded-photo') &&
				!target.closest('#frame-controls-tooltip') &&
				!target.closest('#photo-controls-tooltip')) {
				window.selectionManager.clearSelection();
			}
		}, true); // true로 캡처 단계에서 처리

		$(document).on('click', function(e) {
			const $target = $(e.target);
			if (!$target.closest('.frame-group, .uploaded-photo, #frame-controls-tooltip, #photo-controls-tooltip, .modal, .sidebar, button, #page-preview').length) {
				window.selectionManager.clearSelection();
			}
		});
        
        $(document).on('keydown', function(e) {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const focused = document.activeElement;
                if (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.contentEditable === 'true') {
                    return;
                }
                
                e.preventDefault();
                
                if (selectedPhotoWrapper && confirm("사진을 삭제하시겠습니까?")) {
                    const frameGroup = selectedPhotoWrapper.closest('.frame-group');
                    const placeholder = frameGroup.find('.place-image-here-link');
                    selectedPhotoWrapper.hide().attr('src', '');
                    placeholder.show();
                    window.selectionManager.clearSelection();
                } else if (selectedFrame && confirm("프레임을 삭제하시겠습니까?")) {
                    selectedFrame.remove();
                    window.selectionManager.clearSelection();
                }
            }
        });
    }
}