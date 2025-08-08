// ============================================================================
// 📁 js/ui/UIManager.js
// ============================================================================
class UIManager {
	
	static hideAllToolbars() {
	    $('#editor-toolbar .context-controls > div').addClass('d-none');
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

		// --- ✨ 핵심 수정: 툴팁과 텍스트 상자 스타일 동기화 ---

		// 1. 현재 텍스트 상자의 스타일 값을 가져옵니다.
		const currentSize = textBox.css('font-size');
		const currentAlign = textBox.css('text-align');
		const currentColorRGB = textBox.css('color');

		// rgb(r, g, b) 형식을 hex(#rrggbb) 형식으로 변환하는 함수
		function rgbToHex(rgb) {
			if (!rgb || !rgb.startsWith('rgb')) return rgb;
			let a = rgb.split("(")[1].split(")")[0].split(",");
			return "#" + a.map(function(x) {
				x = parseInt(x).toString(16);
				return (x.length == 1) ? "0" + x : x;
			}).join("");
		}

		const textContent = textBox.text();
		let defaultSize = '12px';

		if (textContent.includes('Title') && !textContent.includes('Sub-Title')) {
			defaultSize = '24px';
		} else if (textContent.includes('Sub-Title')) {
			defaultSize = '16px';
		} else if (textContent.includes('text')) {
			defaultSize = '12px';
		}

		// ✨ 비율이 적용된 실제 크기가 아닌, 원본 기본값을 드롭다운에 설정
		// 텍스트가 방금 생성된 경우 기본값 사용, 아니면 저장된 원본 사이즈 사용
		const originalSize = textBox.data('originalFontSize') || defaultSize;
		$('#tooltip-size').val(originalSize);

		// 2. 나머지 값들 설정
		if (currentAlign == 'start') {
			$('#tooltip-align').val('left');
		} else {
			$('#tooltip-align').val(currentAlign || 'left');
		}
		$('#tooltip-color').val(rgbToHex(currentColorRGB));

		// 3. 툴팁 컨트롤에 이벤트를 바인딩합니다.
		this.bindTextTooltipEvents(textBox);
	}

	/**
	 * 텍스트 툴팁의 컨트롤들에 실제 동작을 연결합니다.
	 */
	static bindTextTooltipEvents(textBox) {
		// 기존 이벤트를 제거하여 중복 바인딩 방지
		$('#tooltip-color, #tooltip-size, #tooltip-align, #tooltip-remove').off();
		
		this.bindTextRotationEvents(textBox);
		
		$('#tooltip-color').on('input', function() {
			textBox.css('color', $(this).val());
		});
		$('#tooltip-size').on('change', function() {
			const selectedSize = parseInt($(this).val()); // px 제거하고 숫자만 추출

			// ✨ 선택된 원본 사이즈를 data 속성에 저장
			textBox.data('originalFontSize', $(this).val());

			// 배경 이미지 비율 계산
			const bg = $('#page-preview-img');
			const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

			if (actualBgRect) {
				const TEMPLATE_WEB_BG_WIDTH = 786;
				const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
				const adjustedFontSize = Math.round(selectedSize * scaleRatio);
				textBox.css('font-size', adjustedFontSize + 'px');
			} else {
				textBox.css('font-size', $(this).val());
			}
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
	
	static showElementTooltip(elementGroup) {
		this.hideAllToolbars();
		$('#element-controls').removeClass('d-none');
		this.bindElementTooltipEvents(elementGroup);
	}

	static bindElementTooltipEvents(elementGroup) {
		// 회전 이벤트는 기존 프레임 회전 이벤트 재사용
		this.bindFrameRotationEvents(elementGroup);

		// Element 삭제 버튼
		$('#btn-delete-element').off('click').on('click', function() {
			if (confirm("Element를 삭제하시겠습니까?")) {
				elementGroup.remove();
				window.selectionManager.clearSelection();
			}
		});
	}
	
	/**
		 * 특정 요소의 위치와 크기를 현재 배경에 맞게 업데이트합니다.
		 * @param {jQuery} $element - .frame-group 또는 .text-box 요소
		 */
	static updateElementPosition($element) {
		const relativeState = $element.data('relativeState');
		if (!relativeState) return;

		const bg = $('#page-preview-img');
		const bgWidth = bg.width();
		const bgHeight = bg.height();

		const newPixelPos = {
			left: (relativeState.position.left / 100) * bgWidth,
			top: (relativeState.position.top / 100) * bgHeight,
		};
		const newPixelSize = {
			width: (relativeState.size.width / 100) * bgWidth,
			height: (relativeState.size.height / 100) * bgHeight,
		};

		$element.css({
			...newPixelPos,
			...newPixelSize,
			transform: relativeState.transform
		});

		// 사진, 선택 UI 등 내부 요소도 업데이트 필요
		if ($element.hasClass('selected-photo')) {
			PhotoManager.updateSelectionUI($element);
		}
	}
	
	static bindTextRotationEvents(textBox) {
		
		$('#text-rotate-left, #text-rotate-right').off('click');
		
	    // 현재 회전 각도 가져오기 (프레임과 동일한 로직)
	    function getCurrentRotation() {
	        const currentTransform = textBox.css('transform');
	        
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
	    
		// 수정된 스냅 함수들
		function snapAngleLeft(angle) {
			// 정확한 90도 단위로 스냅
			if (angle === 0 || angle === 360) return 270;
			if (angle === 90) return 0;
			if (angle === 180) return 90;
			if (angle === 270) return 180;

			// 근사값 처리
			if (angle > 0 && angle < 90) return 0;
			if (angle > 90 && angle < 180) return 90;
			if (angle > 180 && angle < 270) return 180;
			if (angle > 270 && angle < 360) return 270;

			return 0;
		}

		function snapAngleRight(angle) {
			// 정확한 90도 단위로 스냅
			if (angle === 0 || angle === 360) return 90;
			if (angle === 90) return 180;
			if (angle === 180) return 270;
			if (angle === 270) return 0;

			// 근사값 처리
			if (angle > 0 && angle < 90) return 90;
			if (angle > 90 && angle < 180) return 180;
			if (angle > 180 && angle < 270) return 270;
			if (angle > 270 && angle < 360) return 0;

			return 90;
		}
	    
	    // 반시계방향 회전
	    $('#text-rotate-left').off('click').on('click', function() {
	        const currentRotation = getCurrentRotation();
	        const newRotation = snapAngleLeft(currentRotation);
	        
	        textBox.css('transform', `rotate(${newRotation}deg)`);
	        
	        // 상태 저장
	        const currentState = textBox.data('relativeState') || {};
	        currentState.transform = `rotate(${newRotation}deg)`;
	        textBox.data('relativeState', currentState);
	    });
	    
	    // 시계방향 회전
	    $('#text-rotate-right').off('click').on('click', function() {
	        const currentRotation = getCurrentRotation();
	        const newRotation = snapAngleRight(currentRotation);
	        
	        textBox.css('transform', `rotate(${newRotation}deg)`);
	        
	        // 상태 저장
	        const currentState = textBox.data('relativeState') || {};
	        currentState.transform = `rotate(${newRotation}deg)`;
	        textBox.data('relativeState', currentState);
	    });
	}

	/**
	 * 페이지 위의 모든 가변 요소들의 위치와 크기를 업데이트합니다.
	 */
	static updateAllPositions() {
		$('#frame-container .frame-group, #frame-container .text-box').each(function() {
			UIManager.updateElementPosition($(this));
		});
	}
}