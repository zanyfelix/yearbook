// ============================================================================
// 📁 js/main.js
// ============================================================================
$(document).ready(function() {
    // 전역 인스턴스 초기화
    window.selectionManager = new SelectionManager();
    window.safeLineManager = new SafeLineManager();
    window.panelManager = new PanelManager();
    
    // 전역 함수 래핑 (기존 코드 호환성)
    window.clearSelection = () => window.selectionManager.clearSelection();
    window.selectFrame = (frame) => window.selectionManager.selectFrame(frame);
    window.selectPhoto = (photo, frame) => window.selectionManager.selectPhoto(photo, frame);
    
    // 파일 업로드 처리
    $('#image-upload-input').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const $input = $(this);
        const frameGroup = $input.data('targetFrameGroup');
        const photo = $input.data('targetUploadedPhoto');
        const placeholder = $input.data('targetPlaceholderLink');
        const mask = $input.data('targetMaskContainer');
        
        if (!frameGroup || !photo || !placeholder || !mask) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            photo.attr('src', event.target.result).css('display', 'block');
            
            photo.on('load', function() {
                const maskWidth = mask.width();
                const maskHeight = mask.height();
                const imgRatio = this.naturalWidth / this.naturalHeight;
                const containerRatio = maskWidth / maskHeight;
                
                let newWidth, newHeight;
                if (imgRatio > containerRatio) {
                    newHeight = maskHeight * 1.2;
                    newWidth = newHeight * imgRatio;
                } else {
                    newWidth = maskWidth * 1.2;
                    newHeight = newWidth / imgRatio;
                }
                
                photo.css({
                    width: `${newWidth}px`,
                    height: `${newHeight}px`,
                    left: `${(maskWidth - newWidth) / 2}px`,
                    top: `${(maskHeight - newHeight) / 2}px`
                });
                
                window.selectionManager.clearSelection();
            });
            
            placeholder.hide();
            $input.val('');
        };
        reader.readAsDataURL(file);
    });
    
    // 클리어 버튼
    $('#btn-clear').on('click', function() {
        if (confirm("모든 디자인이 삭제됩니다. 계속하시겠습니까?")) {
            $('#page-preview-img').attr('src', '/images/placeholder.png');
            $('#frame-container').empty();
            window.selectionManager.clearSelection();
            setTimeout(() => window.safeLineManager.update(), 100);
        }
    });
    
    // 전역 이벤트 설정
    EventManager.setupGlobalEvents();
});