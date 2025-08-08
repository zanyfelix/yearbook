$(document).ready(function() {
	// 전체 선택/해제
	$('#selectAll').on('click', function() {
		$('.selectBox').prop('checked', this.checked);
	});
	
	$('#btn-apply').on('click', function() {
		const $checked = $('.selectBox:checked');
		if ($checked.length !== 1) {
			alert('Please select only one user to edit.');
			return;
		}
		
		alert("success");
		location.reload(true);
	});
});