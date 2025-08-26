$(document).ready(function() {
	// 전체 선택/해제
	$('#selectAll').on('click', function() {
		$('.selectBox').prop('checked', this.checked);
	});

	// APPLY 버튼 클릭 이벤트
	$('#btn-apply').on('click', function() {
		const $checkedRows = $('.selectBox:checked');

		if ($checkedRows.length === 0) {
			alert('Please select at least one user.');
			return;
		}

		// 1. 서버에 보낼 데이터를 담을 배열 생성
		const dataToSave = [];

		// 2. 체크된 각 행을 순회하며 데이터 수집
		$checkedRows.each(function() {
			const $row = $(this).closest('tr'); // 현재 체크박스가 속한 행(tr)
			const userId = $(this).val(); // 체크박스의 값 (사용자 ID)
			const themeId = $row.find('select').eq(0).val(); // 행의 첫 번째 select (테마)
			const font = $row.find('select').eq(1).val(); // 행의 두 번째 select (폰트)

			dataToSave.push({
				userId: parseInt(userId, 10),
				themeId: parseInt(themeId, 10),
				font: font
			});
		});
		
		// 3. Fetch API를 사용하여 서버에 데이터 전송
		fetch(`${ctx}/admin/theme/apply`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(dataToSave) // 수집한 데이터 배열을 JSON 형태로 전송
		})
			.then(response => {
				if (!response.ok) {
					// 서버에서 에러 응답 시 처리
					return response.json().then(err => { throw new Error(err.message); });
				}
				return response.json();
			})
			.then(result => {
				// 성공적으로 처리된 경우
				if (result.status === 'success') {
					alert(result.message);
					window.location.reload(); // 페이지 새로고침
				} else {
					alert('Error: ' + (result.message || 'Failed to apply changes.'));
				}
			})
			.catch(error => {
				// 네트워크 오류나 기타 예외 처리
				console.error('Error applying changes:', error);
				alert('An error occurred: ' + error.message);
			});
	});
});