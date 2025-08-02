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

			// 클릭한 대상 확인
			const target = $(e.target);
			const isPhoto = target.hasClass('uploaded-photo') || target.closest('.uploaded-photo').length > 0;
			const isPlaceholder = target.hasClass('place-image-here-link') || target.closest('.place-image-here-link').length > 0;
			const isFrameOverlay = target.hasClass('frame-overlay') || target.closest('.frame-overlay').length > 0;
			const isMaskContainer = target.hasClass('mask-container') || target.closest('.mask-container').length > 0;
			const isPhotoContainer = target.hasClass('photo-container') || target.closest('.photo-container').length > 0;

			// 사진이나 placeholder 링크가 아닌 경우에만 프레임 드래그 처리
			if (!isPhoto && !isPlaceholder) {
				e.preventDefault();
				e.stopPropagation();

				// 프레임이 이미 선택된 상태면 드래그 시작
				if (window.selectionManager.selectedMode === 'frame' &&
					window.selectionManager.currentFrame === frameGroup) {
					FrameManager.handleDrag(frameGroup, e);
				}
			}
		});

		frameGroup.on('click', (e) => {
			// 클릭한 대상 확인
			const target = $(e.target);
			const isPhoto = target.hasClass('uploaded-photo') || target.closest('.uploaded-photo').length > 0;
			const isPlaceholder = target.hasClass('place-image-here-link') || target.closest('.place-image-here-link').length > 0;

			// 사진이나 placeholder 링크가 아닌 경우에만 처리
			if (!isPhoto && !isPlaceholder) {
				e.preventDefault();
				e.stopImmediatePropagation();

				// 아무것도 선택되지 않았거나, 다른 프레임/사진이 선택된 경우에만 프레임 선택
				if (window.selectionManager.selectedMode === null ||
					window.selectionManager.currentFrame !== frameGroup) {
					window.selectionManager.selectFrame(frameGroup);
				}
			}
		});

		frameGroup.on('dblclick', (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();

			// 클릭한 대상이 사진인지 확인
			const target = $(e.target);
			const isPhotoClick = target.hasClass('uploaded-photo') || target.closest('.uploaded-photo').length > 0;

			// 사진이 있고 표시되는 경우
			if (uploadedPhoto.is(':visible')) {
				// 프레임이 선택된 상태에서 프레임 영역(사진 제외) 더블클릭 시에는 아무 동작 안함
				if (window.selectionManager.selectedMode === 'frame' &&
					window.selectionManager.currentFrame === frameGroup &&
					!isPhotoClick) {
					return;
				}
				// 사진이 선택된 상태에서 프레임 영역 더블클릭 시 프레임 선택으로 전환
				else if (window.selectionManager.selectedMode === 'photo' &&
					window.selectionManager.currentPhoto === uploadedPhoto &&
					!isPhotoClick) {
					window.selectionManager.selectFrame(frameGroup);
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

			// 사진이 이미 선택된 상태에서만 드래그 가능
			if (window.selectionManager.selectedMode === 'photo' &&
				window.selectionManager.currentPhoto === photo) {
				PhotoManager.handleDrag(photo, frameGroup, maskContainer, e);
			}
			// 그 외의 경우는 클릭 무시
		});

		// 사진 더블클릭 이벤트
		photo.off('dblclick').on('dblclick', (e) => {
			e.preventDefault();
			e.stopPropagation();

			// 프레임이 선택된 상태에서 사진 더블클릭 시 사진 선택
			if (window.selectionManager.selectedMode === 'frame' &&
				window.selectionManager.currentFrame === frameGroup) {
				window.selectionManager.selectPhoto(photo, frameGroup);
			}
			// 사진이 선택된 상태에서 더블클릭 시 프레임 선택으로 전환
			else if (window.selectionManager.selectedMode === 'photo' &&
				window.selectionManager.currentPhoto === photo) {
				window.selectionManager.selectFrame(frameGroup);
			}
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