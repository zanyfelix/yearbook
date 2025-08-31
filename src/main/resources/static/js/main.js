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

	/**
	 * 특정 요소의 위치와 크기를 현재 배경에 맞게 업데이트합니다.
	 */
	window.updateElementPosition = function($element, state) {
		const relativeState = state || $element.data('relativeState');
		if (!relativeState) return;

		let baseRect, baseOffset = { left: 0, top: 0 };

		if ($element.hasClass('uploaded-photo')) {
			const $frame = $element.closest('.frame-group');
			if (!$frame.length) return;
			baseRect = { width: $frame.width(), height: $frame.height() };
		} else {
			const bg = $('#page-preview-img');
			baseRect = window.safeLineManager.getActualImagePosition(bg);
			if (!baseRect) return;
			baseOffset = { left: baseRect.left, top: baseRect.top };
		}

		const newPixelPos = {
			left: (relativeState.position.left / 100) * baseRect.width + baseOffset.left,
			top: (relativeState.position.top / 100) * baseRect.height + baseOffset.top,
		};

		let newPixelSize = {
			width: (relativeState.size.width / 100) * baseRect.width,
			height: (relativeState.size.height / 100) * baseRect.height
		};

		// 텍스트박스인 경우에만 폰트 크기 및 autoSize를 처리합니다.
		if ($element.hasClass('text-box')) {
			const baseFontSizeStr = $element.data('savedFontSize') || $element.data('originalFontSize');

			if (baseFontSizeStr) {
				const fontSize = parseInt(baseFontSizeStr);
				const scaleRatio = baseRect.width / 786;
				const adjustedFontSize = Math.round(fontSize * scaleRatio);
				$element.css('font-size', adjustedFontSize + 'px');
			}

			// 'autoSize' 플래그가 있으면 크기를 내용에 맞게 재계산합니다.
			if (relativeState.size?.autoSize) {
				const htmlContent = $element.html();
				const hasLineBreaks = htmlContent.includes('<br>') || htmlContent.includes('<div>');
				$element.css('white-space', hasLineBreaks ? 'pre-wrap' : 'nowrap');

				// 크기를 재계산하여 newPixelSize를 덮어씁니다.
				newPixelSize.width = $element.outerWidth();
				newPixelSize.height = $element.outerHeight();
			}
		}

		// Transform 적용 - 모든 요소에 공통 적용 (약간의 지연 추가)
		const transform = relativeState.transform || 'none';
		if (transform !== 'none') {
			setTimeout(() => {
				$element.css({
					transform: transform,
					'transform-origin': relativeState.transformOrigin || '50% 50%'
				});
			}, 10);
		} else {
			$element.css('transform', transform);
		}

		// 최종 계산된 위치/크기/변환을 모든 요소에 일괄 적용합니다.
		$element.css({
			left: newPixelPos.left,
			top: newPixelPos.top,
			width: newPixelSize.width,
			height: newPixelSize.height
		});

		// Transform은 별도로 적용 (지연 처리)
		if (transform && transform !== 'none') {
			setTimeout(() => {
				$element.css('transform', transform);
			}, 10);
		}

		if ($element.hasClass('uploaded-photo') && $element.hasClass('selected-photo')) {
			PhotoManager.updateSelectionUI($element);
		}
	};

	window.updateTextBoxPosition = function($element) {
		const relativeState = $element.data('relativeState');
		if (!relativeState) return;

		const bg = $('#page-preview-img');
		const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
		if (!actualBgRect) return;

		// Transform을 임시로 제거하고 위치 계산
		const currentTransform = $element.css('transform');
		$element.css('transform', 'none');

		// 새로운 위치 계산
		const newPixelPos = {
			left: (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left,
			top: (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top
		};

		const newPixelSize = {
			width: (relativeState.size.width / 100) * actualBgRect.width,
			height: (relativeState.size.height / 100) * actualBgRect.height
		};

		// 위치/크기 적용
		$element.css({
			left: newPixelPos.left,
			top: newPixelPos.top,
			width: newPixelSize.width,
			height: newPixelSize.height
		});

		// Transform 복원
		if (currentTransform && currentTransform !== 'none') {
			setTimeout(() => {
				$element.css('transform', currentTransform);
			}, 10);
		}
	};

	window.updateAllPositions = function() {
		$('#frame-container .frame-group, #frame-container .text-box').each(function() {
			// ▼▼▼ [핵심 수정] $(this)를 $this 변수에 할당하여 재사용합니다. ▼▼▼
			const $this = $(this);

			// [수정] 조건문으로 텍스트박스와 프레임을 구분하여 적절한 함수를 한 번만 호출합니다.
			if ($this.hasClass('text-box')) {
				window.updateTextBoxPosition($this);
			} else {
				// 프레임 또는 요소인 경우
				window.updateElementPosition($this);

				// 해당 프레임 내부에 사진이 있으면 사진 위치도 업데이트합니다.
				const $photo = $this.find('.uploaded-photo');
				if ($photo.length && $photo.data('relativeState')) {
					window.updateElementPosition($photo);
				}
			}
		});
	}
	// ✨ =======================================================================

	// ✨ --- 핵심 수정: Edit 버튼 클릭 시 데이터 로드를 먼저 수행합니다. --- ✨
	$('.content').on('click', '.edit-btn', async function(e) {
	    e.preventDefault();

	    // ✅ 가장 최신 데이터 속성을 읽도록 수정
	    const $pageCard = $(this).closest('.page-card');
	    activePageThumb = $pageCard.find('.page-thumb');
	    
	    // jQuery data()가 아닌 attr()로 최신 값 읽기
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
	                        _: new Date().getTime() // 캐시 방지
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

	        forceCompleteReset();
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

	    // 프레임과 사진 저장 - 정밀 계산 버전
		$('#frame-container .frame-group').each(function() {
		    const $frame = $(this);
		    if ($frame.width() <= 0 || $frame.height() <= 0) return;

		    // 🔴 핵심: 프레임의 Transform을 백업하고 제거
		    const frameTransform = $frame.css('transform');
		    const frameTransformOrigin = $frame.css('transform-origin');
		    $frame.css({
		        'transform': 'none',
		        'transform-origin': '50% 50%'
		    });
		    
		    // Transform 제거 후 프레임의 실제 크기와 위치
		    const frameWidth = $frame.width();
		    const frameHeight = $frame.height();
		    const framePos = $frame.position();
		    
		    // 사진 데이터 수집
		    let photoData = null;
		    const $photo = $frame.find('.uploaded-photo');
		    
		    if ($photo.length && $photo.is(':visible') && $photo.data('filePath')) {
		        // 🔴 핵심: 사진의 Transform도 백업하고 제거
		        const photoTransform = $photo.css('transform');
		        const photoTransformOrigin = $photo.css('transform-origin');
		        $photo.css({
		            'transform': 'none',
		            'transform-origin': '50% 50%'
		        });
		        
		        // Transform 제거 후 사진의 실제 크기와 위치 (프레임 내에서의 상대 위치)
		        const photoWidth = $photo.width();
		        const photoHeight = $photo.height();
		        const photoPos = $photo.position(); // 프레임 내에서의 position
		        
		        // 🔴 중요: 사진의 현재 상태를 정확히 저장
		        photoData = {
		            src: $photo.data('filePath'),
		            // 프레임 내에서의 상대 위치 (백분율)
		            position: { 
		                left: (photoPos.left / frameWidth) * 100, 
		                top: (photoPos.top / frameHeight) * 100 
		            },
		            // 프레임 대비 상대 크기 (백분율)
		            size: { 
		                width: (photoWidth / frameWidth) * 100, 
		                height: (photoHeight / frameHeight) * 100 
		            },
		            // Transform 정보 (회전/스케일)
		            transform: photoTransform || 'none',
		            transformOrigin: photoTransformOrigin || '50% 50%'
		        };
		        
		        // 사진 Transform 복원
		        $photo.css({
		            'transform': photoTransform,
		            'transform-origin': photoTransformOrigin
		        });
		    }
		    
		    // 프레임 데이터 저장
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
		    
		    // 프레임 Transform 복원
		    $frame.css({
		        'transform': frameTransform,
		        'transform-origin': frameTransformOrigin
		    });
		});

	    // 텍스트박스 저장 (동일한 방식)
	    $('#frame-container .text-box').each(function() {
	        const $box = $(this);
	        const textContent = $box.text().trim();
	        
	        if (!textContent || $box.outerWidth() <= 0 || $box.outerHeight() <= 0) {
	            return;
	        }

	        const boxTransform = $box.css('transform');
	        $box.css('transform', 'none');
	        
	        const boxPos = $box.position();
	        const boxW = $box.outerWidth();
	        const boxH = $box.outerHeight();
	        
	        $box.css('transform', boxTransform);

	        designData.textBoxes.push({
	            html: $box.html(),
	            position: { 
	                left: ((boxPos.left - actualBgRect.left) / actualBgRect.width) * 100, 
	                top: ((boxPos.top - actualBgRect.top) / actualBgRect.height) * 100 
	            },
	            size: { 
	                width: (boxW / actualBgRect.width) * 100, 
	                height: (boxH / actualBgRect.height) * 100 
	            },
	            transform: boxTransform,
	            styles: {
	                color: $box.css('color'),
	                fontSize: $box.css('font-size'),
	                fontWeight: $box.css('font-weight'),
	                textAlign: $box.css('text-align'),
	                fontFamily: $box.data('savedFontFamily') || 
	                           $box.css('font-family').split(',')[0].replace(/['"]/g, '').trim()
	            }
	        });
	    });

	    // 3. 서버로 전송
		const payload = {
			userId: $('#id').val(),
			yearbookId: activePageThumb?.attr('data-yearbook-id') || activePageThumb?.data('yearbook-id'),
			contentsId: activePageThumb?.attr('data-contents-id') || activePageThumb?.data('contents-id'),
			pageNo: activePageThumb?.attr('data-page-no') || activePageThumb?.data('page-no'),
			designData: JSON.stringify(designData)
		};

	    console.log('저장 데이터:', {
	        frames: designData.frames.length,
	        textBoxes: designData.textBoxes.length,
	        background: designData.background ? 'Yes' : 'No'
	    });

		$.ajax({
		    url: `${ctx}/edit/savePage`,
		    method: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(payload),
		    success: function(response) {
		        if (response?.newImagePath) {
		            alert("This page has been saved.");
		            hasSaved = true;
		            
		            // 썸네일 이미지 업데이트
		            activePageThumb.attr('src', `${ctx}${response.newImagePath}?t=${new Date().getTime()}`);
		            
		            // ✅ 중요: 새로운 yearbookId로 모든 관련 요소 업데이트
		            if (response.newYearbookId) {
		                const newYearbookId = response.newYearbookId;
		                
		                // 1. 썸네일의 data 속성 업데이트
		                activePageThumb.attr('data-yearbook-id', newYearbookId);
		                activePageThumb.data('yearbook-id', newYearbookId);
		                
		                // 2. 해당 page-card의 id 속성 업데이트
		                const $pageCard = activePageThumb.closest('.page-card');
		                $pageCard.attr('id', `card-${newYearbookId}`);
		                
		                // 3. Edit 버튼의 data 속성도 업데이트 (있다면)
		                const $editBtn = $pageCard.find('.edit-btn');
		                if ($editBtn.length) {
		                    $editBtn.data('yearbook-id', newYearbookId);
		                }
		            }
		            
		            // contentsId 업데이트
		            if (response.contentsId) {
		                activePageThumb.attr('data-contents-id', response.contentsId);
		                activePageThumb.data('contents-id', response.contentsId);
		            }
		            
		            if (response.lastSaved) {
		                displayLastSaveTime(response.lastSaved);
		            }
		            
		            // 저장된 페이지 카운터 업데이트
		            if (response.contentsId && response.updatedSavedCount !== undefined) {
		                const counter = $(`#page-count-${response.contentsId}`);
		                if (counter.length) {
		                    counter.text(`(${response.updatedSavedCount}/${counter.data('total-pages')})`);
		                }
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
	});

	// 파일 업로드 처리
	$('#image-upload-input').on('change', function(e) {
		const file = e.target.files[0];
		if (!file) {
			// 파일을 선택하지 않았으면 아무것도 하지 않음
			$(this).val(''); // input 값 초기화
			return;
		}

		// 3. 허용되는 파일 확장자 정의 (HEIC 포함)
		const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic'];
		const fileExtension = file.name.split('.').pop().toLowerCase();

		if (!allowedExtensions.includes(fileExtension)) {
			alert("Only JPG, PNG, and HEIC files can be uploaded.");
			$(this).val(''); // input 값 초기화
			return;
		}

		// 2. 파일 크기 검사 (400KB = 400 * 1024 bytes)
		const fileSizeInKB = file.size / 1024;
		if (fileSizeInKB < 400) {
			const confirmationMessage = "The size of the uploaded image does not adhere to the standard requirements. (Less than 400kb may result in reduced image quality). Please click “confirm” to proceed.";
			if (!confirm(confirmationMessage)) {
				// 사용자가 '취소'를 누르면 업로드 중단
				$(this).val(''); // input 값 초기화
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
		if (confirm("All designs on this page will be reset. Please click “Confirm” to proceed.")) {
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
				design.frames.forEach((frameData, index) => {
					setTimeout(() => {
						try {
							// 사진 데이터가 있고 center가 없으면 position에서 계산
							if (frameData.photo && frameData.photo.src) {
								// center가 없으면 position으로부터 계산
								if (!frameData.photo.center && frameData.photo.position) {
									const pos = frameData.photo.position;
									const size = frameData.photo.size;
									frameData.photo.center = {
										x: pos.left + (size.width / 2),
										y: pos.top + (size.height / 2)
									};
								}

								const photoSrc = frameData.photo.src;
								if (!photoSrc.startsWith('data:image')) {
									frameData.photo.fullSrc = `${ctx}${photoSrc}`;
									frameData.photo.filePath = photoSrc;
								} else {
									frameData.photo.fullSrc = photoSrc;
									frameData.photo.filePath = null;
								}
							}

							FrameManager.applyFrame(frameData.theme, frameData);
							checkRenderingComplete();
						} catch (e) {
							console.error(`프레임 ${index} 렌더링 실패:`, e);
							checkRenderingComplete();
						}
					}, index * 100);
				});
			}

			// 5-4: 텍스트박스 렌더링 (프레임 후에)
			// ============================================================================
			// 텍스트 복원 로직 - renderPage 함수 부분 수정
			// ============================================================================

			// 텍스트박스 렌더링 (수정된 버전)
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
									padding: '10px',
									...boxData.styles
								});

							$('#frame-container').append($box);
							EventManager.setupTextEvents($box);

							// 모든 상태 정보 저장
							const relativeState = {
								position: boxData.position,
								size: boxData.size,
								transform: boxData.transform || 'none',
								transformOrigin: boxData.transformOrigin || '50% 50%'
							};

							$box.data('relativeState', relativeState);
							$box.data('savedFontSize', boxData.styles.fontSize);
							$box.data('savedFontFamily', boxData.styles.fontFamily);
							$box.data('originalFontSize', boxData.styles.fontSize);
							$box.data('originalFontFamily', boxData.styles.fontFamily);

							// 폰트 명시적 적용 (폰트가 로드되지 않았을 경우 대비)
							if (boxData.styles.fontFamily) {
								$box.css('font-family', boxData.styles.fontFamily);
							}

							// 위치/크기 적용 후 Transform 별도 적용
							window.updateElementPosition($box);

							// Transform은 약간의 지연 후 적용
							if (boxData.transform && boxData.transform !== 'none') {
								setTimeout(() => {
									$box.css('transform', boxData.transform);
								}, 50);
							}

							// Transform이 있는 경우 별도 적용
							if (relativeState.transform && relativeState.transform !== 'none') {
								setTimeout(() => {
									$box.css('transform', relativeState.transform);
								}, 50);
							}

							checkRenderingComplete();

						} catch (e) {
							console.error(`텍스트박스 ${index} 렌더링 실패:`, e);
							checkRenderingComplete();
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
				hasSaved = true;
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
			console.log('저장이 완료되어 페이지를 새로고침합니다.');

			// 새로고침 전 플래그 즉시 초기화 (중복 방지)
			hasSaved = false;
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

	//편집 화면 세션 타임아웃 관리 로직
	const SessionManager = {
		timeout: 1800 * 1000, // 30분 (밀리초 단위)
		timer: null,

		// 타이머를 시작하고 초기화하는 함수
		reset: function() {
			// 기존 타이머가 있으면 중지
			clearTimeout(this.timer);
			console.log("사용자 활동 감지. 세션 타이머를 재시작합니다.");

			// 새로운 30분 타이머 설정
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

	// 모달이 열릴 때 세션 타이머 시작
	$('#editModal').on('show.bs.modal', function() {
		console.log("모달이 열렸습니다. 세션 관리를 시작합니다.");
		SessionManager.reset(); // 시작 시 타이머 설정

		// 편집 영역(#page-preview) 내에서 발생하는 모든 활동을 감지
		// mousedown: 마우스 클릭
		// keydown: 키보드 입력
		//mousemove: 마우스 이동
		$('#page-preview').on('mousedown.session keydown.session', function() {
			SessionManager.reset();
		});
	});

	// 모달이 닫힐 때 세션 타이머 중지 및 이벤트 핸들러 제거
	$('#editModal').on('hidden.bs.modal', function() {
		console.log("모달이 닫혔습니다. 세션 관리를 중지합니다.");
		SessionManager.stop();
		$('#page-preview').off('.session'); // 네임스페이스로 추가한 이벤트만 제거
	});

	// ================= ▼▼▼ [최종 통합본] Page Reset 및 순서 이동 기능 ▼▼▼ =================

	// --- Page Reset 기능 (중복 제거된 최종 버전) ---
	$('.content').on('click', '.menu-dots-btn', function(e) {
		e.stopPropagation();
		const cardId = $(this).closest('.page-card').attr('id');
		const yearbookIdToReset = cardId ? parseInt(cardId.split('-')[1], 10) : null;

		if (!yearbookIdToReset) {
			alert("This page has not been saved yet and cannot be reset.");
			return;
		}

		if (confirm("All designs on this page will be reset. Please click “Confirm” to proceed.")) {
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


	// ================= ▼▼▼ [최종 안정화 버전] 페이지 순서 이동 기능 ▼▼▼ =================

	let isMoveModeActive = false;
	let draggedCardId = null;

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

	// [안정 버전 로직] dragover 이벤트를 .slide-container에서 처리
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

	// [안정 버전 로직] drop 이벤트 처리 후 자동 저장 함수 호출
	$('.content').on('drop', '.slide-container', function(e) {
		e.preventDefault();
		const placeholder = $(this).find('.drop-placeholder');
		const draggedElement = document.getElementById(draggedCardId);

		if (placeholder.length > 0 && draggedElement) {
			placeholder.replaceWith(draggedElement);
			// ✨ 드롭 성공 시 자동 저장 함수 호출
			savePageOrder();
		}
	});


	// [안정 버전 로직] 드롭 위치 계산 헬퍼 함수
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
	// ================= ▲▲▲ [최종 안정화 버전] 페이지 순서 이동 기능 ▲▲▲ =================

	$(document).on('click', '.edit-btn', function() {
		const pageCategory = $(this).data('category');
		$('#editModal').data('page-category', pageCategory);
		console.log('Setting page category to:', pageCategory);
	});
});

// ============================================================================
// 새로운 복원 함수들
// ============================================================================

/**
 * ✅ Transform을 고려한 텍스트박스 복원 함수
 */
function restoreTextBoxWithTransform($box) {
	const relativeState = $box.data('relativeState');
	if (!relativeState) return;

	const bg = $('#page-preview-img');
	const actualBgRect = window.safeLineManager.getActualImagePosition(bg);
	if (!actualBgRect) return;

	// ✅ 1단계: 저장된 스타일 복원 (스케일링 없이)
	const savedFontSize = $box.data('savedFontSize');
	const savedFontFamily = $box.data('savedFontFamily');

	if (savedFontSize) {
		$box.css('font-size', savedFontSize);
		console.log('저장된 폰트 크기 복원:', savedFontSize);
	}

	if (savedFontFamily) {
		$box.css('font-family', savedFontFamily);
	}

	// ✅ 2단계: 위치 계산 및 적용
	const pixelPos = {
		left: (relativeState.position.left / 100) * actualBgRect.width + actualBgRect.left,
		top: (relativeState.position.top / 100) * actualBgRect.height + actualBgRect.top
	};

	const pixelSize = {
		width: (relativeState.size.width / 100) * actualBgRect.width,
		height: (relativeState.size.height / 100) * actualBgRect.height
	};

	// ✅ 3단계: 기본 위치/크기 설정 (Transform 없이)
	$box.css({
		left: pixelPos.left,
		top: pixelPos.top,
		width: pixelSize.width,
		height: pixelSize.height,
		transform: 'none' // 일단 Transform 제거
	});

	// ✅ 4단계: Transform 별도 적용 (약간의 지연)
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
		// values[4]와 values[5]가 이동(translate) 값이므로 0으로 설정합니다.
		return `matrix(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, 0, 0)`;
	}
	return transform; // matrix 형식이 아니면 원본 반환
};

// Transform 매트릭스에서 정확한 회전 각도 추출
window.getRotationAngle = function(transform) {
    if (!transform || transform === 'none') return 0;
    
    const matrix = transform.match(/matrix\((.+)\)/);
    if (matrix && matrix[1]) {
        const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
        // atan2를 사용한 정확한 각도 계산
        const angle = Math.atan2(values[1], values[0]);
        return angle * (180 / Math.PI);
    }
    return 0;
};

// Transform 매트릭스에서 스케일 추출
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