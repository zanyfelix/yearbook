$(document).ready(function() {

	let activePageThumb = null;
	let hasSaved = false;

	// 전역 인스턴스 초기화
	window.selectionManager = new SelectionManager();
	window.safeLineManager = new SafeLineManager();
	window.panelManager = new PanelManager();

	// ========================================================================
	// 다중 선택 및 정렬 매니저 초기화
	// ========================================================================

	// 전역 매니저 인스턴스 생성
	window.multiSelectionManager = null;
	window.alignmentManager = null;
	window.keyboardManager = null;

	// 모달이 열릴 때 매니저들 초기화
	$('#editModal').on('shown.bs.modal', function() {
		// 다중 선택 매니저
		if (!window.multiSelectionManager) {
			window.multiSelectionManager = new MultiSelectionManager();
		}

		// 정렬 매니저
		if (!window.alignmentManager) {
			window.alignmentManager = new AlignmentManager();
		}

		// 키보드 매니저
		if (!window.keyboardManager) {
			window.keyboardManager = new KeyboardManager();
		}

		console.log('다중 선택 및 정렬 매니저 초기화 완료');
	});

	// 모달이 닫힐 때 정리
	$('#editModal').on('hidden.bs.modal', function() {
		if (window.multiSelectionManager) {
			window.multiSelectionManager.clearSelection();
		}
	});

	// ========================================================================
	// 빈 영역 클릭 시 선택 해제
	// ========================================================================
	$('#page-preview').on('click', function(e) {
		// ✅ 라쏘 선택 중이거나 방금 완료했으면 무시
		if (window.multiSelectionManager) {
			if (window.multiSelectionManager.isLassoSelecting ||
				window.multiSelectionManager.justFinishedLasso) {
				console.log('[main.js] 라쏘 중/완료 직후 - click 무시');
				return;
			}
		}

		// 클릭한 대상이 선택 가능한 요소가 아니면 선택 해제
		if (!$(e.target).closest('.frame-group, .text-box, .element-frame').length) {
			if (window.multiSelectionManager) {
				window.multiSelectionManager.clearSelection();
			} else if (window.selectionManager) {
				window.selectionManager.clearSelection();
			}
		}
	});

	// ========================================================================
	// 전역 헬퍼 함수
	// ========================================================================

	// transform에서 translate 값 추출
	window.getTranslateValues = function(transform) {
		if (!transform || transform === 'none') {
			return { x: 0, y: 0 };
		}

		// translate(Xpx, Ypx) 형태
		const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
		if (translateMatch) {
			return {
				x: parseFloat(translateMatch[1]) || 0,
				y: parseFloat(translateMatch[2]) || 0
			};
		}

		// matrix(a, b, c, d, tx, ty) 형태
		const matrixMatch = transform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
		if (matrixMatch) {
			return {
				x: parseFloat(matrixMatch[5]) || 0,
				y: parseFloat(matrixMatch[6]) || 0
			};
		}

		return { x: 0, y: 0 };
	};

	// 로딩 화면 제어 함수
	const $loader = $('#preview-loader');
	function showLoader() { $loader.show(); }
	function hideLoader() { $loader.hide(); }

	// 전역 함수 래핑 (기존 코드 호환성)
	window.clearSelection = () => window.selectionManager.clearSelection();
	window.selectFrame = (frame) => window.selectionManager.selectFrame(frame);
	window.selectPhoto = (photo, frame) => window.selectionManager.selectPhoto(photo, frame);

	window.updateElementPosition = function($element, state) {
		const relativeState = $element.data('relativeState');
		if (!relativeState) return;

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		// ✅ Transform 정보 먼저 계산
		let finalTransform = 'none';

		if (relativeState.rotation !== undefined && relativeState.rotation !== 0) {
			const cos = Math.cos(relativeState.rotation);
			const sin = Math.sin(relativeState.rotation);
			const translateX = (relativeState.translateX || 0) / 100 * actualBgRect.width;
			const translateY = (relativeState.translateY || 0) / 100 * actualBgRect.height;
			finalTransform = `matrix(${cos.toFixed(6)}, ${sin.toFixed(6)}, ${(-sin).toFixed(6)}, ${cos.toFixed(6)}, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
		} else if (relativeState.translateX || relativeState.translateY) {
			const translateX = (relativeState.translateX || 0) / 100 * actualBgRect.width;
			const translateY = (relativeState.translateY || 0) / 100 * actualBgRect.height;
			finalTransform = `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px)`;
		}

		const transformOrigin = `${relativeState.transformOriginX || 50}% ${relativeState.transformOriginY || 50}%`;

		// ✅ 요소 크기 먼저 계산 (정렬 계산에 필요)
		let elementWidth, elementHeight;

		if ($element.hasClass('text-box')) {
			const baseFontSize = $element.data('base-font-size') || 12;
			const TEMPLATE_WEB_BG_WIDTH = 786;
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
			const scaledFontSize = Math.round(baseFontSize * scaleRatio * 10) / 10;

			// 폰트 크기 먼저 적용
			$element.css({
				'font-size': scaledFontSize + 'px',
				'font-family': $element.data('savedFontFamily') || $element.css('font-family')
			});

			// 저장된 백분율 기반 크기
			const savedWidth = (relativeState.size.width / 100) * actualBgRect.width;
			const savedHeight = (relativeState.size.height / 100) * actualBgRect.height;

			// ✅ 회전이 있으면 저장된 크기 사용 (위치 일관성 우선)
			if (relativeState.rotation && relativeState.rotation !== 0) {
				elementWidth = savedWidth;
				elementHeight = savedHeight;
			} else {
				// 회전 없으면 실시간 측정 (텍스트 잘림 방지)
				const measuredSize = measureTextBoxContentSize($element, scaledFontSize);
				elementWidth = measuredSize.width;
				elementHeight = measuredSize.height;
			}

		} else {
			// 프레임, 요소 등
			elementWidth = (relativeState.size.width / 100) * actualBgRect.width;
			elementHeight = (relativeState.size.height / 100) * actualBgRect.height;
		}

		// ✅ 정렬 플래그 기반 위치 계산 (해상도 독립적)
		let newLeft, newTop;

		// ✅ 회전된 요소를 위한 저장된 크기 (백분율 기반)
		const savedWidth = (relativeState.size.width / 100) * actualBgRect.width;
		const savedHeight = (relativeState.size.height / 100) * actualBgRect.height;

		// ✅ SafeLine 마진 계산 (정렬 시 필요)
		const safeMarginX = window.safeLineManager ? 
			(window.safeLineManager.safeMargin / window.safeLineManager.actualWidth) * actualBgRect.width : 0;
		const safeMarginY = window.safeLineManager ? 
			(window.safeLineManager.safeMargin / window.safeLineManager.actualHeight) * actualBgRect.height : 0;
		
		const safeBounds = {
			left: actualBgRect.left + safeMarginX,
			top: actualBgRect.top + safeMarginY,
			width: actualBgRect.width - (safeMarginX * 2),
			height: actualBgRect.height - (safeMarginY * 2)
		};

		// 수평 위치 계산 - 정렬 플래그 우선 확인
		const hAlign = relativeState.alignment?.horizontal;
		const hasHAlignBounds = relativeState.alignmentBounds !== undefined;
		
		if (hAlign === 'left' && hasHAlignBounds) {
			// ✅ 좌측 정렬 - 저장된 기준 좌표 사용
			if (relativeState.alignmentBounds?.left !== undefined) {
				newLeft = (relativeState.alignmentBounds.left / 100) * actualBgRect.width + actualBgRect.left;
			} else {
				newLeft = safeBounds.left;
			}
		} else if (hAlign === 'center' && hasHAlignBounds) {
			// ✅ 수평 중앙 정렬 - 저장된 기준 좌표 사용
			if (relativeState.alignmentBounds?.centerX !== undefined) {
				const centerX = (relativeState.alignmentBounds.centerX / 100) * actualBgRect.width + actualBgRect.left;
				newLeft = centerX - elementWidth / 2;
			} else {
				newLeft = safeBounds.left + (safeBounds.width - elementWidth) / 2;
			}
		} else if (hAlign === 'right' && hasHAlignBounds) {
			// ✅ 우측 정렬 - 저장된 기준 좌표 사용
			if (relativeState.alignmentBounds?.right !== undefined) {
				const right = (relativeState.alignmentBounds.right / 100) * actualBgRect.width + actualBgRect.left;
				newLeft = right - elementWidth;
			} else {
				newLeft = safeBounds.left + safeBounds.width - elementWidth;
			}
		} else if (relativeState.rotation && relativeState.rotation !== 0 && relativeState.center) {
			// 회전된 요소는 중심점 기반
			const centerX = (relativeState.center.x / 100) * actualBgRect.width + actualBgRect.left;
			newLeft = centerX - savedWidth / 2;
		} else {
			// 수동 위치 - 백분율 변환
			newLeft = (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left;
		}

		// 수직 위치 계산 - 정렬 플래그 우선 확인
		const vAlign = relativeState.alignment?.vertical;
		const hasVAlignBounds = relativeState.alignmentBounds !== undefined;
		
		if (vAlign === 'top' && hasVAlignBounds) {
			// ✅ 상단 정렬 - 저장된 기준 좌표 사용
			if (relativeState.alignmentBounds?.top !== undefined) {
				newTop = (relativeState.alignmentBounds.top / 100) * actualBgRect.height + actualBgRect.top;
			} else {
				newTop = safeBounds.top;
			}
		} else if (vAlign === 'center' && hasVAlignBounds) {
			// ✅ 수직 중앙 정렬 - 저장된 기준 좌표 사용
			if (relativeState.alignmentBounds?.centerY !== undefined) {
				const centerY = (relativeState.alignmentBounds.centerY / 100) * actualBgRect.height + actualBgRect.top;
				newTop = centerY - elementHeight / 2;
			} else {
				newTop = safeBounds.top + (safeBounds.height - elementHeight) / 2;
			}
		} else if (vAlign === 'bottom' && hasVAlignBounds) {
			// ✅ 하단 정렬 - 저장된 기준 좌표 사용
			if (relativeState.alignmentBounds?.bottom !== undefined) {
				const bottom = (relativeState.alignmentBounds.bottom / 100) * actualBgRect.height + actualBgRect.top;
				newTop = bottom - elementHeight;
			} else {
				newTop = safeBounds.top + safeBounds.height - elementHeight;
			}
		} else if (relativeState.rotation && relativeState.rotation !== 0 && relativeState.center) {
			// 회전된 요소는 중심점 기반
			const centerY = (relativeState.center.y / 100) * actualBgRect.height + actualBgRect.top;
			newTop = centerY - savedHeight / 2;
		} else {
			// 수동 위치 - 백분율 변환
			newTop = (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top;
		}

		// ✅ CSS 적용
		// 회전된 텍스트는 저장된 크기 사용 (해상도 독립적)
		let cssWidth = elementWidth;
		let cssHeight = elementHeight;
		if ($element.hasClass('text-box') && relativeState.rotation && relativeState.rotation !== 0) {
			cssWidth = savedWidth;
			cssHeight = savedHeight;
		}

		$element.css({
			left: newLeft + 'px',
			top: newTop + 'px',
			width: cssWidth + 'px',
			height: cssHeight + 'px',
			transform: finalTransform,
			transformOrigin: transformOrigin,
			visibility: 'visible'
		});

		if ($element.hasClass('uploaded-photo') && $element.hasClass('selected-photo')) {
			PhotoManager.updateSelectionUI($element);
		}
	};

	/**
	 * 텍스트박스 내용에 맞는 크기 측정 (줄바꿈 유지)
	 */
	function measureTextBoxContentSize($textBox, fontSize) {
		const htmlContent = $textBox.html();
		const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');
		const padding = parseInt($textBox.css('padding')) || 8;

		if (hasLineBreaks) {
			// 줄바꿈이 있는 경우
			let lines = [];
			const tempDiv = $('<div>').html(htmlContent);

			if (htmlContent.includes('<div>')) {
				const firstLineText = tempDiv.contents().filter(function() {
					return this.nodeType === 3;
				}).text();
				if (firstLineText.trim()) lines.push(firstLineText);
				tempDiv.find('div').each(function() {
					lines.push($(this).text() || '\u00A0');
				});
			} else if (htmlContent.includes('<br>')) {
				const parts = htmlContent.split('<br>');
				parts.forEach(part => {
					const text = $('<div>').html(part).text();
					lines.push(text || '\u00A0');
				});
			}

			// 가장 긴 줄 너비 측정
			let maxWidth = 0;
			lines.forEach(line => {
				const $temp = $('<span>')
					.text(line || '\u00A0')
					.css({
						'position': 'absolute',
						'visibility': 'hidden',
						'white-space': 'nowrap',
						'font-size': fontSize + 'px',
						'font-family': $textBox.css('font-family'),
						'font-weight': $textBox.css('font-weight'),
						'letter-spacing': $textBox.css('letter-spacing')
					});
				$('body').append($temp);
				maxWidth = Math.max(maxWidth, $temp.width());
				$temp.remove();
			});

			// 높이 측정
			const $heightTemp = $('<div>')
				.html(htmlContent)
				.css({
					'position': 'absolute',
					'visibility': 'hidden',
					'width': (maxWidth + padding * 2 + 10) + 'px',
					'white-space': 'pre-wrap',
					'word-break': 'keep-all',
					'font-size': fontSize + 'px',
					'font-family': $textBox.css('font-family'),
					'font-weight': $textBox.css('font-weight'),
					'line-height': $textBox.css('line-height'),
					'padding': padding + 'px',
					'box-sizing': 'border-box'
				});
			$('body').append($heightTemp);
			const measuredHeight = $heightTemp.outerHeight();
			$heightTemp.remove();

			return {
				width: maxWidth + padding * 2 + 5,
				height: measuredHeight
			};
		} else {
			// 단일 행
			const $temp = $('<div>')
				.html(htmlContent || ' ')
				.css({
					'position': 'absolute',
					'visibility': 'hidden',
					'white-space': 'nowrap',
					'font-size': fontSize + 'px',
					'font-family': $textBox.css('font-family'),
					'font-weight': $textBox.css('font-weight'),
					'padding': padding + 'px'
				});
			$('body').append($temp);
			const width = $temp.outerWidth();
			const height = $temp.outerHeight();
			$temp.remove();

			return { width, height };
		}
	}

	window.updateAllPositions = function() {
		console.log("updateAllPositions");
		$('#frame-container .frame-group').each(function() {
			window.updateElementPosition($(this));
		});
		$('#frame-container .text-box').each(function() {
			// updateTextBoxPosition 대신 updateElementPosition 호출
			window.updateElementPosition($(this));
		});
	}

	// ✅ [핵심 수정] 전역 함수들을 밖으로 이동 - 중복 제거

	// 기본 배경 이미지 로드 함수
	function loadDefaultBackground() {
		const defaultBgPath = `${ctx}/images/background.png`;
		const bgImg = $('#page-preview-img');
		bgImg.off('load error');

		bgImg.one('load', function() {
			console.log('기본 배경 로드 완료');
			setTimeout(() => {
				if (window.safeLineManager) {
					window.safeLineManager.update();
				}
			}, 150);
		});

		bgImg.attr('src', defaultBgPath);

		if (bgImg[0].complete) {
			bgImg.trigger('load');
		}
	}

	// 저장 시간 표시 함수
	function displayLastSaveTime(lastSaved) {
		const savedDate = new Date(lastSaved);
		const year = savedDate.getFullYear();
		const month = (savedDate.getMonth() + 1).toString().padStart(2, '0');
		const day = savedDate.getDate().toString().padStart(2, '0');

		let hours = savedDate.getHours();
		const minutes = savedDate.getMinutes().toString().padStart(2, '0');
		const ampm = hours >= 12 ? 'PM' : 'AM';

		hours = hours % 12;
		hours = hours ? hours : 12;

		const formattedDate = `${year}.${month}.${day}`;
		const formattedTime = `${hours}:${minutes}${ampm}`;
		const message = `The Page has been saved.${formattedDate} ${formattedTime}`;

		$('#save-confirmation-message').html(message).show();
	}

	// 강력한 완전 초기화 함수
	function forceCompleteReset() {

		// Step 1: 모든 DOM 요소 강제 제거
		$('#frame-container').empty().html('');
		$('#page-preview').find('.frame-group, .text-box, .photo-selection-box, .rotate-handle, .rotate-line, .selection-handle, .element-resize-handle, #photo-full-overlay, .photo-silhouette').remove();

		// Step 2: 모든 이벤트 리스너 완전 해제
		$(document).off('.photoDrag .photoRotate .photoResize .frameDrag .elementDrag .textDrag');
		$('#frame-container').off();
		$('.frame-group, .uploaded-photo, .text-box').off();

		// Step 3: 전역 변수 완전 초기화
		window.selectedFrame = null;
		window.selectedPhotoWrapper = null;
		window.selectedBox = null;
		hasSaved = false;

		// Step 4: 매니저 인스턴스들 완전 초기화
		if (window.selectionManager) {
			window.selectionManager.selectedMode = null;
			window.selectionManager.currentFrame = null;
			window.selectionManager.currentPhoto = null;
			window.selectionManager.currentElement = null;
			window.selectionManager.currentTextBox = null;
			window.selectionManager.photoOverlay = null;
			window.selectionManager.safeConstraintsCache = null;
		}

		if (window.safeLineManager) {
			window.safeLineManager.safeConstraintsCache = null;
			$('#safe-line-overlay').remove();
			window.safeLineManager.createContainer();
		}

		// Step 5: PhotoManager 완전 정리
		if (typeof PhotoManager !== 'undefined') {
			PhotoManager.photoOverlay = null;
			PhotoManager.removeSelectionUI();
			PhotoManager.hideOverlay();
		}

		// Step 6: UI 상태 완전 초기화
		$('#save-confirmation-message').hide().empty();
		$('#frame-controls, #photo-controls, #text-controls, #element-controls').addClass('d-none');
		$('#editor-toolbar .context-controls > div').addClass('d-none');

		// Step 7: 패널 상태 강제 초기화
		$('#btn-background, #btn-photo-frame, #btn-textbox-frame, #btn-text, #btn-element').removeClass('active');
		$('#background-panel, #frame-panel, #text-panel, #element-panel').addClass('d-none');
		$('#photoFrameList, #textboxFrameList').addClass('d-none');

		// ✅ 모든 패널 내용 비우기 (캐시 방지)
		$('#background-panel').empty();
		$('#photoFrameList').empty();
		$('#textboxFrameList').empty();
		$('#element-panel').empty();

		$('#btn-background').addClass('active');
		$('#background-panel').removeClass('d-none');

		// Step 8: CSS 스타일 강제 정리
		$('*').removeClass('selected-frame selected-photo selected editing dragging selected-element selected-thumbnail');

		// Step 9: 배경 이미지 강제 초기화
		const $bgImg = $('#page-preview-img');
		$bgImg.off('.render .defaultBg');

		// Step 10: 입력 요소 초기화
		$('#image-upload-input').val('').removeData();

		console.log('=== 강력한 완전 초기화 완료 ===');
	}

	// ✅ [핵심 수정] renderPage 함수 구조 개선 - 내부 함수 최소화
	function renderPage(pageData, onComplete) {
		forceCompleteReset();

		if (!pageData || !pageData.designData) {
			loadDefaultBackground();
			if (typeof onComplete === 'function') setTimeout(onComplete, 200);
			return;
		}

		let design;
		try {
			design = JSON.parse(pageData.designData);
		} catch (e) {
			console.error('JSON 파싱 에러:', e);
			loadDefaultBackground();
			if (typeof onComplete === 'function') setTimeout(onComplete, 200);
			return;
		}

		const bgImg = $('#page-preview-img');

		// ✅ 사진 이미지 로딩 추적 변수
		let photosToLoad = 0;
		let photosLoaded = 0;
		let elementsRendered = false;

		// ✅ 모든 작업 완료 확인 함수
		function checkAllComplete() {
			console.log('[renderPage] 완료 체크:', {
				elementsRendered,
				photosToLoad,
				photosLoaded
			});
			
			// 요소 렌더링 완료 && 모든 사진 로드 완료
			if (elementsRendered && photosLoaded >= photosToLoad) {
				console.log('[renderPage] 모든 작업 완료 - hideLoader 호출');
				if (typeof onComplete === 'function') {
					// 약간의 여유시간 후 로딩바 숨김
					setTimeout(onComplete, 100);
				}
			}
		}

		// ✅ renderElements는 design 객체에 접근해야 하므로 내부에 유지
		function renderElements() {
			const totalFrames = design.frames?.length || 0;
			const totalTextBoxes = design.textBoxes?.length || 0;
			let renderedCount = 0;
			const totalElements = totalFrames + totalTextBoxes;

			function checkCompletion() {
				renderedCount++;
				if (renderedCount >= totalElements) {
					console.log('[renderPage] 모든 요소 렌더링 완료');
					elementsRendered = true;
					checkAllComplete();
				}
			}

			if (totalElements === 0) {
				elementsRendered = true;
				checkAllComplete();
				return;
			}

			// 프레임 렌더링
			if (design.frames) {
				console.log('프레임 복원 시작, 개수:', design.frames.length);
				design.frames.forEach(frameData => {
					FrameManager.applyFrame(frameData.theme, frameData);

					// ✅ 사진이 있는 프레임은 로딩 카운트만 증가
					if (frameData.photo && frameData.photo.src) {
						photosToLoad++;
						
						const $frame = $('#frame-container .frame-group:last-child');
						const $photo = $frame.find('.uploaded-photo');
						
						// ✅ restorePhoto에서 이미지 로드를 처리하므로 
						// 여기서는 load.restore 이벤트를 감지
						$photo.off('load.renderCount');
						$photo.one('load.renderCount', function() {
							console.log('[renderPage] 사진 로드 완료 감지');
							photosLoaded++;
							checkAllComplete();
						});
						
						// ✅ 에러도 감지
						$photo.one('error.renderCount', function() {
							console.error('[renderPage] 사진 로드 실패 감지');
							photosLoaded++;
							checkAllComplete();
						});
					}
					
					checkCompletion();
				});
			}

			if (design.textBoxes) {
				console.log('텍스트박스 복원 시작, 개수:', design.textBoxes.length);

				design.textBoxes.forEach((boxData, index) => {
					try {
						const bg = $('#page-preview-img');
						const actualBgRect = window.safeLineManager.getActualImagePosition(bg);

						if (!actualBgRect) {
							console.error('배경 이미지 정보를 가져올 수 없음');
							checkCompletion();
							return;
						}

						const $box = $('<div class="text-box" contenteditable="false"></div>');

						// ⭐ 핵심: HTML 설정 전에 white-space 먼저 확인
						const htmlContent = boxData.html;
						const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');

						// 기본 폰트 크기 결정 (저장된 값 우선, 없으면 추정)
						let baseFontSize = boxData.styles?.fontSize || 12;
						let textType = boxData.textType || 'text';

						// 타입 추정 로직 (저장된 데이터에 타입이 없는 경우)
						if (!boxData.textType) {
							if (baseFontSize === 24) {
								textType = 'Title';
							} else if (baseFontSize === 16) {
								textType = 'Sub-Title';
							} else {
								textType = 'text';
							}
						}

						const TEMPLATE_WEB_BG_WIDTH = 786;
						const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
						const scaledFontSize = Math.round(baseFontSize * scaleRatio);

						// 위치 계산
						const pixelLeft = Math.max(0, (boxData.position?.left || 10) / 100 * actualBgRect.width + actualBgRect.left);
						const pixelTop = Math.max(0, (boxData.position?.top || 10) / 100 * actualBgRect.height + actualBgRect.top);

						// ⭐ 핵심: 스타일을 먼저 적용 (HTML 설정 전)
						$box.css({
							'position': 'absolute',
							'z-index': 100,
							'left': pixelLeft + 'px',
							'top': pixelTop + 'px',
							'color': boxData.styles?.color || '#000000',
							'font-size': scaledFontSize + 'px',
							'font-weight': boxData.styles?.fontWeight || 'normal',
							'text-align': boxData.styles?.textAlign || 'left',
							'font-family': boxData.styles?.fontFamily || 'Arial, sans-serif',
							'padding': '10px',
							'visibility': 'visible',
							'display': 'block',
							'opacity': '1',
							'white-space': hasLineBreaks ? 'pre-wrap' : 'nowrap',  // ⭐ 먼저 적용
							'word-break': hasLineBreaks ? 'keep-all' : 'normal',
							'overflow': 'visible'
						});

						// ⭐ 스타일 적용 후 HTML 설정
						$box.html(htmlContent);

						// DOM에 추가
						$('#frame-container').append($box);

						// 내용 기반 크기 측정 및 적용
						const measuredSize = measureTextBoxContentSize($box, scaledFontSize);
						$box.css({
							'width': measuredSize.width + 'px',
							'height': measuredSize.height + 'px'
						});

						// Transform 적용
						if (boxData.transform && boxData.transform !== 'none') {
							try {
								$box.css({
									'transform': boxData.transform,
									'transform-origin': boxData.transformOrigin || '50% 50%'
								});
							} catch (transformError) {
								console.warn('Transform 적용 실패:', transformError);
							}
						}

						// 데이터 속성 설정
						$box.data('relativeState', {
							position: boxData.position || { left: 10, top: 10 },
							// ✅ 중심점 좌표 복원
							center: boxData.center || null,
							size: boxData.size || { width: 20, height: 10 },
							// ⭐ 중요: rotation 관련 값들도 relativeState에 포함
							rotation: boxData.rotation || 0,  // 추가
							translateX: boxData.translateX || 0,  // 추가
							translateY: boxData.translateY || 0,  // 추가
							transform: boxData.transform || 'none',
							transformOrigin: boxData.transformOrigin || '50% 50%',
							// ✅ 정렬 플래그 복원
							alignment: boxData.alignment || { horizontal: null, vertical: null }
						});

						// 중요: 기본 크기를 원본 크기(스케일링 전)로 저장
						$box.data('base-font-size', baseFontSize);
						$box.data('text-type', textType);
						$box.data('savedFontFamily', boxData.styles?.fontFamily || 'Arial');

						EventManager.setupTextEvents($box);

						checkCompletion();

					} catch (error) {
						console.error(`텍스트박스 ${index} 복원 실패:`, error);
						checkCompletion();
					}
				});
			}
		}

		// 배경 이미지 처리 후 요소 렌더링
		if (design.background && bgImg.attr('src') !== design.background) {
			let bgLoadHandled = false;
			
			bgImg.off('load.render error.render');
			bgImg.on('load.render', function() {
				if (bgLoadHandled) return;
				bgLoadHandled = true;
				bgImg.off('load.render error.render');
				console.log('[renderPage] 배경 이미지 로드 완료 - renderElements 호출');
				// ✅ 배경 로드 완료 후 요소 렌더링
				renderElements();
				// ✅ 요소 렌더링 후 배경 기준으로 프레임 위치 재계산
				setTimeout(() => {
					if (window.updateAllPositions) {
						console.log('[renderPage] 배경 로드 후 프레임 위치 재계산');
						window.updateAllPositions();
					}
				}, 150);
			});
			bgImg.on('error.render', function() {
				if (bgLoadHandled) return;
				bgLoadHandled = true;
				bgImg.off('load.render error.render');
				console.error('[renderPage] 배경 이미지 로드 실패');
				renderElements();  // 실패해도 요소는 렌더링
			});
			
			bgImg.attr('src', design.background);
			
			// ✅ src 설정 후 캐시된 경우 체크
			if (bgImg[0].complete && bgImg[0].naturalWidth > 0) {
				if (!bgLoadHandled) {
					bgLoadHandled = true;
					bgImg.off('load.render error.render');
					console.log('[renderPage] 배경 이미지 캐시됨 - renderElements 즉시 호출');
					renderElements();
					// ✅ 캐시된 경우에도 프레임 위치 재계산
					setTimeout(() => {
						if (window.updateAllPositions) {
							console.log('[renderPage] 배경 캐시됨 - 프레임 위치 재계산');
							window.updateAllPositions();
						}
					}, 100);
				}
			}
		} else {
			console.log('[renderPage] 배경 이미지 변경 없음 - renderElements 즉시 호출');
			renderElements();
		}
	}

	// ✅ [핵심 수정] 세션 관리자를 전역으로 이동
	const SessionManager = {
		timeout: 1800 * 1000, // 30분 (밀리초 단위)
		timer: null,

		// 타이머를 시작하고 초기화하는 함수
		reset: function() {
			clearTimeout(this.timer);
			console.log("사용자 활동 감지. 세션 타이머를 재시작합니다.");

			this.timer = setTimeout(() => {
				console.log("세션 만료 시간이 임박하여 자동 저장을 시작합니다.");
				this.autoSaveAndLogout();
			}, this.timeout);
		},

		// 타이머 완전 중지 함수
		stop: function() {
			clearTimeout(this.timer);
			console.log("세션 타이머를 중지합니다.");
		},

		autoSaveAndLogout: function() {
			if (!activePageThumb) {
				console.log("저장할 대상이 없어 로그아웃만 진행합니다.");
				this.logout();
				return;
			}

			// executeSave 함수를 직접 호출 (window에 등록 필요)
			if (window.executeSave) {
				window.executeSave(true); // true = 저장 후 닫기

				// 저장 완료 후 로그아웃
				$(document).one('saveComplete', () => {
					setTimeout(() => {
						this.logout();
					}, 1000);
				});
			} else {
				// executeSave가 없는 경우 fallback
				console.error("executeSave 함수를 찾을 수 없습니다.");
				this.logout();
			}
		},

		logout: function() {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = `${ctx}/logout`;
			document.body.appendChild(form);
			form.submit();
		}
	};

	// ✅ [핵심 수정] 페이지 순서 관리 함수들을 전역으로 이동
	let isMoveModeActive = false;
	let draggedCardId = null;

	// 드롭 위치 계산 헬퍼 함수
	function getDragAfterElement(container, x) {
		const draggableElements = [...$(container).find('.page-card:not(.dragging)')];

		return draggableElements.reduce((closest, child) => {
			const box = child.getBoundingClientRect();
			const offset = x - box.left - box.width / 2;
			if (offset < 0 && offset > closest.offset) {
				return { offset: offset, element: child };
			} else {
				return closest;
			}
		}, { offset: Number.NEGATIVE_INFINITY }).element;
	}

	// 자동 저장을 위한 AJAX 함수
	function savePageOrder() {
		const orderData = [];
		$('.slide-container').each(function() {
			$(this).find('.page-card').each(function(index) {
				const cardId = $(this).attr('id');
				const yearbookId = cardId ? parseInt(cardId.split('-')[1], 10) : null;

				if (yearbookId) {
					orderData.push({
						id: yearbookId,
						pageNo: index + 1
					});
				}
			});
		});

		if (orderData.length === 0) {
			return;
		}

		$.ajax({
			url: `${ctx}/edit/updatePageOrder`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(orderData),
			success: function(response) {
				if (response.success) {
					console.log("The page order has been successfully auto-saved.");
				} else {
					alert("Error: Failed to save page order.");
				}
			},
			error: function() {
				alert("Error: Failed to save page order during server communication.");
			}
		});
	}

	// ✅ [핵심 수정] 이벤트 핸들러들을 전역으로 이동 (중복 바인딩 방지)

	// 모달 이벤트는 한 번만 바인딩
	$('#editModal').on('show.bs.modal', function() {
		console.log('모달 열리기 직전 - 추가 정리');
		$('#frame-container').empty();
		if (window.selectionManager) {
			window.selectionManager.clearSelection();
		}

		// 세션 관리 시작
		console.log("모달이 열렸습니다. 세션 관리를 시작합니다.");
		SessionManager.reset();

		// 편집 영역에서 발생하는 모든 활동을 감지
		$('#page-preview').on('mousedown.session keydown.session', function() {
			SessionManager.reset();
		});
	});

	$('#editModal').on('shown.bs.modal', function() {
		// ✅ safeLineManager 업데이트 (안전선)
		if (window.safeLineManager) {
			// 여러 번 시도하여 이미지 로딩 타이밍 이슈 해결
			setTimeout(() => window.safeLineManager.update(), 50);
			setTimeout(() => window.safeLineManager.update(), 200);
		}
		
		// ✅ Background 패널 초기 데이터 로드
		if (window.panelManager) {
			const $bgPanel = $('#background-panel');
			// 패널이 비어있으면 데이터 로드
			if ($bgPanel.children().length === 0) {
				const pageCategory = $('#editModal').data('page-category');
				console.log('[shown.bs.modal] Background 패널 초기 데이터 로드:', pageCategory);
				DataLoader.loadBackgrounds(pageCategory);
			}
		}
		
		// ✅ 배경 이미지 크기 확인 후 모든 요소 위치 재계산
		const $bgImg = $('#page-preview-img');
		const bgComplete = $bgImg[0] && $bgImg[0].complete && $bgImg[0].naturalWidth > 0;
		
		console.log('[shown.bs.modal] 배경 이미지 상태:', {
			complete: $bgImg[0]?.complete,
			naturalWidth: $bgImg[0]?.naturalWidth,
			bgComplete: bgComplete
		});
		
		// ✅ 배경 로드 상태 확인 후 프레임 위치 재계산
		const recalculateAllPositions = () => {
			// 프레임 + 텍스트 위치 재계산
			if (window.updateAllPositions) {
				window.updateAllPositions();
				console.log('[shown.bs.modal] 프레임 위치 재계산 완료');
			}
			
			// 사진 위치 재계산
			if (typeof updateAllPhotosPosition === 'function') {
				updateAllPhotosPosition();
				console.log('[shown.bs.modal] 사진 위치 재계산 완료');
			}
		};
		
		if (!bgComplete) {
			// 배경 이미지가 아직 로드 중
			console.log('[shown.bs.modal] 배경 이미지 로드 대기 중...');
			$bgImg.off('load.shownmodal error.shownmodal');
			$bgImg.one('load.shownmodal', function() {
				setTimeout(recalculateAllPositions, 100);
			});
			$bgImg.one('error.shownmodal', function() {
				console.error('[shown.bs.modal] 배경 이미지 로드 실패');
			});
		} else {
			// 배경 이미지 이미 로드됨 (캐시)
			console.log('[shown.bs.modal] 배경 이미지 캐시됨 - 레이아웃 안정화 대기');
			
			// 여러 단계로 재계산하여 정확도 향상
			setTimeout(recalculateAllPositions, 100);
			setTimeout(recalculateAllPositions, 250);
		}
		
		// ✅ 로드되지 않은 사진 이미지 확인
		const $photos = $('#frame-container .uploaded-photo').filter(function() {
			const src = $(this).attr('src');
			return src && src !== '#';
		});
		
		const unloadedPhotos = $photos.filter(function() {
			return !this.complete || this.naturalWidth === 0;
		});
		
		if (unloadedPhotos.length > 0) {
			console.log(`[shown.bs.modal] ${unloadedPhotos.length}개 사진 이미지 로드 대기 중...`);
			$('#preview-loader').show();
			
			waitForAllPhotosLoaded().then(() => {
				setTimeout(() => {
					if (typeof updateAllPhotosPosition === 'function') {
						updateAllPhotosPosition();
					}
					$('#preview-loader').hide();
					console.log('[shown.bs.modal] 모든 사진 로드 완료');
				}, 100);
			});
		}
	});

	$('#btn-close-modal').on('click', function(e) {
		e.preventDefault();

		modalActionType = 'close';

		// 모달 내용을 종료 확인용으로 변경
		$('#clearConfirmModalLabel').text('Exit Editor');
		$('#clearConfirmModal .modal-body').html(`
	        <p>You have unsaved changes. Are you sure you want to exit without saving?</p>
	    `);

		// 버튼들을 종료용으로 변경
		$('#clearConfirmModal .modal-footer').html(`
	        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
	        <button type="button" class="btn btn-danger" id="btn-exit-without-saving">Exit without Saving</button>
	    `);

		$('#clearConfirmModal').modal('show');
	});

	$('#editModal').on('hidden.bs.modal', function() {
		forceCompleteReset();

		if (hasSaved) {
			console.log('저장이 완료되어 페이지를 새로고침합니다.');
			hasSaved = false;
		}

		const $message = $('#save-confirmation-message');
		$message.removeClass('show');
		activePageThumb = null;

		// 세션 관리 중지
		console.log("모달이 닫혔습니다. 세션 관리를 중지합니다.");
		SessionManager.stop();
		$('#page-preview').off('.session');
	});

	// Edit 버튼 클릭 이벤트
	$('.content').on('click', '.edit-btn', async function(e) {
		e.preventDefault();

		const $pageCard = $(this).closest('.page-card');
		activePageThumb = $pageCard.find('.page-thumb');
		const yearbookId = activePageThumb.attr('data-yearbook-id');

		console.log('Edit 버튼 클릭 - yearbookId:', yearbookId);

		const pageCategory = $(this).data('category');
		
		// ✅ 모달에 페이지 카테고리 저장 (PanelManager에서 사용)
		$('#editModal').data('page-category', pageCategory);

		showLoader();

		try {
			// ✅ 병렬 로딩: 폰트와 페이지 데이터를 동시에 로드
			const startTime = performance.now();
			
			const pageDataPromise = new Promise((resolve, reject) => {
				if (yearbookId) {
					$.ajax({
						url: `${ctx}/edit/pageData`,
						method: 'GET',
						data: {
							id: yearbookId,
							_: new Date().getTime()
						},
						cache: false,
						success: function(data) {
							console.log('페이지 데이터 로드 성공');
							resolve(data);
						},
						error: function(err) {
							console.error('페이지 데이터 로드 실패:', err);
							reject(err);
						}
					});
				} else {
					console.log('yearbookId가 없어 빈 페이지로 처리');
					resolve(null);
				}
			});

			// ✅ 폰트와 페이지 데이터 병렬 로드
			const [_, pageData] = await Promise.all([
				DataLoader.loadAndSetupFonts(),
				pageDataPromise
			]);
			
			const loadTime = performance.now() - startTime;
			console.log(`병렬 로딩 완료: ${loadTime.toFixed(0)}ms`);

			// ✅ 둘 다 완료된 후 렌더링
			renderPage(pageData, hideLoader);

			if (pageData && pageData.lastSaved) {
				displayLastSaveTime(pageData.lastSaved);
			}

			$('#editModal').modal('show');
			
			// ✅ 백그라운드 썸네일은 PanelManager가 패널 클릭 시 로드
			// (지연 로딩으로 초기 로딩 시간 단축)

		} catch (error) {
			console.error('An error occurred while preparing the page:', error);
			alert("An error occurred while preparing the page.");
			hideLoader();
		}
	});

	// Save 버튼 클릭 - 모달 표시
	$('#btn-save').on('click', function(e) {
		e.preventDefault();

		modalActionType = 'save';

		// 모달 내용을 저장용으로 변경
		$('#clearConfirmModalLabel').text('Save Page');
		$('#clearConfirmModal .modal-body').html(`
	        <p>Select an option to proceed with saving.</p>
	    `);

		// 버튼들을 저장용으로 변경
		$('#clearConfirmModal .modal-footer').html(`
	        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
	        <button type="button" class="btn btn-primary" id="btn-save-close">Save & Close</button>
	        <button type="button" class="btn btn-success" id="btn-save-continue">Save & Continue</button>
	    `);

		$('#clearConfirmModal').modal('show');
	});

	// Save 버튼 클릭 이벤트
	window.executeSave = async function executeSave(shouldClose) {
		showLoader();
		window.selectionManager.clearSelection();

		const designData = {
			frames: [],
			textBoxes: [],
			background: $('#page-preview-img').attr('src')
		};
		const bgImg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bgImg);

		// RENDER_SCALE을 여기서 정의
		const RENDER_SCALE = 2621 / 786;

		if (!actualBgRect) {
			alert("Could not save because background information could not be found.");
			hideLoader();
			return;
		}

		// Save 버튼 클릭 이벤트 내 프레임 저장 부분
		$('#frame-container .frame-group:not(.element-frame)').each(function() {
			const $frame = $(this);

			// relativeState가 없으면 현재 상태로 생성
			let relativeState = $frame.data('relativeState');
			if (!relativeState) {
				EventManager.saveElementPosition($frame);
				relativeState = $frame.data('relativeState');
			}

			if (!relativeState) return;

			let photoData = null;
			const $photo = $frame.find('.uploaded-photo');
			if ($photo.length && $photo.is(':visible') && $photo.data('filePath')) {

				PhotoManager.savePhotoState($photo, $frame, { isManual: false });

				const photoRelativeState = $photo.data('relativeState');

				if (photoRelativeState) {

					photoData = {
						src: $photo.data('originalPath') || $photo.data('filePath'),
						editSrc: $photo.data('editPath'),
						position: photoRelativeState.position,
						size: photoRelativeState.size,  // 그대로
						sizePercent: photoRelativeState.sizePercent,  // ✅ 추가
						rotation: photoRelativeState.rotation || 0,
						translateX: photoRelativeState.translateX || 0,
						translateY: photoRelativeState.translateY || 0,
						transformOriginX: photoRelativeState.transformOriginX || 50,
						transformOriginY: photoRelativeState.transformOriginY || 50,
						screenWidth: actualBgRect.width,  // 이것만 추가
						isFrameRelative: photoRelativeState.isFrameRelative  // ✅ 추가 (선택)
					};

					console.log('Saving photoData:', photoData);
				}
			}

			const frameData = {
				theme: $frame.data('frameTheme'),
				position: relativeState.position,
				size: relativeState.size,
				// 새로운 구조로 저장
				rotation: relativeState.rotation || 0,
				translateX: relativeState.translateX || 0,
				translateY: relativeState.translateY || 0,
				transformOriginX: relativeState.transformOriginX || 50,
				transformOriginY: relativeState.transformOriginY || 50,
				// ✅ 정렬 플래그 저장
				alignment: relativeState.alignment || { horizontal: null, vertical: null },
				photo: photoData
			};

			designData.frames.push(frameData);
		});

		// Element 저장 부분 추가 (frames 저장 후)
		$('#frame-container .element-frame').each(function() {
			const $element = $(this);

			// relativeState가 없으면 현재 상태로 생성
			let relativeState = $element.data('relativeState');
			if (!relativeState) {
				EventManager.saveElementPosition($element);
				relativeState = $element.data('relativeState');
			}

			if (!relativeState) return;

			const elementData = {
				theme: $element.data('frameTheme'),
				position: relativeState.position,
				size: relativeState.size,
				rotation: relativeState.rotation || 0,
				translateX: relativeState.translateX || 0,
				translateY: relativeState.translateY || 0,
				transformOriginX: relativeState.transformOriginX || 50,
				transformOriginY: relativeState.transformOriginY || 50,
				// ✅ 정렬 플래그 저장
				alignment: relativeState.alignment || { horizontal: null, vertical: null },
				type: 'element'
			};

			// frames 배열에 element도 포함
			designData.frames.push(elementData);
		});

		// 텍스트박스 이미지 캡처를 위한 준비
		const textBoxImages = [];
		const $textBoxes = $('#frame-container .text-box');

		// 각 텍스트박스 처리
		for (let i = 0; i < $textBoxes.length; i++) {
			const $box = $($textBoxes[i]);
			if (!$box.text().trim() || $box.outerWidth() <= 0) continue;

			// ⭐ 저장 전 편집 모드 해제 및 상태 정리
			const wasEditing = $box.hasClass('editing');
			const originalWhiteSpace = $box.css('white-space');

			if (wasEditing) {
				$box.removeClass('editing');
				$box.attr('contenteditable', 'false');
				$box.blur();  // 포커스 해제
			}

			// ⭐ 핵심: 저장 전 white-space를 nowrap으로 강제 설정하여 줄바꿈 방지
			const htmlContent = $box.html();
			const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');
			if (!hasLineBreaks) {
				$box.css('white-space', 'nowrap');
			}

			// 텍스트박스 정보 저장 (기존 로직)
			const boxTransform = $box.css('transform');
			const boxTransformOrigin = $box.css('transform-origin');

			// ⭐ 중요: rotation 값 추출
			let rotation = 0;
			let translateX = 0;
			let translateY = 0;

			if (boxTransform && boxTransform !== 'none') {
				const matrix = boxTransform.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
				if (matrix) {
					const a = parseFloat(matrix[1]);
					const b = parseFloat(matrix[2]);
					translateX = parseFloat(matrix[5]);
					translateY = parseFloat(matrix[6]);
					rotation = Math.atan2(b, a); // 라디안 단위
				}
			}

			$box.css({ 'transform': 'none' });
			const boxPos = $box.position();

			// ⭐ 핵심 수정: 실제 렌더링된 크기를 정확히 측정
			let boxW = $box.outerWidth();  // padding 포함
			let boxH = $box.outerHeight(); // padding 포함

			// height가 여전히 0이면 scrollHeight 사용
			if (boxH <= 0) {
				boxH = $box[0].scrollHeight;
				console.warn('텍스트박스 높이가 0, scrollHeight 사용:', boxH);
			}

			// 그래도 0이면 콘텐츠 기반으로 계산
			if (boxH <= 0) {
				const lineHeight = parseInt($box.css('line-height')) || parseInt($box.css('font-size')) * 1.2;
				const lines = $box.html().split(/<br>|<div>/).length;
				boxH = lineHeight * lines + 20; // padding 추가
				console.warn('높이 계산 실패, 예상값 사용:', boxH);
			}

			const baseFontSize = $box.data('base-font-size') || 12;
			const textType = $box.data('text-type') || 'text';

			// ✅ relativeState에서 정렬 정보 가져오기
			const relativeState = $box.data('relativeState') || {};
			const alignment = relativeState.alignment || { horizontal: null, vertical: null };

			const textBoxData = {
				html: $box.html(),
				textType: textType,
				position: {
					left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100,
					top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100
				},
				// ✅ 중심점 좌표 추가 (회전된 요소의 위치 복원용)
				center: {
					x: ((boxPos.left + boxW / 2 - actualBgRect.left) / actualBgRect.width) * 100,
					y: ((boxPos.top + boxH / 2 - actualBgRect.top) / actualBgRect.height) * 100
				},
				size: {
					width: (boxW / actualBgRect.width) * 100,
					height: (boxH / actualBgRect.height) * 100  // ⭐ 실제 높이 저장
				},
				rotation: rotation,  // 추가
				translateX: (translateX / actualBgRect.width) * 100,  // 추가
				translateY: (translateY / actualBgRect.height) * 100,  // 추가
				transform: boxTransform || 'none',
				transformOrigin: boxTransformOrigin || '50% 50%',
				// ✅ 정렬 플래그 저장
				alignment: alignment,
				styles: {
					color: $box.css('color'),
					fontSize: baseFontSize,
					fontWeight: $box.css('font-weight'),
					textAlign: $box.css('text-align'),
					fontFamily: $box.data('savedFontFamily') || $box.css('font-family').split(',')[0].replace(/['"]/g, '').trim()
				},
				captureInfo: {
					scale: RENDER_SCALE,
					originalWidth: boxW,
					originalHeight: boxH,  // ⭐ 실제 높이 저장
					editorBgWidth: actualBgRect.width,
					editorBgHeight: actualBgRect.height,
					absolutePixels: {
						x: boxPos.left - actualBgRect.left,
						y: boxPos.top - actualBgRect.top,
						w: boxW,
						h: boxH
					}
				},
				isModified: true
			};

			// 높이 확인 로그
			console.log(`텍스트박스 ${i} - 너비: ${boxW}px, 높이: ${boxH}px`);
			console.log(`저장된 크기: width=${textBoxData.size.width}%, height=${textBoxData.size.height}%`);

			designData.textBoxes.push(textBoxData);

			// 원상 복구
			$box.css({
				'transform': boxTransform,
				'transform-origin': boxTransformOrigin,
				'white-space': originalWhiteSpace
			});

			// 텍스트박스를 이미지로 캡처 (고해상도로)
			try {
				// 캡처 전 준비
				const originalStyles = {
					overflow: $box.css('overflow'),
					height: $box.css('height'),
					width: $box.css('width'),
					minHeight: $box.css('min-height'),
					maxHeight: $box.css('max-height'),
					transform: $box.css('transform')  // transform도 저장
				};

				// Transform 임시 제거 (정확한 크기 측정을 위해)
				$box.css('transform', 'none');

				// 실제 콘텐츠 크기 측정
				const actualHeight = Math.max($box[0].scrollHeight, boxH);
				const actualWidth = Math.max($box[0].scrollWidth, boxW);

				// 캡처를 위한 크기 설정
				$box.css({
					'overflow': 'visible',
					'height': (actualHeight) + 'px',
					'width': (actualWidth) + 'px',
					'min-height': 'auto',
					'max-height': 'none'
				});

				// DOM 업데이트 대기
				await new Promise(resolve => setTimeout(resolve, 100));

				// 렌더링과 동일한 스케일로 캡처 (SCALE_RATIO = 3.33)
				const RENDER_SCALE = 2621 / 786;  // 약 3.33

				const canvas = await html2canvas($box[0], {
					scale: RENDER_SCALE,
					backgroundColor: null,
					logging: false,
					useCORS: true,
					letterRendering: true,
					allowTaint: true,  // 추가
					height: actualHeight + 5,
					width: actualWidth + 5
				});

				// 원본 스타일 복원
				$box.css(originalStyles);

				const blob = await new Promise(resolve => {
					canvas.toBlob(resolve, 'image/png', 1.0);  // 최고 품질
				});

				textBoxImages.push({
					index: designData.textBoxes.length - 1,
					blob: blob
				});

			} catch (error) {
				console.error('텍스트박스 캡처 실패:', error);
				if (originalStyles) {
					$box.css(originalStyles);
				}
			}
		}

		// ========== 마스크 처리 헬퍼 함수 추가 ==========
		async function applyRealMaskBeforeCapture() {
			const promises = [];

			$('#frame-container .frame-group:not(.element-frame):not(.textbox-frame)').each(function() {
				const $frame = $(this);
				const $maskContainer = $frame.find('.mask-container');
				const $photoContainer = $frame.find('.photo-container');
				const $photo = $frame.find('.uploaded-photo');
				const frameTheme = $frame.data('frameTheme');

				// ✅ 사진이 없어도 photo-container 배경은 투명하게 처리
				if (!$photo.is(':visible') || !$photo.attr('src') || !frameTheme?.editMaskPath) {
					// 사진이 없는 경우에도 배경색 투명 처리
					if ($photoContainer.length) {
						$photoContainer.data('_captureBackup', {
							backgroundColor: $photoContainer.css('background-color')
						});
						$photoContainer.css('background-color', 'transparent');
					}
					return;
				}

				const promise = new Promise((resolve) => {
					const maskImg = new Image();
					maskImg.crossOrigin = 'anonymous';

					maskImg.onload = function() {
						try {
							const containerWidth = $maskContainer.width();
							const containerHeight = $maskContainer.height();

							const canvas = document.createElement('canvas');
							canvas.width = containerWidth;
							canvas.height = containerHeight;
							const ctx2d = canvas.getContext('2d');

							// 마스크 그리기
							ctx2d.drawImage(maskImg, 0, 0, containerWidth, containerHeight);

							// source-in으로 사진 그리기
							ctx2d.globalCompositeOperation = 'source-in';

							const photoImg = $photo[0];
							const photoWidth = $photo.width();
							const photoHeight = $photo.height();

							// transform에서 translate 추출
							const transform = $photo.css('transform');
							let a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0;

							if (transform && transform !== 'none') {
								const matrix = transform.match(/matrix\(([^)]+)\)/);
								if (matrix) {
									const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
									a = values[0];   // cos(angle) * scaleX
									b = values[1];   // sin(angle) * scaleX
									c = values[2];   // -sin(angle) * scaleY
									d = values[3];   // cos(angle) * scaleY
									tx = values[4];  // translateX
									ty = values[5];  // translateY
								}
							}

							// ✅ 회전 각도 추출 (라디안)
							const rotation = Math.atan2(b, a);

							// ✅ Canvas에 transform 적용 후 사진 그리기
							ctx2d.save();

							if (rotation !== 0) {
								// ✅ 회전이 있는 경우: transform-origin (50% 50%) 적용

								// 사진 중심 좌표 계산 (translate 적용 후의 중심)
								const centerX = tx + photoWidth / 2;
								const centerY = ty + photoHeight / 2;

								// 1) 사진 중심으로 이동
								ctx2d.translate(centerX, centerY);

								// 2) 회전 적용
								ctx2d.rotate(rotation);

								// 3) 사진 크기의 절반만큼 역방향 이동 (사진 좌상단이 올바른 위치에 오도록)
								ctx2d.drawImage(photoImg, -photoWidth / 2, -photoHeight / 2, photoWidth, photoHeight);

							} else {
								// ✅ 회전이 없는 경우: 단순 translate만 적용
								ctx2d.drawImage(photoImg, tx, ty, photoWidth, photoHeight);
							}

							ctx2d.restore();

							// 원본 상태 저장
							$photo.data('_captureBackup', {
								src: $photo.attr('src'),
								css: {
									width: $photo.css('width'),
									height: $photo.css('height'),
									transform: $photo.css('transform'),
									left: $photo.css('left'),
									top: $photo.css('top')
								}
							});

							$maskContainer.data('_captureBackup', {
								webkitMask: $maskContainer.css('-webkit-mask-image'),
								mask: $maskContainer.css('mask-image')
							});

							// ✅ photo-container 배경색 저장 및 투명하게 변경
							$photoContainer.data('_captureBackup', {
								backgroundColor: $photoContainer.css('background-color')
							});
							$photoContainer.css('background-color', 'transparent');

							// 마스킹된 이미지로 교체
							$photo.attr('src', canvas.toDataURL('image/png'));
							$photo.css({
								width: containerWidth + 'px',
								height: containerHeight + 'px',
								transform: 'none',
								left: '0px',
								top: '0px'
							});

							$maskContainer.css({
								'-webkit-mask-image': 'none',
								'mask-image': 'none'
							});

							resolve();
						} catch (err) {
							console.error('마스크 캔버스 처리 실패:', err);
							resolve();
						}
					};

					maskImg.onerror = () => resolve();
					maskImg.src = `${ctx}${frameTheme.editMaskPath}`;
				});

				promises.push(promise);
			});

			await Promise.all(promises);
		}

		function restoreAfterCapture() {
			$('#frame-container .frame-group').each(function() {
				const $frame = $(this);
				const $maskContainer = $frame.find('.mask-container');
				const $photoContainer = $frame.find('.photo-container');
				const $photo = $frame.find('.uploaded-photo');

				const photoBackup = $photo.data('_captureBackup');
				if (photoBackup) {
					$photo.attr('src', photoBackup.src);
					$photo.css(photoBackup.css);
					$photo.removeData('_captureBackup');
				}

				const maskBackup = $maskContainer.data('_captureBackup');
				if (maskBackup) {
					$maskContainer.css({
						'-webkit-mask-image': maskBackup.webkitMask,
						'mask-image': maskBackup.mask
					});
					$maskContainer.removeData('_captureBackup');
				}

				// ✅ photo-container 배경색 복구
				const containerBackup = $photoContainer.data('_captureBackup');
				if (containerBackup) {
					$photoContainer.css('background-color', containerBackup.backgroundColor);
					$photoContainer.removeData('_captureBackup');
				}
			});
		}

		// ========== 기존 썸네일 캡처 코드 수정 ==========
		// 마스크 적용 (캡처 전)
		await applyRealMaskBeforeCapture();

		// 전체 페이지 썸네일 캡처
		const captureTarget = document.getElementById('page-preview');
		const thumbnailCanvas = await html2canvas(captureTarget, {
			useCORS: true,
			backgroundColor: null,
			scale: 1,
			x: actualBgRect.left,
			y: actualBgRect.top,
			width: actualBgRect.width,
			height: actualBgRect.height,
			scrollX: 0,
			scrollY: 0
		});

		// 원상 복구 (캡처 후)
		restoreAfterCapture();

		const thumbnailBlob = await new Promise(resolve => {
			thumbnailCanvas.toBlob(resolve, 'image/png');
		});

		// FormData 생성
		const formData = new FormData();
		const payload = {
			userId: $('#id').val(),
			yearbookId: activePageThumb?.attr('data-yearbook-id'),
			contentsId: activePageThumb?.attr('data-contents-id'),
			pageNo: activePageThumb?.attr('data-page-no'),
			designData: JSON.stringify(designData)
		};

		formData.append('payload', JSON.stringify(payload));
		formData.append('thumbnailFile', thumbnailBlob, 'thumbnail.png');

		// 텍스트박스 이미지들 추가
		textBoxImages.forEach(item => {
			formData.append(`textImage_${item.index}`, item.blob, `text_${item.index}.png`);
		});

		// 서버로 전송
		$.ajax({
			url: `${ctx}/edit/savePageWithTextImages`,
			method: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function(response) {
				if (response.success) {
					// 자동 저장 시에는 alert 표시하지 않음
					const isAutoSave = SessionManager.timer === null;
					if (!isAutoSave) {
						alert("This page has been saved.");
					}

					hasSaved = true;

					// 저장 시간 메시지 표시 추가
					displayLastSaveTime(new Date().toISOString());

					// 썸네일 업데이트
					if (response.newImagePath) {
						activePageThumb.attr('src', `${ctx}${response.newImagePath}?t=${new Date().getTime()}`);
					}

					// ID 업데이트
					if (response.newYearbookId) {
						activePageThumb.attr('data-yearbook-id', response.newYearbookId);
						activePageThumb.closest('.page-card').attr('id', `card-${response.newYearbookId}`);
					}

					// 텍스트 이미지 경로 저장 (디버깅용)
					if (response.textImagePaths) {
						console.log('텍스트 이미지 저장됨:', response.textImagePaths);
					}

					if (!shouldClose) {
						// 메시지가 계속 표시되도록 함
						$('#save-confirmation-message').show();
					}

					// shouldClose가 true이면 모달 닫기
					if (shouldClose) {
						setTimeout(function() {
							$('#editModal').modal('hide');
							setTimeout(function() {
								location.reload();
							}, 500);
						}, 1000);
					}
				} else {
					alert("Save failed: " + (response.message || "Unknown error"));
				}
			},
			error: function(err) {
				console.error("Save failed:", err);
				alert("Save failed.");
			},
			complete: function() {
				hideLoader();
				$(document).trigger('saveComplete');
			}
		});
	}

	// 파일 업로드 처리 (기존과 동일하므로 생략 - 필요시 추가)
	$('#image-upload-input').on('change', function(e) {
		const file = e.target.files[0];
		if (!file) {
			$(this).val('');
			return;
		}

		const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic'];
		const fileExtension = file.name.split('.').pop().toLowerCase();

		if (!allowedExtensions.includes(fileExtension)) {
			alert("Only JPG, PNG, and HEIC files can be uploaded.");
			$(this).val('');
			return;
		}

		const fileSizeInKB = file.size / 1024;
		const $input = $(this);

		if (fileSizeInKB < 400) {
			// 나중에 사용할 데이터 임시 저장
			$input.data('pendingFile', file);
			$input.data('pendingFrameGroup', $input.data('targetFrameGroup'));
			$input.data('pendingPhoto', $input.data('targetUploadedPhoto'));
			$input.data('pendingPlaceholder', $input.data('targetPlaceholderLink'));

			// 모달 표시
			$('#fileSizeWarningModal').modal('show');
			return;
		}

		const frameGroup = $input.data('targetFrameGroup');
		const photo = $input.data('targetUploadedPhoto');
		const placeholder = $input.data('targetPlaceholderLink');
		const mask = $input.data('targetMaskContainer');

		if (!frameGroup || !photo || !placeholder || !mask) return;

		// HEIC 처리를 포함한 업로드
		processAndUploadImage(file, frameGroup, photo, placeholder);
	});

	// 모달 Confirm 버튼 클릭 이벤트
	$(document).on('click', '#btn-file-size-confirm', function() {
		const $input = $('#image-upload-input');
		const file = $input.data('pendingFile');
		const frameGroup = $input.data('pendingFrameGroup');
		const photo = $input.data('pendingPhoto');
		const placeholder = $input.data('pendingPlaceholder');

		// 모달 닫기
		$('#fileSizeWarningModal').modal('hide');

		// 파일 처리 진행
		if (file && frameGroup && photo && placeholder) {
			processAndUploadImage(file, frameGroup, photo, placeholder);
		}

		// 임시 데이터 삭제
		$input.removeData('pendingFile pendingFrameGroup pendingPhoto pendingPlaceholder');
	});

	// 모달 Cancel 버튼 클릭 이벤트
	$(document).on('click', '#btn-file-size-cancel', function() {
		const $input = $('#image-upload-input');

		// 입력 초기화
		$input.val('');

		// 임시 데이터 삭제
		$input.removeData('pendingFile pendingFrameGroup pendingPhoto pendingPlaceholder');

		// 모달 닫기
		$('#fileSizeWarningModal').modal('hide');
	});

	// 모달이 닫힐 때 정리 작업
	$('#fileSizeWarningModal').on('hidden.bs.modal', function() {
		const $input = $('#image-upload-input');

		// 임시 데이터가 남아있으면 입력 초기화
		if ($input.data('pendingFile')) {
			$input.val('');
			$input.removeData('pendingFile pendingFrameGroup pendingPhoto pendingPlaceholder');
		}
	});

	// 통합 처리 함수
	async function processAndUploadImage(file, frameGroup, photo, placeholder) {
		showLoader();

		try {
			let processedFile = file;
			const fileExtension = file.name.split('.').pop().toLowerCase();

			// HEIC인 경우 JPEG로 변환
			if (fileExtension === 'heic' || fileExtension === 'heic') {
				processedFile = await convertHeicToJpeg(file);
			}

			// 클라이언트에서 편집용 버전 생성
			const editBlob = await createEditVersion(processedFile);

			// FormData에 원본과 편집용 모두 추가
			const formData = new FormData();
			formData.append('originalFile', processedFile,
				file.name.replace(/\.heic$/i, '.jpg'));
			formData.append('editFile', editBlob,
				'edit_' + file.name.replace(/\.heic$/i, '.jpg'));

			// 서버로 전송
			$.ajax({
				url: `${ctx}/edit/uploadImageVersions`,
				method: 'POST',
				data: formData,
				processData: false,
				contentType: false,
				success: function(response) {
					if (response.success) {
						displayImageWithVersions(
							response.editPath,
							response.originalPath,
							frameGroup,
							photo,
							placeholder
						);
					} else {
						alert("Upload failed");
					}
				},
				error: function(xhr) {
					const errorMsg = xhr.responseJSON?.error || "Upload failed";
					alert(errorMsg);
				},
				complete: function() {
					hideLoader();
					$('#image-upload-input').val('');
				}
			});

		} catch (error) {
			console.error('Image processing error:', error);
			alert('An error occurred while processing the image:' + error.message);
			hideLoader();
			$('#image-upload-input').val('');
		}
	}

	// HEIC 변환 함수 (서버 폴백 추가)
	function convertHeicToJpeg(heicFile) {
		return new Promise((resolve, reject) => {
			// 1차: heic2any로 클라이언트 변환 시도
			if (typeof heic2any !== 'undefined') {
				heic2any({
					blob: heicFile,
					toType: "image/jpeg",
					quality: 0.9,
					multiple: false
				})
					.then(result => {
						console.log('heic2any 변환 성공');
						const blob = Array.isArray(result) ? result[0] : result;
						resolve(blob);
					})
					.catch(error => {
						console.error('heic2any 변환 실패, 서버 폴백 시도:', error);
						// 2차: 서버에서 변환 시도
						convertHeicOnServer(heicFile)
							.then(resolve)
							.catch(reject);
					});
			} else {
				// heic2any 라이브러리 없으면 바로 서버 폴백
				console.log('heic2any 없음, 서버 변환 시도');
				convertHeicOnServer(heicFile)
					.then(resolve)
					.catch(reject);
			}
		});
	}

	// 서버에서 HEIC 변환 (pillow-heif 사용)
	function convertHeicOnServer(heicFile) {
		return new Promise((resolve, reject) => {
			const formData = new FormData();
			formData.append('file', heicFile);

			$.ajax({
				url: `${ctx}/edit/convertHeic`,
				method: 'POST',
				data: formData,
				processData: false,
				contentType: false,
				xhrFields: {
					responseType: 'blob'
				},
				success: function(blob) {
					console.log('서버 HEIC 변환 성공');
					resolve(blob);
				},
				error: function(xhr) {
					console.error('서버 HEIC 변환 실패:', xhr);
					reject(new Error('HEIC 파일을 변환할 수 없습니다. 아이폰 설정에서 "호환성 우선"으로 변경 후 다시 시도해주세요.'));
				}
			});
		});
	}

	// 클라이언트에서 편집용 버전 생성
	function createEditVersion(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = function(e) {
				const img = new Image();

				img.onload = function() {
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');

					// 최대 800px로 제한
					const maxSize = 800;
					let width = img.width;
					let height = img.height;

					if (width > height && width > maxSize) {
						height = Math.round((maxSize / width) * height);
						width = maxSize;
					} else if (height > maxSize) {
						width = Math.round((maxSize / height) * width);
						height = maxSize;
					}

					canvas.width = width;
					canvas.height = height;

					// 이미지 그리기
					ctx.drawImage(img, 0, 0, width, height);

					// Blob으로 변환 (JPEG, 85% 품질)
					canvas.toBlob(
						blob => resolve(blob),
						'image/jpeg',
						0.85
					);
				};

				img.onerror = () => reject(new Error('이미지 로드 실패'));
				img.src = e.target.result;
			};

			reader.onerror = () => reject(new Error('파일 읽기 실패'));

			// File이 이미 Blob이므로 바로 읽기 가능
			reader.readAsDataURL(file);
		});
	}

	// 전역 변수로 리셋 타입과 페이지 ID 저장
	let modalActionType = null; // 'clear', 'page', 'save', 'close'
	let pageIdToReset = null;

	// 클리어 버튼 - 모달 표시 (편집 중인 페이지 리셋)
	$('#btn-clear').on('click', function() {
		modalActionType = 'clear';
		pageIdToReset = null;

		// 모달 내용 업데이트
		$('#clearConfirmModalLabel').text('Reset Page Design');
		$('#clearConfirmModal .modal-body').html(`
	        <p>All designs on this page will be reset.</p>
	        <p>This action cannot be undone. Are you sure you want to proceed?</p>
	    `);

		$('#clearConfirmModal').modal('show');
	});


	// 전역 이벤트 설정
	EventManager.setupGlobalEvents();

	// Debounce 함수
	function debounce(func, wait) {
		let timeout;
		return function(...args) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	// 윈도우 리사이즈 이벤트
	$(window).on('resize', debounce(function() {
		console.log("resize");
		if ($('#editModal').is(':visible')) {
			window.safeLineManager.update();
			window.updateAllPositions();
			updateAllPhotosPosition();
		}
	}, 250));

	// Menu dots 버튼 클릭 - 페이지 리셋
	$('.content').on('click', '.menu-dots-btn', function(e) {
		e.stopPropagation();
		const cardId = $(this).closest('.page-card').attr('id');
		const yearbookId = cardId ? parseInt(cardId.split('-')[1], 10) : null;

		if (!yearbookId) {
			alert("This page has not been saved yet and cannot be reset.");
			return;
		}

		modalActionType = 'page';
		pageIdToReset = yearbookId;

		// 모달 내용 업데이트
		$('#clearConfirmModalLabel').text('Reset Page');
		$('#clearConfirmModal .modal-body').html(`
	        <p>All designs on this page will be permanently reset.</p>
	        <p>This action cannot be undone. Are you sure you want to proceed?</p>
	    `);

		$('#clearConfirmModal').modal('show');
	});

	// Save & Close 버튼 클릭 이벤트
	$(document).on('click', '#btn-save-close', function() {
		// Clear 직후 빈 페이지인지 확인
		const bgImg = $('#page-preview-img').attr('src');
		const hasFrames = $('#frame-container .frame-group').length > 0;
		const hasTextBoxes = $('#frame-container .text-box').length > 0;

		if (!hasFrames && !hasTextBoxes && bgImg.includes('background.png')) {
			// 빈 페이지인 경우 placeholder 설정 후 바로 닫기
			if (activePageThumb) {
				activePageThumb.attr('src', '/images/placeholder.png');
			}
			$('#clearConfirmModal').modal('hide');
			$('#editModal').modal('hide');
			/*showSuccessMessage('Page has been reset to empty state.');*/
			return;
		}

		$('#clearConfirmModal').modal('hide');
		executeSave(true); // true = close after save
	});

	// Save & Continue 버튼 클릭 이벤트
	$(document).on('click', '#btn-save-continue', function() {
		$('#clearConfirmModal').modal('hide');
		executeSave(false); // false = continue editing
	});

	// Exit without Saving 버튼 클릭 이벤트
	$(document).on('click', '#btn-exit-without-saving', function() {
		// ✅ clearConfirmModal이 완전히 닫힌 후 editModal 닫기
		$('#clearConfirmModal').one('hidden.bs.modal', function() {
			$('#editModal').modal('hide');
		});
		$('#clearConfirmModal').modal('hide');
	});

	// Reset 버튼 클릭 이벤트 - 통합 처리
	$(document).on('click', '#btn-confirm-clear', function() {
		const $btn = $(this);
		const originalText = $btn.text();

		if (modalActionType === 'clear') {
			// 편집 중인 페이지도 서버의 데이터를 실제로 리셋
			const yearbookId = activePageThumb?.attr('data-yearbook-id');

			if (!yearbookId) {
				// 저장된 적이 없는 새 페이지는 로컬 초기화만
				$('#clearConfirmModal').modal('hide');
				showLoader();
				setTimeout(function() {
					forceCompleteReset();
					loadDefaultBackground();
					hideLoader();
				}, 300);
				return;
			}

			// 저장된 페이지는 서버 데이터도 리셋
			$btn.prop('disabled', true)
				.html('<span class="spinner-border spinner-border-sm"></span>Resetting...');

			$.ajax({
				url: `${ctx}/edit/resetPage`,
				method: 'POST',
				data: { id: yearbookId },
				success: function(response) {
					$('#clearConfirmModal').modal('hide');

					if (response.success) {
						// 로컬 초기화
						forceCompleteReset();
						loadDefaultBackground();

						// 썸네일 업데이트
						if (activePageThumb) {
							activePageThumb.attr('src', '/images/placeholder.png');
							activePageThumb.removeAttr('data-yearbook-id');
						}

						/*showSuccessMessage("The page has been reset successfully.");*/
					} else {
						/*showErrorMessage("Failed to reset the page. " + (response.message || ""));*/
					}
				},
				error: function() {
					$('#clearConfirmModal').modal('hide');
					/*showErrorMessage("An error occurred while communicating with the server.");*/
				},
				complete: function() {
					$btn.prop('disabled', false).text(originalText);
					hideLoader();
				}
			});

		} else if (modalActionType === 'page' && pageIdToReset) {
			// 저장된 페이지 리셋 (서버)
			$btn.prop('disabled', true)
				.html('<span class="spinner-border spinner-border-sm"></span>Resetting...');

			$.ajax({
				url: `${ctx}/edit/resetPage`,
				method: 'POST',
				data: { id: pageIdToReset },
				success: function(response) {
					$('#clearConfirmModal').modal('hide');

					if (response.success) {
						/*showSuccessMessage("The page has been reset successfully.");*/
						setTimeout(function() {
							location.reload();
						}, 1000);
					} else {
						console.log("Failed to reset the page.");
						/*showErrorMessage("Failed to reset the page. " + (response.message || ""));*/
					}
				},
				error: function() {
					$('#clearConfirmModal').modal('hide');
					console.log("An error occurred while communicating with the server.");
					/*showErrorMessage("An error occurred while communicating with the server.");*/
				},
				complete: function() {
					$btn.prop('disabled', false).text(originalText);
				}
			});
		}
	});

	// 모달이 닫힐 때 초기화
	$('#clearConfirmModal').on('hidden.bs.modal', function() {
		modalActionType = null;
		pageIdToReset = null;
		// ⭐ 모달을 원본 상태로 복원
		$('#clearConfirmModalLabel').text('Reset Page Design');
		$('#clearConfirmModal .modal-body').html(`
		        <p>All designs on this page will be reset.</p>
		        <p>This action cannot be undone. Are you sure you want to proceed?</p>
		    `);
		$('#clearConfirmModal .modal-footer').html(`
		        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
		        <button type="button" class="btn btn-danger" id="btn-confirm-clear">Reset</button>
		    `);
	});

	// 성공 메시지 표시 함수
	function showSuccessMessage(message) {
		const $alert = $(`
	        <div class="alert alert-success alert-dismissible fade show" role="alert">
	            ${message}
	            <button type="button" class="close" data-dismiss="alert">
	                <span>&times;</span>
	            </button>
	        </div>
	    `);

		$alert.css({
			'position': 'fixed',
			'top': '20px',
			'right': '20px',
			'z-index': '9999'
		});

		$('body').append($alert);

		setTimeout(function() {
			$alert.fadeOut(300, function() {
				$(this).remove();
			});
		}, 3000);
	}

	// 에러 메시지 표시 함수
	function showErrorMessage(message) {
		const $alert = $(`
	        <div class="alert alert-danger alert-dismissible fade show" role="alert">
	            ${message}
	            <button type="button" class="close" data-dismiss="alert">
	                <span>&times;</span>
	            </button>
	        </div>
	    `);

		$alert.css({
			'position': 'fixed',
			'top': '20px',
			'right': '20px',
			'z-index': '9999'
		});

		$('body').append($alert);

		setTimeout(function() {
			$alert.fadeOut(300, function() {
				$(this).remove();
			});
		}, 5000);
	}

	// 'Move Pages' 토글 스위치 변경 이벤트
	$('#toggle-page-move').on('change', function() {
		isMoveModeActive = $(this).is(':checked');
		const $pageCards = $('.page-card');

		if (isMoveModeActive) {
			$pageCards.attr('draggable', 'true');
		} else {
			$pageCards.attr('draggable', 'false');
		}
	});

	// 드래그 시작
	$('.content').on('dragstart', '.page-card', function(e) {
		if (!isMoveModeActive) return;
		draggedCardId = this.id;
		$(this).addClass('dragging');
		e.originalEvent.dataTransfer.setData('text/plain', this.id);
		e.originalEvent.dataTransfer.effectAllowed = 'move';
	});

	// 드래그 종료
	$('.content').on('dragend', '.page-card', function() {
		$(this).removeClass('dragging');
		$('.drop-placeholder').remove();
		draggedCardId = null;
	});

	// dragover 이벤트를 .slide-container에서 처리
	$('.content').on('dragover', '.slide-container', function(e) {
		e.preventDefault();
		if (!isMoveModeActive) return;

		const afterElement = getDragAfterElement(this, e.originalEvent.clientX);
		const placeholder = $(this).find('.drop-placeholder');

		if (placeholder.length === 0) {
			$(this).append('<div class="drop-placeholder"></div>');
		}

		if (afterElement == null) {
			$(this).append(placeholder);
		} else {
			$(afterElement).before(placeholder);
		}
	});

	// drop 이벤트 처리 후 자동 저장 함수 호출
	$('.content').on('drop', '.slide-container', function(e) {
		e.preventDefault();
		const placeholder = $(this).find('.drop-placeholder');
		const draggedElement = document.getElementById(draggedCardId);

		if (placeholder.length > 0 && draggedElement) {
			placeholder.replaceWith(draggedElement);
			savePageOrder();
		}
	});

	// 기타 설정
	$(document).on('click', '.edit-btn', function() {
		const pageCategory = $(this).data('category');
		$('#editModal').data('page-category', pageCategory);
		console.log('Setting page category to:', pageCategory);
	});

});

// ============================================================================
// 전역 함수들
// ============================================================================

function restoreTextBoxWithTransform($box) {
	const relativeState = $box.data('relativeState');
	if (!relativeState) return;

	const bg = $('#page-preview-img');
	const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
	if (!actualBgRect) return;

	const savedFontSize = $box.data('savedFontSize');
	const savedFontFamily = $box.data('savedFontFamily');

	if (savedFontSize) {
		$box.css('font-size', savedFontSize);
		console.log('저장된 폰트 크기 복원:', savedFontSize);
	}

	if (savedFontFamily) {
		$box.css('font-family', savedFontFamily);
	}

	const pixelPos = {
		left: (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left,
		top: (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top
	};

	const pixelSize = {
		width: (relativeState.size.width / 100) * actualBgRect.width,
		height: (relativeState.size.height / 100) * actualBgRect.height
	};

	$box.css({
		left: pixelPos.left,
		top: pixelPos.top,
		width: pixelSize.width,
		height: pixelSize.height,
		transform: 'none'
	});

	setTimeout(() => {
		if (relativeState.transform && relativeState.transform !== 'none') {
			console.log('Transform 적용:', relativeState.transform);
			$box.css({
				'transform': relativeState.transform,
				'transform-origin': relativeState.transformOrigin || '50% 50%'
			});
		}
	}, 10);
}

window.getRotationMatrix = function($element) {
	const transform = $element.css('transform');
	if (!transform || transform === 'none') {
		return 'none';
	}

	const matrix = transform.match(/matrix\((.+)\)/);
	if (matrix && matrix[1]) {
		const values = matrix[1].split(',').map(s => s.trim());
		return `matrix(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, 0, 0)`;
	}
	return transform;
};

window.getRotationAngle = function(transform) {
	if (!transform || transform === 'none') return 0;

	const matrix = transform.match(/matrix\((.+)\)/);
	if (matrix && matrix[1]) {
		const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
		const angle = Math.atan2(values[1], values[0]);
		return angle * (180 / Math.PI);
	}
	return 0;
};

window.getScaleFromMatrix = function(transform) {
	if (!transform || transform === 'none') return { x: 1, y: 1 };

	const matrix = transform.match(/matrix\((.+)\)/);
	if (matrix && matrix[1]) {
		const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
		const scaleX = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
		const scaleY = Math.sqrt(values[2] * values[2] + values[3] * values[3]);
		return { x: scaleX, y: scaleY };
	}
	return { x: 1, y: 1 };
};

/**
 * ✅ 이미지 로드 완료 후 사진 위치/크기 적용
 * renderPage에서 이미지 로드 완료 시 호출됨
 */
function applyPhotoPositionAfterLoad($frame, $photo) {
	const maskBounds = PhotoManager.getMaskBoundsPixels($frame);
	const relativeState = $photo.data('relativeState');
	
	// 저장된 상태가 없거나 sizePercent가 없으면 기본 cover 모드로 배치
	if (!relativeState || !relativeState.sizePercent) {
		const maskContainer = $frame.find('.mask-container');
		if (maskContainer.length) {
			positionImageInMaskAdvanced($photo, maskContainer, {
				fit: 'cover',
				position: 'center'
			});
		}
		console.log('[applyPhotoPositionAfterLoad] 저장된 상태 없음 - cover 모드 적용');
		return;
	}
	
	// percentState 설정 (relativeState에서 변환)
	$photo.data('percentState', {
		widthPercent: relativeState.sizePercent.width,
		heightPercent: relativeState.sizePercent.height,
		translateXPercent: relativeState.translateX || 0,
		translateYPercent: relativeState.translateY || 0,
		rotation: relativeState.rotation || 0
	});
	
	// 크기/위치 계산 및 적용
	const percentState = $photo.data('percentState');
	const newWidth = (percentState.widthPercent / 100) * maskBounds.width;
	const newHeight = (percentState.heightPercent / 100) * maskBounds.height;
	
	// 마스크 내부 상대 좌표에서 절대 좌표로 변환
	const relTranslateX = (percentState.translateXPercent / 100) * maskBounds.width;
	const relTranslateY = (percentState.translateYPercent / 100) * maskBounds.height;
	const newTranslateX = relTranslateX + maskBounds.x;
	const newTranslateY = relTranslateY + maskBounds.y;
	
	let finalTransform;
	if (percentState.rotation !== 0) {
		const cos = Math.cos(percentState.rotation);
		const sin = Math.sin(percentState.rotation);
		finalTransform = `matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${newTranslateX}, ${newTranslateY})`;
	} else {
		finalTransform = `matrix(1, 0, 0, 1, ${newTranslateX}, ${newTranslateY})`;
	}
	
	$photo.css({
		display: 'block',
		width: newWidth + 'px',
		height: newHeight + 'px',
		left: '0px',
		top: '0px',
		transform: finalTransform,
		transformOrigin: '50% 50%'
	});
	
	console.log('[applyPhotoPositionAfterLoad] 사진 위치 적용 완료:', {
		maskBounds: maskBounds,
		size: { width: newWidth, height: newHeight },
		translate: { x: newTranslateX, y: newTranslateY }
	});
}

/**
 * ✅ 모든 사진 이미지 로드 완료 대기
 * shown.bs.modal에서 호출하여 이미지 로드 후 위치 계산
 */
function waitForAllPhotosLoaded() {
	return new Promise((resolve) => {
		const $photos = $('#frame-container .frame-group .uploaded-photo');
		
		if ($photos.length === 0) {
			resolve();
			return;
		}
		
		const photoPromises = [];
		
		$photos.each(function() {
			const $photo = $(this);
			const src = $photo.attr('src');
			
			// src가 없거나 빈 값이면 건너뜀
			if (!src || src === '#') {
				return;
			}
			
			const photoElement = $photo[0];
			
			// 이미 로드 완료된 경우
			if (photoElement.complete && photoElement.naturalWidth > 0) {
				return;
			}
			
			// 로드 대기
			const promise = new Promise((resolvePhoto) => {
				const onLoad = () => {
					$photo.off('load.wait error.wait');
					resolvePhoto();
				};
				const onError = () => {
					$photo.off('load.wait error.wait');
					resolvePhoto();
				};
				
				$photo.on('load.wait', onLoad);
				$photo.on('error.wait', onError);
				
				// 타임아웃 (5초)
				setTimeout(() => {
					$photo.off('load.wait error.wait');
					resolvePhoto();
				}, 5000);
			});
			
			photoPromises.push(promise);
		});
		
		if (photoPromises.length === 0) {
			resolve();
		} else {
			Promise.all(photoPromises).then(resolve);
		}
	});
}

function updateAllPhotosPosition() {
	$('#frame-container .frame-group').each(function() {
		const $frame = $(this);
		const $photo = $frame.find('.uploaded-photo');
		const $placeholder = $frame.find('.place-image-here-link');
		const photoSrc = $photo.attr('src');

		if (photoSrc && photoSrc !== '#') {
			$placeholder.hide();

			// ✅ 마스크 bounds 픽셀 좌표 가져오기
			const maskBounds = PhotoManager.getMaskBoundsPixels($frame);

			// percentState가 없으면 relativeState에서 변환
			if (!$photo.data('percentState')) {
				const photoRelativeState = $photo.data('relativeState');

				if (photoRelativeState && photoRelativeState.sizePercent) {
					$photo.data('percentState', {
						widthPercent: photoRelativeState.sizePercent.width,
						heightPercent: photoRelativeState.sizePercent.height,
						translateXPercent: photoRelativeState.translateX || 0,
						translateYPercent: photoRelativeState.translateY || 0,
						rotation: photoRelativeState.rotation || 0
					});
				}
			}

			// ✅ 마스크 bounds 기준으로 크기/위치 계산
			const percentState = $photo.data('percentState');
			if (percentState) {
				const newWidth = (percentState.widthPercent / 100) * maskBounds.width;
				const newHeight = (percentState.heightPercent / 100) * maskBounds.height;

				// 마스크 내부 상대 좌표에서 절대 좌표로 변환
				const relTranslateX = (percentState.translateXPercent / 100) * maskBounds.width;
				const relTranslateY = (percentState.translateYPercent / 100) * maskBounds.height;
				const newTranslateX = relTranslateX + maskBounds.x;
				const newTranslateY = relTranslateY + maskBounds.y;

				let finalTransform;
				if (percentState.rotation !== 0) {
					const cos = Math.cos(percentState.rotation);
					const sin = Math.sin(percentState.rotation);
					finalTransform = `matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${newTranslateX}, ${newTranslateY})`;
				} else {
					finalTransform = `matrix(1, 0, 0, 1, ${newTranslateX}, ${newTranslateY})`;
				}

				$photo.css({
					display: 'block',
					visibility: 'visible',
					width: newWidth + 'px',
					height: newHeight + 'px',
					left: '0px',
					top: '0px',
					transform: finalTransform,
					transformOrigin: '50% 50%'
				});
			} else {
				// ✅ percentState가 없으면 기본 cover 모드로 배치
				const maskContainer = $frame.find('.mask-container');
				if (maskContainer.length && $photo[0].naturalWidth > 0) {
					positionImageInMaskAdvanced($photo, maskContainer, {
						fit: 'cover',
						position: 'center'
					});
					$photo.css('visibility', 'visible');
					console.log('[updateAllPhotosPosition] percentState 없음 - cover 모드 적용');
				} else if ($photo[0].naturalWidth > 0) {
					// 마스크가 없는 경우 단순 표시
					$photo.css({
						display: 'block',
						visibility: 'visible'
					});
				}
			}

			if ($photo.hasClass('selected-photo')) {
				PhotoManager.updateSilhouetteSize($photo);
				PhotoManager.updateSelectionUI($photo);
			}
		} else {
			$placeholder.show();
			$photo.hide();
		}
	});
}

window.getTranslateValues = function(transformString) {
	if (!transformString || transformString === 'none') {
		return { x: 0, y: 0 };
	}

	// 1. matrix 형태에서 위치 값(tx, ty) 추출 시도
	let matrix = transformString.match(/matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
	if (matrix) {
		return { x: parseFloat(matrix[5]), y: parseFloat(matrix[6]) };
	}

	// 2. matrix가 아닐 경우, translate 형태에서 위치 값 추출 시도
	let translate = transformString.match(/translate\(([^,p]+)px,\s*([^,p]+)px\)/);
	if (translate) {
		return { x: parseFloat(translate[1]), y: parseFloat(translate[2]) };
	}

	// 3. 둘 다 아닐 경우 (예: rotate만 있을 경우) 위치는 0, 0
	return { x: 0, y: 0 };
};

// 이미지 표시 함수
function displayImageWithVersions(editPath, originalPath, frameGroup, photo, placeholder) {
	const fullEditPath = `${ctx}${editPath}`;

	// 편집 중에는 편집용 이미지 사용
	photo.attr('src', fullEditPath).css('display', 'block');

	// 데이터 저장
	photo.data({
		'editPath': editPath,
		'originalPath': originalPath,
		'filePath': originalPath, // 호환성
		'currentDisplay': 'edit' // 현재 표시 중인 버전
	});

	photo.on('load', function() {
		// 초기 위치 설정 로직...
		const maskContainer = frameGroup.find('.mask-container');
		if (maskContainer.length) {
			// 기본 cover 모드로 위치 설정
			positionImageInMaskAdvanced(photo, maskContainer, {
				fit: 'cover',
				position: 'center'
			});
		} else {
			// 마스크가 없는 경우 기본 위치
			positionImageInMask(photo, frameGroup);
		}

		placeholder.hide();
		window.selectionManager.clearSelection();
	});

	photo.on('error', function() {
		console.error('이미지 로드 실패:', fullEditPath);
		alert('The image cannot be displayed.');
		photo.hide();
		placeholder.show();
	});
}

// 성능 측정 (디버깅용)
function measurePerformance(operation, callback) {
	const startTime = performance.now();

	return callback().then(result => {
		const endTime = performance.now();
		console.log(`${operation}: ${(endTime - startTime).toFixed(2)}ms`);
		return result;
	});
}

// 개선된 버전 - 마스크 bounds 기준
function positionImageInMaskAdvanced(photo, maskContainer, options = {}) {
	const settings = {
		fit: 'cover', // 'cover', 'contain', 'fill', 'none'
		position: 'center', // 'center', 'top', 'bottom', 'left', 'right'
		...options
	};

	const frameGroup = photo.closest('.frame-group');

	// ✅ 마스크 bounds 픽셀 좌표 가져오기
	const maskBounds = PhotoManager.getMaskBoundsPixels(frameGroup);

	// 마스크 bounds 영역을 기준으로 계산
	const targetWidth = maskBounds.width;
	const targetHeight = maskBounds.height;
	const offsetX = maskBounds.x;
	const offsetY = maskBounds.y;

	if (!photo[0].naturalWidth) {
		photo.on('load', function() {
			positionImageInMaskAdvanced(photo, maskContainer, settings);
		});
		return;
	}

	const imgNaturalWidth = photo[0].naturalWidth;
	const imgNaturalHeight = photo[0].naturalHeight;

	let scale, newWidth, newHeight;

	// Fit 모드에 따른 스케일 계산
	switch (settings.fit) {
		case 'cover':
			scale = Math.max(targetWidth / imgNaturalWidth, targetHeight / imgNaturalHeight);
			break;

		case 'contain':
			scale = Math.min(targetWidth / imgNaturalWidth, targetHeight / imgNaturalHeight);
			break;

		case 'fill':
			newWidth = targetWidth;
			newHeight = targetHeight;
			break;

		case 'none':
			scale = 1;
			break;

		default:
			scale = Math.max(targetWidth / imgNaturalWidth, targetHeight / imgNaturalHeight);
	}

	if (settings.fit !== 'fill') {
		newWidth = imgNaturalWidth * scale;
		newHeight = imgNaturalHeight * scale;
	}

	// Position에 따른 위치 계산 (마스크 bounds 내부 기준)
	let translateX, translateY;

	switch (settings.position) {
		case 'top':
			translateX = offsetX + (targetWidth - newWidth) / 2;
			translateY = offsetY;
			break;

		case 'bottom':
			translateX = offsetX + (targetWidth - newWidth) / 2;
			translateY = offsetY + targetHeight - newHeight;
			break;

		case 'left':
			translateX = offsetX;
			translateY = offsetY + (targetHeight - newHeight) / 2;
			break;

		case 'right':
			translateX = offsetX + targetWidth - newWidth;
			translateY = offsetY + (targetHeight - newHeight) / 2;
			break;

		case 'center':
		default:
			translateX = offsetX + (targetWidth - newWidth) / 2;
			translateY = offsetY + (targetHeight - newHeight) / 2;
			break;
	}

	// CSS 적용
	photo.css({
		width: `${newWidth}px`,
		height: `${newHeight}px`,
		left: '0px',
		top: '0px',
		transform: `matrix(1, 0, 0, 1, ${translateX}, ${translateY})`,
		transformOrigin: '50% 50%',
		position: 'absolute',
		maxWidth: 'none',
		maxHeight: 'none'
	});

	// 상태 저장 (마스크 bounds 기준)
	PhotoManager.savePhotoState(photo, frameGroup, { isManual: false });

	console.log('Image positioned in mask bounds:', {
		maskBounds: maskBounds,
		imageSize: { width: newWidth, height: newHeight },
		translate: { x: translateX, y: translateY }
	});
}

// 이미지 상태 저장 헬퍼
function saveImageState(photo, state) {
	const currentState = photo.data('relativeState') || {};

	// 백그라운드 정보 가져오기
	const bg = $('#page-preview-img');
	const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);

	const updatedState = {
		...currentState,
		...state,
		editPath: photo.data('editPath'),
		originalPath: photo.data('originalPath'),
		lastModified: new Date().toISOString()
	};

	// 백분율 기반 위치 정보 추가
	if (actualBgRect && state.position) {
		// leftPx, topPx가 실제 translate 값이므로 백분율로 변환
		updatedState.translateX = (state.position.leftPx / actualBgRect.width) * 100;
		updatedState.translateY = (state.position.topPx / actualBgRect.height) * 100;

		// 크기도 백분율로 추가 저장
		if (state.size) {
			updatedState.sizePercent = {
				width: (state.size.widthPx / actualBgRect.width) * 100,
				height: (state.size.heightPx / actualBgRect.height) * 100
			};
		}

		// rotation은 0으로 초기화 (아직 회전하지 않았으므로)
		updatedState.rotation = 0;
	}

	photo.data('relativeState', updatedState);

	// 프레임 그룹에도 업데이트
	const frameGroup = photo.closest('.frame-group');
	if (frameGroup.length) {
		const frameState = frameGroup.data('relativeState') || {};
		frameState.photo = updatedState;
		frameGroup.data('relativeState', frameState);
	}
}