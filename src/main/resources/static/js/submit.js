// submit.js

// 이미지 순서를 추적할 변수
var currentImageIndex = 0;
var imageList = [];

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
	// 현재 코드에서는 특별히 이 안에 둘 코드가 없습니다.
});