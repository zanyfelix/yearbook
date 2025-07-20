// src/main/resources/static/js/admin/user.js

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
	    form.reset();                       // 폼 초기화
	    document.getElementById('idHidden').value = '';
	    form.action = window.contextPath +'/admin/home/register';
	    titleEl.textContent = 'HOME REGISTRATION';
	    submitBtn.textContent = '등록';
	    registerModal.show();
	  });

	  // --- 2) MODIFY 버튼 클릭 ---
	  document.getElementById('btn-modify').addEventListener('click', () => {
	    const checked = document.querySelectorAll('.selectBox:checked');
	    if (checked.length !== 1) {
	      alert('수정할 사용자를 하나만 선택하세요.');
	      return;
	    }
	    const row = checked[0].closest('tr');

	    // 1) PK 채우기
	    const id = checked[0].value;
	    document.getElementById('userIdHidden').value = id;

	    // 2) 나머지 필드 읽어와서 채우기
	    document.getElementById('userIdInput').value    = row.children[2].textContent.trim();
	    document.getElementById('passwordInput').value  = row.children[3].textContent.trim();
	    document.getElementById('nameInput').value      = row.children[4].textContent.trim();
	    document.getElementById('schoolInput').value    = row.children[5].textContent.trim();
	    document.getElementById('mailInput').value      = row.children[6].textContent.trim();
	    let roleText = row.children[7].textContent.trim();
		roleText = roleText.toLowerCase();
		const roleSelect = document.getElementById('roleSelect');
		roleSelect.value = roleText;
		
	    // 3) 모달 설정 변경
	    form.action = window.contextPath +'/admin/home/modify';
	    titleEl.textContent = 'USER MODIFY';
	    submitBtn.textContent = '수정';

	    registerModal.show();
	  });

	//active변경
	const toggleUrl = window.contextPath + '/admin/home/toggle-active';
	document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(chk => {
	  chk.addEventListener('change', function() {
	    const payload = {
	      id:     +this.dataset.userId,
	      active: this.checked
	    };
	    //const token  = document.querySelector('meta[name="_csrf"]').content;
	    //const header = document.querySelector('meta[name="_csrf_header"]').content;

	    fetch(toggleUrl, {
	      method: 'POST',
	      headers: {
	        'Content-Type': 'application/json'
	      },
	      body: JSON.stringify(payload)
	    })
	    .then(res => { if (!res.ok) throw new Error(res.statusText); })
	    .catch(err => {
	      alert('상태 변경 실패: ' + err.message);
	      this.checked = !this.checked;
	    });
	  });
	});
});
