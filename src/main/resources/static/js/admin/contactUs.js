$(document).ready(function() {
  
  // 전체 선택/해제 기능
  // user.jsp의 <input id="selectAll"> 에 맞춰 작동합니다.
  $('#selectAll').on('click', function() {
    $('.selectBox').prop('checked', this.checked);
  });

  // 모달이 열릴 때 데이터를 채워 넣는 기능
  $('#contactModal').on('show.bs.modal', function(event) {
	const btn = event.relatedTarget;
	var modal = $(this);

    // jQuery의 .data() 메서드를 사용하여 data-* 속성 값을 가져오고,
    // .text() 메서드로 modal 내 요소의 내용을 채웁니다.
    $('#modalUser').text($(btn).data('user'));
    $('#modalEmail').text($(btn).data('mail'));
    $('#modalSubject').text($(btn).data('subject'));
    $('#modalMessage').text($(btn).data('message'));
	
	  var attachmentWrapper = modal.find('#modalAttachmentWrapper');
	  var attachmentLink = modal.find('#modalAttachmentLink');

	  // 1. attachmentPath 데이터 가져오기
	  var attachmentPath = $(btn).data('attachment-path');

	  if (attachmentPath) {
		  // 2. attachmentPath에서 원본 파일명 추출 (첫 '_' 이후)
		  var underscoreIndex = attachmentPath.indexOf('_');
		  var originalFileName = attachmentPath; // 기본값
		  if (underscoreIndex > -1) {
			  originalFileName = attachmentPath.substring(underscoreIndex + 1);
		  }

		  // 3. 다운로드 URL 생성
		  var downloadUrl = window.contextPath + '/admin/contactUs/download?attachmentPath='
			  + encodeURIComponent(attachmentPath);

		  // 4. 링크 속성 및 텍스트 설정
		  attachmentLink.attr('href', downloadUrl);
		  attachmentLink.text(originalFileName); // 추출한 파일명으로 표시

		  attachmentWrapper.show();
	  } else {
		  attachmentWrapper.hide();
	  }
  });

});