// home.js
document.addEventListener('DOMContentLoaded', function() {
  if (!deadlineStr) return;  // 서버에서 넘겨준 문자열

  // — 오늘 날짜 키 (YYYY-MM-DD)
  const today = new Date();
  today.setHours(0,0,0,0);
  const key = 'hideModal_' + today.toISOString().slice(0,10);

  // — 이미 체크되어 있으면 아예 표시하지 않음
  if (localStorage.getItem(key) === 'true') {
    return;
  }
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // — deadline 파싱 & 일수 계산
  const [y,m,d] = deadlineStr.split('-').map(Number);
  const deadline = new Date(y, m-1, d);
  const diffDays = Math.ceil((deadline - today) / (1000*60*60*24));

  // — 메시지 셋업
  const textEl = document.getElementById('deadlineText');
  if (diffDays > 0) {
    textEl.innerText = 
      'The deadline for submitting yearbook content is '
      + months[deadline.getMonth()] + ' ' + deadline.getDate() + ',' + deadline.getFullYear()
      + ', with ' + diffDays + ' days left.';
  } else if (diffDays === 0) {
    textEl.innerText = 'Today is the deadline for submitting yearbook content.';
  } else {
    textEl.innerText = 'The deadline has passed.';
  }

  // — 모달 보여주기
  const overlay = document.getElementById('deadlineModalOverlay');
  overlay.style.display = 'flex';

  // — 닫기 버튼 핸들러
  document.getElementById('modalCloseBtn')
    .addEventListener('click', function() {
      const checked = document.getElementById('dontShowCheckbox').checked;
      if (checked) {
        localStorage.setItem(key, 'true');
      }
      overlay.style.display = 'none';
    });
});
