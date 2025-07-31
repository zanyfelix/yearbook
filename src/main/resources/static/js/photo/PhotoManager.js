// ============================================================================
// 📁 js/photo/PhotoManager.js
// ============================================================================
class PhotoManager {
    static photoOverlay = null;
    
    static addHandles(photo) {
        $('.selection-handle').remove();
        ['nw', 'se'].forEach(position => {
            const handle = $('<div class="selection-handle">').addClass(`handle-${position}`).css({
                position: 'absolute',
                width: '12px', height: '12px',
                backgroundColor: '#FFA500',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: position === 'nw' ? 'nw-resize' : 'se-resize',
                zIndex: 30
            });
            
            const offset = -6;
            if (position === 'nw') {
                handle.css({ top: `${offset}px`, left: `${offset}px` });
            } else {
                handle.css({ bottom: `${offset}px`, right: `${offset}px` });
            }
            
            photo.append(handle);
            this.makeResizable(photo, handle, position);
        });
    }
    
    static makeResizable(photo, handle, position) {
        handle.on('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = photo.width();
            const startHeight = photo.height();
            
            $(document).on('mousemove', (ev) => {
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;
                
                let scaleFactor = position === 'nw' 
                    ? 1 - Math.max(deltaX, deltaY) / Math.max(startWidth, startHeight)
                    : 1 + Math.max(deltaX, deltaY) / Math.max(startWidth, startHeight);
                
                scaleFactor = Math.max(0.3, Math.min(scaleFactor, 3));
                
                const newWidth = startWidth * scaleFactor;
                const newHeight = startHeight * scaleFactor;
                
                photo.css({ width: `${newWidth}px`, height: `${newHeight}px` });
                
                if (position === 'nw') {
                    const currentLeft = parseFloat(photo.css('left'));
                    const currentTop = parseFloat(photo.css('top'));
                    photo.css({
                        left: `${currentLeft + (startWidth - newWidth)}px`,
                        top: `${currentTop + (startHeight - newHeight)}px`
                    });
                }
            });
            
            $(document).on('mouseup', () => {
                $(document).off('mousemove mouseup');
            });
        });
    }
    
    static handleDrag(photo, frameGroup, maskContainer, e) {
        const startX = e.clientX;
        const startY = e.clientY;
        const initialLeft = photo.position().left;
        const initialTop = photo.position().top;
        let isDragging = false;

        $(document).on('mousemove.photoDrag', (ev) => {
            if (!isDragging && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 5) {
                isDragging = true;
            }
            
            if (isDragging) {
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;
                
                let newLeft = initialLeft + deltaX;
                let newTop = initialTop + deltaY;
                
                const containerWidth = maskContainer.width();
                const containerHeight = maskContainer.height();
                const photoWidth = photo.width();
                const photoHeight = photo.height();
                
                newLeft = Math.max(-photoWidth * 0.8, Math.min(newLeft, containerWidth * 0.8));
                newTop = Math.max(-photoHeight * 0.8, Math.min(newTop, containerHeight * 0.8));
                
                photo.css({ left: `${newLeft}px`, top: `${newTop}px` });
                
                if (this.photoOverlay) {
                    this.photoOverlay.find('.photo-silhouette').css({
                        left: `${newLeft}px`, top: `${newTop}px`
                    });
                }
            }
        });

        $(document).on('mouseup.photoDrag', () => {
            $(document).off('mousemove.photoDrag mouseup.photoDrag');
        });
    }
    
    static showOverlay(photo, frameGroup) {
        this.hideOverlay();
        
        const frameTheme = frameGroup.data('frameTheme');
        if (!frameTheme?.editMaskPath) return;
        
        this.photoOverlay = $('<div id="photo-full-overlay"></div>').css({
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            zIndex: 12, pointerEvents: 'none'
        });
        
        const silhouette = photo.clone().css({
            position: 'absolute',
            top: photo.css('top'), left: photo.css('left'),
            width: photo.css('width'), height: photo.css('height'),
            opacity: 0.4, border: '1px dashed rgba(255, 165, 0, 0.6)',
            zIndex: 1
        }).removeClass('selected-photo uploaded-photo').addClass('photo-silhouette');
        
        frameGroup.append(this.photoOverlay.append(silhouette));
    }
    
    static hideOverlay() {
        if (this.photoOverlay) {
            this.photoOverlay.remove();
            this.photoOverlay = null;
        }
        $('#photo-full-overlay, .photo-silhouette').remove();
    }
    
    static rotate(photo, angle) {
        const current = Helpers.getPhotoRotation(photo);
        const newAngle = (current + angle + 360) % 360;
        photo.css('transform', `rotate(${newAngle}deg)`);
    }
}