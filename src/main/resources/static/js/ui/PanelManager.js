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
		this.bgPanel.removeClass('d-none'); // 패널을 비우지 않고 일단 보여줍니다.

		// ▼▼▼ [핵심 수정] 패널에 내용이 없을 때만 데이터를 로드하도록 변경합니다. ▼▼▼
		if (this.bgPanel.children().length === 0) {
			// main.js가 모달에 저장해 둔 pageCategory 값을 가져옵니다.
			const pageCategory = $('#editModal').data('page-category');
			// 가져온 pageCategory 값으로 데이터를 로드합니다.
			DataLoader.loadBackgrounds(pageCategory);
		}
	}
    
	showPhotoFramePanel() {
		window.selectionManager.clearSelection();
		this.activate(this.btnPhotoFrame);
		this.hideAllPanels();
		this.framePanel.removeClass('d-none');
		$('#photoFrameList').removeClass('d-none');
		$('#textboxFrameList').addClass('d-none');
		if ($('#photoFrameList').children('.col-4').length === 0) {
			const pageCategory = $('#editModal').data('page-category');
			DataLoader.loadPhotoFrames(pageCategory);
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
			DataLoader.loadTextboxFrames('Public');
		}
	}

	showTextPanel() {
		// 이 함수는 데이터 로딩과 관련 없으므로 수정 불필요
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
			DataLoader.loadElements('Public');
		}
	}
}