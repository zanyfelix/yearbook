<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Yearbook Editor Preview Render</title>
<link rel="stylesheet" href="<c:url value='/css/bootstrap.min.css'/>">
<link rel="stylesheet" href="<c:url value='/css/edit.css'/>?v=${jsVersion}">
<style>
html, body {
	margin: 0;
	padding: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: #f5f6f8;
}

body {
	position: relative;
	display: block;
}

#editModal {
	display: block !important;
	position: relative;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background: #fff;
}

#editModal .modal-dialog {
	max-width: 100vw;
	width: 100vw;
	height: 100vh;
	margin: 0;
}

#editModal .modal-content {
	height: 100vh;
	border: 0;
	border-radius: 0;
}

#editModal .modal-body {
	height: 100vh;
	padding: 0;
	display: flex;
}

#page-preview {
	position: relative !important;
}

#page-preview-img:hover {
	transform: none !important;
}

#safe-line-overlay,
#safe-line-overlay .safe-area-hatched,
.safe-area-hatched,
.photo-selection-box,
.rotate-handle,
.rotate-line,
.selection-handle,
.element-resize-handle,
#photo-full-overlay,
.photo-silhouette,
#save-confirmation-message,
#preview-loader {
	display: none !important;
	opacity: 0 !important;
	visibility: hidden !important;
}
</style>
</head>
<body>
	<input type="hidden" id="id" value="">
	<select id="tooltip-font" style="display:none;"></select>
	<div id="preview-loader" style="display:none;"></div>
	<input type="file" id="image-upload-input" style="display:none;">

	<div id="editModal">
		<div class="modal-dialog">
			<div class="modal-content border-0 rounded-0">
				<div class="modal-body d-flex p-0">
					<div class="left-button-area">
						<div class="editor-panel-spacer"></div>
						<div class="button-container"></div>
					</div>

					<div class="center-thumbnail-area">
						<div class="editor-panel-spacer"></div>
						<div id="thumbnail-area"></div>
					</div>

					<div class="d-flex flex-column" style="width: 60%; height: 100%;">
						<div id="editor-toolbar" class="d-flex align-items-center">
							<div class="context-controls d-flex align-items-center">
								<div id="frame-controls" class="d-none w-100"></div>
								<div id="photo-controls" class="d-none w-100"></div>
								<div id="text-controls" class="d-none w-100"></div>
								<div id="element-controls" class="d-none w-100"></div>
								<div id="multi-selection-controls" class="d-none w-100"></div>
							</div>
							<div id="main-actions" class="d-flex align-items-center gap-2"
								style="margin-right: 15px;">
								<button id="btn-clear" class="btn btn-outline-secondary btn-sm" style="display:none;">Clear</button>
								<button id="btn-save" class="btn btn-primary btn-sm" style="display:none;">Save</button>
								<button id="btn-close-modal" class="btn btn-danger btn-sm" style="display:none;">Close</button>
							</div>
						</div>

						<div id="page-preview"
							class="bg-white d-flex flex-row h-100 w-100 flex-nowrap"
							style="position: relative;">
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
						<div id="save-confirmation-message" class="d-flex align-items-center" style="display: none;"></div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<script src="<c:url value='/js/jquery-3.6.0.min.js'/>"></script>
	<script src="<c:url value='/js/bootstrap.bundle.min.js'/>"></script>
	<script>
		window.alert = function(message) {
			window.__RENDER_ERROR = window.__RENDER_ERROR || String(message);
			document.body.dataset.renderError = window.__RENDER_ERROR;
			console.warn('render-browser-editor-preview alert:', message);
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
	<script src="<c:url value='/js/text/TextPreviewManager.js'/>?v=${jsVersion}"></script>
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
		window.__IS_EDITOR_PREVIEW_RENDER = true;
		window.__USE_ORIGINAL_PHOTOS_FOR_RENDER = true;
		window.__USE_ORIGINAL_THEME_ASSETS_FOR_RENDER = true;
		window.renderFontsUrl =
			ctx + '/render/browser/fonts?yearbookId=' + renderYearbookId + '&token=' + encodeURIComponent(renderToken);
		window.__RENDER_READY = false;
		window.__RENDER_ERROR = null;

		function updateViewportDiagnostics() {
			const viewport = window.visualViewport;
			document.body.dataset.editorViewport = JSON.stringify({
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight,
				viewportWidth: viewport ? viewport.width : window.innerWidth,
				viewportHeight: viewport ? viewport.height : window.innerHeight,
				scale: viewport ? viewport.scale : 1
			});
		}

		window.addEventListener('error', function(event) {
			window.__RENDER_ERROR = event.message || 'Unknown render error';
			document.body.dataset.renderError = window.__RENDER_ERROR;
		});

		$(document).ready(async function() {
			try {
				updateViewportDiagnostics();

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
						updateViewportDiagnostics();
						window.__RENDER_READY = true;
						document.body.dataset.renderReady = 'true';
					});
				});
			} catch (error) {
				window.__RENDER_ERROR = error?.message || String(error);
				document.body.dataset.renderError = window.__RENDER_ERROR;
				console.error('Editor preview bootstrap failed:', error);
			}
		});

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', updateViewportDiagnostics);
		}
		window.addEventListener('resize', updateViewportDiagnostics);
	</script>
</body>
</html>
