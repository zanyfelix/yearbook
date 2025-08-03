// ============================================================================
// 📁 js/ui/UIManager.js
// ============================================================================
class UIManager {
	
	static hideAllToolbars() {
	    $('#editor-toolbar > div').addClass('d-none');
	}
	
    static showFrameTooltip(frameGroup) {
		this.hideAllToolbars();
		$('#frame-controls').removeClass('d-none');
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
	    });
	    
	    // 시계방향 회전 (frame-rotate2)
	    $('#frame-rotate-right').off('click').on('click', function() {
	        const currentRotation = getCurrentRotation();
	        const newRotation = snapAngleRight(currentRotation);
	        
	        frameGroup.css('transform', `rotate(${newRotation}deg)`);
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
		this.hideAllToolbars();
		$('#photo-controls').removeClass('d-none');
		this.bindPhotoTooltipEvents(photo, frameGroup);
    }
	
	static bindPhotoRotationEvents(photo) {
		// 현재 회전 각도 가져오기
		function getCurrentRotation() {
			const currentTransform = photo.css('transform'); // frameGroup -> photo

			if (!currentTransform || currentTransform === 'none') return 0;

			const rotateMatch = currentTransform.match(/rotate\(([-+]?\d*\.?\d+)(deg|rad)?\)/i);
			if (rotateMatch && rotateMatch[1]) {
				let angle = parseFloat(rotateMatch[1]);
				if (rotateMatch[2] === 'rad') angle = angle * (180 / Math.PI);
				return Math.round((angle % 360 + 360) % 360);
			}

			const matrixMatch = currentTransform.match(/matrix\(([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+),\s*([-+]?\d*\.?\d+)\)/);
			if (matrixMatch) {
				const a = parseFloat(matrixMatch[1]);
				const b = parseFloat(matrixMatch[2]);
				const angleRad = Math.atan2(b, a);
				const angleDeg = angleRad * (180 / Math.PI);
				return Math.round((angleDeg % 360 + 360) % 360);
			}

			return 0;
		}

		// 각도 스냅 함수 (반시계방향)
		function snapAngleLeft(angle) {
			if (angle >= 1 && angle <= 89) return 0;
			if (angle >= 91 && angle <= 179) return 90;
			if (angle >= 181 && angle <= 269) return 180;
			if (angle >= 271 && angle <= 359) return 270;
			if (angle === 0) return 270;
			if (angle === 90) return 0;
			if (angle === 180) return 90;
			if (angle === 270) return 180;
			return angle;
		}

		// 각도 스냅 함수 (시계방향)
		function snapAngleRight(angle) {
			if (angle >= 1 && angle <= 89) return 90;
			if (angle >= 91 && angle <= 179) return 180;
			if (angle >= 181 && angle <= 269) return 270;
			if (angle >= 271 && angle <= 359) return 0;
			if (angle === 0) return 90;
			if (angle === 90) return 180;
			if (angle === 180) return 270;
			if (angle === 270) return 0;
			return angle;
		}

		// 반시계방향 회전
		$('#photo-rotate-left').off('click').on('click', function() {
			const currentRotation = getCurrentRotation();
			const newRotation = snapAngleLeft(currentRotation);
			photo.css('transform', `rotate(${newRotation}deg)`); // frameGroup -> photo
			// ✨ 추가된 부분: 실루엣도 함께 회전
			$('.photo-silhouette').css('transform', `rotate(${newRotation}deg)`);
		});

		// 시계방향 회전
		$('#photo-rotate-right').off('click').on('click', function() {
			const currentRotation = getCurrentRotation();
			const newRotation = snapAngleRight(currentRotation);
			// ✨ 추가된 부분: 실루엣도 함께 회전
			$('.photo-silhouette').css('transform', `rotate(${newRotation}deg)`);
		});
	}
    
	static bindPhotoTooltipEvents(photo, frameGroup) {
		this.bindPhotoRotationEvents(photo);

		$('#btn-delete-photo').on('click', () => {
			if (confirm("사진을 삭제하시겠습니까?")) {
				const placeholderLink = frameGroup.find('.place-image-here-link');
				photo.hide().attr('src', '');
				placeholderLink.show();
				window.selectionManager.clearSelection();
			}
		});
	}

	static showTextTooltip(textBox) {
		this.hideAllToolbars();
        $('#text-controls').removeClass('d-none');
        this.bindTextTooltipEvents(textBox);
	}

	/**
	 * 텍스트 툴팁의 컨트롤들에 실제 동작을 연결합니다.
	 */
	static bindTextTooltipEvents(textBox) {
		// 기존 이벤트를 제거하여 중복 바인딩 방지
		$('#tooltip-color, #tooltip-size, #tooltip-align, #tooltip-remove').off();

		$('#tooltip-color').on('input', function() {
			textBox.css('color', $(this).val());
		});
		$('#tooltip-size').on('change', function() {
			textBox.css('font-size', $(this).val());
		});
		$('#tooltip-align').on('change', function() {
			textBox.css('text-align', $(this).val());
		});
		$('#tooltip-remove').on('click', function() {
			if (confirm('텍스트 상자를 삭제하시겠습니까?')) {
				textBox.remove();
				window.selectionManager.clearSelection();
			}
		});
	}
}