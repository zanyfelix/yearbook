function updateFontOptions(themeSelectElement, keepSelection = false) {
    const selectedThemeNo = themeSelectElement.find('option:selected').val();
    const fontSelect = themeSelectElement.closest('tr').find('.font-select');
    
    // 저장된 폰트 ID들을 가져옴
    const savedFontIdsAttr = fontSelect.attr('data-saved-font-ids');
    const savedFontIds = savedFontIdsAttr ? savedFontIdsAttr.split(',').map(id => parseInt(id.trim(), 10)) : [];
    
    console.log('Theme No:', selectedThemeNo, 'Saved Font IDs:', savedFontIds);
    
    // Loading 메시지 제거 - disabled를 유지하면 multiselect가 안됨
    fontSelect.empty();
    
    if (!selectedThemeNo || selectedThemeNo === '') {
        fontSelect.prop('disabled', true);
        fontSelect.append($('<option>', { text: 'Select Theme First' }));
        return;
    }
    
    $.ajax({
        url: `${ctx}/api/themes/${selectedThemeNo}/fonts`,
        type: 'GET',
        success: function(fonts) {
            fontSelect.empty();
            fontSelect.prop('disabled', false); // ⭐ 중요: disabled 해제
            
            if (fonts && fonts.length > 0) {
                $.each(fonts, function(index, font) {
                    const option = $('<option>', { 
                        value: font.id, 
                        text: font.filename || font.name || `Font ${font.id}`
                    });
                    fontSelect.append(option);
                });
                
                // ⭐ 저장된 폰트 ID들을 선택 상태로 설정
                if (keepSelection && savedFontIds.length > 0) {
                    fontSelect.val(savedFontIds);
                    console.log('Selected fonts:', fontSelect.val());
                }
            } else {
                fontSelect.append($('<option>', { value: '', text: 'No fonts available' }));
            }
            
            // ⭐ multiselect 속성 재확인
            fontSelect.attr('multiple', 'multiple');
        },
        error: function(xhr, status, error) {
            console.error('Error loading fonts:', error);
            fontSelect.empty();
            fontSelect.prop('disabled', false);
            fontSelect.append($('<option>', { text: 'Error loading fonts' }));
        }
    });
}

$(document).ready(function() {
    // ⭐ 페이지 로드 시 모든 테마의 폰트를 로드
    $('.theme-select').each(function() {
        updateFontOptions($(this), true);
    });
    
    // 테마 변경 시
    $(document).on('change', '.theme-select', function() {
        $(this).closest('tr').find('.font-select').removeAttr('data-saved-font-ids');
        updateFontOptions($(this), false);
    });
    
    // ⭐ 폰트 선택 테스트 (디버깅용)
    $(document).on('change', '.font-select', function() {
        const selected = $(this).val();
        console.log('Font selection changed:', selected);
        console.log('Number of selected items:', selected ? selected.length : 0);
    });
    
    $('#selectAll').on('click', function() {
        $('.selectBox').prop('checked', this.checked);
    });
    
    $('#btn-apply').on('click', function() {
        const requests = [];
        
        $('input.selectBox:checked').each(function() {
            const row = $(this).closest('tr');
            const themeSelect = row.find('.theme-select');
            const fontSelect = row.find('.font-select');
            const userId = themeSelect.find('option:selected').data('user-id');
            const themeId = themeSelect.val();
            
            // multiselect에서 선택된 값들
            let selectedFontIds = fontSelect.val() || [];
            console.log('User:', userId, 'Selected fonts:', selectedFontIds);
            
            // 배열이 아닌 경우 배열로 변환
            if (!Array.isArray(selectedFontIds)) {
                selectedFontIds = selectedFontIds ? [selectedFontIds] : [];
            }
            
            // 숫자 배열로 변환
            const fontIdsToSend = selectedFontIds.map(id => parseInt(id, 10));
            
            if (userId && themeId) {
                requests.push({
                    userId: parseInt(userId),
                    themeId: parseInt(themeId),
                    fontIds: fontIdsToSend
                });
            }
        });
        
        if (requests.length === 0) {
            alert('Please select at least one user.');
            return;
        }
        
        console.log('Sending requests:', JSON.stringify(requests, null, 2));
        
        $.ajax({
            url: `${ctx}/admin/theme/apply`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(requests),
            success: function(response) {
                alert(response.message || 'Successfully saved!');
                location.reload();
            },
            error: function(xhr) {
                console.error('Error:', xhr.responseText);
                alert('An error occurred: ' + (xhr.responseJSON?.message || xhr.responseText));
            }
        });
    });
});