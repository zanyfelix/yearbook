// SafeLineManager.js - 안전선 관리 클래스
class SafeLineManager {
    constructor() {
        this.actualWidth = 221.9;
        this.actualHeight = 285.4;
        // 사용자별 safeMargin 설정 (edit.jsp에서 hidden input으로 전달)
        const userMargin = parseInt($('#userSafeMargin').val());
        this.safeMargin = (userMargin === 3 || userMargin === 6) ? userMargin : 3;
        this.container = null;
        this.resizeTimeout = null;
        this.windowResizeTimeout = null;
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
        if (!img) return;
        
        // 이미지 로드 이벤트 - 여러 번 시도
        $(img).on('load', () => {
            setTimeout(() => this.update(), 100);
            setTimeout(() => this.update(), 300); // 추가 재시도
        });
        
        // ResizeObserver 설정
        if (window.ResizeObserver) {
            this.setupResizeObserver(img);
        }
        
        // 윈도우 리사이즈 이벤트
        $(window).on('resize.safeline', () => {
            clearTimeout(this.windowResizeTimeout);
            this.windowResizeTimeout = setTimeout(() => {
                if ($('#editModal').is(':visible')) {
                    this.update();
                }
            }, 150);
        });
        
        // MutationObserver 설정
        if (window.MutationObserver) {
            this.setupMutationObserver(img);
        }
    }
    
    setupResizeObserver(img) {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        this.resizeObserver = new ResizeObserver(() => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.update(), 100);
        });
        this.resizeObserver.observe(img);
    }
    
    setupMutationObserver(img) {
        if (this.srcObserver) {
            this.srcObserver.disconnect();
        }
        
        this.srcObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    setTimeout(() => this.update(), 200);
                }
            });
        });
        
        this.srcObserver.observe(img, { 
            attributes: true, 
            attributeFilter: ['src'] 
        });
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
        
        // 이미지 로드 대기 로직 강화
        if (!imgElement.complete || !imgElement.naturalWidth || imgElement.naturalWidth === 0) {
            this.container.hide();
            
            // 기존 로드 이벤트 제거
            img.off('load.safeline error.safeline');
            
            // 로드 완료 시 재시도
            img.one('load.safeline', () => {
                setTimeout(() => this.update(), 150);
            });
            
            // 에러 처리
            img.one('error.safeline', () => {
                console.error('Image load failed:', src);
                this.container.hide();
            });
            
            return;
        }

        const imgPosition = this.getActualImagePosition(img);
        if (!imgPosition || imgPosition.width === 0 || imgPosition.height === 0) {
            this.container.hide();
            // 짧은 시간 후 재시도
            setTimeout(() => {
                const retry = this.getActualImagePosition(img);
                if (retry && retry.width > 0) {
                    this.update();
                }
            }, 100);
            return;
        }

        this.container.show();
        
        const marginX = (this.safeMargin / this.actualWidth) * imgPosition.width;
        const marginY = (this.safeMargin / this.actualHeight) * imgPosition.height;

        this.drawHatchedSafeAreas(imgPosition, marginX, marginY);
        this.updateMessagePosition(imgPosition);
        this.clearSelectionCache();
    }
    
    drawHatchedSafeAreas(imgPosition, marginX, marginY) {
        this.container.empty();
        const { left, top, width, height } = imgPosition;
        
        const areas = [
            { left, top, width, height: marginY }, // 상단
            { left, top: top + height - marginY, width, height: marginY }, // 하단
            { left, top: top + marginY, width: marginX, height: height - (marginY * 2) }, // 좌측
            { left: left + width - marginX, top: top + marginY, width: marginX, height: height - (marginY * 2) } // 우측
        ];
        
        areas.forEach(area => {
            if (area.width > 0 && area.height > 0) {
                const safeDiv = $('<div class="safe-area-hatched"></div>').css({
                    position: 'absolute',
                    left: `${area.left}px`,
                    top: `${area.top}px`,
                    width: `${area.width}px`,
                    height: `${area.height}px`
                });
                this.container.append(safeDiv);
            }
        });
    }
    
    updateMessagePosition(imgPosition) {
        const $message = $('#save-confirmation-message');
        if ($message.length > 0 && $message.is(':visible')) {
            $message.css({
                top: `${imgPosition.top + imgPosition.height}px`,
                left: `${imgPosition.left}px`
            });
        }
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
            // 가로가 꽉 참
            actualWidth = containerWidth;
            actualHeight = containerWidth / naturalRatio;
            offsetX = 0;
            offsetY = (containerHeight - actualHeight) / 2;
        } else {
            // 세로가 꽉 참
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
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.srcObserver) {
            this.srcObserver.disconnect();
        }
        $(window).off('resize.safeline');
        clearTimeout(this.resizeTimeout);
        clearTimeout(this.windowResizeTimeout);
        if (this.container) {
            this.container.remove();
        }
    }
}