// $(document).ready()의 축약형입니다.
// DOM이 완전히 로드된 후 스크립트가 실행되도록 보장합니다.
$(function() {

  // 전체 선택/해제
  $('#selectAll').on('click', function() {
    // this는 #selectAll 체크박스 자체를 가리킵니다.
    // .prop()을 사용하여 checked 속성을 일괄 변경합니다.
    $('.selectBox').prop('checked', $(this).prop('checked'));
  });
  
  // 모달 관련 요소들을 jQuery 객체로 미리 선택해 둡니다.
  const $registerModalEl = $('#registerModal');
  const $form = $('#registerForm');
  const $titleEl = $('#registerModalLabel');
  const $submitBtn = $('#registerSubmitBtn');
  
  // Bootstrap 모달 인스턴스 생성 (Bootstrap 5 API는 그대로 사용)
  const registerModal = new bootstrap.Modal($registerModalEl[0]);

  // --- 1) REGISTER 버튼 클릭 ---
  $('#btn-register').on('click', function() {
    
    // 다른 체크박스들 선택 해제
    $('.selectBox').prop('checked', false);
    $('#selectAll').prop('checked', false);
    
    // jQuery 객체에서 DOM 요소의 reset() 메서드를 호출합니다.
    $form[0].reset();
    // .val()로 form 필드 값 설정
    $('#userId').val(userId);
    
    // .attr()로 form의 action 속성 변경
    $form.attr('action', ctx + '/admin/contents/register');
    
    // .text()로 요소의 텍스트 내용 변경
    $titleEl.text('CONTENTS REGISTRATION');
    $submitBtn.text('등록');
    
    registerModal.show();
  });

  // --- 2) MODIFY 버튼 클릭 ---
  $('#btn-modify').on('click', function() {
    // :checked 필터를 사용하여 체크된 박스만 선택합니다.
    const $checked = $('.selectBox:checked');
    
    if ($checked.length !== 1) {
      alert('Please select only one contents to edit.');
      return;
    }
    
    // .closest('tr')로 가장 가까운 tr 부모 요소를 찾습니다.
    const $row = $checked.closest('tr');
    
    // 1) PK 및 나머지 필드 채우기
    const id = $checked.val();
    $('#id').val(id);
    $('#userId').val(userId);

    // 2) .find()와 :eq() 셀렉터로 특정 순서의 td를 찾고 .text()로 값을 가져옵니다.
    let categoryText = $row.find('td:eq(2)').text().trim().toLowerCase();
    $('#categorySelect').val(categoryText);
    
    $('#titleInput').val($row.find('td:eq(3)').text().trim());
    $('#pagesInput').val($row.find('td:eq(4)').text().trim());
    
    // 3) 모달 설정 변경
    $form.attr('action', ctx + '/admin/contents/modify');
    $titleEl.text('CONTENTS MODIFY');
    $submitBtn.text('수정');

    registerModal.show();
  });
});