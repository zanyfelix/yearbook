// js/admin/home.js

$(function() {
	//userId가 없을 경우 첫번째 강제 선택
	if($("#userId").val() == '') {
		$("#search").trigger('click');
	}
	
    // 최상단의 SAVE 버튼(#btn-apply) 클릭 이벤트 (Yearbook Guidance 파일 저장용)
	$('#homeForm #btn-apply').on('click', function() {
		var formData = new FormData($('#homeForm')[0]);
		if ($('#file')[0].files.length === 0) {
			alert('Please select the file you want to upload.');
			return;
		}
		// ... (기존 AJAX 파일 업로드 로직) ...
        $.ajax({
            url: $('#homeForm').attr('action'),
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                alert("Saved successfully.");
                location.reload();
            },
            error: function(xhr, status, error) {
                alert('An error occurred while saving.');
            }
        });
	});

    // --- 하단 테이블용 버튼 기능 ---

    // REGISTER 버튼 클릭: 모달 초기화 후 열기
    $('#btn-register').on('click', function() {
        // 폼 초기화
        $('#registerForm')[0].reset();
        $('#homeId').val(''); // id 필드 초기화
        
        // 모달 제목 변경
        $('#registerModalLabel').text('REGISTRATION');
        
        // 모달 열기는 data-bs-toggle 속성으로 자동 처리됨
    });

    // MODIFY 버튼 클릭: 선택된 데이터로 모달 채우고 열기
    $('#btn-modify').on('click', function() {
        const checkedBoxes = $('.selectBox:checked');

        if (checkedBoxes.length !== 1) {
            alert('Please select only one item to edit.');
            return;
        }

        const checkedRow = checkedBoxes.closest('tr');
        const id = checkedBoxes.val();
        const title = checkedRow.find('td:eq(1)').text().trim();
        const description = checkedRow.find('td:eq(2) textarea').val().trim();
		const isActive = checkedRow.find('td:eq(3)').val().trim();

        // 모달 필드 채우기
        $('#homeId').val(id);
        $('#title').val(title);
        $('#description').val(description);
		$('#isActive').val(isActive);

        // 모달 제목 변경 및 열기
        $('#registerModalLabel').text('MODIFY');
        new bootstrap.Modal($('#registerModal')).show();
    });

    // DELETE 버튼 클릭: 선택된 항목 삭제
    $('#btn-delete').on('click', function() {
        const checkedIds = getCheckedIds();
        if (checkedIds.length === 0) {
            alert('Please select one or more items to delete.');
            return;
        }

        if (confirm(checkedIds.length + 'Are you sure you want to delete items?')) {
            performAjaxAction('/admin/home/delete', checkedIds, '삭제');
        }
    });

    // 하단의 APPLY 버튼 클릭: 선택된 항목 활성화
    $('.btn-wrapper > button#btn-apply-status').on('click', function() {
        const checkedIds = getCheckedIds();
        if (checkedIds.length === 0) {
            alert('Please select one or more items to apply.');
            return;
        }
        
        if (confirm(checkedIds.length + 'Would you like to apply (activate) the items?')) {
            performAjaxAction('/admin/home/apply', checkedIds, '적용');
        }
    });

    // 체크된 체크박스의 id 배열을 반환하는 헬퍼 함수
    function getCheckedIds() {
        return $('.selectBox:checked').map(function() {
            return $(this).val();
        }).get();
    }

    // 삭제/적용 AJAX 요청을 처리하는 공통 함수
    function performAjaxAction(url, ids, actionType) {
        $.ajax({
            url: ctx + url,
            type: 'POST',
            data: { ids: ids }, // Spring에서 List<Long>으로 받기 위해 객체 형태로 전송
            traditional: true, // 배열을 올바르게 전송하기 위한 jQuery 설정
            success: function(response) {
                alert(response);
                location.reload();
            },
            error: function(xhr, status, error) {
                alert(actionType + ' an error occurred.');
            }
        });
    }
    
    // 전체 선택 체크박스
    window.toggleAll = function(source) {
		$('.selectBox').prop('checked', source.checked);
	}
	
	// active 토글 스위치 변경
	$('.toggle-switch input[type="checkbox"]').on('change', function() {
		const $this = $(this);

		const payload = {
			id: +$this.data('id'),
			active: this.checked
		};

		// fetch를 jQuery.ajax로 변경
		$.ajax({
			url: ctx + '/admin/home/toggle-active',
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			// CSRF 토큰이 필요하다면 아래 주석을 해제하고 설정
			/*
			beforeSend: function(xhr) {
			  const token = $('meta[name="_csrf"]').attr('content');
			  const header = $('meta[name="_csrf_header"]').attr('content');
			  if (token && header) {
				xhr.setRequestHeader(header, token);
			  }
			},
			*/
			success: function() {
				// 성공 시 특별한 동작 없음
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert('State change failed: ' + errorThrown);
				$this.prop('checked', !$this.prop('checked')); // 실패 시 체크박스 원상 복구
			}
		});
	});
});