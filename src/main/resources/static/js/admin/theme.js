function updateFontOptions(themeSelectElement, keepSelection) {
    keepSelection = keepSelection || false;
    const selectedThemeNo = themeSelectElement.find('option:selected').val();
    const fontSelect = themeSelectElement.closest('tr').find('.font-select');
    
    // 저장된 폰트 ID들을 가져옴
    const savedFontIdsAttr = fontSelect.attr('data-saved-font-ids');
    const savedFontIds = savedFontIdsAttr ? savedFontIdsAttr.split(',').map(function(id) { 
        return parseInt(id.trim(), 10); 
    }) : [];
    
    console.log('Theme No:', selectedThemeNo, 'Saved Font IDs:', savedFontIds);
    
    fontSelect.empty();
    
    if (!selectedThemeNo || selectedThemeNo === '') {
        fontSelect.prop('disabled', true);
        fontSelect.append($('<option>', { text: 'Select Theme First' }));
        return;
    }
    
    $.ajax({
        url: ctx + '/api/themes/' + selectedThemeNo + '/fonts',
        type: 'GET',
        success: function(fonts) {
            fontSelect.empty();
            fontSelect.prop('disabled', false);
            
            if (fonts && fonts.length > 0) {
                $.each(fonts, function(index, font) {
                    const option = $('<option>', { 
                        value: font.id, 
                        text: font.filename || font.name || ('Font ' + font.id)
                    });
                    fontSelect.append(option);
                });
                
                if (keepSelection && savedFontIds.length > 0) {
                    fontSelect.val(savedFontIds);
                    console.log('Selected fonts:', fontSelect.val());
                }
            } else {
                fontSelect.append($('<option>', { value: '', text: 'No fonts available' }));
            }
            
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
    // 페이지 로드 시 모든 테마의 폰트를 로드
    $('.theme-select').each(function() {
        updateFontOptions($(this), true);
    });
    
    // 테마 변경 시
    $(document).on('change', '.theme-select', function() {
        const fontSelect = $(this).closest('tr').find('.font-select');
        fontSelect.removeAttr('data-saved-font-ids');
        updateFontOptions($(this), false);
        
        // 테마 변경 후 폰트 선택 필요 표시
        fontSelect.addClass('needs-selection');
    });
    
    // 폰트 선택 시
    $(document).on('change', '.font-select', function() {
        const selected = $(this).val();
        
        if (selected && selected.length > 0) {
            $(this).removeClass('needs-selection');
            $(this).removeClass('error-field');
            $(this).closest('tr').removeClass('error-row');
        } else {
            $(this).addClass('needs-selection');
        }
    });
    
    // Select All 체크박스
    $('#selectAll').on('click', function() {
        $('.selectBox').prop('checked', this.checked);
    });
    
    // Apply 버튼 클릭
    $('#btn-apply').on('click', function() {
        const requests = [];
        let hasEmptyFonts = false;
        let emptyFontUsers = [];
        
        // 먼저 체크된 사용자들의 폰트 선택 여부 검증
        $('input.selectBox:checked').each(function() {
            const row = $(this).closest('tr');
            const fontSelect = row.find('.font-select');
            const schoolName = row.find('td:nth-child(2)').text().trim();
            
            let selectedFontIds = fontSelect.val() || [];
            
            if (!selectedFontIds || selectedFontIds.length === 0) {
                hasEmptyFonts = true;
                emptyFontUsers.push(schoolName);
            }
        });
        
        // 체크된 사용자가 없는 경우
        if ($('input.selectBox:checked').length === 0) {
            alert('Please select at least one user.');
            return;
        }
        
        // 폰트가 선택되지 않은 사용자가 있으면 저장 중단
        if (hasEmptyFonts) {
            const userList = emptyFontUsers.join('\n- ');
            alert('Cannot save!\n\nThe following users have no fonts selected:\n- ' + userList + '\n\nPlease select at least one font for each user.');
            
            // 폰트가 비어있는 행 강조 표시
            $('input.selectBox:checked').each(function() {
                const row = $(this).closest('tr');
                const fontSelect = row.find('.font-select');
                const selectedFontIds = fontSelect.val() || [];
                
                if (selectedFontIds.length === 0) {
                    row.addClass('error-row');
                    fontSelect.addClass('error-field');
                    
                    setTimeout(function() {
                        row.removeClass('error-row');
                        fontSelect.removeClass('error-field');
                    }, 3000);
                }
            });
            
            return;
        }
        
        // 모든 검증을 통과한 경우에만 요청 데이터 생성
        $('input.selectBox:checked').each(function() {
            const row = $(this).closest('tr');
            const themeSelect = row.find('.theme-select');
            const fontSelect = row.find('.font-select');
            const userId = themeSelect.find('option:selected').data('user-id');
            const themeId = themeSelect.val();
            
            let selectedFontIds = fontSelect.val() || [];
            
            if (!Array.isArray(selectedFontIds)) {
                selectedFontIds = selectedFontIds ? [selectedFontIds] : [];
            }
            
            const fontIdsToSend = selectedFontIds.map(function(id) { 
                return parseInt(id, 10); 
            });
            
            if (userId && themeId) {
                requests.push({
                    userId: parseInt(userId),
                    themeId: parseInt(themeId),
                    fontIds: fontIdsToSend
                });
            }
        });
        
        console.log('All validations passed. Sending requests:', JSON.stringify(requests, null, 2));
        
        $.ajax({
            url: ctx + '/admin/theme/apply',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(requests),
            success: function(response) {
                alert('Successfully saved!');
                location.reload();
            },
            error: function(xhr) {
                console.error('Error:', xhr.responseText);
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : xhr.responseText;
                alert('An error occurred: ' + errorMsg);
            }
        });
    });
});