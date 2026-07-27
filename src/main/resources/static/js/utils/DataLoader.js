// ============================================================================
// 📁 js/utils/DataLoader.js - 최적화 버전
// ============================================================================
class DataLoader {
    static fontsLoaded = false;
    static thumbnailLoadTokens = new Map();

    static beginThumbnailLoad(targetPanel) {
        const nextToken = (this.thumbnailLoadTokens.get(targetPanel) || 0) + 1;
        this.thumbnailLoadTokens.set(targetPanel, nextToken);
        return nextToken;
    }

    static isCurrentThumbnailLoad(targetPanel, token) {
        return this.thumbnailLoadTokens.get(targetPanel) === token;
    }

    static invalidateThumbnailLoads(targetPanels = [
        '#background-panel',
        '#photoFrameList',
        '#textboxFrameList',
        '#element-panel'
    ]) {
        targetPanels.forEach(targetPanel => {
            const nextToken = (this.thumbnailLoadTokens.get(targetPanel) || 0) + 1;
            this.thumbnailLoadTokens.set(targetPanel, nextToken);
        });
        FrameManager.clearHoverPreview();
    }
    
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
    
    // ✅ 로딩 스피너 생성
    static createLoader() {
        return $(`
            <div class="thumbnail-loader" style="
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
                padding: 40px 0;
                color: #666;
            ">
                <div style="text-align: center;">
                    <div class="spinner-border spinner-border-sm text-secondary mb-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div style="font-size: 12px;">Loading...</div>
                </div>
            </div>
        `);
    }
    
    // ✅ 이미지 프리로드 함수
    static preloadImage(src) {
        return new Promise((resolve) => {
            if (!src) {
                resolve(null);
                return;
            }
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src.startsWith('http') || src.startsWith('/') ? src : `${ctx}${src}`;
        });
    }

    static normalizeFrameCategory(category) {
        const normalized = String(category || '').toLowerCase();
        if (normalized === 'photoframe') return 'photoframe';
        if (normalized === 'textboxframe') return 'textboxframe';
        if (normalized === 'element') return 'element';
        return null;
    }

    static createPreviewOptions(theme, category) {
        const normalizedCategory = this.normalizeFrameCategory(category);
        if (!normalizedCategory || !theme) return {};

        const previewTheme = { ...theme, category: normalizedCategory };
        return {
            onMouseEnter: () => FrameManager.showHoverPreview(previewTheme),
            onMouseLeave: () => FrameManager.clearHoverPreview()
        };
    }
    
    // 공통 썸네일 로드 로직 (로딩 표시 추가)
    static async loadThumbnails(category, gubun, targetPanel, modalHandler) {
        const loadToken = this.beginThumbnailLoad(targetPanel);
        const userId = $("#id").val();
        FrameManager.clearHoverPreview();
        const panel = $(targetPanel).empty();
        
        // 1. 로딩 스피너 표시
        const $loader = this.createLoader();
        panel.append($loader);
        
        try {
            // 2. 데이터 가져오기
            const representativeData = await this.fetchData('/edit/theme', {
                userId, category, gubun
            });

            if (!this.isCurrentThumbnailLoad(targetPanel, loadToken)) return;
            
            if (!representativeData || representativeData.length === 0) {
                $loader.remove();
                panel.append('<div class="text-center text-muted py-3">No items found</div>');
                return;
            }
            
            // 3. 모든 썸네일 이미지 프리로드
            const preloadPromises = representativeData.map(result => 
                this.preloadImage(result.theme.thumbnailPath)
            );
            
            await Promise.all(preloadPromises);

            if (!this.isCurrentThumbnailLoad(targetPanel, loadToken)) return;
            
            // 4. 로딩 스피너 제거
            $loader.remove();
            
            // 5. 썸네일 아이템 생성 및 표시
            representativeData.forEach(result => {
                const item = Helpers.createThumbnailItem(result.theme.thumbnailPath, async () => {
                    FrameManager.clearHoverPreview();
                    if (modalHandler) {
                        try {
                            const fullListData = await this.fetchData('/edit/themesByParent', {
                                themeId: result.theme.id
                            });
                            modalHandler(fullListData);
                        } catch (error) {
                            alert("Failed to load full list.");
                        }
                    }
                    else {
                        const normalizedCategory = this.normalizeFrameCategory(category);
                        FrameManager.applyFrame({
                            ...result.theme,
                            category: normalizedCategory || result.theme.category
                        });
                    }
                }, this.createPreviewOptions(result.theme, category));
                panel.append(item);
            });
            
        } catch (error) {
            if (!this.isCurrentThumbnailLoad(targetPanel, loadToken)) return;
            console.error(`${category} 로딩 실패:`, error);
            $loader.remove();
            panel.append('<div class="text-center text-danger py-3">Failed to load</div>');
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
    
    // 모달 로드 공통 로직 (로딩 표시 추가)
    static async loadModal(data, selectedIndex, listEl, applyHandler, previewMapper = null) {
        FrameManager.clearHoverPreview();
        listEl.empty();
        
        // 데이터가 없으면 메시지 표시
        if (!data || data.length === 0) {
            listEl.append('<div class="text-center text-muted py-3">No items found</div>');
            return;
        }
        
        // 1. 로딩 스피너 표시
        const $loader = this.createLoader();
        listEl.append($loader);
        
        try {
            // 2. 모든 썸네일 이미지 프리로드
            const preloadPromises = data.map(result => 
                this.preloadImage(result.thumbnailPath)
            );
            
            await Promise.all(preloadPromises);
            
            // 3. 로딩 스피너 제거
            $loader.remove();
            
            // 4. 썸네일 아이템 생성 및 표시
            data.forEach((result, index) => {
                const item = Helpers.createThumbnailItem(result.thumbnailPath, () => {
                    FrameManager.clearHoverPreview();
                    window.selectionManager.clearSelection();
                    applyHandler(result);
                    setTimeout(() => window.safeLineManager.update(), 500);
                }, previewMapper
                    ? {
                        onMouseEnter: () => FrameManager.showHoverPreview(previewMapper(result)),
                        onMouseLeave: () => FrameManager.clearHoverPreview()
                    }
                    : {});
                
                if (index === selectedIndex) {
                    item.find('.thumbnail-wrapper').addClass('selected-thumbnail');
                }
                
                listEl.append(item);
            });
            
            // 5. 선택된 항목으로 스크롤
            setTimeout(() => {
                const selectedItem = listEl.find('.selected-thumbnail').closest('.col-4');
                if (selectedItem.length) {
                    selectedItem[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
            
        } catch (error) {
            console.error('모달 썸네일 로딩 실패:', error);
            $loader.remove();
            listEl.append('<div class="text-center text-danger py-3">Failed to load</div>');
        }
    }
    
    static loadBackgroundModal(data, selectedIndex = 0) {
        this.loadModal(data, selectedIndex, $('#modalBackgroundList'), (result) => {
            $('#page-preview-img')
                .attr('src', result.editPath)
                .data('backgroundEditPath', result.editPath || null)
                .data('backgroundOriginalPath', result.originalPath || result.editPath || null)
                .data('backgroundThemeId', result.id || null);
            $('#backgroundModal').modal('hide');
        });
    }
    
    static loadFrameModal(data, selectedIndex = 0, category = 'photoframe') {
        this.loadModal(data, selectedIndex, $('#modalFrameList'), (result) => {
            const frameData = { ...result, category };
            FrameManager.applyFrame(frameData);
            $('#frameModal').modal('hide');
        }, result => ({ ...result, category }));

        $('#frameModal')
            .off('hidden.bs.modal.framePreview')
            .on('hidden.bs.modal.framePreview', () => FrameManager.clearHoverPreview());
    }
    
    // 폰트 관련 메서드들
    static async loadAndSetupFonts() {
        if (this.fontsLoaded) return;
        
        return new Promise((resolve, reject) => {
            const fontsUrl = window.renderFontsUrl || `${ctx}/edit/fonts`;
            $.ajax({
                url: fontsUrl,
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
            const resolvedFontPath = window.resolveRenderAssetPath
                ? window.resolveRenderAssetPath(font.fontPath)
                : font.fontPath;
            const fontUrl = resolvedFontPath && /^https?:\/\//i.test(resolvedFontPath)
                ? resolvedFontPath
                : `${ctx}${resolvedFontPath}`;
            
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
    
    static async ensureFontLoaded(fontFamily) {
        if (!fontFamily || !document.fonts || typeof document.fonts.load !== 'function') {
            return;
        }

        try {
            await Promise.all([
                document.fonts.load(`12px "${fontFamily}"`),
                document.fonts.load(`bold 12px "${fontFamily}"`),
                document.fonts.load(`italic 12px "${fontFamily}"`)
            ]);
        } catch (error) {
            console.warn('Font load wait failed:', fontFamily, error);
        }
    }

    static async ensureFontsLoaded(fontFamilies = []) {
        const uniqueFamilies = [...new Set(
            (fontFamilies || [])
                .map(fontFamily => (fontFamily || '').trim())
                .filter(Boolean)
        )];

        if (uniqueFamilies.length === 0) {
            return;
        }

        await Promise.all(uniqueFamilies.map(fontFamily => this.ensureFontLoaded(fontFamily)));
    }

    static setupFontEventListeners() {
        console.log('폰트 이벤트 리스너 설정 중...');
        
        // 폰트 변경 이벤트
        $('#tooltip-font').off('change.fontManager').on('change.fontManager', (e) => {
            const selectedFontFamily = $(e.target).val();
            const selectedBox = this.getCurrentSelectedTextBox();
            
            if (selectedBox?.length && selectedFontFamily) {
                this.applyFontToTextBox(selectedBox, selectedFontFamily).then(() => {
                    this.updateTextBoxState(selectedBox);
                });
                this.saveFontData(selectedBox, selectedFontFamily);
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
        fontSelect.val(value);
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
    
    static async applyFontToTextBox($textBox, fontFamily) {
        if (!$textBox || !fontFamily) return;

        await this.ensureFontLoaded(fontFamily);
        
        $textBox.css('font-family', fontFamily);
        $textBox[0].style.setProperty('font-family', fontFamily, 'important');

        if (typeof TextManager !== 'undefined' && TextManager.adjustBoxSizeForLineBreaks) {
            TextManager.adjustBoxSizeForLineBreaks($textBox);
        }
        
        setTimeout(() => {
            const appliedFont = $textBox.css('font-family');
            console.log('적용 후 폰트 확인:', appliedFont);
            
            if (!appliedFont.includes(fontFamily)) {
                $textBox[0].style.setProperty('font-family', fontFamily, 'important');
            }
            this.updateFontDropdownFromTextBox($textBox);
            if (window.textPreviewManager) {
                window.textPreviewManager.onTextStyleChanged($textBox);
            }
        }, 100);
    }
}
