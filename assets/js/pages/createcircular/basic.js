/* Create Job Posting - Basic Information page.
   Matches the design from the uploaded PDF specifications. */
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
      { label: isEdit ? ('Edit ' + existingCirc.post) : 'Create Job Posting' }
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

    function buildSelectedChipsHtml() {
      if (!selectedStages.length) {
        return '<div class="p-3 text-center text-muted fs-12 w-100 bg-white rounded-3 border border-dashed">' +
          '<i class="bi bi-info-circle text-primary me-1"></i>No Examination Stages selected. Click any stage below to add.' +
          '</div>';
      }
      var cardsHtml = selectedStages.map(function (key, idx) {
        var opt = STAGE_OPTIONS.find(function (x) { return x.key === key; }) || { key: key, label: key, icon: 'bi-check2', subtitle: 'Stage ' + (idx + 1) };
        var canRemove = true;
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
      '<div class="row g-3">' +
      '<div class="col-md-6">' +
      '<label class="form-label">Circular title <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="f-title" value="' + fmt.esc(defaultTitle) + '" placeholder="e.g. Recruitment of Senior Officer - ' + y + '">' +
      '</div>' +
      '<div class="col-md-6">' +
      '<label class="form-label">Circular no. <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="f-code" value="' + fmt.esc(defaultCode) + '" placeholder="e.g. HRD/REC/' + y + '/01">' +
      '</div>' +
      '<div class="col-md-6">' +
      '<label class="form-label">Post <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="f-post" value="' + fmt.esc(defaultPost) + '" placeholder="e.g. Senior Officer">' +
      '</div>' +
      '<div class="col-md-3">' +
      '<label class="form-label">Vacancies <span class="text-danger">*</span></label>' +
      '<input type="text" class="form-control" id="f-vac" value="' + defaultVac + '" placeholder="02" inputmode="numeric">' +
      '</div>' +
      (!isEdit ? ('<div class="col-md-3">' +
        '<label class="form-label">Initial applicants</label>' +
        '<select class="form-select" id="f-pool">' +
        '<option value="10"' + (defaultPool === 10 ? ' selected' : '') + '>Generate 10 test candidates</option>' +
        '<option value="15"' + (defaultPool === 15 ? ' selected' : '') + '>Generate 15 test candidates</option>' +
        '<option value="25"' + (defaultPool === 25 ? ' selected' : '') + '>Generate 25 test candidates</option>' +
        '<option value="35"' + (defaultPool === 35 ? ' selected' : '') + '>Generate 35 test candidates</option>' +
        '<option value="50"' + (defaultPool === 50 ? ' selected' : '') + '>Generate 50 test candidates</option>' +
        '<option value="0"' + (defaultPool === 0 ? ' selected' : '') + '>Start with 0 (await online applications / Excel)</option>' +
        '</select>' +
        '</div>') : '') +
      '<div class="col-md-6">' +
      '<label class="form-label" for="f-start">Application opens <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="f-start" value="' + defaultStart + '">' +
      '</div>' +
      '<div class="col-md-6">' +
      '<label class="form-label" for="f-end">Application closes <span class="text-danger">*</span></label>' +
      '<input type="date" class="form-control" id="f-end" value="' + defaultEnd + '" min="' + defaultStart + '">' +
      '</div>' +
      '<div class="col-12 mt-2">' +
      '<div class="d-flex align-items-center gap-2 p-2 px-3 rounded-2 fs-12 bg-light text-muted border" id="date-window-summary">' +
      '<span id="date-window-text">Application Timeline: calculating...</span>' +
      '</div>' +
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

    // Vacancies input 2-digit padding & numeric keyboard controls
    var vacInput = view.querySelector('#f-vac');
    if (vacInput) {
      vacInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
      });
      vacInput.addEventListener('blur', function () {
        var num = parseInt(this.value, 10);
        if (!isNaN(num) && num > 0) {
          this.value = num < 10 ? fmt.pad(num, 2) : String(num);
        } else {
          this.value = '02';
        }
      });
      vacInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          var num = (parseInt(this.value, 10) || 0) + 1;
          this.value = num < 10 ? fmt.pad(num, 2) : String(num);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          var num = Math.max(1, (parseInt(this.value, 10) || 1) - 1);
          this.value = num < 10 ? fmt.pad(num, 2) : String(num);
        }
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
      var post = (view.querySelector('#f-post').value || '').trim();
      var vac = parseInt(view.querySelector('#f-vac').value, 10) || 2;
      var rawStart = (view.querySelector('#f-start').value || '').trim();
      var rawEnd = (view.querySelector('#f-end').value || '').trim();

      if (!title) { ui.toast('Please enter circular title', 'warning'); return; }
      if (!code) { ui.toast('Please enter circular no.', 'warning'); return; }
      if (!post) { ui.toast('Please enter post name', 'warning'); return; }
      if (!rawStart) { ui.toast('Please select application opening date', 'warning'); return; }
      if (!rawEnd) { ui.toast('Please select application closing date', 'warning'); return; }

      var start = parseDateInput(rawStart);
      var end = parseDateInput(rawEnd);

      if (end < start) {
        ui.toast('Application closing date cannot be earlier than opening date', 'warning');
        return;
      }
      if (!selectedStages.length) {
        ui.toast('Please select at least one examination stage (MCQ, Written, or Viva voce)', 'warning');
        return;
      }

      if (isEdit) {
        store.update('circulars', existingCirc.id, {
          title: title,
          code: code,
          post: post,
          navTitle: post,
          vacancies: vac,
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

        store.audit('EDIT_CIRCULAR', 'circular', existingCirc.id, 'Updated basic information for ' + post + ' (' + code + ')');
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
        post: post,
        navTitle: post,
        vacancies: vac,
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
