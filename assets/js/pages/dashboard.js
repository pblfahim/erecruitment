/* Dashboard - one compact card per circular.
   No cross-circular totals on purpose: "105 applicants" across three
   unrelated recruitments tells an HR officer nothing they can act on.
   Every figure on a card belongs to that circular and its stages. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  function isCircularComplete(c) {
    if (c.status === 'CLOSED' || c.status === 'COMPLETED' || c.status === 'ARCHIVED') return true;
    var stages = store.stagesOf(c.id);
    if (!stages.length) return false;
    var allStagesDone = stages.every(function (s) {
      var p = pipe.progress(s);
      return p.total > 0 && p.done >= p.total && !p.pending;
    });
    if (!allStagesDone) return false;
    var lastStage = stages[stages.length - 1];
    var ctx = pipe.context(lastStage);
    if (ctx.isLast) {
      var jStep = pipe.step(lastStage, 'joining');
      if (jStep && !jStep.done) return false;
    }
    return true;
  }

  function circularCard(c) {
    var stages = store.stagesOf(c.id);
    var applicants = store.applicantsOf(c.id);
    var isCompleted = isCircularComplete(c);
    var active = !isCompleted ? pipe.activeStage(c.id) : null;
    var cur = active ? pipe.currentStep(active) : null;

    var activeStageIndex = active ? stages.findIndex(function (x) { return x.id === active.id; }) : -1;

    // Check if any stage in the circular has been started
    var anyStageStarted = stages.some(function (st) {
      var r = store.rosterOf(st.id);
      var prog = pipe.progress(st);
      return st.status === 'COMPLETED' ||
        st.status === 'IN_PROGRESS' ||
        st.status === 'RUNNING' ||
        r.length > 0 ||
        prog.done > 0 ||
        (st.steps && Object.keys(st.steps).length > 0) ||
        (st.status && st.status !== 'NOT_STARTED');
    });

    var chips = stages.map(function (s, idx) {
      var p = pipe.progress(s);
      var roster = store.rosterOf(s.id);

      // Check if this specific stage has started
      var stageStarted = (s.status === 'IN_PROGRESS' || s.status === 'RUNNING') ||
        roster.length > 0 ||
        p.done > 0 ||
        (s.steps && Object.keys(s.steps).length > 0) ||
        (s.status && s.status !== 'NOT_STARTED');

      // 1. Completed phase: circular completed, or stage status COMPLETED, or prior stage in active pipeline, or all mandatory steps done without pending items
      var isDone = isCompleted ||
        s.status === 'COMPLETED' ||
        (activeStageIndex > -1 && idx < activeStageIndex) ||
        (p.total > 0 && p.done >= p.total && !p.pending);

      // 2. Running phase: active stage that is currently in progress / running (and not completed)
      var isCur = !isDone && !isCompleted && active && (s.id === active.id) && (stageStarted || (anyStageStarted && idx === activeStageIndex));

      // 3. Not started yet: upcoming phase
      var cls = isDone ? 'done' : (isCur ? 'cur' : 'upcoming');

      var countBadge = (isDone || isCur) && roster.length
        ? '<span class="phase-chip-count">' + roster.length + '</span>'
        : '';

      return '<a href="#/circular/' + c.id + '/stage/' + s.id + '/search" class="phase-chip ' + cls + ' text-decoration-none" title="' +
        fmt.esc(pipe.typeLabel(s.type) + ' · ' +
          (roster.length ? fmt.plural(roster.length, 'candidate') : 'no candidates yet')) + '">' +
        (isDone ? '<i class="bi bi-check-circle-fill"></i>' : '') +
        fmt.esc(pipe.typeLabel(s.type)) +
        countBadge +
        '</a>';
    }).join('<i class="bi bi-chevron-right phase-arrow"></i>');

    var stageApplicantUrl = active
      ? ('#/circular/' + c.id + '/stage/' + active.id + '/search')
      : (stages.length ? ('#/circular/' + c.id + '/stage/' + stages[0].id + '/search') : ('#/circular/' + c.id));
    var cardTitleUrl = cur ? cur.route : stageApplicantUrl;

    var nextBoxHtml = '';
    if (isCompleted) {
      var joinedCount = store.where('applicants', function (a) {
        return a.circularId === c.id && (a.status === 'JOINED' || !!store.joiningFor(a.id));
      }).length;
      var selectedCount = store.where('applicants', function (a) {
        return a.circularId === c.id && (a.status === 'SELECTED' || a.status === 'JOINED');
      }).length;

      var summarySub = '';
      if (joinedCount > 0) {
        summarySub = fmt.plural(joinedCount, 'candidate') + ' joined · ' +
          (c.vacancies || 0) + ' ' + (c.vacancies === 1 ? 'vacancy' : 'vacancies');
      } else if (selectedCount > 0) {
        summarySub = fmt.plural(selectedCount, 'candidate') + ' selected · All stages finalized';
      } else {
        summarySub = stages.length
          ? 'All ' + fmt.plural(stages.length, 'recruitment stage') + ' completed'
          : 'Recruitment process concluded';
      }

      nextBoxHtml =
        '<div class="next-stage-box completed">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-check-circle-fill next-stage-icon"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-truncate">Recruitment Completed</div>' +
        '<div class="next-stage-sub text-truncate">' + fmt.esc(summarySub) + '</div>' +
        '</div>' +
        '</div>' +
        '<a class="btn-proceed btn-completed" href="#/circular/' + c.id + '">' +
        '<i class="bi bi-eye"></i> View Summary' +
        '</a>' +
        '</div>';
    } else if (cur) {
      nextBoxHtml =
        '<div class="next-stage-box">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-sliders2 next-stage-icon"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-truncate">Next Stage: ' + fmt.esc(cur.label) + '</div>' +
        '<div class="next-stage-sub text-truncate">' + fmt.esc(pipe.stageName(active)) + '</div>' +
        '</div>' +
        '</div>' +
        '<a class="btn-proceed" href="' + cur.route + '">' +
        '<i class="bi bi-play-circle-fill"></i> Proceed' +
        '</a>' +
        '</div>';
    } else {
      nextBoxHtml =
        '<div class="next-stage-box bg-light border-0">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-gear text-secondary fs-5"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-dark">Setup Stages</div>' +
        '<div class="next-stage-sub text-muted">No Examination Stages configured yet</div>' +
        '</div>' +
        '</div>' +
        '<a class="btn btn-sm btn-outline-secondary px-3" href="#/circular/' + c.id + '">' +
        '<i class="bi bi-gear"></i> Setup' +
        '</a>' +
        '</div>';
    }

    var statusBadge = isCompleted
      ? '<span class="badge-completed"><i class="bi bi-check-circle-fill me-1"></i>Completed</span>'
      : '<span class="badge-active">Active</span>';

    return '<div class="col-xl-4 col-md-6">' +
      '<div class="circ-card' + (isCompleted ? ' circ-card-completed' : '') + '">' +
      '<div class="d-flex align-items-start justify-content-between gap-2">' +
      '<a href="' + cardTitleUrl + '" class="circ-card-title text-truncate text-decoration-none" title="' + fmt.esc(c.post) + '">' + fmt.esc(c.post) + '</a>' +
      statusBadge +
      '</div>' +
      '<div class="circ-code">' + fmt.esc(c.code) + '</div>' +
      '<div class="circ-stats-bar">' +
      '<span class="stat-item"><i class="bi bi-people-fill text-success"></i><strong>' + applicants.length + '</strong> applied</span>' +
      '<span class="stat-item"><i class="bi bi-briefcase text-primary"></i><strong>' + (c.vacancies < 10 ? '0' + c.vacancies : c.vacancies) + '</strong> posts</span>' +
      '<span class="stat-item"><i class="bi bi-calendar-event text-danger"></i>Last date: <strong>' + fmt.date(c.applyEnd) + '</strong></span>' +
      '</div>' +
      '<div class="circ-divider"></div>' +
      '<div class="circ-phase-section">' +
      '<div class="circ-phase-label">Examination Stages</div>' +
      '<div class="circ-phase-chain">' + chips + '</div>' +
      '</div>' +
      nextBoxHtml +
      '</div>' +
      '</div>';
  }

  function render(view) {
    ERec.router.setCrumbs([{ label: 'Dashboard' }]);

    var rawList = store.all('circulars');
    var circulars = rawList.slice().sort(function (a, b) {
      var compA = isCircularComplete(a) ? 1 : 0;
      var compB = isCircularComplete(b) ? 1 : 0;
      if (compA !== compB) return compA - compB;

      // Recent job circular first
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (a.createdAt && !b.createdAt) return -1;
      if (!a.createdAt && b.createdAt) return 1;

      var startA = a.applyStart || '';
      var startB = b.applyStart || '';
      if (startA !== startB) return startB.localeCompare(startA);

      var codeA = a.code || '';
      var codeB = b.code || '';
      if (codeA !== codeB) return codeB.localeCompare(codeA);

      var idxA = rawList.findIndex(function (x) { return x.id === a.id; });
      var idxB = rawList.findIndex(function (x) { return x.id === b.id; });
      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxB - idxA;

      var endA = a.applyEnd || '';
      var endB = b.applyEnd || '';
      if (endA !== endB) return endB.localeCompare(endA);

      return String(b.id || '').localeCompare(String(a.id || ''));
    });
    var me = store.actingUser();
    var activeCirculars = circulars.filter(function (c) { return !isCircularComplete(c); });
    var completedCirculars = circulars.length - activeCirculars.length;

    var html = '<div class="dashboard-page-wrap">' +
      '<div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-4">' +
      '<div>' +
      '<h4 class="fw-bold text-dark mb-1" style="font-size: 1.35rem; letter-spacing: -0.01em;">Human Resources Division Dashboard</h4>' +
      '<div class="text-muted" style="font-size: 12.5px;">Pubali Bank PLC &middot; Acting as ' + fmt.esc(me.name) + ' (' + fmt.esc(me.designation) + ')</div>' +
      '</div>' +
      '<button class="btn btn-sm btn-green-solid btn-icon shadow-sm" id="btn-new">' +
      '<i class="bi bi-plus-lg"></i> Create Circular</button>' +
      '</div>';

    html += '<div class="d-flex align-items-center justify-content-between mb-3">' +
      '<h5 class="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style="font-size: 20px;">' +
      '<i class="bi bi-briefcase-fill theme-green" style="color: var(--primary-green);"></i> Active Job Circulars' +
      '</h5>' +
      '<span class="text-secondary" style="font-size: 12px; font-weight: 500;">' +
      (completedCirculars > 0
        ? activeCirculars.length + ' Active &middot; ' + completedCirculars + ' Completed'
        : circulars.length + ' Positions Active') +
      '</span>' +
      '</div>';

    var emptyDashboardHtml =
      '<div class="card p-4 p-md-5 text-center mb-4 border-0 shadow-sm rounded-3 bg-white">' +
      '<div class="avatar xl mx-auto mb-3 bg-success-subtle text-success border border-success-subtle">' +
      '<i class="bi bi-briefcase fs-1"></i>' +
      '</div>' +
      '<h4 class="fw-bold text-dark mb-2">No Active Job Circulars in Pipeline</h4>' +
      '<p class="text-muted fs-13 mb-4 mx-auto" style="max-width: 540px; line-height: 1.6;">' +
      'The Pubali Bank HRD e-Recruitment system is active and ready for official recruitment notices.' +
      '</p>' +
      '<div class="d-flex align-items-center justify-content-center gap-2 flex-wrap">' +
      '<button class="btn btn-green-solid shadow-sm px-4 py-2" id="btn-empty-new">' +
      '<i class="bi bi-plus-lg me-1"></i> Create Job Circular' +
      '</button>' +
      '</div>' +
      '</div>';

    html += circulars.length
      ? '<div class="row g-3 mb-4">' + circulars.map(circularCard).join('') + '</div>'
      : emptyDashboardHtml;

    view.innerHTML = html;

    var newBtn = view.querySelector('#btn-new');
    if (newBtn) {
      newBtn.addEventListener('click', function () {
        if (store.clearDraftCircular) {
          store.clearDraftCircular();
        }
        if (ERec.app && ERec.app.addCreateCircularSubmenu) {
          ERec.app.addCreateCircularSubmenu();
        }
        ERec.router.go('#/circulars/new');
      });
    }

    var emptyNewBtn = view.querySelector('#btn-empty-new');
    if (emptyNewBtn) {
      emptyNewBtn.addEventListener('click', function () {
        if (store.clearDraftCircular) {
          store.clearDraftCircular();
        }
        if (ERec.app && ERec.app.addCreateCircularSubmenu) {
          ERec.app.addCreateCircularSubmenu();
        }
        ERec.router.go('#/circulars/new');
      });
    }

  }

  ERec.pages.dashboard = { render: render };
})(window);
