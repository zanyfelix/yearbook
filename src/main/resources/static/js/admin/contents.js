document.addEventListener('DOMContentLoaded', () => {
  // 전체 선택/해제
  document.getElementById('selectAll')
    .addEventListener('click', function() {
      document.querySelectorAll('.selectBox').forEach(cb => cb.checked = this.checked);
    });
	
	const registerModalEl = document.getElementById('registerModal');
	  const registerModal   = new bootstrap.Modal(registerModalEl);
	  const form            = document.getElementById('registerForm');
	  const titleEl         = document.getElementById('registerModalLabel');
	  const submitBtn       = document.getElementById('registerSubmitBtn');

	  // --- 1) REGISTER 버튼 클릭 ---
	  document.getElementById('btn-register').addEventListener('click', () => {
		
		document.querySelectorAll('.selectBox').forEach(cb => cb.checked = false);
		const selectAllChk = document.getElementById('selectAll');
		if (selectAllChk) selectAllChk.checked = false;
		
	    form.reset();                       // 폼 초기화
	    document.getElementById('userId').value = userId;
	    form.action = ctx +'/admin/contents/register';
	    titleEl.textContent = 'CONTENTS REGISTRATION';
	    submitBtn.textContent = '등록';
	    registerModal.show();
	  });

	  // --- 2) MODIFY 버튼 클릭 ---
	  document.getElementById('btn-modify').addEventListener('click', () => {
	    const checked = document.querySelectorAll('.selectBox:checked');
	    if (checked.length !== 1) {
	      alert('Please select only one contents to edit.');
	      return;
	    }
	    const row = checked[0].closest('tr');
	    // 1) PK 채우기
	    const id = checked[0].value;
	    document.getElementById('id').value = id;
		document.getElementById('userId').value = userId;

	    // 2) 나머지 필드 읽어와서 채우기
		let categoryText = row.children[2].textContent.trim();
		categoryText = categoryText.toLowerCase();
		const categorySelect = document.getElementById('categorySelect');
		categorySelect.value = categoryText;
	    document.getElementById('titleInput').value    = row.children[3].textContent.trim();
		document.getElementById('pagesInput').value    = row.children[4].textContent.trim();
		
	    // 3) 모달 설정 변경
	    form.action = ctx +'/admin/contents/modify';
	    titleEl.textContent = 'CONTENTS MODIFY';
	    submitBtn.textContent = '수정';

	    registerModal.show();
	  });
});
