/* Circular list + create. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var DEMO_APPLICANTS = 40;   // generated behind the scenes so a new circular is walkable

  function newCircularForm() {
    if (store.clearDraftCircular) {
      store.clearDraftCircular();
    }
    if (ERec.app && ERec.app.addCreateCircularSubmenu) {
      ERec.app.addCreateCircularSubmenu();
    }
    ERec.router.go('#/circulars/new');
  }

  /* Metric tile for the row of summary cards above the circular table. */
  function statCard(opts) {
    return '<div class="col-12 col-sm-6 col-xl-3">' +
      '<div class="stat-card-modern shadow-sm h-100" style="background-color: ' + opts.bg + ';">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small">' + fmt.esc(opts.label) + '</span>' +
      '<h3 class="fw-bold mb-0 mt-1" style="color: ' + opts.valueColor + ';">' + opts.value + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-white shadow-sm ' + (opts.iconClass || '') + '"' +
      (opts.iconColor ? ' style="color:' + opts.iconColor + ';"' : '') + '>' +
      '<i class="bi ' + opts.icon + '"></i>' +
      '</div>' +
      '</div>' +
      '<div class="mt-3 pt-2 border-top border-light d-flex align-items-center justify-content-between">' +
      '<span class="small text-muted">' + fmt.esc(opts.foot) + '</span>' +
      '<span class="badge ' + opts.badgeClass + ' fw-semibold">' + fmt.esc(opts.badge) + '</span>' +
      '</div>' +
      '</div></div>';
  }

  function isCircularComplete(c) {
    if (!c) return false;
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

  function render(view) {
    ERec.router.setCrumbs([{ label: 'Job Circulars' }]);
    var rawList = store.all('circulars');
    var list = rawList.slice().sort(function (a, b) {
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
    var minePending = store.pendingApprovalsFor(me.id).length;

    function activeStageUrl(c) {
      if (!c) return '#/circulars';
      var active = pipe.activeStage(c.id);
      if (active) {
        var cur = pipe.currentStep(active);
        if (cur && cur.route) {
          return cur.route;
        }
        return '#/circular/' + c.id + '/stage/' + active.id;
      }
      return '#/circular/' + c.id;
    }

    var rows = list.map(function (c) {
      var n = store.applicantsOf(c.id).length;
      var rules = c.eligibilityRules || [];
      var stageUrl = activeStageUrl(c);
      var isCompleted = isCircularComplete(c);
      var statusBadge = isCompleted
        ? '<span class="badge-completed"><i class="bi bi-check-circle-fill me-1"></i>Completed</span>'
        : '<span class="badge-active">Active</span>';

      return '<tr>' +
        '<td>' +
        '<a href="' + stageUrl + '" class="table-circular-stage-link" title="Proceed to active stage of ' + fmt.esc(c.post) + '">' +
        '<div class="table-post-title text-success">' + fmt.esc(c.post) + '</div>' +
        '<div class="table-ref-code text-success">' + fmt.esc(c.code) + '</div>' +
        '</a>' +
        '</td>' +
        '<td>' + (rules.length
          ? '<div class="table-rule-count">' + fmt.plural(rules.length, 'rule') + '</div>' +
          '<div class="table-rule-desc text-truncate" title="' + fmt.esc(rules.map(function (r) { return ERec.seed.ruleTypeLabel(r.type); }).join(', ')) + '">' +
          fmt.esc(rules.map(function (r) { return ERec.seed.ruleTypeLabel(r.type); }).join(', ')) + '</div>'
          : '<span class="text-muted fs-12">No rules set</span>') + '</td>' +
        '<td class="text-center"><span class="table-vacancies">' + c.vacancies + '</span></td>' +
        '<td class="text-center"><span class="table-applied">' + n + '</span></td>' +
        '<td class="nowrap" data-order="' + fmt.esc(c.applyEnd || '') + '">' +
        '<div class="table-close-date">' + fmt.date(c.applyEnd) + '</div>' +
        '</td>' +
        '<td class="nowrap table-pipeline-stages">' + fmt.esc(pipe.chainLabel(c.id)) + '</td>' +
        '<td class="text-center">' + statusBadge + '</td>' +
        '<td class="text-center">' +
        '<div class="table-actions-cell">' +
        '<a class="btn-table-action" href="#/circulars/new-preview/' + c.id + '" title="View Circular"><i class="bi bi-eye"></i></a>' +
        '<a class="btn-table-action" href="#/circulars/new/' + c.id + '" title="Edit Circular"><i class="bi bi-pencil-square"></i></a>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }).join('');

    var emptyHtml =
      '<div class="p-5 text-center">' +
      '<div class="avatar xl mx-auto mb-3 bg-light text-success border">' +
      '<i class="bi bi-megaphone fs-2"></i>' +
      '</div>' +
      '<h5 class="fw-bold text-dark mb-1">No Active Job Circulars</h5>' +
      '<p class="text-muted fs-13 mb-4 mx-auto" style="max-width: 480px;">' +
      'There are currently no job circulars in the recruitment portal.' +
      '</p>' +
      '<div class="d-flex align-items-center justify-content-center gap-2 flex-wrap">' +
      '<button class="btn btn-green-solid shadow-sm px-3" id="btn-empty-new">' +
      '<i class="bi bi-plus-lg me-1"></i> Create Job Circular' +
      '</button>' +
      '</div>' +
      '</div>';

    var html = ui.pageHead({
      title: 'All Job Circulars',
      sub: 'Pubali Bank PLC &middot; Oversee job circulars and recruitment Stages.',
      actions: '<button class="btn btn-sm btn-green-solid btn-icon shadow-sm" id="btn-new">' +
        '<i class="bi bi-plus-lg"></i> Create Circular</button>'
    });

    html += ui.card({
      tight: true,
      body: list.length ? '<div class="table-responsive"><table class="table table-circulars align-middle mb-0" id="table-circulars"><thead><tr>' +
        '<th>POST / REFERENCE NO.</th>' +
        '<th>ELIGIBILITY</th>' +
        '<th class="text-center">No. of Post</th>' +
        '<th class="text-center">APPLIED</th>' +
        '<th>Last Date</th>' +
        '<th>Examination Stages</th>' +
        '<th class="text-center">STATUS</th>' +
        '<th class="text-center" data-orderable="false">ACTION</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : emptyHtml
    });

    view.innerHTML = html;

    if (list.length) {
      ui.dataTable(view.querySelector('#table-circulars'), {
        pageLength: 10,
        order: []
      });
    }

    var newBtn = view.querySelector('#btn-new');
    if (newBtn) newBtn.addEventListener('click', newCircularForm);

    var emptyNewBtn = view.querySelector('#btn-empty-new');
    if (emptyNewBtn) emptyNewBtn.addEventListener('click', newCircularForm);

  }

  ERec.pages.circulars = { render: render, newCircularForm: newCircularForm };
  ERec.pages.jobcirculars = ERec.pages.circulars;
})(window);
