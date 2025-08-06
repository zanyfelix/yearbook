$(document).ready(function() {
	
	function changeAction(select) {
	    const selectedOption = select.options[select.selectedIndex];
	    const actionUrl = selectedOption.getAttribute('data-action');
	    document.getElementById('userForm').action = actionUrl;
	    select.form.submit();
	}

    // 3. 'Create' 버튼 클릭 이벤트
    $('#btn-create').on('click', function() {
        const newBlockHtml = `
            <div class="settings-block new-block" data-id="0">
                <input type="checkbox" name="selectedIds" value="0">
                <div class="block-content">
                    <input type="text" name="title" class="title-input" placeholder="Title">
                    <textarea name="content" class="text-input" placeholder="text here"></textarea>
                </div>
            </div>`;
        $('#content-block-container').append(newBlockHtml);
    });

    // 4. 'Edit' 버튼 클릭 이벤트
    $('#btn-edit').on('click', function() {
        const checked = $('.settings-block input[type="checkbox"]:checked');
        if (checked.length === 0) {
            alert("수정할 항목을 선택하세요.");
            return;
        }
        
        checked.each(function() {
            const block = $(this).closest('.settings-block');
            // 'readonly' 속성을 제거하여 편집 가능하게 만듦
            block.find('.title-input, .text-input').prop('readonly', false);
        });
    });

    // 'Delete' 버튼 로직 (선택된 항목 삭제)
    $('#btn-delete').on('click', function() {
        // ... 선택된 항목을 화면에서 제거하는 로직 ...
    });

    // 'APPLY' 버튼 로직 (모든 변경사항 서버로 전송)
    $('#btn-apply, #btn-apply-all').on('click', function() {
        // ... 폼 데이터를 수집하여 AJAX로 서버에 전송하는 로직 ...
    });

    // 2. 파일 업로드 감지 및 처리
    $('#guidanceUpload').on('change', function() {
        // ... 파일이 선택되면 폼을 submit 하거나 AJAX로 업로드하는 로직 ...
    });
});