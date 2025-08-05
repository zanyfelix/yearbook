$(document).ready(function() {
	
	let activePageThumb = null;
	
	// 전역 인스턴스 초기화
	window.selectionManager = new SelectionManager();
	window.safeLineManager = new SafeLineManager();
	window.panelManager = new PanelManager();

	// 전역 함수 래핑 (기존 코드 호환성)
	window.clearSelection = () => window.selectionManager.clearSelection();
	window.selectFrame = (frame) => window.selectionManager.selectFrame(frame);
	window.selectPhoto = (photo, frame) => window.selectionManager.selectPhoto(photo, frame);
	
	// Edit 버튼 클릭 시, 어떤 썸네일을 편집할지 activePageThumb 변수에 저장
	$('.content').on('click', '.edit-btn', function() {
	    activePageThumb = $(this).closest('.page-card').find('.page-thumb');
	});

	// Save 버튼 클릭 이벤트
	$('#btn-save').on('click', function() {
		const captureArea = $('#page-preview');
		const elementsToHide = $('#safe-line-overlay, .photo-selection-box');

		window.selectionManager.clearSelection();
		elementsToHide.addClass('hide-for-capture');

		// ✨ --- 핵심 수정: 누락되었던 designData 수집 로직 추가 --- ✨
		const designData = {
			background: $('#page-preview-img').attr('src'),
			frames: [],
			textBoxes: []
		};

		// 모든 프레임 정보 수집
		captureArea.find('.frame-group').each(function() {
			const $frame = $(this);
			const $photo = $frame.find('.uploaded-photo');
			designData.frames.push({
				theme: $frame.data('frameTheme'),
				position: $frame.position(),
				size: { width: $frame.width(), height: $frame.height() },
				transform: $frame.css('transform'),
				photo: {
					src: $photo.attr('src'),
					position: $photo.position(),
					size: { width: $photo.width(), height: $photo.height() },
					transform: $photo.css('transform')
				}
			});
		});

		// 모든 텍스트 상자 정보 수집
		captureArea.find('.text-box').each(function() {
			const $box = $(this);
			designData.textBoxes.push({
				html: $box.html(),
				position: $box.position(),
				size: { width: $box.outerWidth(), height: $box.outerHeight() },
				styles: {
					color: $box.css('color'),
					fontSize: $box.css('font-size'),
					fontWeight: $box.css('font-weight'),
					textAlign: $box.css('text-align')
				}
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

							const message = `The Page has been saved.<br>${formattedDate} ${formattedTime}`;

							$('#save-confirmation-message').html(message).show();
						}
						// --- 수정 끝 ---
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
			// ✨ placeholder.png 대신 투명 이미지로 변경
			$('#page-preview-img').attr('src', 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
			$('#frame-container').empty();
			window.selectionManager.clearSelection();
			setTimeout(() => window.safeLineManager.update(), 100);
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
		// 모달창이 열려 있을 때만 업데이트를 실행합니다.
		if ($('#editModal').is(':visible')) {
			window.safeLineManager.update();
		}
	}, 250));
	
	/**
	 * 서버에서 받은 디자인 데이터(JSON)를 사용해 편집 페이지의 내용을 복원하는 함수
	 * @param {object} pageData - yearbook 객체 전체
	 */
	function renderPage(pageData) {
		if (!pageData || !pageData.designData) {
			console.log("디자인 데이터가 없어 기본 상태로 시작합니다.");
			// 기본 흰색 배경으로 초기화
			$('#page-preview-img').attr('src', 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
			$('#frame-container').empty();
			return;
		}

		const design = JSON.parse(pageData.designData);

		// 1. 기존 내용 초기화
		$('#frame-container').empty();

		// 2. 배경 이미지 복원
		$('#page-preview-img').attr('src', design.background);

		// 3. 저장된 프레임들 복원
		if (design.frames) {
			design.frames.forEach(frameData => {
				// FrameManager.applyFrame을 호출하여 프레임을 생성하고,
				// 콜백을 통해 저장된 위치, 크기, 회전, 사진 정보를 적용합니다.
				FrameManager.applyFrame(frameData.theme, frameData);
			});
		}

		// 4. 저장된 텍스트 상자들 복원
		if (design.textBoxes) {
			design.textBoxes.forEach(boxData => {
				const $box = $('<div class="text-box" contenteditable="true"></div>')
					.html(boxData.html)
					.css({
						position: 'absolute',
						left: boxData.position.left + 'px',
						top: boxData.position.top + 'px',
						width: boxData.size.width + 'px',
						height: boxData.size.height + 'px',
						...boxData.styles
					});
				$('#frame-container').append($box);
				EventManager.setupTextEvents($box);
			});
		}
	}
	
	// Edit 버튼 클릭 시, AJAX로 페이지 데이터를 가져와 편집창에 렌더링
	$('.content').on('click', '.edit-btn', function() {
		activePageThumb = $(this).closest('.page-card').find('.page-thumb');
		const yearbookId = activePageThumb.data('yearbook-id');

		// yearbookId가 있을 경우 (저장된 페이지) -> 서버에서 데이터를 가져옴
		if (yearbookId) {
			$.ajax({
				url: `${ctx}/edit/pageData`,
				method: 'GET',
				data: { id: yearbookId },
				success: function(pageData) {
					// 성공적으로 데이터를 받으면, renderPage 함수를 호출해 편집창을 복원
					renderPage(pageData);
				},
				error: function() {
					alert("페이지 데이터를 불러오는 데 실패했습니다.");
					renderPage(null); // 실패 시 빈 페이지로 시작
				}
			});
		} else {
			// yearbookId가 없을 경우 (새 페이지) -> 빈 페이지로 시작
			renderPage(null);
		}
	});
});