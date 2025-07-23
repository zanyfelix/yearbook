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
	    document.getElementById('userIdHidden').value = '';
	    form.action = window.contextPath +'/admin/user/register';
	    titleEl.textContent = 'USER REGISTRATION';
	    submitBtn.textContent = '등록';
	    registerModal.show();
	  });

	  // --- 2) MODIFY 버튼 클릭 ---
	  document.getElementById('btn-modify').addEventListener('click', () => {
	    const checked = document.querySelectorAll('.selectBox:checked');
	    if (checked.length !== 1) {
	      alert('Please select only one user to edit.');
	      return;
	    }
	    const row = checked[0].closest('tr');
	    // 1) PK 채우기
	    const id = checked[0].value;
	    document.getElementById('userIdHidden').value = id;

	    // 2) 나머지 필드 읽어와서 채우기
	    document.getElementById('userIdInput').value    = row.children[2].textContent.trim();
		const passwordInput = row.children[3].querySelector('input[name="password"]');
	    document.getElementById('passwordInput').value  = passwordInput?.value.trim();
	    document.getElementById('nameInput').value      = row.children[4].textContent.trim();
	    document.getElementById('schoolInput').value    = row.children[5].textContent.trim();
	    document.getElementById('mailInput').value      = row.children[6].textContent.trim();
		const dateText = row.children[7].textContent.trim();
		const date = new Date(dateText.replace(' ', 'T')); 
		const deadlineInput = document.getElementById('deadlineInput');
		if (deadlineInput.type === 'date') {
		  // <input type="date"> 의 경우
		  deadlineInput.valueAsDate = date;
		}
		else if (deadlineInput.type === 'datetime-local') {
		  // <input type="datetime-local"> 은 "YYYY-MM-DDThh:mm" 형식 필요
		  // toISOString() 은 UTC 기준이므로, 로컬 타임존 오프셋 보정
		  const tzOffsetMs = date.getTimezoneOffset() * 60000;
		  const localISO = new Date(date - tzOffsetMs).toISOString().slice(0,16);
		  deadlineInput.value = localISO;
		}
		else {
		  // 그 외 (text 등) 그냥 문자열 넣기
		  deadlineInput.value = dateText;
		}
	    let roleText = row.children[8].textContent.trim();
		roleText = roleText.toLowerCase();
		const roleSelect = document.getElementById('roleSelect');
		roleSelect.value = roleText;
		
	    // 3) 모달 설정 변경
	    form.action = window.contextPath +'/admin/user/modify';
	    titleEl.textContent = 'USER MODIFY';
	    submitBtn.textContent = '수정';

	    registerModal.show();
	  });

	//active변경
	const toggleUrl = window.contextPath + '/admin/user/toggle-active';
	document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(chk => {
	  chk.addEventListener('change', function() {
		
		  if (this.checked) {
			  const row = this.closest('tr');
			  // 0=checkbox,1=index,2=userId,3=password,4=name,5=school,6=mail,7=deadline,...
			  const deadlineText = row.children[7].textContent.trim();
			  if (deadlineText) {
				  const deadlineDate = new Date(`${deadlineText}T00:00:00`);
				  const today = new Date();
				  today.setHours(0, 0, 0, 0);

				  if (deadlineDate <= today) {
					  alert('If the submission deadline is today or a past date, activation is not possible.');
					  // 체크 원복
					  this.checked = false;
					  return;
				  }
			  }
		  }
		
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