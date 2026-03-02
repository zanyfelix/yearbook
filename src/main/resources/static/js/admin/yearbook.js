/* =========================================================
   admin/yearbook.js  –  연감 다운로드 + 실시간 렌더링 진행바
   =========================================================
   흐름:
   1. DOWNLOAD 버튼 클릭
   2. 랜덤 progressToken 생성
   3. SSE 구독 시작 (/admin/yearbook/progress?token=...)
   4. 다운로드 요청 (/admin/yearbook/download?ids=...&token=...)
   5. 백엔드에서 학교별 렌더링 완료 시 SSE 이벤트 → 진행바 업데이트
   6. 렌더링 완료 → ZIP 스트림 → 브라우저 다운로드
   7. SSE 연결 종료, 진행바 숨김
   ========================================================= */

/** 전체 체크박스 토글 */
function toggleAll(source) {
    document.querySelectorAll('input.selectBox')
            .forEach(cb => cb.checked = source.checked);
}

/* ─── 개별 페이지 선택 모달 ─────────────────────────────── */
const PageSelectModal = (() => {
    let _userId     = null;
    let _schoolName = '';
    let _selectedIds = new Set();   // 선택된 Yearbook ID

    // ── DOM 참조 ──────────────────────────────────────────────
    const $overlay  = () => $('#page-select-modal');
    const $title    = () => $('#ps-modal-title');
    const $body     = () => $('#ps-modal-body');
    const $count    = () => $('#ps-selected-count');
    const $dlBtn    = () => $('#ps-download-btn');

    // ── 선택 카운트 업데이트 ────────────────────────────────
    function _updateCount() {
        const n = _selectedIds.size;
        $count().text(n + '개 선택됨');
        $dlBtn().prop('disabled', n === 0);
    }

    // ── 썸네일 아이템 클릭 토글 ────────────────────────────
    function _toggleItem($item) {
        const id = parseInt($item.data('id'), 10);
        if (_selectedIds.has(id)) {
            _selectedIds.delete(id);
            $item.removeClass('selected');
        } else {
            _selectedIds.add(id);
            $item.addClass('selected');
        }
        _updateCount();
    }

    // ── 모달 열기 ────────────────────────────────────────────
    function open(userId, schoolName) {
        _userId     = userId;
        _schoolName = schoolName;
        _selectedIds.clear();

        $title().text(schoolName + ' — 페이지 선택');
        $body().html('<div class="ps-loading">페이지 정보를 불러오는 중...</div>');
        _updateCount();

        $overlay().show();

        // API 호출
        $.getJSON(`${ctx}/admin/yearbook/pages?userId=${userId}`)
            .done(function (data) { _renderBody(data); })
            .fail(function ()     { $body().html('<div class="ps-loading">불러오기 실패. 다시 시도해주세요.</div>'); });
    }

    // ── 모달 닫기 ────────────────────────────────────────────
    function close() {
        $overlay().hide();
        _selectedIds.clear();
    }

    // ── 카테고리 → 그룹 → 썸네일 렌더링 ─────────────────────
    function _renderBody(categories) {
        if (!categories || categories.length === 0) {
            $body().html('<div class="ps-loading">등록된 페이지가 없습니다.</div>');
            return;
        }

        let html = '';
        categories.forEach(cat => {
            if (!cat.groups || cat.groups.length === 0) return;

            html += `<div class="ps-category-section">
                       <div class="ps-category-title">${cat.categoryLabel}</div>`;

            cat.groups.forEach(group => {
                if (!group.pages || group.pages.length === 0) return;

                html += `<div class="ps-group-section" data-contents-id="${group.contentsId}">
                           <div class="ps-group-header">
                             <span class="ps-group-title">${escHtml(group.title)}</span>
                             <button class="ps-group-select-all" data-contents-id="${group.contentsId}">전체 선택</button>
                           </div>
                           <div class="ps-thumb-grid">`;

                group.pages.forEach(page => {
                    const imgTag = page.thumbnailPath
                        ? `<img src="${ctx}${page.thumbnailPath}" loading="lazy" alt="p${page.pageNo}">`
                        : `<div class="ps-no-img">No Image</div>`;
                    html += `<div class="ps-thumb-item" data-id="${page.id}" data-page="${page.pageNo}">
                               ${imgTag}
                               <div class="ps-check-overlay">✓</div>
                               <div class="ps-thumb-label">p.${page.pageNo}</div>
                             </div>`;
                });

                html += `    </div>
                         </div>`;
            });

            html += `</div>`;
        });

        $body().html(html);

        // 이벤트 위임
        $body().off('click.ps').on('click.ps', '.ps-thumb-item', function () {
            _toggleItem($(this));
        });

        $body().on('click.ps', '.ps-group-select-all', function () {
            const cid = $(this).data('contents-id');
            const $group = $(`.ps-group-section[data-contents-id="${cid}"]`);
            const $items = $group.find('.ps-thumb-item');
            const allSelected = $items.length > 0 &&
                                $items.toArray().every(el => _selectedIds.has(parseInt($(el).data('id'), 10)));

            $items.each(function () {
                const id = parseInt($(this).data('id'), 10);
                if (allSelected) {
                    _selectedIds.delete(id);
                    $(this).removeClass('selected');
                } else {
                    _selectedIds.add(id);
                    $(this).addClass('selected');
                }
            });
            _updateCount();
        });
    }

    // ── 선택된 페이지 다운로드 ───────────────────────────────
    async function downloadSelected() {
        if (_selectedIds.size === 0) return;

        const pageIds = [..._selectedIds];
        const token   = 'dl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        // 진행바 표시
        DownloadProgress.start(pageIds.length);
        close();    // 모달 닫기

        // SSE 구독
        let sseSource = null;
        try {
            sseSource = new EventSource(`${ctx}/admin/yearbook/progress?token=${token}`);

            sseSource.addEventListener('ping', () => {});

            sseSource.addEventListener('pageStart', (e) => {
                const d = JSON.parse(e.data);
                DownloadProgress.onSchoolStart(d.index, d.total, d.title + ' p.' + d.pageNo);
            });

            sseSource.addEventListener('pageDone', (e) => {
                const d = JSON.parse(e.data);
                DownloadProgress.onSchoolDone(d.index, d.total, '');
            });

            sseSource.addEventListener('packaging', () => {
                DownloadProgress.onPackaging();
            });

            sseSource.addEventListener('done', () => {
                DownloadProgress.onDownloading();
                if (sseSource) { sseSource.close(); sseSource = null; }
            });

            sseSource.addEventListener('error', (e) => {
                try {
                    const msg = e.data || '렌더링 중 오류 발생';
                    alert('오류: ' + msg);
                } catch (_) {}
                if (sseSource) { sseSource.close(); sseSource = null; }
                DownloadProgress.hide();
            });

            sseSource.onerror = () => {
                if (sseSource) { sseSource.close(); sseSource = null; }
            };

        } catch (sseErr) {
            console.warn('[SSE] EventSource 생성 실패:', sseErr);
        }

        // 다운로드 요청
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 1_800_000);

        try {
            const url      = `${ctx}/admin/yearbook/downloadSelected?pageIds=${pageIds.join(',')}&token=${token}`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

            const blob = await response.blob();

            let fileName = _schoolName.replace(/ /g, '') + '_yearbook_files.zip';
            const cd = response.headers.get('Content-Disposition');
            if (cd) {
                const starMatch = cd.match(/filename\*=UTF-8''([^;]+)/i);
                if (starMatch) {
                    fileName = decodeURIComponent(starMatch[1]);
                } else {
                    const plain = cd.match(/filename="([^"]+)"/);
                    if (plain) fileName = plain[1];
                }
            }

            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href     = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);

            DownloadProgress.complete();

        } catch (err) {
            clearTimeout(timeoutId);
            if (sseSource) { sseSource.close(); sseSource = null; }
            DownloadProgress.hide();
            if (err.name === 'AbortError') {
                alert('요청이 시간 초과되었습니다. 다시 시도해주세요.');
            } else {
                alert(`다운로드 중 오류가 발생했습니다: ${err.message}`);
            }
        }
    }

    return { open, close, downloadSelected };
})();

/** HTML 특수문자 이스케이프 (XSS 방지) */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ─── 진행바 UI 관리 ────────────────────────────────────── */
const DownloadProgress = (() => {
    let _startTime     = null;
    let _timerInterval = null;
    let _totalSchools  = 0;
    let _doneSchools   = 0;

    const $overlay  = () => $('#download-progress-overlay');
    const $fill     = () => $('#dl-overall-fill');
    const $pct      = () => $('#dl-overall-pct');
    const $counter  = () => $('#dl-school-counter');
    const $name     = () => $('#dl-school-name');
    const $elapsed  = () => $('#dl-elapsed-time');
    const $spinner  = () => $('.dl-mini-spinner');
    const $stepRender   = () => $('#dl-step-render');
    const $stepZip      = () => $('#dl-step-zip');
    const $stepDownload = () => $('#dl-step-download');

    function _setPercent(pct) {
        pct = Math.max(0, Math.min(100, Math.round(pct)));
        $fill().css('width', pct + '%');
        $pct().text(pct + '%');
    }

    function _updateTimer() {
        if (!_startTime) return;
        const sec = Math.floor((Date.now() - _startTime) / 1000);
        if (sec < 60) {
            $elapsed().text(sec + 's');
        } else {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            $elapsed().text(m + 'm ' + s + 's');
        }
    }

    function _setStep(stepId) {
        // 렌더링 → ZIP → 다운로드 순서
        const steps = ['dl-step-render', 'dl-step-zip', 'dl-step-download'];
        const activeIdx = steps.indexOf(stepId);
        steps.forEach((id, i) => {
            const $el = $('#' + id);
            $el.removeClass('active done');
            if (i < activeIdx) {
                $el.addClass('done');
                // 연결선도 done 처리
                $el.next('.dl-step-connector').addClass('done');
            } else if (i === activeIdx) {
                $el.addClass('active');
                $el.next('.dl-step-connector').removeClass('done');
            }
        });
    }

    return {
        /** 진행바 초기화 + 오버레이 표시 */
        start(totalSchools) {
            _startTime    = Date.now();
            _totalSchools = totalSchools;
            _doneSchools  = 0;

            $fill().css({ transition: 'none', width: '0%' });
            setTimeout(() => $fill().css('transition', 'width 0.5s cubic-bezier(0.4,0,0.2,1)'), 50);
            $pct().text('0%');
            $counter().text('0 / ' + totalSchools + ' 학교');
            $name().text('렌더링 시작 중...');
            $elapsed().text('0s');
            $spinner().css('opacity', '1');

            // 단계 초기화
            ['dl-step-render', 'dl-step-zip', 'dl-step-download'].forEach(id => {
                $('#' + id).removeClass('active done');
            });
            $('.dl-step-connector').removeClass('done');

            _setStep('dl-step-render');

            $overlay().addClass('active');

            clearInterval(_timerInterval);
            _timerInterval = setInterval(_updateTimer, 500);
        },

        /** 학교 렌더링 시작 */
        onSchoolStart(index, total, schoolName) {
            _setStep('dl-step-render');
            $name().text('렌더링 중: ' + schoolName);
            _setPercent((index / total) * 90);   // 0~90% 구간을 학교 수로 분배
            $counter().text(index + ' / ' + total + ' 학교');
        },

        /** 학교 렌더링 완료 */
        onSchoolDone(index, total, schoolName) {
            _doneSchools = index + 1;
            _setPercent((_doneSchools / total) * 90);
            $counter().text(_doneSchools + ' / ' + total + ' 학교');
        },

        /** ZIP 생성 단계 */
        onPackaging() {
            _setStep('dl-step-zip');
            $name().text('ZIP 파일 생성 중...');
            _setPercent(93);
        },

        /** 다운로드 시작 단계 */
        onDownloading() {
            _setStep('dl-step-download');
            $name().text('파일 다운로드 중...');
            _setPercent(97);
        },

        /** 완료 */
        complete() {
            clearInterval(_timerInterval);
            _updateTimer();
            _setPercent(100);
            $name().text('완료!');
            $spinner().css('opacity', '0');

            // 모든 단계를 완료로 표시
            ['dl-step-render', 'dl-step-zip', 'dl-step-download'].forEach(id => {
                $('#' + id).removeClass('active').addClass('done');
            });
            $('.dl-step-connector').addClass('done');

            setTimeout(() => {
                $overlay().removeClass('active');
                _startTime = null;
            }, 1200);
        },

        /** 에러 시 즉시 숨김 */
        hide() {
            clearInterval(_timerInterval);
            $overlay().removeClass('active');
            _startTime = null;
        }
    };
})();

/* ─── 메인 로직 ─────────────────────────────────────────── */
$(document).ready(function () {

    /* ── Select Pages 버튼 클릭 → 모달 열기 ───────────────── */
    $(document).on('click', '.btn-select-pages', function () {
        const userId     = $(this).data('userid');
        const schoolName = $(this).data('schoolname');
        PageSelectModal.open(userId, schoolName);
    });

    /* ── 모달 닫기 ─────────────────────────────────────────── */
    $('#ps-modal-close-btn, #ps-cancel-btn').on('click', function () {
        PageSelectModal.close();
    });

    /* ESC 키로 닫기 */
    $(document).on('keydown.psmodal', function (e) {
        if (e.key === 'Escape') PageSelectModal.close();
    });

    /* 오버레이 배경 클릭으로 닫기 */
    $('#page-select-modal').on('click', function (e) {
        if ($(e.target).is('#page-select-modal')) PageSelectModal.close();
    });

    /* ── 선택 다운로드 버튼 ────────────────────────────────── */
    $('#ps-download-btn').on('click', function () {
        PageSelectModal.downloadSelected();
    });

    /* ── 전체 다운로드 버튼 ────────────────────────────────── */
    $('#btn-apply').on('click', async function () {

        /* 1. 선택된 학교 ID 수집 + 검증 */
        const selectedIds    = [];
        let hasUnsubmitted   = false;
        const unsubmittedNames = [];

        $('.selectBox:checked').each(function () {
            const $row          = $(this).closest('tr');
            const submitStatus  = $row.find('td:eq(2)').text().trim();
            const schoolName    = $row.find('td:eq(1)').text().trim();

            if (submitStatus === 'Submitted' || loginUserRole.toUpperCase() === 'ADMIN') {
                selectedIds.push($(this).val());
            } else {
                hasUnsubmitted = true;
                unsubmittedNames.push(schoolName);
            }
        });

        if (selectedIds.length === 0) {
            if (hasUnsubmitted) {
                alert('The following selected users have not submitted their yearbooks and cannot be downloaded:\n'
                      + unsubmittedNames.join(', '));
            } else {
                alert('Please select at least one user with a submitted yearbook.');
            }
            return;
        }

        if (hasUnsubmitted) {
            alert('Some selected users have not submitted their yearbooks and will be skipped:\n'
                  + unsubmittedNames.join(', ')
                  + '\n\nProceeding with download for submitted users only.');
        }

        /* 2. progressToken 생성 */
        const token = 'dl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        /* 3. 진행바 표시 */
        DownloadProgress.start(selectedIds.length);

        /* 4. SSE 구독 시작 */
        let sseSource = null;
        try {
            sseSource = new EventSource(`${ctx}/admin/yearbook/progress?token=${token}`);

            sseSource.addEventListener('ping', () => {
                // 연결 확인 - 별도 처리 없음
            });

            sseSource.addEventListener('init', (e) => {
                const data = JSON.parse(e.data);
                console.log('[SSE] init:', data);
                // total 은 이미 start() 에서 설정됨
            });

            sseSource.addEventListener('schoolStart', (e) => {
                const data = JSON.parse(e.data);
                console.log('[SSE] schoolStart:', data);
                DownloadProgress.onSchoolStart(data.index, data.total, data.schoolName);
            });

            sseSource.addEventListener('schoolDone', (e) => {
                const data = JSON.parse(e.data);
                console.log('[SSE] schoolDone:', data);
                DownloadProgress.onSchoolDone(data.index, data.total, data.schoolName);
            });

            sseSource.addEventListener('packaging', (e) => {
                console.log('[SSE] packaging');
                DownloadProgress.onPackaging();
            });

            sseSource.addEventListener('done', (e) => {
                console.log('[SSE] done');
                DownloadProgress.onDownloading();
                if (sseSource) { sseSource.close(); sseSource = null; }
            });

            sseSource.addEventListener('error', (e) => {
                // SSE 에러 이벤트 (서버가 명시적으로 보낸 것)
                try {
                    const msg = e.data || '렌더링 중 오류 발생';
                    console.error('[SSE] error:', msg);
                    alert('오류: ' + msg);
                } catch (_) {}
                if (sseSource) { sseSource.close(); sseSource = null; }
                DownloadProgress.hide();
            });

            sseSource.onerror = (e) => {
                // SSE 연결 자체 오류 (네트워크 등) – 렌더링이 완료되어 SSE 가 닫힌 경우도 포함
                // done 이벤트 이후 onerror 가 정상적으로 발생할 수 있으므로 무시
                if (sseSource) { sseSource.close(); sseSource = null; }
            };

        } catch (sseErr) {
            console.warn('[SSE] EventSource 생성 실패 – 진행바 없이 다운로드 계속:', sseErr);
        }

        /* 5. 다운로드 요청 (Fetch API) */
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 1_800_000); // 30분

        try {
            const downloadUrl = `${ctx}/admin/yearbook/download?ids=${selectedIds.join(',')}&token=${token}`;
            const response    = await fetch(downloadUrl, { signal: controller.signal });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            // ZIP Blob 수신
            const blob = await response.blob();

            // Content-Disposition 에서 파일명 파싱 (RFC 5987 지원)
            let fileName = 'yearbook_files.zip';
            const cd = response.headers.get('Content-Disposition');
            if (cd) {
                const starMatch = cd.match(/filename\*=UTF-8''([^;]+)/i);
                if (starMatch) {
                    fileName = decodeURIComponent(starMatch[1]);
                } else {
                    const plainMatch = cd.match(/filename="([^"]+)"/);
                    if (plainMatch) fileName = plainMatch[1];
                }
            }

            // 브라우저 다운로드 트리거
            const url = window.URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.style.display = 'none';
            a.href     = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // 완료 처리
            DownloadProgress.complete();
            setTimeout(() => location.reload(true), 1800);

        } catch (error) {
            clearTimeout(timeoutId);
            if (sseSource) { sseSource.close(); sseSource = null; }
            DownloadProgress.hide();

            if (error.name === 'AbortError') {
                alert('The request timed out. Please try again.');
            } else {
                alert(`An error occurred during download: ${error.message}`);
            }
        }
    });
});
