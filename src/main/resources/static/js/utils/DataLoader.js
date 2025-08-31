// ============================================================================
// 📁 js/utils/DataLoader.js
// ============================================================================
class DataLoader {
	static loadBackgrounds(pageCategory) {
		// 1. 대표 배경 목록을 가져오는 AJAX (기존과 동일)
		$.ajax({
			url: `${ctx}/edit/theme`, // 이 URL은 각 카테고리의 대표 아이템만 반환한다고 가정
			method: 'GET',
			data: {
				userId: $("#id").val(), category: "background", gubun: pageCategory
			},
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
								console.log(fullListData);
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

	static loadPhotoFrames(pageCategory) {
		$('#photoFrameList').empty();

		// 1. 대표 배경 목록을 가져오는 AJAX (기존과 동일)
		$.ajax({
			url: `${ctx}/edit/theme`, // 이 URL은 각 카테고리의 대표 아이템만 반환한다고 가정
			method: 'GET',
			data: {
				userId: $("#id").val(), category: "photoFrame", gubun: pageCategory
			},
			success: function(representativeData) {
				const panel = $('#photoFrameList').empty();

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

	static loadTextboxFrames(pageCategory) {
		$('#textboxFrameList').empty();

		// 1. 대표 배경 목록을 가져오는 AJAX (기존과 동일)
		$.ajax({
			url: `${ctx}/edit/theme`, // 이 URL은 각 카테고리의 대표 아이템만 반환한다고 가정
			method: 'GET',
			data: {
				userId: $("#id").val(), category: "textBoxFrame", gubun: pageCategory
			},
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

	static loadElements(pageCategory) {
		// element-panel이 없으면 생성하되, 기존 프레임과 동일한 구조로
		if ($('#element-panel').length === 0) {
			const elementPanel = $('<div id="element-panel" class="row row-cols-3 g-3"></div>');
			$('#thumbnail-area').append(elementPanel);
		} else {
			// 기존 패널이 있으면 클래스 확인 및 설정
			$('#element-panel').removeClass().addClass('row row-cols-3 g-3');
		}

		$('#element-panel').empty();

		$.ajax({
			url: `${ctx}/edit/theme`,
			method: 'GET',
			data: {
				userId: $("#id").val(), category: "element", gubun: pageCategory
			},
			success: function(data) {
				const panel = $('#element-panel');

				data.forEach(result => {
					// 썸네일 클릭 시 바로 프리뷰에 추가
					const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, () => {
						window.selectionManager.clearSelection();

						// Element 데이터에 카테고리 추가
						const elementData = {
							...result.theme,
							category: 'element'
						};

						// 모달 없이 바로 적용
						FrameManager.applyFrame(elementData);
						setTimeout(() => window.safeLineManager.update(), 500);
					});
					panel.append(item);
				});
			},
			error: function(xhr, status, error) {
				console.error('Element 로딩 실패:', error);
				const panel = $('#element-panel');
				panel.html('<div class="text-center text-muted p-3">Element를 불러올 수 없습니다.</div>');
			}
		});
	}
	
	/**
		 * 서버에서 폰트 목록을 가져와 드롭다운을 설정하고 관련 이벤트를 연결합니다.
		 */
	static loadAndSetupFonts() {
		// 폰트가 이미 로드되었다면 다시 실행하지 않습니다.
		if (this.fontsLoaded) return;

		$.ajax({
			url: `${ctx}/edit/fonts`,
			method: 'GET',
			success: function(fonts) {
				const fontSelect = $('#tooltip-font');

				// @font-face 스타일 시트를 동적으로 추가합니다.
				if ($('#dynamic-font-styles').length === 0) {
					$('<style>').attr('id', 'dynamic-font-styles').appendTo('head');
				}
				const styleSheet = $('#dynamic-font-styles');
				let fontFaceRules = '';

				fontSelect.empty();

				fonts.forEach(font => {
					const fontFamily = font.filename;
					const fontUrl = `${ctx}${font.fontPath}`;
					fontFaceRules += `
							@font-face {
								font-family: "${fontFamily}";
								src: url('${fontUrl}');
							}
						`;
					fontSelect.append($('<option>', { value: font.id, text: fontFamily }));
				});

				styleSheet.text(fontFaceRules);
				DataLoader.fontsLoaded = true; // 로드 완료 플래그 설정

				// 폰트 데이터 로딩이 완료된 후 이벤트 리스너를 설정합니다.
				DataLoader.setupFontEventListeners();
			},
			error: function(err) {
				console.error("폰트 목록을 불러오는 데 실패했습니다.", err);
			}
		});
	}

	/**
	 * 폰트 관련 UI(툴바)의 이벤트 리스너를 설정합니다.
	 */
	static setupFontEventListeners() {
		// 중복 바인딩을 막기 위해 .fontManager 네임스페이스를 사용합니다.
		$('#tooltip-font').off('change.fontManager').on('change.fontManager', function() {
			const selectedFontFamily = $(this).val();
			const selectedBox = window.selectionManager.getSelectedBox();
			if (selectedBox && selectedBox.length > 0) {
				selectedBox.css('font-family', selectedFontFamily || '');
			}
		});

		$('#frame-container').off('mousedown.fontManager').on('mousedown.fontManager', '.text-box', function() {
			const $textBox = $(this);
			// selectionManager가 먼저 동작하도록 약간의 지연을 줍니다.
			setTimeout(() => {
				const currentFontFamily = ($textBox.css('font-family') || '').split(',')[0].replace(/['"]/g, '');
				$('#tooltip-font').val(currentFontFamily);
			}, 50);
		});
	}
}