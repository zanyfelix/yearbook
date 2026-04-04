<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Yearbook Browser Render</title>
<link rel="stylesheet" href="<c:url value='/css/bootstrap.min.css'/>">
<link rel="stylesheet" href="<c:url value='/css/edit.css'/>?v=${jsVersion}">
<style>
 :root {
	--editor-width: 786px;
	--editor-height: 1011px;
	--render-width: 2621px;
	--render-height: 3371px;
	--render-scale: 3.334322453;
}

html, body {
	margin: 0;
	padding: 0;
	width: var(--render-width);
	height: var(--render-height);
	overflow: hidden;
	background: #fff;
}

body {
	position: relative;
	display: block;
}

#render-root {
	position: relative;
	width: var(--render-width);
	height: var(--render-height);
	overflow: hidden;
	background: #fff;
}

#page-preview {
	position: absolute !important;
	top: 0;
	left: 0;
	width: var(--editor-width) !important;
	height: var(--editor-height) !important;
	max-width: none !important;
	min-height: 0 !important;
	margin: 0 !important;
	border: 0 !important;
	border-radius: 0 !important;
	transform: scale(var(--render-scale));
	transform-origin: top left;
}

#page-preview .page-preview-container {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	overflow: hidden;
}

#page-preview-img {
	max-width: none !important;
	max-height: none !important;
	width: 100% !important;
	height: 100% !important;
	object-fit: fill !important;
	display: block;
}

#page-preview-img:hover {
	transform: none !important;
}

#safe-line-overlay,
#safe-line-overlay .safe-area-hatched,
.safe-area-hatched {
	display: none !important;
	opacity: 0 !important;
	visibility: hidden !important;
}

.photo-selection-box,
.rotate-handle,
.rotate-line,
.selection-handle,
.element-resize-handle,
#photo-full-overlay,
.photo-silhouette {
	display: none !important;
}
</style>
</head>
<body>
	<input type="hidden" id="userSafeMargin" value="3">
	<input type="hidden" id="id" value="">
	<select id="tooltip-font" style="display:none;"></select>
	<div id="preview-loader" style="display:none;"></div>
	<div id="save-confirmation-message" style="display:none;"></div>
	<input type="file" id="image-upload-input" style="display:none;">

	<div id="render-root">
		<div id="page-preview" class="bg-white d-flex flex-row flex-nowrap" style="position: relative;">
			<div class="page-preview-container flex-grow-1 d-flex justify-content-center h-100">
				<img id="page-preview-img"
					src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
					alt="Yearbook page">
			</div>
			<div id="frame-container"
				style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
			<div id="safe-line-overlay"
				style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:5;"></div>
		</div>
	</div>

	<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
	<script src="<c:url value='/js/bootstrap.bundle.min.js'/>"></script>
	<script>
		window.alert = function(message) {
			window.__RENDER_ERROR = window.__RENDER_ERROR || String(message);
			document.body.dataset.renderError = window.__RENDER_ERROR;
			console.warn('render-browser alert:', message);
		};
	</script>
	<script src="<c:url value='/js/core/SelectionManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/core/SafeLineManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/core/MultiSelectionManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/core/AlignmentManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/events/KeyboardManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/ui/PanelManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/ui/UIManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/frame/FrameManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/text/TextManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/utils/DataLoader.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/utils/Helpers.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/utils/GeometryHelper.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/utils/MaskBoundsCalculator.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/events/EventManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/photo/PhotoManager.js'/>?v=${jsVersion}"></script>
	<script src="<c:url value='/js/main.js'/>?v=${jsVersion}"></script>
	<script>
		const ctx = '${pageContext.request.contextPath}';
		const renderYearbookId = ${yearbookId};
		const renderToken = '${token}';
		window.resolveRenderAssetPath = function(rawPath) {
			if (typeof rawPath !== 'string' || rawPath.length === 0) {
				return rawPath;
			}
			if (rawPath.startsWith('data:') || /^https?:\/\//i.test(rawPath)) {
				return rawPath;
			}
			if (!rawPath.startsWith('/theme/')
					&& !rawPath.startsWith('/photo/')
					&& !rawPath.startsWith('/thumbnail/')
					&& !rawPath.startsWith('/upload/')) {
				return rawPath;
			}

			const params = new URLSearchParams({
				yearbookId: String(renderYearbookId),
				token: renderToken,
				src: rawPath
			});
			return window.location.origin + ctx + '/render/browser/asset?' + params.toString();
		};
		window.__IS_BROWSER_RENDER = true;
		window.__USE_ORIGINAL_PHOTOS_FOR_RENDER = true;
		window.__USE_ORIGINAL_THEME_ASSETS_FOR_RENDER = true;
		window.renderFontsUrl =
			ctx + '/render/browser/fonts?yearbookId=' + renderYearbookId + '&token=' + encodeURIComponent(renderToken);
		window.__RENDER_READY = false;
		window.__RENDER_ERROR = null;

		function parseRenderCssSize(variableName, fallback) {
			const raw = getComputedStyle(document.documentElement)
				.getPropertyValue(variableName)
				.trim()
				.replace('px', '');
			const parsed = Number.parseFloat(raw);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
		}

		function getVisibleBackgroundBounds() {
			const $bgImg = $('#page-preview-img');
			if ($bgImg.length === 0) {
				return null;
			}

			const width = $bgImg.width();
			const height = $bgImg.height();
			const position = $bgImg.position();
			if (!position || width <= 0 || height <= 0) {
				return null;
			}

			return {
				left: position.left,
				top: position.top,
				width: width,
				height: height
			};
		}

		function expandBounds(baseBounds, candidateBounds) {
			if (!candidateBounds || candidateBounds.width <= 0 || candidateBounds.height <= 0) {
				return baseBounds;
			}
			if (!baseBounds) {
				return {
					left: candidateBounds.left,
					top: candidateBounds.top,
					width: candidateBounds.width,
					height: candidateBounds.height
				};
			}

			const left = Math.min(baseBounds.left, candidateBounds.left);
			const top = Math.min(baseBounds.top, candidateBounds.top);
			const right = Math.max(baseBounds.left + baseBounds.width, candidateBounds.left + candidateBounds.width);
			const bottom = Math.max(baseBounds.top + baseBounds.height, candidateBounds.top + candidateBounds.height);
			return {
				left,
				top,
				width: right - left,
				height: bottom - top
			};
		}

		function getVisibleContentBounds() {
			let bounds = getVisibleBackgroundBounds();
			$('#frame-container .frame-group, #frame-container .text-box, #frame-container .element-frame').each(function() {
				const $element = $(this);
				if (!$element.is(':visible')) {
					return;
				}

				const position = $element.position();
				const width = $element.outerWidth();
				const height = $element.outerHeight();
				if (!position || width <= 0 || height <= 0) {
					return;
				}

				bounds = expandBounds(bounds, {
					left: position.left,
					top: position.top,
					width: width,
					height: height
				});
			});

			return bounds;
		}

		function alignViewportToBackgroundBounds() {
			const editorWidth = parseRenderCssSize('--editor-width', 786);
			const editorHeight = parseRenderCssSize('--editor-height', 1011);
			const renderWidth = parseRenderCssSize('--render-width', 2621);
			const renderHeight = parseRenderCssSize('--render-height', 3371);
			const scaleX = renderWidth / editorWidth;
			const scaleY = renderHeight / editorHeight;
			if (![scaleX, scaleY].every((value) => Number.isFinite(value) && value > 0)) {
				return false;
			}

			$('#page-preview').css({
				left: '0px',
				top: '0px',
				transform: `scale(${scaleX}, ${scaleY})`,
				transformOrigin: 'top left'
			});

			document.body.dataset.renderCrop = JSON.stringify({
				left: 0,
				top: 0,
				width: editorWidth,
				height: editorHeight,
				scaleX: scaleX,
				scaleY: scaleY
			});
			return true;
		}

		window.addEventListener('error', function(event) {
			window.__RENDER_ERROR = event.message || 'Unknown render error';
			document.body.dataset.renderError = window.__RENDER_ERROR;
		});

		$(document).ready(async function() {
			try {
				await DataLoader.loadAndSetupFonts();

				const pageData = await $.ajax({
					url: `${ctx}/render/browser/pageData`,
					method: 'GET',
					dataType: 'json',
					data: {
						id: renderYearbookId,
						token: renderToken
					}
				});

				await Promise.race([
					new Promise((resolve) => {
						window.renderPage(pageData, function() {
							setTimeout(resolve, 250);
						});
					}),
					new Promise((resolve) => setTimeout(resolve, 6000))
				]);

				if (window.waitForAllPhotosLoaded) {
					await window.waitForAllPhotosLoaded();
				}

				if (window.safeLineManager) {
					window.safeLineManager.update();
				}
				if (window.updateAllPositions) {
					window.updateAllPositions();
				}
				if (window.updateAllPhotosPosition) {
					window.updateAllPhotosPosition();
				}

				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						alignViewportToBackgroundBounds();
						window.__RENDER_READY = true;
						document.body.dataset.renderReady = 'true';
					});
				});
			} catch (error) {
				window.__RENDER_ERROR = error?.message || String(error);
				document.body.dataset.renderError = window.__RENDER_ERROR;
				console.error('Browser render bootstrap failed:', error);
			}
		});
	</script>
</body>
</html>
