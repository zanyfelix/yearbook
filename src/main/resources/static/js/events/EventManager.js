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

			// 사진이 존재하고, 사진 영역을 더블클릭했을 경우
			if (isPhotoClick && uploadedPhoto.is(':visible')) {

				// 현재 '사진'이 선택된 상태라면 -> '프레임' 선택으로 전환
				if (window.selectionManager.selectedMode === 'photo') {
					window.selectionManager.selectFrame(frameGroup);
				}
				// 현재 '프레임'이 선택되었거나 아무것도 선택되지 않았다면 -> '사진' 선택
				else {
					window.selectionManager.selectPhoto(uploadedPhoto, frameGroup);
				}

			}
			// 사진이 아닌 프레임의 다른 영역을 더블클릭했을 경우
			else {
				// 현재 '사진'이 선택된 상태였다면 -> '프레임' 선택으로 전환
				if (window.selectionManager.selectedMode === 'photo' && window.selectionManager.currentPhoto === uploadedPhoto) {
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
				
				// ✨ --- 핵심 수정: 드래그가 끝나는 시점에 위치 저장 --- ✨
				$(document).on('mouseup.frameDrag', function() {
					$(document).off('mousemove.frameDrag mouseup.frameDrag');
					frameGroup.removeClass('dragging');
					isDragging = false;

					// ▼▼▼▼▼ 이 블록 추가 ▼▼▼▼▼
					const bg = $('#page-preview-img');
					const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
					if (actualBgRect) {
						const framePos = frameGroup.position();
						const currentState = frameGroup.data('relativeState') || {};

						currentState.position = {
							left: ((framePos.left - actualBgRect.left) / actualBgRect.width) * 100,
							top: ((framePos.top - actualBgRect.top) / actualBgRect.height) * 100
						};
						frameGroup.data('relativeState', currentState);
					}
					// ▲▲▲▲▲ 추가 종료 ▲▲▲▲▲
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
			// ✨✨✨ 추가된 부분 시작 ✨✨✨
			// 사진이 이미 선택된 상태에서 다시 클릭해도 아무 동작 안함
			else if (window.selectionManager.selectedMode === 'photo' &&
					 window.selectionManager.currentPhoto === photo) {
				// 아무 동작 안함
			}
			// ✨✨✨ 추가된 부분 끝 ✨✨✨
			// 그 외 다른 것이 선택된 경우, 이 프레임을 선택
			else {
				window.selectionManager.selectFrame(frameGroup);
			}
		});

		// 사진 드래그 이벤트
		photo.on('mousedown', (e) => {
			if (e.button !== 0) return;

			// 사진이 선택된 상태에서만 사진 드래그를 처리하고 이벤트 전파를 중단합니다.
			if (window.selectionManager.selectedMode === 'photo' &&
				window.selectionManager.currentPhoto === photo) {

				e.preventDefault();
				e.stopPropagation(); // <-- 이 코드를 if문 안으로 이동
				PhotoManager.handleDrag(photo, frameGroup, maskContainer, e);
			}
		});
	}
	
	static setupTextEvents(textBox) {
		// 기존 이벤트를 모두 초기화
		textBox.off('click dblclick mousedown keydown');

		// 한 번 클릭: '선택' 상태로 전환
		textBox.on('click', function(e) {
			e.stopPropagation();
			const $this = $(this);
			if (!$this.hasClass('selected')) {
				window.selectionManager.selectTextBox($this);
			}
		});

		// 더블 클릭: '편집' 상태로 전환
		textBox.on('dblclick', function(e) {
			e.stopPropagation();
			const $this = $(this);
			
			if ($this.hasClass('selected')) {
				$this.addClass('editing');
				$this.focus(); // 텍스트 커서 활성화
			}
		});
		
		// ✨ 텍스트 입력 시 크기 저장 추가
		textBox.on('input', function() {
			const $this = $(this);

			// 짧은 지연 후 크기 측정 (렌더링 완료 대기)
			setTimeout(() => {
				const bg = $('#page-preview-img');
				const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
				if (actualBgRect) {
					const boxPos = $this.position();
					const boxW = $this.outerWidth();
					const boxH = $this.outerHeight();

					const currentState = $this.data('relativeState') || {};

					currentState.position = {
						left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100,
						top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100
					};
					currentState.size = {
						width: (boxW / actualBgRect.width) * 100,
						height: (boxH / actualBgRect.height) * 100
					};
					
					// ✨ transform 유지
					if (!currentState.transform) {
						currentState.transform = $this.css('transform') || 'none';
					}

					$this.data('relativeState', currentState);
				}
			}, 10);
		});

		// 마우스 다운: '선택' 상태일 때만 드래그 시작
		textBox.on('mousedown', function(e) {
			e.stopPropagation();
			const $this = $(this);
			
			// 브라우저의 기본 동작(텍스트 선택 및 포커스)을 항상 막아 깜박임 현상을 방지합니다.
			if (!$this.hasClass('editing')) {
				e.preventDefault();
			}

			// '선택' 상태이고 '편집' 상태가 아닐 때만 드래그를 허용합니다.
			if ($this.hasClass('selected') && !$this.hasClass('editing')) {
				e.preventDefault(); // 드래그 중 텍스트가 선택되는 현상 방지

				const startX = e.clientX;
				const startY = e.clientY;
				const initialLeft = $this.position().left;
				const initialTop = $this.position().top;
				
				// ✨ 현재 박스가 세이프라인을 넘었는지 체크
				const bg = $('#page-preview-img');
				const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
				const boxWidth = $this.outerWidth();
				const boxHeight = $this.outerHeight();

				let isAlreadyOverflowing = false;
				if (actualBgRect) {
					const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
					const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;
					const safeRight = actualBgRect.left + actualBgRect.width - safeMarginX;
					const safeBottom = actualBgRect.top + actualBgRect.height - safeMarginY;

					// 현재 이미 세이프라인을 넘었는지 확인
					if (initialLeft + boxWidth > safeRight || initialTop + boxHeight > safeBottom) {
						isAlreadyOverflowing = true;
					}
				}

				$(document).on('mousemove.textDrag', function(ev) {
					const newLeft = initialLeft + (ev.clientX - startX);
					const newTop = initialTop + (ev.clientY - startY);
					
					// ✨ 이미 넘친 박스는 세이프라인 제약을 적용하지 않음
					if (isAlreadyOverflowing) {
						// 화면 밖으로만 나가지 않도록 최소한의 제약
						const minLeft = actualBgRect ? actualBgRect.left : 0;
						const minTop = actualBgRect ? actualBgRect.top : 0;

						$this.css({
							left: Math.max(minLeft, newLeft) + 'px',
							top: Math.max(minTop, newTop) + 'px'
						});
					} else {
						// 기존 세이프라인 제약 적용
						const constrained = window.selectionManager.applySafeLineConstraints(newLeft, newTop, $this);
						$this.css({
							left: constrained.left + 'px',
							top: constrained.top + 'px'
						});
					}
				});

				// ✨ --- 핵심 수정: 텍스트 상자 드래그 종료 시 위치 저장 --- ✨
				$(document).on('mouseup.textDrag', function() {
					$(document).off('.textDrag');

					const bg = $('#page-preview-img');
					const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
					if (actualBgRect) {
						const boxPos = textBox.position();
						const currentState = textBox.data('relativeState') || {};

						currentState.position = {
							left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100,
							top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100
						};

						// ✨ 크기 정보도 함께 저장
						currentState.size = {
							width: (textBox.outerWidth() / actualBgRect.width) * 100,
							height: (textBox.outerHeight() / actualBgRect.height) * 100
						};

						// transform 정보 유지
						currentState.transform = textBox.css('transform') || 'none';
						textBox.data('relativeState', currentState);
					}
				});
			}
		});

	}
	
	static setupTextboxFrameEvents(frameGroup) {
		// 텍스트박스프레임은 이미지 클릭이 없으므로 프레임 오버레이의 pointer-events를 활성화
		frameGroup.find('.frame-overlay').css('pointer-events', 'auto');
			
	    // 프레임 클릭 이벤트 - 선택만 처리
	    frameGroup.on('click', (e) => {
	        e.preventDefault();
	        e.stopPropagation();
	        
	        // 프레임 선택
	        if (window.selectionManager.selectedMode !== 'frame' ||
	            window.selectionManager.currentFrame !== frameGroup) {
	            window.selectionManager.selectFrame(frameGroup);
	        }
	    });
	    
	    // 프레임 드래그 설정
	    this.setupFrameDrag(frameGroup);
	}
	
	static setupElementEvents(frameGroup) {
		// Element는 이미지 클릭이 없으므로 프레임 오버레이의 pointer-events를 활성화
		frameGroup.find('.frame-overlay').css('pointer-events', 'auto');

		// 프레임 클릭 이벤트 - 선택만 처리
		frameGroup.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();

			// Element 선택
			if (window.selectionManager.selectedMode !== 'element' ||
				window.selectionManager.currentElement !== frameGroup) {
				window.selectionManager.selectElement(frameGroup);
			}
		});

		// 프레임 드래그 설정
		this.setupElementDrag(frameGroup);
	}
	
	// Element 전용 드래그 메서드 추가
	static setupElementDrag(frameGroup) {
	    let dragStartX, dragStartY;
	    let isDragging = false;
	    
	    frameGroup.on('mousedown', function(e) {
	        if (e.button !== 0) return;
	        
	        const isElementSelected = window.selectionManager.selectedMode === 'element' &&
	                                  window.selectionManager.currentElement &&
	                                  window.selectionManager.currentElement[0] === frameGroup[0];
	        
	        if (isElementSelected) {
	            e.preventDefault();
	            e.stopPropagation();
	            
	            dragStartX = e.clientX;
	            dragStartY = e.clientY;
	            isDragging = false;
	            
	            const initialLeft = parseFloat(frameGroup.css('left')) || 0;
	            const initialTop = parseFloat(frameGroup.css('top')) || 0;
	            
	            $(document).on('mousemove.elementDrag', function(ev) {
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
	                    
	                    if (isDragging) {
	                        UIManager.showElementTooltip(frameGroup);
	                    }
	                }
	            });
	            
				$(document).on('mouseup.elementDrag', function() {
					$(document).off('mousemove.elementDrag mouseup.elementDrag');
					frameGroup.removeClass('dragging');
					isDragging = false;

					// ▼▼▼▼▼ 이 블록 추가 ▼▼▼▼▼
					const bg = $('#page-preview-img');
					const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
					if (actualBgRect) {
						const framePos = frameGroup.position();
						const currentState = frameGroup.data('relativeState') || {};

						currentState.position = {
							left: ((framePos.left - actualBgRect.left) / actualBgRect.width) * 100,
							top: ((framePos.top - actualBgRect.top) / actualBgRect.height) * 100
						};
						frameGroup.data('relativeState', currentState);
					}
					// ▲▲▲▲▲ 추가 종료 ▲▲▲▲▲
				});
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
				!target.closest('.text-box') &&
				!target.closest('#frame-controls-tooltip') &&
				!target.closest('#photo-controls-tooltip') &&
				!target.closest('#text-tooltip')) {
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

			// 모달이 열려있을 때 F5 또는 Ctrl+R 키를 감지
			if ($('#editModal').is(':visible') && (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R')))) {
				// 브라우저의 기본 새로고침 동작을 막습니다.
				e.preventDefault();
				// 사용자에게 알림 메시지를 표시합니다.
				alert('You cannot refresh while editing.');
				return false;
			}
			
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const focused = document.activeElement;
                if (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.contentEditable === 'true') {
                    return;
                }
                
                e.preventDefault();
                
                if (selectedPhotoWrapper && confirm("Are you sure you want to delete the photo?")) {
                    const frameGroup = selectedPhotoWrapper.closest('.frame-group');
                    const placeholder = frameGroup.find('.place-image-here-link');
                    selectedPhotoWrapper.hide().attr('src', '');
                    placeholder.show();
                    window.selectionManager.clearSelection();
                } else if (selectedFrame && confirm("Are you sure you want to delete the frame?")) {
                    selectedFrame.remove();
                    window.selectionManager.clearSelection();
                } else if (selectedBox && confirm("Are you sure you want to delete the text?")) {
					selectedBox.remove();
					window.selectionManager.clearSelection();
				} else if (window.selectionManager.selectedMode === 'element' && window.selectionManager.currentElement) {
					// Element 삭제 추가
					if (confirm("Are you sure you want to delete the element?")) {
						window.selectionManager.currentElement.remove();
						window.selectionManager.clearSelection();
					}
				}
            }
        });
		
		$('#add-title-btn').on('click', () => {
			TextManager.addTextBox('Title');
		});
		$('#add-subtitle-btn').on('click', () => {
			TextManager.addTextBox('Sub-Title');
		});
		$('#add-text-btn').on('click', () => {
			TextManager.addTextBox('text');
		});
    }
}