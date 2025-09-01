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
	var contactId = $(btn).data('id');
	modal.find('#modalContactId').val(contactId);
	
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
  
  $('#btn-apply').on('click', function(e) {
      e.preventDefault(); // 기본 동작 방지

      if ($('.selectBox:checked').length === 0) {
        alert('Please select items to apply.');
        return;
      }

      if (confirm('Are you sure you want to apply the selected users?')) {
        var form = $('#applyForm');
        // form의 action이 apply URL인지 확인하고 전송
        form.attr('action', window.contextPath + '/admin/contactUs/apply');
        form.submit();
      }
    });

    // "DELETE" 버튼 클릭 이벤트 핸들러 (기존 코드)
    $('#btn-delete').on('click', function(e) {
      e.preventDefault(); 

      if ($('.selectBox:checked').length === 0) {
        alert('Please select items to delete.');
        return;
      }

      if (confirm('Are you sure you want to delete the selected items?')) {
        var form = $('#applyForm');
        // form의 action을 delete URL로 변경하고 전송
        form.attr('action', window.contextPath + '/admin/contactUs/delete');
        form.submit();
      }
    });
	
	$('#forwardInquiryBtn').on('click', function() {
	    var id = $('#modalContactId').val();

	    if (!id) {
	      alert('Could not find the inquiry ID.');
	      return;
	    }

	    // 버튼 비활성화
	    var forwardButton = $(this);
	    forwardButton.prop('disabled', true).text('Forwarding...');

	    $.ajax({
	      type: 'POST',
	      url: window.contextPath + '/admin/contactUs/forwardInquiry',
	      data: {
	        id: id
	      },
	      success: function(response) {
	        alert(response.message); // 성공 메시지 표시
	        $('#contactModal').modal('hide'); // 모달 닫기
	      },
	      error: function(xhr) {
	        var errorMsg = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred.';
	        alert('Error: ' + errorMsg);
	      },
	      complete: function() {
	        // 버튼 다시 활성화
	        forwardButton.prop('disabled', false).text('Forward to Admin');
	      }
	    });
	  });
});