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

			element.css('transform-origin', '50% 50%');

			const rect = element[0].getBoundingClientRect();
			const elementCenter = {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2
			};

			const initialTransform = element.css('transform');
			const initialMatrix = TransformHelper.parseMatrix(initialTransform);
			const initialElementAngleRad = Math.atan2(initialMatrix.b, initialMatrix.a);
			const startAngleRad = Math.atan2(e.clientY - elementCenter.y, e.clientX - elementCenter.x);

			// 회전 중임을 표시 (중요!)
			if (element.hasClass('uploaded-photo')) {
				element.closest('.frame-group').data('isRotatingPhoto', true);
			}
			// ✅ element 회전 중임을 표시
			else if (element.hasClass('element-frame') || element.hasClass('selected-element')) {
				element.data('isRotatingElement', true);
			}

			$(document).on('mousemove.rotator', (ev) => {
				const currentAngleRad = Math.atan2(ev.clientY - elementCenter.y, ev.clientX - elementCenter.x);
				const deltaAngleRad = currentAngleRad - startAngleRad;
				const newAngleRad = initialElementAngleRad + deltaAngleRad;

				// ✨ 기존 행렬의 회전 부분만 새로운 각도로 교체합니다. (위치, 크기 정보는 보존)
				const newMatrix = { ...initialMatrix };
				const scaleX = Math.sqrt(initialMatrix.a * initialMatrix.a + initialMatrix.c * initialMatrix.c);
				const scaleY = Math.sqrt(initialMatrix.b * initialMatrix.b + initialMatrix.d * initialMatrix.d);
				const cos = Math.cos(newAngleRad);
				const sin = Math.sin(newAngleRad);
				newMatrix.a = cos * scaleX;
				newMatrix.b = sin * scaleX;
				newMatrix.c = -sin * scaleY;
				newMatrix.d = cos * scaleY;

				const newTransform = TransformHelper.composeMatrix(newMatrix);
				element.css('transform', newTransform);

				if (element.hasClass('uploaded-photo')) {
					$('.photo-selection-box, .photo-silhouette').css('transform', newTransform);
				}

				// ✅ Element 회전 중 커서 실시간 업데이트 추가
				else if (element.hasClass('element-frame') || element.hasClass('selected-element')) {
					EventManager.updateElementResizeCursors(element);
				}
			});

			$(document).on('mouseup.rotator', (ev) => {
				// 이벤트 전파 차단
				ev.stopPropagation();
				ev.stopImmediatePropagation();

				$(document).off('.rotator');

				if (!element.hasClass('uploaded-photo')) {
					this.saveElementPosition(element);
				}

				// 선택 상태 유지
				if (element.hasClass('uploaded-photo')) {
					const frameGroup = element.closest('.frame-group');
					PhotoManager.updateResizeCursors(element);
					PhotoManager.savePhotoState(element, frameGroup, { isManual: true });

					// 선택 상태 확실히 유지 - setTimeout 시간 조정
					setTimeout(() => {
						// 여전히 회전 중이 아닐 때만 선택
						if (!frameGroup.data('isDraggingPhoto') && !frameGroup.data('isResizingPhoto')) {
							window.selectionManager.selectPhoto(element, frameGroup);
						}
						frameGroup.removeData('isRotatingPhoto');
					}, 50); // 10ms -> 50ms로 증가
				}
				// ✅ Element 회전 종료 처리 추가
				else if (element.hasClass('element-frame') || element.hasClass('selected-element')) {
					// 최종 커서 업데이트
					EventManager.updateElementResizeCursors(element);
					element.removeData('isRotatingElement');

					// 선택 상태 유지
					setTimeout(() => {
						if (!element.data('isDraggingElement') && !element.data('isResizingElement')) {
							window.selectionManager.selectElement(element);
						}
					}, 50);
				}
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
			// ✅ [다중선택] Ctrl/Cmd 키가 눌려있으면 다중 선택 처리
			if ((e.ctrlKey || e.metaKey) && window.multiSelectionManager) {
				e.preventDefault();
				e.stopPropagation();
				clearTimeout(clickTimer);
				window.multiSelectionManager.toggleSelection(frameGroup);
				return;
			}

			if (frameGroup.data('isDraggingPhoto') ||
				frameGroup.data('isRotatingPhoto') ||
				frameGroup.data('isResizingPhoto')) {
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
		textBox.off('click dblclick mousedown keydown input blur compositionstart compositionend');

		// 클릭: 선택 상태
		textBox.on('click', (e) => {
			e.stopPropagation();

			// ✅ [다중선택] Ctrl/Cmd 키가 눌려있으면 다중 선택 처리
			if ((e.ctrlKey || e.metaKey) && window.multiSelectionManager) {
				e.preventDefault();
				window.multiSelectionManager.toggleSelection(textBox);
				return;
			}

			if (!textBox.hasClass('selected')) {
				// ✅ 클릭 시에는 크기 재조정하지 않음 (위치 이동 방지)
				// autoResizeTextBox는 텍스트 내용 변경 시에만 호출

				// 선택 처리
				window.selectionManager.selectTextBox(textBox);
			}
		});

		// 나머지 이벤트는 기존과 동일...
		textBox.on('dblclick', (e) => {
			e.stopPropagation();
			if (textBox.hasClass('selected')) {
				this.enterEditMode(textBox);
			}
		});

		// ✅ IME 조합 중 autoResizeTextBox 방지 (macOS Chrome/Safari 대응)
		// macOS에서는 한글/일본어 조합 중에도 input 이벤트가 발생하여
		// DOM 변경(autoResizeTextBox)이 IME 입력을 방해하는 문제 수정
		let isComposing = false;
		textBox.on('compositionstart', () => { isComposing = true; });
		textBox.on('compositionend', () => {
			isComposing = false;
			this.handleTextInput(textBox);  // 조합 완료 후 한 번 실행
		});
		textBox.on('input', () => {
			if (!isComposing) this.handleTextInput(textBox);
		});
		textBox.on('blur', () => this.handleTextBlur(textBox));

		textBox.on('paste', (e) => {
			e.preventDefault();

			// 클립보드에서 순수 텍스트만 가져오기 (HTML 태그 제거)
			let text = '';
			if (e.originalEvent.clipboardData) {
				text = e.originalEvent.clipboardData.getData('text/plain');
			} else if (window.clipboardData) {
				text = window.clipboardData.getData('Text');
			}

			// 줄바꿈(\n, \r\n)을 <br>로 변환하여 줄바꿈은 유지, 나머지 태그는 제거
			// ✅ 순서 중요: 이스케이프를 각 줄 텍스트에만 적용 후 <br>로 합치기
			const sanitized = text
				.replace(/&/g, '&amp;')
				.replace(/\r\n/g, '\n')   // \r\n → \n 통일
				.split('\n')              // 줄 단위로 분리
				.map(line => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'))  // 각 줄 이스케이프
				.join('<br>');            // <br>로 합치기

			// ✅ execCommand('insertHTML') 사용: <br> 태그를 DOM에 정확히 삽입
			document.execCommand('insertHTML', false, sanitized);

			// 텍스트박스 크기 자동 조정
			this.autoResizeTextBox(textBox);
		});

		// 수정된 드래그 설정 적용
		this.setupTextDrag(textBox);
	}

	// 텍스트박스프레임 이벤트
	static setupTextboxFrameEvents(frameGroup) {
		frameGroup.find('.frame-overlay').css('pointer-events', 'auto');

		frameGroup.on('click', (e) => {
			e.preventDefault();
			e.stopPropagation();

			// ✅ [다중선택] Ctrl/Cmd 키가 눌려있으면 다중 선택 처리
			if ((e.ctrlKey || e.metaKey) && window.multiSelectionManager) {
				window.multiSelectionManager.toggleSelection(frameGroup);
				return;
			}

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

			// ✅ [다중선택] Ctrl/Cmd 키가 눌려있으면 다중 선택 처리
			if ((e.ctrlKey || e.metaKey) && window.multiSelectionManager) {
				window.multiSelectionManager.toggleSelection(frameGroup);
				return;
			}

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

			// 현재 transform 매트릭스 파싱
			const currentTransform = element.css('transform');
			const matrix = TransformHelper.parseMatrix(currentTransform);

			// ✅ 추가: transform에 translate가 있으면 left/top으로 병합
			let initialLeft = parseFloat(element.css('left')) || 0;
			let initialTop = parseFloat(element.css('top')) || 0;

			// element인 경우에만 translate 병합 처리
			if (type === 'element' && (matrix.tx !== 0 || matrix.ty !== 0)) {
				initialLeft += matrix.tx;
				initialTop += matrix.ty;

				// 즉시 적용하여 점프 방지
				element.css({
					left: initialLeft + 'px',
					top: initialTop + 'px',
					transform: `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, 0, 0)`
				});
			}

			// transform이 적용된 실제 위치 가져오기
			const computedStyle = window.getComputedStyle(element[0]);
			const transformMatrix = new DOMMatrix(computedStyle.transform);

			// 요소의 실제 경계 박스
			const rect = element[0].getBoundingClientRect();
			const parentRect = element.parent()[0].getBoundingClientRect();

			// 부모 기준 상대 위치 계산
			const relativeX = rect.left - parentRect.left;
			const relativeY = rect.top - parentRect.top;

			// 회전 중심점 계산
			const centerX = relativeX + rect.width / 2;
			const centerY = relativeY + rect.height / 2;

			// 마우스와 중심점 간의 오프셋 (회전된 좌표계에서)
			const mouseOffsetX = e.clientX - (parentRect.left + centerX);
			const mouseOffsetY = e.clientY - (parentRect.top + centerY);

			// 회전 역변환을 적용하여 로컬 오프셋 계산
			const angle = Math.atan2(matrix.b, matrix.a);
			const cos = Math.cos(-angle);
			const sin = Math.sin(-angle);
			const localOffsetX = mouseOffsetX * cos - mouseOffsetY * sin;
			const localOffsetY = mouseOffsetX * sin + mouseOffsetY * cos;

			dragData = {
				startX: e.clientX,
				startY: e.clientY,
				// CSS의 left/top 값 직접 사용
				initialLeft: initialLeft,  // ✅ 병합된 값 사용
				initialTop: initialTop,    // ✅ 병합된 값 사용
				isDragging: false,
				// 회전 정보 저장
				transform: currentTransform,
				angle: angle,
				localOffsetX: localOffsetX,
				localOffsetY: localOffsetY
			};

			$(document).on('mousemove.drag', (ev) => {
				const deltaX = ev.clientX - dragData.startX;
				const deltaY = ev.clientY - dragData.startY;

				if (!dragData.isDragging && this.exceedsMinDistance(deltaX, deltaY)) {
					dragData.isDragging = true;
					element.addClass('dragging');
				}

				if (dragData.isDragging) {
					// 새로운 위치 계산 (회전 고려 없이 직접 이동)
					const newLeft = dragData.initialLeft + deltaX;
					const newTop = dragData.initialTop + deltaY;

					if (window.selectionManager) {
						window.selectionManager.safeConstraintsCache = null;
					}

					// SafeLine 제약 적용
					const constrainedPos = window.selectionManager.applySafeLineConstraints(
						newLeft, newTop, element
					);

					// 위치 업데이트 (transform은 유지)
					element.css({
						left: constrainedPos.left + 'px',
						top: constrainedPos.top + 'px'
					});

					this.updateTooltipIfNeeded(element, type, dragData);
				}
			});

			$(document).on('mouseup.drag', () => {
				$(document).off('.drag');
				element.removeClass('dragging');

				if (dragData.isDragging) {
					// 드래그 종료 시점에 transform 제거한 상태로 저장
					const currentTransform = element.css('transform');

					// 회전이 있는 경우에만 특별 처리
					if (currentTransform && currentTransform !== 'none' && currentTransform.includes('matrix')) {
						const matrix = currentTransform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
						if (matrix) {
							const a = parseFloat(matrix[1]);
							const b = parseFloat(matrix[2]);
							const c = parseFloat(matrix[3]);
							const d = parseFloat(matrix[4]);

							// 회전이 있는지 확인 (a≠1 또는 b≠0)
							if (Math.abs(a - 1) > 0.001 || Math.abs(b) > 0.001) {
								// 회전만 남기고 translate 제거
								const rotationOnlyTransform = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
								element.css('transform', rotationOnlyTransform);
							}
						}
					}
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
			// ✅ 라쏘 선택 중이거나 방금 완료했으면 무시
			if (window.multiSelectionManager) {
				if (window.multiSelectionManager.isLassoSelecting ||
					window.multiSelectionManager.justFinishedLasso) {
					console.log('[EventManager] 라쏘 중/완료 직후 - clearSelection 무시');
					return;
				}
			}

			// 회전, 드래그, 리사이즈 중이면 선택 해제하지 않음
			const rotatingFrame = $('.frame-group').filter(function() {
				return $(this).data('isRotatingPhoto') ||
					$(this).data('isDraggingPhoto') ||
					$(this).data('isResizingPhoto');
			});

			if (rotatingFrame.length > 0) {
				return; // 작업 중이면 아무것도 하지 않음
			}

			if (!this.isSelectableElement(e.target)) {
				// ✅ 다중 선택이 있으면 multiSelectionManager로 처리
				if (window.multiSelectionManager && window.multiSelectionManager.selectedElements.length > 0) {
					window.multiSelectionManager.clearSelection();
				} else {
					window.selectionManager.clearSelection();
				}
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

		$('#page-preview').on('mousedown', '.photo-silhouette', function(e) {
			if (e.button !== 0) return;

			const frameGroup = $(this).closest('.frame-group');
			const photo = frameGroup.find('.uploaded-photo');

			if (photo.hasClass('selected-photo')) {
				// 실제 사진의 mousedown 이벤트를 트리거
				photo.trigger(e);
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
		// 정렬 플래그 없이 저장 (드래그 등으로 위치 변경 시)
		return this.saveElementPositionWithAlignment(element, null, null, true);
	}

	/**
	 * ✅ 정렬 플래그를 포함한 요소 위치 저장
	 * @param {jQuery} element - 대상 요소
	 * @param {string|null} horizontalAlign - 수평 정렬 ('left', 'center', 'right', null)
	 * @param {string|null} verticalAlign - 수직 정렬 ('top', 'center', 'bottom', null)
	 * @param {boolean} clearAlignment - true면 기존 정렬 플래그 제거 (드래그 시)
	 */
	static saveElementPositionWithAlignment(element, horizontalAlign = null, verticalAlign = null, clearAlignment = false) {
		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

		if (!actualBgRect) return null;

		const currentTransform = element.css('transform');
		const currentTransformOrigin = element.css('transform-origin');

		// 회전 각도와 translate 분리 (더 정밀한 계산)
		let rotation = 0;
		let translateX = 0;
		let translateY = 0;

		if (currentTransform && currentTransform !== 'none') {
			const matrix = currentTransform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
			if (matrix) {
				const a = parseFloat(matrix[1]);
				const b = parseFloat(matrix[2]);
				const c = parseFloat(matrix[3]);
				const d = parseFloat(matrix[4]);
				translateX = parseFloat(matrix[5]);
				translateY = parseFloat(matrix[6]);

				// 회전 각도를 라디안으로 정확히 계산
				rotation = Math.atan2(b, a);
			}
		}

		// transform을 일시적으로 제거하여 정확한 위치 측정
		element.css('transform', 'none');
		const elementPos = element.position();
		const elementWidth = element.outerWidth();
		const elementHeight = element.outerHeight();
		element.css('transform', currentTransform);

		// transform-origin을 백분율로 변환
		let originX = 50;
		let originY = 50;
		if (currentTransformOrigin && currentTransformOrigin !== '50% 50%') {
			const originMatch = currentTransformOrigin.match(/([0-9.]+)(%|px)?\s+([0-9.]+)(%|px)?/);
			if (originMatch) {
				if (originMatch[2] === 'px') {
					originX = (parseFloat(originMatch[1]) / elementWidth) * 100;
				} else {
					originX = parseFloat(originMatch[1]);
				}
				if (originMatch[4] === 'px') {
					originY = (parseFloat(originMatch[3]) / elementHeight) * 100;
				} else {
					originY = parseFloat(originMatch[3]);
				}
			}
		}

		// 기존 relativeState에서 정렬 정보 가져오기
		const existingState = element.data('relativeState') || {};
		const existingAlignment = existingState.alignment || {};

		// ✅ 정렬 플래그 처리
		let alignment = {};
		if (clearAlignment) {
			// 드래그로 위치 변경 시 정렬 플래그 제거
			alignment = { horizontal: null, vertical: null };
		} else {
			// 정렬 메서드 호출 시 해당 방향만 업데이트
			alignment = {
				horizontal: horizontalAlign !== null ? horizontalAlign : existingAlignment.horizontal,
				vertical: verticalAlign !== null ? verticalAlign : existingAlignment.vertical
			};
		}

		const relativeState = {
			position: {
				left: ((elementPos.left - actualBgRect.left) / actualBgRect.width) * 100,
				top: ((elementPos.top - actualBgRect.top) / actualBgRect.height) * 100
			},
			// ✅ 중심점 좌표 추가 (회전된 요소의 위치 복원용)
			center: {
				x: ((elementPos.left + elementWidth / 2 - actualBgRect.left) / actualBgRect.width) * 100,
				y: ((elementPos.top + elementHeight / 2 - actualBgRect.top) / actualBgRect.height) * 100
			},
			size: {
				width: (elementWidth / actualBgRect.width) * 100,
				height: (elementHeight / actualBgRect.height) * 100
			},
			rotation: rotation,  // 라디안 값으로 저장
			translateX: (translateX / actualBgRect.width) * 100,  // 백분율로 저장
			translateY: (translateY / actualBgRect.height) * 100,  // 백분율로 저장
			transformOriginX: originX,  // 백분율
			transformOriginY: originY,  // 백분율
			// ✅ 정렬 플래그 추가
			alignment: alignment
		};

		// ✅ [핵심 수정] alignmentBounds 저장 - 해상도 변경 시 정확한 정렬 재계산 보장
		if (!clearAlignment && (horizontalAlign !== null || verticalAlign !== null)) {
			// 기존 alignmentBounds 보존 (한 축만 정렬하는 경우 다른 축 유지)
			const existingBounds = existingState.alignmentBounds || {};
			const newBounds = { ...existingBounds };

			// 수평 정렬 기준 좌표 저장
			if (horizontalAlign === 'center') {
				// 페이지 중앙 = 배경 너비의 50%
				newBounds.centerX = 50;
				// left, right는 제거 (center와 충돌 방지)
				delete newBounds.left;
				delete newBounds.right;
			} else if (horizontalAlign === 'left') {
				newBounds.left = ((elementPos.left - actualBgRect.left) / actualBgRect.width) * 100;
				delete newBounds.centerX;
				delete newBounds.right;
			} else if (horizontalAlign === 'right') {
				newBounds.right = ((elementPos.left + elementWidth - actualBgRect.left) / actualBgRect.width) * 100;
				delete newBounds.centerX;
				delete newBounds.left;
			}

			// 수직 정렬 기준 좌표 저장
			if (verticalAlign === 'center') {
				// 페이지 중앙 = 배경 높이의 50%
				newBounds.centerY = 50;
				delete newBounds.top;
				delete newBounds.bottom;
			} else if (verticalAlign === 'top') {
				newBounds.top = ((elementPos.top - actualBgRect.top) / actualBgRect.height) * 100;
				delete newBounds.centerY;
				delete newBounds.bottom;
			} else if (verticalAlign === 'bottom') {
				newBounds.bottom = ((elementPos.top + elementHeight - actualBgRect.top) / actualBgRect.height) * 100;
				delete newBounds.centerY;
				delete newBounds.top;
			}

			relativeState.alignmentBounds = newBounds;
		} else if (clearAlignment) {
			// 드래그로 이동 시 alignmentBounds도 제거
			// (alignment 플래그가 이미 null로 설정되었으므로 bounds도 불필요)
		} else {
			// 정렬 변경 없이 저장하는 경우 기존 alignmentBounds 보존
			if (existingState.alignmentBounds) {
				relativeState.alignmentBounds = existingState.alignmentBounds;
			}
		}

		// 텍스트박스 추가 정보
		if (element.hasClass('text-box')) {
			relativeState.hasRotation = rotation !== 0;
			relativeState.absolutePosition = {
				left: elementPos.left,
				top: elementPos.top
			};
		}

		element.data('relativeState', relativeState);
		return relativeState;
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
		textBox.attr('contenteditable', 'true');
		textBox.addClass('editing');
		textBox.focus();
		// autoResizeTextBox 제거: selectTextBox에서 updateElementPosition으로 이미 올바른 크기 설정됨
		// 텍스트 입력 시 handleTextInput → autoResizeTextBox가 실시간 크기 조정 처리
	}

	static handleTextInput(textBox) {
		this.autoResizeTextBox(textBox);
		// alignment 보존하여 저장 (텍스트 입력 시 정렬 정보 유실 방지)
		setTimeout(() => this.saveElementPositionWithAlignment(textBox, null, null, false), 10);
	}

	static handleTextBlur(textBox) {

		// 회전 핸들 div 제거하여 정확한 줄바꿈 감지
		const rawHtml = textBox.html();
		const htmlContent = rawHtml.replace(/<div class="text-rotate-(?:handle|line)"[^>]*><\/div>/g, '');
		// ✅ autoResizeTextBox/updateElementPosition/measureTextBoxContentSize와 동일한 정규식
		const strippedHtmlForCheck = htmlContent
			.replace(/<br\s*\/?>\s*$/gi, '')
			.replace(/(<div>\s*<br\s*\/?>\s*<\/div>\s*)+$/gi, '')  // Chrome Enter 시 생성되는 말미 <div><br></div> 제거
			.replace(/<div>\s*<\/div>\s*$/gi, '');
		const hasLineBreaks = strippedHtmlForCheck.includes('<br>') || strippedHtmlForCheck.includes('<div>');
		if (!hasLineBreaks) {
			textBox.css('white-space', 'nowrap');
		}

		textBox.removeClass('editing');
		textBox.attr('contenteditable', 'false');

		if (window.getSelection) {
			window.getSelection().removeAllRanges();
		}

		if (textBox.text().trim() === '') {
			textBox.text('Enter Text Here');
		}

		this.autoResizeTextBox(textBox);

		// ✅ blur 후 center alignment 시 시각적 재중앙 정렬
		// (autoResizeTextBox가 width를 변경하므로, 중앙 기준으로 left 재계산)
		const blurRelativeState = textBox.data('relativeState');
		if (blurRelativeState?.alignment?.horizontal === 'center') {
			const bg = $('#page-preview-img');
			const blurBgRect = window.safeLineManager.getActualImagePosition(bg);
			if (blurBgRect) {
				const newBoxWidth = textBox.outerWidth();
				const centerXRatio = blurRelativeState.alignmentBounds?.centerX ?? 50;
				const centerXPx = blurBgRect.left + (blurBgRect.width * centerXRatio) / 100;
				textBox.css('left', (centerXPx - newBoxWidth / 2) + 'px');
			}
		}

		if (textBox.hasClass('selected')) {
			textBox.trigger('resize');
		}

		// alignment 보존하여 저장 (blur 시 정렬 정보 유실 방지)
		setTimeout(() => this.saveElementPositionWithAlignment(textBox, null, null, false), 10);
	}

	static autoResizeTextBox($box) {
		// 회전 핸들 div 제거하여 클린 HTML로 줄바꿈 감지
		const rawHtml = $box.html();
		const htmlContent = rawHtml.replace(/<div class="text-rotate-(?:handle|line)"[^>]*><\/div>/g, '');
		const strippedHtmlForCheck = htmlContent
			.replace(/<br\s*\/?>\s*$/gi, '')
			.replace(/(<div>\s*<br\s*\/?>\s*<\/div>\s*)+$/gi, '')  // Chrome Enter 시 생성되는 말미 <div><br></div> 제거
			.replace(/<div>\s*<\/div>\s*$/gi, '');
		const hasLineBreaks = strippedHtmlForCheck.includes('<br>') || strippedHtmlForCheck.includes('<div>');

		// measureTextBoxContentSize와 동일한 측정 사용 (버퍼 불일치 방지)
		const fontSize = parseFloat($box.css('font-size'));
		if (window.measureTextBoxContentSize) {
			const measuredSize = window.measureTextBoxContentSize($box, fontSize);
			$box.css({
				'width': measuredSize.width + 'px',
				'height': measuredSize.height + 'px',
				'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap'
			});
		} else {
			// fallback
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
					'box-sizing': 'border-box'
				});

			$('body').append($temp);
			const measuredWidth = $temp.outerWidth();
			const measuredHeight = $temp.outerHeight();
			$temp.remove();

			$box.css({
				'width': (measuredWidth + 15) + 'px',
				'height': measuredHeight + 'px',
				'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap'
			});
		}
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

		// 삭제할 대상과 타입을 저장
		let deleteTarget = null;
		let deleteType = '';
		let deleteMessage = '';

		// 현재 선택 모드에 따라 처리
		switch (selectionManager.selectedMode) {
			case 'photo':
				if (selectionManager.currentPhoto) {
					deleteTarget = {
						element: selectionManager.currentPhoto,
						frame: selectionManager.currentFrame
					};
					deleteType = 'photo';
					deleteMessage = 'Are you sure you want to delete the photo?';
				}
				break;

			case 'frame':
				if (selectionManager.currentFrame) {
					deleteTarget = { element: selectionManager.currentFrame };
					deleteType = 'frame';
					deleteMessage = 'Are you sure you want to delete the frame?';
				}
				break;

			case 'text':
				if (selectionManager.currentTextBox) {
					deleteTarget = { element: selectionManager.currentTextBox };
					deleteType = 'text';
					deleteMessage = 'Are you sure you want to delete the text?';
				}
				break;

			case 'element':
				if (selectionManager.currentElement) {
					deleteTarget = { element: selectionManager.currentElement };
					deleteType = 'element';
					deleteMessage = 'Are you sure you want to delete the element?';
				}
				break;
		}

		// 삭제할 대상이 있으면 모달 표시
		if (deleteTarget) {
			this.showDeleteConfirmModal(deleteMessage, deleteType, deleteTarget);
		}
	}

	// 삭제 확인 모달 표시 메서드 추가
	static showDeleteConfirmModal(message, type, target) {
		// 모달 메시지 설정
		$('#delete-confirm-message').text(message);

		// Bootstrap 모달 객체 가져오기
		const modalElement = document.getElementById('deleteConfirmModal');
		const modal = new bootstrap.Modal(modalElement);

		// 기존 이벤트 리스너 제거
		$('#btn-delete-confirm').off('click');

		// 삭제 확인 버튼 클릭 이벤트
		$('#btn-delete-confirm').on('click', () => {
			// 타입에 따라 실제 삭제 실행
			switch (type) {
				case 'photo':
					this.deletePhoto(target.element, target.frame);
					break;
				case 'frame':
					this.deleteFrame(target.element);
					break;
				case 'text':
					this.deleteText(target.element);
					break;
				case 'element':
					this.deleteElement(target.element);
					break;
			}

			// 모달 닫기
			modal.hide();
		});

		// 모달 표시
		modal.show();
	}

	// EventManager.js - bindElementResizeEvent 메서드 완전 교체

	static bindElementResizeEvent(element, handle, position) {
		handle.on('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();

			element.data('isResizingElement', true);

			// 현재 transform 파싱
			const currentTransform = element.css('transform');
			const currentMatrix = TransformHelper.parseMatrix(currentTransform);

			// 현재 위치 정확히 가져오기 (점프 방지의 핵심)
			const currentLeft = parseFloat(element.css('left')) || 0;
			const currentTop = parseFloat(element.css('top')) || 0;

			const startWidth = element.outerWidth();
			const startHeight = element.outerHeight();
			const aspectRatio = startWidth / startHeight;
			const rotation = Math.atan2(currentMatrix.b, currentMatrix.a);

			const resizeData = {
				startX: e.clientX,
				startY: e.clientY,
				startWidth: startWidth,
				startHeight: startHeight,
				startLeft: currentLeft,  // ✅ 초기 left 저장
				startTop: currentTop,    // ✅ 초기 top 저장
				currentTranslateX: currentMatrix.tx,
				currentTranslateY: currentMatrix.ty,
				currentMatrix: currentMatrix,
				aspectRatio: aspectRatio,
				rotation: rotation,
				handlePosition: position
			};

			let animationId = null;
			let latestMouseEvent = null;
			let isResizing = true;

			const performResize = () => {
				if (!latestMouseEvent || !isResizing) {
					animationId = null;
					return;
				}

				const ev = latestMouseEvent;
				const screenDeltaX = ev.clientX - resizeData.startX;
				const screenDeltaY = ev.clientY - resizeData.startY;

				// 화면 좌표를 로컬 좌표로 변환
				const cos = Math.cos(-resizeData.rotation);
				const sin = Math.sin(-resizeData.rotation);
				const deltaX = screenDeltaX * cos - screenDeltaY * sin;
				const deltaY = screenDeltaX * sin + screenDeltaY * cos;

				let newWidth = resizeData.startWidth;
				let newHeight = resizeData.startHeight;
				let newTranslateX = resizeData.currentTranslateX;
				let newTranslateY = resizeData.currentTranslateY;

				// ✅ 개선된 핸들별 크기 계산 로직
				switch (position) {
					case 'se': // 우하단 - X와 Y 모두 양수여야 확대
						if (deltaX > 0 || deltaY > 0) {
							const delta = Math.max(deltaX, deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						} else {
							const delta = Math.min(deltaX, deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						}
						break;

					case 'sw': // 좌하단 - X는 음수, Y는 양수여야 확대
						if (deltaX < 0 || deltaY > 0) {
							const delta = Math.max(-deltaX, deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						} else {
							const delta = Math.min(-deltaX, deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						}
						const offsetX_sw = resizeData.startWidth - newWidth;
						newTranslateX = resizeData.currentTranslateX +
							offsetX_sw * Math.cos(resizeData.rotation);
						newTranslateY = resizeData.currentTranslateY +
							offsetX_sw * Math.sin(resizeData.rotation);
						break;

					case 'ne': // 우상단 - X는 양수, Y는 음수여야 확대
						if (deltaX > 0 || deltaY < 0) {
							const delta = Math.max(deltaX, -deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						} else {
							const delta = Math.min(deltaX, -deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						}
						const offsetY_ne = resizeData.startHeight - newHeight;
						newTranslateX = resizeData.currentTranslateX -
							offsetY_ne * Math.sin(resizeData.rotation);
						newTranslateY = resizeData.currentTranslateY +
							offsetY_ne * Math.cos(resizeData.rotation);
						break;

					case 'nw': // 좌상단 - X와 Y 모두 음수여야 확대
						if (deltaX < 0 || deltaY < 0) {
							const delta = Math.max(-deltaX, -deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						} else {
							const delta = Math.min(-deltaX, -deltaY * resizeData.aspectRatio);
							newWidth = Math.max(50, resizeData.startWidth + delta);
							newHeight = newWidth / resizeData.aspectRatio;
						}
						const offsetX_nw = resizeData.startWidth - newWidth;
						const offsetY_nw = resizeData.startHeight - newHeight;
						newTranslateX = resizeData.currentTranslateX +
							offsetX_nw * Math.cos(resizeData.rotation) -
							offsetY_nw * Math.sin(resizeData.rotation);
						newTranslateY = resizeData.currentTranslateY +
							offsetX_nw * Math.sin(resizeData.rotation) +
							offsetY_nw * Math.cos(resizeData.rotation);
						break;
				}

				// ✅ 크기와 위치 적용 (left/top은 초기값 유지)
				element.css({
					width: newWidth + 'px',
					height: newHeight + 'px',
					left: resizeData.startLeft + 'px',  // 초기 위치 유지
					top: resizeData.startTop + 'px'      // 초기 위치 유지
				});

				// Transform으로 회전과 이동 적용
				const newMatrix = {
					...resizeData.currentMatrix,
					tx: newTranslateX,
					ty: newTranslateY
				};
				element.css('transform', TransformHelper.composeMatrix(newMatrix));

				// 핸들 위치와 커서 업데이트
				EventManager.updateElementResizeCursors(element);

				latestMouseEvent = null;
				animationId = null;
			};

			$(document).on('mousemove.elementResize', (ev) => {
				if (!isResizing) return;
				latestMouseEvent = ev;

				if (!animationId) {
					animationId = requestAnimationFrame(performResize);
				}
			});

			$(document).on('mouseup.elementResize', (ev) => {
				isResizing = false;

				if (animationId) {
					cancelAnimationFrame(animationId);
					animationId = null;
				}

				if (latestMouseEvent) {
					latestMouseEvent = ev;
					performResize();
				}

				latestMouseEvent = null;
				$(document).off('.elementResize');
				ev.stopPropagation();

				// 상태 저장
				EventManager.saveElementPosition(element);

				setTimeout(() => {
					window.selectionManager.selectElement(element);
					element.removeData('isResizingElement');
				}, 50);
			});
		});
	}

	// Element 핸들 위치 업데이트
	static updateElementHandles(element) {
		const width = element.outerWidth();
		const height = element.outerHeight();

		// 회전 핸들 위치는 CSS로 처리되므로 별도 처리 불필요

		// 커서 업데이트
		EventManager.updateElementResizeCursors(element);
	}

	// Element resize 커서 업데이트
	static updateElementResizeCursors(element) {
		const handles = element.find('.element-resize-handle');
		const transform = element.css('transform');
		let rotation = 0;

		if (transform && transform !== 'none') {
			const matrix = transform.match(/matrix\((.+)\)/);
			if (matrix) {
				const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
				rotation = Math.atan2(values[1], values[0]) * (180 / Math.PI);
			}
		}

		// 회전 각도를 0-360 범위로 정규화
		rotation = ((rotation % 360) + 360) % 360;

		handles.each(function() {
			const $handle = $(this);
			const basePosition = $handle.attr('class').match(/handle-(\w+)/)[1];

			// 커서 매핑 테이블 (45도 단위)
			const cursorMap = {
				'nw': ['nw-resize', 'n-resize', 'ne-resize', 'e-resize',
					'se-resize', 's-resize', 'sw-resize', 'w-resize'],
				'ne': ['ne-resize', 'e-resize', 'se-resize', 's-resize',
					'sw-resize', 'w-resize', 'nw-resize', 'n-resize'],
				'se': ['se-resize', 's-resize', 'sw-resize', 'w-resize',
					'nw-resize', 'n-resize', 'ne-resize', 'e-resize'],
				'sw': ['sw-resize', 'w-resize', 'nw-resize', 'n-resize',
					'ne-resize', 'e-resize', 'se-resize', 's-resize']
			};

			const index = Math.round(rotation / 45) % 8;
			const newCursor = cursorMap[basePosition][index];

			$handle.css('cursor', newCursor);
		});
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