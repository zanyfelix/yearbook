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

	// updateElementPosition 함수 (기존과 동일)
	window.updateElementPosition = function($element, state) {
		const relativeState = $element.data('relativeState');
		if (!relativeState) return;

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		const currentTransform = $element.css('transform');
		$element.css('transform', 'none');

		const newPixelPos = {
			left: (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left,
			top: (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top
		};

		const newPixelSize = {
			width: (relativeState.size.width / 100) * actualBgRect.width,
			height: (relativeState.size.height / 100) * actualBgRect.height
		};

		const finalCss = {
			left: newPixelPos.left,
			top: newPixelPos.top,
			width: newPixelSize.width,
			height: newPixelSize.height,
			transform: relativeState.transform || 'none'
		};

		// 텍스트 박스 스타일 복원 (font-size 스케일링)
		if ($element.hasClass('text-box')) {
			const baseFontSize = $element.data('base-font-size') || 12;
			const TEMPLATE_WEB_BG_WIDTH = 786;
			const scaleRatio = actualBgRect.width / TEMPLATE_WEB_BG_WIDTH;
			const adjustedFontSize = Math.round(baseFontSize * scaleRatio);
			finalCss['font-size'] = adjustedFontSize + 'px';
			if ($element.data('savedFontFamily')) {
				finalCss['font-family'] = $element.data('savedFontFamily');
			}
		}

		if (relativeState.transformOrigin) {
			finalCss['transform-origin'] = relativeState.transformOrigin;
		}

		finalCss['visibility'] = 'visible';
		$element.css(finalCss);

		if ($element.hasClass('uploaded-photo') && $element.hasClass('selected-photo')) {
			PhotoManager.updateSelectionUI($element);
		}
	};

	// updateAllPositions 함수 (기존과 동일)
	window.updateAllPositions = function() {
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
		console.log('=== 강력한 완전 초기화 시작 ===');

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

			// ✅ [핵심 수정] 텍스트박스 복원 로직 개선
			// main.js의 renderPage 함수 내 텍스트박스 복원 부분 수정

			// 텍스트박스 복원 로직 - 수정된 버전
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

			$('#btn-save').trigger('click');

			$(document).one('saveComplete', () => {
				setTimeout(() => {
					this.logout();
				}, 1000);
			});
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
		setTimeout(() => {
			if (window.safeLineManager) {
				window.safeLineManager.update();
			}
			if (window.updateAllPositions) {
				window.updateAllPositions();
			}

			// ▼▼▼ [핵심] 이 부분을 추가하세요 ▼▼▼
			// 모든 프레임 위치가 잡힌 후, 사진 위치를 최종적으로 계산합니다.
			if (window.updateAllPhotosPosition) {
				updateAllPhotosPosition();
			}
			// ▲▲▲ [핵심] 이 부분을 추가하세요 ▲▲▲

		}, 200);
	});

	$('#btn-close-modal').on('click', function() {
		if (confirm("Do you want to save?")) {
			$(document).one('saveComplete', function() {
				hasSaved = true;
				$('#editModal').modal('hide');
			});
			$('#btn-save').trigger('click');
		} else {
			$('#editModal').modal('hide');
		}
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

	// Save 버튼 클릭 이벤트
	$('#btn-save').on('click', function() {
		showLoader();
		window.selectionManager.clearSelection();

		const designData = {
			frames: [],
			textBoxes: [],
			background: $('#page-preview-img').attr('src')
		};
		const bgImg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bgImg);
		if (!actualBgRect) {
			alert("배경 정보를 찾을 수 없어 저장할 수 없습니다.");
			hideLoader();
			return;
		}

		// 프레임 저장 로직 (기존과 동일)
		$('#frame-container .frame-group').each(function() {
			const $frame = $(this);
			if ($frame.width() <= 0 || $frame.height() <= 0) return;

			const frameTransform = $frame.css('transform');
			const frameTransformOrigin = $frame.css('transform-origin');
			$frame.css({ 'transform': 'none' });

			const frameWidth = $frame.width();
			const frameHeight = $frame.height();
			const framePos = $frame.position();

			let photoData = null;
			const $photo = $frame.find('.uploaded-photo');
			if ($photo.length && $photo.is(':visible') && $photo.data('filePath')) {
				const photoRelativeState = $photo.data('relativeState');
				if (photoRelativeState) {
					photoData = {
						src: $photo.data('filePath'),
						position: photoRelativeState.position,
						size: photoRelativeState.size,
						transform: photoRelativeState.transform || 'none',
						transformOrigin: photoRelativeState.transformOrigin || '50% 50%'
					};
				}
			}

			const frameData = {
				theme: $frame.data('frameTheme'),
				position: {
					left: ((framePos.left - actualBgRect.left) / actualBgRect.width) * 100,
					top: ((framePos.top - actualBgRect.top) / actualBgRect.height) * 100
				},
				size: {
					width: (frameWidth / actualBgRect.width) * 100,
					height: (frameHeight / actualBgRect.height) * 100
				},
				transform: frameTransform || 'none',
				transformOrigin: frameTransformOrigin || '50% 50%',
				photo: photoData
			};
			designData.frames.push(frameData);

			$frame.css({ 'transform': frameTransform, 'transform-origin': frameTransformOrigin });
		});

		// ✅ [핵심 수정] 텍스트박스 저장 로직 개선
		$('#frame-container .text-box').each(function() {
			const $box = $(this);
			if (!$box.text().trim() || $box.outerWidth() <= 0) return;

			const boxTransform = $box.css('transform');
			const boxTransformOrigin = $box.css('transform-origin');
			$box.css({ 'transform': 'none' }); 
			const boxPos = $box.position();
			const boxW = $box.width();
			const boxH = $box.height();

			// base-font-size를 우선 사용하고, 없으면 CSS에서 역계산
			const baseFontSize = $box.data('base-font-size') || 12;
			const textType = $box.data('text-type') || 'text';

			if (!baseFontSize) {
				// fallback: CSS에서 역계산하되, 저장된 배경 너비 활용
				const currentCssSize = parseInt($box.css('font-size'));
				const savedBgWidth = $box.data('saved-bg-width');

				if (savedBgWidth) {
					// 저장 시점의 배경 너비 기준으로 역계산
					const scaleRatio = savedBgWidth / 786;
					baseFontSize = Math.round(currentCssSize / scaleRatio);
				} else {
					// 현재 배경 기준으로 역계산 (fallback)
					const scaleRatio = actualBgRect.width / 786;
					baseFontSize = Math.round(currentCssSize / scaleRatio);
				}
			}

			designData.textBoxes.push({
				html: $box.html(),
				textType: textType, // ✅ 타입 정보 저장
				position: {
					left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100,
					top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100
				},
				size: {
					width: (boxW / actualBgRect.width) * 100,
					height: (boxH / actualBgRect.height) * 100
				},
				transform: boxTransform || 'none',
				transformOrigin: boxTransformOrigin || '50% 50%',
				styles: {
					color: $box.css('color'),
					fontSize: baseFontSize,
					fontWeight: $box.css('font-weight'),
					textAlign: $box.css('text-align'),
					fontFamily: $box.data('savedFontFamily') || $box.css('font-family').split(',')[0].replace(/['"]/g, '').trim()
				}
			});
			// --- ⬇️ 원상 복구 ⬇️ ---
			// 계산이 끝난 후 원래 transform 속성으로 복구
			$box.css({ 'transform': boxTransform, 'transform-origin': boxTransformOrigin });
		});

		// 썸네일 캡처 및 서버 전송
		const captureTarget = document.getElementById('page-preview');
		html2canvas(captureTarget, { useCORS: true, backgroundColor: null, scale: 2 }).then(canvas => {
			canvas.toBlob(blob => {
				const payload = {
					userId: $('#id').val(),
					yearbookId: activePageThumb?.attr('data-yearbook-id'),
					contentsId: activePageThumb?.attr('data-contents-id'),
					pageNo: activePageThumb?.attr('data-page-no'),
					designData: JSON.stringify(designData)
				};
				const formData = new FormData();
				formData.append('payload', JSON.stringify(payload));
				formData.append('thumbnailFile', blob, 'thumbnail.png');

				$.ajax({
					url: `${ctx}/edit/savePageWithThumbnail`,
					method: 'POST',
					data: formData,
					processData: false,
					contentType: false,
					success: function(response) {
						if (response?.newImagePath) {
							alert("This page has been saved.");
							hasSaved = true;
							activePageThumb.attr('src', `${ctx}${response.newImagePath}?t=${new Date().getTime()}`);
							if (response.newYearbookId) {
								activePageThumb.attr('data-yearbook-id', response.newYearbookId);
								activePageThumb.closest('.page-card').attr('id', `card-${response.newYearbookId}`);
							}
						} else {
							alert("Save succeeded, but thumbnail update failed.");
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
			}, 'image/png');
		}).catch(err => {
			console.error("Thumbnail capture failed:", err);
			alert("Thumbnail capture failed.");
			hideLoader();
		});
	});

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
		if (fileSizeInKB < 400) {
			const confirmationMessage = "The size of the uploaded image does not adhere to the standard requirements. (Less than 400kb may result in reduced image quality). Please click confirm to proceed.";
			if (!confirm(confirmationMessage)) {
				$(this).val('');
				return;
			}
		}

		const $input = $(this);
		const frameGroup = $input.data('targetFrameGroup');
		const photo = $input.data('targetUploadedPhoto');
		const placeholder = $input.data('targetPlaceholderLink');
		const mask = $input.data('targetMaskContainer');

		if (!frameGroup || !photo || !placeholder || !mask) return;

		/**
		 * HEIC 파일을 JPEG Blob으로 변환하는 함수
		 */
		const convertHeicToJpeg = (heicFile) => {
			return new Promise((resolve, reject) => {
				if (typeof heic2any === 'undefined') {
					return reject('HEIC conversion library is not loaded.');
				}
				heic2any({ blob: heicFile, toType: "image/jpeg", quality: 0.9 })
					.then(resolve)
					.catch(reject);
			});
		};

		/**
		 * 파일(Blob)을 서버에 업로드하고 경로를 반환받는 함수
		 */
		const uploadFileToServer = (fileToUpload) => {
			const formData = new FormData();
			formData.append('file', fileToUpload, file.name.replace(/\.heic$/i, ".jpg")); // HEIC인 경우 확장자 변경

			showLoader(); // 업로드 중 로더 표시

			$.ajax({
				url: `${ctx}/edit/uploadImage`,
				method: 'POST',
				data: formData,
				processData: false,
				contentType: false,
				success: function(response) {
					if (response.filePath) {
						// 성공 시, 반환된 경로로 이미지 표시
						displayImageInFrame(response.filePath);
					} else {
						alert("File upload succeeded, but no path was returned.");
					}
				},
				error: function(jqXHR) {
					const errorMsg = jqXHR.responseJSON ? jqXHR.responseJSON.error : "An unknown error occurred.";
					console.error("File upload failed:", errorMsg);
					alert("File upload failed: " + errorMsg);
				},
				complete: function() {
					hideLoader(); // 완료 후 로더 숨기기
					$input.val(''); // input 초기화
				}
			});
		};

		/**
			 * 서버 경로를 받아 프레임에 이미지를 표시하는 함수
			 */
		const displayImageInFrame = (imagePath) => {
			const fullImagePath = `${ctx}${imagePath}`;

			photo.attr('src', fullImagePath).css('display', 'block');

			// ▼▼▼ [핵심] DB에 저장될 파일 경로를 data 속성에 저장 ▼▼▼
			photo.data('filePath', imagePath);

			photo.on('load', function() {
				const maskWidth = mask.width();
				const maskHeight = mask.height();
				const imgNaturalWidth = this.naturalWidth;
				const imgNaturalHeight = this.naturalHeight;

				const scaleX = maskWidth / imgNaturalWidth;
				const scaleY = maskHeight / imgNaturalHeight;
				const scale = Math.max(scaleX, scaleY);

				const newWidth = imgNaturalWidth * scale;
				const newHeight = imgNaturalHeight * scale;
				const newLeft = (maskWidth - newWidth) / 2;
				const newTop = (maskHeight - newHeight) / 2;

				photo.css({
					width: `${newWidth}px`, height: `${newHeight}px`,
					left: `${newLeft}px`, top: `${newTop}px`
				});

				const frameW = frameGroup.width();
				const frameH = frameGroup.height();

				const initialState = {
					position: { left: (newLeft / frameW) * 100, top: (newTop / frameH) * 100 },
					size: { width: (newWidth / frameW) * 100, height: (newHeight / frameH) * 100 },
					transform: 'none'
				};
				photo.data('relativeState', initialState);
				window.selectionManager.clearSelection();
			}).on('error', function() {
				alert('Failed to load the uploaded image.');
				// 에러 발생 시 플레이스홀더 다시 표시
				photo.hide();
				placeholder.show();
			});

			placeholder.hide();
		};

		// --- 실행 로직 ---
		if (fileExtension === 'heic') {
			convertHeicToJpeg(file)
				.then(uploadFileToServer)
				.catch(err => {
					console.error("HEIC conversion failed:", err);
					alert("HEIC file could not be converted. " + err);
					$input.val('');
				});
		} else {
			uploadFileToServer(file);
		}
	});

	// 클리어 버튼
	$('#btn-clear').on('click', function() {
		if (confirm("All designs on this page will be reset. Please click Confirm to proceed.")) {
			forceCompleteReset();
			loadDefaultBackground();
		}
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
		if ($('#editModal').is(':visible')) {
			window.safeLineManager.update();
			window.updateAllPositions();
		}
	}, 250));

	// Page Reset 기능
	$('.content').on('click', '.menu-dots-btn', function(e) {
		e.stopPropagation();
		const cardId = $(this).closest('.page-card').attr('id');
		const yearbookIdToReset = cardId ? parseInt(cardId.split('-')[1], 10) : null;

		if (!yearbookIdToReset) {
			alert("This page has not been saved yet and cannot be reset.");
			return;
		}

		if (confirm("All designs on this page will be reset. Please click Confirm to proceed.")) {
			$.ajax({
				url: `${ctx}/edit/resetPage`,
				method: 'POST',
				data: { id: yearbookIdToReset },
				success: function(response) {
					if (response.success) {
						alert("The page has been reset successfully.");
						location.reload();
					} else {
						alert("Failed to reset the page. " + (response.message || ""));
					}
				},
				error: function() {
					alert("An error occurred while communicating with the server.");
				}
			});
		}
	});

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
    $('#frame-container .uploaded-photo').each(function() {
        const $photo = $(this);
        const $frame = $photo.closest('.frame-group');
        const photoData = $photo.data('relativeState');

        // 프레임이나 사진 데이터가 없으면 건너뜁니다.
        if (!$frame.length || !photoData) {
            return; 
        }

        const frameW = $frame.width();
        const frameH = $frame.height();

        // 프레임 크기가 0이면 계산하지 않습니다.
        if (frameW === 0 || frameH === 0) return;

        // 저장된 %값을 기반으로 사진의 실제 픽셀 크기와 위치를 계산합니다.
        const photoCss = {
            width: (photoData.size.width / 100) * frameW,
            height: (photoData.size.height / 100) * frameH,
            left: (photoData.position.left / 100) * frameW,
            top: (photoData.position.top / 100) * frameH,
            transform: photoData.transform || 'none',
            transformOrigin: photoData.transformOrigin || '50% 50%',
			visibility: 'visible'
        };
        
        // 최종 계산된 CSS를 사진에 적용합니다.
        $photo.css(photoCss);
    });
}