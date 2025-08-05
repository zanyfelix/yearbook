// ============================================================================
// 📁 js/core/SelectionManager.js
// ============================================================================
class SelectionManager {
	constructor() {
		this.selectedMode = null;
		this.currentFrame = null;
		this.currentPhoto = null;
		this.photoOverlay = null;
		this.safeConstraintsCache = null;
		this.setupCache();
	}

	setupCache() {
		// SafeLine 제약조건 캐시를 미리 계산
		const updateCache = () => {
			const bg = $('#page-preview-img');
			if (!bg.length) return;

			const bgPos = bg.position();
			const bgWidth = bg.width();
			const bgHeight = bg.height();

			const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * bgWidth;
			const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * bgHeight;

			this.safeConstraintsCache = {
				safeLeft: bgPos.left + safeMarginX,
				safeTop: bgPos.top + safeMarginY,
				safeRight: bgPos.left + bgWidth - safeMarginX,
				safeBottom: bgPos.top + bgHeight - safeMarginY
			};
		};

		// 초기 캐시 설정
		setTimeout(updateCache, 100);

		// 이미지 변경 시 캐시 업데이트
		$('#page-preview-img').on('load', updateCache);
		$(window).on('resize', updateCache);
	}

	selectFrame(frameGroup) {
	    this.clearSelection();
	    
	    selectedFrame = frameGroup;
	    this.selectedMode = 'frame';
	    this.currentFrame = frameGroup;
		
		const isTextboxFrame = frameGroup.hasClass('textbox-frame');
		const isElement = frameGroup.hasClass('element-frame');
	    
	    frameGroup.addClass('selected-frame').css('border', '1px dashed #ff0000');
	    FrameManager.addRotationHandle(frameGroup);
		if (isElement) {
			this.addElementResizeHandles(frameGroup);
		}
	    UIManager.showFrameTooltip(frameGroup);
	}

    selectPhoto(photo, frameGroup) {
        this.clearSelection();
        
        selectedPhotoWrapper = photo;
        this.selectedMode = 'photo';
        this.currentFrame = frameGroup;
        this.currentPhoto = photo;
		
		photo.addClass('selected-photo');
        
		// ▼▼▼▼▼ 수정/추가된 부분 ▼▼▼▼▼
		PhotoManager.removeSelectionUI(); // 만약을 위해 기존 UI 제거
		PhotoManager.addSelectionUI(photo, frameGroup); // 새로운 편집 UI 생성
		// ▲▲▲▲▲ 수정/추가된 부분 ▲▲▲▲▲

		UIManager.showPhotoTooltip(photo, frameGroup);
		PhotoManager.showOverlay(photo, frameGroup);
    }
	
	selectTextBox(textBox) {
		this.clearSelection(); // 다른 모든 선택 해제
		selectedBox = textBox;
		this.selectedMode = 'text';
		
		// '편집' 상태는 제거하고 '선택' 상태를 추가합니다.
		textBox.removeClass('editing').addClass('selected');
		textBox.blur(); // 텍스트 편집 커서가 활성화되지 않도록 포커스를 해제합니다.

		UIManager.showTextTooltip(textBox);
		textBox.addClass('selected');
	}

    clearSelection() {
		$('.frame-group').removeClass('selected-frame').css({
			'border': '2px solid transparent',  // 'none' 대신 transparent로 변경
			'box-shadow': 'none'
		});
		
		$('.frame-group.element-frame').removeClass('selected-element').css({
			'border': '2px solid transparent',
			'box-shadow': 'none'
		});
		$('.element-resize-handle').remove();

		// 사진 선택 해제
		$('.uploaded-photo').removeClass('selected-photo').css({
			'border': 'none',
			'box-shadow': 'none'
		});
		
		// 'selected'와 'editing' 클래스를 모두 제거합니다.
		$('.text-box').removeClass('selected editing');
		$('#text-tooltip').addClass('d-none');
		UIManager.hideAllToolbars();

		// 핸들 및 툴팁 제거
		$('.selection-handle, .rotate-handle, .rotate-line').remove();
		$('#frame-controls-tooltip, #photo-controls-tooltip, #text-tooltip').addClass('d-none');

		PhotoManager.removeSelectionUI();
		PhotoManager.hideOverlay();
        
		selectedFrame = null;
		selectedPhotoWrapper = null;
		selectedBox = null;
		this.selectedMode = null;
		this.currentFrame = null;
		this.currentPhoto = null;
		this.currentElement = null;
	}

	applySafeLineConstraints(newLeft, newTop, frameGroup) {
		// 캐시가 없으면 계산
		if (!this.safeConstraintsCache) {
			const bg = $('#page-preview-img');
			const bgPos = bg.position();
			const bgWidth = bg.width();
			const bgHeight = bg.height();

			const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * bgWidth;
			const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * bgHeight;

			this.safeConstraintsCache = {
				safeLeft: bgPos.left + safeMarginX,
				safeTop: bgPos.top + safeMarginY,
				safeRight: bgPos.left + bgWidth - safeMarginX,
				safeBottom: bgPos.top + bgHeight - safeMarginY
			};
		}

		const cache = this.safeConstraintsCache;
		const frameW = frameGroup.outerWidth();
		const frameH = frameGroup.outerHeight();

		return {
			left: Math.max(cache.safeLeft, Math.min(newLeft, cache.safeRight - frameW)),
			top: Math.max(cache.safeTop, Math.min(newTop, cache.safeBottom - frameH))
		};
	}

	selectElement(elementGroup) {
		this.clearSelection();

		this.selectedMode = 'element';
		this.currentElement = elementGroup;
		this.currentFrame = elementGroup;
		this.currentElement = elementGroup;

		// Element는 빨간색 점선 테두리
		elementGroup.addClass('selected-frame selected-element').css('border', '1px dashed #ff0000');

		// 회전 핸들 추가
		FrameManager.addRotationHandle(elementGroup);

		// 크기 조절 핸들 추가
		this.addElementResizeHandles(elementGroup);

		// Element 툴팁 표시
		UIManager.showElementTooltip(elementGroup);
	}

	addElementResizeHandles(elementGroup) {
		// 기존 핸들 제거
		$('.element-resize-handle').remove();

		// 4개 모서리에 리사이즈 핸들 추가
		const handles = ['nw', 'ne', 'sw', 'se'];

		handles.forEach(position => {
			const handle = $('<div class="element-resize-handle"></div>')
				.addClass(`handle-${position}`)
				.css({
					position: 'absolute',
					width: '8px',
					height: '8px',
					backgroundColor: '#ff0000',
					border: '1px solid #000',
					cursor: `${position}-resize`,
					zIndex: 30
				});

			// 위치 설정
			switch (position) {
				case 'nw': handle.css({ top: '-4px', left: '-4px' }); break;
				case 'ne': handle.css({ top: '-4px', right: '-4px' }); break;
				case 'sw': handle.css({ bottom: '-4px', left: '-4px' }); break;
				case 'se': handle.css({ bottom: '-4px', right: '-4px' }); break;
			}

			elementGroup.append(handle);

			// 리사이즈 이벤트 바인딩
			this.makeElementResizable(elementGroup, handle, position);
		});
	}

	makeElementResizable(elementGroup, handle, position) {
		handle.on('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();

			const startX = e.clientX;
			const startY = e.clientY;
			const startWidth = elementGroup.width();
			const startHeight = elementGroup.height();
			const startLeft = parseFloat(elementGroup.css('left'));
			const startTop = parseFloat(elementGroup.css('top'));
			const aspectRatio = startWidth / startHeight;

			$(document).on('mousemove.elementResize', (ev) => {
				let newWidth = startWidth;
				let newHeight = startHeight;
				let newLeft = startLeft;
				let newTop = startTop;

				const deltaX = ev.clientX - startX;
				const deltaY = ev.clientY - startY;

				switch (position) {
					case 'se':
						newWidth = startWidth + deltaX;
						newHeight = newWidth / aspectRatio;
						break;
					case 'sw':
						newWidth = startWidth - deltaX;
						newHeight = newWidth / aspectRatio;
						newLeft = startLeft + deltaX;
						break;
					case 'ne':
						newHeight = startHeight - deltaY;
						newWidth = newHeight * aspectRatio;
						newTop = startTop + deltaY;
						break;
					case 'nw':
						newWidth = startWidth - deltaX;
						newHeight = newWidth / aspectRatio;
						newLeft = startLeft + deltaX;
						newTop = startTop + (startHeight - newHeight);
						break;
				}

				// 최소 크기 제한
				if (newWidth < 30 || newHeight < 30) return;

				elementGroup.css({
					width: `${newWidth}px`,
					height: `${newHeight}px`,
					left: `${newLeft}px`,
					top: `${newTop}px`
				});
			});

			$(document).on('mouseup.elementResize', () => {
				$(document).off('mousemove.elementResize mouseup.elementResize');
			});
		});
	}
}