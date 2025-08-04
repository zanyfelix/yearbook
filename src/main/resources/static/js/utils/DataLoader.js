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
				const panel = $('#background-panel').empty(); // 패널을 먼저 비웁니다.
				
				data.forEach((result, index) => {
					// ✨ 수정: 썸네일 클릭 시, 모달을 엽니다.
					const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
						$('#backgroundModal').modal('show');
						// 새로 만들 loadBackgroundModal 함수를 호출합니다.
						DataLoader.loadBackgroundModal(data, index);
					});
					panel.append(item);
				});
            }
        });
    }
	
	static loadBackgroundModal(data, selectedIndex = 0) {
		const listEl = $('#modalBackgroundList').empty();

		data.forEach((result, index) => {
			// ✨ 모달 안의 썸네일을 클릭했을 때, 배경을 최종 적용합니다.
			const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
				window.selectionManager.clearSelection();
				$('#page-preview-img').attr('src', result.theme.editPath);
				setTimeout(() => window.safeLineManager.update(), 500);
				$('#backgroundModal').modal('hide');
			});

			// 사용자가 선택했던 썸네일에 'selected' 효과를 줍니다.
			if (index === selectedIndex) {
				item.find('.thumbnail-wrapper').addClass('selected-thumbnail');
			}

			listEl.append(item);
		});

		// 선택된 썸네일이 보이도록 스크롤을 이동시킵니다.
		setTimeout(() => {
			const selectedItem = listEl.find('.selected-thumbnail').closest('.col-4');
			if (selectedItem.length > 0) {
				selectedItem[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}, 100);
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