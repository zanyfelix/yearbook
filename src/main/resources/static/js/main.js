$(document).ready(function() {

	let activePageThumb = null;
	let hasSaved = false;

	// 전역 인스턴스 초기화
	window.selectionManager = new SelectionManager();
	window.safeLineManager = new SafeLineManager();
	window.panelManager = new PanelManager();
	
	// ▼▼▼▼▼ 로딩 화면 제어 함수 추가 ▼▼▼▼▼
	const $loader = $('#preview-loader');
	function showLoader() { $loader.show(); }
	function hideLoader() { $loader.hide(); }
	// ▲▲▲▲▲ 로딩 화면 제어 함수 추가 ▲▲▲▲▲

	// 전역 함수 래핑 (기존 코드 호환성)
	window.clearSelection = () => window.selectionManager.clearSelection();
	window.selectFrame = (frame) => window.selectionManager.selectFrame(frame);
	window.selectPhoto = (photo, frame) => window.selectionManager.selectPhoto(photo, frame);
	
	// ✨ =======================================================================
	// ✨ === 상대 위치/크기 조정을 위한 핵심 함수들 ===
	// ✨ =======================================================================
	/**
	 * 특정 요소의 위치와 크기를 현재 배경에 맞게 업데이트합니다.
	 * @param {jQuery} $element - .frame-group, .text-box, .uploaded-photo 등
	 * @param {object} [state] - $element.data('relativeState')를 대신할 외부 상태 객체
	 */
	window.updateElementPosition = function($element, state) {
		const relativeState = state || $element.data('relativeState');
		if (!relativeState) return;
		
		let baseRect; // 위치 계산의 기준이 될 사각형
		let baseOffset = { left: 0, top: 0 }; // 최종 위치에 더해줄 오프셋

		if ($element.hasClass('uploaded-photo')) {
			// 1. 요소가 사진일 경우, 기준은 '부모 프레임'입니다.
			const $frame = $element.closest('.frame-group');
			if (!$frame.length) return;

			baseRect = {
				width: $frame.width(),
				height: $frame.height()
			};
			// 사진의 left, top은 프레임 내부 기준이므로 오프셋은 0입니다.

		} else {
			// 2. 사진이 아닐 경우(프레임, 텍스트 등), 기준은 '배경 이미지'입니다.
			const bg = $('#page-preview-img');
			baseRect = window.safeLineManager.getActualImagePosition(bg);
			if (!baseRect) return; // 배경 위치 계산 불가 시 중단

			// 최종 위치는 배경의 시작점(left, top)을 더해줘야 합니다.
			baseOffset = { left: baseRect.left, top: baseRect.top };
		}

		// 퍼센트(%)를 현재 기준 사각형(baseRect)에 맞는 픽셀(px)로 변환
		const newPixelPos = {
			left: (relativeState.position.left / 100) * baseRect.width + baseOffset.left,
			top: (relativeState.position.top / 100) * baseRect.height + baseOffset.top,
		};
		const newPixelSize = {
			width: (relativeState.size.width / 100) * baseRect.width,
			height: $element.hasClass('text-box') ? 'auto' : (relativeState.size.height / 100) * baseRect.height,
		};

		const transform = relativeState.transform || 'matrix(1, 0, 0, 1, 0, 0)';
		$element.css({ ...newPixelPos, ...newPixelSize, transform: transform });
	}

	window.updateAllPositions = function() {
		$('#frame-container .frame-group, #frame-container .text-box').each(function() {
			window.updateElementPosition($(this));

			// ✨ 추가: 프레임 안의 사진 위치도 함께 업데이트
			const $photo = $(this).find('.uploaded-photo');
			if ($photo.length && $photo.data('relativeState')) {
				window.updateElementPosition($photo);
			}
		});
	}
	// ✨ =======================================================================

	// ✨ --- 핵심 수정: Edit 버튼 클릭 시 데이터 로드를 먼저 수행합니다. --- ✨
	$('.content').on('click', '.edit-btn', function(e) {
		e.preventDefault();

		activePageThumb = $(this).closest('.page-card').find('.page-thumb');
		const yearbookId = activePageThumb.data('yearbook-id');

		showLoader();

		// ✨ 핵심: 모달이 열리기 전에 완전 초기화
		forceCompleteReset();

		if (yearbookId) {
			$.ajax({
				url: `${ctx}/edit/pageData`,
				method: 'GET',
				data: { id: yearbookId },
				success: function(pageData) {
					// ✨ 데이터 로드 후에도 한번 더 정리하고 렌더링
					setTimeout(() => {
						$('#frame-container').empty(); // 한번 더 비우기
						renderPage(pageData, function() {
							hideLoader(); // 렌더링 완료 후 로딩 해제
						});
						if (pageData && pageData.lastSaved) {
							displayLastSaveTime(pageData.lastSaved);
						}
					}, 100);
				},
				error: function() {
					alert("페이지 데이터를 불러오는 데 실패했습니다.");
					setTimeout(() => {
						$('#frame-container').empty();
						renderPage(null);
					}, 100);
				},
				complete: function() {
					$('#editModal').modal('show');
				}
			});
		} else {
			setTimeout(() => {
				$('#frame-container').empty();
				renderPage(null);
				$('#editModal').modal('show');
				setTimeout(hideLoader, 100);
			}, 100);
		}
	});

	// Save 버튼 클릭 이벤트
	$('#btn-save').on('click', function() {
		showLoader(); // <--- 로더 보이기

		const captureArea = $('.page-preview-container');
		const elementsToHide = $('#safe-line-overlay, .photo-selection-box');

		window.selectionManager.clearSelection();
		elementsToHide.addClass('hide-for-capture');

		const designData = {
			background: $('#page-preview-img').attr('src'),
			frames: [],
			textBoxes: []
		};

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) {
			alert("배경 이미지 정보를 찾을 수 없어 저장할 수 없습니다.");
			return;
		}

		// 모든 프레임 정보 수집 (픽셀 -> 퍼센트로 변환)
		captureArea.find('.frame-group').each(function() {
			const $frame = $(this);
			const framePos = $frame.position();
			const frameW = $frame.width();
			const frameH = $frame.height();
			const $photo = $frame.find('.uploaded-photo');
			let photoData = null;

			if ($photo.length && $photo.is(':visible')) {
				const photoPos = $photo.position();
				photoData = {
					src: $photo.attr('src'),
					position: { left: (photoPos.left / frameW) * 100, top: (photoPos.top / frameH) * 100 },
					size: { width: ($photo.width() / frameW) * 100, height: ($photo.height() / frameH) * 100 },
					transform: $photo.css('transform')
				};
			}

			const latestRelativeState = {
				position: { left: ((framePos.left - actualBgRect.left) / actualBgRect.width) * 100, top: ((framePos.top - actualBgRect.top) / actualBgRect.height) * 100 },
				size: { width: (frameW / actualBgRect.width) * 100, height: (frameH / actualBgRect.height) * 100 },
				transform: $frame.css('transform'),
				photo: photoData
			};
			$frame.data('relativeState', latestRelativeState);

			designData.frames.push({ theme: $frame.data('frameTheme'), ...latestRelativeState });
		});

		// 모든 텍스트 상자 정보 수집 (픽셀 -> 퍼센트로 변환)
		captureArea.find('.text-box').each(function() {
			const $box = $(this);
			const boxPos = $box.position();
			const boxW = $box.outerWidth();
			const boxH = $box.outerHeight();

			const latestRelativeState = {
				position: { left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100, top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100 },
				size: { width: (boxW / actualBgRect.width) * 100, height: (boxH / actualBgRect.height) * 100 }
			};
			$box.data('relativeState', latestRelativeState);

			designData.textBoxes.push({
				html: $box.html(),
				...latestRelativeState,
				styles: { color: $box.css('color'), fontSize: $box.css('font-size'), fontWeight: $box.css('font-weight'), textAlign: $box.css('text-align') }
			});
		});
		// ✨ --- 데이터 수집 로직 끝 --- ✨

		html2canvas(captureArea[0], { useCORS: true, backgroundColor: null }).then(canvas => {
			const imageDataUrl = canvas.toDataURL('image/png');

			const yearbookId = activePageThumb ? activePageThumb.data('yearbook-id') : null;
			const contentsId = activePageThumb ? activePageThumb.data('contents-id') : null;
			const pageNo = activePageThumb ? activePageThumb.data('page-no') : null;
			const userId = $('#id').val();

			const payload = {
				userId: userId,
				yearbookId: yearbookId,
				contentsId: contentsId,
				pageNo: pageNo,
				designData: JSON.stringify(designData), // 수집한 데이터를 JSON 문자열로 변환
				imageData: imageDataUrl
			};

			$.ajax({
				url: `${ctx}/edit/savePage`,
				method: 'POST',
				contentType: 'application/json',
				data: JSON.stringify(payload),
				success: function(response) {
					if (response && response.newImagePath) {
						hasSaved = true; // ✨ 저장이 성공했으므로 플래그를 true로 설정

						activePageThumb.attr('src', `${ctx}${response.newImagePath}?t=${new Date().getTime()}`);
						if (response.newYearbookId) {
							activePageThumb.attr('data-yearbook-id', response.newYearbookId);
						}

						// --- ✨ 핵심 수정: 메시지 표시 로직 ---
						if (response.lastSaved) {
							const savedDate = new Date(response.lastSaved);

							// ✨ --- 시간 포맷팅 로직 변경 --- ✨
							const year = savedDate.getFullYear();
							const month = (savedDate.getMonth() + 1).toString().padStart(2, '0');
							const day = savedDate.getDate().toString().padStart(2, '0');

							let hours = savedDate.getHours();
							const minutes = savedDate.getMinutes().toString().padStart(2, '0');
							const ampm = hours >= 12 ? 'PM' : 'AM';

							hours = hours % 12;
							hours = hours ? hours : 12; // 0시는 12시로 표시

							const formattedDate = `${year}.${month}.${day}`;
							const formattedTime = `${hours}:${minutes}${ampm}`;
							// ✨ --- 변경 끝 --- ✨

							const message = `The Page has been saved.${formattedDate} ${formattedTime}`;

							$('#save-confirmation-message').html(message).show();
						}
						// --- 수정 끝 ---
						if (response.contentsId && response.updatedSavedCount !== undefined) {
							const counterSpan = $(`#page-count-${response.contentsId}`);
							if (counterSpan.length) {
								const totalPages = counterSpan.data('total-pages');
								counterSpan.text(`(${response.updatedSavedCount}/${totalPages})`);
							}
						}
					} else {
						alert("저장에 성공했지만, 썸네일 업데이트에 실패했습니다.");
					}
				},
				error: function(err) {
					console.error("Save failed:", err);
					alert("저장에 실패했습니다.");
				},
				complete: function() {
					elementsToHide.removeClass('hide-for-capture');
					hideLoader(); // <--- 작업 완료 후 로더 숨기기
					$(document).trigger('saveComplete');
				}
			});
		});
	});

	// 파일 업로드 처리
	$('#image-upload-input').on('change', function(e) {
		const file = e.target.files[0];
		if (!file) return;

		const $input = $(this);
		const frameGroup = $input.data('targetFrameGroup');
		const photo = $input.data('targetUploadedPhoto');
		const placeholder = $input.data('targetPlaceholderLink');
		const mask = $input.data('targetMaskContainer');

		if (!frameGroup || !photo || !placeholder || !mask) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			photo.attr('src', event.target.result).css('display', 'block');

			photo.on('load', function() {
				const maskWidth = mask.width();
				const maskHeight = mask.height();
				const imgRatio = this.naturalWidth / this.naturalHeight;
				const containerRatio = maskWidth / maskHeight;

				let newWidth, newHeight;
				if (imgRatio > containerRatio) {
					newHeight = maskHeight * 1.2;
					newWidth = newHeight * imgRatio;
				} else {
					newWidth = maskWidth * 1.2;
					newHeight = newWidth / imgRatio;
				}

				photo.css({
					width: `${newWidth}px`,
					height: `${newHeight}px`,
					left: `${(maskWidth - newWidth) / 2}px`,
					top: `${(maskHeight - newHeight) / 2}px`
				});

				window.selectionManager.clearSelection();
			});

			placeholder.hide();
			$input.val('');
		};
		reader.readAsDataURL(file);
	});

	// 클리어 버튼
	$('#btn-clear').on('click', function() {
		if (confirm("모든 디자인이 삭제됩니다. 계속하시겠습니까?")) {
			forceCompleteReset();
			loadDefaultBackground();
		}
	});

	// 전역 이벤트 설정
	EventManager.setupGlobalEvents();

	/**
		 * 함수가 너무 자주 실행되는 것을 방지하는 Debounce 함수
		 * @param {Function} func - 실행할 함수
		 * @param {number} wait - 지연 시간 (밀리초)
		 */
	function debounce(func, wait) {
		let timeout;
		return function(...args) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	// 브라우저 창 크기가 조절될 때마다 세이프라인을 다시 계산하도록 이벤트 리스너 추가
	// debounce 함수를 사용하여 0.25초마다 한 번씩만 실행되도록 하여 성능을 최적화합니다.
	$(window).on('resize', debounce(function() {
		if ($('#editModal').is(':visible')) {
			window.safeLineManager.update();
			window.updateAllPositions(); // 명시적으로 호출
		}
	}, 250));
	
	// ✨ 기본 배경 이미지 로드 함수
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

		// 이미지가 캐시되어 있을 경우 대비
		if (bgImg[0].complete) {
			bgImg.trigger('load');
		}
	}

	/**
	 * 서버에서 받은 디자인 데이터(JSON)를 사용해 편집 페이지의 내용을 복원하는 함수
	 * @param {object} pageData - yearbook 객체 전체
	 */
	function renderPage(pageData, onComplete) {
		console.log('=== renderPage 시작 ===', pageData ? 'with data' : 'empty page');
		
		// Step 1: 렌더링 전 완전 정리
		$('#frame-container').empty().html('');
		
		// Step 2: 모든 선택 상태 완전 초기화
		if (window.selectionManager) {
			window.selectionManager.clearSelection();
		}
		
		// Step 3: 빈 페이지 처리
		if (!pageData || !pageData.designData) {
			console.log('빈 페이지 - 기본 배경만 로드');
			loadDefaultBackground();
			if (typeof onComplete === 'function') {
				setTimeout(onComplete, 500);
			}
			return;
		}

		// Step 4: JSON 파싱
		let design;
		try {
			design = JSON.parse(pageData.designData);
			console.log('디자인 데이터 파싱 성공:', design);
		} catch (e) {
			console.error('JSON 파싱 에러:', e);
			loadDefaultBackground();
			if (typeof onComplete === 'function') {
				setTimeout(onComplete, 500);
			}
			return;
		}

		const bgImg = $('#page-preview-img');

		// Step 5: 요소 렌더링 함수 (지연 실행으로 안정화)
		function renderElementsSafely() {
			console.log('=== 요소 렌더링 시작 ===');
			
			// 5-1: 컨테이너 한번 더 정리
			$('#frame-container').empty();
			
			// 5-2: SafeLine 먼저 업데이트
			setTimeout(() => {
				if (window.safeLineManager) {
					window.safeLineManager.update();
				}
			}, 100);
			
			// ✨ 렌더링 진행 상황 추적 변수
			const totalFrames = (design.frames ? design.frames.length : 0);
			const totalTextBoxes = (design.textBoxes ? design.textBoxes.length : 0);
			const totalElements = totalFrames + totalTextBoxes;
			let completedElements = 0;

			// ✨ 요소 완료 체크 함수
			function checkRenderingComplete() {
				completedElements++;
				console.log(`렌더링 진행: ${completedElements}/${totalElements}`);

				if (completedElements >= totalElements) {
					console.log('=== 모든 요소 렌더링 완료 ===');
					// 모든 위치 업데이트 완료 후 콜백 실행
					setTimeout(() => {
						if (typeof onComplete === 'function') {
							onComplete();
						}
					}, 200); // 위치 조정 시간 고려
				}
			}

			// 5-3: 프레임 렌더링 (순차적으로)
			if (totalFrames > 0) {
				console.log(`${totalFrames}개 프레임 렌더링 시작`);
				design.frames.forEach((frameData, index) => {
					setTimeout(() => {
						try {
							console.log(`프레임 ${index} 렌더링:`, frameData.theme);
							FrameManager.applyFrame(frameData.theme, frameData);
							checkRenderingComplete(); // ✨ 완료 체크
						} catch (e) {
							console.error(`프레임 ${index} 렌더링 실패:`, e);
							checkRenderingComplete(); // ✨ 실패해도 카운트
						}
					}, index * 100);
				});
			}

			// 5-4: 텍스트박스 렌더링 (프레임 후에)
			if (totalTextBoxes > 0) {
				const frameDelay = totalFrames * 100;
				console.log(`${totalTextBoxes}개 텍스트박스 렌더링 시작`);

				design.textBoxes.forEach((boxData, index) => {
					setTimeout(() => {
						try {
							console.log(`텍스트박스 ${index} 렌더링:`, boxData);
							const $box = $('<div class="text-box" contenteditable="true"></div>')
								.html(boxData.html)
								.css({
									position: 'absolute',
									zIndex: 100,
									...boxData.styles
								});

							$('#frame-container').append($box);
							EventManager.setupTextEvents($box);
							$box.data('relativeState', boxData);

							// 위치 업데이트는 더 나중에
							setTimeout(() => {
								window.updateElementPosition($box);
								checkRenderingComplete(); // ✨ 완료 체크
							}, 100);

						} catch (e) {
							console.error(`텍스트박스 ${index} 렌더링 실패:`, e);
							checkRenderingComplete(); // ✨ 실패해도 카운트
						}
					}, frameDelay + index * 100);
				});
			}

			// ✨ 요소가 하나도 없는 경우 즉시 완료 처리
			if (totalElements === 0) {
				console.log('렌더링할 요소가 없음 - 즉시 완료');
				if (typeof onComplete === 'function') {
					setTimeout(onComplete, 200);
				}
			}
		}

		// Step 6: 배경 이미지 처리
		if (design.background && !design.background.includes('data:image/gif;base64')) {
			const currentSrc = bgImg.attr('src');
			console.log('저장된 배경 로딩:', design.background);

			if (currentSrc === design.background) {
				// 같은 이미지면 바로 렌더링
				setTimeout(renderElementsSafely, 500);
			} else {
				// 다른 이미지면 로드 후 렌더링
				bgImg.off('load.render').one('load.render', function() {
					console.log('배경 이미지 로드 완료');
					setTimeout(renderElementsSafely, 500);
				});

				bgImg.attr('src', design.background);

				if (bgImg[0].complete) {
					bgImg.trigger('load.render');
				}
			}
		} else {
			// 기본 배경 사용
			console.log('기본 배경 사용');
			loadDefaultBackground();

			bgImg.off('load.render').one('load.render', function() {
				setTimeout(renderElementsSafely, 500);
			});

			if (bgImg[0].complete) {
				setTimeout(renderElementsSafely, 500);
			}
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
	
	// ✨ 3. 모달 이벤트에 추가 초기화 로직 추가
	$('#editModal').on('show.bs.modal', function() {
		console.log('모달 열리기 직전 - 추가 정리');
		// 모달이 열리는 순간에도 한번 더 정리
		$('#frame-container').empty();
		if (window.selectionManager) {
			window.selectionManager.clearSelection();
		}
		$("#btn-background").trigger('click');
	});
	
	$('#editModal').on('shown.bs.modal', function() {
		setTimeout(() => {
			if (window.safeLineManager) {
				window.safeLineManager.update();
			}
			if (window.updateAllPositions) {
				window.updateAllPositions();
			}
		}, 200);
	});
	
	$('#btn-close-modal').on('click', function() {
		if (confirm("Do you want to save?")) {
			// "확인"을 누르면, 저장이 완료된 후 모달을 닫도록 이벤트를 한 번만 리스닝
			$(document).one('saveComplete', function() {
				$('#editModal').modal('hide');
			});
			// 저장 버튼 클릭을 프로그래밍적으로 트리거
			$('#btn-save').trigger('click');
		} else {
			// "취소"를 누르면 바로 모달을 닫음
			$('#editModal').modal('hide');
		}
	});

	// 모달이 완전히 닫혔을 때, 만약 저장된 내용이 있었다면 페이지를 새로고침합니다.
	$('#editModal').on('hidden.bs.modal', function() {
		
		forceCompleteReset();
		
		if (hasSaved) {
			location.reload();
		}
		const $message = $('#save-confirmation-message');
		$message.removeClass('show');
		
		// 모달 닫을 때 activePageThumb 초기화
		activePageThumb = null;
	});
	
	// ✨ 2. 강력한 완전 초기화 함수
	function forceCompleteReset() {
		console.log('=== 강력한 완전 초기화 시작 ===');
		
		// Step 1: 모든 DOM 요소 강제 제거
		$('#frame-container').empty().html(''); // 완전히 비우기
		$('#page-preview').find('.frame-group, .text-box, .photo-selection-box, .rotate-handle, .rotate-line, .selection-handle, .element-resize-handle, #photo-full-overlay, .photo-silhouette').remove();
		
		// Step 2: 모든 이벤트 리스너 완전 해제
		$(document).off('.photoDrag .photoRotate .photoResize .frameDrag .elementDrag .textDrag');
		$('#frame-container').off(); // 컨테이너의 모든 이벤트 해제
		$('.frame-group, .uploaded-photo, .text-box').off(); // 기존 요소들의 이벤트 해제
		
		// Step 3: 전역 변수 완전 초기화
		window.selectedFrame = null;
		window.selectedPhotoWrapper = null;
		window.selectedBox = null;
		selectedFrame = null;
		selectedPhotoWrapper = null;
		selectedBox = null;
		hasSaved = false;
		
		// Step 4: 매니저 인스턴스들 완전 초기화
		if (window.selectionManager) {
			window.selectionManager.selectedMode = null;
			window.selectionManager.currentFrame = null;
			window.selectionManager.currentPhoto = null;
			window.selectionManager.currentElement = null;
			window.selectionManager.photoOverlay = null;
			window.selectionManager.safeConstraintsCache = null;
		}
		
		if (window.safeLineManager) {
			window.safeLineManager.safeConstraintsCache = null;
			// SafeLine 컨테이너 재생성
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
		
		// 모든 툴바 숨기기
		$('#frame-controls, #photo-controls, #text-controls, #element-controls').addClass('d-none');
		$('#editor-toolbar .context-controls > div').addClass('d-none');
		
		// Step 7: 패널 상태 강제 초기화
		$('#btn-background, #btn-photo-frame, #btn-textbox-frame, #btn-text, #btn-element').removeClass('active');
		$('#background-panel, #frame-panel, #text-panel, #element-panel').addClass('d-none');
		$('#photoFrameList, #textboxFrameList').addClass('d-none');
		
		// Background 패널을 기본으로 설정
		$('#btn-background').addClass('active');
		$('#background-panel').removeClass('d-none');
		
		// Step 8: CSS 스타일 강제 정리
		$('*').removeClass('selected-frame selected-photo selected editing dragging selected-element selected-thumbnail');
		
		// Step 9: 배경 이미지 강제 초기화
		const $bgImg = $('#page-preview-img');
		$bgImg.off('.render .defaultBg'); // 기존 이벤트 제거
		
		// Step 10: 입력 요소 초기화
		$('#image-upload-input').val('').removeData();
		
		console.log('=== 강력한 완전 초기화 완료 ===');
	}
});