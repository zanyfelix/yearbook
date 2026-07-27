// ============================================================================
// 📁 js/ui/PanelManager.js - 최종 수정본
// ============================================================================
class PanelManager {
    constructor() {
        // 각 패널의 버튼과 패널 DOM 요소를 직접 변수에 할당합니다.
        this.btnBg = $('#btn-background');
        this.btnPhotoFrame = $('#btn-photo-frame');
        this.btnTextboxFrame = $('#btn-textbox-frame');
        this.btnText = $('#btn-text');
        this.btnElement = $('#btn-element');
        
        this.bgPanel = $('#background-panel');
        this.photoFramePanel = $('#photoFrameList');
        this.textboxFramePanel = $('#textboxFrameList');
        this.textPanel = $('#text-panel');
        this.elementPanel = $('#element-panel');
        
        // 모든 버튼과 패널을 배열로 관리하여 코드를 단순화합니다.
        this.buttons = [this.btnBg, this.btnPhotoFrame, this.btnTextboxFrame, this.btnText, this.btnElement];
        this.panels = [this.bgPanel, this.photoFramePanel, this.textboxFramePanel, this.textPanel, this.elementPanel];
        
        this.init();
    }
    
    init() {
        // 각 버튼에 해당하는 패널을 보여주는 이벤트를 연결합니다.
        this.btnBg.on('click', () => this.showPanel(this.bgPanel, this.btnBg));
        this.btnPhotoFrame.on('click', () => this.showPanel(this.photoFramePanel, this.btnPhotoFrame));
        this.btnTextboxFrame.on('click', () => this.showPanel(this.textboxFramePanel, this.btnTextboxFrame));
        this.btnText.on('click', () => this.showPanel(this.textPanel, this.btnText));
        this.btnElement.on('click', () => this.showPanel(this.elementPanel, this.btnElement));
    }

    /**
     * 특정 패널을 보여주고, 데이터가 없으면 로드합니다.
     * @param {jQuery} panelToShow - 보여줄 패널
     * @param {jQuery} buttonToActivate - 활성화할 버튼
     */
    showPanel(panelToShow, buttonToActivate, options = {}) {
        if (!options.preserveSelection && window.selectionManager) {
            window.selectionManager.clearSelection();
        }

        // 모든 버튼 비활성화 및 모든 패널 숨기기
        this.buttons.forEach(btn => btn.removeClass('active'));
        this.panels.forEach(p => p.addClass('d-none'));

        // 선택한 버튼 활성화 및 패널 보여주기
        buttonToActivate.addClass('active');
        panelToShow.removeClass('d-none');

        // 데이터 로드가 필요한 패널인지 확인하고, 내용이 비어있으면 데이터 로드
        this.loadDataIfNeeded(panelToShow);
    }

    showDefaultPanelForPage() {
        this.showPanel(this.bgPanel, this.btnBg, { preserveSelection: true });
    }

    showTextPanelForSelection() {
        this.showPanel(this.textPanel, this.btnText, { preserveSelection: true });
    }

    /**
     * 패널의 ID를 기반으로 데이터 로드가 필요한지 판단하고 실행합니다.
     * @param {jQuery} panel - 확인할 패널
     */
    loadDataIfNeeded(panel) {
        const panelId = panel.attr('id');
        const needsDataLoad = ['background-panel', 'photoFrameList', 'textboxFrameList', 'element-panel'].includes(panelId);

        // 데이터 로드가 필요하고, 패널에 자식 요소가 없는 경우에만 실행
        if (needsDataLoad && panel.children().length === 0) {
            const pageCategory = $('#editModal').data('page-category');

            switch (panelId) {
                case 'background-panel':
                    DataLoader.loadBackgrounds(pageCategory);
                    break;
                case 'photoFrameList':
                    DataLoader.loadPhotoFrames(pageCategory);
                    break;
                case 'textboxFrameList':
                    DataLoader.loadTextboxFrames('Public');
                    break;
                case 'element-panel':
                    DataLoader.loadElements('Public');
                    break;
            }
        }
    }
}
