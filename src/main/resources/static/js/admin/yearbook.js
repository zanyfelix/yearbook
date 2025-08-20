function toggleAll(source) {
    [cite_start]// Finds all checkboxes with the class 'selectBox' [cite: 6]
    const checkboxes = document.querySelectorAll('input.selectBox');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }
}

$(document).ready(function() {
	$('#btn-apply').on('click', function() {
		const selectedIds = [];
		
		$('.selectBox:checked').each(function() {
			selectedIds.push($(this).val());
		});
		
		if (selectedIds.length === 0) {
			alert('Please select at least one user to download.');
			return;
		}
		
		const downloadUrl = `${ctx}/admin/yearbook/download?ids=${selectedIds.join(',')}`;
		
		window.location.href = downloadUrl;
		
		alert("success");
		location.reload(true);
	});
	
	$('.selectBox').on('click', function() {
		if (!this.checked) {
			$('#selectAll').prop('checked', false);
		}
	});
});