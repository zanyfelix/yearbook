// ============================================================================
// 📁 js/utils/DataLoader.js - 최적화 버전
// ============================================================================
class DataLoader {
    static fontsLoaded = false;
    
    // 공통 AJAX 요청 처리
    static async fetchData(url, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${ctx}${url}`,
                method: 'GET',
                data: data,
                success: resolve,
                error: reject
            });
        });
    }
    
    // 공통 썸네일 로드 로직
    static async loadThumbnails(category, gubun, targetPanel, modalHandler) {
        const userId = $("#id").val();
        
        try {
            const representativeData = await this.fetchData('/edit/theme', {
                userId, category, gubun
            });
            
            const panel = $(targetPanel).empty();
            representativeData.forEach(result => {
                const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, async () => {
                    try {
                        const fullListData = await this.fetchData('/edit/themesByParent', {
                            themeId: result.theme.id
                        });
                        modalHandler(fullListData);
                    } catch (error) {
                        alert("전체 목록을 불러오는 데 실패했습니다.");
                    }
                });
                panel.append(item);
            });
        } catch (error) {
            console.error(`${category} 로딩 실패:`, error);
        }
    }
    
    static loadBackgrounds(pageCategory) {
        this.loadThumbnails('background', pageCategory, '#background-panel', (data) => {
            $('#backgroundModal').modal('show');
            this.loadBackgroundModal(data, 0);
        });
    }
    
    static loadPhotoFrames(pageCategory) {
        this.loadThumbnails('photoFrame', pageCategory, '#photoFrameList', (data) => {
            $('#frameModal').modal('show');
            this.loadFrameModal(data, 0, 'photoframe');
        });
    }
    
    static loadTextboxFrames(pageCategory) {
        this.loadThumbnails('textBoxFrame', 'Public', '#textboxFrameList', (data) => {
            $('#frameModal').modal('show');
            this.loadFrameModal(data, 0, 'textboxframe');
        });
    }
    
    static loadElements(pageCategory) {
        const panel = $('#element-panel');
        if (!panel.length) {
            const elementPanel = $('<div id="element-panel" class="row row-cols-3 g-3"></div>');
            $('#thumbnail-area').append(elementPanel);
        }
        
        this.loadThumbnails('element', pageCategory, '#element-panel', null);
    }
    
    // 모달 로드 공통 로직
    static loadModal(data, selectedIndex, listEl, applyHandler) {
        listEl.empty();
        
        data.forEach((result, index) => {
            const item = Helpers.createThumbnailItem(result.thumbnailPath, () => {
                window.selectionManager.clearSelection();
                applyHandler(result);
                setTimeout(() => window.safeLineManager.update(), 500);
            });
            
            if (index === selectedIndex) {
                item.find('.thumbnail-wrapper').addClass('selected-thumbnail');
            }
            
            listEl.append(item);
        });
        
        // 선택된 항목으로 스크롤
        setTimeout(() => {
            const selectedItem = listEl.find('.selected-thumbnail').closest('.col-4');
            if (selectedItem.length) {
                selectedItem[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }
    
    static loadBackgroundModal(data, selectedIndex = 0) {
        this.loadModal(data, selectedIndex, $('#modalBackgroundList'), (result) => {
            $('#page-preview-img').attr('src', result.editPath);
            $('#backgroundModal').modal('hide');
        });
    }
    
    static loadFrameModal(data, selectedIndex = 0, category = 'photoframe') {
        this.loadModal(data, selectedIndex, $('#modalFrameList'), (result) => {
            const frameData = { ...result, category };
            FrameManager.applyFrame(frameData);
            $('#frameModal').modal('hide');
        });
    }
    
    // 폰트 관련 메서드들
    static async loadAndSetupFonts() {
        if (this.fontsLoaded) return;
        
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${ctx}/edit/fonts`,
                method: 'GET',
                success: (fonts) => {
                    try {
                        if (!Array.isArray(fonts)) {
                            reject(new Error("Invalid font data"));
                            return;
                        }
                        
                        this.processFonts(fonts);
                        this.fontsLoaded = true;
                        this.setupFontEventListeners();
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                },
                error: reject
            });
        });
    }
    
    static processFonts(fonts) {
        const fontSelect = $('#tooltip-font');
        const styleSheet = this.getOrCreateStyleSheet();
        let fontFaceRules = '';
        
        fontSelect.empty();
        
        fonts.forEach(font => {
            const fontFamily = this.cleanFontName(font.filename);
            const fontUrl = `${ctx}${font.fontPath}`;
            
            fontFaceRules += `
                @font-face {
                    font-family: "${fontFamily}";
                    src: url('${fontUrl}');
                    font-display: swap;
                }
            `;
            
            fontSelect.append($('<option>', {
                value: fontFamily,
                text: this.getDisplayName(fontFamily)
            }));
        });
        
        styleSheet.text(fontFaceRules);
    }
    
    static getOrCreateStyleSheet() {
        let styleSheet = $('#dynamic-font-styles');
        if (!styleSheet.length) {
            styleSheet = $('<style>').attr('id', 'dynamic-font-styles').appendTo('head');
        }
        return styleSheet;
    }
    
    static cleanFontName(filename) {
        if (!filename) return 'Unknown Font';
        
        return filename
            .replace(/\.(ttf|otf|woff2?|eot)$/i, '')
            .replace(/^[^a-zA-Z]+/, '')
            .replace(/[_-]+/g, ' ')
            .trim() || 'CustomFont';
    }
    
    static getDisplayName(fontFamily) {
        return fontFamily
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    static setupFontEventListeners() {
        console.log('폰트 이벤트 리스너 설정 중...');
        
        // 폰트 변경 이벤트
        $('#tooltip-font').off('change.fontManager').on('change.fontManager', (e) => {
            const selectedFontFamily = $(e.target).val();
            const selectedBox = this.getCurrentSelectedTextBox();
            
            if (selectedBox?.length) {
                this.applyFontToTextBox(selectedBox, selectedFontFamily);
                this.saveFontData(selectedBox, selectedFontFamily);
                this.updateTextBoxState(selectedBox);
            }
        });
        
        // 텍스트박스 클릭 이벤트
        $('#frame-container').off('mousedown.fontManager').on('mousedown.fontManager', '.text-box', (e) => {
            setTimeout(() => {
                this.updateAllTextControlsFromTextBox($(e.currentTarget));
            }, 100);
        });
    }
    
    static saveFontData(textBox, fontFamily) {
        textBox.data({
            'savedFontFamily': fontFamily,
            'originalFontFamily': fontFamily
        });
    }
    
    static updateTextBoxState(textBox) {
        setTimeout(() => {
            if (typeof TextManager !== 'undefined' && TextManager.updateTextBoxState) {
                TextManager.updateTextBoxState(textBox);
            }
        }, 50);
    }
    
    static getCurrentSelectedTextBox() {
        // 우선순위: window.selectedBox > selectionManager > CSS class > focus
        const checks = [
            () => window.selectedBox?.hasClass('text-box') ? window.selectedBox : null,
            () => window.selectionManager?.getSelectedTextBox?.(),
            () => $('.text-box.selected').first(),
            () => $('.text-box:focus, .text-box.editing').first()
        ];
        
        for (const check of checks) {
            const result = check();
            if (result?.length) return result;
        }
        
        return null;
    }
    
    static updateAllTextControlsFromTextBox($textBox) {
        if (!$textBox?.length) return;
        
        console.log('텍스트박스 컨트롤 전체 업데이트');
        
        const updates = [
            () => this.updateFontDropdownFromTextBox($textBox),
            () => this.updateFontSizeFromTextBox($textBox),
            () => this.updateTextAlignFromTextBox($textBox),
            () => this.updateTextColorFromTextBox($textBox)
        ];
        
        updates.forEach(update => update());
    }
    
    static updateFontDropdownFromTextBox($textBox) {
        if (!$textBox?.length || !this.fontsLoaded) {
            if (!this.fontsLoaded) {
                setTimeout(() => this.updateFontDropdownFromTextBox($textBox), 100);
            }
            return;
        }
        
        const fontFamily = $textBox.data('savedFontFamily') || 
                          this.extractFontFamily($textBox.css('font-family'));
        
        if (fontFamily) {
            this.setFontDropdownValue(fontFamily);
        }
    }
    
    static extractFontFamily(cssFont) {
        if (!cssFont || cssFont === 'inherit') return null;
        return cssFont.split(',')[0].replace(/['"]/g, '').trim();
    }
    
    static setFontDropdownValue(fontFamily) {
        const fontSelect = $('#tooltip-font');
        let matchingOption = fontSelect.find(`option[value="${fontFamily}"]`);
        
        if (!matchingOption.length) {
            matchingOption = fontSelect.find('option').filter(function() {
                const optionValue = $(this).val().replace(/\s+/g, '').toLowerCase();
                const cleanFont = fontFamily.replace(/\s+/g, '').toLowerCase();
                return optionValue === cleanFont;
            });
        }
        
        const value = matchingOption.length ? matchingOption.first().val() : fontSelect.find('option:first').val();
        fontSelect.val(value).trigger('change');
    }
    
    static updateFontSizeFromTextBox($textBox) {
        if (!$textBox?.length) return;
        
        const fontSize = $textBox.data('savedFontSize') || $textBox.css('font-size');
        if (fontSize) {
            $('#tooltip-size').val(fontSize);
        }
    }
    
    static updateTextAlignFromTextBox($textBox) {
        if (!$textBox?.length) return;
        
        const textAlign = $textBox.css('text-align') || 'left';
        $('#tooltip-align').val(textAlign === 'start' ? 'left' : textAlign);
    }
    
    static updateTextColorFromTextBox($textBox) {
        if (!$textBox?.length) return;
        
        const textColor = $textBox.css('color');
        if (textColor) {
            $('#tooltip-color').val(this.rgbToHex(textColor));
        }
    }
    
    static rgbToHex(rgb) {
        if (!rgb) return null;
        if (rgb.startsWith('#')) return rgb;
        
        const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const [, r, g, b] = rgbMatch.map(Number);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        
        return null;
    }
    
    static applyFontToTextBox($textBox, fontFamily) {
        if (!$textBox || !fontFamily) return;
        
        $textBox.css('font-family', fontFamily);
        $textBox[0].style.setProperty('font-family', fontFamily, 'important');
        
        setTimeout(() => {
            const appliedFont = $textBox.css('font-family');
            console.log('적용 후 폰트 확인:', appliedFont);
            
            if (!appliedFont.includes(fontFamily)) {
                $textBox[0].style.setProperty('font-family', fontFamily, 'important');
            }
            this.updateFontDropdownFromTextBox($textBox);
        }, 100);
    }
}