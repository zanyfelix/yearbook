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

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		// 퍼센트(%)를 현재 배경 크기에 맞는 픽셀(px)로 변환
		const newPixelPos = {
			left: (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left,
			top: (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top,
		};
		const newPixelSize = {
			width: (relativeState.size.width / 100) * actualBgRect.width,
			height: $element.hasClass('text-box') ? 'auto' : (relativeState.size.height / 100) * actualBgRect.height,
		};

		const transform = relativeState.transform || 'matrix(1, 0, 0, 1, 0, 0)';
		$element.css({ ...newPixelPos, ...newPixelSize, transform: transform });
	}

	/**
	 * 페이지 위의 모든 가변 요소들의 위치와 크기를 업데이트합니다.
	 */
	window.updateAllPositions = function() {
		$('#frame-container .frame-group, #frame-container .text-box').each(function() {
			window.updateElementPosition($(this));
		});
	}
	// ✨ =======================================================================

	// Edit 버튼 클릭 시, 어떤 썸네일을 편집할지 activePageThumb 변수에 저장
	$('.content').on('click', '.edit-btn', function() {
		activePageThumb = $(this).closest('.page-card').find('.page-thumb');
	});

	// Save 버튼 클릭 이벤트
	$('#btn-save').on('click', function() {
		showLoader(); // <--- 로더 보이기

		const captureArea = $('#page-preview');
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
			// ✨ 기본 배경으로 초기화
			loadDefaultBackground();
			$('#frame-container').empty();
			window.selectionManager.clearSelection();
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
		$('#page-preview-img').attr('src', defaultBgPath);

		// 이미지 로드 완료 후 safeline 업데이트
		$('#page-preview-img').on('load', function() {
			setTimeout(() => {
				if (window.safeLineManager) {
					window.safeLineManager.update();
				}
			}, 100);
		});
	}

	/**
	 * 서버에서 받은 디자인 데이터(JSON)를 사용해 편집 페이지의 내용을 복원하는 함수
	 * @param {object} pageData - yearbook 객체 전체
	 */
	function renderPage(pageData) {
		$('#frame-container').empty();
		if (!pageData || !pageData.designData) {
			loadDefaultBackground();
			return;
		}

		const design = JSON.parse(pageData.designData);
		const bgImg = $('#page-preview-img');

		// 1. 배경 이미지 로드가 완료되면 실행될 렌더링 로직을 미리 정의합니다.
		bgImg.off('load.render').on('load.render', function() {
			$('#frame-container').empty();

			if (design.frames) {
				design.frames.forEach(frameData => FrameManager.applyFrame(frameData.theme, frameData));
			}

			if (design.textBoxes) {
				design.textBoxes.forEach(boxData => {
					const $box = $('<div class="text-box" contenteditable="true"></div>').html(boxData.html).css({ position: 'absolute', ...boxData.styles });
					$('#frame-container').append($box);
					EventManager.setupTextEvents($box);
					$box.data('relativeState', boxData);
					window.updateElementPosition($box);
				});
			}
		});

		// 2. 배경 이미지 소스를 설정합니다.
		if (design.background && !design.background.includes('data:image/gif;base64')) {
			bgImg.attr('src', design.background);
		} else {
			loadDefaultBackground();
		}

		// 3. 이미지가 캐시되어 'load' 이벤트가 발생하지 않을 경우를 대비하여,
		//    이미지 로드가 완료되었는지 직접 확인하고 수동으로 렌더링을 트리거합니다.
		if (bgImg[0].complete) {
			bgImg.trigger('load.render');
		}
	}

	// Edit 버튼 클릭 시, AJAX로 페이지 데이터를 가져와 편집창에 렌더링
	$('.content').on('click', '.edit-btn', function() {
		activePageThumb = $(this).closest('.page-card').find('.page-thumb');
		const yearbookId = activePageThumb.data('yearbook-id');
		
		showLoader(); // <--- 로더 보이기

		// yearbookId가 있을 경우 (저장된 페이지) -> 서버에서 데이터를 가져옴
		if (yearbookId) {
			$.ajax({
				url: `${ctx}/edit/pageData`,
				method: 'GET',
				data: { id: yearbookId },
				success: function(pageData) {
					// 성공적으로 데이터를 받으면, renderPage 함수를 호출해 편집창을 복원
					renderPage(pageData);
					
					// last_save 값이 있으면 표시
					if (pageData && pageData.lastSaved) {
						displayLastSaveTime(pageData.lastSaved);
					}
				},
				error: function() {
					alert("페이지 데이터를 불러오는 데 실패했습니다.");
					renderPage(null); // 실패 시 기본 배경으로 시작
				},
				complete: function() {
					// 렌더링 시간을 고려하여 약간의 지연 후 로더 숨기기
					setTimeout(hideLoader, 300); // <--- 로더 숨기기
				}
			});
		} else {
			// yearbookId가 없을 경우 (새 페이지) -> 기본 배경으로 시작
			renderPage(null);
			setTimeout(hideLoader, 100); // <--- 새 페이지 로드 시에도 로더 숨기기
		}
	});
	
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

	// ✨ 모달이 열릴 때 기본 설정 적용
	$('#editModal').on('show.bs.modal', function() {
		hasSaved = false;
		
		// save-confirmation-message 표시
		$('#save-confirmation-message').show();

		// 기본 배경이 설정되어 있지 않다면 로드
		const currentSrc = $('#page-preview-img').attr('src');
		if (!currentSrc ||
			currentSrc.includes('data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=')) {
			loadDefaultBackground();
		}
	});

	// 모달이 완전히 열린 후 safeline 업데이트
	$('#editModal').on('shown.bs.modal', function() {
		setTimeout(() => {
			if (window.safeLineManager) {
				window.safeLineManager.update();
			}
		}, 200);
	});

	// 모달이 완전히 닫혔을 때, 만약 저장된 내용이 있었다면 페이지를 새로고침합니다.
	$('#editModal').on('hidden.bs.modal', function() {
		if (hasSaved) {
			location.reload();
		}
		const $message = $('#save-confirmation-message');
		$message.removeClass('show');
	});
});