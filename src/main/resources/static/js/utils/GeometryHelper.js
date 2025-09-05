// 📁 js/utils/GeometryHelper.js - 신규 파일

class GeometryHelper {
	/**
	 * 요소의 현재 transform을 기반으로 화면상의 네 꼭짓점 좌표를 계산합니다.
	 * @param {jQuery} $element - 좌표를 계산할 jQuery 요소
	 * @returns {Array<Object>} - [{x, y}, {x, y}, {x, y}, {x, y}] 형태의 꼭짓점 배열
	 */
	static getRotatedCorners($element) {
		const transform = $element.css('transform');
		const matrix = TransformHelper.parseMatrix(transform);
		const w = $element.outerWidth();
		const h = $element.outerHeight();
		const offset = $element.offset();

		// 요소의 중심점 계산
		const centerX = offset.left + w / 2;
		const centerY = offset.top + h / 2;

		// 회전 각도(라디안) 계산
		const angle = Math.atan2(matrix.b, matrix.a);

		const corners = [];
		const points = [
			{ x: -w / 2, y: -h / 2 }, // Top-left
			{ x: w / 2, y: -h / 2 }, // Top-right
			{ x: w / 2, y: h / 2 }, // Bottom-right
			{ x: -w / 2, y: h / 2 }  // Bottom-left
		];

		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		for (const p of points) {
			const rotatedX = p.x * cos - p.y * sin;
			const rotatedY = p.x * sin + p.y * cos;
			corners.push({
				x: centerX + rotatedX,
				y: centerY + rotatedY
			});
		}
		return corners;
	}

	/**
	 * 분리 축 이론(SAT)을 사용하여 두 다각형(꼭짓점 배열)이 교차하는지 확인합니다.
	 * @param {Array<Object>} cornersA - 첫 번째 다각형의 꼭짓점 배열
	 * @param {Array<Object>} cornersB - 두 번째 다각형의 꼭짓점 배열
	 * @returns {boolean} - 교차하면 true, 그렇지 않으면 false
	 */
	static checkIntersection(cornersA, cornersB) {
		const polygons = [cornersA, cornersB];
		let axes = [];

		// 각 다각형의 모든 변에 수직인 축을 구합니다.
		for (const corners of polygons) {
			for (let i = 0; i < corners.length; i++) {
				const p1 = corners[i];
				const p2 = corners[i + 1] || corners[0];
				const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
				const normal = { x: -edge.y, y: edge.x }; // 수직 벡터
				axes.push(normal);
			}
		}

		// 각 축에 대해 두 다각형의 그림자를 투영하고, 겹치는지 확인합니다.
		for (const axis of axes) {
			const projA = this.project(cornersA, axis);
			const projB = this.project(cornersB, axis);

			// 한 축이라도 그림자가 겹치지 않으면, 두 다각형은 분리되어 있습니다.
			if (projA.max < projB.min || projB.max < projA.min) {
				return false; // 분리됨 (교차하지 않음)
			}
		}

		// 모든 축에서 그림자가 겹치면, 두 다각형은 교차합니다.
		return true;
	}

	/**
	 * 다각형을 특정 축에 투영하여 최소/최대 값을 찾습니다. (그림자 만들기)
	 * @param {Array<Object>} corners - 다각형의 꼭짓점 배열
	 * @param {Object} axis - 투영할 축 벡터 {x, y}
	 * @returns {Object} - {min, max}
	 */
	static project(corners, axis) {
		let min = Infinity;
		let max = -Infinity;
		for (const p of corners) {
			const dotProduct = p.x * axis.x + p.y * axis.y; // 벡터 내적
			min = Math.min(min, dotProduct);
			max = Math.max(max, dotProduct);
		}
		return { min, max };
	}

	/**
	 * 프레임 요소에 저장된 maskBounds 데이터를 기반으로 실제 마스크 영역의 꼭짓점 좌표를 계산합니다.
	 * @param {jQuery} $frameGroup - 기준이 되는 프레임 그룹 요소
	 * @returns {Array<Object>|null} - 계산된 마스크 영역의 꼭짓점 배열
	 */
	static getMaskedAreaCorners($frameGroup) {
		// 프레임 요소에 직접 저장된 maskBounds 데이터를 읽습니다.
		const bounds = $frameGroup.data('maskBounds');
		if (!bounds) {
			// 데이터가 없으면(계산 전이거나 실패한 경우) 전체 프레임 영역을 사용합니다.
			return this.getRotatedCorners($frameGroup);
		}

		const frameOffset = $frameGroup.offset();
		const frameWidth = $frameGroup.outerWidth();
		const frameHeight = $frameGroup.outerHeight();

		// maskBounds 비율을 실제 픽셀 값으로 변환
		const maskLeft = frameOffset.left + frameWidth * bounds.x;
		const maskTop = frameOffset.top + frameHeight * bounds.y;
		const maskWidth = frameWidth * bounds.width;
		const maskHeight = frameHeight * bounds.height;

		// 마스크 영역의 네 꼭짓점 좌표를 반환합니다.
		return [
			{ x: maskLeft, y: maskTop },
			{ x: maskLeft + maskWidth, y: maskTop },
			{ x: maskLeft + maskWidth, y: maskTop + maskHeight },
			{ x: maskLeft, y: maskTop + maskHeight }
		];
	}
}