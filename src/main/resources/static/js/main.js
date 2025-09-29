$(document).ready(function() {

	let activePageThumb = null;
	let hasSaved = false;

	// 전역 인스턴스 초기화
	window.selectionManager = new SelectionManager();
	window.safeLineManager = new SafeLineManager();
	window.panelManager = new PanelManager();

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

		const newPixelPos = {
			left: (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left,
			top: (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top
		};

		const newPixelSize = {
			width: (relativeState.size.width / 100) * actualBgRect.width,
			height: (relativeState.size.height / 100) * actualBgRect.height
		};

		let finalTransform = 'none';

		if (relativeState.rotation !== undefined && relativeState.rotation !== 0) {

			const cos = Math.cos(relativeState.rotation);
			const sin = Math.sin(relativeState.rotation);

			// 백분율로 저장된 translate를 픽셀로 변환
			const translateX = (relativeState.translateX || 0) / 100 * actualBgRect.width;
			const translateY = (relativeState.translateY || 0) / 100 * actualBgRect.height;

			// 고정밀 matrix 생성 (소수점 6자리까지)
			finalTransform = `matrix(${cos.toFixed(6)}, ${sin.toFixed(6)}, ${(-sin).toFixed(6)}, ${cos.toFixed(6)}, ${translateX.toFixed(2)}, ${translateY.toFixed(2)})`;
		} else if (relativeState.translateX || relativeState.translateY) {
			// 회전 없이 이동만 있는 경우
			const translateX = (relativeState.translateX || 0) / 100 * actualBgRect.width;
			const translateY = (relativeState.translateY || 0) / 100 * actualBgRect.height;
			finalTransform = `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px)`;
		}

		// Transform origin 재구성
		const transformOrigin = `${relativeState.transformOriginX || 50}% ${relativeState.transformOriginY || 50}%`;

		const finalCss = {
			left: newPixelPos.left.toFixed(2) + 'px',
			top: newPixelPos.top.toFixed(2) + 'px',
			width: newPixelSize.width.toFixed(2) + 'px',
			height: newPixelSize.height.toFixed(2) + 'px',
			transform: finalTransform,
			transformOrigin: transformOrigin,
			visibility: 'visible'
		};

		// 텍스트박스 처리
		if ($element.hasClass('text-box')) {
			const baseFontSize = $element.data('base-font-size') || 12;
			const TEMPLATE_WEB_BG_WIDTH = 786;
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
			finalCss['font-size'] = Math.round(baseFontSize * scaleRatio) + 'px';
			if ($element.data('savedFontFamily')) {
				finalCss['font-family'] = $element.data('savedFontFamily');
			}
		}

		console.log(finalCss);
		$element.css(finalCss);

		if ($element.hasClass('uploaded-photo') && $element.hasClass('selected-photo')) {
			PhotoManager.updateSelectionUI($element);
		}
	};

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

		// ✅ renderElements는 design 객체에 접근해야 하므로 내부에 유지
		function renderElements() {
			const totalFrames = design.frames?.length || 0;
			const totalTextBoxes = design.textBoxes?.length || 0;
			let renderedCount = 0;
			const totalElements = totalFrames + totalTextBoxes;

			function checkCompletion() {
				renderedCount++;
				if (renderedCount >= totalElements) {
					if (typeof onComplete === 'function') onComplete();
				}
			}

			if (totalElements === 0) {
				if (typeof onComplete === 'function') onComplete();
				return;
			}

			// 프레임 렌더링
			if (design.frames) {
				console.log('프레임 복원 시작, 개수:', design.frames.length);
				design.frames.forEach(frameData => {
					FrameManager.applyFrame(frameData.theme, frameData);

					if (frameData.photo && frameData.photo.src) {
						const $frame = $('#frame-container .frame-group:last-child');
						const $photo = $frame.find('.uploaded-photo');
						const $placeholder = $frame.find('.placeholder-link');

						if ($photo.length > 0) {
							// 이미지 경로(src)와 상태 데이터만 저장합니다. (계산 X)
							$photo.attr('src', `${ctx}${frameData.photo.src}`);
							$photo.data('filePath', frameData.photo.src);
							$photo.data('relativeState', frameData.photo);

							// 플레이스홀더를 숨기고 사진 요소를 일단 화면에 표시합니다.
							$placeholder.hide();
							$photo.css('visibility', 'hidden').show();
						}
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

						const $box = $('<div class="text-box" contenteditable="true"></div>')
							.html(boxData.html);

						$('#frame-container').append($box);

						// 위치와 크기 계산
						const pixelLeft = Math.max(0, (boxData.position?.left || 10) / 100 * actualBgRect.width + actualBgRect.left);
						const pixelTop = Math.max(0, (boxData.position?.top || 10) / 100 * actualBgRect.height + actualBgRect.top);
						const pixelWidth = Math.max(50, (boxData.size?.width || 20) / 100 * actualBgRect.width);
						const pixelHeight = Math.max(30, (boxData.size?.height || 10) / 100 * actualBgRect.height);

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

						// 스타일 적용
						$box.css({
							'position': 'absolute',
							'z-index': 100,
							'left': pixelLeft + 'px',
							'top': pixelTop + 'px',
							'width': pixelWidth + 'px',
							'height': pixelHeight + 'px',
							'color': boxData.styles?.color || '#000000',
							'font-size': baseFontSize + 'px',
							'font-weight': boxData.styles?.fontWeight || 'normal',
							'text-align': boxData.styles?.textAlign || 'left',
							'font-family': boxData.styles?.fontFamily || 'Arial, sans-serif',
							'padding': '10px',
							'visibility': 'hidden',
							'display': 'block',
							'opacity': '1'
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
							size: boxData.size || { width: 20, height: 10 },
							// ⭐ 중요: rotation 관련 값들도 relativeState에 포함
							rotation: boxData.rotation || 0,  // 추가
							translateX: boxData.translateX || 0,  // 추가
							translateY: boxData.translateY || 0,  // 추가
							transform: boxData.transform || 'none',
							transformOrigin: boxData.transformOrigin || '50% 50%'
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
			bgImg.off('load.render').one('load.render', renderElements);
			bgImg.attr('src', design.background);
			if (bgImg[0].complete) bgImg.trigger('load.render');
		} else {
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
					console.log("페이지 순서가 성공적으로 자동 저장되었습니다.");
				} else {
					alert("오류: 페이지 순서 저장에 실패했습니다.");
				}
			},
			error: function() {
				alert("오류: 서버 통신 중 페이지 순서 저장에 실패했습니다.");
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
		if (window.safeLineManager) {
			window.safeLineManager.update();
		}
		//틀잡기(프레임과 텍스트박스 배치)
		if (window.updateAllPositions) {
			window.updateAllPositions();
		}
		//내용채우기(사진)
		if (window.updateAllPhotosPosition) {
			updateAllPhotosPosition();
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
		DataLoader.loadBackgrounds(pageCategory);

		showLoader();

		try {
			await DataLoader.loadAndSetupFonts();
			console.log('폰트 로딩 완료, 페이지 데이터 로딩 시작.');

			const pageData = await new Promise((resolve, reject) => {
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
							console.log('페이지 데이터 로드 성공:', data);
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

			renderPage(pageData, hideLoader);

			if (pageData && pageData.lastSaved) {
				displayLastSaveTime(pageData.lastSaved);
			}

			$('#editModal').modal('show');

		} catch (error) {
			console.error('페이지 준비 중 오류 발생:', error);
			alert("페이지를 준비하는 중 오류가 발생했습니다.");
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
				const photoRelativeState = $photo.data('relativeState');

				if (photoRelativeState) {

					photoData = {
						src: $photo.data('originalPath') || $photo.data('filePath'),
						editSrc: $photo.data('editPath'),
						position: photoRelativeState.position,
						size: photoRelativeState.size,  // 그대로
						rotation: photoRelativeState.rotation || 0,
						translateX: photoRelativeState.translateX || 0,
						translateY: photoRelativeState.translateY || 0,
						transformOriginX: photoRelativeState.transformOriginX || 50,
						transformOriginY: photoRelativeState.transformOriginY || 50,
						screenWidth: actualBgRect.width  // 이것만 추가
					};
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

			const textBoxData = {
				html: $box.html(),
				textType: textType,
				position: {
					left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100,
					top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100
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
				'transform-origin': boxTransformOrigin
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
				await new Promise(resolve => setTimeout(resolve, 200));

				// 렌더링과 동일한 스케일로 캡처 (SCALE_RATIO = 3.33)
				const RENDER_SCALE = 2621 / 786;  // 약 3.33

				const canvas = await html2canvas($box[0], {
					scale: RENDER_SCALE,
					backgroundColor: null,
					logging: false,
					useCORS: true,
					letterRendering: true,
					allowTaint: true,  // 추가
					height: actualHeight + 5,  // 명시적 높이 지정
					width: actualWidth + 5     // 명시적 너비 지정
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
			if (fileExtension === 'heic') {
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
						alert("업로드 실패");
					}
				},
				error: function(xhr) {
					const errorMsg = xhr.responseJSON?.error || "업로드 실패";
					alert(errorMsg);
				},
				complete: function() {
					hideLoader();
					$('#image-upload-input').val('');
				}
			});

		} catch (error) {
			console.error('이미지 처리 오류:', error);
			alert('이미지 처리 중 오류가 발생했습니다: ' + error.message);
			hideLoader();
			$('#image-upload-input').val('');
		}
	}

	// HEIC 변환 함수 (기존 유지)
	function convertHeicToJpeg(heicFile) {
		return new Promise((resolve, reject) => {
			if (typeof heic2any === 'undefined') {
				reject(new Error('HEIC 변환 라이브러리가 로드되지 않았습니다.'));
				return;
			}

			heic2any({
				blob: heicFile,
				toType: "image/jpeg",
				quality: 0.9
			})
				.then(result => {
					// heic2any는 Blob 또는 Blob 배열을 반환할 수 있음
					const blob = Array.isArray(result) ? result[0] : result;
					resolve(blob);
				})
				.catch(reject);
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
		$('#clearConfirmModal').modal('hide');
		$('#editModal').modal('hide');
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

function updateAllPhotosPosition() {
	$('#frame-container .frame-group').each(function() {
		const $frame = $(this);
		const $photo = $frame.find('.uploaded-photo');
		const $placeholder = $frame.find('.place-image-here-link');
		const photoSrc = $photo.attr('src');

		if (photoSrc && photoSrc !== '#') {
			$placeholder.hide();

			const bg = $('#page-preview-img');
			const actualBgRect = window.safeLineManager?.getActualImagePosition(bg);
			if (!actualBgRect) return;

			// percentState가 없고 relativeState가 있으면 변환
			if (!$photo.data('percentState')) {
				const photoRelativeState = $photo.data('relativeState');

				if (photoRelativeState && photoRelativeState.size) {
					// relativeState를 백분율로 변환해서 percentState 생성
					let widthPercent, heightPercent;

					// screenWidth가 있으면 그것으로 계산 (저장 시 화면 크기)
					if (photoRelativeState.screenWidth) {
						const savedScreenWidth = photoRelativeState.screenWidth;
						widthPercent = (photoRelativeState.size.widthPx / savedScreenWidth) * 100;
						heightPercent = (photoRelativeState.size.heightPx / savedScreenWidth) * 100;
					} else {
						// 백분율이 이미 있으면 사용
						widthPercent = photoRelativeState.size.width ||
							(photoRelativeState.size.widthPx / actualBgRect.width) * 100;
						heightPercent = photoRelativeState.size.height ||
							(photoRelativeState.size.heightPx / actualBgRect.height) * 100;
					}

					$photo.data('percentState', {
						widthPercent: widthPercent,
						heightPercent: heightPercent,
						translateXPercent: photoRelativeState.translateX || 0,
						translateYPercent: photoRelativeState.translateY || 0,
						rotation: photoRelativeState.rotation || 0
					});

				} else {
					// relativeState가 없으면 현재 크기 사용 (원래 로직)
					const currentTransform = $photo.css('transform');
					const matrix = TransformHelper.parseMatrix(currentTransform);

					$photo.data('percentState', {
						widthPercent: ($photo.outerWidth() / actualBgRect.width) * 100,
						heightPercent: ($photo.outerHeight() / actualBgRect.height) * 100,
						translateXPercent: (matrix.tx / actualBgRect.width) * 100,
						translateYPercent: (matrix.ty / actualBgRect.height) * 100,
						rotation: Math.atan2(matrix.b, matrix.a)
					});
				}
			}

			// percentState 기반으로 크기 계산 (반응형)
			const percentState = $photo.data('percentState');
			if (percentState) {
				const newWidth = (percentState.widthPercent / 100) * actualBgRect.width;
				const newHeight = (percentState.heightPercent / 100) * actualBgRect.height;
				const newTranslateX = (percentState.translateXPercent / 100) * actualBgRect.width;
				const newTranslateY = (percentState.translateYPercent / 100) * actualBgRect.height;

				let finalTransform;
				if (percentState.rotation !== 0) {
					const cos = Math.cos(percentState.rotation);
					const sin = Math.sin(percentState.rotation);
					finalTransform = `matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${newTranslateX}, ${newTranslateY})`;
				} else {
					finalTransform = `translate(${newTranslateX}px, ${newTranslateY}px)`;
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
		alert('이미지를 표시할 수 없습니다.');
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

// 개선된 버전 - 다양한 fit 옵션 지원
function positionImageInMaskAdvanced(photo, maskContainer, options = {}) {
	const settings = {
		fit: 'cover', // 'cover', 'contain', 'fill', 'none'
		position: 'center', // 'center', 'top', 'bottom', 'left', 'right'
		...options
	};

	const maskWidth = maskContainer.width();
	const maskHeight = maskContainer.height();
	const maskBounds = maskContainer.data('maskBounds');

	// 마스크 경계가 있으면 실제 영역 사용
	const actualWidth = maskBounds ? maskWidth * maskBounds.width : maskWidth;
	const actualHeight = maskBounds ? maskHeight * maskBounds.height : maskHeight;
	const offsetX = maskBounds ? maskWidth * maskBounds.x : 0;
	const offsetY = maskBounds ? maskHeight * maskBounds.y : 0;

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
			// 마스크를 완전히 채움 (일부가 잘릴 수 있음)
			scale = Math.max(actualWidth / imgNaturalWidth, actualHeight / imgNaturalHeight);
			break;

		case 'contain':
			// 이미지 전체가 보이도록 (여백이 생길 수 있음)
			scale = Math.min(actualWidth / imgNaturalWidth, actualHeight / imgNaturalHeight);
			break;

		case 'fill':
			// 마스크 크기에 정확히 맞춤 (비율 무시)
			newWidth = actualWidth;
			newHeight = actualHeight;
			break;

		case 'none':
			// 원본 크기 유지
			scale = 1;
			break;

		default:
			scale = Math.max(actualWidth / imgNaturalWidth, actualHeight / imgNaturalHeight);
	}

	if (settings.fit !== 'fill') {
		newWidth = imgNaturalWidth * scale;
		newHeight = imgNaturalHeight * scale;
	}

	// Position에 따른 위치 계산
	let newLeft, newTop;

	switch (settings.position) {
		case 'top':
			newLeft = offsetX + (actualWidth - newWidth) / 2;
			newTop = offsetY;
			break;

		case 'bottom':
			newLeft = offsetX + (actualWidth - newWidth) / 2;
			newTop = offsetY + actualHeight - newHeight;
			break;

		case 'left':
			newLeft = offsetX;
			newTop = offsetY + (actualHeight - newHeight) / 2;
			break;

		case 'right':
			newLeft = offsetX + actualWidth - newWidth;
			newTop = offsetY + (actualHeight - newHeight) / 2;
			break;

		case 'center':
		default:
			newLeft = offsetX + (actualWidth - newWidth) / 2;
			newTop = offsetY + (actualHeight - newHeight) / 2;
			break;
	}

	// 애니메이션 효과와 함께 적용
	photo.css({
		width: `${newWidth}px`,
		height: `${newHeight}px`,
		left: 0,
		top: 0,
		transform: `translate(${newLeft}px, ${newTop}px)`,
		position: 'absolute',
		maxWidth: 'none',
		maxHeight: 'none'
	});

	// 상태 저장
	saveImageState(photo, {
		position: { leftPx: newLeft, topPx: newTop },
		size: { widthPx: newWidth, heightPx: newHeight },
		fit: settings.fit,
		alignment: settings.position
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