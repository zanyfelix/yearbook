// ============================================================================
// 📁 js/ui/PanelManager.js
// ============================================================================
class PanelManager {
    constructor() {
        this.btnBg = $('#btn-background');
        this.btnPhotoFrame = $('#btn-photo-frame');
		this.btnTextboxFrame = $('#btn-textbox-frame');
        this.btnText = $('#btn-text');
        this.bgPanel = $('#background-panel');
        this.framePanel = $('#frame-panel');
        this.textPanel = $('#text-panel');
        
        this.init();
    }
    
    init() {
        this.btnBg.on('click', () => this.showBackgroundPanel());
        this.btnPhotoFrame.on('click', () => this.showPhotoFramePanel());
		this.btnTextboxFrame.on('click', () => this.showTextFramePanel());
        this.btnText.on('click', () => this.showTextPanel());
    }
    
    hideAllPanels() {
        this.bgPanel.add(this.framePanel).add(this.textPanel).addClass('d-none');
    }
    
    activate(btn) {
        [this.btnBg, this.btnPhotoFrame, this.btnTextboxFrame, this.btnText].forEach(b => b.removeClass('active'));
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
        DataLoader.loadFrames();
    }
	
	showTextboxFramePanel() {
		window.selectionManager.clearSelection();
		this.activate(this.btnTextboxFrame);
		this.hideAllPanels();
		this.framePanel.removeClass('d-none');
		DataLoader.loadFrames();
	}
    
    showTextPanel() {
        window.selectionManager.clearSelection();
        this.activate(this.btnText);
        this.hideAllPanels();
        this.textPanel.removeClass('d-none');
    }
}