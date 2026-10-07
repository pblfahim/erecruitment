/* Pending Approval Portal - Executive Approval Center.
   Pubali Bank PLC E-Recruitment HRD Admin Portal.
   Supports multi-tier approval chains, candidate rosters & venue plan sign-offs,
   instant live search, multi-stage filtering, and interactive persona switching. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  // Local state for persistence within view session
  var pageState = {
    tab: 'all',          // 'all' | 'pending' | 'mine' | 'approved' | 'rejected'
    search: '',
    kind: 'ALL',         // 'ALL' | 'APPLICANT' | 'VENUE'
    circularId: 'ALL',
    viewMode: 'table'    // 'cards' | 'table'
  };

  /* Helper to compute active approval statistics */
  function computeStats(allApprovals, me) {
    var mine = [];
    var others = [];
    var approved = [];
    var rejected = [];

    allApprovals.forEach(function (ap) {
      if (ap.status === 'PENDING') {
        var curLevel = ap.chain && ap.chain[ap.currentSeq];
        if (curLevel && curLevel.userId === me.id) {
          mine.push(ap);
        } else {
          others.push(ap);
        }
      } else if (ap.status === 'APPROVED') {
        approved.push(ap);
      } else if (ap.status === 'REJECTED') {
        rejected.push(ap);
      }
    });

    return {
      all: allApprovals,
      mine: mine,
      others: others,
      approved: approved,
      rejected: rejected
    };
  }

  /* Filter approvals based on current state */
  function filterApprovals(allApprovals, me, state) {
    var q = (state.search || '').trim().toLowerCase();

    return allApprovals.filter(function (ap) {
      var stg = store.stage(ap.stageId);
      var c = store.circular(ap.circularId);
      var curLevel = ap.chain && ap.chain[ap.currentSeq];
      var isMyTurn = (ap.status === 'PENDING' && curLevel && curLevel.userId === me.id);

      // 1. Tab filter
      if (state.tab === 'mine' && !isMyTurn) return false;
      if (state.tab === 'others' && (ap.status !== 'PENDING' || isMyTurn)) return false;
      if (state.tab === 'pending' && ap.status !== 'PENDING') return false;
      if (state.tab === 'approved' && ap.status !== 'APPROVED') return false;
      if (state.tab === 'rejected' && ap.status !== 'REJECTED') return false;

      // 2. Kind filter
      if (state.kind !== 'ALL' && ap.kind !== state.kind) return false;

      // 3. Circular filter
      if (state.circularId !== 'ALL' && ap.circularId !== state.circularId) return false;

      // 4. Search query
      if (q) {
        var postName = c ? c.post.toLowerCase() : '';
        var postCode = c ? c.code.toLowerCase() : '';
        var stgName = stg ? pipe.stageName(stg).toLowerCase() : '';
        var createdBy = (ap.createdBy || '').toLowerCase();
        var approverNames = (ap.chain || []).map(function (l) { return (l.name || '').toLowerCase(); }).join(' ');
        var summary = (ap.summary || '').toLowerCase();

        var match = postName.indexOf(q) >= 0 ||
          postCode.indexOf(q) >= 0 ||
          stgName.indexOf(q) >= 0 ||
          createdBy.indexOf(q) >= 0 ||
          approverNames.indexOf(q) >= 0 ||
          summary.indexOf(q) >= 0;
        if (!match) return false;
      }

      return true;
    });
  }

  /* Render modern elevated request card following dashboard circ-card UI design */
  function renderRequestCard(ap, me) {
    var stg = store.stage(ap.stageId);
    var c = store.circular(ap.circularId);
    if (!stg || !c) return '';

    var curLevel = ap.chain && ap.chain[ap.currentSeq];
    var isMyTurn = (ap.status === 'PENDING' && curLevel && curLevel.userId === me.id);
    var isApproved = (ap.status === 'APPROVED');
    var isRejected = (ap.status === 'REJECTED');

    var roster = store.rosterOf(stg.id);
    var venues = store.venuesOf(stg.id);
    var stages = store.stagesOf(c.id);

    // Status Badge matching dashboard design
    var statusBadgeHtml = '';
    if (isMyTurn) {
      statusBadgeHtml = '<span class="badge bg-warning text-dark border border-warning px-2.5 py-1 rounded-pill fs-12 fw-bold pa-pulse-glow">' +
        '<i class="bi bi-exclamation-triangle-fill me-1"></i>Action Required</span>';
    } else if (ap.status === 'PENDING') {
      statusBadgeHtml = '<span class="badge-active"><i class="bi bi-hourglass-split me-1"></i>Pending L' + (ap.currentSeq + 1) + '</span>';
    } else if (isApproved) {
      statusBadgeHtml = '<span class="badge-completed"><i class="bi bi-check-circle-fill me-1"></i>Approved</span>';
    } else {
      statusBadgeHtml = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1 rounded-pill fs-12 fw-semibold">' +
        '<i class="bi bi-x-circle-fill me-1"></i>Rejected</span>';
    }

    var stagePipelineUrl = '#/circular/' + c.id + '/stage/' + stg.id + '/' +
      (ap.kind === 'APPLICANT' ? 'approval-applicant' : 'approval-venue');

    // Stats bar metrics and scope detail
    var statsBarHtml = '';
    var scopeDetail = '';
    if (ap.kind === 'APPLICANT') {
      var rollCount = roster.filter(function (r) { return r.rollNo; }).length;
      statsBarHtml = '<div class="circ-stats-bar">' +
        '<span class="stat-item"><i class="bi bi-people-fill text-primary"></i><strong>' + roster.length + '</strong> candidates</span>' +
        '<span class="stat-item"><i class="bi bi-card-checklist text-success"></i><strong>' + rollCount + '</strong> roll assigned</span>' +
        '<span class="stat-item"><i class="bi bi-calendar-event text-danger"></i>Date: <strong>' + fmt.date(ap.createdAt) + '</strong></span>' +
        '</div>';
      scopeDetail = 'Candidate roster of <strong>' + roster.length + ' applicants</strong> shortlisted for <strong>' + fmt.esc(pipe.typeLabel(stg.type)) + '</strong> examination phase. ' +
        (rollCount === roster.length && roster.length > 0 ? 'All roll numbers generated.' : rollCount + ' of ' + roster.length + ' roll numbers generated.');
    } else {
      var totalSeats = venues.reduce(function (s, v) { return s + (Number(v.capacity) || 0); }, 0);
      statsBarHtml = '<div class="circ-stats-bar">' +
        '<span class="stat-item"><i class="bi bi-geo-alt-fill text-success"></i><strong>' + venues.length + '</strong> ' + (venues.length === 1 ? 'venue' : 'venues') + '</span>' +
        '<span class="stat-item"><i class="bi bi-person-workspace text-primary"></i><strong>' + totalSeats + '</strong> seats</span>' +
        '<span class="stat-item"><i class="bi bi-calendar-event text-danger"></i>Date: <strong>' + fmt.date(ap.createdAt) + '</strong></span>' +
        '</div>';
      scopeDetail = venues.length
        ? venues.map(function (v) {
          return '<span class="fw-semibold text-dark">' + fmt.esc(v.name) + '</span> (' + fmt.date(v.examDate) + ', ' + v.capacity + ' seats)';
        }).join(' &middot; ')
        : 'No exam venues attached to this stage.';
    }

    // Stage phase chips (identical to dashboard circ-phase-chain)
    var chips = stages.map(function (s, idx) {
      var isCur = (s.id === stg.id);
      var isDone = (s.status === 'COMPLETED');
      var cls = isDone ? 'done' : (isCur ? 'cur' : 'upcoming');
      var icon = isDone ? '<i class="bi bi-check-circle-fill"></i>' : (isCur ? '<i class="bi bi-hourglass-split"></i>' : '');
      var rList = store.rosterOf(s.id);
      var countHtml = rList.length ? '<span class="phase-chip-count">' + rList.length + '</span>' : '';
      var arrow = idx < stages.length - 1 ? '<i class="bi bi-chevron-right phase-arrow"></i>' : '';
      return '<span class="phase-chip ' + cls + '">' + icon + ' ' + fmt.esc(pipe.typeLabel(s.type)) + countHtml + '</span>' + arrow;
    }).join('');

    // Contextual next-stage-box
    var nextBoxHtml = '';
    if (isMyTurn) {
      nextBoxHtml = '<div class="next-stage-box action-required">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-shield-exclamation next-stage-icon"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-truncate">Level ' + (ap.currentSeq + 1) + ' Sign-Off Required</div>' +
        '<div class="next-stage-sub text-truncate">Awaiting your decision as <strong>' + fmt.esc(me.name) + '</strong></div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap">' +
        '<button type="button" class="btn btn-sm btn-outline-secondary bg-white shadow-xs" data-details="' + ap.id + '" title="Inspect details">' +
        '<i class="bi bi-eye me-1"></i>Details' +
        '</button>' +
        '<button type="button" class="btn-proceed" data-approve="' + ap.id + '">' +
        '<i class="bi bi-check-lg"></i> Approve' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger shadow-xs" data-reject="' + ap.id + '">' +
        '<i class="bi bi-x-lg"></i> Reject' +
        '</button>' +
        '</div>' +
        '</div>';
    } else if (ap.status === 'PENDING') {
      nextBoxHtml = '<div class="next-stage-box">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-hourglass-split next-stage-icon"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-truncate">In Review: Level ' + (ap.currentSeq + 1) + ' (' + fmt.esc(curLevel ? curLevel.name : 'Approver') + ')</div>' +
        '<div class="next-stage-sub text-truncate">' + fmt.esc(curLevel ? curLevel.designation : 'Approval sequence in progress') + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap">' +
        '<button type="button" class="btn btn-sm btn-outline-secondary bg-white shadow-xs" data-details="' + ap.id + '" title="Inspect details">' +
        '<i class="bi bi-eye me-1"></i>Details' +
        '</button>' +
        (curLevel ? '<button type="button" class="btn btn-sm btn-outline-primary bg-white shadow-xs" data-switch-user="' + curLevel.userId + '" title="Switch persona to ' + fmt.esc(curLevel.name) + ' to act">' +
          '<i class="bi bi-person-switch me-1"></i>Switch to act</button>' : '') +
        '<a class="btn-proceed" href="' + stagePipelineUrl + '">' +
        '<i class="bi bi-play-circle-fill"></i> See More' +
        '</a>' +
        '</div>' +
        '</div>';
    } else if (isApproved) {
      var lastAct = ap.chain && ap.chain.length ? ap.chain[ap.chain.length - 1] : null;
      nextBoxHtml = '<div class="next-stage-box completed">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-check-circle-fill next-stage-icon"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-truncate">Request Approved</div>' +
        '<div class="next-stage-sub text-truncate">Authorized ' + (lastAct && lastAct.actedAt ? fmt.ago(lastAct.actedAt) : '') + (lastAct ? ' by ' + fmt.esc(lastAct.name) : '') + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap">' +
        '<button type="button" class="btn btn-sm btn-outline-success bg-white shadow-xs" data-details="' + ap.id + '">' +
        '<i class="bi bi-eye me-1"></i>Details' +
        '</button>' +
        '<a class="btn-proceed btn-completed" href="' + stagePipelineUrl + '">' +
        '<i class="bi bi-diagram-3"></i> See More' +
        '</a>' +
        '</div>' +
        '</div>';
    } else {
      var rejLevel = ap.chain && ap.chain.find(function (x) { return x.status === 'REJECTED'; });
      nextBoxHtml = '<div class="next-stage-box rejected">' +
        '<div class="d-flex align-items-center gap-3 min-w-0">' +
        '<i class="bi bi-x-circle-fill next-stage-icon"></i>' +
        '<div class="min-w-0">' +
        '<div class="next-stage-title text-truncate">Request Returned / Rejected</div>' +
        '<div class="next-stage-sub text-truncate">Declined ' + (rejLevel && rejLevel.actedAt ? fmt.ago(rejLevel.actedAt) : '') + (rejLevel ? ' by ' + fmt.esc(rejLevel.name) : '') + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap">' +
        '<button type="button" class="btn btn-sm btn-outline-danger bg-white shadow-xs" data-details="' + ap.id + '">' +
        '<i class="bi bi-eye me-1"></i>Details' +
        '</button>' +
        '<a class="btn btn-sm btn-outline-danger bg-white shadow-xs" href="' + stagePipelineUrl + '">' +
        '<i class="bi bi-arrow-counterclockwise me-1"></i>Revise in Pipeline' +
        '</a>' +
        '</div>' +
        '</div>';
    }

    return '<div class="col-xl-6 col-12">' +
      '<div class="circ-card' + (isApproved ? ' circ-card-completed' : '') + '" id="card-approval-' + ap.id + '">' +
      '<div class="d-flex align-items-start justify-content-between gap-2">' +
      '<div class="circ-card-title text-truncate" title="' + fmt.esc(c.post) + '">' + fmt.esc(c.post) + '</div>' +
      '<div class="d-flex align-items-center gap-1.5 flex-shrink-0">' +
      statusBadgeHtml +
      '</div>' +
      '</div>' +

      '<div class="circ-code d-flex align-items-center gap-2 flex-wrap">' +
      fmt.esc(c.code) +
      '</div>' +

      statsBarHtml +

      '<div class="circ-divider"></div>' +

      '<div class="circ-phase-section">' +
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<div class="circ-phase-label mb-0">Examination Stages</div>' +
      '<div class="text-muted fs-11"><i class="bi bi-person me-1"></i>Requested by <strong class="text-dark">' + fmt.esc(ap.createdBy || 'HR Admin') + '</strong> &middot; ' + fmt.ago(ap.createdAt) + '</div>' +
      '</div>' +
      '<div class="circ-phase-chain">' + chips + '</div>' +
      '</div>' +

      nextBoxHtml +

      '</div>' +
      '</div>';
  }

  /* Render compact table row for dense mode */
  function renderRequestTableRow(ap, me, idx) {
    var stg = store.stage(ap.stageId);
    var c = store.circular(ap.circularId);
    if (!stg || !c) return '';

    var curLevel = ap.chain && ap.chain[ap.currentSeq];
    var isMyTurn = (ap.status === 'PENDING' && curLevel && curLevel.userId === me.id);
    var roster = store.rosterOf(stg.id);
    var venues = store.venuesOf(stg.id);

    var countLabel = ap.kind === 'APPLICANT'
      ? roster.length + ' Candidates'
      : venues.length + ' Venues';

    var statusPillHtml = '';
    if (isMyTurn) {
      statusPillHtml = '<span class="badge bg-warning text-dark border border-warning rounded-pill px-2 py-1 fs-11 pa-pulse-glow"><i class="bi bi-exclamation-triangle-fill me-1"></i>Your Turn</span>';
    } else if (ap.status === 'PENDING') {
      statusPillHtml = '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 fs-11">L' + (ap.currentSeq + 1) + ' Pending</span>';
    } else if (ap.status === 'APPROVED') {
      statusPillHtml = '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 fs-11"><i class="bi bi-check2 me-1"></i>Approved</span>';
    } else {
      statusPillHtml = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-1 fs-11"><i class="bi bi-x me-1"></i>Rejected</span>';
    }

    return '<tr>' +
      '<td class="text-muted num">' + (idx + 1) + '</td>' +
      '<td>' +
      '<div class="fw-bold text-dark fs-13">' + fmt.esc(c.post) + '</div>' +
      '<div class="mono text-muted fs-11">' + fmt.esc(c.code) + '</div>' +
      '</td>' +
      '<td><span class="badge bg-light text-dark border fs-11">' + fmt.esc(pipe.typeLabel(stg.type)) + '</span></td>' +
      '<td class="text-center fw-semibold fs-12">' + countLabel + '</td>' +
      '<td class="fs-12">' +
      '<div class="text-dark">' + fmt.esc(ap.createdBy || 'HR Admin') + '</div>' +
      '<div class="text-muted fs-11">' + fmt.date(ap.createdAt) + '</div>' +
      '</td>' +
      '<td class="fs-12">' +
      (ap.status === 'PENDING'
        ? '<div class="fw-semibold text-dark">' + fmt.esc(curLevel ? curLevel.name : '—') + '</div>' +
        '<div class="text-muted fs-11">' + fmt.esc(curLevel ? curLevel.designation : '') + '</div>'
        : '<div class="text-muted fs-11">Closed</div>') +
      '</td>' +
      '<td class="text-center">' + statusPillHtml + '</td>' +
      '<td class="text-center">' +
      '<div class="table-actions-cell">' +
      '<button class="btn-table-action" data-details="' + ap.id + '" title="View Details"><i class="bi bi-eye"></i></button>' +
      (isMyTurn ? '<button class="btn btn-xs btn-success" data-approve="' + ap.id + '" title="Approve"><i class="bi bi-check-lg"></i></button>' +
        '<button class="btn btn-xs btn-outline-danger" data-reject="' + ap.id + '" title="Reject"><i class="bi bi-x-lg"></i></button>' : '') +
      '<a class="btn-table-action" href="#/circular/' + c.id + '/stage/' + stg.id + '/' + (ap.kind === 'APPLICANT' ? 'approval-applicant' : 'approval-venue') + '" title="Open Stage"><i class="bi bi-box-arrow-up-right"></i></a>' +
      '</div>' +
      '</td>' +
      '</tr>';
  }

  function generateSampleApproval() {
    var c = store.all('circulars')[0];
    if (!c) {
      ui.toast('Please create a circular first.', 'warning');
      return;
    }

    var stages = store.stagesOf(c.id);
    var stg = stages[0];
    if (!stg) {
      ui.toast('No stages found for circular ' + c.post, 'warning');
      return;
    }

    var roster = store.rosterOf(stg.id);
    if (!roster.length) {
      var apps = store.applicantsOf(c.id);
      apps.slice(0, 25).forEach(function (a, i) {
        store.addToRoster(stg.id, a.id, { rollNo: 10001 + i, score: 75 + (i % 20) });
      });
      roster = store.rosterOf(stg.id);
    }

    var approverIds = ['u-gm', 'u-dmd', 'u-md'].filter(function (id) { return !!store.find('users', id); });
    if (!approverIds.length) approverIds = ['u-gm', 'u-dmd', 'u-md'];

    var ap = store.insert('approvals', {
      id: fmt.uid('apr'),
      circularId: c.id,
      stageId: stg.id,
      kind: 'APPLICANT',
      summary: fmt.plural(roster.length, 'candidate') + ' selected for ' + pipe.typeLabel(stg.type) + ' exam — ' + c.post,
      status: 'PENDING',
      currentSeq: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'Md.Fahim (HR Admin)',
      chain: approverIds.map(function (uid, i) {
        var u = store.find('users', uid) || { name: uid, designation: 'Approver' };
        return {
          seq: i, userId: uid, name: u.name, designation: u.designation,
          status: 'PENDING', remarks: '', actedAt: null
        };
      })
    });
    store.save();
    ui.toast('Sample candidate roster approval generated for ' + c.post + '!', 'success');
    if (ERec.app && ERec.app.renderAll) {
      ERec.app.renderAll();
    } else {
      ERec.router.refresh();
    }
  }

  /* Main render method */
  function render(view) {
    ERec.router.setCrumbs([{ label: 'Pending Approval' }]);

    var me = store.actingUser();
    var allApprovals = store.all('approvals').slice().sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    var stats = computeStats(allApprovals, me);
    var filtered = filterApprovals(allApprovals, me, pageState);
    var circulars = store.all('circulars');

    // Build Page Content
    var html = '<div class="pending-approval-page">';

    var pendingCount = stats.mine.length + stats.others.length;

    // 3 Modern Metric KPI Cards
    html += '<div class="row g-3 mb-4">' +
      // Stat 1: Pending Approvals
      '<div class="col-12 col-md-4">' +
      '<div class="pa-stat-card pa-stat-pending ' + (pageState.tab === 'pending' ? 'is-active' : '') + '" data-tab-trigger="pending" role="button" title="Click to filter by Pending Approvals">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<div class="k text-muted small fw-semibold">Pending Approvals</div>' +
      '<div class="v text-warning-emphasis fw-bold fs-2 mt-1">' + pendingCount + '</div>' +
      '</div>' +
      '<div class="pa-stat-icon-box bg-warning-subtle text-warning-emphasis">' +
      '<i class="bi bi-hourglass-split"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 2: Fully approved
      '<div class="col-12 col-md-4">' +
      '<div class="pa-stat-card pa-stat-approved ' + (pageState.tab === 'approved' ? 'is-active' : '') + '" data-tab-trigger="approved" role="button" title="Click to filter by Fully approved">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<div class="k text-muted small fw-semibold">Fully approved</div>' +
      '<div class="v text-success fw-bold fs-2 mt-1">' + stats.approved.length + '</div>' +
      '</div>' +
      '<div class="pa-stat-icon-box bg-success-subtle text-success">' +
      '<i class="bi bi-check2-all"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 3: Rejected
      '<div class="col-12 col-md-4">' +
      '<div class="pa-stat-card pa-stat-rejected ' + (pageState.tab === 'rejected' ? 'is-active' : '') + '" data-tab-trigger="rejected" role="button" title="Click to filter by Rejected">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<div class="k text-muted small fw-semibold">Rejected</div>' +
      '<div class="v text-danger fw-bold fs-2 mt-1">' + stats.rejected.length + '</div>' +
      '</div>' +
      '<div class="pa-stat-icon-box bg-danger-subtle text-danger">' +
      '<i class="bi bi-x-circle"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'; // End Metrics Row

    // Interactive Toolbar (Search in left area, Filter Dropdowns & View Switcher in right area)
    html += '<div class="card shadow-sm border-0 mb-4">' +
      '<div class="card-body p-3">' +
      '<div class="row g-2 align-items-center justify-content-between">' +

      // Search input in left area
      '<div class="col-12 col-md-5 col-lg-4">' +
      '<div class="position-relative">' +
      '<input type="text" class="form-control form-control-sm ps-4 pe-4" id="pa-search-input" placeholder="Search post, code, approver..." value="' + fmt.esc(pageState.search) + '">' +
      '<i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-muted fs-12"></i>' +
      (pageState.search ? '<button class="btn btn-link btn-xs position-absolute top-50 end-0 translate-middle-y text-muted p-1 me-1 text-decoration-none" id="pa-clear-search"><i class="bi bi-x-lg"></i></button>' : '') +
      '</div>' +
      '</div>' +

      // Filter Dropdowns & View Switcher in right area
      '<div class="col-12 col-md-7 col-lg-8">' +
      '<div class="d-flex align-items-center gap-2 flex-wrap justify-content-md-end">' +

      // Status Filter with form-select form-select-sm
      '<select class="form-select form-select-sm" id="pa-status-filter" style="width: auto; min-width: 160px;">' +
      '<option value="all"' + (pageState.tab === 'all' ? ' selected' : '') + '>All Status</option>' +
      '<option value="pending"' + (pageState.tab === 'pending' ? ' selected' : '') + '>Pending Approvals</option>' +
      '<option value="approved"' + (pageState.tab === 'approved' ? ' selected' : '') + '>Fully approved</option>' +
      '<option value="rejected"' + (pageState.tab === 'rejected' ? ' selected' : '') + '>Rejected</option>' +
      '</select>' +

      // Type Filter with form-select form-select-sm
      '<select class="form-select form-select-sm" id="pa-type-filter" style="width: auto;">' +
      '<option value="ALL"' + (pageState.kind === 'ALL' ? ' selected' : '') + '>All Types</option>' +
      '<option value="APPLICANT"' + (pageState.kind === 'APPLICANT' ? ' selected' : '') + '>Candidate List</option>' +
      '<option value="VENUE"' + (pageState.kind === 'VENUE' ? ' selected' : '') + '>Venue Plans</option>' +
      '</select>' +

      // View Mode Toggle
      '<div class="btn-group btn-group-sm" role="group">' +
      '<button type="button" class="btn ' + (pageState.viewMode === 'cards' ? 'btn-success' : 'btn-light border') + '" data-view-mode="cards" title="Cards View"><i class="bi bi-grid-fill"></i></button>' +
      '<button type="button" class="btn ' + (pageState.viewMode === 'table' ? 'btn-success' : 'btn-light border') + '" data-view-mode="table" title="Table View"><i class="bi bi-table"></i></button>' +
      '</div>' +

      '</div>' +
      '</div>' +

      '</div>' +
      '</div>' +
      '</div>'; // End Toolbar

    // Results Summary & Active Filter Indicators
    if (pageState.search || pageState.kind !== 'ALL' || pageState.tab !== 'all') {
      var statusSummary = '';
      if (pageState.tab === 'pending') statusSummary = ' [Pending Approvals]';
      else if (pageState.tab === 'approved') statusSummary = ' [Fully approved]';
      else if (pageState.tab === 'rejected') statusSummary = ' [Rejected]';
      else if (pageState.tab === 'mine') statusSummary = ' [Awaiting Me]';

      html += '<div class="d-flex align-items-center justify-content-between mb-3 px-1 fs-12 text-muted">' +
        '<div>Showing <strong>' + filtered.length + '</strong> of ' + allApprovals.length + ' requests' +
        statusSummary +
        (pageState.search ? ' matching "<em>' + fmt.esc(pageState.search) + '</em>"' : '') +
        (pageState.kind !== 'ALL' ? ' (' + (pageState.kind === 'APPLICANT' ? 'Candidate List' : 'Venue Plans') + ')' : '') +
        '</div>' +
        '<button class="btn btn-link btn-xs text-success text-decoration-none p-0" id="btn-reset-filters"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset filters</button>' +
        '</div>';
    }

    // Main Content Canvas
    if (!filtered.length) {
      // Empty state
      var emptyHeading = 'No Approval Requests Found';
      var emptyText = 'There are no approval requests matching the current filter criteria.';
      if (!allApprovals.length) {
        emptyHeading = 'No Approval Requests in Portal';
        emptyText = 'Approval workflows are initiated when HR Admin submits Candidate List or Exam Venue Allocation Plans from stage pipelines.';
      } else if (pageState.tab === 'pending') {
        emptyHeading = 'No Pending Approvals';
        emptyText = 'There are currently no requests awaiting multi-tier sign-off.';
      } else if (pageState.tab === 'mine') {
        emptyHeading = 'You\'re All Caught Up!';
        emptyText = 'No approval requests are currently waiting on your executive decision.';
      }

      html += '<div class="card shadow-sm border-0 py-5 text-center">' +
        '<div class="card-body p-4">' +
        '<div class="avatar xl mx-auto mb-3 bg-success-subtle text-success border border-success-subtle">' +
        '<i class="bi bi-check2-circle fs-1"></i>' +
        '</div>' +
        '<h5 class="fw-bold text-dark mb-1">' + emptyHeading + '</h5>' +
        '<p class="text-muted fs-13 mb-4 mx-auto" style="max-width: 480px;">' + emptyText + '</p>' +
        '<div class="d-flex align-items-center justify-content-center gap-2 flex-wrap">' +
        '<a href="#/circulars" class="btn btn-green-solid shadow-sm px-3">' +
        '<i class="bi bi-briefcase me-1"></i> View Job Circulars' +
        '</a>' +
        '</div>' +
        '</div>' +
        '</div>';
    } else if (pageState.viewMode === 'table') {
      // Table View
      html += '<div class="card shadow-sm border-0">' +
        '<div class="table-responsive">' +
        '<table class="table table-hover align-middle mb-0">' +
        '<thead class="table-light fs-12 text-secondary">' +
        '<tr>' +
        '<th>#</th>' +
        '<th>POST & REFERENCE</th>' +
        '<th>STAGE</th>' +
        '<th class="text-center">SCOPE</th>' +
        '<th>REQUESTED BY</th>' +
        '<th>CURRENT APPROVER</th>' +
        '<th class="text-center">STATUS</th>' +
        '<th class="text-center">ACTIONS</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody class="fs-13">' +
        filtered.map(function (ap, i) { return renderRequestTableRow(ap, me, i); }).join('') +
        '</tbody>' +
        '</table>' +
        '</div>' +
        '</div>';
    } else {
      // Cards View
      html += '<div class="row g-3 approval-cards-list mb-4">' +
        filtered.map(function (ap) { return renderRequestCard(ap, me); }).join('') +
        '</div>';
    }

    html += '</div>'; // End Page
    view.innerHTML = html;

    // Attach Event Handlers

    // 1. Details Modal
    ui.on(view, '[data-details]', 'click', function (e, b) {
      var ap = store.find('approvals', b.dataset.details);
      if (!ap) return;
      var stg = store.stage(ap.stageId);
      if (stg && ERec.approvals && ERec.approvals.detailsModal) {
        ERec.approvals.detailsModal(stg, ap.kind);
      }
    });

    // 2. Decision Modals (Approve / Reject)
    ui.on(view, '[data-approve]', 'click', function (e, b) {
      var ap = store.find('approvals', b.dataset.approve);
      if (!ap) return;
      ERec.approvals.decisionModal(ap, 'APPROVED', function () {
        if (ERec.app && ERec.app.renderAll) {
          ERec.app.renderAll();
        } else {
          ERec.router.refresh();
        }
      });
    });

    ui.on(view, '[data-reject]', 'click', function (e, b) {
      var ap = store.find('approvals', b.dataset.reject);
      if (!ap) return;
      ERec.approvals.decisionModal(ap, 'REJECTED', function () {
        if (ERec.app && ERec.app.renderAll) {
          ERec.app.renderAll();
        } else {
          ERec.router.refresh();
        }
      });
    });

    // 3. User Switcher
    ui.on(view, '[data-switch-user]', 'click', function (e, b) {
      var uid = b.dataset.switchUser;
      if (!uid) return;
      store.setActingUser(uid);
      var u = store.find('users', uid);
      ui.toast('Acting as ' + (u ? u.name : uid) + ' (' + (u ? u.designation : '') + ')', 'info');
      if (ERec.app && ERec.app.renderAll) {
        ERec.app.renderAll();
      } else {
        render(view);
      }
    });

    // 4. Tab / Status Switching
    ui.on(view, '[data-tab]', 'click', function (e, b) {
      pageState.tab = b.dataset.tab;
      render(view);
    });

    ui.on(view, '[data-tab-trigger]', 'click', function (e, b) {
      var target = b.dataset.tabTrigger;
      pageState.tab = (pageState.tab === target) ? 'all' : target;
      render(view);
    });

    ui.on(view, '[data-quick-filter]', 'click', function (e, b) {
      pageState.tab = b.dataset.quickFilter;
      render(view);
    });

    var statusEl = view.querySelector('#pa-status-filter');
    if (statusEl) {
      statusEl.addEventListener('change', function () {
        pageState.tab = statusEl.value;
        render(view);
      });
    }

    // 5. View Mode Switching
    ui.on(view, '[data-view-mode]', 'click', function (e, b) {
      pageState.viewMode = b.dataset.viewMode;
      render(view);
    });

    // 6. Search Input Handling
    var searchEl = view.querySelector('#pa-search-input');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        pageState.search = searchEl.value;
        var filteredList = filterApprovals(allApprovals, me, pageState);
        // Refresh only if needed or debounced
        clearTimeout(searchEl._timer);
        searchEl._timer = setTimeout(function () {
          render(view);
          // Restore focus to search input
          var newSearchEl = view.querySelector('#pa-search-input');
          if (newSearchEl) {
            newSearchEl.focus();
            newSearchEl.setSelectionRange(newSearchEl.value.length, newSearchEl.value.length);
          }
        }, 250);
      });
    }

    var clearSearchBtn = view.querySelector('#pa-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', function () {
        pageState.search = '';
        render(view);
      });
    }

    // 7. Type Filter Handling
    var typeEl = view.querySelector('#pa-type-filter');
    if (typeEl) {
      typeEl.addEventListener('change', function () {
        pageState.kind = typeEl.value;
        render(view);
      });
    }

    // 8. Reset Filters Button
    var resetBtn = view.querySelector('#btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        pageState.tab = 'all';
        pageState.search = '';
        pageState.kind = 'ALL';
        render(view);
      });
    }

    // 9. Refresh Button
    var refreshBtn = view.querySelector('#btn-refresh-portal');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        ui.toast('Portal data refreshed', 'info');
        render(view);
      });
    }

  }

  // Register on ERec.pages with both canonical and backward-compatible keys
  ERec.pages.pendingApproval = { render: render };
  ERec.pages.approvalsInbox = ERec.pages.pendingApproval;

})(window);
