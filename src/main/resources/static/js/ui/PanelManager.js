// ============================================================================
// 📁 js/ui/PanelManager.js
// ============================================================================
class PanelManager {
    constructor() {
        this.btnBg = $('#btn-background');
        this.btnPhotoFrame = $('#btn-photo-frame');
		this.btnTextboxFrame = $('#btn-textbox-frame');
        this.btnText = $('#btn-text');
		this.btnElement = $('#btn-element');
		
        this.bgPanel = $('#background-panel');
        this.framePanel = $('#frame-panel');
        this.textPanel = $('#text-panel');
		this.elementPanel = $('#element-panel');
        
        this.init();
    }
    
    init() {
        this.btnBg.on('click', () => this.showBackgroundPanel());
        this.btnPhotoFrame.on('click', () => this.showPhotoFramePanel());
		this.btnTextboxFrame.on('click', () => this.showTextboxFramePanel());
        this.btnText.on('click', () => this.showTextPanel());
		this.btnElement.on('click', () => this.showElementPanel());
    }
    
    hideAllPanels() {
        this.bgPanel.add(this.framePanel).add(this.textPanel).add(this.elementPanel).addClass('d-none');
    }
    
    activate(btn) {
        [this.btnBg, this.btnPhotoFrame, this.btnTextboxFrame, this.btnText, this.btnElement].forEach(b => b.removeClass('active'));
        btn.addClass('active');
    }
    
    showBackgroundPanel() {
        window.selectionManager.clearSelection();
        this.activate(this.btnBg);
        this.hideAllPanels();
        this.bgPanel.removeClass('d-none').empty();
        DataLoader.loadBackgrounds();
    }
    
    showPhotoFramePanel() {
        window.selectionManager.clearSelection();
        this.activate(this.btnPhotoFrame);
        this.hideAllPanels();
        this.framePanel.removeClass('d-none');
		$('#photoFrameList').removeClass('d-none');
		$('#textboxFrameList').addClass('d-none');
		if ($('#photoFrameList').children('.col-4').length === 0) {
			DataLoader.loadPhotoFrames();
		}
    }
	
	showTextboxFramePanel() {
		window.selectionManager.clearSelection();
		this.activate(this.btnTextboxFrame);
		this.hideAllPanels();
		this.framePanel.removeClass('d-none');
		$('#textboxFrameList').removeClass('d-none');
		$('#photoFrameList').addClass('d-none');
		if ($('#textboxFrameList').children('.col-4').length === 0) {
			DataLoader.loadTextboxFrames();
		}
	}
    
    showTextPanel() {
        window.selectionManager.clearSelection();
        this.activate(this.btnText);
        this.hideAllPanels();
        this.textPanel.removeClass('d-none');
    }
	
	showElementPanel() {
		window.selectionManager.clearSelection();
		this.activate(this.btnElement);
		this.hideAllPanels();

		// ✨ element-panel이 없으면 PhotoFrame과 동일한 구조로 생성
		if ($('#element-panel').length === 0) {
			const elementPanel = $('<div id="element-panel" class="d-none row row-cols-3 g-3"></div>');
			$('#thumbnail-area').append(elementPanel);
		}

		// Element 패널 표시
		$('#element-panel').removeClass('d-none');

		// 데이터가 로드되지 않았으면 로드
		if ($('#element-panel').children('.col-4').length === 0) {
			DataLoader.loadElements();
		}
	}
}