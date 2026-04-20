<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Yearbook Text Preview Render</title>
<style>
html, body {
	margin: 0;
	padding: 0;
	width: 786px;
	height: 1011px;
	overflow: hidden;
	background: transparent;
}

body {
	position: relative;
}

#preview-root {
	position: relative;
	width: 786px;
	height: 1011px;
	background: transparent;
}

#text-preview-target {
	position: absolute;
	left: 0;
	top: 0;
	display: inline-block;
	min-width: 1px;
	min-height: 1px;
	padding: 10px;
	margin: 0;
	border: 0;
	box-sizing: border-box;
	background: transparent;
	overflow: visible;
	word-break: keep-all;
	overflow-wrap: normal;
	font-synthesis: none;
	-webkit-font-smoothing: antialiased;
	text-rendering: geometricPrecision;
}
</style>
</head>
<body>
	<div id="preview-root">
		<div id="text-preview-target"></div>
	</div>

	<script>
		const ctx = '${pageContext.request.contextPath}';
		const previewToken = '${token}';
		window.__RENDER_READY = false;
		window.__RENDER_ERROR = null;

		function resolveFontUrl(rawPath) {
			if (typeof rawPath !== 'string' || rawPath.length === 0) {
				return rawPath;
			}
			if (rawPath.startsWith('data:') || /^https?:\/\//i.test(rawPath)) {
				return rawPath;
			}
			return window.location.origin + ctx + rawPath;
		}

		function cleanFontName(filename) {
			if (!filename) {
				return 'CustomFont';
			}
			return filename
				.replace(/\.(ttf|otf|woff2?|eot)$/i, '')
				.replace(/^[^a-zA-Z]+/, '')
				.replace(/[_-]+/g, ' ')
				.trim() || 'CustomFont';
		}

		function hasLineBreaks(html) {
			if (typeof html !== 'string' || html.length === 0) {
				return false;
			}
			const normalized = html
				.replace(/<br\s*\/?>\s*$/gi, '')
				.replace(/(<div>\s*<br\s*\/?>\s*<\/div>\s*)+$/gi, '')
				.replace(/<div>\s*<\/div>\s*$/gi, '');
			return normalized.includes('<br') || normalized.includes('<div');
		}

		async function injectFonts(fonts) {
			if (!Array.isArray(fonts) || fonts.length === 0) {
				return;
			}

			const style = document.createElement('style');
			style.id = 'text-preview-font-styles';
			style.textContent = fonts.map((font) => {
				return '@font-face {' +
					'font-family: "' + cleanFontName(font.filename) + '";' +
					'src: url("' + resolveFontUrl(font.fontPath) + '");' +
					'font-display: block;' +
					'}';
			}).join('\n');
			document.head.appendChild(style);
		}

		async function waitForFont(fontFamily) {
			if (!fontFamily || !document.fonts || typeof document.fonts.load !== 'function') {
				return;
			}

			await Promise.allSettled([
				document.fonts.load('12px "' + fontFamily + '"'),
				document.fonts.load('bold 12px "' + fontFamily + '"'),
				document.fonts.load('italic 12px "' + fontFamily + '"')
			]);
		}

		window.addEventListener('error', function(event) {
			window.__RENDER_ERROR = event.message || 'Unknown text preview render error';
			document.body.dataset.renderError = window.__RENDER_ERROR;
		});

		(async function bootstrap() {
			try {
				const response = await fetch(ctx + '/render/browser/text-preview/data?token=' + encodeURIComponent(previewToken), {
					credentials: 'same-origin'
				});

				if (!response.ok) {
					throw new Error('Failed to load text preview payload (' + response.status + ')');
				}

				const payload = await response.json();
				const textBox = payload.textBox || {};
				const styles = textBox.styles || {};
				const target = document.getElementById('text-preview-target');

				await injectFonts(payload.fonts || []);
				await waitForFont(styles.fontFamily);

				target.style.color = styles.color || 'rgb(33, 37, 41)';
				target.style.fontSize = (Number(styles.fontSize) || 12) + 'px';
				target.style.fontWeight = styles.fontWeight || '400';
				target.style.textAlign = styles.textAlign || 'left';
				target.style.fontFamily = styles.fontFamily || 'Arial, sans-serif';
				target.style.whiteSpace = hasLineBreaks(textBox.html) ? 'pre-wrap' : 'nowrap';

				target.innerHTML = textBox.html && textBox.html.trim() ? textBox.html : '&#8203;';

				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						window.__RENDER_READY = true;
						document.body.dataset.renderReady = 'true';
					});
				});
			} catch (error) {
				window.__RENDER_ERROR = error?.message || String(error);
				document.body.dataset.renderError = window.__RENDER_ERROR;
				console.error('Text preview bootstrap failed:', error);
			}
		})();
	</script>
</body>
</html>
