// ============================================================================
// 📁 js/core/SafeLineManager.js - 반응형 배경 이미지 대응
// ============================================================================
class SafeLineManager {
    constructor() {
        this.actualWidth = 221.9;
        this.actualHeight = 285.4;
        this.safeMargin = 3;
        this.container = null;
        this.safeLineBox = null;
        this.resizeObserver = null;
        this.init();
    }
    
    init() {
        this.createContainer();
        this.watchChanges();
    }
    
    createContainer() {
        // 기존 컨테이너 제거
        $('#safe-line-overlay').remove();
        
        // 메인 오버레이 컨테이너
        this.container = $('<div id="safe-line-overlay"></div>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5
        });
        
        // 안전선 박스 (단일 div)
        this.safeLineBox = $('<div class="safe-line-box"></div>').css({
            position: 'absolute',
            border: '2px dashed rgba(255, 107, 107, 0.8)',
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            boxSizing: 'border-box'
        });
        
        // 안전선 텍스트
        const safeText = $('<div class="safe-line-text">Safe Area</div>').css({
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 107, 107, 0.9)',
            fontSize: '10px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
            userSelect: 'none',
            fontFamily: '"Segoe UI", sans-serif',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
        });
        
        this.safeLineBox.append(safeText);
        this.container.append(this.safeLineBox);
        $('#page-preview').append(this.container);
    }
    
    watchChanges() {
        const img = $('#page-preview-img')[0];
        
        // 이미지 로드 이벤트
        $(img).on('load', () => {
            // 이미지 로드 후 약간의 지연을 두고 업데이트 (레이아웃 안정화 대기)
            setTimeout(() => this.update(), 150);
        });
        
        // ResizeObserver로 이미지 크기 변화 감지 (반응형 대응)
        if (window.ResizeObserver) {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    // 디바운스 적용하여 과도한 호출 방지
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        this.update();
                    }, 100);
                }
            });
            this.resizeObserver.observe(img);
        }
        
        // 윈도우 리사이즈 이벤트 (모달 크기 변경 등에 대응)
        $(window).on('resize.safeline', () => {
            clearTimeout(this.windowResizeTimeout);
            this.windowResizeTimeout = setTimeout(() => {
                if ($('#editModal').is(':visible')) {
                    this.update();
                }
            }, 150);
        });
        
        // 이미지 src 변경 감지 (MutationObserver)
        this.watchImageSrcChanges(img);
    }
    
    watchImageSrcChanges(img) {
        if (window.MutationObserver) {
            if (this.srcObserver) {
                this.srcObserver.disconnect();
            }
            
            this.srcObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        // src 변경 시 이미지 로드 완료까지 기다린 후 업데이트
                        setTimeout(() => this.update(), 200);
                    }
                });
            });
            
            this.srcObserver.observe(img, {
                attributes: true,
                attributeFilter: ['src']
            });
        }
    }
    
    update() {
        if (!this.container || !this.safeLineBox) return;

        const img = $('#page-preview-img');
        const src = img.attr('src');

        // 배경 이미지가 없는 경우 숨김
        if (!src || src.includes('data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=')) {
            this.container.hide();
            this.clearSelectionCache();
            return;
        }

        // ✨ 실제 렌더링된 이미지 크기 정확히 계산
        const imgElement = img[0];
        const imgWidth = img.width();
        const imgHeight = img.height();
        
        // 이미지가 아직 로드되지 않았거나 크기가 0인 경우 대기
        if (imgWidth === 0 || imgHeight === 0 || !imgElement.complete) {
            this.container.hide();
            return;
        }

        // ✨ 이미지의 실제 위치 계산 (object-fit: contain 고려)
        const imgPosition = this.getActualImagePosition(img);
        if (!imgPosition) {
            this.container.hide();
            return;
        }

        // 안전선 표시
        this.container.show();
        
        // ✨ 실제 이미지 크기 기준으로 안전 마진 계산
        const actualImgWidth = imgPosition.width;
        const actualImgHeight = imgPosition.height;
        
        const marginX = (this.safeMargin / this.actualWidth) * actualImgWidth;
        const marginY = (this.safeMargin / this.actualHeight) * actualImgHeight;

        // 안전 영역 박스를 실제 이미지 안쪽에 위치시킴
        this.safeLineBox.css({
            left: `${imgPosition.left + marginX}px`,
            top: `${imgPosition.top + marginY}px`,
            width: `${actualImgWidth - (marginX * 2)}px`,
            height: `${actualImgHeight - (marginY * 2)}px`
        });
        
        // 텍스트 크기를 이미지 크기에 비례하여 조정
        const textSize = Math.max(8, Math.min(14, actualImgWidth * 0.02));
        this.safeLineBox.find('.safe-line-text').css({
            fontSize: textSize + 'px',
            display: marginY > 8 ? 'block' : 'none'
        });

        // SelectionManager의 캐시 무효화
        this.clearSelectionCache();
        
        // 기존 프레임들 위치 조정
        setTimeout(() => this.adjustFrames(), 50);
    }
    
    // ✨ object-fit: contain이 적용된 이미지의 실제 위치와 크기 계산
    getActualImagePosition($imgElement) {
        const img = $imgElement[0];
        const containerWidth = $imgElement.width();
        const containerHeight = $imgElement.height();
        const containerPosition = $imgElement.position();
        
        if (!img.naturalWidth || !img.naturalHeight) {
            return null;
        }
        
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = containerWidth / containerHeight;
        
        let actualWidth, actualHeight, offsetX, offsetY;
        
        if (naturalRatio > containerRatio) {
            // 이미지가 더 넓음 - 가로를 기준으로 맞춤
            actualWidth = containerWidth;
            actualHeight = containerWidth / naturalRatio;
            offsetX = 0;
            offsetY = (containerHeight - actualHeight) / 2;
        } else {
            // 이미지가 더 높음 - 세로를 기준으로 맞춤
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
    
    adjustFrames() {
        $('.frame-group, .text-box').each((i, el) => {
            const $element = $(el);
            const currentLeft = parseFloat($element.css('left')) || 0;
            const currentTop = parseFloat($element.css('top')) || 0;
            
            if (window.selectionManager) {
                const constrained = window.selectionManager.applySafeLineConstraints(currentLeft, currentTop, $element);
                
                if (constrained.left !== currentLeft || constrained.top !== currentTop) {
                    $element.css({
                        left: `${constrained.left}px`,
                        top: `${constrained.top}px`
                    });
                }
            }
        });
    }
    
    // ✨ SelectionManager에서 사용하는 제약조건 정보 (실제 이미지 위치 기반)
    getSafeConstraints() {
        const img = $('#page-preview-img');
        const imgPosition = this.getActualImagePosition(img);
        
        if (!imgPosition) {
            return null;
        }
        
        const marginX = (this.safeMargin / this.actualWidth) * imgPosition.width;
        const marginY = (this.safeMargin / this.actualHeight) * imgPosition.height;
        
        return {
            safeLeft: imgPosition.left + marginX,
            safeTop: imgPosition.top + marginY,
            safeRight: imgPosition.left + imgPosition.width - marginX,
            safeBottom: imgPosition.top + imgPosition.height - marginY,
            imageLeft: imgPosition.left,
            imageTop: imgPosition.top,
            imageWidth: imgPosition.width,
            imageHeight: imgPosition.height,
            marginX: marginX,
            marginY: marginY
        };
    }
    
    // 정리 함수
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