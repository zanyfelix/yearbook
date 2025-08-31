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
					const fontFamily = DataLoader.cleanFontName(font.filename);
					const fontUrl = `${ctx}${font.fontPath}`;
					fontFaceRules += `
							@font-face {
								font-family: "${fontFamily}";
								src: url('${fontUrl}');
								font-display: swap;
							}
						`;
					const displayName = DataLoader.getDisplayName(fontFamily);
					fontSelect.append($('<option>', {
						value: fontFamily,
						text: displayName
					}));
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
	 * 파일명에서 폰트 이름을 정리합니다.
	 * @param {string} filename - 원본 파일명 (예: "BrianJames.ttf")
	 * @returns {string} 정리된 폰트 이름 (예: "BrianJames")
	 */
	static cleanFontName(filename) {
	    if (!filename) return 'Unknown Font';
	    
	    // 1. 파일 확장자 제거 (.ttf, .otf, .woff, .woff2 등)
	    let fontName = filename.replace(/\.(ttf|otf|woff2?|eot)$/i, '');
	    
	    // 2. 특수 문자나 숫자로 시작하는 경우 처리
	    fontName = fontName.replace(/^[^a-zA-Z]+/, '');
	    
	    // 3. 연속된 공백이나 특수문자 정리
	    fontName = fontName.replace(/[_-]+/g, ' ').trim();
	    
	    // 4. 빈 문자열인 경우 기본값 반환
	    if (!fontName) {
	        fontName = 'CustomFont';
	    }
	    
	    return fontName;
	}

	/**
	 * 폰트 이름을 사용자에게 표시할 형태로 변환합니다.
	 * @param {string} fontFamily - 정리된 폰트 이름
	 * @returns {string} 표시용 폰트 이름
	 */
	static getDisplayName(fontFamily) {
	    // CamelCase를 공백으로 분리 (예: "BrianJames" → "Brian James")
	    return fontFamily
	        .replace(/([a-z])([A-Z])/g, '$1 $2')
	        .replace(/\b\w/g, l => l.toUpperCase()); // 첫 글자 대문자
	}

	/**
	 * 폰트가 제대로 로드되었는지 확인합니다.
	 * @param {string} fontFamily - 확인할 폰트 이름
	 * @returns {Promise<boolean>} 폰트 로드 성공 여부
	 */
	static checkFontLoaded(fontFamily) {
	    return new Promise((resolve) => {
	        // 임시 요소를 생성하여 폰트 적용 테스트
	        const testElement = $('<span>')
	            .css({
	                'font-family': fontFamily,
	                'font-size': '12px',
	                'position': 'absolute',
	                'visibility': 'hidden',
	                'top': '-1000px'
	            })
	            .text('Test')
	            .appendTo('body');

	        // 짧은 지연 후 폰트 적용 확인
	        setTimeout(() => {
	            const computedFont = testElement.css('font-family');
	            const isLoaded = computedFont.includes(fontFamily) || 
	                           computedFont.includes(fontFamily.replace(/\s+/g, ''));
	            
	            testElement.remove();
	            resolve(isLoaded);
	        }, 100);
	    });
	}

	/**
	 * 모든 폰트가 로드될 때까지 대기합니다.
	 * @returns {Promise<void>}
	 */
	static waitForFontsLoaded() {
	    return new Promise((resolve) => {
	        if (document.fonts && document.fonts.ready) {
	            // 최신 브라우저의 Font Loading API 사용
	            document.fonts.ready.then(() => {
	                console.log('모든 폰트 로딩 완료 (Font Loading API)');
	                resolve();
	            });
	        } else {
	            // 폴백: 타이머 기반 대기
	            setTimeout(() => {
	                console.log('폰트 로딩 대기 완료 (타이머 기반)');
	                resolve();
	            }, 1000);
	        }
	    });
	}

	/**
	 * 폰트 관련 UI(툴바)의 이벤트 리스너를 설정합니다.
	 */
	/**
	 * 폰트 관련 UI(툴바)의 이벤트 리스너를 설정합니다. (수정된 버전)
	 */
	static setupFontEventListeners() {
	    console.log('폰트 이벤트 리스너 설정 중...');
	    
	    // 폰트 패밀리 변경 이벤트
	    $('#tooltip-font').off('change.fontManager').on('change.fontManager', function() {
	        const selectedFontFamily = $(this).val();
	        console.log('폰트 변경 감지:', selectedFontFamily);
	        
	        let selectedBox = DataLoader.getCurrentSelectedTextBox();
	        
	        if (selectedBox && selectedBox.length > 0) {
	            console.log('선택된 텍스트박스에 폰트 적용:', selectedFontFamily);
	            DataLoader.applyFontToTextBox(selectedBox, selectedFontFamily);
	            
	            // 저장된 폰트 패밀리도 업데이트
	            selectedBox.data('savedFontFamily', selectedFontFamily);
	            
	            // ✅ 텍스트박스 상태 업데이트
	            setTimeout(() => {
	                TextManager.updateTextBoxState(selectedBox);
	            }, 50);
	        } else {
	            console.log('선택된 텍스트박스가 없음');
	        }
	    });

	    // ✅ 수정된 텍스트박스 클릭 이벤트
	    $('#frame-container').off('mousedown.fontManager').on('mousedown.fontManager', '.text-box', function() {
	        const $textBox = $(this);
	        console.log('텍스트박스 클릭 감지');
	        
	        // selectionManager가 먼저 동작하도록 약간의 지연
	        setTimeout(() => {
	            DataLoader.updateAllTextControlsFromTextBox($textBox);
	        }, 100);
	    });
	}
	
	/**
	 * ✅ 새로운 메소드: 텍스트박스 선택 시 모든 컨트롤 업데이트
	 */
	static updateAllTextControlsFromTextBox($textBox) {
	    if (!$textBox || $textBox.length === 0) return;
	    
	    console.log('텍스트박스 컨트롤 전체 업데이트 시작');
	    
	    // 1. 폰트 패밀리 업데이트
	    this.updateFontDropdownFromTextBox($textBox);
	    
	    // 2. 폰트 크기 업데이트
	    this.updateFontSizeFromTextBox($textBox);
	    
	    // 3. 텍스트 정렬 업데이트
	    this.updateTextAlignFromTextBox($textBox);
	    
	    // 4. 텍스트 색상 업데이트
	    this.updateTextColorFromTextBox($textBox);
	    
	    console.log('텍스트박스 컨트롤 전체 업데이트 완료');
	}
	
	/**
	 * ✅ 수정된 메소드: 텍스트박스의 폰트 정보를 기반으로 드롭다운 업데이트
	 */
	static updateFontDropdownFromTextBox($textBox) {
	    if (!$textBox || $textBox.length === 0) return;
	    
	    // 1. 저장된 폰트 패밀리 확인 (최우선)
	    let fontFamily = $textBox.data('savedFontFamily');
	    
	    // 2. 저장된 폰트가 없으면 CSS에서 가져오기
	    if (!fontFamily) {
	        const cssFont = $textBox.css('font-family');
	        if (cssFont && cssFont !== 'inherit') {
	            fontFamily = cssFont.split(',')[0].replace(/['"]/g, '').trim();
	        }
	    }
	    
	    // 3. 드롭다운에서 해당 폰트 찾기
	    const fontSelect = $('#tooltip-font');
	    let matchingOption = fontSelect.find(`option[value="${fontFamily}"]`);
	    
	    // 4. 정확한 매칭이 안 되면 부분 매칭 시도
	    if (matchingOption.length === 0 && fontFamily) {
	        matchingOption = fontSelect.find('option').filter(function() {
	            const optionValue = $(this).val().toLowerCase();
	            const targetFont = fontFamily.toLowerCase();
	            return optionValue.includes(targetFont) || targetFont.includes(optionValue);
	        });
	    }
	    
	    if (matchingOption.length > 0) {
	        const finalFont = matchingOption.first().val();
	        console.log('텍스트박스의 폰트로 드롭다운 업데이트:', finalFont);
	        fontSelect.val(finalFont);
	        
	        // 저장된 폰트가 없었다면 지금 저장
	        if (!$textBox.data('savedFontFamily')) {
	            $textBox.data('savedFontFamily', finalFont);
	        }
	    } else {
	        // 매칭되는 옵션이 없으면 첫 번째 폰트로 설정하지 않음 (기존 선택 유지)
	        console.log('매칭되는 폰트를 찾을 수 없음:', fontFamily);
	    }
	}
	
	/**
	 * ✅ 새로운 메소드: 텍스트 정렬 드롭다운 업데이트
	 */
	static updateTextAlignFromTextBox($textBox) {
	    if (!$textBox || $textBox.length === 0) return;
	    
	    const textAlign = $textBox.css('text-align') || 'left';
	    const alignSelect = $('#tooltip-align');
	    
	    if (alignSelect.length > 0) {
	        const matchingAlign = alignSelect.find(`option[value="${textAlign}"]`);
	        if (matchingAlign.length > 0) {
	            console.log('텍스트 정렬 업데이트:', textAlign);
	            alignSelect.val(textAlign);
	        }
	    }
	}

	/**
	 * ✅ 새로운 메소드: 텍스트 색상 업데이트
	 */
	static updateTextColorFromTextBox($textBox) {
	    if (!$textBox || $textBox.length === 0) return;
	    
	    const textColor = $textBox.css('color');
	    const colorInput = $('#tooltip-color');
	    
	    if (colorInput.length > 0 && textColor) {
	        // RGB를 HEX로 변환
	        const hexColor = this.rgbToHex(textColor);
	        if (hexColor) {
	            console.log('텍스트 색상 업데이트:', hexColor);
	            colorInput.val(hexColor);
	        }
	    }
	}
	
	/**
	 * ✅ RGB를 HEX로 변환하는 헬퍼 함수
	 */
	static rgbToHex(rgb) {
	    if (!rgb) return null;
	    
	    // 이미 hex 형식이면 그대로 반환
	    if (rgb.startsWith('#')) return rgb;
	    
	    // rgb(r, g, b) 형식 파싱
	    const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	    if (rgbMatch) {
	        const r = parseInt(rgbMatch[1]);
	        const g = parseInt(rgbMatch[2]);
	        const b = parseInt(rgbMatch[3]);
	        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
	    }
	    
	    return null;
	}

	/**
	 * ✅ 새로운 메소드: 현재 선택된 텍스트박스를 찾습니다.
	 */
	static getCurrentSelectedTextBox() {
	    // 방법 1: window.selectedBox 확인
	    if (window.selectedBox && window.selectedBox.length > 0 && window.selectedBox.hasClass('text-box')) {
	        console.log('window.selectedBox에서 텍스트박스 찾음');
	        return window.selectedBox;
	    }
	    
	    // 방법 2: selectionManager 사용
	    if (window.selectionManager && typeof window.selectionManager.getSelectedTextBox === 'function') {
	        const selected = window.selectionManager.getSelectedTextBox();
	        if (selected && selected.length > 0) {
	            console.log('selectionManager에서 텍스트박스 찾음');
	            return selected;
	        }
	    }
	    
	    // 방법 3: CSS 클래스로 찾기
	    const selectedByClass = $('.text-box.selected');
	    if (selectedByClass.length > 0) {
	        console.log('CSS 클래스로 텍스트박스 찾음');
	        return selectedByClass.first();
	    }
	    
	    // 방법 4: 마지막으로 클릭된 텍스트박스 찾기
	    const lastClicked = $('.text-box').filter(function() {
	        return $(this).is(':focus') || $(this).hasClass('editing');
	    });
	    if (lastClicked.length > 0) {
	        console.log('포커스/편집 상태로 텍스트박스 찾음');
	        return lastClicked.first();
	    }
	    
	    console.log('선택된 텍스트박스를 찾을 수 없음');
	    return null;
	}

	/**
	 * ✅ 새로운 메소드: 텍스트박스에 폰트를 강제로 적용합니다.
	 */
	static applyFontToTextBox($textBox, fontFamily) {
	    if (!$textBox || !fontFamily) return;
	    
	    // 1. 일반적인 CSS 적용
	    $textBox.css('font-family', fontFamily);
	    
	    // 2. 스타일 속성으로 직접 설정 (우선순위 강화)
	    $textBox.attr('style', function(i, style) {
	        let newStyle = (style || '').replace(/font-family[^;]*;?/gi, '');
	        return newStyle + `font-family: "${fontFamily}" !important;`;
	    });
	    
	    // 3. 짧은 지연 후 확인 및 재적용
	    setTimeout(() => {
	        const appliedFont = $textBox.css('font-family');
	        console.log('적용 후 폰트 확인:', appliedFont);
	        
	        if (!appliedFont.includes(fontFamily)) {
	            console.log('폰트 재적용 시도');
	            $textBox[0].style.setProperty('font-family', fontFamily, 'important');
	        }
	    }, 100);
	}

	/**
	 * ✅ 새로운 메소드: 텍스트박스의 현재 폰트를 가져옵니다.
	 */
	static getCurrentFont($textBox) {
	    const fontFamily = $textBox.css('font-family');
	    
	    if (!fontFamily || fontFamily === 'inherit' || fontFamily.includes('serif')) {
	        return $('#tooltip-font option:first').val(); // 기본값 반환
	    }
	    
	    // 따옴표 제거 및 첫 번째 폰트만 추출
	    const cleanFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
	    
	    // 드롭다운에서 매칭되는 값 찾기
	    const matchingOption = $('#tooltip-font option').filter(function() {
	        return $(this).val() === cleanFont || $(this).text().includes(cleanFont);
	    });
	    
	    return matchingOption.length > 0 ? matchingOption.first().val() : cleanFont;
	}

	/**
	 * ✅ 개선된 폰트 로딩 메소드
	 */
	static loadAndSetupFonts() {
	    // 폰트가 이미 로드되었다면 다시 실행하지 않습니다.
	    if (this.fontsLoaded) return;

	    console.log('폰트 로딩 시작...');

	    $.ajax({
	        url: `${ctx}/edit/fonts`,
	        method: 'GET',
	        success: function(fonts) {
	            console.log('서버에서 폰트 데이터 수신:', fonts.length + '개');
	            
	            const fontSelect = $('#tooltip-font');

	            // @font-face 스타일 시트를 동적으로 추가합니다.
	            if ($('#dynamic-font-styles').length === 0) {
	                $('<style>').attr('id', 'dynamic-font-styles').appendTo('head');
	            }
	            const styleSheet = $('#dynamic-font-styles');
	            let fontFaceRules = '';

	            fontSelect.empty();

	            fonts.forEach((font, index) => {
	                // 파일 확장자 제거 및 폰트 이름 정리
	                const fontFamily = DataLoader.cleanFontName(font.filename);
	                const fontUrl = `${ctx}${font.fontPath}`;
	                
	                fontFaceRules += `
	                    @font-face {
	                        font-family: "${fontFamily}";
	                        src: url('${fontUrl}');
	                        font-display: swap;
	                    }
	                `;
	                
	                // 드롭다운에 표시될 이름도 정리된 이름 사용
	                const displayName = DataLoader.getDisplayName(fontFamily);
	                fontSelect.append($('<option>', { 
	                    value: fontFamily, 
	                    text: displayName 
	                }));
	                
	                console.log(`폰트 ${index + 1}/${fonts.length}: ${displayName} (${fontFamily})`);
	            });

	            styleSheet.text(fontFaceRules);
	            
	            // ✅ 폰트 로딩 완료 후 첫 번째 폰트 자동 선택
	            setTimeout(() => {
	                const firstFont = fontSelect.find('option:first').val();
	                if (firstFont) {
	                    fontSelect.val(firstFont);
	                    console.log('기본 폰트로 설정:', firstFont);
	                }
	                
	                DataLoader.fontsLoaded = true;
	                console.log('폰트 로딩 및 설정 완료');
	                
	                // 이벤트 리스너 설정
	                DataLoader.setupFontEventListeners();
	                
	            }, 300); // 폰트 로딩을 위한 충분한 지연
	            
	        },
	        error: function(err) {
	            console.error("폰트 목록을 불러오는 데 실패했습니다.", err);
	        }
	    });
	}
}