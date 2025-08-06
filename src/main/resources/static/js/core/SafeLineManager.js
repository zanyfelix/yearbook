// ============================================================================
// 📁 js/core/SafeLineManager.js - 빗금 패턴 SafeLine
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
        
        $('#page-preview').append(this.container);
    }
    
    watchChanges() {
        const img = $('#page-preview-img')[0];
        
        // 이미지 로드 이벤트
        $(img).on('load', () => {
            setTimeout(() => this.update(), 150);
        });
        
        // ResizeObserver로 이미지 크기 변화 감지
        if (window.ResizeObserver) {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        this.update();
                    }, 100);
                }
            });
            this.resizeObserver.observe(img);
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
        
        // 이미지 src 변경 감지
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
        if (!this.container) return;

        const img = $('#page-preview-img');
        const src = img.attr('src');

        // 배경 이미지가 없는 경우 숨김
        if (!src || src.includes('data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=')) {
            this.container.hide();
            this.clearSelectionCache();
            return;
        }

        // 실제 렌더링된 이미지 크기 정확히 계산
        const imgElement = img[0];
        const imgWidth = img.width();
        const imgHeight = img.height();
        
        if (imgWidth === 0 || imgHeight === 0 || !imgElement.complete) {
            this.container.hide();
            return;
        }

        // 이미지의 실제 위치 계산
        const imgPosition = this.getActualImagePosition(img);
        if (!imgPosition) {
            this.container.hide();
            return;
        }

        // 안전선 표시
        this.container.show();
        
        // 실제 이미지 크기 기준으로 안전 마진 계산
        const actualImgWidth = imgPosition.width;
        const actualImgHeight = imgPosition.height;
        
        const marginX = (this.safeMargin / this.actualWidth) * actualImgWidth;
        const marginY = (this.safeMargin / this.actualHeight) * actualImgHeight;

        // ✨ 빗금 패턴으로 안전선 영역 그리기
        this.drawHatchedSafeAreas(imgPosition, marginX, marginY);
		
		const $message = $('#save-confirmation-message');
		if ($message.length > 0) {
			// 이미지 실제 위치의 하단에서 5px 아래에 위치하도록 top 설정
			const newTop = imgPosition.top + imgPosition.height;
			// 이미지 실제 위치의 수평 중앙에 위치하도록 left 설정
			const newLeft = imgPosition.left;

			$message.css({
				top: `${newTop}px`,
				left: `${newLeft}px`
			});
		}

        // SelectionManager의 캐시 무효화
        this.clearSelectionCache();
        
        // 기존 프레임들 위치 조정
        setTimeout(() => this.adjustFrames(), 50);
    }
    
    // ✨ 빗금 패턴 안전선 영역 그리기
    drawHatchedSafeAreas(imgPosition, marginX, marginY) {
        // 기존 안전선 영역 제거
        this.container.empty();
        
        const { left, top, width, height } = imgPosition;
        
        // 4개 영역 정의 (상, 하, 좌, 우)
        const areas = [
            // 상단
            { 
                left: left, 
                top: top, 
                width: width, 
                height: marginY,
                className: 'safe-area-top'
            },
            // 하단
            { 
                left: left, 
                top: top + height - marginY, 
                width: width, 
                height: marginY,
                className: 'safe-area-bottom'
            },
            // 좌측 (상하 마진 제외)
            { 
                left: left, 
                top: top + marginY, 
                width: marginX, 
                height: height - (marginY * 2),
                className: 'safe-area-left'
            },
            // 우측 (상하 마진 제외)
            { 
                left: left + width - marginX, 
                top: top + marginY, 
                width: marginX, 
                height: height - (marginY * 2),
                className: 'safe-area-right'
            }
        ];
        
        // 각 안전선 영역을 빗금 패턴으로 생성
        areas.forEach(area => {
            if (area.width > 0 && area.height > 0) {
                const safeDiv = $(`<div class="safe-area-hatched ${area.className}"></div>`).css({
                    position: 'absolute',
                    left: `${area.left}px`,
                    top: `${area.top}px`,
                    width: `${area.width}px`,
                    height: `${area.height}px`,
                    pointerEvents: 'none',
                    opacity: 0.8
                });
                
                this.container.append(safeDiv);
            }
        });
    }
    
    // object-fit: contain이 적용된 이미지의 실제 위치와 크기 계산
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
    
    // SelectionManager에서 사용하는 제약조건 정보
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