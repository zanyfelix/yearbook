// ============================================================================
// 📁 js/ui/PanelManager.js
// ============================================================================
class PanelManager {
    constructor() {
        this.btnBg = $('#btn-background');
        this.btnFrame = $('#btn-frame');
        this.btnText = $('#btn-text');
        this.bgPanel = $('#background-panel');
        this.framePanel = $('#frame-panel');
        this.textPanel = $('#text-panel');
        
        this.init();
    }
    
    init() {
        this.btnBg.on('click', () => this.showBackgroundPanel());
        this.btnFrame.on('click', () => this.showFramePanel());
        this.btnText.on('click', () => this.showTextPanel());
    }
    
    hideAllPanels() {
        this.bgPanel.add(this.framePanel).add(this.textPanel).addClass('d-none');
    }
    
    activate(btn) {
        [this.btnBg, this.btnFrame, this.btnText].forEach(b => b.removeClass('active'));
        btn.addClass('active');
    }
    
    showBackgroundPanel() {
        window.selectionManager.clearSelection();
        this.activate(this.btnBg);
        this.hideAllPanels();
        this.bgPanel.removeClass('d-none').empty();
        DataLoader.loadBackgrounds();
    }
    
    showFramePanel() {
        window.selectionManager.clearSelection();
        this.activate(this.btnFrame);
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