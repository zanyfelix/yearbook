// 📁 js/utils/MaskBoundsCalculator.js - 신규 파일

class MaskBoundsCalculator {
    // 계산된 마스크 영역 정보를 캐싱하여 반복 계산을 방지합니다.
    static cache = {};

    /**
     * 마스크 이미지 URL을 받아 투명하지 않은 영역의 경계를 계산합니다.
     * @param {string} url - 분석할 마스크 이미지의 전체 URL
     * @returns {Promise<Object>} - {x, y, width, height} 형태의 경계 정보 (비율값)
     */
    static getBounds(url) {
        return new Promise((resolve, reject) => {
            // 이미 계산된 값이 있으면 캐시에서 반환
            if (this.cache[url]) {
                return resolve(this.cache[url]);
            }

            const img = new Image();
            // CORS 정책 문제를 피하기 위해 crossOrigin 속성 설정
            img.crossOrigin = "Anonymous";

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);

                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
                    
                    // 모든 픽셀을 순회하며 알파(투명도) 값을 확인
                    for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            // 알파 값 인덱스: (y * 너비 + x) * 4 + 3
                            const alpha = imageData[(y * canvas.width + x) * 4 + 3];
                            if (alpha > 0) { // 투명하지 않은 픽셀을 찾으면
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }
                    
                    // 유효 영역이 있으면 비율값으로 계산
                    if (maxX > -1) {
                        const bounds = {
                            x: minX / canvas.width,
                            y: minY / canvas.height,
                            width: (maxX - minX + 1) / canvas.width,
                            height: (maxY - minY + 1) / canvas.height
                        };
                        this.cache[url] = bounds; // 결과 캐싱
                        resolve(bounds);
                    } else {
                        // 유효 영역이 없는 경우(완전 투명 이미지) 전체 영역으로 처리
                        resolve({ x: 0, y: 0, width: 1, height: 1 });
                    }
                } catch (e) {
                    console.error("Canvas 이미지 데이터 분석 실패:", e);
                    reject(e);
                }
            };
            
            img.onerror = () => {
                reject(new Error(`이미지 로드 실패: ${url}`));
            };

            img.src = url;
        });
    }
}