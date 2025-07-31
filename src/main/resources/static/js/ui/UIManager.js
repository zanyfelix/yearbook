// ============================================================================
// 📁 js/ui/UIManager.js
// ============================================================================
class UIManager {
    static showFrameTooltip(frameGroup) {
        const tooltip = $('#frame-controls-tooltip');
        const frameRect = frameGroup[0].getBoundingClientRect();
        const previewRect = $('#page-preview')[0].getBoundingClientRect();
        
        const left = frameRect.left - previewRect.left + frameRect.width + 10;
        const top = frameRect.top - previewRect.top - tooltip.outerHeight() - 10;
        
        tooltip.removeClass('d-none').css({ left: `${left}px`, top: `${top}px` });
		
		// 프레임 회전 이벤트 바인딩
		this.bindFrameRotationEvents(frameGroup);
    }
	
	static bindFrameRotationEvents(frameGroup) {
	    // 현재 회전 각도 가져오기
	    function getCurrentRotation() {
	        const currentTransform = frameGroup.css('transform');
	        
	        if (!currentTransform || currentTransform === 'none') {
	            return 0;
	        }
	        
	        // rotate(Xdeg) 형태 파싱
	        const rotateMatch = currentTransform.match(/rotate\(([-+]?\d*\.?\d+)(deg|rad)?\)/i);
	        if (rotateMatch && rotateMatch[1]) {
	            let angle = parseFloat(rotateMatch[1]);
	            if (rotateMatch[2] === 'rad') {
	                angle = angle * (180 / Math.PI);
	            }
	            const normalizedAngle = (angle % 360 + 360) % 360;
	            return Math.round(normalizedAngle);
	        }
	        
	        // matrix() 형태 파싱
	        const matrixMatch = currentTransform.match(/matrix\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)/);
	        if (matrixMatch) {
	            const a = parseFloat(matrixMatch[1]);
	            const b = parseFloat(matrixMatch[2]);
	            const angleRad = Math.atan2(b, a);
	            const angleDeg = angleRad * (180 / Math.PI);
	            const normalizedAngle = (angleDeg % 360 + 360) % 360;
	            return Math.round(normalizedAngle);
	        }
	        
	        return 0;
	    }
	    
	    // 각도 스냅 함수 (반시계방향)
	    function snapAngleLeft(angle) {
	        if (angle >= 1 && angle <= 89) {
	            return 0;
	        } else if (angle >= 91 && angle <= 179) {
	            return 90;
	        } else if (angle >= 181 && angle <= 269) {
	            return 180;
	        } else if (angle >= 271 && angle <= 359) {
	            return 270;
	        }
	        // 정확한 각도 (0, 90, 180, 270)에서 반시계방향으로 90도씩 회전
	        if (angle === 0) return 270;
	        if (angle === 90) return 0;
	        if (angle === 180) return 90;
	        if (angle === 270) return 180;
	        
	        return angle;
	    }
	    
	    // 각도 스냅 함수 (시계방향)
	    function snapAngleRight(angle) {
	        if (angle >= 1 && angle <= 89) {
	            return 90;
	        } else if (angle >= 91 && angle <= 179) {
	            return 180;
	        } else if (angle >= 181 && angle <= 269) {
	            return 270;
	        } else if (angle >= 271 && angle <= 359) {
	            return 0;
	        }
	        // 정확한 각도 (0, 90, 180, 270)에서 시계방향으로 90도씩 회전
	        if (angle === 0) return 90;
	        if (angle === 90) return 180;
	        if (angle === 180) return 270;
	        if (angle === 270) return 0;
	        
	        return angle;
	    }
	    
	    // 반시계방향 회전 (frame-rotate1)
	    $('#frame-rotate-left').off('click').on('click', function() {
	        const currentRotation = getCurrentRotation();
	        const newRotation = snapAngleLeft(currentRotation);
	        
	        frameGroup.css('transform', `rotate(${newRotation}deg)`);
	        console.log(`프레임 반시계방향 회전: ${currentRotation}° → ${newRotation}°`);
	    });
	    
	    // 시계방향 회전 (frame-rotate2)
	    $('#frame-rotate-right').off('click').on('click', function() {
	        const currentRotation = getCurrentRotation();
	        const newRotation = snapAngleRight(currentRotation);
	        
	        frameGroup.css('transform', `rotate(${newRotation}deg)`);
	        console.log(`프레임 시계방향 회전: ${currentRotation}° → ${newRotation}°`);
	    });
	    
	    // 프레임 삭제 버튼
	    $('#btn-delete-frame').off('click').on('click', function() {
	        if (confirm("프레임을 삭제하시겠습니까?")) {
	            frameGroup.remove();
	            window.selectionManager.clearSelection();
	        }
	    });
	}

    static showPhotoTooltip(photo, frameGroup) {
        const tooltip = $('#photo-controls-tooltip');
        const frameRect = frameGroup[0].getBoundingClientRect();
        const previewRect = $('#page-preview')[0].getBoundingClientRect();
        
        const left = frameRect.left - previewRect.left + frameRect.width + 10;
        const top = frameRect.top - previewRect.top - tooltip.outerHeight() - 10;
        
        tooltip.removeClass('d-none').css({ left: `${left}px`, top: `${top}px` });
        
        tooltip.html(`
            <div style="display: flex; align-items: center; gap: 5px;">
                <img src="/images/icon/transform.png" id="photo-rotate1" style="width: 30px; height: 30px; cursor: pointer; transform: scaleX(-1);">
                <img src="/images/icon/transform.png" id="photo-rotate2" style="width: 30px; height: 30px; cursor: pointer;">
                <button id="btn-delete-photo" class="btn btn-danger btn-sm">X</button>
            </div>
        `);
        
        this.bindPhotoTooltipEvents(photo, frameGroup);
    }
    
    static bindPhotoTooltipEvents(photo, frameGroup) {
        $('#photo-rotate1').on('click', () => PhotoManager.rotate(photo, -90));
        $('#photo-rotate2').on('click', () => PhotoManager.rotate(photo, 90));
        
        $('#btn-delete-photo').on('click', () => {
            if (confirm("사진을 삭제하시겠습니까?")) {
                const placeholderLink = frameGroup.find('.place-image-here-link');
                photo.hide().attr('src', '');
                placeholderLink.show();
                window.selectionManager.clearSelection();
            }
        });
    }
}