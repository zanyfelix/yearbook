function toggleAll(source) {
    const checkboxes = document.querySelectorAll('input.selectBox');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }
}

$(document).ready(function() {
	$('#btn-apply').on('click', async function() {
		const selectedIds = [];
	    $('.selectBox:checked').each(function() {
	        selectedIds.push($(this).val());
	    });
	
	    if (selectedIds.length === 0) {
	        alert('Please select at least one user to download.');
	        return;
	    }
		
		// Show loading spinner
		$('#loading-spinner').show();
	
	    // 2. Fetch API를 위한 타임아웃 설정 (예: 5분)
	    const controller = new AbortController();
	    const timeoutId = setTimeout(() => controller.abort(), 300000); // 300,000ms = 5분
	
	    try {
	        const downloadUrl = `${ctx}/admin/yearbook/download?ids=${selectedIds.join(',')}`;
	
	        // 3. fetch를 이용해 백그라운드에서 다운로드 요청
	        const response = await fetch(downloadUrl, {
	            signal: controller.signal // 타임아웃을 위한 signal 전달
	        });
	
	        // 성공 시 타임아웃 타이머 제거
	        clearTimeout(timeoutId);
	
	        if (!response.ok) {
	            // 서버에서 4xx, 5xx 에러 응답 시 예외 발생
	            throw new Error(`Server error: ${response.statusText}`);
	        }
	
	        // 4. 응답받은 파일 데이터를 Blob 객체로 변환
	        const blob = await response.blob();
	        
	        // --- 다운로드된 파일을 브라우저에서 저장시키기 위한 로직 ---
	        const url = window.URL.createObjectURL(blob);
	        const a = document.createElement('a');
	        a.style.display = 'none';
	        a.href = url;
	        // 다운로드될 파일 이름 설정 (서버 응답 헤더에서 가져오는 것이 더 정확함)
	        a.download = 'yearbook_files.zip'; 
	        document.body.appendChild(a);
	        a.click(); // 가상 링크를 클릭하여 다운로드 창 띄우기
	        window.URL.revokeObjectURL(url); // 메모리 해제
	        // ----------------------------------------------------
	
	        alert("Download has started successfully.");
	        location.reload(true); // 성공 후 새로고침
	
	    } catch (error) {
	        if (error.name === 'AbortError') {
	            alert('The request timed out. Please try again.');
	        } else {
	            alert(`An error occurred during download: ${error.message}`);
	        }
	    } finally {
			// Hide loading spinner regardless of success/error
			$('#loading-spinner').hide();
	    }
	});	
});