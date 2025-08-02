// ============================================================================
// 📁 js/events/EventManager.js - 최종 수정 버전
// ============================================================================
class EventManager {
	static setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer) {
		// 기존 이벤트 제거
		frameGroup.off('mousedown click dblclick');
		placeholderLink.off('click');
		uploadedPhoto.off('mousedown click dblclick');
		
		// placeholder 링크 이벤트
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

		// 프레임 클릭 이벤트 - 선택만 처리
		frameGroup.on('click', (e) => {
			const target = $(e.target);
			const isPlaceholder = target.hasClass('place-image-here-link') || target.closest('.place-image-here-link').length > 0;

			if (isPlaceholder) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			// 아무것도 선택되지 않았거나 다른 것이 선택된 경우 프레임 선택
			if (window.selectionManager.selectedMode !== 'frame' ||
				window.selectionManager.currentFrame !== frameGroup) {
				window.selectionManager.selectFrame(frameGroup);
			}
		});

		// 프레임 더블클릭 이벤트
		frameGroup.on('dblclick', (e) => {
			e.preventDefault();
			e.stopPropagation();

			const target = $(e.target);
			const isPhotoClick = target.hasClass('uploaded-photo') || target.closest('.uploaded-photo').length > 0;

			// 사진이 있고 표시되는 경우
			if (uploadedPhoto.is(':visible')) {
				// 프레임이 선택된 상태에서 사진 더블클릭 시 사진 선택
				if (window.selectionManager.selectedMode === 'frame' &&
					window.selectionManager.currentFrame === frameGroup &&
					isPhotoClick) {
					window.selectionManager.selectPhoto(uploadedPhoto, frameGroup);
				}
				// 사진이 선택된 상태에서 프레임 영역 더블클릭 시 프레임 선택으로 전환
				else if (window.selectionManager.selectedMode === 'photo' &&
					window.selectionManager.currentPhoto === uploadedPhoto &&
					!isPhotoClick) {
					window.selectionManager.selectFrame(frameGroup);
				}
			}
		});

		// 사진 이벤트 설정
		this.setupPhotoEvents(uploadedPhoto, frameGroup, maskContainer);
		
		// 프레임 드래그를 위한 별도 처리
		this.setupFrameDrag(frameGroup, uploadedPhoto, placeholderLink);
	}

	static setupFrameDrag(frameGroup, uploadedPhoto, placeholderLink) {
		let dragStartX, dragStartY;
		let isDragging = false;
		
		// 모든 자식 요소에서 mousedown 이벤트 감지
		frameGroup.on('mousedown', function(e) {
			if (e.button !== 0) return;
			
			const target = $(e.target);
			const isPlaceholder = target.hasClass('place-image-here-link') || target.closest('.place-image-here-link').length > 0;
			
			// placeholder 클릭은 무시
			if (isPlaceholder) {
				return;
			}
			
			// 프레임이 선택된 상태인지 확인
			const isFrameSelected = window.selectionManager.selectedMode === 'frame' &&
									window.selectionManager.currentFrame &&
									window.selectionManager.currentFrame[0] === frameGroup[0];
			
			// 사진이 선택된 상태인지 확인
			const isPhotoSelected = window.selectionManager.selectedMode === 'photo' &&
									window.selectionManager.currentPhoto === uploadedPhoto;
			
			// 프레임이 선택된 상태에서만 드래그 시작
			if (isFrameSelected && !isPhotoSelected) {
				e.preventDefault();
				e.stopPropagation();
				
				dragStartX = e.clientX;
				dragStartY = e.clientY;
				isDragging = false;
				
				const initialLeft = parseFloat(frameGroup.css('left')) || 0;
				const initialTop = parseFloat(frameGroup.css('top')) || 0;
				
				// document에 mousemove 이벤트 추가
				$(document).on('mousemove.frameDrag', function(ev) {
					// 최소 이동 거리 체크 (5px)
					if (!isDragging && 
						(Math.abs(ev.clientX - dragStartX) > 5 || 
						 Math.abs(ev.clientY - dragStartY) > 5)) {
						isDragging = true;
						frameGroup.addClass('dragging');
					}
					
					if (isDragging) {
						const deltaX = ev.clientX - dragStartX;
						const deltaY = ev.clientY - dragStartY;
						
						let newLeft = initialLeft + deltaX;
						let newTop = initialTop + deltaY;
						
						// SafeLine 제약 적용
						const constrained = window.selectionManager.applySafeLineConstraints(newLeft, newTop, frameGroup);
						
						frameGroup.css({
							left: `${constrained.left}px`,
							top: `${constrained.top}px`
						});
						
						// 툴팁 위치 업데이트
						if (isDragging) {
							UIManager.showFrameTooltip(frameGroup);
						}
					}
				});
				
				// document에 mouseup 이벤트 추가
				$(document).on('mouseup.frameDrag', function() {
					$(document).off('mousemove.frameDrag mouseup.frameDrag');
					frameGroup.removeClass('dragging');
					isDragging = false;
				});
			}
		});
	}

	static setupPhotoEvents(photo, frameGroup, maskContainer) {
		// 사진 클릭 이벤트
		photo.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			// 아무것도 선택 안 된 상태면 프레임 선택
			if (window.selectionManager.selectedMode === null) {
				window.selectionManager.selectFrame(frameGroup);
			}
			// 프레임이 선택된 상태에서 사진 클릭은 무시 (더블클릭으로만 선택)
			else if (window.selectionManager.selectedMode === 'frame' &&
					 window.selectionManager.currentFrame === frameGroup) {
				// 아무 동작 안함
			}
			// 다른 프레임/사진이 선택된 상태면 이 프레임 선택
			else {
				window.selectionManager.selectFrame(frameGroup);
			}
		});

		// 사진 더블클릭 이벤트
		photo.on('dblclick', (e) => {
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
			// 아무것도 선택되지 않은 상태에서 사진 더블클릭 시 사진 선택
			else if (window.selectionManager.selectedMode === null) {
				window.selectionManager.selectPhoto(photo, frameGroup);
			}
		});
		
		// 사진 드래그 이벤트
		photo.on('mousedown', (e) => {
			if (e.button !== 0) return;
			e.preventDefault();
			e.stopPropagation();

			// 사진이 선택된 상태에서만 드래그 가능
			if (window.selectionManager.selectedMode === 'photo' &&
				window.selectionManager.currentPhoto === photo) {
				PhotoManager.handleDrag(photo, frameGroup, maskContainer, e);
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
		}, true);

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