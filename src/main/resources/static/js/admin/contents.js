// $(document).ready()의 축약형입니다.
// DOM이 완전히 로드된 후 스크립트가 실행되도록 보장합니다.
// ★★★ 전역 변수로 팝업 참조 저장 ★★★
var impersonatePopup = null;

$(function() {

	if (!userId) {
		const $userSelect = $('#userId');
		if ($userSelect.find('option').length > 0) {
			$userSelect.val($userSelect.find('option:first').val()); // Select the first option
			$('.search-form').submit(); // Trigger form submission
		}
	}

	// 전체 선택/해제
	$('#selectAll').on('click', function() {
		// this는 #selectAll 체크박스 자체를 가리킵니다.
		// .prop()을 사용하여 checked 속성을 일괄 변경합니다.
		$('.selectBox').prop('checked', $(this).prop('checked'));
	});

	// 모달 관련 요소들을 jQuery 객체로 미리 선택해 둡니다.
	const $registerModalEl = $('#registerModal');
	const $form = $('#registerForm');
	const $titleEl = $('#registerModalLabel');
	const $submitBtn = $('#registerSubmitBtn');

	// Bootstrap 모달 인스턴스 생성 (Bootstrap 5 API는 그대로 사용)
	const registerModal = new bootstrap.Modal($registerModalEl[0]);

	// ✅ [추가] 모달 폼 제출 전 pages 감소 경고
	$('#registerSubmitBtn').on('click', function(e) {
		const originalPages = parseInt($('#originalPagesInput').val(), 10);
		const newPages = parseInt($('#pagesInput').val(), 10);

		// originalPagesInput이 있고 (MODIFY 모드), pages가 줄어든 경우에만 경고
		if (!isNaN(originalPages) && originalPages > 0 && !isNaN(newPages) && newPages < originalPages) {
			const diff = originalPages - newPages;
			const confirmed = confirm(
				'⚠️ Warning: Pages reduced from ' + originalPages + ' → ' + newPages + '\n\n' +
				diff + ' page(s) will be permanently deleted from the database.\n' +
				'Any saved yearbook data for those pages will be lost.\n\n' +
				'Are you sure you want to proceed?'
			);
			if (!confirmed) {
				e.preventDefault();
				e.stopPropagation();
				return false;
			}
		}
	});

	// --- 1) REGISTER 버튼 클릭 ---
	$('#btn-register').on('click', function() {

		// 다른 체크박스들 선택 해제
		$('.selectBox').prop('checked', false);
		$('#selectAll').prop('checked', false);

		// jQuery 객체에서 DOM 요소의 reset() 메서드를 호출합니다.
		$form[0].reset();
		// .val()로 form 필드 값 설정

		// .attr()로 form의 action 속성 변경
		$form.attr('action', ctx + '/admin/contents/register');

		// .text()로 요소의 텍스트 내용 변경
		$titleEl.text('CONTENTS REGISTRATION');
		$submitBtn.text('등록');

		registerModal.show();
	});

	// --- 2) MODIFY 버튼 클릭 ---
	$('#btn-modify').on('click', function() {
		const $checked = $('.selectBox:checked');

		if ($checked.length !== 1) {
			alert('Please select only one contents to edit.');
			return;
		}

		const $row = $checked.closest('tr');

		const id = $checked.val();
		$('#id').val(id);
		$('#userId').val(userId);

		let categoryText = $row.find('td:eq(2)').text().trim().toLowerCase();
		$('#categorySelect').val(categoryText);

		$('#titleInput').val($row.find('td:eq(3)').text().trim());

		const currentPages = parseInt($row.find('td:eq(4)').text().trim(), 10);
		$('#pagesInput').val(currentPages);

		// ✅ [추가] 원본 pages 값을 hidden input에 저장 (수정 시 감소 경고용)
		$('#originalPagesInput').val(currentPages);

		$form.attr('action', ctx + '/admin/contents/modify');
		$titleEl.text('CONTENTS MODIFY');
		$submitBtn.text('수정');

		registerModal.show();
	});

	// --- 일괄적용 ---
	$('#btn-apply').on('click', function() {
		const checkedIds = getCheckedIds();
		if (checkedIds.length === 0) {
			alert('Please select one or more items to apply.');
			return;
		}

		if (confirm(checkedIds.length + ' Would you like to apply (activate) the items?')) {
			performAjaxAction('/admin/contents/apply', checkedIds, $("#userId").val(), '적용');
		}
	});

	// 체크된 체크박스의 id 배열을 반환하는 헬퍼 함수
	function getCheckedIds() {
		return $('.selectBox:checked').map(function() {
			return $(this).val();
		}).get();
	}

	// 삭제/적용 AJAX 요청을 처리하는 공통 함수
	function performAjaxAction(url, ids, userId, actionType) {
		$.ajax({
			url: ctx + url,
			type: 'POST',
			data: {
				ids: ids,
				userId: userId
			}, // Spring에서 List<Long>으로 받기 위해 객체 형태로 전송
			traditional: true, // 배열을 올바르게 전송하기 위한 jQuery 설정
			success: function(response) {
				location.reload();
			},
			error: function(xhr, status, error) {
				alert(actionType + ' an error occurred.');
			}
		});
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
			url: ctx + '/admin/contents/toggle-active',
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

	// 초기 로드 시 실행
	updateImpersonateButtonText();

	// select 변경 시 실행
	$('select[name="userId"]').on('change', updateImpersonateButtonText);

	function updateImpersonateButtonText() {
		var select = $('select[name="userId"]');
		var button = $('#impersonateBtn');

		if (select.length > 0 && button.length > 0) {
			var selectedText = select.find('option:selected').text();

			// 텍스트가 있을 때만 업데이트
			if (selectedText && selectedText.trim() !== '') {
				// 줄바꿈 추가
				var newText = '<small>view as </small>' + '<b>' + selectedText + '</b>';

				// button의 HTML을 변경 (text() 대신 html() 사용)
				button.html(newText);

				// 디버깅용 로그
				console.log('Impersonate button updated:', newText);
			}
		} else {
			console.error('Could not find select or button element');
		}
	}
});

// ★★★ 수정된 openImpersonateWindow 함수 ★★★
function openImpersonateWindow() {
	const selectElement = jQuery('select[name="userId"]')[0];
	const selectedUserId = selectElement ? selectElement.value : null;

	if (!selectedUserId) {
		alert('Please select a user first');
		return;
	}

	// 이미 열린 팝업이 있으면 닫기
	if (impersonatePopup && !impersonatePopup.closed) {
		impersonatePopup.close();
	}

	const selectedOption = selectElement.options[selectElement.selectedIndex];
	const userName = selectedOption ? selectedOption.text : 'User';

	if (!confirm('Open ' + userName + ' in new window?')) {
		return;
	}

	const width = 1920;
	const height = 1080;
	const left = (screen.width - width) / 2;
	const top = (screen.height - height) / 2;

	impersonatePopup = window.open(
		ctx + '/admin/impersonate?userId=' + selectedUserId,
		'user_' + selectedUserId + '_' + Date.now(),
		'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top +
		',scrollbars=yes,resizable=yes'
	);

	if (impersonatePopup) {
		impersonatePopup.focus();

		var checkInterval = setInterval(function() {
			if (impersonatePopup.closed) {
				clearInterval(checkInterval);
				console.log('Popup closed, restoring admin session...');

				// 로그아웃 대신 restoreSession=true로 리다이렉트
				window.location.href = ctx + '/logout';
			}
		}, 500);
	}
}