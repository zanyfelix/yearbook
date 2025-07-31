// ============================================================================
// 📁 js/utils/DataLoader.js
// ============================================================================
class DataLoader {
    static loadBackgrounds() {
        $.ajax({
            url: `${ctx}/edit/background`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ id: 11, category: "background" }),
            success: function(data) {
                data.forEach(result => {
                    const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
						//선택 해제 추가
						window.selectionManager.clearSelection();
                        $('#page-preview-img').attr('src', result.theme.editPath);
                        setTimeout(() => window.safeLineManager.update(), 500);
                    });
                    $('#background-panel').append(item);
                });
            }
        });
    }
    
    static loadFrames() {
        $('#photoFrameList').empty();
        
        $.ajax({
            url: `${ctx}/edit/mainFrame`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ id: 11, category: "frame" }),
            success: function(data) {
                data.forEach((result, index) => {
                    const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
                        $('#frameModal').modal('show');
                        DataLoader.loadFrameModal(data, index);
                    });
                    $('#photoFrameList').append(item);
                });
            }
        });
    }
    
    static loadFrameModal(data, selectedIndex = 0) {  // selectedIndex 매개변수 추가
        const listEl = $('#modalFrameList').empty();
        
		data.forEach((result, index) => {  // index 매개변수 추가
		    const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
		        FrameManager.applyFrame(result.theme);
		        $('#frameModal').modal('hide');
		    });
		    
		    // 새로 추가된 부분
		    if (index === selectedIndex) {
		        item.find('.thumbnail-wrapper').addClass('selected-thumbnail');
		    }
		    
		    listEl.append(item);
		});

		// 새로 추가된 스크롤 기능
		setTimeout(() => {
		    const selectedItem = listEl.find('.selected-thumbnail').closest('.col-4');
		    if (selectedItem.length > 0) {
		        selectedItem[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		    }
		}, 100);
    }
}