/* Create Job Posting - Basic Information page.
   Supports multiple posts under one circular with structured First Group and Second Group. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var DEMO_APPLICANTS = 10;

  var STAGE_OPTIONS = [
    { key: 'MCQ', label: 'MCQ', subtitle: 'Screening Test', icon: 'bi-ui-checks', fullTitle: 'Multiple Choice Questions (MCQ)' },
    { key: 'WRITTEN', label: 'Written', subtitle: 'Written Exam', icon: 'bi-pencil-square', fullTitle: 'Written Examination' },
    { key: 'VIVA', label: 'Viva voce', subtitle: 'Oral & Scrutiny', icon: 'bi-chat-quote', fullTitle: 'Viva-Voce & Interview' },
    { key: 'PRACTICAL', label: 'Practical Test', subtitle: 'Skills / Typing', icon: 'bi-laptop', fullTitle: 'Practical / Typing Test' }
  ];

  function render(view, params) {
    var cid = (params && params.cid) || (params && params.query && params.query.cid) || '';
    var existingCirc = cid ? store.circular(cid) : null;
    var isEdit = !!existingCirc;

    ERec.router.setCrumbs([
      { label: 'Job Circulars', href: '#/circulars' },
      { label: isEdit ? ('Edit ' + (existingCirc.title || existingCirc.post || 'Circular')) : 'Create Job Posting' }
    ]);

    var y = new Date().getFullYear();
    var draft = (!isEdit && store.getDraftCircular) ? store.getDraftCircular() : null;
    var existingStages = isEdit ? store.stagesOf(existingCirc.id) : (draft && draft.stages ? draft.stages : []);
    var selectedStages = existingStages.length
      ? existingStages.map(function (s) { return s.type; })
      : [];

    var defaultTitle = isEdit ? existingCirc.title : (draft ? draft.title : '');
    var defaultCode = isEdit ? existingCirc.code : (draft ? draft.code : ('HRD/REC/' + y + '/' + fmt.pad(store.all('circulars').length + 1, 2)));
    var defaultPost = isEdit ? existingCirc.post : (draft ? draft.post : '');
    var defaultVac = isEdit
      ? (existingCirc.vacancies < 10 ? fmt.pad(existingCirc.vacancies, 2) : String(existingCirc.vacancies))
      : (draft && draft.vacancies != null && draft.vacancies !== 10
          ? (draft.vacancies < 10 ? fmt.pad(draft.vacancies, 2) : String(draft.vacancies))
          : '02');
    var defaultPool = (!isEdit && draft && typeof draft.poolCount === 'number' && draft.poolCount !== 35)
      ? draft.poolCount
      : 10;
    var defaultStart = isEdit ? (existingCirc.applyStart || fmt.isoDate()) : (draft ? draft.applyStart : fmt.isoDate());
    var defaultEnd = isEdit ? (existingCirc.applyEnd || fmt.addDays(fmt.isoDate(), 30)) : (draft ? draft.applyEnd : fmt.addDays(fmt.isoDate(), 30));

    // Sanitize any previously saved draft referencing Officer (General)
    if (defaultPost === 'Officer (General)') defaultPost = '';
    if (defaultTitle && defaultTitle.indexOf('Officer (General)') !== -1) defaultTitle = '';

    // Initialize posts list (support multiple posts per circular)
    var posts = [];
    if (isEdit && existingCirc && Array.isArray(existingCirc.posts) && existingCirc.posts.length > 0) {
      posts = existingCirc.posts.map(function (p) {
        var v = p.vacancies != null ? parseInt(p.vacancies, 10) : 2;
        return {
          post: (p.post || p.name || '').trim(),
          vacancies: v < 10 ? fmt.pad(v, 2) : String(v)
        };
      });
    } else if (!isEdit && draft && Array.isArray(draft.posts) && draft.posts.length > 0) {
      posts = draft.posts.map(function (p) {
        var v = p.vacancies != null ? parseInt(p.vacancies, 10) : 2;
        return {
          post: (p.post || p.name || '').trim(),
          vacancies: v < 10 ? fmt.pad(v, 2) : String(v)
        };
      });
    } else {
      var initialPostName = defaultPost || '';
      var initialVacStr = defaultVac || '02';
      posts = [{ post: initialPostName, vacancies: initialVacStr }];
    }

    posts.forEach(function (p) {
      if (p.post === 'Officer (General)') p.post = '';
    });

    if (posts.length === 0) {
      posts = [{ post: '', vacancies: '02' }];
    }

    function buildPostsHtml() {
      return posts.map(function (item, idx) {
        var isOnly = posts.length === 1;
        var postLabel = posts.length > 1
          ? ('<span class="badge bg-light text-secondary border me-1">Post #' + (idx + 1) + '</span> Post <span class="text-danger">*</span>')
          : ('Post <span class="text-danger">*</span>');
        var vacLabel = 'Vacancies <span class="text-danger">*</span>';
        var isFirst = idx === 0;

        return '<div class="post-entry-row mb-2" data-post-index="' + idx + '">' +
          '<div class="row g-2 align-items-end">' +
          '<div class="col-md-7 col-12">' +
          '<label class="form-label">' + postLabel + '</label>' +
          '<input type="text" class="form-control f-post-input"' + (isFirst ? ' id="f-post"' : '') + ' value="' + fmt.esc(item.post) + '" placeholder="e.g. Senior Officer" data-field="post">' +
          '</div>' +
          '<div class="col-md-4 col-9">' +
          '<label class="form-label">' + vacLabel + '</label>' +
          '<input type="text" class="form-control f-vac-input"' + (isFirst ? ' id="f-vac"' : '') + ' value="' + fmt.esc(item.vacancies) + '" placeholder="02" inputmode="numeric" data-field="vacancies">' +
          '</div>' +
          '<div class="col-md-1 col-3">' +
          '<button type="button" class="btn btn-outline-danger btn-remove-post w-100" data-remove-index="' + idx + '" title="' + (isOnly ? 'At least one post is required' : 'Remove this post') + '"' + (isOnly ? ' disabled style="opacity: 0.35; cursor: not-allowed;"' : '') + '>' +
          '<i class="bi bi-trash3"></i>' +
          '</button>' +
          '</div>' +
          '</div>' +
          '</div>';
      }).join('');
    }

    function buildSelectedChipsHtml() {
      if (!selectedStages.length) {
        return '<div class="p-3 text-center text-muted fs-12 w-100 bg-white rounded-3 border border-dashed">' +
          '<i class="bi bi-info-circle text-primary me-1"></i>No Examination Stages selected. Click any stage below to add.' +
          '</div>';
      }
      var cardsHtml = selectedStages.map(function (key, idx) {
        var opt = STAGE_OPTIONS.find(function (x) { return x.key === key; }) || { key: key, label: key, icon: 'bi-check2', subtitle: 'Stage ' + (idx + 1) };
        var subText = (idx === 0 && selectedStages.length === 1) ? 'Single Stage Pipeline' : (opt.subtitle || ('Stage ' + (idx + 1)));
        return '<div class="seq-step-card" data-stage="' + key + '">' +
          '<div class="d-flex align-items-center gap-2">' +
          '<span class="seq-step-badge">' + (idx + 1) + '</span>' +
          '<div class="seq-icon-box"><i class="bi ' + (opt.icon || 'bi-check2') + '"></i></div>' +
          '<div class="seq-content">' +
          '<div class="seq-title">' + fmt.esc(opt.label) + '</div>' +
          '<div class="seq-subtitle">' + fmt.esc(subText) + '</div>' +
          '</div>' +
          '</div>' +
          '<button type="button" class="btn-remove-stage" data-remove-stage="' + key + '" title="Remove ' + fmt.esc(opt.label) + '">' +
          '<i class="bi bi-x-lg"></i>' +
          '</button>' +
          '</div>';
      }).join('<div class="seq-connector-wrap"><span class="seq-connector-line"></span><i class="bi bi-chevron-right seq-connector-arrow"></i><span class="seq-connector-line"></span></div>');

      if (selectedStages.length < STAGE_OPTIONS.length) {
        cardsHtml += '<div class="seq-add-more-hint" title="Add another stage from available stages below">' +
          '<i class="bi bi-plus-lg"></i>' +
          '<span>Add next stage</span>' +
          '</div>';
      }
      return cardsHtml;
    }

    function buildAvailableCardsHtml() {
      return STAGE_OPTIONS.map(function (opt) {
        var isSel = selectedStages.indexOf(opt.key) >= 0;
        var selIndex = isSel ? selectedStages.indexOf(opt.key) + 1 : null;
        return '<div class="col-6 col-md-3">' +
          '<div class="stage-select-card ' + (isSel ? 'is-selected' : '') + '" data-stage-toggle="' + opt.key + '" title="' + fmt.esc(opt.fullTitle || opt.label) + '">' +
          '<div class="stage-main-info">' +
          '<span class="stage-main-icon"><i class="bi ' + (opt.icon || 'bi-check2') + '"></i></span>' +
          '<span class="card-title">' + fmt.esc(opt.label) + '</span>' +
          '</div>' +
          '<div class="stage-action-indicator ' + (isSel ? 'is-selected' : 'is-add') + '">' +
          (isSel ? '<i class="bi bi-check2"></i> Stage ' + selIndex : '<i class="bi bi-plus"></i> Add') +
          '</div>' +
          '</div>' +
          '</div>';
      }).join('');
    }

    var html =
      '<div class="create-job-posting-container">' +
      ui.postingWizard(1, isEdit ? existingCirc.id : null) +

      '<!-- Section 1: Circular -->' +
      '<div class="card card-posting-section mb-4">' +
      '<div class="card-posting-head d-flex align-items-center justify-content-between">' +
      '<div class="d-flex align-items-center gap-2">' +
      '<i class="bi bi-file-earmark-text"></i>' +
      '<span>' + (isEdit ? 'Edit Circular Details' : 'Basic Circular Information') + '</span>' +
      '</div>' +
      (isEdit ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-12">Editing ' + fmt.esc(existingCirc.code) + '</span>' : '') +
      '</div>' +
      '<div class="card-posting-body">' +

      '<!-- First Group: Circular Information -->' +
      '<div class="posting-first-group mb-4">' +
      '<div class="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">' +
      '<span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-0.5 fs-11 fw-bold">1</span>' +
      '<span class="fw-bold text-dark fs-13">First Group: Circular Details</span>' +
      '</div>' +
      '<div class="row g-3">' +
      '<!-- 1. Circular title * (col-md-6) -->' +
      '<div class="col-md-6">' +
      '<label class="form-label" for="f-title">Circular title <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="f-title" value="' + fmt.esc(defaultTitle) + '" placeholder="e.g. Recruitment of Senior Officer - ' + y + '">' +
      '</div>' +
      '<!-- 2. Circular no. * (col-md-6) -->' +
      '<div class="col-md-6">' +
      '<label class="form-label" for="f-code">Circular no. <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="f-code" value="' + fmt.esc(defaultCode) + '" placeholder="e.g. HRD/REC/' + y + '/01">' +
      '</div>' +
      '<!-- 3. Application opens * (col-md-4) -->' +
      '<div class="col-md-4">' +
      '<label class="form-label" for="f-start">Application opens <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="f-start" value="' + defaultStart + '">' +
      '</div>' +
      '<!-- 4. Application closes * (col-md-4) -->' +
      '<div class="col-md-4">' +
      '<label class="form-label" for="f-end">Application closes <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="f-end" value="' + defaultEnd + '" min="' + defaultStart + '">' +
      '</div>' +
      '<!-- 5. Initial applicants (col-md-4) -->' +
      '<div class="col-md-4">' +
      '<label class="form-label" for="f-pool">Initial applicants</label>' +
      (!isEdit ? (
        '<select class="form-select" id="f-pool">' +
        '<option value="10"' + (defaultPool === 10 ? ' selected' : '') + '>Generate 10 test candidates</option>' +
        '<option value="15"' + (defaultPool === 15 ? ' selected' : '') + '>Generate 15 test candidates</option>' +
        '<option value="25"' + (defaultPool === 25 ? ' selected' : '') + '>Generate 25 test candidates</option>' +
        '<option value="35"' + (defaultPool === 35 ? ' selected' : '') + '>Generate 35 test candidates</option>' +
        '<option value="50"' + (defaultPool === 50 ? ' selected' : '') + '>Generate 50 test candidates</option>' +
        '<option value="0"' + (defaultPool === 0 ? ' selected' : '') + '>Start with 0 (await online applications / Excel)</option>' +
        '</select>'
      ) : (
        '<input type="text" class="form-control bg-light" id="f-pool-disabled" value="Initialized in active database" disabled readonly title="Applicant pool is fixed for this circular">'
      )) +
      '</div>' +
      '<div class="col-12 mt-2">' +
      '<div class="d-flex align-items-center gap-2 p-2 px-3 rounded-2 fs-12 bg-light text-muted border" id="date-window-summary">' +
      '<span id="date-window-text">Application Timeline: calculating...</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<!-- Second Group: Post & Vacancies -->' +
      '<div class="posts-group-section pt-2">' +
      '<div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">' +
      '<div class="d-flex align-items-center gap-2">' +
      '<span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-0.5 fs-11 fw-bold">2</span>' +
      '<span class="fw-bold text-dark fs-13">Second Group: Posts &amp; Vacancies</span>' +
      '</div>' +
      '<span class="badge bg-light text-secondary border px-2 py-1 fs-11" id="posts-summary-badge">1 Post</span>' +
      '</div>' +

      '<div id="posts-list-container" class="d-flex flex-column gap-2 mb-3">' +
      buildPostsHtml() +
      '</div>' +

      '<!-- Add more button under the group -->' +
      '<div>' +
      '<button type="button" class="btn btn-add-post" id="btn-add-post">' +
      '<i class="bi bi-plus-circle"></i>' +
      '<span>Add More Post</span>' +
      '</button>' +
      '</div>' +
      '</div>' +

      '</div>' +
      '</div>' +

      '<!-- Section 2: Examination Stages -->' +
      '<div class="card card-posting-section mb-4">' +
      '<div class="card-posting-head d-flex align-items-center justify-content-between flex-wrap gap-1">' +
      '<div class="d-flex align-items-center gap-2">' +
      '<i class="bi bi-diagram-2"></i>' +
      '<span>Examination Stages</span>' +
      '</div>' +
      '<span class="fs-12 fw-normal text-muted">Select multiple stages</span>' +
      '</div>' +
      '<div class="card-posting-body">' +
      '<!-- Selected stages sequence -->' +
      '<div class="selected-sequence-container mb-3">' +
      '<div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">' +
      '<div class="d-flex align-items-center gap-2">' +
      '<span class="fw-bold text-dark fs-13" style="letter-spacing: -0.01em;">Selected Examination Sequence</span>' +
      '<span class="badge sequence-badge-pill" id="selected-badge">' +
      '<span id="selected-count">' + selectedStages.length + '</span> / ' + STAGE_OPTIONS.length + ' Active' +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="stage-pipeline-track d-flex align-items-center flex-wrap gap-2" id="selected-chips-container">' +
      buildSelectedChipsHtml() +
      '</div>' +
      '</div>' +

      '<!-- Available stages cards -->' +
      '<div class="available-stages-section">' +
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<span class="text-muted fw-medium" style="font-size: 12px;">Available stages (click to add or remove):</span>' +
      '</div>' +
      '<div class="row g-2" id="stages-grid-container">' +
      buildAvailableCardsHtml() +
      '</div>' +
      '</div>' +

      '<div class="text-muted mt-3 d-flex align-items-center gap-1" style="font-size: 11.5px; line-height: 1.5;">' +
      '<i class="bi bi-info-circle text-secondary"></i> Selected stages define the applicant progression path through examination, scrutiny, and viva. At least one stage must be selected.' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<!-- Bottom Actions Row -->' +
      '<div class="circular-action-bar d-flex align-items-center justify-content-between flex-wrap gap-2">' +
      '<button type="button" class="btn btn-cancel-posting" id="btn-cancel">' +
      '<i class="bi bi-x-circle me-1"></i> Cancel' +
      '</button>' +
      '<div class="d-flex align-items-center gap-2">' +
      '<button type="button" class="btn btn-save-next" id="btn-save-next">' +
      'Save &amp; Continue <i class="bi bi-arrow-right ms-1"></i>' +
      '</button>' +
      '</div>' +
      '</div>' +

      '</div>';

    view.innerHTML = html;
    ui.bindPostingWizard(view);

    function syncPostsFromDom() {
      var rows = view.querySelectorAll('.post-entry-row');
      if (!rows || rows.length === 0) return;
      rows.forEach(function (row, idx) {
        if (idx < posts.length) {
          var pInput = row.querySelector('.f-post-input');
          var vInput = row.querySelector('.f-vac-input');
          if (pInput) posts[idx].post = pInput.value;
          if (vInput) posts[idx].vacancies = vInput.value;
        }
      });
    }

    function updatePostsSummary() {
      var badge = view.querySelector('#posts-summary-badge');
      if (!badge) return;
      var totalVac = 0;
      posts.forEach(function (p) {
        totalVac += parseInt(p.vacancies, 10) || 0;
      });
      var pText = posts.length === 1 ? '1 Post' : (posts.length + ' Posts');
      var vText = totalVac === 1 ? '1 Vacancy' : (totalVac + ' Vacancies');
      badge.textContent = pText + ' · ' + vText;
    }

    function bindPostRowEvents() {
      var container = view.querySelector('#posts-list-container');
      if (!container) return;

      container.querySelectorAll('.f-post-input').forEach(function (input) {
        input.addEventListener('input', function () {
          syncPostsFromDom();
        });
      });

      container.querySelectorAll('.f-vac-input').forEach(function (vacInput) {
        vacInput.addEventListener('input', function () {
          this.value = this.value.replace(/\D/g, '');
          syncPostsFromDom();
          updatePostsSummary();
        });
        vacInput.addEventListener('blur', function () {
          var num = parseInt(this.value, 10);
          if (!isNaN(num) && num > 0) {
            this.value = num < 10 ? fmt.pad(num, 2) : String(num);
          } else {
            this.value = '01';
          }
          syncPostsFromDom();
          updatePostsSummary();
        });
        vacInput.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            var num = (parseInt(this.value, 10) || 0) + 1;
            this.value = num < 10 ? fmt.pad(num, 2) : String(num);
            syncPostsFromDom();
            updatePostsSummary();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            var num = Math.max(1, (parseInt(this.value, 10) || 1) - 1);
            this.value = num < 10 ? fmt.pad(num, 2) : String(num);
            syncPostsFromDom();
            updatePostsSummary();
          }
        });
      });

      container.querySelectorAll('.btn-remove-post').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (posts.length <= 1) return;
          var idx = parseInt(btn.dataset.removeIndex, 10);
          syncPostsFromDom();
          posts.splice(idx, 1);
          renderPosts();
        });
      });
    }

    function renderPosts(focusIndex) {
      var container = view.querySelector('#posts-list-container');
      if (!container) return;
      container.innerHTML = buildPostsHtml();
      bindPostRowEvents();
      updatePostsSummary();

      if (typeof focusIndex === 'number') {
        var inputs = view.querySelectorAll('.f-post-input');
        if (inputs[focusIndex]) {
          inputs[focusIndex].focus();
        }
      }
    }

    bindPostRowEvents();
    updatePostsSummary();

    var addPostBtn = view.querySelector('#btn-add-post');
    if (addPostBtn) {
      addPostBtn.addEventListener('click', function () {
        syncPostsFromDom();
        posts.push({ post: '', vacancies: '01' });
        renderPosts(posts.length - 1);
      });
    }

    function updateStageViews() {
      var chipsWrap = view.querySelector('#selected-chips-container');
      var gridWrap = view.querySelector('#stages-grid-container');
      var countEl = view.querySelector('#selected-count');

      if (chipsWrap) chipsWrap.innerHTML = buildSelectedChipsHtml();
      if (gridWrap) gridWrap.innerHTML = buildAvailableCardsHtml();
      if (countEl) countEl.textContent = selectedStages.length;

      // Bind remove buttons on chips
      if (chipsWrap) {
        chipsWrap.querySelectorAll('[data-remove-stage]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var key = btn.dataset.removeStage;
            toggleStage(key);
          });
        });
      }

      // Bind add more hint button
      if (chipsWrap) {
        var addMoreBtn = chipsWrap.querySelector('.seq-add-more-hint');
        if (addMoreBtn) {
          addMoreBtn.addEventListener('click', function () {
            var availSec = view.querySelector('.available-stages-section');
            if (availSec) {
              availSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              var firstUnsel = availSec.querySelector('.stage-select-card:not(.is-selected)');
              if (firstUnsel) {
                firstUnsel.classList.add('pulse-highlight');
                setTimeout(function () { firstUnsel.classList.remove('pulse-highlight'); }, 850);
              }
            }
          });
        }
      }

      // Bind cards in grid
      if (gridWrap) {
        gridWrap.querySelectorAll('[data-stage-toggle]').forEach(function (card) {
          card.addEventListener('click', function () {
            var key = card.dataset.stageToggle;
            toggleStage(key);
          });
        });
      }
    }

    function toggleStage(key) {
      var pos = selectedStages.indexOf(key);
      if (pos >= 0) {
        selectedStages.splice(pos, 1);
      } else {
        selectedStages.push(key);
        // Keep chronological order: MCQ, WRITTEN, VIVA, etc.
        selectedStages.sort(function (a, b) {
          var ia = STAGE_OPTIONS.findIndex(function (x) { return x.key === a; });
          var ib = STAGE_OPTIONS.findIndex(function (x) { return x.key === b; });
          return ia - ib;
        });
      }
      updateStageViews();
    }

    updateStageViews();

    // Functional Application opens / closes handlers
    var startInput = view.querySelector('#f-start');
    var endInput = view.querySelector('#f-end');

    function parseDateInput(str) {
      if (!str) return fmt.isoDate();
      if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        var p = str.split('-');
        return p[2] + '-' + p[1] + '-' + p[0];
      }
      return str;
    }

    function updateDateWindowSummary() {
      var summaryEl = view.querySelector('#date-window-summary');
      var textEl = view.querySelector('#date-window-text');
      if (!startInput || !endInput || !textEl) return;

      var sVal = (startInput.value || '').trim();
      var eVal = (endInput.value || '').trim();

      if (!sVal || !eVal) {
        if (summaryEl) summaryEl.className = 'd-flex align-items-center gap-2 p-2 px-3 rounded-2 fs-12 bg-warning-subtle text-dark border border-warning-subtle';
        textEl.innerHTML = '<i class="bi bi-exclamation-circle text-warning me-1"></i>Please specify both application opening and closing dates.';
        return;
      }

      var dStart = new Date(sVal + 'T00:00:00');
      var dEnd = new Date(eVal + 'T00:00:00');

      if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
        if (summaryEl) summaryEl.className = 'd-flex align-items-center gap-2 p-2 px-3 rounded-2 fs-12 bg-warning-subtle text-dark border border-warning-subtle';
        textEl.textContent = 'Please enter valid dates.';
        return;
      }

      var diffDays = Math.round((dEnd.getTime() - dStart.getTime()) / 86400000);

      if (diffDays < 0) {
        if (summaryEl) summaryEl.className = 'd-flex align-items-center gap-2 p-2 px-3 rounded-2 fs-12 bg-danger-subtle text-danger border border-danger-subtle';
        textEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-danger me-1"></i><strong>Invalid dates:</strong> Closing date cannot be earlier than opening date.';
        return;
      }

      if (summaryEl) summaryEl.className = 'd-flex align-items-center gap-2 p-2 px-3 rounded-2 fs-12 bg-light text-muted border';
      var daysStr = diffDays === 0 ? 'Same day deadline' : (diffDays === 1 ? '1 day window' : diffDays + ' days');
      textEl.innerHTML = '<span class="fw-semibold text-dark"><i class="bi bi-calendar-check text-success me-1"></i>Application Timeline: ' + daysStr + '</span>' +
        ' <span class="mx-1">&bull;</span> ' + fmt.date(sVal) + ' to ' + fmt.date(eVal);
    }

    if (startInput) {
      startInput.addEventListener('change', function () {
        if (endInput) {
          endInput.min = startInput.value;
          if (endInput.value && endInput.value < startInput.value) {
            endInput.value = startInput.value;
          }
        }
        updateDateWindowSummary();
      });
      startInput.addEventListener('input', updateDateWindowSummary);
    }

    if (endInput) {
      endInput.addEventListener('change', updateDateWindowSummary);
      endInput.addEventListener('input', updateDateWindowSummary);
    }

    updateDateWindowSummary();

    var backBtn = view.querySelector('#btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        ERec.router.go('#/circulars');
      });
    }

    view.querySelector('#btn-cancel').addEventListener('click', function () {
      ERec.router.go('#/circulars');
    });

    view.querySelector('#btn-save-next').addEventListener('click', function () {
      var title = (view.querySelector('#f-title').value || '').trim();
      var code = (view.querySelector('#f-code').value || '').trim();
      var rawStart = (view.querySelector('#f-start').value || '').trim();
      var rawEnd = (view.querySelector('#f-end').value || '').trim();

      syncPostsFromDom();

      if (!title) { ui.toast('Please enter circular title', 'warning'); return; }
      if (!code) { ui.toast('Please enter circular no.', 'warning'); return; }
      if (!rawStart) { ui.toast('Please select application opening date', 'warning'); return; }
      if (!rawEnd) { ui.toast('Please select application closing date', 'warning'); return; }

      var start = parseDateInput(rawStart);
      var end = parseDateInput(rawEnd);

      if (end < start) {
        ui.toast('Application closing date cannot be earlier than opening date', 'warning');
        return;
      }

      if (!posts.length) {
        ui.toast('Please add at least one post', 'warning');
        return;
      }

      var emptyIdx = posts.findIndex(function (p) { return !p.post || !p.post.trim(); });
      if (emptyIdx >= 0) {
        ui.toast('Please enter post name for ' + (posts.length > 1 ? ('Post #' + (emptyIdx + 1)) : 'the post'), 'warning');
        var inputs = view.querySelectorAll('.f-post-input');
        if (inputs[emptyIdx]) inputs[emptyIdx].focus();
        return;
      }

      var invalidVacIdx = posts.findIndex(function (p) {
        var num = parseInt(p.vacancies, 10);
        return isNaN(num) || num <= 0;
      });
      if (invalidVacIdx >= 0) {
        ui.toast('Please enter a valid vacancy count for ' + (posts.length > 1 ? ('Post #' + (invalidVacIdx + 1)) : 'the post'), 'warning');
        var vacInputs = view.querySelectorAll('.f-vac-input');
        if (vacInputs[invalidVacIdx]) vacInputs[invalidVacIdx].focus();
        return;
      }

      if (!selectedStages.length) {
        ui.toast('Please select at least one examination stage (MCQ, Written, or Viva voce)', 'warning');
        return;
      }

      var totalVac = 0;
      var formattedPosts = posts.map(function (p, idx) {
        var v = parseInt(p.vacancies, 10) || 1;
        totalVac += v;
        return {
          id: p.id || ('post-' + (idx + 1)),
          post: p.post.trim(),
          name: p.post.trim(),
          vacancies: v
        };
      });

      var combinedPost = formattedPosts.map(function (p) { return p.post; }).join(', ');
      var primaryPost = formattedPosts[0].post;

      if (isEdit) {
        store.update('circulars', existingCirc.id, {
          title: title,
          code: code,
          post: combinedPost,
          posts: formattedPosts,
          navTitle: title,
          vacancies: totalVac,
          applyStart: start,
          applyEnd: end,
          applyEndTime: ''
        });

        var curStages = store.stagesOf(existingCirc.id);
        selectedStages.forEach(function (type, i) {
          var existingStg = curStages.find(function (s) { return s.type === type; });
          if (existingStg) {
            store.update('stages', existingStg.id, { seq: i + 1 });
          } else {
            var opt = STAGE_OPTIONS.find(function (x) { return x.key === type; });
            var stageTitle = opt ? opt.label : pipe.typeLabel(type);
            store.insert('stages', {
              id: existingCirc.id + '-S' + (i + 1),
              circularId: existingCirc.id,
              type: type,
              seq: i + 1,
              name: (type === 'VIVA' ? 'Viva voce' : stageTitle) + ' Examination',
              requireApplicantApproval: true,
              requireVenueApproval: (i === 0 && selectedStages.length > 1),
              applicantApprovers: [],
              venueApprovers: [],
              instructions: ERec.seed.DEFAULT_INSTRUCTIONS[type] || '',
              examDate: null,
              fullMarks: type === 'VIVA' ? 50 : 100,
              passMarks: type === 'VIVA' ? 25 : 50,
              status: 'NOT_STARTED',
              steps: {}
            });
          }
        });

        store.audit('EDIT_CIRCULAR', 'circular', existingCirc.id, 'Updated basic information for ' + combinedPost + ' (' + code + ')');
        ERec.app.renderNav();
        ERec.router.go('#/circulars/new-eligibility/' + existingCirc.id);
        return;
      }

      var poolEl = view.querySelector('#f-pool');
      var poolCount = poolEl ? parseInt(poolEl.value, 10) : 10;

      var draftData = {
        id: 'draft',
        isDraft: true,
        code: code,
        title: title,
        post: combinedPost,
        posts: formattedPosts,
        navTitle: title,
        vacancies: totalVac,
        poolCount: poolCount,
        applyStart: start,
        applyEnd: end,
        applyEndTime: '',
        eligibilityRules: (draft && draft.eligibilityRules) || [],
        stages: selectedStages.map(function (type, i) {
          var opt = STAGE_OPTIONS.find(function (x) { return x.key === type; });
          var stageTitle = opt ? opt.label : pipe.typeLabel(type);
          return {
            id: 'draft-S' + (i + 1),
            circularId: 'draft',
            type: type,
            seq: i + 1,
            name: (type === 'VIVA' ? 'Viva voce' : stageTitle) + ' Examination',
            requireApplicantApproval: true,
            requireVenueApproval: (i === 0 && selectedStages.length > 1),
            applicantApprovers: [],
            venueApprovers: [],
            instructions: ERec.seed.DEFAULT_INSTRUCTIONS[type] || '',
            examDate: null,
            fullMarks: type === 'VIVA' ? 50 : 100,
            passMarks: type === 'VIVA' ? 25 : 50,
            status: 'DRAFT',
            steps: {}
          };
        }),
        status: 'DRAFT',
        steps: {}
      };

      store.saveDraftCircular(draftData);
      ERec.router.go('#/circulars/new-eligibility/draft');
    });
  }

  ERec.pages.newcircularBasicInfo = { render: render };
  ERec.pages.createcircularBasic = ERec.pages.newcircularBasicInfo;
})(window);
