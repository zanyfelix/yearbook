function updateFontOptions(themeSelectElement) {
    // data-theme-no 속성에서 그룹 번호를 가져옴
    const selectedThemeNo = themeSelectElement.find('option:selected').data('theme-no');
    const fontSelect = themeSelectElement.closest('tr').find('.font-select');

    fontSelect.empty().prop('disabled', true).append($('<option>', { text: 'Loading...' }));

    if (!selectedThemeNo) {
        fontSelect.empty().prop('disabled', true).append($('<option>', { text: 'Select Theme' }));
        return;
    }

    $.ajax({
        url: `${ctx}/api/themes/${selectedThemeNo}/fonts`,
        type: 'GET',
        success: function(fonts) {
            fontSelect.empty().prop('disabled', false);
            if (fonts && fonts.length > 0) {
                $.each(fonts, function(index, font) {
                    // value에는 폰트의 고유 ID, text에는 파일명을 넣음
                    fontSelect.append($('<option>', { value: font.id, text: font.filename }));
                });
            } else {
                fontSelect.append($('<option>', { value: '', text: 'No fonts available' }));
            }
        },
        error: function() {
            fontSelect.empty().prop('disabled', false).append($('<option>', { text: 'Error' }));
        }
    });
}

$(document).ready(function() {
	
	// 1. 페이지 로딩 시 각 행에 대해 초기 폰트 목록을 설정
	$('.theme-select').each(function() {
		updateFontOptions($(this));
	});
	
	// 테마 드롭다운 변경 시 실시간 업데이트
	$(document).on('change', '.theme-select', function() {
		updateFontOptions($(this));
	});
		
	// 전체 선택/해제
	$('#selectAll').on('click', function() {
		$('.selectBox').prop('checked', this.checked);
	});

	// 'APPLY' 버튼 클릭 이벤트
	$('#btn-apply').on('click', function() {
		const requests = [];
		$('.selectBox:checked').each(function() {
			const row = $(this).closest('tr');
			requests.push({
				userId: $(this).val(),
				themeId: row.find('.theme-select').find('option:selected').data('theme-no'),
				fontId: row.find('.font-select').val()
			});
		});

		if (requests.length === 0) {
			alert('Please select at least one user.');
			return;
		}

		$.ajax({
			url: `${ctx}/admin/theme/apply`,
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(requests),
			success: function(response) {
				alert(response.message);
				location.reload();
			},
			error: function(xhr) {
				const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error';
				alert('An error occurred: ' + errorMsg);
			}
		});
	});
});