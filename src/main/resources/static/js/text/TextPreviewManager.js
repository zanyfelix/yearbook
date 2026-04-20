class TextPreviewManager {
	constructor() {
		this.previewTimers = new Map();
		this.pendingRequests = new Map();
		this.currentTextBox = null;
		this.$card = $('#text-side-editor-card');
		this.$input = $('#text-side-editor-input');
		this.$font = $('#text-side-font');
		this.$sizeSelect = $('#text-side-size-select');
		this.$sizeInput = $('#text-side-size');
		this.$align = $('#text-side-align');
		this.$color = $('#text-side-color');
		this.$save = $('#text-side-save');
		this.$status = $('#text-side-editor-status');
		this.bindEvents();
		this.showIdleState();
	}

	reset() {
		this.currentTextBox = null;

		for (const timer of this.previewTimers.values()) {
			clearTimeout(timer);
		}
		this.previewTimers.clear();

		for (const request of this.pendingRequests.values()) {
			if (request && typeof request.abort === 'function') {
				try {
					request.abort();
				} catch (error) {
					console.warn('Failed to abort text preview request:', error);
				}
			}
		}
		this.pendingRequests.clear();
		this.showIdleState();
	}

	bindEvents() {
		if (this.$input.length) {
			this.$input.on('input', () => {
				if (!this.currentTextBox || !this.currentTextBox.length) {
					return;
				}
				this.applyEditorTextToBox(this.currentTextBox);
			});
		}

		if (this.$font.length) {
			this.$font.on('change', () => {
				this.syncToolbarControlsFromEditor();
				this.syncCurrentEditorStateToBox(this.currentTextBox);
			});
		}

		if (this.$sizeSelect.length) {
			this.$sizeSelect.on('change', () => {
				const value = this.$sizeSelect.val();
				if (!value) {
					this.$sizeInput.removeClass('d-none').focus();
					return;
				}
				this.$sizeInput.addClass('d-none').val(value);
				this.syncToolbarControlsFromEditor();
				this.syncCurrentEditorStateToBox(this.currentTextBox);
			});
		}

		if (this.$sizeInput.length) {
			this.$sizeInput.on('input', () => {
				this.syncToolbarControlsFromEditor();
				this.syncCurrentEditorStateToBox(this.currentTextBox);
			});

			this.$sizeInput.on('blur', () => {
				const value = this.$sizeInput.val();
				if (!value) {
					return;
				}
				this.syncToolbarControlsFromEditor();
				this.syncCurrentEditorStateToBox(this.currentTextBox);
			});
		}

		if (this.$align.length) {
			this.$align.on('change', () => {
				this.syncToolbarControlsFromEditor();
				this.syncCurrentEditorStateToBox(this.currentTextBox);
			});
		}

		if (this.$color.length) {
			this.$color.on('input', () => {
				this.syncToolbarControlsFromEditor();
				this.syncCurrentEditorStateToBox(this.currentTextBox);
			});
		}

		if (this.$save.length) {
			this.$save.on('click', () => {
				this.saveCurrentText();
			});
		}
	}

	registerTextBox($textBox, boxData = {}) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		this.ensureContentWrapper($textBox);
		this.releaseStablePreviewSnapshot($textBox);
		this.clearDraftState($textBox);
		const renderImagePath = boxData.renderImage || $textBox.data('renderImagePath') || null;
		const previewId = this.parsePreviewId(renderImagePath) || $textBox.data('renderPreviewId') || null;
		$textBox.data('renderPreviewId', previewId);
		$textBox.data('renderImagePath', renderImagePath);
		$textBox.data('renderPreviewDirty', !!boxData.isModified);

		if (renderImagePath && !$textBox.data('renderPreviewDirty')) {
			this.applyRenderPreview($textBox, renderImagePath);
		} else {
			this.clearRenderPreview($textBox);
		}
	}

	activateTextBox($textBox) {
		if (!$textBox || !$textBox.length) {
			this.currentTextBox = null;
			this.showIdleState();
			return;
		}

		this.currentTextBox = $textBox;
		this.syncFontOptionsFromToolbar();
		this.populateEditorFromTextBox($textBox);
		if (window.panelManager && window.panelManager.showTextPanelForSelection) {
			window.panelManager.showTextPanelForSelection();
		}
	}

	focusSelectedEditor($textBox) {
		this.activateTextBox($textBox);
		if (this.$input.length) {
			this.$input.trigger('focus');
			const element = this.$input.get(0);
			if (element && typeof element.setSelectionRange === 'function') {
				const length = element.value.length;
				element.setSelectionRange(length, length);
			}
		}
	}

	showIdleState() {
		if (this.$card.length) {
			this.$card.addClass('d-none');
		}
		this.syncSaveButtonState(null);
		this.updateStatus('Select a text box to edit it from the panel.');
	}

	populateEditorFromTextBox($textBox) {
		const state = this.getEffectiveState($textBox);
		const html = state.html || '';
		const baseFontSize = Number.isFinite(state.baseFontSize) ? state.baseFontSize : 12;
		const selectedFont = state.fontFamily || $('#tooltip-font').val() || '';
		const currentAlign = state.textAlign || 'left';
		const currentColor = state.color || '#212529';

		if (this.$card.length) {
			this.$card.removeClass('d-none');
		}
		if (this.$input.length) {
			this.$input.val(this.htmlToText(html));
		}
		if (this.$font.length) {
			this.$font.val(selectedFont);
		}
		if (this.$sizeSelect.length && this.$sizeInput.length) {
			const hasOption = this.$sizeSelect.find(`option[value="${baseFontSize}"]`).length > 0;
			if (hasOption) {
				this.$sizeSelect.val(String(baseFontSize));
				this.$sizeInput.addClass('d-none').val(baseFontSize);
			} else {
				this.$sizeSelect.val('');
				this.$sizeInput.removeClass('d-none').val(baseFontSize);
			}
		}
		if (this.$align.length) {
			this.$align.val(currentAlign);
		}
		if (this.$color.length) {
			this.$color.val(currentColor);
		}

		this.updateEditorStatus($textBox);
		this.syncSaveButtonState($textBox);
		this.syncToolbarControlsFromEditor();
	}

	applyEditorTextToBox($textBox, options = {}) {
		const { markDirty = true } = options;
		const text = this.$input.val() || '';
		const nextHtml = this.textToHtml(text);
		const currentState = this.getEffectiveState($textBox);
		const currentHtml = currentState.html || '';
		this.storeDraftState($textBox, {
			...currentState,
			html: nextHtml
		});
		if (markDirty && currentHtml !== nextHtml) {
			this.markDirty($textBox, this.getDirtyStatusMessage($textBox));
		}
	}

	syncCurrentEditorStateToBox($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		const currentState = this.getEffectiveState($textBox);
		const nextState = this.buildStateFromEditor($textBox);

		if (!this.areStatesEqual(currentState, nextState)) {
			this.storeDraftState($textBox, nextState);
			this.markDirty($textBox, this.getDirtyStatusMessage($textBox));
		}
	}

	syncLiveCanvasLayout($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		this.restoreStablePreviewSnapshot($textBox);
	}

	queuePreview($textBox, statusText = 'Text changed. Click Text Save to update the canvas preview.') {
		if (!$textBox || !$textBox.length || window.__IS_BROWSER_RENDER === true) {
			return Promise.resolve(null);
		}

		this.ensureContentWrapper($textBox);
		this.markDirty($textBox, statusText);
		return Promise.resolve(null);
	}

	async ensurePreviewsReady() {
		if (this.currentTextBox && this.currentTextBox.length) {
			this.syncCurrentEditorStateToBox(this.currentTextBox);
		}

		const tasks = [];
		$('#frame-container .text-box').each((_, node) => {
			const $textBox = $(node);
			const element = $textBox.get(0);

			if (this.previewTimers.has(element)) {
				clearTimeout(this.previewTimers.get(element));
				this.previewTimers.delete(element);
				tasks.push(this.requestPreview($textBox, 'Saving text preview...'));
				return;
			}

			if ($textBox.data('renderPreviewDirty')) {
				tasks.push(this.requestPreview($textBox, 'Saving text preview...'));
				return;
			}

			if (!$textBox.data('renderImagePath')) {
				tasks.push(this.requestPreview($textBox, 'Saving text preview...'));
				return;
			}

			if (this.pendingRequests.has(element)) {
				tasks.push(this.pendingRequests.get(element));
			}
		});

		await Promise.allSettled(tasks);
	}

	async requestPreview($textBox, statusText = 'Saving text preview...') {
		if (!$textBox || !$textBox.length || window.__IS_BROWSER_RENDER === true) {
			return null;
		}

		const element = $textBox.get(0);
		if (this.pendingRequests.has(element)) {
			return this.pendingRequests.get(element);
		}

		const requestId = ($textBox.data('renderPreviewRequestId') || 0) + 1;
		$textBox.data('renderPreviewRequestId', requestId);
		this.updateStatus(statusText);
		this.syncSaveButtonState($textBox);

		const payload = {
			previewId: $textBox.data('renderPreviewId') || this.parsePreviewId($textBox.data('renderImagePath')) || null,
			textBox: this.buildPreviewPayload($textBox)
		};

		const jqxhr = $.ajax({
			url: `${ctx}/edit/renderTextPreview`,
			method: 'POST',
			contentType: 'application/json',
			data: JSON.stringify(payload),
			timeout: 120000
		});

		const request = jqxhr.then((response) => {
			if ($textBox.data('renderPreviewRequestId') !== requestId) {
				return response;
			}

			if (!response || response.success !== true || !response.renderImage) {
				const message = response && response.message ? response.message : 'Failed to update text preview.';
				this.updateStatus(message);
				return response;
			}

			const relativeState = $textBox.data('relativeState') || {};
			relativeState.size = relativeState.size || {};
			relativeState.size.width = response.widthPercent;
			relativeState.size.height = response.heightPercent;
			$textBox.data('relativeState', relativeState);
			this.applyDraftStateToBox($textBox);
			$textBox.data('renderPreviewId', response.previewId);
			$textBox.data('renderImagePath', response.renderImage);
			this.applyRenderPreview($textBox, response.renderImage);
			this.clearDirty($textBox, 'Text preview saved.');
			this.clearDraftState($textBox);

			if (window.updateElementPosition) {
				window.updateElementPosition($textBox);
			}

			return response;
		}).catch((error) => {
			if (error && (error.statusText === 'abort' || error.readyState === 0)) {
				return null;
			}
			if (error && error.statusText === 'timeout') {
				this.updateStatus('Text preview save timed out. Please try again.');
				return null;
			}
			console.error('Text preview request failed:', error);
			this.updateStatus('Failed to save the text preview image.');
			return null;
		}).always(() => {
			this.pendingRequests.delete(element);
			this.syncSaveButtonState($textBox);
		});
		request.abort = () => jqxhr.abort();

		this.pendingRequests.set(element, request);
		this.syncSaveButtonState($textBox);
		return request;
	}

	onTextStyleChanged($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}
		this.syncEditorControlsFromTextBox($textBox);
		this.captureStablePreviewSnapshot($textBox);
		this.storeDraftState($textBox, this.readStateFromTextBox($textBox));
		this.syncLiveCanvasLayout($textBox);
		this.markDirty($textBox, this.getDirtyStatusMessage($textBox));
	}

	syncEditorControlsFromTextBox($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}
		if (this.currentTextBox && this.currentTextBox.get(0) === $textBox.get(0)) {
			this.populateEditorFromTextBox($textBox);
		}
	}

	applyRenderPreview($textBox, rawPath) {
		if (!$textBox || !$textBox.length || !rawPath) {
			return;
		}

		const resolvedPath = this.resolvePreviewUrl(rawPath, true);
		$textBox
			.data('useRenderPreview', true)
			.addClass('render-preview-active')
			.css('--text-render-preview', `url("${resolvedPath}")`);
	}

	clearRenderPreview($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}
		$textBox.data('useRenderPreview', false);
		$textBox.removeClass('render-preview-active');
		$textBox.css('--text-render-preview', 'none');
	}

	markDirty($textBox, statusMessage = null) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		$textBox.data('renderPreviewDirty', true);
		if ($textBox.data('renderImagePath')) {
			this.captureStablePreviewSnapshot($textBox);
			this.restoreStablePreviewSnapshot($textBox);
		}
		const nextStatusMessage = statusMessage || this.getDirtyStatusMessage($textBox);
		if (this.currentTextBox && this.currentTextBox.get(0) === $textBox.get(0)) {
			this.updateStatus(nextStatusMessage);
		}
		this.syncSaveButtonState($textBox);
	}

	clearDirty($textBox, statusMessage = 'Text preview saved.') {
		if (!$textBox || !$textBox.length) {
			return;
		}

		$textBox.data('renderPreviewDirty', false);
		this.releaseStablePreviewSnapshot($textBox);
		if (this.currentTextBox && this.currentTextBox.get(0) === $textBox.get(0)) {
			this.updateStatus(statusMessage);
		}
		this.syncSaveButtonState($textBox);
	}

	saveCurrentText() {
		if (!this.currentTextBox || !this.currentTextBox.length) {
			return Promise.resolve(null);
		}

		this.syncCurrentEditorStateToBox(this.currentTextBox);

		if (!this.currentTextBox.data('renderPreviewDirty') && this.currentTextBox.data('renderImagePath')) {
			this.updateStatus('Text preview is already saved.');
			this.syncSaveButtonState(this.currentTextBox);
			return Promise.resolve(null);
		}

		return this.requestPreview(this.currentTextBox, 'Saving text preview...');
	}

	updateEditorStatus($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		const element = $textBox.get(0);
		if (this.pendingRequests.has(element)) {
			this.updateStatus('Saving text preview...');
			return;
		}

		if ($textBox.data('renderPreviewDirty')) {
			this.updateStatus(this.getDirtyStatusMessage($textBox));
			return;
		}

		if ($textBox.data('renderImagePath')) {
			this.updateStatus('Canvas is showing the saved render image.');
			return;
		}

		this.updateStatus('Edit the text here, then click Text Save.');
	}

	syncSaveButtonState($textBox = this.currentTextBox) {
		if (!this.$save.length) {
			return;
		}

		if (!$textBox || !$textBox.length) {
			this.$save.prop('disabled', true).text('Text Save');
			return;
		}

		const element = $textBox.get(0);
		if (this.pendingRequests.has(element)) {
			this.$save.prop('disabled', true).text('Saving...');
			return;
		}

		const needsSave = !!$textBox.data('renderPreviewDirty') || !$textBox.data('renderImagePath');
		this.$save.prop('disabled', !needsSave).text(needsSave ? 'Text Save' : 'Saved');
	}

	buildPreviewPayload($textBox) {
		const state = this.getEffectiveState($textBox);
		return {
			html: state.html || this.getTextBoxHtml($textBox),
			textType: $textBox.data('text-type') || 'text',
			styles: {
				color: state.color || $textBox.css('color'),
				fontSize: Number.isFinite(state.baseFontSize) ? state.baseFontSize : (parseInt($textBox.data('base-font-size'), 10) || 12),
				fontWeight: $textBox.css('font-weight') || '400',
				textAlign: state.textAlign || ((($textBox.css('text-align') || 'left') === 'start')
					? 'left'
					: ($textBox.css('text-align') || 'left')),
				fontFamily: state.fontFamily || $textBox.data('savedFontFamily')
					|| (($textBox.css('font-family') || '').split(',')[0] || '').replace(/['"]/g, '').trim()
			}
		};
	}

	syncToolbarControlsFromEditor() {
		const selectedFont = this.$font.val();
		if (selectedFont !== undefined) {
			$('#tooltip-font').val(selectedFont);
		}

		const selectedSize = this.$sizeSelect.val();
		if (selectedSize) {
			$('#tooltip-size-select').val(selectedSize);
			$('#tooltip-size').addClass('d-none').val(selectedSize);
		} else {
			$('#tooltip-size-select').val('');
			$('#tooltip-size').removeClass('d-none').val(this.$sizeInput.val());
		}

		if (this.$align.length) {
			$('#tooltip-align').val(this.$align.val());
		}

		if (this.$color.length) {
			$('#tooltip-color').val(this.$color.val());
		}
	}

	syncFontOptionsFromToolbar() {
		if (!this.$font.length) {
			return;
		}

		const toolbarOptions = $('#tooltip-font option');
		if (!toolbarOptions.length) {
			return;
		}

		if (this.$font.find('option').length === toolbarOptions.length) {
			return;
		}

		this.$font.empty();
		toolbarOptions.each((_, option) => {
			this.$font.append($(option).clone());
		});
	}

	updateStatus(message) {
		if (this.$status.length) {
			this.$status.text(message);
		}
	}

	getDirtyStatusMessage($textBox) {
		if (!$textBox || !$textBox.length) {
			return 'Canvas will stay unchanged until you click Text Save.';
		}

		if ($textBox.data('renderImagePath')) {
			return 'Canvas is keeping the saved render image. Click Text Save to apply your changes.';
		}

		return 'Canvas will stay unchanged until you click Text Save.';
	}

	readStateFromTextBox($textBox) {
		const currentAlign = (($textBox.css('text-align') || 'left') === 'start')
			? 'left'
			: ($textBox.css('text-align') || 'left');
		return {
			html: this.getTextBoxHtml($textBox),
			baseFontSize: parseInt($textBox.data('base-font-size'), 10) || 12,
			fontFamily: $textBox.data('savedFontFamily')
				|| (($textBox.css('font-family') || '').split(',')[0] || '').replace(/['"]/g, '').trim()
				|| ($('#tooltip-font').val() || ''),
			textAlign: currentAlign,
			color: this.rgbToHex($textBox.css('color')) || '#212529'
		};
	}

	buildStateFromEditor($textBox) {
		const baseState = this.getEffectiveState($textBox);
		const selectedSize = parseInt(this.$sizeSelect.val() || this.$sizeInput.val(), 10);
		return {
			...baseState,
			html: this.textToHtml(this.$input.val() || ''),
			baseFontSize: Number.isFinite(selectedSize) && selectedSize > 0 ? selectedSize : baseState.baseFontSize,
			fontFamily: (this.$font.val() || '').trim() || baseState.fontFamily,
			textAlign: this.$align.val() || baseState.textAlign || 'left',
			color: this.$color.val() || baseState.color || '#212529'
		};
	}

	getDraftState($textBox) {
		if (!$textBox || !$textBox.length) {
			return null;
		}
		return this.deepClone($textBox.data('renderPreviewDraft')) || null;
	}

	getEffectiveState($textBox) {
		return this.getDraftState($textBox) || this.readStateFromTextBox($textBox);
	}

	storeDraftState($textBox, state) {
		if (!$textBox || !$textBox.length || !state) {
			return;
		}
		$textBox.data('renderPreviewDraft', this.deepClone(state));
	}

	updateDraftState($textBox, partialState, statusMessage = null) {
		if (!$textBox || !$textBox.length || !partialState) {
			return;
		}

		const currentState = this.getEffectiveState($textBox);
		const nextState = {
			...currentState,
			...partialState
		};

		if (this.areStatesEqual(currentState, nextState)) {
			return;
		}

		this.storeDraftState($textBox, nextState);
		this.syncEditorControlsFromTextBox($textBox);
		this.markDirty($textBox, statusMessage || this.getDirtyStatusMessage($textBox));
	}

	clearDraftState($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}
		$textBox.removeData('renderPreviewDraft');
	}

	areStatesEqual(left, right) {
		if (!left || !right) {
			return left === right;
		}

		return left.html === right.html
			&& left.baseFontSize === right.baseFontSize
			&& left.fontFamily === right.fontFamily
			&& left.textAlign === right.textAlign
			&& left.color === right.color;
	}

	applyDraftStateToBox($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		const state = this.getDraftState($textBox);
		if (!state) {
			return;
		}

		this.setTextBoxHtml($textBox, state.html || '');
		$textBox.data('base-font-size', state.baseFontSize || 12);
		$textBox.data('savedFontFamily', state.fontFamily || '');

		if (state.fontFamily) {
			$textBox.css('font-family', state.fontFamily);
			if ($textBox[0] && $textBox[0].style) {
				$textBox[0].style.setProperty('font-family', state.fontFamily, 'important');
			}
		}

		if (state.textAlign) {
			$textBox.css('text-align', state.textAlign);
		}

		if (state.color) {
			$textBox.css('color', state.color);
		}
	}

	deepClone(value) {
		if (value === undefined) {
			return undefined;
		}

		try {
			return JSON.parse(JSON.stringify(value));
		} catch (error) {
			console.warn('Failed to clone text preview state:', error);
			return value;
		}
	}

	captureStablePreviewSnapshot($textBox) {
		if (!$textBox || !$textBox.length || !$textBox.data('renderImagePath')) {
			return;
		}

		if ($textBox.data('renderPreviewSnapshot')) {
			return;
		}

		const position = $textBox.position() || { left: 0, top: 0 };
		$textBox.data('renderPreviewSnapshot', {
			left: Number.isFinite(position.left) ? position.left : parseFloat($textBox.css('left')) || 0,
			top: Number.isFinite(position.top) ? position.top : parseFloat($textBox.css('top')) || 0,
			width: $textBox.outerWidth(),
			height: $textBox.outerHeight(),
			transform: $textBox.css('transform'),
			transformOrigin: $textBox.css('transform-origin'),
			relativeState: this.deepClone($textBox.data('relativeState'))
		});
	}

	restoreStablePreviewSnapshot($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		const snapshot = $textBox.data('renderPreviewSnapshot');
		if (!snapshot) {
			return;
		}

		$textBox.css({
			left: snapshot.left + 'px',
			top: snapshot.top + 'px',
			width: snapshot.width + 'px',
			height: snapshot.height + 'px',
			transform: snapshot.transform,
			transformOrigin: snapshot.transformOrigin
		});

		if (snapshot.relativeState) {
			$textBox.data('relativeState', this.deepClone(snapshot.relativeState));
		}
	}

	releaseStablePreviewSnapshot($textBox) {
		if (!$textBox || !$textBox.length) {
			return;
		}

		$textBox.removeData('renderPreviewSnapshot');
	}

	parsePreviewId(renderImagePath) {
		if (typeof renderImagePath !== 'string') {
			return null;
		}
		const match = renderImagePath.match(/\/([^\/?#]+)\.png(?:[?#].*)?$/i);
		return match ? match[1] : null;
	}

	resolvePreviewUrl(rawPath, bustCache = false) {
		if (!rawPath) {
			return rawPath;
		}

		let resolvedPath = rawPath;
		if (window.resolveRenderAssetPath) {
			resolvedPath = window.resolveRenderAssetPath(rawPath);
		} else if (/^https?:\/\//i.test(rawPath) || rawPath.startsWith('data:')) {
			resolvedPath = rawPath;
		} else {
			resolvedPath = `${ctx}${rawPath}`;
		}

		if (!bustCache) {
			return resolvedPath;
		}

		const separator = resolvedPath.includes('?') ? '&' : '?';
		return `${resolvedPath}${separator}t=${Date.now()}`;
	}

	ensureContentWrapper($textBox) {
		if (!$textBox || !$textBox.length) {
			return $();
		}

		let $content = $textBox.children('.text-box-content').first();
		if ($content.length) {
			return $content;
		}

		const existingHtml = $textBox.html();
		$textBox.empty();
		$content = $('<div class="text-box-content"></div>');
		$content.html(existingHtml);
		$textBox.append($content);
		return $content;
	}

	getTextBoxHtml($textBox) {
		if (window.getTextBoxHtml) {
			return window.getTextBoxHtml($textBox);
		}
		return this.ensureContentWrapper($textBox).html() || '';
	}

	setTextBoxHtml($textBox, html) {
		if (window.setTextBoxHtml) {
			window.setTextBoxHtml($textBox, html);
			return;
		}
		this.ensureContentWrapper($textBox).html(html);
	}

	htmlToText(html) {
		const normalizedHtml = String(html || '')
			.replace(/<div>\s*<br\s*\/?>\s*<\/div>/gi, '\n')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<div>/gi, '\n')
			.replace(/<\/div>/gi, '');
		return $('<div>').html(normalizedHtml).text().replace(/\u00A0/g, ' ');
	}

	textToHtml(text) {
		return String(text || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\r\n/g, '\n')
			.replace(/\n/g, '<br>');
	}

	rgbToHex(rgb) {
		if (!rgb) {
			return null;
		}
		if (rgb.startsWith('#')) {
			return rgb;
		}
		const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
		if (!rgbMatch) {
			return null;
		}
		const [, r, g, b] = rgbMatch.map(Number);
		return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
	}
}
