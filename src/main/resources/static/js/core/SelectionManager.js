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
	    
	    frameGroup.addClass('selected-frame').css('border', '2px dashed #ff0000');
	    FrameManager.addRotationHandle(frameGroup);
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

    clearSelection() {
		$('.frame-group').removeClass('selected-frame').css({
			'border': '2px solid transparent',  // 'none' 대신 transparent로 변경
			'box-shadow': 'none'
		});

		// 사진 선택 해제
		$('.uploaded-photo').removeClass('selected-photo').css({
			'border': 'none',
			'box-shadow': 'none'
		});

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
}