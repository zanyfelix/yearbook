// submit.js

// 이미지 순서를 추적할 변수
var currentImageIndex = 0;
var imageList = [];

document.querySelectorAll('.auto-resize').forEach(textarea => {
    function adjustHeight() {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    
    // 초기 설정
    adjustHeight();
    
    // 값이 변경될 때 (프로그래밍적으로 변경될 경우)
    const observer = new MutationObserver(adjustHeight);
    observer.observe(textarea, { 
        attributes: true, 
        attributeFilter: ['value'] 
    });
});

// 썸네일 로딩을 위한 AJAX 함수 (전역 함수로 변경)
function loadPreviewData(contentsId) {
    $.ajax({
        // url: `${ctx}/submit/previewData`, // JSP에서 ctx 변수를 선언했으므로 그대로 사용
        url: ctx + '/submit/previewData', // ES6 템플릿 리터럴을 지원하지 않는 환경을 고려하여 수정
        type: 'POST', // GET이 아닌 POST로 수정 (서버 컨트롤러와 일치 필요)
        contentType: 'application/json',
        data: JSON.stringify({ contentsId: contentsId }),
        success: function(response) {
			
			if (!response || response.length === 0) {
				alert('There is no data saved.');
				return; // 데이터가 없으면 함수 종료
			}
            // 서버로부터 받은 썸네일 이미지 리스트
			imageList = response.map(function(item) {
				return {
					url: item.thumbnailPath // thumbnailPath 값을 url 속성에 할당
				};
			});
            currentImageIndex = 0;  // 초기화

            // 첫 번째 이미지로 갱신
            updatePreviewModal();
			
			var previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
			previewModal.show();
        },
        error: function() {
            alert('썸네일을 로드하는 데 실패했습니다.');
        }
    });
}

// 모달에 이미지 표시 (전역 함수로 변경)
function updatePreviewModal() {
	if (imageList && imageList.length > 0) {
		// 현재 인덱스에 해당하는 이미지 정보를 가져옴
		let image = imageList[currentImageIndex];

		// <img> 태그의 src 속성을 새 이미지 URL로 변경
		$('#previewImage').attr('src', image.url);

		// 모달 제목을 이미지 제목으로 변경
		$('#previewLabel').text(image.title);
	}
}

// 화살표 클릭 시 이미지 변경 (전역 함수로 변경)
function showNextImage() {
	// 현재 인덱스가 마지막 이미지가 아닐 때만 실행
	if (currentImageIndex < imageList.length - 1) {
		currentImageIndex++; // 인덱스 1 증가
		updatePreviewModal(); // 화면 업데이트
	} else {
		alert("This is last image");
	}
}

// 화살표 클릭 시 이미지 변경 (전역 함수로 변경)
function showPreviousImage() {
	// 현재 인덱스가 첫 번째 이미지가 아닐 때만 실행
	if (currentImageIndex > 0) {
		currentImageIndex--; // 인덱스 1 감소
		updatePreviewModal(); // 화면 업데이트
	} else {
		alert("This is first image");
	}
}

// DOM이 로드된 후 실행되어야 하는 코드가 있다면 이 안에 유지합니다.
$(function() {
	
	$('input[name="pageConfirmCheck"]').on('click', function() {
		const $checkbox = $(this);
		// 체크박스가 속한 행(tr)을 찾음
		const $row = $checkbox.closest('tr');
		// 행(tr)에 저장된 완료 여부(true/false)를 가져옴
		const isCompleted = $row.data('completed');

		// 완료되지 않은 항목(빨간색)을 체크하려고 할 때
		if ($checkbox.is(':checked') && !isCompleted) {
			alert("This yearbook is incomplete and cannot be confirmed.");
			// 체크를 즉시 해제
			$checkbox.prop('checked', false);
		}
	});
	
	$('#btn-page-submit').on('click', function() {

		// 1. 'Page Confirm' 테이블의 모든 체크박스 확인
		const $pageConfirmChecks = $('input[name="pageConfirmCheck"]');
		const totalPageConfirmChecks = $pageConfirmChecks.length;
		const checkedPageConfirmCount = $pageConfirmChecks.filter(':checked').length;

		if (checkedPageConfirmCount < totalPageConfirmChecks) {
			alert("Please confirm all previews in the list. (Page Confirm)");
			return; // 모든 프리뷰가 확인되지 않았으면 함수 종료
		}

		// 2. 'Page Submission' 섹션의 모든 체크박스 확인
		const $submissionChecks = $('.submission-check');
		const totalSubmissionChecks = $submissionChecks.length;

		// ▼▼▼ 이 부분이 수정되었습니다 ▼▼▼
		const checkedSubmissionCount = $submissionChecks.filter(':checked').length;
		// ▲▲▲ 수정 완료 ▲▲▲

		if (checkedSubmissionCount < totalSubmissionChecks) {
			alert("Please acknowledge all terms before submitting. (Page Submission)");
			return; // 모든 약관에 동의하지 않았으면 함수 종료
		}

		// 3. 모든 검사가 통과한 경우, 최종 제출 확인 및 실행
		if (confirm("Are you sure you want to submit? No further modifications will be possible.")) {
			$.ajax({
				url: ctx + '/submit/finalize',
				type: 'POST',
				contentType: 'application/json',
				success: function(response) {
					if (response.success) {
						alert("Your submission has been completed successfully.");
						window.location.href = `${ctx}/home?id=${userId}`;
					} else {
						alert("Submission failed. Please try again. " + (response.message || ""));
					}
				},
				error: function() {
					alert("An error occurred while submitting. Please contact support.");
				}
			});
		}
	});

	// 'Page Confirm' 체크박스 클릭 이벤트 핸들러 (이 코드는 그대로 유지)
	$('input[name="pageConfirmCheck"]').on('click', function() {
		const $checkbox = $(this);
		const $row = $checkbox.closest('tr');
		const isCompleted = $row.data('completed');

		if ($checkbox.is(':checked') && !isCompleted) {
			alert("This category is incomplete and cannot be confirmed.");
			$checkbox.prop('checked', false);
		}
	});
});