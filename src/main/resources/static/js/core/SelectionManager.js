// ============================================================================
// 📁 js/core/SelectionManager.js
// ============================================================================
class SelectionManager {
    constructor() {
        this.selectedMode = null;
        this.currentFrame = null;
        this.currentPhoto = null;
        this.photoOverlay = null;
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
        
        photo.addClass('selected-photo').css({
            'border': '2px solid #FFA500',
            'box-shadow': '0 0 0 2px rgba(255, 165, 0, 0.8)'
        });
        
        PhotoManager.addHandles(photo);
        UIManager.showPhotoTooltip(photo, frameGroup);
        PhotoManager.showOverlay(photo, frameGroup);
    }

    clearSelection() {
        $('.frame-group').removeClass('selected-frame').css({
            'border': 'none', 'box-shadow': 'none'
        });
        $('.uploaded-photo').removeClass('selected-photo').css({
            'border': 'none', 'box-shadow': 'none'
        });
        
        $('.selection-handle, .rotate-handle').remove();
        $('#frame-controls-tooltip, #photo-controls-tooltip, #text-tooltip').addClass('d-none');
        
        PhotoManager.hideOverlay();
        
        selectedFrame = null;
        selectedPhotoWrapper = null;
        selectedBox = null;
        this.selectedMode = null;
        this.currentFrame = null;
        this.currentPhoto = null;
    }

    applySafeLineConstraints(newLeft, newTop, frameGroup) {
        const bg = $('#page-preview-img');
        const bgPos = bg.position();
        const bgWidth = bg.width();
        const bgHeight = bg.height();
        
        const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * bgWidth;
        const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * bgHeight;
        
        const safeLeft = bgPos.left + safeMarginX;
        const safeTop = bgPos.top + safeMarginY;
        const safeRight = bgPos.left + bgWidth - safeMarginX;
        const safeBottom = bgPos.top + bgHeight - safeMarginY;
        
        const frameW = frameGroup.outerWidth();
        const frameH = frameGroup.outerHeight();
        
        return {
            left: Math.max(safeLeft, Math.min(newLeft, safeRight - frameW)),
            top: Math.max(safeTop, Math.min(newTop, safeBottom - frameH))
        };
    }
}