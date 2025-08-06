// ============================================================================
// 📁 js/core/SafeLineManager.js (역할 분리 및 오류 수정)
// ============================================================================
class SafeLineManager {
    constructor() {
        this.actualWidth = 221.9;
        this.actualHeight = 285.4;
        this.safeMargin = 3;
        this.container = null;
        this.safeAreas = [];
        this.resizeObserver = null;
        this.init();
    }
    
    init() {
        this.createContainer();
        this.watchChanges();
    }
    
    createContainer() {
        $('#safe-line-overlay').remove();
        this.container = $('<div id="safe-line-overlay"></div>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5
        });
        $('#page-preview').append(this.container);
    }
    
    watchChanges() {
        const img = $('#page-preview-img')[0];
        
        $(img).on('load', () => {
            setTimeout(() => this.update(), 150);
        });
        
        if (window.ResizeObserver) {
            if (this.resizeObserver) this.resizeObserver.disconnect();
            this.resizeObserver = new ResizeObserver(() => {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => this.update(), 100);
            });
            this.resizeObserver.observe(img);
        }
        
        $(window).on('resize.safeline', () => {
            clearTimeout(this.windowResizeTimeout);
            this.windowResizeTimeout = setTimeout(() => {
                if ($('#editModal').is(':visible')) this.update();
            }, 150);
        });
        
        if (window.MutationObserver) {
            if (this.srcObserver) this.srcObserver.disconnect();
            this.srcObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        setTimeout(() => this.update(), 200);
                    }
                });
            });
            this.srcObserver.observe(img, { attributes: true, attributeFilter: ['src'] });
        }
    }
    
    update() {
        if (!this.container) return;

        const img = $('#page-preview-img');
        const src = img.attr('src');

        if (!src || src.includes('data:image/gif;base64')) {
            this.container.hide();
            this.clearSelectionCache();
            return;
        }

        const imgElement = img[0];
        if (img.width() === 0 || img.height() === 0 || !imgElement.complete) {
            this.container.hide();
            return;
        }

        const imgPosition = this.getActualImagePosition(img);
        if (!imgPosition) {
            this.container.hide();
            return;
        }

        this.container.show();
        
        const marginX = (this.safeMargin / this.actualWidth) * imgPosition.width;
        const marginY = (this.safeMargin / this.actualHeight) * imgPosition.height;

        this.drawHatchedSafeAreas(imgPosition, marginX, marginY);
		
		const $message = $('#save-confirmation-message');
		if ($message.length > 0 && $message.is(':visible')) {
			const newTop = imgPosition.top + imgPosition.height;
			const newLeft = imgPosition.left;
			$message.css({ top: `${newTop}px`, left: `${newLeft}px` });
		}
		
        this.clearSelectionCache();
        
        // ✨ --- 핵심 수정 --- ✨
        // 이 파일의 역할은 안전선 계산 및 그리기로 한정합니다.
        // 다른 요소들의 위치를 재조정하는 코드를 제거하여, 불필요한 이동 현상을 방지합니다.
        // 모든 요소의 위치 업데이트는 main.js의 resize 이벤트 핸들러가 전담합니다.
    }
    
    drawHatchedSafeAreas(imgPosition, marginX, marginY) {
        this.container.empty();
        const { left, top, width, height } = imgPosition;
        const areas = [
            { left: left, top: top, width: width, height: marginY },
            { left: left, top: top + height - marginY, width: width, height: marginY },
            { left: left, top: top + marginY, width: marginX, height: height - (marginY * 2) },
            { left: left + width - marginX, top: top + marginY, width: marginX, height: height - (marginY * 2) }
        ];
        areas.forEach(area => {
            if (area.width > 0 && area.height > 0) {
                const safeDiv = $(`<div class="safe-area-hatched"></div>`).css({
                    position: 'absolute', left: `${area.left}px`, top: `${area.top}px`,
                    width: `${area.width}px`, height: `${area.height}px`
                });
                this.container.append(safeDiv);
            }
        });
    }
    
    getActualImagePosition($imgElement) {
        const img = $imgElement[0];
        const containerWidth = $imgElement.width();
        const containerHeight = $imgElement.height();
        const containerPosition = $imgElement.position();
        if (!img.naturalWidth || !img.naturalHeight) return null;
        
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = containerWidth / containerHeight;
        
        let actualWidth, actualHeight, offsetX, offsetY;
        
        if (naturalRatio > containerRatio) {
            actualWidth = containerWidth;
            actualHeight = containerWidth / naturalRatio;
            offsetX = 0;
            offsetY = (containerHeight - actualHeight) / 2;
        } else {
            actualWidth = containerHeight * naturalRatio;
            actualHeight = containerHeight;
            offsetX = (containerWidth - actualWidth) / 2;
            offsetY = 0;
        }
        
        return {
            left: containerPosition.left + offsetX,
            top: containerPosition.top + offsetY,
            width: actualWidth,
            height: actualHeight
        };
    }
    
    clearSelectionCache() {
        if (window.selectionManager) {
            window.selectionManager.safeConstraintsCache = null;
        }
    }
    
    destroy() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.srcObserver) this.srcObserver.disconnect();
        $(window).off('resize.safeline');
        clearTimeout(this.resizeTimeout);
        clearTimeout(this.windowResizeTimeout);
        if (this.container) this.container.remove();
    }
}