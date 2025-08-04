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
	    // ... (designData 수집 로직은 기존과 동일) ...
	    const designData = { /* ... */ };

	    html2canvas(captureArea[0], { useCORS: true, backgroundColor: null }).then(canvas => {
	        const imageDataUrl = canvas.toDataURL('image/png');

	        // ✨ --- ID 및 데이터 구성 로직 (핵심 수정) --- ✨
	        const yearbookId = activePageThumb ? activePageThumb.data('yearbook-id') : null;
	        const contentsId = activePageThumb ? activePageThumb.data('contents-id') : null;
	        const pageNo = activePageThumb ? activePageThumb.data('page-no') : null;

	        // 서버로 보낼 최종 데이터 객체
	        const payload = {
	            yearbookId: yearbookId,
	            contentsId: contentsId,
	            pageNo: pageNo,
	            designData: JSON.stringify(designData),
	            imageData: imageDataUrl
	        };

	        // AJAX 로직 (URL은 그대로, 보내는 데이터만 payload로 변경)
	        $.ajax({
	            url: `${ctx}/edit/savePage`, // URL은 /saveThumbnail에서 /savePage로 변경
	            method: 'POST',
	            contentType: 'application/json',
	            data: JSON.stringify(payload), // 위에서 만든 payload 전송
	            success: function(response) {
	                if (response && response.newImagePath) {
	                    activePageThumb.attr('src', `${ctx}${response.newImagePath}?t=${new Date().getTime()}`);
	                    // ✨ 새로 생성된 페이지의 경우, 받은 ID를 data 속성에 추가해줌
	                    if (response.newYearbookId) {
	                        activePageThumb.attr('data-yearbook-id', response.newYearbookId);
	                    }
	                } else {
	                    alert("저장에 성공했지만, 썸네일 업데이트에 실패했습니다.");
	                }
	                $('#editModal').modal('hide');
	            },
	            // ... (error, complete 로직은 기존과 거의 동일) ...
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
			$('#page-preview-img').attr('src', '/images/placeholder.png');
			$('#frame-container').empty();
			window.selectionManager.clearSelection();
			setTimeout(() => window.safeLineManager.update(), 100);
		}
	});

	// 전역 이벤트 설정
	EventManager.setupGlobalEvents();
});