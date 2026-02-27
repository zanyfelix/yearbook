$(document).ready(function() {
	// 전체 선택/해제
	$('#selectAll').on('click', function() {
		$('.selectBox').prop('checked', this.checked);
	});

	const registerModalEl = document.getElementById('registerModal');
	const registerModal = new bootstrap.Modal(registerModalEl);
	const $form = $('#registerForm');
	const $titleEl = $('#registerModalLabel');
	const $submitBtn = $('#registerSubmitBtn');

	// --- 1) REGISTER 버튼 클릭 ---
	$('#btn-register').on('click', function() {
		// 모든 체크박스 해제
		$('.selectBox').prop('checked', false);
		$('#selectAll').prop('checked', false);

		$form[0].reset(); // 폼 초기화
		$('#userIdHidden').val(''); // hidden input 초기화
		$form.attr('action', window.contextPath + '/admin/user/register');
		$titleEl.text('USER REGISTRATION');
		$submitBtn.text('등록');
		registerModal.show();
	});

	// --- 2) MODIFY 버튼 클릭 ---
	$('#btn-modify').on('click', function() {
		const $checked = $('.selectBox:checked');
		if ($checked.length !== 1) {
			alert('Please select only one user to edit.');
			return;
		}

		const $row = $checked.closest('tr');
		const id = $checked.val();

		// 1) PK 및 나머지 필드 채우기
		$('#userIdHidden').val(id);
		$('#userIdInput').val($row.children().eq(2).text().trim());
		$('#passwordInput').val($row.children().eq(3).text().trim());
		$('#schoolInput').val($row.children().eq(4).text().trim());

		// 날짜 처리
		const dateText = $row.children().eq(5).text().trim();
		const date = new Date(dateText.replace(' ', 'T'));
		const $deadlineInput = $('#deadlineInput');

		if ($deadlineInput.attr('type') === 'date') {
			$deadlineInput.prop('valueAsDate', date);
		} else if ($deadlineInput.attr('type') === 'datetime-local') {
			const tzOffsetMs = date.getTimezoneOffset() * 60000;
			const localISO = new Date(date - tzOffsetMs).toISOString().slice(0, 16);
			$deadlineInput.val(localISO);
		} else {
			$deadlineInput.val(dateText);
		}

		// 역할(Role) 처리
		let roleText = $row.children().eq(6).text().trim().toLowerCase();
		$('#roleSelect').val(roleText);

		// 3) 모달 설정 변경
		$form.attr('action', window.contextPath + '/admin/user/modify');
		$titleEl.text('USER MODIFY');
		$submitBtn.text('수정');

		registerModal.show();
	});
	
	// DELETE 버튼 클릭 시
	$('#btn-delete').on('click', function(e) {
		const $checked = $('.selectBox:checked');
		// 선택된 항목이 없으면 경고창을 띄우고 폼 제출을 막습니다.
		if ($checked.length === 0) {
			alert('Please select only one user to edit.');
			e.preventDefault();
		}
		// 선택된 항목이 있으면, form의 onsubmit 이벤트가 정상적으로 실행됩니다.
	});

	// safeMargin 토글 스위치 변경 (3mm ↔ 6mm)
	$('.safe-margin-toggle input[type="checkbox"]').on('change', function() {
		const $this = $(this);
		const payload = {
			id: +$this.data('user-id'),
			safeMargin: this.checked ? 6 : 3
		};

		$.ajax({
			url: window.contextPath + '/admin/user/toggle-safe-margin',
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			success: function() {
				// 성공
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert('Safe margin change failed: ' + errorThrown);
				$this.prop('checked', !$this.prop('checked')); // 실패 시 원복
			}
		});
	});

	// active 토글 스위치 변경
	$('.toggle-switch input[type="checkbox"]').on('change', function() {
		const $this = $(this);

		// 활성화 시 마감일 체크
		if (this.checked) {
			const $row = $this.closest('tr');
			const deadlineText = $row.children().eq(5).text().trim();
			if (deadlineText) {
				const deadlineDate = new Date(`${deadlineText}T00:00:00`);
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				if (deadlineDate <= today) {
					alert('If the submission deadline is today or a past date, activation is not possible.');
					this.checked = false; // 체크 원복
					return;
				}
			}
		}

		const payload = {
			id: +$this.data('user-id'),
			active: this.checked
		};

		// fetch를 jQuery.ajax로 변경
		$.ajax({
			url: window.contextPath + '/admin/user/toggle-active',
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