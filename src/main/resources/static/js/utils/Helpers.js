// ============================================================================
// 📁 js/utils/Helpers.js
// ============================================================================
class Helpers {
    static createThumbnailItem(src, onClick) {
        const col = $('<div class="col-4 text-center">');
        const wrapper = $('<div class="thumbnail-wrapper position-relative">');
        const img = $('<img class="img-thumbnail preview-img">').attr('src', src);
        const overlay = $('<div class="overlay d-flex">');
        const btn = $('<button class="btn btn-primary btn-sm">').text('Select').on('click', onClick);
        
        return col.append(wrapper.append(img).append(overlay.append(btn)));
    }
    
    static getFrameRotation(frameGroup) {
        const transform = frameGroup.css('transform');
        if (!transform || transform === 'none') return 0;
        
        const matrix = transform.match(/matrix\((.+)\)/);
        if (matrix) {
            const values = matrix[1].split(',').map(Number);
            const angle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
            return angle < 0 ? angle + 360 : angle;
        }
        return 0;
    }
    
	static getPhotoRotation(photo) {
	    const transform = photo.css('transform');
	    if (transform === 'none') return 0;
	    const matrix = transform.match(/^matrix\((.+)\)$/);
	    if (matrix) {
	        const values = matrix[1].split(', ');
	        const a = values[0];
	        const b = values[1];
	        return Math.round(Math.atan2(b, a) * (180 / Math.PI));
	    }
	    return 0;
	}
}