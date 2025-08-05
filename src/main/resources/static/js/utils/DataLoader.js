// ============================================================================
// 📁 js/utils/DataLoader.js
// ============================================================================
class DataLoader {
	static loadBackgrounds() {
	    // 1. 대표 배경 목록을 가져오는 AJAX (기존과 동일)
	    $.ajax({
	        url: `${ctx}/edit/theme`, // 이 URL은 각 카테고리의 대표 아이템만 반환한다고 가정
	        method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({ id: 11, category: "background" }),
	        success: function(representativeData) {
	            const panel = $('#background-panel').empty();
	            
	            representativeData.forEach(result => {
	                // 2. 대표 썸네일 클릭 시 새로운 AJAX 호출
	                const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
	                    
	                    // ✨ 핵심 수정: 클릭된 썸네일의 ID로 새로운 AJAX 요청
	                    $.ajax({
	                        url: `${ctx}/edit/themesByParent`, // 새로 만든 서버 주소
	                        method: 'GET',
	                        data: {
	                            themeId: result.theme.id // 클릭된 썸네일의 theme id
	                        },
	                        success: function(fullListData) {
	                            // 3. 서버로부터 받은 전체 목록으로 모달을 채우고 보여줌
	                            $('#backgroundModal').modal('show');
	                            // 모달을 채우는 함수는 그대로 재사용
	                            DataLoader.loadBackgroundModal(fullListData, 0); // selectedIndex는 0으로 시작
	                        },
	                        error: function() {
	                            alert("전체 목록을 불러오는 데 실패했습니다.");
	                        }
	                    });
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
			const item = Helpers.createThumbnailItem(result.thumbnailPath, () => {
				window.selectionManager.clearSelection();
				$('#page-preview-img').attr('src', result.editPath);
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
    
    static loadPhotoFrames() {
        $('#photoFrameList').empty();
        
		// 1. 대표 배경 목록을 가져오는 AJAX (기존과 동일)
		$.ajax({
			url: `${ctx}/edit/theme`, // 이 URL은 각 카테고리의 대표 아이템만 반환한다고 가정
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({ id: 11, category: "photoframe" }),
			success: function(representativeData) {
				const panel = $('#photoFrameList').empty();

				representativeData.forEach(result => {
					console.log(result);
					// 2. 대표 썸네일 클릭 시 새로운 AJAX 호출
					const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {

						// ✨ 핵심 수정: 클릭된 썸네일의 ID로 새로운 AJAX 요청
						$.ajax({
							url: `${ctx}/edit/themesByParent`, // 새로 만든 서버 주소
							method: 'GET',
							data: {
								themeId: result.theme.id // 클릭된 썸네일의 theme id
							},
							success: function(fullListData) {
								// 3. 서버로부터 받은 전체 목록으로 모달을 채우고 보여줌
								$('#frameModal').modal('show');
								// 모달을 채우는 함수는 그대로 재사용
								DataLoader.loadFrameModal(fullListData, 0, 'photoframe');
							},
							error: function() {
								alert("전체 목록을 불러오는 데 실패했습니다.");
							}
						});
					});
					panel.append(item);
				});
			}
		});
    }
    
    static loadFrameModal(data, selectedIndex = 0, category = 'photoframe') {
        const listEl = $('#modalFrameList').empty();
        
		data.forEach((result, index) => {
			// ✨ 모달 안의 썸네일을 클릭했을 때, 배경을 최종 적용합니다.
			const item = Helpers.createThumbnailItem(result.thumbnailPath, () => {
				window.selectionManager.clearSelection();
				
				// category 정보를 frameTheme 객체에 추가
				const frameData = {
					...result,
					category: category
				};
				
				FrameManager.applyFrame(frameData);
				setTimeout(() => window.safeLineManager.update(), 500);
				$('#frameModal').modal('hide');
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
	
	static loadTextboxFrames() {
		$('#textboxFrameList').empty();

		// 1. 대표 배경 목록을 가져오는 AJAX (기존과 동일)
		$.ajax({
			url: `${ctx}/edit/theme`, // 이 URL은 각 카테고리의 대표 아이템만 반환한다고 가정
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({ id: 11, category: "textboxframe" }),
			success: function(representativeData) {
				const panel = $('#textboxFrameList').empty();

				representativeData.forEach(result => {
					// 2. 대표 썸네일 클릭 시 새로운 AJAX 호출
					const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {

						// ✨ 핵심 수정: 클릭된 썸네일의 ID로 새로운 AJAX 요청
						$.ajax({
							url: `${ctx}/edit/themesByParent`, // 새로 만든 서버 주소
							method: 'GET',
							data: {
								themeId: result.theme.id // 클릭된 썸네일의 theme id
							},
							success: function(fullListData) {
								// 3. 서버로부터 받은 전체 목록으로 모달을 채우고 보여줌
								$('#frameModal').modal('show');
								// 모달을 채우는 함수는 그대로 재사용
								DataLoader.loadFrameModal(fullListData, 0, 'textboxframe');
							},
							error: function() {
								alert("전체 목록을 불러오는 데 실패했습니다.");
							}
						});
					});
					panel.append(item);
				});
			}
		});
	}
}