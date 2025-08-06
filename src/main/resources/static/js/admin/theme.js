$(document).ready(function() {

  // --- 사용자 관리 ---

  const registerModalEl = document.getElementById('registerModal');
  const registerModal = new bootstrap.Modal(registerModalEl);
  const $form = $('#registerForm');
  const $titleEl = $('#registerModalLabel');
  const $submitBtn = $('#registerSubmitBtn');

  // 1) 전체 선택/해제
  $('#selectAll').on('click', function() {
    $('.selectBox').prop('checked', this.checked);
  });

  // 2) REGISTER 버튼 클릭
  $('#btn-register').on('click', function() {
    $form[0].reset(); // 폼 초기화
    $('#userIdHidden').val('');
    $form.attr('action', window.contextPath + '/admin/user/register');
    $titleEl.text('USER REGISTRATION');
    $submitBtn.text('등록');
    registerModal.show();
  });

  // 3) MODIFY 버튼 클릭
  $('#btn-modify').on('click', function() {
    const $checked = $('.selectBox:checked');
    if ($checked.length !== 1) {
      alert('수정할 사용자를 하나만 선택하세요.');
      return;
    }
    const $row = $checked.closest('tr');

    // PK 및 나머지 필드 채우기
    $('#userIdHidden').val($checked.val());
    $('#userIdInput').val($row.children().eq(2).text().trim());
    $('#passwordInput').val($row.children().eq(3).text().trim());
    $('#nameInput').val($row.children().eq(4).text().trim());
    $('#schoolInput').val($row.children().eq(5).text().trim());
    $('#mailInput').val($row.children().eq(6).text().trim());
    
    let roleText = $row.children().eq(7).text().trim().toLowerCase();
    $('#roleSelect').val(roleText);

    // 모달 설정 변경
    $form.attr('action', window.contextPath + '/admin/user/modify');
    $titleEl.text('USER MODIFY');
    $submitBtn.text('수정');

    registerModal.show();
  });

  // 4) Active 토글 스위치 변경
  $('.toggle-switch input[type="checkbox"]').on('change', function() {
    const $this = $(this);
    const payload = {
      id: +$this.data('user-id'),
      active: this.checked
    };

    $.ajax({
      url: window.contextPath + '/admin/user/toggle-active',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload)
    }).fail(function(err) {
      alert('상태 변경 실패: ' + err.statusText);
      $this.prop('checked', !$this.prop('checked')); // 실패 시 원상 복구
    });
  });


  // --- 테마 저장 ---
  
  const $btnSave = $('#btn-save');
  if ($btnSave.length) {
    $btnSave.on('click', function() {
      const selector = '#' + category + ' .selectBox:checked';
      const selectedIds = $(selector).map(function() {
        return Number(this.value);
      }).get(); // .get()으로 순수 배열로 변환

      if (selectedIds.length === 0) {
        alert('하나 이상 선택해 주세요.');
        return;
      }

      $.ajax({
        url: `${ctx}/admin/theme/save`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          id: userId,
          category: category,
          themeIds: selectedIds
        })
      })
      .done(function() {
        alert('저장되었습니다.');
        window.location.reload(); // 새로고침
      })
      .fail(function(err) {
        console.error(err);
        alert('저장 중 오류 발생: ' + err.statusText);
      });
    });
  }
});