// 높이 조절 로직을 재사용 가능하도록 함수로 분리합니다.
function resizeAllTextareas() {
    $('.auto-resize-textarea').each(function() {
        // jQuery의 .css()를 사용하면 좀 더 일관성 있습니다.
        $(this).css('height', 'auto');
        $(this).css('height', this.scrollHeight + 'px');
    });
}
$(function() { // $(document).ready()의 축약형입니다.
  // 서버에서 넘겨준 deadlineStr 변수가 없으면 실행을 중단합니다.
  if (typeof deadlineStr === 'undefined' || !deadlineStr) {
    return;
  }

  // --- 오늘 날짜를 'YYYY-MM-DD' 형식의 키로 만듭니다.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const key = 'hideModal_' + today.toISOString().slice(0, 10);

  // --- localStorage에 오늘 날짜 키가 저장되어 있으면 모달을 표시하지 않습니다.
  if (localStorage.getItem(key) === 'true') {
    return;
  }
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // --- deadline 파싱 & D-day 계산 (이 부분은 순수 JavaScript 로직이므로 그대로 사용합니다)
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0); // D-day 계산을 위해 시간을 0으로 맞춥니다.
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  // --- jQuery를 사용하여 마감일 메시지를 설정합니다.
  const $textEl = $('#deadlineText');  
  if (diffDays > 0) {
    $textEl.text(
      'The deadline for submitting yearbook content is ' +
      months[deadline.getMonth()] + ' ' + deadline.getDate() + ', ' + deadline.getFullYear() +
      ', with a remaining' + diffDays + ' days.'
    );
  } else if (diffDays === 0) {
    $textEl.text('Today is the deadline for submitting yearbook content.');
  } else {
    $textEl.text('The deadline has passed.');
  }

  // --- jQuery를 사용하여 모달을 flex로 표시합니다.
  const $overlay = $('#deadlineModalOverlay');
  $overlay.css('display', 'flex');

  // --- jQuery를 사용하여 닫기 버튼의 클릭 이벤트를 처리합니다.
  $('#modalCloseBtn').on('click', function() {
    // .prop('checked') 또는 .is(':checked')로 체크 상태를 확인합니다.
    const isChecked = $('#dontShowCheckbox').prop('checked');
    if (isChecked) {
      // 체크되었다면, localStorage에 키를 저장합니다.
      localStorage.setItem(key, 'true');
    }
    // 모달을 숨깁니다.
    $overlay.hide();
  });
  
  // 페이지 로드 시 높이 조절 함수 호출
      resizeAllTextareas();
});

// 2. 페이지의 모든 리소스(이미지, 폰트 등) 로딩이 완료된 후 한 번 더 실행
// 렌더링 시간 차이로 인한 문제를 해결해 줍니다.
$(window).on('load', function() {
    resizeAllTextareas();
});