// js/admin/submit.js

// 이미지 순서를 추적할 변수
var currentImageIndex = 0;
var imageList = [];

// ★★★ 전역 변수로 팝업 참조 저장 ★★★
var impersonatePopup = null;

// 썸네일 로딩을 위한 AJAX 함수 (전역 함수로 변경)
function loadPreviewData(contentsId) {
	$.ajax({
		url: ctx + '/admin/submit/previewData',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({ contentsId: contentsId }),
		success: function(response) {
			if (!response || response.length === 0) {
				alert('There is no data saved.');
				return;
			}
			imageList = response.map(function(item) {
				return {
					url: item.thumbnailPath
				};
			});
			currentImageIndex = 0;
			updatePreviewModal();
			var previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
			previewModal.show();
		},
		error: function() {
			alert('Failed to load thumbnails.');
		}
	});
}

// 모달에 이미지 표시 (전역 함수로 변경)
function updatePreviewModal() {
	if (imageList && imageList.length > 0) {
		let image = imageList[currentImageIndex];
		$('#previewImage').attr('src', image.url);
		$('#previewLabel').text(image.title);
	}
}

// 화살표 클릭 시 이미지 변경 (전역 함수로 변경)
function showNextImage() {
	if (currentImageIndex < imageList.length - 1) {
		currentImageIndex++;
		updatePreviewModal();
	} else {
		alert("This is last image");
	}
}

// 화살표 클릭 시 이미지 변경 (전역 함수로 변경)
function showPreviousImage() {
	if (currentImageIndex > 0) {
		currentImageIndex--;
		updatePreviewModal();
	} else {
		alert("This is first image");
	}
}

function toggleNoteEditMode() {
	const $noteTextarea = $('#noteTextarea');
	const $editBtn = $('.note-controls .btn-edit');
	const $saveBtn = $('.note-controls .btn-save');

	$editBtn.hide();
	$saveBtn.show();

	$noteTextarea.prop('readonly', false)
		.removeClass('readonly-mode')
		.addClass('edit-mode');
}

// Note 저장
function saveNote() {
	const $noteTextarea = $('#noteTextarea');
	const $editBtn = $('.note-controls .btn-edit');
	const $saveBtn = $('.note-controls .btn-save');

	$saveBtn.hide();
	$editBtn.show();

	$noteTextarea.prop('readonly', true)
		.removeClass('edit-mode')
		.addClass('readonly-mode');

	const noteData = {
		sectionId: 'note',
		type: 'note',
		content: $noteTextarea.val(),
		userId: $('input[name="userId"]').val()
	};

	$.ajax({
		url: ctx + '/admin/submit/section/saveNote',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(noteData),
		success: function(response) {
			if (response.success) {
				console.log('Note saved successfully');
			} else {
				alert('Error: ' + response.message);
			}
		},
		error: function(xhr, status, error) {
			alert('Error saving note: ' + error);
		}
	});
}

// 편집 모드 토글
function toggleEditMode(sectionId) {
	const $section = $(`[data-section-id="${sectionId}"]`);
	const $editBtn = $section.find('.btn-edit');
	const $saveBtn = $section.find('.btn-save');
	const $textareas = $section.find('textarea');
	const $titleInput = $section.find('.section-title-input');
	const $checkboxes = $section.find('.preview-confirm-check, .submission-check');

	$editBtn.hide();
	$saveBtn.show();

	$textareas.prop('readonly', false)
		.removeClass('readonly-mode')
		.addClass('edit-mode');

	if ($titleInput.length) {
		$titleInput.prop('readonly', false)
			.removeClass('readonly-mode')
			.addClass('edit-mode');
	}

	$checkboxes.prop('disabled', false);

	if (sectionId === 'submission') {
		$('#addSubmissionBtn').show();
	}
}

// 섹션 저장
function saveSection(sectionId) {
	const $section = $(`[data-section-id="${sectionId}"]`);
	const $editBtn = $section.find('.btn-edit');
	const $saveBtn = $section.find('.btn-save');
	const $textareas = $section.find('textarea').not('.note-textarea');
	const $titleInput = $section.find('.section-title-input');
	const $checkboxes = $section.find('.preview-confirm-check, .submission-check');
	const $activeToggle = $section.find('.toggle-switch input[type="checkbox"]');

	$saveBtn.hide();
	$editBtn.show();

	$textareas.prop('readonly', true)
		.removeClass('edit-mode')
		.addClass('readonly-mode');

	if ($titleInput.length) {
		$titleInput.prop('readonly', true)
			.removeClass('edit-mode')
			.addClass('readonly-mode');
	}

	$checkboxes.prop('disabled', true);

	if (sectionId === 'submission') {
		$('#addSubmissionBtn').hide();
	}

	const sectionType = $section.data('section-type');

	const sectionData = {
		sectionId: sectionId,
		type: sectionType === 'default' ? sectionId : 'custom',
		content: $textareas.first().val(),
		title: $titleInput.val() || '',
		userId: $('input[name="userId"]').val(),
		isActive: $activeToggle.is(':checked'),
		id: $section.find('input[type="hidden"][name*=".id"]').val()
	};

	if (sectionId === 'submission') {
		const submissions = [];
		$section.find('.submission-item').each(function() {
			const $item = $(this);
			submissions.push({
				description: $item.find('textarea').val()
			});
		});
		sectionData.submissions = submissions;
	}

	$.ajax({
		url: ctx + '/admin/submit/section/save',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(sectionData),
		success: function(response) {
			if (response.success) {
				console.log('Section saved successfully');
				if (response.sectionId) {
					$section.find('input[type="hidden"][name*=".id"]').val(response.sectionId);
				}
			} else {
				alert('Error: ' + response.message);
			}
		},
		error: function(xhr, status, error) {
			alert('Error saving section: ' + error);
		}
	});
}

$(function() {
	$(document).on('click', '.btn-edit', function() {
		const sectionId = $(this).closest('[data-section-id]').data('section-id');
		toggleEditMode(sectionId);
	});

	// REGISTER 버튼 클릭: 모달 초기화 후 열기
	$('#btn-register').on('click', function() {
		$('#registerForm')[0].reset();
		$('#submitId').val('');
		$('#registerModalLabel').text('REGISTRATION');
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
		const isActive = checkedRow.find('input[type="checkbox"][data-id]').is(':checked');

		$('#submitId').val(id);
		$('#title').val(title);
		$('#description').val(description);
		$('#isActive').val(isActive);

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

		if (confirm(checkedIds.length + ' Are you sure you want to delete items?')) {
			performAjaxAction('/admin/submit/delete', checkedIds, 'delete');
		}
	});

	// APPLY 버튼 클릭: 선택된 항목 활성화
	$('.btn-wrapper > button#btn-apply-status').on('click', function() {
		const checkedIds = getCheckedIds();
		if (checkedIds.length === 0) {
			alert('Please select one or more items to apply.');
			return;
		}

		if (confirm(checkedIds.length + ' Would you like to apply (activate) the items?')) {
			performAjaxAction('/admin/submit/apply', checkedIds, 'apply');
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
			data: { ids: ids },
			traditional: true,
			success: function(response) {
				alert(response);
				location.reload();
			},
			error: function(xhr, status, error) {
				alert('Error occurred during ' + actionType);
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

		$.ajax({
			url: ctx + '/admin/submit/toggle-active',
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			success: function() {
				// 성공 시 특별한 동작 없음
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert('State change failed: ' + errorThrown);
				$this.prop('checked', !$this.prop('checked'));
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

			if (selectedText && selectedText.trim() !== '') {
				var newText = '<small>view as </small>' + '<b>' + selectedText + '</b>';
				button.html(newText);
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
				window.location.href = ctx + '/logout';
			}
		}, 500);
	}
}

/**
 * 모든 사용자에게 Submission 복사 모달 표시
 */
function showSubmitCopyToAllModal() {
	const dataRows = $('.selectBox').length;

	if (dataRows === 0) {
		alert('No data to copy. Please register content first.');
		return;
	}

	$('#currentSubmitUserName').text($('select[name="userId"]').find('option:selected').text());

	const modal = new bootstrap.Modal(document.getElementById('submitCopyToAllModal'));
	modal.show();
}

/**
 * 모든 사용자에게 Submission 복사 실행
 */
function executeSubmitCopyToAll() {
	const button = event.target;
	const originalText = button.innerHTML;
	button.disabled = true;
	button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Copying...';

	$.ajax({
		url: ctx + '/admin/submit/copyToAllUsers',
		method: 'POST',
		data: {
			sourceUserId: currentUserId
		},
		success: function(response) {
			if (response.success) {
				bootstrap.Modal.getInstance(document.getElementById('submitCopyToAllModal')).hide();
				alert(`Successfully copied submission to ${response.affectedUsers || 'all'} users!`);
			} else {
				alert('Failed to copy: ' + (response.message || 'Unknown error'));
			}
		},
		error: function(xhr, status, error) {
			console.error('Copy failed:', error);
			alert('Server error occurred while copying.');
		},
		complete: function() {
			button.disabled = false;
			button.innerHTML = originalText;
		}
	});
}