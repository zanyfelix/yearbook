class EnhancedSelectionManager {
    constructor() {
        this.clickTimeout = null;
		this.photoClickTimeout = null;
        this.clickDelay = 300; // 더블클릭 감지 시간 (ms)
        this.selectedMode = null; // 'frame' 또는 'photo'
        this.currentFrameGroup = null;
        this.currentPhoto = null;
        this.photoOverlay = null;
    }
    
	setupFrameEventHandlers(frameGroup, placeholderLink, uploadedPhoto, maskContainer, clickDetector) {
	    const self = this;
	    
	    // 이미지 업로드 클릭
	    placeholderLink.on('click', function(e) {
	        e.preventDefault();
	        e.stopPropagation();

	        const fileInput = $('#image-upload-input');
	        fileInput.data('targetFrameGroup', frameGroup);
	        fileInput.data('targetUploadedPhoto', uploadedPhoto);
	        fileInput.data('targetPlaceholderLink', placeholderLink);
	        fileInput.data('targetMaskContainer', maskContainer);
	        fileInput.trigger('click');
	    });

	    // ★★★ 프레임 이벤트 처리 - 단순화된 접근 방식 ★★★
	    let clickCount = 0;
	    let clickTimer = null;
	    let isDragging = false;
	    let dragStartX, dragStartY;
	    
	    frameGroup.off('mousedown mouseup click dblclick').on('mousedown', function(e) {
	        // 특정 요소들은 제외
	        if ($(e.target).hasClass('rotate-handle') || 
	            $(e.target).hasClass('selection-handle') ||
	            $(e.target).hasClass('place-image-here-link') ||
	            $(e.target).hasClass('uploaded-photo')) {
	            return;
	        }
	        
	        isDragging = false;
	        dragStartX = e.clientX;
	        dragStartY = e.clientY;
	        
	        // 드래그 감지를 위한 mousemove 이벤트
	        $(document).on('mousemove.frameCheck', function(ev) {
	            const moveDistance = Math.abs(ev.clientX - dragStartX) + Math.abs(ev.clientY - dragStartY);
	            if (moveDistance > 5) {
	                isDragging = true;
	                // 드래그 시작 - 프레임 드래그 로직 처리
	                self.handleFrameDrag(frameGroup, e, dragStartX, dragStartY);
	                $(document).off('mousemove.frameCheck');
	            }
	        });
	        
	        $(document).on('mouseup.frameCheck', function() {
	            $(document).off('mousemove.frameCheck mouseup.frameCheck');
	        });
	        
	        // mousedown에서는 프레임 선택하지 않음 - click 이벤트에서 처리
	    });
	    
	    // 클릭 이벤트로 더블클릭 감지 및 프레임 선택
	    frameGroup.on('click', function(e) {
	        // 특정 요소들은 제외
	        if ($(e.target).hasClass('rotate-handle') || 
	            $(e.target).hasClass('selection-handle') ||
	            $(e.target).hasClass('place-image-here-link') ||
	            $(e.target).hasClass('uploaded-photo')) {
	            return;
	        }
	        
	        // 드래그한 경우 클릭 이벤트 무시
	        if (isDragging) {
	            isDragging = false;
	            return;
	        }
	        
	        e.preventDefault();
	        e.stopPropagation();
	        
	        clickCount++;
	        
	        if (clickCount === 1) {
	            // 첫 번째 클릭 - 300ms 대기
	            clickTimer = setTimeout(function() {
	                // ★★★ 단일 클릭 처리 - 프레임 선택 ★★★
	                console.log('프레임 단일 클릭');
	                
	                // 프레임이 선택되지 않은 상태이거나 다른 프레임인 경우 선택
					console.log(self.selectedMode);
	                if (self.selectedMode !== 'frame' || self.currentFrameGroup !== frameGroup) {
	                    console.log('프레임 선택 처리');
	                    self.selectFrame(frameGroup);
	                } else {
	                    console.log('이미 선택된 프레임 - 선택 유지');
	                }
	                
	                clickCount = 0;
	            }, 300);
	        } else if (clickCount === 2) {
	            // 두 번째 클릭 - 더블클릭!
	            clearTimeout(clickTimer);
	            clickCount = 0;
	            
	            console.log('프레임 더블클릭 감지!');
	            
	            // 사진이 있는지 확인
	            const hasPhoto = uploadedPhoto.is(':visible') && 
	                            uploadedPhoto.attr('src') && 
	                            uploadedPhoto.attr('src').trim() !== '';
	            
	            console.log('사진 존재 여부:', hasPhoto);
	            console.log('uploadedPhoto visible:', uploadedPhoto.is(':visible'));
	            console.log('uploadedPhoto src:', uploadedPhoto.attr('src'));
	            console.log('현재 선택 모드:', self.selectedMode);
	            console.log('현재 프레임:', self.currentFrameGroup === frameGroup);
	            
	            if (hasPhoto && self.selectedMode === 'frame' && self.currentFrameGroup === frameGroup) {
	                console.log('조건 만족 - 사진 선택으로 전환');
	                self.selectPhoto(uploadedPhoto, frameGroup);
	            } else {
	                console.log('조건 불만족 - 업로드 대화상자 열기');
	                // 사진이 없으면 업로드 대화상자
	                if (!hasPhoto) {
	                    placeholderLink.trigger('click');
	                }
	            }
	        }
	    });
	    
	    // ★★★ 사진 이벤트 처리 - 개선된 버전 ★★★
	    uploadedPhoto.off('click mousedown').on('mousedown', function(e) {
	        if (e.button !== 0) return; 

	        e.preventDefault();
	        e.stopPropagation();

	        const frameGroupEl = uploadedPhoto.closest('.frame-group');

	        // 사진이 선택되어 있지 않을 때는 사진 선택
	        if (!uploadedPhoto.hasClass('selected-photo')) {
	            console.log('사진 클릭 - 사진 선택');
	            self.selectPhoto(uploadedPhoto, frameGroupEl);
	            return;
	        }

	        // 사진 드래그 로직 (선택된 상태에서만)
	        let isPhotoDragging = false;
	        let photoStartX, photoStartY;
	        let initialPhotoLeft, initialPhotoTop;

	        const photoPosition = uploadedPhoto.position();
	        initialPhotoLeft = photoPosition.left;
	        initialPhotoTop = photoPosition.top;
	        photoStartX = e.clientX;
	        photoStartY = e.clientY;

	        $(document).on('mousemove.photoDrag', function(ev) {
	            if (!isPhotoDragging) {
	                // 5px 이상 움직이면 드래그 시작
	                const moveDistance = Math.abs(ev.clientX - photoStartX) + Math.abs(ev.clientY - photoStartY);
	                if (moveDistance > 5) {
	                    isPhotoDragging = true;
	                }
	            }
	            
	            if (isPhotoDragging) {
	                const deltaX = ev.clientX - photoStartX;
	                const deltaY = ev.clientY - photoStartY;

	                let newLeft = initialPhotoLeft + deltaX;
	                let newTop = initialPhotoTop + deltaY;

	                const containerWidth = maskContainer.width();
	                const containerHeight = maskContainer.height();
	                const photoWidth = uploadedPhoto.width();
	                const photoHeight = uploadedPhoto.height();

	                // 마스크 영역 내에서만 이동 가능 (오버플로우 제한)
	                newLeft = Math.max(-photoWidth * 0.8, Math.min(newLeft, containerWidth * 0.8));
	                newTop = Math.max(-photoHeight * 0.8, Math.min(newTop, containerHeight * 0.8));

	                uploadedPhoto.css({
	                    left: `${newLeft}px`,
	                    top: `${newTop}px`
	                });
	                
	                // 오버레이 사진도 함께 이동
	                if (self.photoOverlay) {
	                    const silhouette = self.photoOverlay.find('.photo-silhouette');
	                    silhouette.css({
	                        left: `${newLeft}px`,
	                        top: `${newTop}px`
	                    });
	                }
	            }
	        });

	        $(document).on('mouseup.photoDrag', function() {
	            $(document).off('mousemove.photoDrag mouseup.photoDrag');
	            
	            // 드래그하지 않았으면 더블클릭 체크
	            if (!isPhotoDragging) {
	                // 사진 더블클릭 체크
	                if (self.photoClickTimeout) {
	                    clearTimeout(self.photoClickTimeout);
	                    self.photoClickTimeout = null;
	                    // 더블클릭 - 프레임으로 전환
	                    console.log('사진 더블클릭 - 프레임 선택으로 전환');
	                    self.selectFrame(frameGroupEl);
	                } else {
	                    self.photoClickTimeout = setTimeout(function() {
	                        console.log('사진 단일 클릭 - 선택 유지');
	                        self.photoClickTimeout = null;
	                    }, 300);
	                }
	            }
	        });
	    });
	    
	    // 사진 로드 이벤트
	    uploadedPhoto.on('load', function() {
	        console.log('사진 로드 완료');
	        if (uploadedPhoto.is(':visible')) {
	            console.log('사진이 표시됨 - 프레임 더블클릭으로 선택 가능');
	        }
	    });
	}
    
    // 프레임 선택 기능 (개선됨)
    selectFrame(frameGroup) {
        this.clearSelection();
        
        selectedFrame = frameGroup;
        this.selectedMode = 'frame';
        this.currentFrameGroup = frameGroup;
        this.currentPhoto = null;
        
        frameGroup.addClass('selected-frame');
        frameGroup.css({
            'border': '2px dashed #ff0000'
        });

        this.addRotationHandle(frameGroup);
        this.showFrameControlsTooltip(frameGroup);
        
        // 사진 오버레이 제거 (프레임 선택 시)
        this.hidePhotoOverlay();
        
        console.log('프레임 선택됨');
    }

    // 사진 선택 기능 (개선됨 - 마스크 밖 영역 표시)
    selectPhoto(photo, frameGroup) {
        this.clearSelection();
        
        selectedPhotoWrapper = photo;
        this.selectedMode = 'photo';
        this.currentFrameGroup = frameGroup;
        this.currentPhoto = photo;
        
        // 기존 프레임 컨트롤 숨기기
        $('#frame-controls-tooltip').addClass('d-none');
        $('.rotate-handle').remove();

        // 사진 선택 효과
        photo.addClass('selected-photo');
        photo.css({
            'box-shadow': '0 0 0 2px rgba(255, 165, 0, 0.8)',
            'border': '2px solid #FFA500',
            'outline': '2px solid #FFA500',
            'outline-offset': '1px'
        });

        // 부모 프레임도 약간의 표시
        frameGroup.css({
            'box-shadow': '0 0 0 1px rgba(255, 165, 0, 0.3)',
            'border': '1px solid rgba(255, 165, 0, 0.5)'
        });

        // 사진 컨트롤 추가
        this.addPhotoSelectionHandles(photo);
        this.addPhotoRotationHandle(photo);
        this.showPhotoControlsTooltip(photo, frameGroup);
        
        // 마스크 밖 영역 표시 (핵심 기능!)
        this.showPhotoOverlay(photo, frameGroup);
        
        console.log('사진 선택됨 - 전체 이미지 표시');
    }
    
    // 마스크 밖 영역을 보여주는 오버레이 생성
    showPhotoOverlay(photo, frameGroup) {
        this.hidePhotoOverlay(); // 기존 오버레이 제거
        
        const frameTheme = frameGroup.data('frameTheme');
        if (!frameTheme || !frameTheme.editMaskPath) {
            console.log('마스크 정보가 없어 전체 이미지 표시를 건너뜁니다.');
            return;
        }
        
        // 오버레이 컨테이너 생성
        this.photoOverlay = $('<div id="photo-full-overlay"></div>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 12, // 프레임보다 아래, 사진보다 위
            pointerEvents: 'none'
        });
        
        frameGroup.append(this.photoOverlay);
        
        // 전체 사진 복사본 생성 (마스크 적용 안된 버전)
        const fullPhoto = photo.clone().css({
            position: 'absolute',
            top: photo.css('top'),
            left: photo.css('left'),
            width: photo.css('width'),
            height: photo.css('height'),
            transform: photo.css('transform'),
            opacity: 0.4, // 반투명 처리
            border: '1px dashed rgba(255, 165, 0, 0.6)',
            boxShadow: 'none',
            zIndex: 1
        }).removeClass('selected-photo uploaded-photo').addClass('photo-silhouette');
        
        // 마스크 영역 표시 (더 진한 영역으로 실제 보이는 부분 강조)
        const maskIndicator = $('<div class="mask-indicator"></div>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
            border: '2px solid rgba(255, 165, 0, 0.8)',
            boxSizing: 'border-box',
            zIndex: 2
        });
        
        // 오버레이에 요소들 추가
        this.photoOverlay.append(fullPhoto);
        this.photoOverlay.append(maskIndicator);
        
        // 설명 라벨 추가
        const overlayLabel = $('<div class="overlay-label"></div>').css({
            position: 'absolute',
            top: '5px',
            left: '5px',
            backgroundColor: 'rgba(255, 165, 0, 0.9)',
            color: 'white',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '3px',
            zIndex: 3,
            fontFamily: 'Arial, sans-serif'
        }).text('Full Image View');
        
        this.photoOverlay.append(overlayLabel);
    }
    
    // 사진 오버레이 숨기기
    hidePhotoOverlay() {
        if (this.photoOverlay) {
            this.photoOverlay.remove();
            this.photoOverlay = null;
        }
        
        // 기존 오버레이들도 제거
        $('#photo-full-overlay').remove();
        $('.photo-silhouette').remove();
        $('.mask-indicator').remove();
        $('.overlay-label').remove();
    }
    
    // 선택 해제 (기존 clearSelection 함수 개선)
    clearSelection() {
        // 프레임 선택 해제
        $('.frame-group').removeClass('selected-frame').css({
            'box-shadow': 'none',
            'border': 'none',
            'outline': 'none'
        });

        // 사진 선택 해제
        $('.uploaded-photo').removeClass('selected-photo').css({
            'box-shadow': 'none',
            'border': 'none',
            'outline': 'none'
        });

        // 선택 핸들 제거
        $('.selection-handle').remove();
        $('.rotate-handle').remove();
        $('#frame-controls-tooltip').addClass('d-none');
        $('#photo-controls-tooltip').addClass('d-none');
        
        // 사진 오버레이 제거
        this.hidePhotoOverlay();

        selectedFrame = null;
        selectedPhotoWrapper = null;
        selectedBox = null;
		
        this.selectedMode = null;
        this.currentFrameGroup = null;
        this.currentPhoto = null;
		
		// 클릭 타이머 초기화
		if (this.clickTimeout) {
			clearTimeout(this.clickTimeout);
			this.clickTimeout = null;
		}
		
		if (this.photoClickTimeout) {
		    clearTimeout(this.photoClickTimeout);
		    this.photoClickTimeout = null;
		}
        
        $('#text-tooltip').addClass('d-none');
    }
	
	// ★★★ 프레임 드래그 처리 함수 추가 ★★★
	handleFrameDrag(frameGroup, initialEvent, startX, startY) {
	    const self = this;
	    
	    // 프레임이 선택되지 않은 경우 선택
	    if (self.selectedMode !== 'frame' || self.currentFrameGroup !== frameGroup) {
	        self.selectFrame(frameGroup);
	    }
	    
	    const frameOffset = frameGroup.offset();
	    const containerOffset = $('#frame-container').offset();
	    const offsetX = initialEvent.clientX - frameOffset.left;
	    const offsetY = initialEvent.clientY - frameOffset.top;
	    
	    $(document).on('mousemove.frameDrag', function(ev) {
	        // 프레임 드래그
	        const backgroundImage = $('#page-preview-img');
	        const bgDisplayWidth = backgroundImage.width();
	        const bgDisplayHeight = backgroundImage.height();
	        
	        let newLeft = ev.clientX - offsetX - containerOffset.left;
	        let newTop = ev.clientY - offsetY - containerOffset.top;
	        
	        // 배경 영역 내에서만 이동 제한
	        newLeft = Math.max(0, Math.min(newLeft, bgDisplayWidth - frameGroup.width()));
	        newTop = Math.max(0, Math.min(newTop, bgDisplayHeight - frameGroup.height()));
	        
	        frameGroup.css({
	            left: `${newLeft}px`,
	            top: `${newTop}px`
	        });
	        
	        // 툴팁 위치 업데이트
	        self.showFrameControlsTooltip(frameGroup);
	    });
	    
	    $(document).on('mouseup.frameDrag', function() {
	        $(document).off('mousemove.frameDrag mouseup.frameDrag');
	    });
	}
    
    // 사진 드래그 기능 (마스크 영역 내에서만 이동 가능)
    makePhotoDraggable(photo, maskContainer) {
        let isDraggingPhoto = false;
        let photoStartX, photoStartY;
        let initialPhotoLeft, initialPhotoTop;
        const self = this;

        photo.on('mousedown', function(e) {
			if (e.button !== 0) return; 

			const frameGroup = photo.closest('.frame-group');

			// 프레임이 선택된 상태에서는 프레임 드래그를 우선시
			if (self.selectedMode === 'frame' && frameGroup === self.currentFrameGroup) {
			    // 프레임 드래그가 처리되도록 이벤트를 전파시킴
			    return; // 사진 드래그 처리하지 않고 프레임 드래그로 넘김
			}

			// 사진이 선택되어 있지 않을 때는 프레임 선택 후 종료
			if (!photo.hasClass('selected-photo')) {
			    self.selectFrame(frameGroup);
			    return;
			}

			e.preventDefault();
			e.stopPropagation();

			isDraggingPhoto = true;

			const photoPosition = photo.position();
			initialPhotoLeft = photoPosition.left;
			initialPhotoTop = photoPosition.top;

            photoStartX = e.clientX;
            photoStartY = e.clientY;

            $(document).on('mousemove', function(ev) {
                if (!isDraggingPhoto) return;

                const deltaX = ev.clientX - photoStartX;
                const deltaY = ev.clientY - photoStartY;

                let newLeft = initialPhotoLeft + deltaX;
                let newTop = initialPhotoTop + deltaY;

                const containerWidth = maskContainer.width();
                const containerHeight = maskContainer.height();
                const photoWidth = photo.width();
                const photoHeight = photo.height();

                // 마스크 영역 내에서만 이동 가능 (오버플로우 제한)
                newLeft = Math.max(-photoWidth * 0.8, Math.min(newLeft, containerWidth * 0.8));
                newTop = Math.max(-photoHeight * 0.8, Math.min(newTop, containerHeight * 0.8));

                photo.css({
                    left: `${newLeft}px`,
                    top: `${newTop}px`
                });
                
                // 오버레이 사진도 함께 이동
                if (self.photoOverlay) {
                    const silhouette = self.photoOverlay.find('.photo-silhouette');
                    silhouette.css({
                        left: `${newLeft}px`,
                        top: `${newTop}px`
                    });
                }
            });

            $(document).on('mouseup', function() {
                isDraggingPhoto = false;
                $(document).off('mousemove mouseup');
            });
        });
    }
    
    // 기존 함수들을 이 클래스 내부로 통합
    addPhotoSelectionHandles(photo) {
        $('.selection-handle').remove();
        // 양쪽 모서리에만 핸들 추가 (비율 유지 크기 조절)
        const handles = ['nw', 'se']; // 좌상단, 우하단만
        handles.forEach(position => {
            const handle = $('<div class="selection-handle">').addClass(`handle-${position}`).css({
                position: 'absolute',
                width: '12px',
                height: '12px',
                backgroundColor: '#FFA500',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: this.getResizeCursor(position),
                zIndex: 30,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            });

            handle.css(this.getHandlePosition(position));
            photo.append(handle);
            
            this.makePhotoResizable(photo, handle, position);
        });
    }
    
    addPhotoRotationHandle(photo) {
        $('.rotate-handle').remove();
        const rotateHandle = $('<div class="rotate-handle"><div class="rotate-line"></div></div>').css({
            position: 'absolute',
            top: '-50px',
            right: '40%',
            width: '30px',
            height: '30px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #FFA500',
            borderRadius: '50%',
            cursor: 'grab',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 25,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        });
        
        // 회전 아이콘 추가
        rotateHandle.html('<span style="font-size: 18px; color: #FFA500; line-height: 1;">⟳</span>');
        
        // 회전 연결선 스타일
        const rotateLine = rotateHandle.find('.rotate-line').css({
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '20px',
            backgroundColor: '#FFA500',
            zIndex: 20
        });
        
        photo.append(rotateHandle);

        let isRotating = false;
        let startAngle, photoCenter;
        const self = this;

        rotateHandle.on('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            isRotating = true;

            const currentRotation = self.getCurrentPhotoRotation(photo);
            startAngle = currentRotation;

            const photoOffset = photo.offset();
            photoCenter = {
                x: photoOffset.left + photo.width() / 2,
                y: photoOffset.top + photo.height() / 2
            };
            
            const startRad = Math.atan2(e.clientY - photoCenter.y, e.clientX - photoCenter.x);

            $(document).on('mousemove', function(ev) {
                if (!isRotating) return;
                const moveRad = Math.atan2(ev.clientY - photoCenter.y, ev.clientX - photoCenter.x);
                const deltaAngle = (moveRad - startRad) * (180 / Math.PI);
                let newAngle = (startAngle + deltaAngle);

                // 각도 정규화
                newAngle = (newAngle % 360 + 360) % 360;
                
                self.applyPhotoRotation(photo, newAngle);
                self.updatePhotoOverlay(photo);
            });

            $(document).on('mouseup', function() {
                isRotating = false;
                $(document).off('mousemove mouseup');
            });
        });
    }
    
    // 유틸리티 함수들
    getHandlePosition(position) {
        const offset = -6;
        switch (position) {
            case 'nw': return { top: `${offset}px`, left: `${offset}px` };
            case 'ne': return { top: `${offset}px`, right: `${offset}px` };
            case 'sw': return { bottom: `${offset}px`, left: `${offset}px` };
            case 'se': return { bottom: `${offset}px`, right: `${offset}px` };
        }
    }
    
    getResizeCursor(position) {
        const cursors = { 'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize' };
        return cursors[position];
    }
    
    getPhotoTransform(photo) {
        const transform = photo.css('transform');
        let scale = 1, rotation = 0;
        if (transform && transform !== 'none') {
            const matrix = transform.match(/matrix\((.+)\)/);
            if (matrix) {
                const values = matrix[1].split(', ').map(parseFloat);
                const a = values[0], b = values[1];
                scale = Math.sqrt(a*a + b*b);
                rotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                if (rotation < 0) rotation += 360;
            }
        }
        return { scale, rotation };
    }
    
    applyPhotoTransform(photo, scale, rotation) {
        photo.css('transform', `rotate(${rotation}deg) scale(${scale})`);
    }
    
    makePhotoResizable(photo, handle, position) {
        let isResizing = false;
        let startWidth, startHeight, startX, startY;
        const self = this;
        
        handle.on('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            
            startX = e.clientX;
            startY = e.clientY;
            startWidth = photo.width();
            startHeight = photo.height();
            
            $(document).on('mousemove', function(ev) {
                if (!isResizing) return;
                
                // 마우스 이동 거리 계산
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;
                
                // 대각선 방향 이동 거리 (비율 유지를 위해)
                let scaleFactor;
                if (position === 'nw') {
                    scaleFactor = 1 - Math.max(deltaX, deltaY) / Math.max(startWidth, startHeight);
                } else { // 'se'
                    scaleFactor = 1 + Math.max(deltaX, deltaY) / Math.max(startWidth, startHeight);
                }
                
                // 최소/최대 크기 제한
                scaleFactor = Math.max(0.3, Math.min(scaleFactor, 3));
                
                const newWidth = startWidth * scaleFactor;
                const newHeight = startHeight * scaleFactor;
                
                // 비율 유지하면서 크기 조정
                photo.css({
                    width: `${newWidth}px`,
                    height: `${newHeight}px`
                });
                
                // nw 핸들인 경우 위치도 조정 (좌상단 고정을 위해)
                if (position === 'nw') {
                    const currentLeft = parseFloat(photo.css('left'));
                    const currentTop = parseFloat(photo.css('top'));
                    const leftDelta = startWidth - newWidth;
                    const topDelta = startHeight - newHeight;
                    
                    photo.css({
                        left: `${currentLeft + leftDelta}px`,
                        top: `${currentTop + topDelta}px`
                    });
                }
                
                // 오버레이 사진도 함께 크기 조정
                if (self.photoOverlay) {
                    const silhouette = self.photoOverlay.find('.photo-silhouette');
                    const currentTransform = self.getPhotoTransform(photo);
                    silhouette.css({
                        width: `${newWidth}px`,
                        height: `${newHeight}px`,
                        left: photo.css('left'),
                        top: photo.css('top'),
                        transform: `rotate(${currentTransform.rotation}deg)`
                    });
                }
            });
            
            $(document).on('mouseup', function() {
                isResizing = false;
                $(document).off('mousemove mouseup');
            });
        });
    }
    
    // 기존 함수들 래퍼
    addRotationHandle(frameGroup) {
        $('.rotate-handle').remove();
        const rotateHandle = $('<div class="rotate-handle"><div class="rotate-line"></div></div>');
        frameGroup.append(rotateHandle);

        let isRotating = false;
        let startAngle = 0;
        let startClientX, startClientY;
        const self = this;

        rotateHandle.on('mousedown', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            isRotating = true;
            
            const frameCenter = {
                x: frameGroup.offset().left + frameGroup.width() / 2,
                y: frameGroup.offset().top + frameGroup.height() / 2
            };

            startClientX = e.clientX;
            startClientY = e.clientY;
            startAngle = self.getFrameRotation(frameGroup);

            $(document).on('mousemove', function(ev) {
                if (!isRotating) return;

                const currentAngleRad = Math.atan2(ev.clientY - frameCenter.y, ev.clientX - frameCenter.x);
                const startAngleRad = Math.atan2(startClientY - frameCenter.y, startClientX - frameCenter.x);

                let deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
                let newAngle = (startAngle + deltaAngle) % 360;
                if (newAngle < 0) newAngle += 360;

                self.applyFrameRotation(frameGroup, newAngle);
                $('#frame-rotate-input').val(Math.round(newAngle));
            });

            $(document).on('mouseup', function() {
                isRotating = false;
                $(document).off('mousemove mouseup');
            });
        });
    }
    
    getFrameRotation(frameGroup) {
        const transform = frameGroup.css('transform');
        if (transform && transform !== 'none') {
            const matrix = transform.match(/^matrix\((.+)\)$/);
            if (matrix) {
                const values = matrix[1].split(',').map(Number);
                const a = values[0], b = values[1];
                const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                return angle < 0 ? angle + 360 : angle;
            }
        }
        return 0;
    }
    
    applyFrameRotation(frameGroup, angle) {
        frameGroup.css('transform', `rotate(${angle}deg)`);
    }
    
    showFrameControlsTooltip(frameGroup) {
        const frameControlsTooltip = $('#frame-controls-tooltip');
        const frameRect = frameGroup[0].getBoundingClientRect();
        const pagePreviewRect = $('#page-preview')[0].getBoundingClientRect();
        
        const frameRelativeLeft = frameRect.left - pagePreviewRect.left;
        const frameRelativeTop = frameRect.top - pagePreviewRect.top;

        const tooltipWidth = frameControlsTooltip.outerWidth();
        const tooltipHeight = frameControlsTooltip.outerHeight();

        let topPos = frameRelativeTop - tooltipHeight - 10;
        let leftPos = frameRelativeLeft + frameRect.width + 10;

        const pagePreviewWidth = $('#page-preview').width();
        const pagePreviewHeight = $('#page-preview').height();

        if (leftPos + tooltipWidth > pagePreviewWidth) {
            leftPos = frameRelativeLeft - tooltipWidth - 10;
            if (leftPos < 0) {
                leftPos = pagePreviewWidth - tooltipWidth;
            }
        }

        if (topPos < 0) {
            topPos = frameRelativeTop + frameGroup.outerHeight() + 10;
            if (topPos + tooltipHeight > pagePreviewHeight) {
                 topPos = pagePreviewHeight - tooltipHeight;
            }
        }

        frameControlsTooltip.removeClass('d-none').css({
            top: `${topPos}px`,
            left: `${leftPos}px`
        });
    }
    
    showPhotoControlsTooltip(photo, frameGroup) {
        const photoControlsTooltip = $('#photo-controls-tooltip');
        const frameRect = frameGroup[0].getBoundingClientRect();
        const pagePreviewRect = $('#page-preview')[0].getBoundingClientRect();

        const frameRelativeLeft = frameRect.left - pagePreviewRect.left;
        const frameRelativeTop = frameRect.top - pagePreviewRect.top;

        const tooltipWidth = photoControlsTooltip.outerWidth();
        const tooltipHeight = photoControlsTooltip.outerHeight();

        let topPos = frameRelativeTop - tooltipHeight - 10;
        let leftPos = frameRelativeLeft + frameRect.width + 10;

        const pagePreviewWidth = $('#page-preview').width();
        const pagePreviewHeight = $('#page-preview').height();

        if (leftPos + tooltipWidth > pagePreviewWidth) {
            leftPos = frameRelativeLeft - tooltipWidth - 10;
            if (leftPos < 0) {
                leftPos = pagePreviewWidth - tooltipWidth;
            }
        }

        if (topPos < 0) {
            topPos = frameRelativeTop + frameGroup.outerHeight() + 10;
            if (topPos + tooltipHeight > pagePreviewHeight) {
                topPos = pagePreviewHeight - tooltipHeight;
            }
        }

        photoControlsTooltip.removeClass('d-none').css({
            top: `${topPos}px`,
            left: `${leftPos}px`
        });

        // 툴팁 내용을 각도변환 아이콘으로 변경
        photoControlsTooltip.html(`
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div class="d-inline-flex align-items-center">
                    <img src="/images/icon/transform.png" alt="Rotate" id="photo-rotate1" style="width: 30px; height: 30px; cursor: pointer; margin-right: 5px; transform: scaleX(-1);">
                    <img src="/images/icon/transform.png" alt="Rotate" id="photo-rotate2" style="width: 30px; height: 30px; cursor: pointer; margin-right: 5px;">
                </div>
                <button id="btn-delete-photo" class="btn btn-danger btn-sm me-2">X</button>
            </div>
        `);
        
        // 각도변환 이벤트 바인딩
        this.bindPhotoRotationEvents(photo, frameGroup);
    }
    
    // 사진 각도변환 이벤트 바인딩
    bindPhotoRotationEvents(photo, frameGroup) {
        const self = this;
        
        $('#photo-rotate1').off('click').on('click', function() {
            const currentRotation = self.getCurrentPhotoRotation(photo);
            const newRotation = self.snapPhotoAngle(currentRotation, -90);
            self.applyPhotoRotation(photo, newRotation);
            self.updatePhotoOverlay(photo);
        });
        
        $('#photo-rotate2').off('click').on('click', function() {
            const currentRotation = self.getCurrentPhotoRotation(photo);
            const newRotation = self.snapPhotoAngle(currentRotation, 90);
            self.applyPhotoRotation(photo, newRotation);
            self.updatePhotoOverlay(photo);
        });
        
        $('#btn-delete-photo').off('click').on('click', function() {
            if (confirm("Are you sure you want to delete this photo?")) {
                const placeholderLink = frameGroup.find('.place-image-here-link');
                photo.hide().attr('src', '');
                placeholderLink.show();
                self.clearSelection();
            }
        });
    }
    
    // 사진의 현재 회전 각도 가져오기
    getCurrentPhotoRotation(photo) {
        const transform = photo.css('transform');
        if (!transform || transform === 'none') {
            return 0;
        }
        
        const matrix = transform.match(/matrix\((.+)\)/);
        if (matrix) {
            const values = matrix[1].split(', ').map(parseFloat);
            const a = values[0], b = values[1];
            const angleRad = Math.atan2(b, a);
            const angleDeg = angleRad * (180 / Math.PI);
            const normalizedAngle = (angleDeg % 360 + 360) % 360;
            return Math.round(normalizedAngle);
        }
        return 0;
    }
    
    // 사진 각도 스냅 (90도 단위)
    snapPhotoAngle(currentAngle, deltaAngle) {
        let newAngle = (currentAngle + deltaAngle) % 360;
        if (newAngle < 0) newAngle += 360;
        
        // 90도 단위로 스냅
        newAngle = Math.round(newAngle / 90) * 90;
        return newAngle;
    }
    
    // 사진 회전 적용
    applyPhotoRotation(photo, angle) {
        photo.css('transform', `rotate(${angle}deg)`);
    }
    
    // 사진 오버레이 업데이트
    updatePhotoOverlay(photo) {
        if (this.photoOverlay) {
            const silhouette = this.photoOverlay.find('.photo-silhouette');
            const currentRotation = this.getCurrentPhotoRotation(photo);
            silhouette.css('transform', `rotate(${currentRotation}deg)`);
        }
    }
}

//-----------------------Safe Line 시스템 구현------------------------------------
class SafeLineManager {
    constructor() {
        this.actualWidth = 221.9; // mm
        this.actualHeight = 285.4; // mm
        this.safeMargin = 3; // mm
        this.safeLineContainer = null;
        
        this.init();
    }
    
    init() {
        // Safe line 컨테이너 생성
        this.createSafeLineContainer();
        
        // 배경 이미지 변경 감지
        this.watchBackgroundChanges();
    }
    
    createSafeLineContainer() {
        // 기존 safe line 제거
        $('#safe-line-overlay').remove();
        
        // Safe line 오버레이 컨테이너 생성
        this.safeLineContainer = $('<div id="safe-line-overlay"></div>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // 클릭 이벤트 통과
            zIndex: 5, // 배경 위, 프레임 아래
            display: 'block'
        });
        
        $('#page-preview').append(this.safeLineContainer);
    }
    
    // 배경 이미지 변경 감지
    watchBackgroundChanges() {
        const imageElement = $('#page-preview-img')[0];
        
        // 이미지 로드 완료 시 safe line 업데이트
        $(imageElement).on('load', () => {
            setTimeout(() => this.updateSafeLines(), 100); // DOM 업데이트 대기
        });
        
        // 이미지 크기 변경 감지 (ResizeObserver 사용)
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this.updateSafeLines();
            });
            resizeObserver.observe(imageElement);
        }
        
        // 창 크기 변경 시에도 업데이트
        $(window).on('resize', () => {
            setTimeout(() => this.updateSafeLines(), 100);
        });
    }
    
    // Safe line 계산 및 그리기
    updateSafeLines() {
        if (!this.safeLineContainer) return;
        
        const imageElement = $('#page-preview-img')[0];
        if (!imageElement || !imageElement.complete) return;
        
        // placeholder.png인 경우 safe line 숨기기
        const imageSrc = $(imageElement).attr('src');
        if (imageSrc && (imageSrc.includes('placeholder.png') || imageSrc.endsWith('placeholder.png'))) {
            this.safeLineContainer.empty();
            return;
        }
        
        // 이미지의 실제 표시 크기 가져오기
        const displayWidth = $(imageElement).width();
        const displayHeight = $(imageElement).height();
        
        if (displayWidth === 0 || displayHeight === 0) return;
        
        // mm당 픽셀 비율 계산
        const pixelPerMmX = displayWidth / this.actualWidth;
        const pixelPerMmY = displayHeight / this.actualHeight;
        
        // 3mm를 픽셀로 변환
        const safeMarginX = this.safeMargin * pixelPerMmX;
        const safeMarginY = this.safeMargin * pixelPerMmY;
        
        // 이미지의 위치 (페이지 프리뷰 내에서)
        const imageOffset = $(imageElement).position();
        
        console.log('Safe Line 계산:', {
            actualSize: `${this.actualWidth}mm × ${this.actualHeight}mm`,
            displaySize: `${displayWidth}px × ${displayHeight}px`,
            pixelPerMm: `${pixelPerMmX.toFixed(2)}px/mm × ${pixelPerMmY.toFixed(2)}px/mm`,
            safeMarginPixels: `${safeMarginX.toFixed(1)}px × ${safeMarginY.toFixed(1)}px`,
            imagePosition: `${imageOffset.left}px, ${imageOffset.top}px`
        });
        
        // Safe line 그리기
        this.drawSafeLines(imageOffset, displayWidth, displayHeight, safeMarginX, safeMarginY);
    }
    
    drawSafeLines(imageOffset, imageWidth, imageHeight, marginX, marginY) {
        // 컨테이너 초기화
        this.safeLineContainer.empty();
        
        // Safe area 영역들 (반투명 색칠된 영역)
        const safeAreas = [
            // 위쪽 영역
            {
                left: imageOffset.left,
                top: imageOffset.top,
                width: imageWidth,
                height: marginY,
                position: 'top'
            },
            // 아래쪽 영역
            {
                left: imageOffset.left,
                top: imageOffset.top + imageHeight - marginY,
                width: imageWidth,
                height: marginY,
                position: 'bottom'
            },
            // 왼쪽 영역
            {
                left: imageOffset.left,
                top: imageOffset.top + marginY,
                width: marginX,
                height: imageHeight - (marginY * 2),
                position: 'left'
            },
            // 오른쪽 영역
            {
                left: imageOffset.left + imageWidth - marginX,
                top: imageOffset.top + marginY,
                width: marginX,
                height: imageHeight - (marginY * 2),
                position: 'right'
            }
        ];
        
        // Safe area 영역들 그리기
        safeAreas.forEach(area => {
            const safeZone = $('<div class="safe-zone"></div>').css({
                position: 'absolute',
                left: `${area.left}px`,
                top: `${area.top}px`,
                width: `${area.width}px`,
                height: `${area.height}px`,
                backgroundColor: 'rgba(255, 107, 107, 0.3)', // 반투명 빨간색
                border: '1px solid rgba(255, 107, 107, 0.6)',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            });
            
            // "safe line" 텍스트 추가 (영역이 충분히 클 때만)
            if ((area.width > 40 && area.height > 15) || (area.width > 15 && area.height > 40)) {
                const label = $('<span class="safe-line-text"></span>').css({
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                    userSelect: 'none',
                    fontFamily: 'Arial, sans-serif',
                    letterSpacing: '0.5px'
                }).text('safe line');
                
                // 세로 영역인 경우 텍스트 회전
                if (area.position === 'left' || area.position === 'right') {
                    label.css({
                        transform: 'rotate(-90deg)',
                        whiteSpace: 'nowrap'
                    });
                }
                
                safeZone.append(label);
            }
            
            this.safeLineContainer.append(safeZone);
        });
    }
    
    // 설정 업데이트 메서드
    updateSettings(newSettings) {
        if (newSettings.actualWidth) this.actualWidth = newSettings.actualWidth;
        if (newSettings.actualHeight) this.actualHeight = newSettings.actualHeight;
        if (newSettings.safeMargin) this.safeMargin = newSettings.safeMargin;
        
        this.updateSafeLines();
    }
}

$(document).ready(function() {
	
	const btnBg = $('#btn-background');
	const btnFrame = $('#btn-frame');
	const btnText = $('#btn-text');
	const bgPanel = $('#background-panel');
	const framePanel = $('#frame-panel');
	const textPanel = $('#text-panel');
	const photoFrameList = $('#photoFrameList');
	const thumbnailArea = $('#thumbnail-area');
	const preview = $('#page-preview');
	const tooltip = $('#text-tooltip');
	const inColor = $('#tooltip-color');
	const inSize = $('#tooltip-size');
	const inAlign = $('#tooltip-align');
	const btnRemove = $('#tooltip-remove');
	const addTextBtn = $('#add-text-btn');

	const frameControlsTooltip = $('#frame-controls-tooltip');
	const btnDeleteFrame = $('#btn-delete-frame');
	const frameRotateInput = $('#frame-rotate-input');
	
	const photoControlsTooltip = $('#photo-controls-tooltip');


	const allBtns = [btnBg, btnFrame, btnText];
	
	// Enhanced Selection Manager 초기화
	window.enhancedSelection = new EnhancedSelectionManager();

	// 기존 clearSelection 함수를 새로운 것으로 교체
	window.clearSelection = function() {
		window.enhancedSelection.clearSelection();
	};

	// 기존 selectFrame 함수를 새로운 것으로 교체
	window.selectFrame = function(frameGroup) {
		window.enhancedSelection.selectFrame(frameGroup);
	};

	// 기존 selectPhoto 함수를 새로운 것으로 교체  
	window.selectPhoto = function(photo, frameGroup) {
		window.enhancedSelection.selectPhoto(photo, frameGroup);
	};

	function hideAllPanels() {
		bgPanel.addClass('d-none');
		framePanel.addClass('d-none');
		textPanel.addClass('d-none');
	}

	function activate(btn) {
		allBtns.forEach(b => b.removeClass('active'));
		btn.addClass('active');
	}
	
	// Safe Line Manager 초기화
	window.safeLineManager = new SafeLineManager();

	// Background Panel
	btnBg.off('click').on('click', function() {
		
		window.enhancedSelection.clearSelection();
		
		activate(btnBg);
		hideAllPanels();
		bgPanel.removeClass('d-none');

		bgPanel.empty();

		$.ajax({
			url: `${ctx}/edit/background`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				id: 11,
				category: "background"
			}),
			success: function(data) {
				data.forEach(function(result) {
					const col = $('<div class="col-4 text-center">');
					const wrapper = $('<div class="thumbnail-wrapper position-relative">');
					const img = $('<img class="img-thumbnail preview-img">').attr('src', result.theme.thumbnailPath);
					const overlay = $('<div class="overlay d-flex justify-content-center align-items-center">');
					const selectBtn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', function() {
						$('#page-preview-img').attr('src', result.theme.editPath);
						selectedBackgroundPath = result.theme.editPath;
						
						// Safe line 업데이트 트리거
						setTimeout(() => {
							window.safeLineManager.updateSafeLines();
						}, 500);
					});

					overlay.append(selectBtn);
					wrapper.append(img).append(overlay);
					col.append(wrapper);
					bgPanel.append(col);
				});
			}
		});
	});

	// Frame Panel
	btnFrame.on("click", function() {
		
		window.enhancedSelection.clearSelection();
		
		activate(btnFrame);
		hideAllPanels();
		framePanel.removeClass('d-none');

		photoFrameList.empty();

		$.ajax({
			url: `${ctx}/edit/mainFrame`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				id: 11,
				category: "frame"
			}),
			success: function(data) {
				data.forEach(function(result) {
					const col = $('<div class="col-4 text-center">');
					const wrapper = $('<div class="thumbnail-wrapper position-relative">');
					const img = $('<img class="img-thumbnail preview-img">').attr('src', result.theme.thumbnailPath);
					const overlay = $('<div class="overlay d-flex justify-content-center align-items-center">');
					const selectBtn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', function() {
						const frameModalEl = $('#frameModal');
						const frameModal = new bootstrap.Modal(frameModalEl[0]);
						$('#modalFrameList').empty();
						loadFramesModal();
						frameModal.show();
					});

					overlay.append(selectBtn);
					wrapper.append(img).append(overlay);
					col.append(wrapper);
					photoFrameList.append(col);
				});
			}
		});
	});

	// Load Frames Modal - 프레임 데이터 로깅 추가
	function loadFramesModal() {
		$.ajax({
			url: `${ctx}/edit/mainFrame`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({
				id: 11,
				category: "frame"
			}),
			success: function(data) {

				const listEl = $('#modalFrameList');
				listEl.empty();

				data.forEach(function(result) {

					const col = $('<div class="col-4 text-center">');
					const wrapper = $('<div class="thumbnail-wrapper position-relative">');
					const img = $('<img class="img-thumbnail preview-img">').attr('src', result.theme.thumbnailPath);
					const overlay = $('<div class="overlay d-flex justify-content-center align-items-center">');
					const selectBtn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', function() {
						applyFrame(result.theme);
					});

					overlay.append(selectBtn);
					wrapper.append(img).append(overlay);
					col.append(wrapper);
					listEl.append(col);
				});
			}
		});
	}

	// 개선된 Frame 적용 함수 - 올바른 레이어 구조와 마스킹
	function applyFrame(frameTheme) {
		const frameContainer = $('#frame-container');
		frameContainer.css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 10
		});

		// 프레임 그룹 생성 (전체 프레임 컴포넌트를 담는 컨테이너)
		const frameGroup = $('<div class="frame-group"></div>').css({
			position: 'absolute',
			cursor: 'move',
			zIndex: 15
		});

		// 1. 마스킹 컨테이너 (사진이 마스크 영역에서만 보이도록)
		const maskContainer = $('<div class="mask-container"></div>').css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			overflow: 'hidden',
			zIndex: 16 // 프레임보다 아래
		});

		// 2. 사진 컨테이너 (실제 사진이 들어갈 공간)
		const photoContainer = $('<div class="photo-container"></div>').css({
			position: 'relative',
			width: '100%',
			height: '100%',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center'
		});
		
		photoContainer.css('background-color', 'black');

		// 3. 플레이스홀더
		const placeholderLink = $('<a href="#" class="place-image-here-link">Place Image Here</a>').css({
			color: 'white',
			textDecoration: 'underline',
			fontSize: '14px',
			fontWeight: 'bold',
			textAlign: 'center',
			display: 'block',
			zIndex: 19,
			position: 'relative'
		});

		// 4. 업로드된 사진 (마스킹될 대상)
		const uploadedPhoto = $('<img class="uploaded-photo">').css({
			display: 'none',
			position: 'absolute',
			cursor: 'move',
			maxWidth: 'none',
			maxHeight: 'none',
			objectFit: 'cover',
			zIndex: 17
		});

		// 5. 프레임 오버레이 (가장 위에 표시될 프레임 테두리)
		const frameOverlay = $('<img class="frame-overlay">').attr('src', frameTheme.editPath).css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 20, // 가장 위에
			pointerEvents: 'none' // 클릭 이벤트가 하위 요소로 전달되도록
		});
		
		// 6. 클릭 감지용 투명 레이어 추가 (핵심 해결책!)
		const clickDetector = $('<div class="frame-click-detector"></div>').css({
		    position: 'absolute',
		    top: 0,
		    left: 0,
		    width: '100%',
		    height: '100%',
		    zIndex: 18, // 모든 것보다 위에
		    backgroundColor: 'transparent',
		    cursor: 'move',
			pointerEvents: 'none'
		});
		
		const rotateHandle = $('<div class="rotate-handle"></div>');
		const rotateLine = $('<div class="rotate-line"></div>');
		rotateHandle.append(rotateLine);

		// DOM 구조 조립
		photoContainer.append(placeholderLink).append(uploadedPhoto);
		maskContainer.append(photoContainer);
		frameGroup.append(maskContainer).append(frameOverlay).append(clickDetector).append(rotateHandle);
		frameContainer.append(frameGroup);

		// frameTheme 데이터 저장 (나중에 참조용)
		frameGroup.data('frameTheme', frameTheme);

		// 마스킹 적용 - 프레임 생성 시 한 번만 적용 (복잡한 모양 지원)
		if (frameTheme.editMaskPath) {
			applyComplexShapeMasking(maskContainer, frameTheme);
		}

		// 프레임 이미지가 로드된 후 위치 및 크기 설정
		frameOverlay.on('load', function() {
			setupFramePosition(frameGroup, frameTheme, this);
			makeFrameDraggable(frameGroup);
		}).on('error', function() {
			setupFramePosition(frameGroup, frameTheme, null);
			makeFrameDraggable(frameGroup);
		});

		// 이벤트 핸들러 설정
		window.enhancedSelection.setupFrameEventHandlers(frameGroup, placeholderLink, uploadedPhoto, maskContainer, clickDetector);

		// 모달 닫기
		$('#frameModal').modal('hide');
	}

	// 복잡한 모양 마스킹 적용 함수
	function applyComplexShapeMasking(maskContainer, frameTheme) {

		if (!frameTheme.editMaskPath) {
			console.warn('No mask path provided - photo will fill entire frame');
			return;
		}

		const maskImg = new Image();
		maskImg.crossOrigin = 'anonymous';

		maskImg.onload = function() {
			// CSS mask 적용 - 복잡한 모양 지원을 위한 향상된 설정
			const maskStyles = {
				// WebKit 기반 브라우저 (Chrome, Safari, Edge)
				'-webkit-mask-image': `url(${frameTheme.editMaskPath})`,
				'-webkit-mask-size': '100% 100%',
				'-webkit-mask-repeat': 'no-repeat',
				'-webkit-mask-position': 'center center',
				'-webkit-mask-origin': 'border-box',
				'-webkit-mask-clip': 'border-box',

				// 표준 CSS Mask (Firefox, 최신 브라우저)
				'mask-image': `url(${frameTheme.editMaskPath})`,
				'mask-size': '100% 100%',
				'mask-repeat': 'no-repeat',
				'mask-position': 'center center',
				'mask-origin': 'border-box',
				'mask-clip': 'border-box',
				'mask-mode': 'alpha', // 알파 채널 기반 마스킹

				// 추가 설정
				'overflow': 'hidden', // 마스크 밖으로 나가는 내용 숨김
				'isolation': 'isolate' // 스택킹 컨텍스트 생성
			};

			maskContainer.css(maskStyles);
		};

		maskImg.onerror = function() {
			console.error('Failed to load complex shape mask:', frameTheme.editMaskPath);

			// 대체 마스킹 방법 시도
			applyFallbackMasking(maskContainer, frameTheme);
		};

		maskImg.src = frameTheme.editMaskPath;
	}

	// 대체 마스킹 방법
	function applyFallbackMasking(maskContainer, frameTheme) {
		console.log('Applying fallback masking method');

		// Canvas 기반 마스킹 시도
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		const maskImg = new Image();
		maskImg.crossOrigin = 'anonymous';

		maskImg.onload = function() {
			canvas.width = maskImg.width;
			canvas.height = maskImg.height;
			ctx.drawImage(maskImg, 0, 0);

			const maskDataURL = canvas.toDataURL();

			maskContainer.css({
				'-webkit-mask-image': `url(${maskDataURL})`,
				'mask-image': `url(${maskDataURL})`,
				'-webkit-mask-size': '100% 100%',
				'mask-size': '100% 100%'
			});

			console.log('Fallback canvas masking applied');
		};

		maskImg.src = frameTheme.editMaskPath;
	}

	// 프레임 위치 및 크기 설정
	function setupFramePosition(frameGroup, frameTheme, frameImage) {
		const backgroundImage = $('#page-preview-img');
		const bgDisplayWidth = backgroundImage.width();
		const bgDisplayHeight = backgroundImage.height();

		// 프레임 크기 결정
		const frameWidth = frameTheme.width || (frameImage ? frameImage.naturalWidth : 200);
		const frameHeight = frameTheme.height || (frameImage ? frameImage.naturalHeight : 250);

		// 백그라운드 이미지 중앙에 프레임 배치
		const initialTop = (bgDisplayHeight - frameHeight) / 2;
		const initialLeft = (bgDisplayWidth - frameWidth) / 2;

		frameGroup.css({
			top: `${initialTop}px`,
			left: `${initialLeft}px`,
			width: `${frameWidth}px`,
			height: `${frameHeight}px`
		});
	}

	// 개선된 프레임 드래그 기능
	function makeFrameDraggable(frameGroup) {
		const backgroundImage = $('#page-preview-img');
		const bgDisplayWidth = backgroundImage.width();
		const bgDisplayHeight = backgroundImage.height();
		let isDragging = false;
		let startX, startY;

		frameGroup.on('mousedown', function(e) {
			// 사진 또는 핸들을 드래그하는 경우 프레임 드래그 방지
			if ($(e.target).hasClass('uploaded-photo') || 
			    $(e.target).hasClass('rotate-handle') || 
			    $(e.target).hasClass('selection-handle') || 
			    $(e.target).hasClass('place-image-here-link')) {
			    return; // 해당 요소들이 클릭/드래그될 때는 프레임 선택을 방지하고, 해당 요소의 드래그 로직으로 넘어감
			}

			isDragging = true;
			const frameGroupOffset = frameGroup.offset();
			const containerOffset = $('#frame-container').offset();

			startX = e.clientX - frameGroupOffset.left;
			startY = e.clientY - frameGroupOffset.top;

			selectFrame(frameGroup);

			$(document).on('mousemove', function(ev) {
				if (!isDragging) return;

				let newLeft = ev.clientX - startX - containerOffset.left;
				let newTop = ev.clientY - startY - containerOffset.top;

				// 배경 영역 내에서만 이동 제한
				newLeft = Math.max(0, Math.min(newLeft, bgDisplayWidth - frameGroup.width()));
				newTop = Math.max(0, Math.min(newTop, bgDisplayHeight - frameGroup.height()));

				frameGroup.css({
					left: `${newLeft}px`,
					top: `${newTop}px`
				});

				// Update tooltip position while dragging
				showFrameControlsTooltip(frameGroup);
			});

			$(document).on('mouseup', function() {
				isDragging = false;
				$(document).off('mousemove mouseup');
			});

			e.preventDefault();
			e.stopPropagation();
		});
	}

	// 사진 드래그 시 프레임 경계 내에서만 이동하도록 개선된 드래그 기능
	function makePhotoDraggable(photo, maskContainer) {
		let isDraggingPhoto = false;
		let photoStartX, photoStartY;
		let initialPhotoLeft, initialPhotoTop;

		photo.on('mousedown', function(e) {
			if (e.button !== 0) return; 
			
			e.preventDefault();
			e.stopPropagation(); // 이벤트 전파 중단
			
			isDraggingPhoto = true;

			// 사진 선택 (드래그 시작 시)
			const frameGroup = photo.closest('.frame-group');
			selectPhoto(photo, frameGroup);

			// 현재 사진의 위치 저장
			const photoPosition = photo.position();
			initialPhotoLeft = photoPosition.left;
			initialPhotoTop = photoPosition.top;

			photoStartX = e.clientX;
			photoStartY = e.clientY;

			$(document).on('mousemove', function(ev) {
				if (!isDraggingPhoto) return;

				// 마우스 이동 거리 계산
				const deltaX = ev.clientX - photoStartX;
				const deltaY = ev.clientY - photoStartY;

				// 새로운 위치 계산
				let newLeft = initialPhotoLeft + deltaX;
				let newTop = initialPhotoTop + deltaY;

				// maskContainer 경계 내에서만 이동 허용
				const containerWidth = maskContainer.width();
				const containerHeight = maskContainer.height();
				const photoWidth = photo.width();
				const photoHeight = photo.height();

				// 프레임 경계를 벗어나지 않도록 제한 (오버플로우 최소화)
				const allowOverflow = 20; // 20px까지만 오버플로우 허용
				newLeft = Math.max(-photoWidth + allowOverflow, Math.min(newLeft, containerWidth - allowOverflow));
				newTop = Math.max(-photoHeight + allowOverflow, Math.min(newTop, containerHeight - allowOverflow));

				photo.css({
					left: `${newLeft}px`,
					top: `${newTop}px`
				});
			});

			$(document).on('mouseup', function() {
				isDraggingPhoto = false;
				$(document).off('mousemove mouseup');
			});
		});
	}

	//사진 컨트롤 툴팁 표시 함수
	function showPhotoControlsTooltip(photo, frameGroup) {
	    const frameRect = frameGroup[0].getBoundingClientRect();
	    const pagePreviewRect = $('#page-preview')[0].getBoundingClientRect();

	    const frameRelativeLeft = frameRect.left - pagePreviewRect.left;
	    const frameRelativeTop = frameRect.top - pagePreviewRect.top;

	    const tooltipWidth = photoControlsTooltip.outerWidth();
	    const tooltipHeight = photoControlsTooltip.outerHeight();

	    // ★★★ 프레임 툴팁과 동일한 위치 계산 로직 ★★★
	    // 툴팁을 프레임의 오른쪽 상단에 위치시킵니다.
	    let topPos = frameRelativeTop - tooltipHeight - 10;
	    let leftPos = frameRelativeLeft + frameRect.width + 10;

	    // --- 경계 확인 및 조정 로직 (기존 프레임 툴팁과 동일하게) ---
	    const pagePreviewWidth = $('#page-preview').width();
	    const pagePreviewHeight = $('#page-preview').height();

	    // 툴팁이 오른쪽으로 벗어날 경우
	    if (leftPos + tooltipWidth > pagePreviewWidth) {
	        // 프레임의 왼쪽으로 위치 변경
	        leftPos = frameRelativeLeft - tooltipWidth - 10;
	        if (leftPos < 0) {
	            leftPos = pagePreviewWidth - tooltipWidth;
	        }
	    }

	    // 툴팁이 위쪽으로 벗어날 경우
	    if (topPos < 0) {
	        // 프레임 아래로 위치 변경
	        topPos = frameRelativeTop + frameGroup.outerHeight() + 10;
	        if (topPos + tooltipHeight > pagePreviewHeight) {
	            topPos = pagePreviewHeight - tooltipHeight;
	        }
	    }

	    // 계산된 위치에 툴팁 표시
	    photoControlsTooltip.removeClass('d-none').css({
	        top: `${topPos}px`,
	        left: `${leftPos}px`
	    });

	    // 툴팁 컨트롤 값 초기화
	    const currentTransform = getPhotoTransform(photo);
		const inputZoomValue = ((currentTransform.scale - 0.5) / 2.5) * 100;
		
	    $('#photo-zoom-input').val(inputZoomValue);
	    $('#photo-rotate-input').val(currentTransform.rotation);
	}
	
	//사진 변환 정보(회전, 스케일) 가져오는 함수
	function getPhotoTransform(photo) {
	    const transform = photo.css('transform');
	    let scale = 1;
	    let rotation = 0;

	    if (transform && transform !== 'none') {
	        const matrix = transform.match(/matrix\((.+)\)/);
	        if (matrix) {
	            const values = matrix[1].split(', ').map(parseFloat);
	            const a = values[0];
	            const b = values[1];
	            
	            // 스케일 계산 ( assuming uniform scaling )
	            scale = Math.sqrt(a*a + b*b);
	            
	            // 회전각 계산
	            rotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
	            if (rotation < 0) rotation += 360;
	        }
	    }
	    return { scale, rotation };
	}

	//사진 크기 조절(Zoom) 및 회전 적용 함수
	function applyPhotoTransform(photo, scale, rotation) {
	    photo.css('transform', `rotate(${rotation}deg) scale(${scale})`);
	}

	//사진 크기 조절 핸들 추가 함수
	function addPhotoSelectionHandles(photo) {
	    $('.selection-handle').remove();
	    const handles = ['nw', 'ne', 'sw', 'se']; // 대각선 핸들만 사용
	    handles.forEach(position => {
	        const handle = $('<div class="selection-handle">').addClass(`handle-${position}`).css({
	            position: 'absolute',
	            width: '10px',
	            height: '10px',
	            backgroundColor: '#FFA500', // 주황색
	            border: '1px solid white',
	            cursor: getResizeCursor(position),
	            zIndex: 30
	        });

	        handle.css(getHandlePosition(position));
	        photo.append(handle);
	        
	        // 크기 조절 로직 추가
	        makePhotoResizable(photo, handle, position);
	    });
	}

	//사진 회전 핸들 추가 함수
	function addPhotoRotationHandle(photo) {
	    $('.rotate-handle').remove();
	    const rotateHandle = $('<div class="rotate-handle"></div>').css({
	        /* 스타일은 기존 addRotationHandle 함수와 유사하게 설정 */
	    });
	    photo.append(rotateHandle);

	    let isRotating = false;
	    let startAngle, photoCenter;

	    rotateHandle.on('mousedown', function(e) {
	        e.preventDefault();
	        e.stopPropagation();
	        isRotating = true;

	        const currentTransform = getPhotoTransform(photo);
	        startAngle = currentTransform.rotation;

	        const photoOffset = photo.offset();
	        photoCenter = {
	            x: photoOffset.left + photo.width() / 2,
	            y: photoOffset.top + photo.height() / 2
	        };
	        
	        const startRad = Math.atan2(e.clientY - photoCenter.y, e.clientX - photoCenter.x);

	        $(document).on('mousemove', function(ev) {
	            if (!isRotating) return;
	            const moveRad = Math.atan2(ev.clientY - photoCenter.y, ev.clientX - photoCenter.x);
	            const deltaAngle = (moveRad - startRad) * (180 / Math.PI);
	            let newAngle = (startAngle + deltaAngle);

	            applyPhotoTransform(photo, currentTransform.scale, newAngle);
	            $('#photo-rotate-input').val(Math.round(newAngle % 360));
	        });

	        $(document).on('mouseup', function() {
	            isRotating = false;
	            $(document).off('mousemove mouseup');
	        });
	    });
	}

	//사진 크기 조절 로직
	function makePhotoResizable(photo, handle, position) {
	    let isResizing = false;
	    
	    handle.on('mousedown', function(e) {
	        e.preventDefault();
	        e.stopPropagation();
	        isResizing = true;
	        
	        $(document).on('mousemove', function(ev) {
	            if (!isResizing) return;
	            // 크기 조절 로직 구현 (간단한 예시: 스케일 조정)
	            const currentTransform = getPhotoTransform(photo);
	            
	            // 마우스 이동에 따라 스케일 값을 간단히 증감시키는 로직
	            // (더 정교한 계산이 필요할 수 있음)
	            const movement = (ev.movementX - ev.movementY) * 0.001;
	            let newScale = parseFloat(currentTransform.scale) + movement;
	            newScale = Math.max(0.5, Math.min(newScale, 3)); // 최소/최대 스케일 제한

	            applyPhotoTransform(photo, newScale, currentTransform.rotation);
	            $('#photo-zoom-input').val(newScale);
	        });
	        
	        $(document).on('mouseup', function() {
	            isResizing = false;
	            $(document).off('mousemove mouseup');
	        });
	    });
	}

	// 선택 핸들 추가 (프레임 크기 조정용) - (현재는 미구현, 시각적 표시만)
	// 이 함수는 현재 핸들을 추가하지만, 실제 리사이징 로직은 포함되어 있지 않습니다.
	// 리사이징을 구현하려면 mousedown/mousemove/mouseup 이벤트 핸들러를 추가해야 합니다.
	function addSelectionHandles(frameGroup) {
		// 기존 핸들 제거
		$('.selection-handle').remove();

		const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

		handles.forEach(position => {
			const handle = $('<div class="selection-handle">').addClass(`handle-${position}`).css({
			    position: 'absolute',
			    width: '8px',
			    height: '8px',
			    backgroundColor: '#28a745', // 녹색으로 변경 (프레임 테두리 색상과 맞춤)
			    border: '1px solid white',
			    borderRadius: '50%',
			    cursor: getResizeCursor(position),
			    zIndex: '25' // Ensure handles are above frame
			});

			// 핸들 위치 설정
			const handlePosition = getHandlePosition(position);
			handle.css(handlePosition);

			frameGroup.append(handle);

			// TODO: Add mousedown/mousemove/mouseup for actual resizing logic here
		});
	}

	// 핸들 위치 계산
	function getHandlePosition(position) {
		const offset = -4; // 핸들 크기의 절반

		switch (position) {
			case 'nw':
				return {
					top: `${offset}px`,
					left: `${offset}px`
				};
			case 'ne':
				return {
					top: `${offset}px`,
					right: `${offset}px`
				};
			case 'sw':
				return {
					bottom: `${offset}px`,
					left: `${offset}px`
				};
			case 'se':
				return {
					bottom: `${offset}px`,
					right: `${offset}px`
				};
			case 'n':
				return {
					top: `${offset}px`,
					left: '50%',
					transform: 'translateX(-50%)'
				};
			case 's':
				return {
					bottom: `${offset}px`,
					left: '50%',
					transform: 'translateX(-50%)'
				};
			case 'e':
				return {
					top: '50%',
					right: `${offset}px`,
					transform: 'translateY(-50%)'
				};
			case 'w':
				return {
					top: '50%',
					left: `${offset}px`,
					transform: 'translateY(-50%)'
				};
		}
	}

	// 리사이즈 커서 설정
	function getResizeCursor(position) {
		const cursors = {
			'nw': 'nw-resize',
			'ne': 'ne-resize',
			'sw': 'sw-resize',
			'se': 'se-resize',
			'n': 'n-resize',
			's': 's-resize',
			'e': 'e-resize',
			'w': 'w-resize'
		};
		return cursors[position];
	}

	// 개선된 파일 업로드 처리 - 마스킹 유지
	$('#image-upload-input').off('change').on('change', function(e) {
	    const file = e.target.files[0];
	    const $fileInput = $(this);
	    const targetFrameGroup = $fileInput.data('targetFrameGroup');
	    const targetUploadedPhoto = $fileInput.data('targetUploadedPhoto');
	    const targetPlaceholderLink = $fileInput.data('targetPlaceholderLink');
	    const targetMaskContainer = $fileInput.data('targetMaskContainer');

	    if (file && targetFrameGroup && targetUploadedPhoto && targetPlaceholderLink && targetMaskContainer) {
	        const reader = new FileReader();
	        reader.onload = function(event) {
	            // 사진 설정
	            targetUploadedPhoto.attr('src', event.target.result).css({
	                display: 'block',
	                position: 'absolute'
	            });

	            // 이미지 로드 완료 후 크기 조정
	            targetUploadedPhoto.on('load', function() {
	                const maskWidth = targetMaskContainer.width();
	                const maskHeight = targetMaskContainer.height();

	                // 이미지를 마스크 컨테이너에 맞게 크기 조정
	                const imgAspectRatio = this.naturalWidth / this.naturalHeight;
	                const containerAspectRatio = maskWidth / maskHeight;

	                let newWidth, newHeight;

	                // 컨테이너를 완전히 덮도록 크기 조정
	                if (imgAspectRatio > containerAspectRatio) {
	                    newHeight = maskHeight * 1.2;
	                    newWidth = newHeight * imgAspectRatio;
	                } else {
	                    newWidth = maskWidth * 1.2;
	                    newHeight = newWidth / imgAspectRatio;
	                }

	                // 사진 크기 및 중앙 배치
	                targetUploadedPhoto.css({
	                    width: `${newWidth}px`,
	                    height: `${newHeight}px`,
	                    left: `${(maskWidth - newWidth) / 2}px`,
	                    top: `${(maskHeight - newHeight) / 2}px`
	                });

	                // 사진이 업로드되면 clickDetector 활성화
	                const clickDetector = targetFrameGroup.find('.frame-click-detector');
	                clickDetector.css('pointerEvents', 'none');

					// 사진 업로드 후 모든 선택 해제
					window.enhancedSelection.clearSelection();
	            });

	            // 플레이스홀더 숨기기
	            targetPlaceholderLink.hide();
	            $fileInput.val('');
	        };
	        reader.readAsDataURL(file);
	    }
	});

	// Clear 기능 (선택 상태도 함께 초기화)
	$('#btn-clear').on('click', function() {
		if (confirm("All designs on this page will be deleted and reset.\nPlease click \"Confirm\" to proceed.")) {
			$('#page-preview-img').attr('src', '/images/placeholder.png');
			$('#frame-container').empty();
			clearSelection(); // 선택 상태 초기화
			
			// Safe line 초기화 (placeholder로 변경되므로 자동으로 숨겨짐)
			setTimeout(() => {
				window.safeLineManager.updateSafeLines();
			}, 100);
		}
	});
	
	// 문서 클릭 이벤트 수정 (기존 코드에서 찾아서 수정)
	$(document).off('click.enhanced').on('click.enhanced', function(e) {
		const clickedOnFrame = $(e.target).closest('.frame-group').length > 0;
		const clickedOnTextBox = $(e.target).closest('.text-box').length > 0;
		const clickedOnTextTooltip = $(e.target).closest('#text-tooltip').length > 0;
		const clickedOnFrameTooltip = $(e.target).closest('#frame-controls-tooltip').length > 0;
		const clickedOnPhotoTooltip = $(e.target).closest('#photo-controls-tooltip').length > 0;
		const clickedOnPhotoOverlay = $(e.target).closest('#photo-full-overlay').length > 0;
		const clickedOnModal = $(e.target).closest('.modal').length > 0;
		const clickedOnSidebar = $(e.target).closest('.sidebar').length > 0;
		const clickedOnButtons = $(e.target).closest('button').length > 0;

		if (!clickedOnFrame && !clickedOnTextBox && !clickedOnTextTooltip &&
			!clickedOnFrameTooltip && !clickedOnPhotoTooltip && !clickedOnPhotoOverlay &&
			!clickedOnModal && !clickedOnSidebar && !clickedOnButtons) {

			window.enhancedSelection.clearSelection();
		}
	});
	
	// #frame-rotate1 아이콘 클릭 이벤트 리스너
	$('#frame-controls-tooltip').on('click', '#frame-rotate1', function() {
	    if (!selectedFrame) return;
	    
	    // 현재 회전 각도 가져오기
	    function getCurrentRotation() {
	        const currentTransform = selectedFrame.css('transform');
	        console.log("1. 현재 transform 속성:", currentTransform);
	        console.log("1-1. transform 타입:", typeof currentTransform, "길이:", currentTransform?.length);
	        
	        if (!currentTransform || currentTransform === 'none') {
	            console.log("2. transform 속성이 'none'이거나 존재하지 않음. 각도 0으로 초기화.");
	            return 0;
	        }
	        
	        // 방법 1: rotate(Xdeg) 형태의 값을 직접 파싱
	        const rotateMatch = currentTransform.match(/rotate\(([-+]?\d*\.?\d+)(deg|rad)?\)/i);
	        
	        if (rotateMatch && rotateMatch[1]) {
	            let angle = parseFloat(rotateMatch[1]);
	            
	            if (rotateMatch[2] === 'rad') {
	                angle = angle * (180 / Math.PI);
	            }
	            
	            const normalizedAngle = (angle % 360 + 360) % 360;
	            const rotation = Math.round(normalizedAngle);
	            return rotation;
	        }
	        
	        // 방법 2: matrix() 형태 직접 파싱
	        const matrixMatch = currentTransform.match(/matrix\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)/);
	        
	        if (matrixMatch) {
	            const a = parseFloat(matrixMatch[1]); // cos(θ)
	            const b = parseFloat(matrixMatch[2]); // sin(θ)
	            const c = parseFloat(matrixMatch[3]); // -sin(θ)
	            const d = parseFloat(matrixMatch[4]); // cos(θ)
	            
	            // atan2를 사용하여 각도 계산
	            const angleRad = Math.atan2(b, a);
	            const angleDeg = angleRad * (180 / Math.PI);
	            
	            // 0-359 범위로 정규화
	            const normalizedAngle = (angleDeg % 360 + 360) % 360;
	            const rotation = Math.round(normalizedAngle);
	            return rotation;
	        }
	        
	        // 방법 3: WebKitCSSMatrix 사용 (최후의 수단)
	        try {
	            const matrix = new WebKitCSSMatrix(currentTransform);
	            
	            const angleRad = Math.atan2(matrix.m21, matrix.m11);
	            const angleDeg = angleRad * (180 / Math.PI);
	            
	            const normalizedAngle = (angleDeg % 360 + 360) % 360;
	            const rotation = Math.round(normalizedAngle);
	            return rotation;
	        } catch (e) {
	            console.error("WebKitCSSMatrix 파싱 오류:", e);
	            return 0;
	        }
	    }
	    
	    // 각도 스냅 함수 (이미 정규화된 0-359 범위의 각도를 받음)
	    function snapAngle(angle) {
	        
	        // 스냅 로직 적용
	        if (angle >= 1 && angle <= 89) {
	            return 0;
	        } else if (angle >= 91 && angle <= 179) {
	            return 90;
	        } else if (angle >= 181 && angle <= 269) {
	            return 180;
	        } else if (angle >= 271 && angle <= 359) {
	            return 270;
	        }
	        
	        // 정확한 각도 (0, 90, 180, 270)는 그대로 유지
	        return angle;
	    }
	    
	    // 프레임 컨트롤 툴팁 위치 업데이트 함수
	    function updateTooltipPosition() {
	        const frameRect = selectedFrame[0].getBoundingClientRect();
	        const previewRect = $('#page-preview')[0].getBoundingClientRect();
	        const frameControlsTooltip = $('#frame-controls-tooltip'); // 변수가 정의되어 있다고 가정
	        
	        frameControlsTooltip.css({
	            left: frameRect.right - previewRect.left + 10,
	            top: frameRect.top - previewRect.top,
	        });
	    }
	    
	    // 메인 로직 실행
	    const currentRotation = getCurrentRotation();
	    const newRotation = snapAngle(currentRotation);
	    
	    // 프레임에 새로운 회전 값 적용
	    selectedFrame.css('transform', `rotate(${newRotation}deg)`);
	    
	    // 툴팁 위치 업데이트
	    updateTooltipPosition();
	});
	
	$('#frame-controls-tooltip').on('click', '#frame-rotate2', function() {
		if (!selectedFrame) return;

		// 현재 회전 각도 가져오기
		function getCurrentRotation() {
			const currentTransform = selectedFrame.css('transform');
			console.log("1. 현재 transform 속성:", currentTransform);
			console.log("1-1. transform 타입:", typeof currentTransform, "길이:", currentTransform?.length);

			if (!currentTransform || currentTransform === 'none') {
				console.log("2. transform 속성이 'none'이거나 존재하지 않음. 각도 0으로 초기화.");
				return 0;
			}

			// 방법 1: rotate(Xdeg) 형태의 값을 직접 파싱
			const rotateMatch = currentTransform.match(/rotate\(([-+]?\d*\.?\d+)(deg|rad)?\)/i);
			console.log("2. 정규식 매칭 결과:", rotateMatch);

			if (rotateMatch && rotateMatch[1]) {
				let angle = parseFloat(rotateMatch[1]);
				console.log("3. 파싱된 원본 각도:", angle);

				if (rotateMatch[2] === 'rad') {
					angle = angle * (180 / Math.PI);
					console.log("3-1. 라디안을 도로 변환:", angle);
				}

				const normalizedAngle = (angle % 360 + 360) % 360;
				const rotation = Math.round(normalizedAngle);
				console.log("4. 정규화 및 반올림:", normalizedAngle, "→", rotation);
				console.log("*** 정규식 파싱 성공, 반환값:", rotation);
				return rotation;
			}

			// 방법 2: matrix() 형태 직접 파싱
			const matrixMatch = currentTransform.match(/matrix\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)/);
			console.log("3. matrix 정규식 매칭 결과:", matrixMatch);

			if (matrixMatch) {
				const a = parseFloat(matrixMatch[1]); // cos(θ)
				const b = parseFloat(matrixMatch[2]); // sin(θ)
				const c = parseFloat(matrixMatch[3]); // -sin(θ)
				const d = parseFloat(matrixMatch[4]); // cos(θ)

				console.log("4. Matrix 값들 - a(cos):", a, "b(sin):", b, "c(-sin):", c, "d(cos):", d);

				// atan2를 사용하여 각도 계산
				const angleRad = Math.atan2(b, a);
				const angleDeg = angleRad * (180 / Math.PI);
				console.log("5. atan2 계산 - 라디안:", angleRad, "도:", angleDeg);

				// 0-359 범위로 정규화
				const normalizedAngle = (angleDeg % 360 + 360) % 360;
				const rotation = Math.round(normalizedAngle);
				console.log("6. 정규화 및 반올림:", normalizedAngle, "→", rotation);
				console.log("*** matrix 파싱 성공, 반환값:", rotation);
				return rotation;
			}

			console.log("*** 정규식 파싱들 모두 실패, WebKitCSSMatrix 사용");

			// 방법 3: WebKitCSSMatrix 사용 (최후의 수단)
			try {
				const matrix = new WebKitCSSMatrix(currentTransform);
				console.log("7. Matrix 객체:", matrix);
				console.log("8. Matrix m11 (cos):", matrix.m11, "m21 (sin):", matrix.m21);

				const angleRad = Math.atan2(matrix.m21, matrix.m11);
				const angleDeg = angleRad * (180 / Math.PI);
				console.log("9. atan2로 계산된 라디안:", angleRad, "도:", angleDeg);

				const normalizedAngle = (angleDeg % 360 + 360) % 360;
				const rotation = Math.round(normalizedAngle);
				console.log("10. Matrix 정규화 및 반올림:", normalizedAngle, "→", rotation);
				console.log("*** WebKitCSSMatrix 파싱 성공, 반환값:", rotation);
				return rotation;
			} catch (e) {
				console.error("WebKitCSSMatrix 파싱 오류:", e);
				return 0;
			}
		}

		// 각도 스냅 함수 (이미 정규화된 0-359 범위의 각도를 받음)
		function snapAngle(angle) {
			console.log("4. 스냅 적용 전 각도:", angle);

			// 스냅 로직 적용
			if (angle >= 1 && angle <= 89) {
				console.log("5. 1-89도 범위 → 0도로 스냅");
				return 90;
			} else if (angle >= 91 && angle <= 179) {
				console.log("5. 91-179도 범위 → 90도로 스냅");
				return 180;
			} else if (angle >= 181 && angle <= 269) {
				console.log("5. 181-269도 범위 → 180도로 스냅");
				return 270;
			} else if (angle >= 271 && angle <= 359) {
				console.log("5. 271-359도 범위 → 270도로 스냅");
				return 0;
			}

			// 정확한 각도 (0, 90, 180, 270)는 그대로 유지
			console.log("5. 정확한 각도이므로 그대로 유지:", angle);
			return angle;
		}

		// 프레임 컨트롤 툴팁 위치 업데이트 함수
		function updateTooltipPosition() {
			const frameRect = selectedFrame[0].getBoundingClientRect();
			const previewRect = $('#page-preview')[0].getBoundingClientRect();
			const frameControlsTooltip = $('#frame-controls-tooltip'); // 변수가 정의되어 있다고 가정

			frameControlsTooltip.css({
				left: frameRect.right - previewRect.left + 10,
				top: frameRect.top - previewRect.top,
			});
		}

		// 메인 로직 실행
		const currentRotation = getCurrentRotation();
		const newRotation = snapAngle(currentRotation);

		console.log("6. 적용될 newRotation:", newRotation);

		// 프레임에 새로운 회전 값 적용
		selectedFrame.css('transform', `rotate(${newRotation}deg)`);

		// 툴팁 위치 업데이트
		updateTooltipPosition();
	});
	
	// Text Panel
	btnText.on("click", function() {
		
		window.enhancedSelection.clearSelection();
		
		activate(btnText);
		hideAllPanels();
		textPanel.removeClass('d-none');
	});

	// Add Text Box 기능
	addTextBtn.on('click', function() {
		const preview = $('#page-preview');
		const frameContainer = $('#frame-container');

		// 텍스트 박스 생성
		const textBox = $('<div class="text-box" contenteditable="true">').css({
			position: 'absolute',
			top: '50px',
			left: '50px',
			padding: '8px',
			border: '2px dashed #007bff',
			backgroundColor: 'rgba(255, 255, 255, 0.8)',
			fontSize: '16px',
			color: '#000',
			minWidth: '100px',
			minHeight: '30px',
			cursor: 'text',
			zIndex: 20,
			outline: 'none'
		}).text('텍스트를 입력하세요');

		frameContainer.append(textBox);

		// 텍스트 박스 드래그 기능
		makeTextBoxDraggable(textBox);

		// 텍스트 박스 클릭 시 선택
		textBox.on('click', function(e) {
			e.stopPropagation();
			selectTextBox(textBox);
		});

		// 텍스트 박스 포커스 시 편집 모드
		textBox.on('focus', function() {
			$(this).css('border', '2px solid #007bff');
		});

		textBox.on('blur', function() {
			$(this).css('border', '2px dashed #007bff');
		});

		// 생성 직후 선택 상태로 설정
		selectTextBox(textBox);
	});

	// 텍스트 박스 드래그 기능
	function makeTextBoxDraggable(textBox) {
		let isDragging = false;
		let startX, startY;

		textBox.on('mousedown', function(e) {
			// contenteditable 영역에서의 텍스트 선택을 위해 일부 영역은 제외
			if (e.target === this && !$(this).is(':focus')) {
				isDragging = true;
				const textBoxOffset = textBox.offset();
				const containerOffset = $('#frame-container').offset();

				startX = e.clientX - textBoxOffset.left;
				startY = e.clientY - textBoxOffset.top;

				$(document).on('mousemove', function(ev) {
					if (!isDragging) return;

					let newLeft = ev.clientX - startX - containerOffset.left;
					let newTop = ev.clientY - startY - containerOffset.top;

					// 컨테이너 영역 내에서만 이동
					const containerWidth = $('#page-preview').width();
					const containerHeight = $('#page-preview').height();

					newLeft = Math.max(0, Math.min(newLeft, containerWidth - textBox.width()));
					newTop = Math.max(0, Math.min(newTop, containerHeight - textBox.height()));

					textBox.css({
						left: `${newLeft}px`,
						top: `${newTop}px`
					});
				});

				$(document).on('mouseup', function() {
					isDragging = false;
					$(document).off('mousemove mouseup');
				});

				e.preventDefault();
			}
		});
	}

	// 텍스트 박스 선택 기능
	function selectTextBox(textBox) {
		// Clear other selections
		clearSelection();

		selectedBox = textBox;
		textBox.addClass('selected-text').css('border', '2px solid #28a745');

		// 툴팁 표시
		showTextTooltip(textBox);
	}

	// 텍스트 툴팁 표시
	function showTextTooltip(textBox) {
		const textBoxOffset = textBox.offset();
		const containerOffset = $('#page-preview').offset();

		tooltip.removeClass('d-none').css({
			top: textBoxOffset.top - containerOffset.top - 40,
			left: textBoxOffset.left - containerOffset.left
		});

		// 현재 스타일 값으로 툴팁 초기화
		inColor.val(rgbToHex(textBox.css('color')));
		inSize.val(textBox.css('font-size'));
		inAlign.val(textBox.css('text-align') || 'left');
	}

	// 툴팁 컨트롤 이벤트
	inColor.on('change', function() {
		if (selectedBox) {
			selectedBox.css('color', $(this).val());
		}
	});

	inSize.on('change', function() {
		if (selectedBox) {
			selectedBox.css('font-size', $(this).val());
		}
	});

	inAlign.on('change', function() {
		if (selectedBox) {
			selectedBox.css('text-align', $(this).val());
		}
	});

	btnRemove.on('click', function() {
		if (selectedBox) {
			selectedBox.remove();
			selectedBox = null;
			tooltip.addClass('d-none');
		}
	});

	// NEW: Frame delete button event
	btnDeleteFrame.on('click', function() {
		if (selectedFrame && confirm("Are you sure you want to delete this frame?")) {
			selectedFrame.remove();
			clearSelection(); // Clear selection after deleting
		}
	});

	// NEW: Frame rotation input event
	frameRotateInput.on('change', function() {
		if (selectedFrame) {
			let angle = parseInt($(this).val());
			if (isNaN(angle)) angle = 0;
			angle = Math.max(0, Math.min(360, angle)); // Keep within 0-360
			$(this).val(angle); // Update input value if clamped
			applyFrameRotation(selectedFrame, angle);
		}
	});
	
	// NEW: Function to get current rotation of a frame
	function getFrameRotation(frameGroup) {
		const transform = frameGroup.css('transform');
		if (transform && transform !== 'none') {
			const matrix = transform.match(/^matrix\((.+)\)$/);
			if (matrix) {
				const values = matrix[1].split(',').map(Number);
				const a = values[0];
				const b = values[1];
				const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
				return angle < 0 ? angle + 360 : angle; // Ensure positive angle
			}
		}
		return 0;
	}

	// NEW: Function to apply rotation to a frame
	function applyFrameRotation(frameGroup, angle) {
		frameGroup.css('transform', `rotate(${angle}deg)`);
	}

	// NEW: Add Rotation Handle to frame
	function addRotationHandle(frameGroup) {
		// Remove existing handle first
		$('.rotate-handle').remove(); // Ensure only one handle exists at a time

		const rotateHandle = $('<div class="rotate-handle"><div class="rotate-line"></div></div>');
		frameGroup.append(rotateHandle);

		let isRotating = false;
		let startAngle = 0;
		let startClientX, startClientY;

		rotateHandle.on('mousedown', function(e) {
			e.stopPropagation(); // Prevent frame drag
			e.preventDefault(); // Prevent text selection
			
			isRotating = true;
			
			const frameCenter = {
				x: frameGroup.offset().left + frameGroup.width() / 2,
				y: frameGroup.offset().top + frameGroup.height() / 2
			};

			startClientX = e.clientX;
			startClientY = e.clientY;
			startAngle = getFrameRotation(frameGroup);

			$(document).on('mousemove', function(ev) {
				if (!isRotating) return;

				const currentAngleRad = Math.atan2(ev.clientY - frameCenter.y, ev.clientX - frameCenter.x);
				const startAngleRad = Math.atan2(startClientY - frameCenter.y, startClientX - frameCenter.x);

				let deltaAngle = (currentAngleRad - startAngleRad) * (180 / Math.PI);
				let newAngle = (startAngle + deltaAngle) % 360;
				if (newAngle < 0) newAngle += 360; // Ensure positive

				applyFrameRotation(frameGroup, newAngle);
				frameRotateInput.val(Math.round(newAngle)); // Update input field
			});

			$(document).on('mouseup', function() {
				isRotating = false;
				$(document).off('mousemove mouseup');
			});
		});
	}

	// NEW: Show and position frame controls tooltip
	function showFrameControlsTooltip(frameGroup) {
		
		const frameRect = frameGroup[0].getBoundingClientRect(); // 브라우저 뷰포트 기준
		const pagePreviewRect = $('#page-preview')[0].getBoundingClientRect(); // 브라우저 뷰포트 기준
		
	    // #page-preview 내부에서의 프레임 상대적 위치
		const frameRelativeLeft = frameRect.left - pagePreviewRect.left;
		const frameRelativeTop = frameRect.top - pagePreviewRect.top;

	    // 툴팁의 실제 너비와 높이
	    const tooltipWidth = frameControlsTooltip.outerWidth();
	    const tooltipHeight = frameControlsTooltip.outerHeight();

	    // 툴팁을 프레임의 오른쪽 상단에 위치시키되, 프레임 내부에 들어가지 않도록 약간 밖으로 빼는 계산
	    // 예: 프레임의 오른쪽 모서리 + 약간의 간격
		let topPos = frameRelativeTop - tooltipHeight - 10;
		let leftPos = frameRelativeLeft + frameRect.width + 10; // frameRect.width 사용

	    // --- 경계 확인 및 조정 로직 (이전 답변과 동일) ---
	    const pagePreviewWidth = $('#page-preview').width();
	    const pagePreviewHeight = $('#page-preview').height();

	    // 툴팁이 #page-preview 영역을 벗어나지 않도록 조정
	    if (leftPos < 0) {
	        leftPos = 0;
	    }
	    if (leftPos + tooltipWidth > pagePreviewWidth) {
	        leftPos = frameRelativeLeft - tooltipWidth - 10;
	        if (leftPos < 0) {
	            leftPos = pagePreviewWidth - tooltipWidth;
	        }
	    }

	    if (topPos < 0) {
	        topPos = frameRelativeTop + frameGroup.outerHeight() + 10;
	        if (topPos + tooltipHeight > pagePreviewHeight) {
	             topPos = pagePreviewHeight - tooltipHeight;
	        }
	    }
	    if (topPos + tooltipHeight > pagePreviewHeight) {
	        topPos = pagePreviewHeight - tooltipHeight;
	    }

	    frameControlsTooltip.removeClass('d-none').css({
	        top: `${topPos}px`,
	        left: `${leftPos}px`
	    });
	}


	// RGB를 HEX로 변환하는 유틸리티 함수
	function rgbToHex(rgb) {
		if (rgb.indexOf('#') === 0) return rgb;
		const result = rgb.match(/\d+/g);
		if (!result) return '#000000';
		return '#' + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
	}

	// 마스킹 디버깅 함수 (개발용)
	function debugMasking(frameGroup) {
		const frameTheme = frameGroup.data('frameTheme');
		const maskContainer = frameGroup.find('.mask-container');

		console.log('=== Masking Debug Info ===');
		console.log('Frame theme:', frameTheme);
		console.log('Mask path:', frameTheme?.editMaskPath);
		console.log('Mask container CSS:', {
			'mask-image': maskContainer.css('mask-image'),
			'-webkit-mask-image': maskContainer.css('-webkit-mask-image'),
			'mask-size': maskContainer.css('mask-size'),
			'overflow': maskContainer.css('overflow')
		});
		console.log('Photo elements:', frameGroup.find('.uploaded-photo').length);
		console.log('=========================');
	}

	// 글로벌 디버그 함수 (개발자 콘솔에서 사용 가능)
	window.debugAllFrames = function() {
		$('.frame-group').each(function(index) {
			console.log(`Frame ${index + 1}:`);
			debugMasking($(this));
		});
	};

	window.debugSelectedFrame = function() {
		if (selectedFrame) {
			debugMasking(selectedFrame);
		} else {
			console.log('No frame selected');
		}
	};
	
	// Delete/Backspace 키 이벤트 수정 (기존 코드에서 찾아서 수정)
	$(document).off('keydown.enhanced').on('keydown.enhanced', function(e) {
		if ((e.keyCode === 46 || e.key === 'Delete' || e.keyCode === 8 || e.key === 'Backspace')) {
			const focusedElement = document.activeElement;
			if (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA' ||
				focusedElement.tagName === 'SELECT' || $(focusedElement).is('[contenteditable="true"]')) {
				return;
			}

			if (selectedBox && selectedBox.is(focusedElement)) {
				return;
			}

			e.preventDefault();

			// 사진이 선택된 경우 사진 삭제
			if (selectedPhotoWrapper) {
				if (confirm("Are you sure you want to delete this photo?")) {
					const frameGroup = selectedPhotoWrapper.closest('.frame-group');
					const placeholderLink = frameGroup.find('.place-image-here-link');

					selectedPhotoWrapper.hide().attr('src', '');
					placeholderLink.show();

					const clickDetector = frameGroup.find('.frame-click-detector');
					clickDetector.css('pointerEvents', 'none');

					window.enhancedSelection.clearSelection();
					console.log("사진이 Delete/Backspace 키로 삭제되었습니다.");
				}
			}
			// 프레임이 선택된 경우 프레임 삭제
			else if (selectedFrame) {
				if (confirm("Are you sure you want to delete this frame?")) {
					selectedFrame.remove();
					window.enhancedSelection.clearSelection();
					console.log("프레임이 Delete/Backspace 키로 삭제되었습니다.");
				}
			}
		}
	});
});