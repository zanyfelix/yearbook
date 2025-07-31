// ============================================================================
// 📁 js/core/SafeLineManager.js
// ============================================================================
class SafeLineManager {
    constructor() {
        this.actualWidth = 221.9;
        this.actualHeight = 285.4;
        this.safeMargin = 3;
        this.container = null;
        this.init();
    }
    
    init() {
        this.createContainer();
        this.watchChanges();
    }
    
    createContainer() {
        $('#safe-line-overlay').remove();
        this.container = $('<div id="safe-line-overlay"></div>').css({
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 5
        });
        $('#page-preview').append(this.container);
    }
    
    watchChanges() {
        const img = $('#page-preview-img')[0];
        $(img).on('load', () => setTimeout(() => this.update(), 100));
        
        if (window.ResizeObserver) {
            new ResizeObserver(() => this.update()).observe(img);
        }
        
        $(window).on('resize', () => setTimeout(() => this.update(), 100));
    }
    
    update() {
		if (!this.container) return;

		const img = $('#page-preview-img');
		const src = img.attr('src');

		if (!src || src.includes('placeholder.png')) {
			this.container.empty();
			return;
		}

		const width = img.width();
		const height = img.height();
		if (width === 0 || height === 0) return;

		const marginX = (this.safeMargin / this.actualWidth) * width;
		const marginY = (this.safeMargin / this.actualHeight) * height;
		const offset = img.position();

		// SelectionManager의 캐시 무효화
		if (window.selectionManager) {
			window.selectionManager.safeConstraintsCache = null;
		}

		this.drawSafeLines(offset, width, height, marginX, marginY);
		setTimeout(() => this.adjustFrames(), 50);
    }
    
    drawSafeLines(offset, width, height, marginX, marginY) {
        this.container.empty();
        
        const areas = [
            { left: offset.left, top: offset.top, width: width, height: marginY },
            { left: offset.left, top: offset.top + height - marginY, width: width, height: marginY },
            { left: offset.left, top: offset.top + marginY, width: marginX, height: height - (marginY * 2) },
            { left: offset.left + width - marginX, top: offset.top + marginY, width: marginX, height: height - (marginY * 2) }
        ];
        
        areas.forEach(area => {
            if (area.width > 0 && area.height > 0) {
                const zone = $('<div class="safe-zone"></div>').css({
                    position: 'absolute',
                    left: `${area.left}px`, top: `${area.top}px`,
                    width: `${area.width}px`, height: `${area.height}px`,
                    backgroundColor: 'rgba(255, 107, 107, 0.3)',
                    border: '1px solid rgba(255, 107, 107, 0.6)'
                });
                this.container.append(zone);
            }
        });
    }
    
    adjustFrames() {
        $('.frame-group').each((i, el) => {
            const frame = $(el);
            const currentLeft = parseFloat(frame.css('left')) || 0;
            const currentTop = parseFloat(frame.css('top')) || 0;
            
            const constrained = window.selectionManager.applySafeLineConstraints(currentLeft, currentTop, frame);
            
            if (constrained.left !== currentLeft || constrained.top !== currentTop) {
                frame.css({
                    left: `${constrained.left}px`,
                    top: `${constrained.top}px`
                });
            }
        });
    }
}