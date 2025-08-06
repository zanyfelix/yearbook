$(document).ready(function() {
  
  // 전체 선택/해제 기능
  // user.jsp의 <input id="selectAll"> 에 맞춰 작동합니다.
  $('#selectAll').on('click', function() {
    $('.selectBox').prop('checked', this.checked);
  });

  // 모달이 열릴 때 데이터를 채워 넣는 기능
  $('#contactModal').on('show.bs.modal', function(e) {
    // 이벤트를 트리거한 버튼
    const btn = e.relatedTarget;

    // jQuery의 .data() 메서드를 사용하여 data-* 속성 값을 가져오고,
    // .text() 메서드로 modal 내 요소의 내용을 채웁니다.
    $('#modalUser').text($(btn).data('user'));
    $('#modalEmail').text($(btn).data('email'));
    $('#modalSubject').text($(btn).data('subject'));
    $('#modalMessage').text($(btn).data('message'));
  });

});