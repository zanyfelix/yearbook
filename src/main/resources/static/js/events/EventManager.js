// ============================================================================
// 📁 js/events/EventManager.js - 최종 수정본
// ============================================================================

const TransformHelper = {
	// "matrix(a, b, c, d, tx, ty)" 문자열을 객체로 파싱
	parseMatrix(transformString) {
		if (!transformString || transformString === 'none') {
			return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
		}
		const values = transformString.match(/matrix\((.+)\)/)[1].split(',').map(parseFloat);
		return { a: values[0], b: values[1], c: values[2], d: values[3], tx: values[4], ty: values[5] };
	},

	// 매트릭스 객체를 CSS 문자열로 변환
	composeMatrix(matrix) {
		return `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.tx}, ${matrix.ty})`;
	},

	// 기존 매트릭스에 이동(translation)을 적용
	applyTranslation(transformString, dx, dy) {
		const matrix = this.parseMatrix(transformString);
		matrix.tx += dx;
		matrix.ty += dy;
		return this.composeMatrix(matrix);
	},

	// 기존 매트릭스에 회전(rotation)을 적용 (행렬 곱셈)
	applyRotation(transformString, angleDegrees, centerX, centerY) {
		const matrix = this.parseMatrix(transformString);
		const angleRad = angleDegrees * (Math.PI / 180);
		const cos = Math.cos(angleRad);
		const sin = Math.sin(angleRad);

		// 1. 중심점으로 이동
		matrix.tx -= centerX;
		matrix.ty -= centerY;

		// 2. 회전 행렬과 곱셈
		const newA = matrix.a * cos - matrix.b * sin;
		const newB = matrix.a * sin + matrix.b * cos;
		const newC = matrix.c * cos - matrix.d * sin;
		const newD = matrix.c * sin + matrix.d * cos;
		const newTx = matrix.tx * cos - matrix.ty * sin;
		const newTy = matrix.tx * sin + matrix.ty * cos;

		matrix.a = newA;
		matrix.b = newB;
		matrix.c = newC;
		matrix.d = newD;
		matrix.tx = newTx;
		matrix.ty = newTy;

		// 3. 다시 원래 위치로 복귀
		matrix.tx += centerX;
		matrix.ty += centerY;

		return this.composeMatrix(matrix);
	}
};
class EventManager {
	// 공통 드래그 설정
	static dragConfig = {
		minMoveDistance: 5,
		tooltipUpdateInterval: 100
	};

	// ▼▼▼ [핵심 추가] FrameManager에서 이동해 온 공용 회전 기능 함수 ▼▼▼
	/**
	 * 요소를 회전 가능하게 만드는 이벤트 핸들러를 바인딩합니다.
	 * @param {jQuery} element - 회전 대상 요소
	 * @param {jQuery} handle - 회전 트리거 핸들
	 */
	static makeRotatable(element, handle) {
		handle.off('mousedown.rotator').on('mousedown.rotator', (e) => {
			e.preventDefault();
			e.stopPropagation();

			if (element.hasClass('uploaded-photo')) {
				element.closest('.frame-group').data('isRotatingPhoto', true);
			}

			const rect = element[0].getBoundingClientRect();
			const elementCenter = {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2
			};

			const initialTransform = element.css('transform');
			// ✨ 현재 위치(translate) 값을 미리 가져옵니다.
			const initialTranslate = window.getTranslateValues(initialTransform);
			const initialMatrix = TransformHelper.parseMatrix(initialTransform);
			const initialElementAngleRad = Math.atan2(initialMatrix.b, initialMatrix.a);
			const startAngleRad = Math.atan2(e.clientY - elementCenter.y, e.clientX - elementCenter.x);

			$(document).on('mousemove.rotator', (ev) => {
				const currentAngleRad = Math.atan2(ev.clientY - elementCenter.y, ev.clientX - elementCenter.x);
				const deltaAngleRad = currentAngleRad - startAngleRad;
				const newAngleRad = initialElementAngleRad + deltaAngleRad;
				const newAngleDeg = newAngleRad * (180 / Math.PI);

				// ✨ 위치(translate)와 새로운 회전(rotate) 값을 조합하여 CSS를 업데이트합니다.
				const newTransform = `translate(${initialTranslate.x}px, ${initialTranslate.y}px) rotate(${newAngleDeg}deg)`;

				// ✨ 회전하기 전에 교차 여부를 확인하는 로직
				const originalTransform = element.css('transform');
				element.css('transform', newTransform); // 임시로 회전

				const elementCorners = GeometryHelper.getRotatedCorners(element);
				const frameCorners = GeometryHelper.getRotatedCorners(element.closest('.frame-group'));

				if (frameCorners.length === 0 || GeometryHelper.checkIntersection(elementCorners, frameCorners)) {
					// 교차하면 회전을 확정하고, 나머지 요소들도 업데이트
					if (element.hasClass('uploaded-photo')) {
						$('.photo-selection-box').css('transform', newTransform);
						$('.photo-silhouette').css('transform', newTransform);
					}
				} else {
					// 교차하지 않으면(프레임을 완전히 벗어나면), 원래 각도로 되돌림
					element.css('transform', originalTransform);
				}
			});

			$(document).on('mouseup.rotator', () => {
				$(document).off('.rotator');

				const currentState = element.data('relativeState') || {};
				currentState.transform = element.css('transform');
				element.data('relativeState', currentState);

				// ✨ --- START: 선택 상태 유지를 위한 코드 추가 --- ✨
				// 회전 대상이 사진일 경우, 회전이 끝난 후 다시 사진을 선택합니다.
				if (element.hasClass('uploaded-photo')) {
					const frameGroup = element.closest('.frame-group');
					window.selectionManager.selectPhoto(element, frameGroup);

					// ✨ 회전 종료 후 아주 잠시 뒤에 플래그 해제
					setTimeout(() => {
						frameGroup.removeData('isRotatingPhoto');
					}, 0);
				}
				// ✨ --- END: 선택 상태 유지를 위한 코드 추가 --- ✨
			});
		});
	}
	// ▼▼▼ [신규 추가] setupPhotoFrameEvents 함수 ▼▼▼
	/**
	 * 사진 프레임에 대한 모든 이벤트를 설정합니다.
	 * 내부적으로 필요한 요소들을 찾아 setupFrameEvents를 호출합니다.
	 * @param {jQuery} frameGroup - 대상 사진 프레임 그룹
	 */
	static setupPhotoFrameEvents(frameGroup) {
		const placeholderLink = frameGroup.find('.place-image-here-link');
		const uploadedPhoto = frameGroup.find('.uploaded-photo');
		const maskContainer = frameGroup.find('.mask-container');

		// 기존의 포괄적인 이벤트 설정 함수를 호출
		this.setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer);
	}

	// 프레임 이벤트 설정 (기존 함수)
	static setupFrameEvents(frameGroup, placeholderLink, uploadedPhoto, maskContainer) {
		this.clearEvents(frameGroup, placeholderLink, uploadedPhoto);

		// Placeholder 클릭 이벤트
		placeholderLink.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.triggerImageUpload(frameGroup, uploadedPhoto, placeholderLink, maskContainer);
		});

		// ✨ --- START: Click/Dblclick 로직 전면 수정 --- ✨
		let clickTimer = null;

		frameGroup.on('click', (e) => {
			if (frameGroup.data('isDraggingPhoto') || frameGroup.data('isRotatingPhoto')) {
				return;
			}

			// 더블클릭이 진행 중이면, 싱글클릭 로직을 실행하지 않음
			clearTimeout(clickTimer);

			clickTimer = setTimeout(() => {
				// 200ms 이내에 다른 클릭이 없으면 싱글클릭으로 간주하고 프레임을 선택
				window.selectionManager.selectFrame(frameGroup);
			}, 200);
		});

		frameGroup.on('dblclick', (e) => {
			// 더블클릭이 인식되면, 대기 중이던 싱글클릭을 취소
			clearTimeout(clickTimer);

			// 더블클릭 토글 로직 실행
			this.handleFrameDoubleClick(e, frameGroup, uploadedPhoto);
		});
		// ✨ --- END: Click/Dblclick 로직 전면 수정 --- ✨

		// 사진 이벤트 설정
		this.setupPhotoEvents(uploadedPhoto, frameGroup, maskContainer);

		// 프레임 드래그 설정
		this.setupDragHandler(frameGroup, 'frame', (pos) => {
			this.saveFramePosition(frameGroup, pos);
		});
	}

	// 텍스트박스 이벤트 설정
	static setupTextEvents(textBox) {
		textBox.off('click dblclick mousedown keydown input blur');

		// 클릭: 선택 상태
		textBox.on('click', (e) => {
			e.stopPropagation();

			if (!textBox.hasClass('selected')) {
				// 🔴 선택 전 현재 위치 저장
				const currentTransform = textBox.css('transform');
				textBox.css('transform', 'none');
				const currentPos = textBox.position();
				textBox.css('transform', currentTransform);

				// 선택 처리
				window.selectionManager.selectTextBox(textBox);

				// 🔴 위치가 변경되었는지 확인하고 복원
				setTimeout(() => {
					const newTransform = textBox.css('transform');
					textBox.css('transform', 'none');
					const newPos = textBox.position();

					// 위치가 변경되었다면 원래 위치로 복원
					if (Math.abs(newPos.left - currentPos.left) > 1 ||
						Math.abs(newPos.top - currentPos.top) > 1) {
						textBox.css({
							left: currentPos.left + 'px',
							top: currentPos.top + 'px'
						});
					}

					textBox.css('transform', newTransform || currentTransform);
				}, 10);
			}
		});

		// 나머지 이벤트는 기존과 동일...
		textBox.on('dblclick', (e) => {
			e.stopPropagation();
			if (textBox.hasClass('selected')) {
				this.enterEditMode(textBox);
			}
		});

		textBox.on('input', () => this.handleTextInput(textBox));
		textBox.on('blur', () => this.handleTextBlur(textBox));

		// 수정된 드래그 설정 적용
		this.setupTextDrag(textBox);
	}

	// 텍스트박스프레임 이벤트
	static setupTextboxFrameEvents(frameGroup) {
		frameGroup.find('.frame-overlay').css('pointer-events', 'auto');

		frameGroup.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (!this.isFrameSelected(frameGroup)) {
				window.selectionManager.selectFrame(frameGroup);
			}
		});

		this.setupDragHandler(frameGroup, 'frame');
	}

	// Element 이벤트
	static setupElementEvents(frameGroup) {
		frameGroup.find('.frame-overlay').css('pointer-events', 'auto');

		frameGroup.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (!this.isElementSelected(frameGroup)) {
				window.selectionManager.selectElement(frameGroup);
			}
		});

		this.setupDragHandler(frameGroup, 'element');
	}

	// 공통 드래그 핸들러
	static setupDragHandler(element, type) {
		let dragData = null;

		element.on('mousedown', (e) => {
			if (e.button !== 0 || !this.canDrag(element, type)) return;
			e.preventDefault();
			e.stopPropagation();

			const initialPosition = element.position();
			dragData = {
				startX: e.clientX,
				startY: e.clientY,
				initialLeft: initialPosition.left,
				initialTop: initialPosition.top,
				isDragging: false,
			};

			$(document).on('mousemove.drag', (ev) => {
				const deltaX = ev.clientX - dragData.startX;
				const deltaY = ev.clientY - dragData.startY;

				if (!dragData.isDragging && this.exceedsMinDistance(deltaX, deltaY)) {
					dragData.isDragging = true;
					element.addClass('dragging');
				}

				if (dragData.isDragging) {
					// ✨ 1. 새로운 위치 계산
					const newLeft = dragData.initialLeft + deltaX;
					const newTop = dragData.initialTop + deltaY;

					// ✨ 2. SafeLine 제약 조건 적용
					const constrainedPos = window.selectionManager.applySafeLineConstraints(newLeft, newTop, element);

					// ✨ 3. 제약이 적용된 최종 위치로 CSS 업데이트
					element.css({
						left: constrainedPos.left + 'px',
						top: constrainedPos.top + 'px'
					});
					// 툴팁 등 부가 기능 업데이트
					this.updateTooltipIfNeeded(element, type, dragData);
				}
			});

			$(document).on('mouseup.drag', () => {
				$(document).off('.drag');
				element.removeClass('dragging');

				if (dragData.isDragging) {
					// ✨ 최종 위치를 relativeState에 저장
					this.saveElementPosition(element);
				}

				dragData = null;
			});
		});
	}

	// 텍스트 드래그 전용 처리
	static setupTextDrag(textBox) {
		textBox.on('mousedown', (e) => {
			e.stopPropagation();

			if (textBox.hasClass('editing')) {
				return; // 편집 중에는 드래그 비활성화
			}

			if (!textBox.hasClass('selected')) {
				e.preventDefault();
				return;
			}

			e.preventDefault();

			// 🔴 핵심: Transform을 일시적으로 저장하고 제거
			const currentTransform = textBox.css('transform');
			const transformOrigin = textBox.css('transform-origin');

			// Transform 임시 제거하여 정확한 위치 얻기
			textBox.css('transform', 'none');
			const actualPosition = textBox.position();
			const actualWidth = textBox.outerWidth();
			const actualHeight = textBox.outerHeight();

			// Transform 복원
			textBox.css('transform', currentTransform);

			// 🔴 회전 중심점 계산
			let centerX = actualPosition.left + actualWidth / 2;
			let centerY = actualPosition.top + actualHeight / 2;

			// 회전 각도 추출
			let rotation = 0;
			if (currentTransform && currentTransform !== 'none') {
				const matrix = currentTransform.match(/matrix\((.+)\)/);
				if (matrix) {
					const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
					rotation = Math.atan2(values[1], values[0]);
				}
			}

			// 🔴 마우스 위치를 회전되지 않은 좌표계로 변환
			const mouseX = e.clientX;
			const mouseY = e.clientY;
			const textBoxOffset = textBox.offset();

			// 클릭 지점과 요소 중심 간의 오프셋 (회전 적용 전)
			const offsetX = mouseX - (textBoxOffset.left + actualWidth / 2);
			const offsetY = mouseY - (textBoxOffset.top + actualHeight / 2);

			// 회전 역변환 적용
			const cos = Math.cos(-rotation);
			const sin = Math.sin(-rotation);
			const localOffsetX = offsetX * cos - offsetY * sin;
			const localOffsetY = offsetX * sin + offsetY * cos;

			const dragData = {
				startX: e.clientX,
				startY: e.clientY,
				initialLeft: actualPosition.left,
				initialTop: actualPosition.top,
				centerX: centerX,
				centerY: centerY,
				localOffsetX: localOffsetX,
				localOffsetY: localOffsetY,
				rotation: rotation,
				transform: currentTransform
			};

			const isOverflowing = this.checkTextOverflow(textBox);

			$(document).on('mousemove.textDrag', (ev) => {
				// 🔴 드래그 중에도 Transform 고려
				const deltaX = ev.clientX - dragData.startX;
				const deltaY = ev.clientY - dragData.startY;

				// 새로운 위치 계산 (Transform이 없는 상태 기준)
				const newLeft = dragData.initialLeft + deltaX;
				const newTop = dragData.initialTop + deltaY;

				const constrained = isOverflowing ?
					{ left: newLeft, top: newTop } :
					window.selectionManager.applySafeLineConstraints(newLeft, newTop, textBox);

				// Transform 임시 제거
				textBox.css('transform', 'none');

				// 위치 업데이트
				textBox.css({
					left: Math.max(0, constrained.left) + 'px',
					top: Math.max(0, constrained.top) + 'px'
				});

				// Transform 복원
				textBox.css('transform', dragData.transform);

				// 회전 핸들 위치 업데이트
				if (textBox.hasClass('selected')) {
					const handle = textBox.find('.text-rotate-handle');
					const line = textBox.find('.text-rotate-line');
					if (handle.length) {
						// 핸들 위치 재계산은 CSS로 처리되므로 별도 작업 불필요
					}
				}
			});

			$(document).on('mouseup.textDrag', () => {
				$(document).off('.textDrag');

				// 최종 위치 저장
				const finalTransform = textBox.css('transform');
				textBox.css('transform', 'none');
				const finalPosition = textBox.position();
				textBox.css('transform', finalTransform);

				// 상대 위치 저장
				this.saveElementPosition(textBox);
			});
		});
	}

	// 사진 이벤트 설정
	static setupPhotoEvents(photo, frameGroup, maskContainer) {

		photo.on('mousedown', (e) => {
			if (e.button !== 0) return;

			if (this.isPhotoSelected(photo)) {
				e.preventDefault();
				e.stopPropagation();
				PhotoManager.handleDrag(photo, frameGroup, maskContainer, e);
			}
		});
	}

	// 전역 이벤트 설정
	static setupGlobalEvents() {
		// 클릭 영역 외부 클릭 시 선택 해제
		document.getElementById('page-preview').addEventListener('click', (e) => {
			if (!this.isSelectableElement(e.target)) {
				window.selectionManager.clearSelection();
			}
		}, true);

		// Delete/Backspace 키 처리
		// Delete/Backspace 키 처리 - 개선된 버전
		$(document).off('keydown.delete').on('keydown.delete', (e) => {
			// Delete 또는 Backspace 키인지 확인
			if (e.key !== 'Delete' && e.key !== 'Backspace') return;

			// 텍스트 편집 중이면 무시
			const activeElement = document.activeElement;
			if (activeElement) {
				// contenteditable 요소에서 편집 중
				if (activeElement.contentEditable === 'true' && $(activeElement).hasClass('editing')) {
					return; // 편집 중이면 기본 동작 허용
				}

				// input이나 textarea에서 입력 중
				if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
					return; // 기본 동작 허용
				}
			}

			// 선택된 요소가 있으면 삭제 처리
			if (window.selectionManager && window.selectionManager.selectedMode) {
				e.preventDefault(); // 기본 동작 방지
				this.handleDeleteKey();
			}
		});

		// 텍스트 추가 버튼들
		$('#add-title-btn').on('click', () => TextManager.addTextBox('Title'));
		$('#add-subtitle-btn').on('click', () => TextManager.addTextBox('Sub-Title'));
		$('#add-text-btn').on('click', () => TextManager.addTextBox('text'));
	}

	// === Helper Methods ===

	static clearEvents(frameGroup, placeholderLink, uploadedPhoto) {
		frameGroup.off('mousedown click dblclick');
		placeholderLink.off('click');
		uploadedPhoto.off('mousedown click dblclick');
	}

	static isPlaceholderClick(e) {
		const target = $(e.target);
		return target.hasClass('place-image-here-link') ||
			target.closest('.place-image-here-link').length > 0;
	}

	static isFrameSelected(frameGroup) {
		return window.selectionManager.selectedMode === 'frame' &&
			window.selectionManager.currentFrame === frameGroup;
	}

	static isElementSelected(element) {
		return window.selectionManager.selectedMode === 'element' &&
			window.selectionManager.currentElement === element;
	}

	static isPhotoSelected(photo) {
		return window.selectionManager.selectedMode === 'photo' &&
			window.selectionManager.currentPhoto === photo;
	}

	static canDrag(element, type) {
		switch (type) {
			case 'frame':
				return this.isFrameSelected(element);
			case 'element':
				return this.isElementSelected(element);
			case 'photo':
				return this.isPhotoSelected(element);
			default:
				return false;
		}
	}

	static exceedsMinDistance(deltaX, deltaY) {
		return Math.abs(deltaX) > this.dragConfig.minMoveDistance ||
			Math.abs(deltaY) > this.dragConfig.minMoveDistance;
	}

	static calculateNewPosition(element, dragData, deltaX, deltaY) {
		const newLeft = dragData.initialLeft + deltaX;
		const newTop = dragData.initialTop + deltaY;
		const constrained = window.selectionManager.applySafeLineConstraints(newLeft, newTop, element);

		return {
			left: `${constrained.left}px`,
			top: `${constrained.top}px`
		};
	}

	static updateTooltipIfNeeded(element, type, dragData) {
		const now = Date.now();
		if (now - dragData.lastTooltipUpdate > this.dragConfig.tooltipUpdateInterval) {
			dragData.lastTooltipUpdate = now;

			switch (type) {
				case 'frame':
					UIManager.showFrameTooltip(element);
					break;
				case 'element':
					UIManager.showElementTooltip(element);
					break;
			}
		}
	}

	static saveElementPosition(element) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (!actualBgRect) return null;

		const elementPos = element.position();
		const currentState = element.data('relativeState') || {};

		currentState.position = {
			left: ((elementPos.left - actualBgRect.left) / actualBgRect.width) * 100,
			top: ((elementPos.top - actualBgRect.top) / actualBgRect.height) * 100
		};

		// ✅ if 조건문을 제거하여 항상 size를 업데이트하도록 수정
		currentState.size = {
			width: (element.outerWidth() / actualBgRect.width) * 100,
			height: (element.outerHeight() / actualBgRect.height) * 100
		};

		currentState.transform = element.css('transform') || 'none';
		element.data('relativeState', currentState);

		return currentState.position;
	}

	static saveFramePosition(frameGroup, position) {
		const currentState = frameGroup.data('relativeState') || {};
		if (position) {
			currentState.position = position;
			frameGroup.data('relativeState', currentState);
		}
	}

	static triggerImageUpload(frameGroup, uploadedPhoto, placeholderLink, maskContainer) {
		const fileInput = $('#image-upload-input');
		fileInput.data({
			targetFrameGroup: frameGroup,
			targetUploadedPhoto: uploadedPhoto,
			targetPlaceholderLink: placeholderLink,
			targetMaskContainer: maskContainer
		}).trigger('click');
	}

	static handleFrameDoubleClick(e, frameGroup, uploadedPhoto) {
		// 1. Check if a visible photo was the target of the double-click.
		const isPhotoClick = ($(e.target).hasClass('uploaded-photo') ||
			$(e.target).closest('.uploaded-photo').length > 0) &&
			uploadedPhoto.is(':visible');

		if (isPhotoClick) {
			// Case 1: The photo itself was double-clicked.
			if (window.selectionManager.selectedMode === 'photo' && window.selectionManager.currentPhoto[0] === uploadedPhoto[0]) {
				// If this specific photo is already selected, switch to selecting the parent frame.
				window.selectionManager.selectFrame(frameGroup);
			} else {
				// Otherwise (if the frame is selected, or nothing is), select this photo.
				window.selectionManager.selectPhoto(uploadedPhoto, frameGroup);
			}
		} else {
			// Case 2: The empty area of the frame was double-clicked. Always select the frame.
			window.selectionManager.selectFrame(frameGroup);
		}
	}

	static enterEditMode(textBox) {
		textBox.addClass('editing');
		textBox.focus();
		this.autoResizeTextBox(textBox);
	}

	static handleTextInput(textBox) {
		this.autoResizeTextBox(textBox);
		setTimeout(() => this.saveElementPosition(textBox), 10);
	}

	static handleTextBlur(textBox) {
		textBox.removeClass('editing');

		if (textBox.text().trim() === '') {
			textBox.text('Enter Text Here');
		}

		this.autoResizeTextBox(textBox);

		if (textBox.hasClass('selected')) {
			textBox.trigger('resize');
		}

		setTimeout(() => this.saveElementPosition(textBox), 10);
	}

	static autoResizeTextBox($box) {
		const htmlContent = $box.html();
		const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');

		const $temp = $('<div>')
			.html(htmlContent || ' ')
			.css({
				'position': 'absolute',
				'visibility': 'hidden',
				'height': 'auto',
				'width': 'auto',
				'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap',
				'font-size': $box.css('font-size'),
				'font-family': $box.css('font-family'),
				'font-weight': $box.css('font-weight'),
				'padding': $box.css('padding'),
				'border': $box.css('border'),
				'box-sizing': 'border-box',
				'max-width': '500px'
			});

		$('body').append($temp);

		const measuredWidth = $temp.outerWidth();
		const measuredHeight = $temp.outerHeight();
		$temp.remove();

		$box.css({
			'width': measuredWidth + 'px',
			'height': measuredHeight + 'px',
			'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap'
		});
	}

	static checkTextOverflow(textBox) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (!actualBgRect) return false;

		// Transform 임시 제거하여 정확한 크기 계산
		const currentTransform = textBox.css('transform');
		textBox.css('transform', 'none');

		const boxPos = textBox.position();
		const boxWidth = textBox.outerWidth();
		const boxHeight = textBox.outerHeight();

		textBox.css('transform', currentTransform);

		const safeMarginX = (window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width;
		const safeMarginY = (window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height;
		const safeRight = actualBgRect.left + actualBgRect.width - safeMarginX;
		const safeBottom = actualBgRect.top + actualBgRect.height - safeMarginY;

		return (boxPos.left + boxWidth > safeRight) || (boxPos.top + boxHeight > safeBottom);
	}

	static isSelectableElement(target) {
		const selectors = [
			'.frame-group',
			'.uploaded-photo',
			'.text-box',
			'#frame-controls-tooltip',
			'#photo-controls-tooltip',
			'#text-tooltip'
		];

		return selectors.some(selector => $(target).closest(selector).length > 0);
	}

	static shouldHandleDelete(e) {
		if (e.key !== 'Delete' && e.key !== 'Backspace') return false;

		const focused = document.activeElement;
		const isEditing = focused.tagName === 'INPUT' ||
			focused.tagName === 'TEXTAREA' ||
			focused.contentEditable === 'true';

		return !isEditing;
	}

	static handleDeleteKey() {
		const selectionManager = window.selectionManager;
		if (!selectionManager) return;

		// 현재 선택 모드에 따라 처리
		switch (selectionManager.selectedMode) {
			case 'photo':
				if (selectionManager.currentPhoto && confirm("사진을 삭제하시겠습니까?")) {
					this.deletePhoto(selectionManager.currentPhoto, selectionManager.currentFrame);
				}
				break;

			case 'frame':
				if (selectionManager.currentFrame && confirm("프레임을 삭제하시겠습니까?")) {
					this.deleteFrame(selectionManager.currentFrame);
				}
				break;

			case 'text':
				if (selectionManager.currentTextBox && confirm("텍스트를 삭제하시겠습니까?")) {
					this.deleteText(selectionManager.currentTextBox);
				}
				break;

			case 'element':
				if (selectionManager.currentElement && confirm("요소를 삭제하시겠습니까?")) {
					this.deleteElement(selectionManager.currentElement);
				}
				break;
		}
	}

	static deletePhoto(photo, frameGroup) {
		if (!photo || !frameGroup) return;
		const placeholder = frameGroup.find('.place-image-here-link');

		// 이벤트 핸들러 제거
		photo.off('load error');

		// ✅ 1. CSS transform 스타일을 초기화합니다.
		photo.css('transform', 'none');

		// ✅ 2. 저장된 상태 데이터(relativeState)를 완전히 제거합니다.
		photo.removeData('relativeState');

		// 기존 로직: 숨김 처리 및 소스, 데이터 제거
		photo.hide().removeAttr('src').removeData('filePath');

		// 플레이스홀더 표시
		if (placeholder.length) {
			placeholder.show();
		}

		// 선택 상태 초기화
		window.selectionManager.clearSelection();
	}

	static deleteFrame(frame) {
		if (!frame) return;
		frame.remove();
		window.selectionManager.clearSelection();
	}

	static deleteText(textBox) {
		if (!textBox) return;
		textBox.remove();
		window.selectionManager.clearSelection();
	}

	static deleteElement(element) {
		if (!element) return;
		element.remove();
		window.selectionManager.clearSelection();
	}
}