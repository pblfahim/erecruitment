/* Stage Approval Step: Exam Venue (seatplanapprove.js).
   Dedicated approval workflow for authorizing examination venues,
   hall capacities, reporting times, and seating arrangements.
   Displays exam venue allocations, modern hierarchical timeline,
   acting officer switching, and authorization actions. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  ERec.pages = ERec.pages || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var STEP_KEY = 'approval-venue';
  var KIND = 'VENUE';

  function isHrAdminUser(u) {
    u = u || store.actingUser();
    return !!(u && (u.role === 'HR_ADMIN' || u.id === 'u-hr'));
  }

  /* ---------- Approval Workflow Mechanics ---------- */

  function send(stg, summary) {
    var me = store.actingUser();
    if (!isHrAdminUser(me)) {
      ui.toast('Only HR Admin · Senior Officer can send approval requests.', 'warning');
      return null;
    }
    var ids = stg.venueApprovers || [];
    if (!ids.length) {
      ids = ['u-gm', 'u-dmd', 'u-md'].filter(function (uid) { return !!store.find('users', uid); });
    }
    var ap = store.insert('approvals', {
      id: fmt.uid('apr'),
      circularId: stg.circularId,
      stageId: stg.id,
      kind: KIND,
      summary: summary,
      status: 'PENDING',
      currentSeq: 0,
      createdAt: new Date().toISOString(),
      createdBy: store.actingUser().name,
      chain: ids.map(function (uid, i) {
        var u = store.find('users', uid) || { name: uid, designation: 'Approver' };
        return {
          seq: i,
          userId: uid,
          name: u.name,
          designation: u.designation,
          status: 'PENDING',
          remarks: '',
          actedAt: null
        };
      })
    });
    store.audit('SEND_APPROVAL', 'approval', ap.id,
      'Venue plan sent for approval · ' + pipe.typeLabel(stg.type));
    return ap;
  }

  function act(approvalId, decision, remarks) {
    var ap = store.find('approvals', approvalId);
    if (!ap || ap.status !== 'PENDING') return null;
    var level = ap.chain[ap.currentSeq];
    if (!level) return null;

    var stepKey = ap.kind === 'APPLICANT' ? 'approval-applicant' : 'approval-venue';

    level.status = decision;
    level.remarks = remarks || '';
    level.actedAt = new Date().toISOString();

    if (decision === 'REJECTED') {
      ap.status = 'REJECTED';
      store.clearStep(ap.stageId, stepKey);
    } else {
      ap.currentSeq += 1;
      if (ap.currentSeq >= ap.chain.length) {
        ap.status = 'APPROVED';
        store.markStep(ap.stageId, stepKey, { approvalId: ap.id });
      }
    }
    var stg = store.stage(ap.stageId);
    var label = ap.kind === 'APPLICANT' ? 'Candidate roster ' : 'Venue plan ';
    store.audit(decision === 'REJECTED' ? 'REJECT' : 'APPROVE', 'approval', ap.id,
      label + decision.toLowerCase() + ' · ' + (stg ? pipe.typeLabel(stg.type) : ''));
    store.save();
    return ap;
  }

  function decisionModal(ap, decision, onDone) {
    var isApprove = decision === 'APPROVED';
    var isVenue = !ap || ap.kind === 'VENUE';
    var titleKind = isVenue ? 'Exam Venue Plan' : 'Candidate Roster';
    ui.modal({
      title: (isApprove ? 'Approve' : 'Reject') + ' — ' + titleKind,
      body: '<div class="fs-13 mb-3 text-muted">' + fmt.esc(ap.summary) + '</div>' +
        '<label class="form-label fw-semibold">Remarks' + (isApprove ? ' (optional)' : ' <span class="text-danger">*</span>') + '</label>' +
        '<textarea class="form-control" id="f-decision-rem" rows="3" placeholder="' +
        (isApprove ? 'Verified and approved.' : 'State the reason for rejection.') + '"></textarea>',
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-' + (isApprove ? 'success' : 'danger') + '" data-act="submit-decision">' +
        (isApprove ? '<i class="bi bi-check2-circle me-1"></i> Confirm Approval' : '<i class="bi bi-x-circle me-1"></i> Reject Request') + '</button>',
      onShow: function (api) {
        api.find('[data-act="submit-decision"]').addEventListener('click', function () {
          var rem = api.find('#f-decision-rem').value.trim();
          if (!isApprove && !rem) { ui.toast('Remarks are required when rejecting', 'warning'); return; }
          act(ap.id, decision, rem);
          api.close();
          ui.toast(isApprove ? 'Approval granted successfully' : 'Request rejected', isApprove ? 'success' : 'danger');
          if (onDone) onDone();
        });
      }
    });
  }

  /* Venue Details Modal */
  function detailsModal(stg) {
    var c = store.circular(stg.circularId);
    var roster = store.rosterOf(stg.id);
    var venues = store.venuesOf(stg.id);

    var body = venues.length
      ? venues.map(function (v) {
        var seated = roster.filter(function (r) {
          return r.rollNo && String(r.rollNo) >= String(v.rollFrom) && String(v.rollTo) && String(r.rollNo) <= String(v.rollTo);
        });
        return '<div class="card mb-3 shadow-sm border"><div class="card-body">' +
          '<div class="fw-bold fs-14 text-dark">' + fmt.esc(v.name) + '</div>' +
          '<div class="fs-12 text-muted mb-2">' + fmt.esc(v.address || 'Address not set') + '</div>' +
          '<div class="row g-2 fs-12">' +
          '<div class="col-sm-6"><strong>Exam date:</strong> ' + fmt.date(v.examDate) + '</div>' +
          '<div class="col-sm-6"><strong>Reporting time:</strong> ' + fmt.time12(v.reportingTime || fmt.shiftTime(v.startTime, -30)) + '</div>' +
          '<div class="col-sm-6"><strong>Exam time:</strong> ' + fmt.time12(v.startTime) + ' – ' + fmt.time12(v.endTime) + '</div>' +
          '<div class="col-sm-6"><strong>Roll range:</strong> <span class="mono fw-semibold">' + fmt.esc(v.rollFrom || '—') + ' – ' + fmt.esc(v.rollTo || '—') + '</span></div>' +
          '<div class="col-12"><strong>Seats:</strong> ' + seated.length + ' allocated of ' + v.capacity + ' total capacity</div>' +
          '</div></div></div>';
      }).join('')
      : ui.empty('No venue set up yet', 'Add an exam venue before sending for approval.', 'bi-geo-alt');

    ui.modal({
      title: 'Exam Venue Allocation Plan · ' + fmt.esc(pipe.typeLabel(stg.type)) + ' · ' + fmt.esc(c ? c.post : ''),
      size: 'xl',
      body: body,
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Close</button>'
    });
  }

  /* ---------- Modern Minimal Timelines ---------- */

  function renderActiveTimeline(ap, me) {
    if (!ap.chain || !ap.chain.length) {
      return '<div class="p-3 bg-light rounded text-center text-muted fs-12 border border-dashed">No approvers configured for this request.</div>';
    }
    me = me || store.actingUser();
    return '<div class="modern-trail-list">' + ap.chain.map(function (l, i) {
      var isCur = ap.status === 'PENDING' && i === ap.currentSeq;
      var isPassed = l.status === 'APPROVED';
      var isRej = l.status === 'REJECTED';
      var stepCls = isPassed ? 'is-passed' : isRej ? 'is-rejected' : (isCur ? 'is-current' : 'is-queued');
      var discContent = isPassed ? '<i class="bi bi-check-lg"></i>' : isRej ? '<i class="bi bi-x-lg"></i>' : (isCur ? '<i class="bi bi-hourglass-split"></i>' : '<span class="font-monospace fs-11">' + (i + 1) + '</span>');
      var isMyTurn = isCur && l.userId === me.id;

      var statusBadge = '';
      if (isPassed) {
        statusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11"><i class="bi bi-check2 me-1"></i>Approved</span>';
      } else if (isRej) {
        statusBadge = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 fs-11"><i class="bi bi-x me-1"></i>Rejected</span>';
      } else if (isMyTurn) {
        statusBadge = '<span class="badge bg-success text-white rounded-pill px-2 py-0.5 fs-11"><i class="bi bi-person-check me-1"></i>Your turn</span>';
      } else if (isCur) {
        statusBadge = '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-0.5 fs-11"><i class="bi bi-hourglass-split me-1"></i>Awaiting</span>';
      } else {
        statusBadge = '<span class="badge bg-light text-muted border rounded-pill px-2 py-0.5 fs-10">Queued</span>';
      }

      return '<div class="modern-trail-step ' + stepCls + '">' +
        '<div class="modern-trail-disc">' + discContent + '</div>' +
        '<div class="modern-trail-card">' +
        '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2">' +
        '<div class="d-flex align-items-center gap-2">' +
        '<span class="badge bg-light text-secondary border fs-10 font-monospace">L' + (i + 1) + '</span>' +
        '<span class="modern-trail-name">' + fmt.esc(l.name) + '</span>' +
        '</div>' +
        '<div>' + statusBadge + '</div>' +
        '</div>' +
        '<div class="modern-trail-meta">' + fmt.esc(l.designation) +
        (l.actedAt ? ' &middot; <span class="text-secondary"><i class="bi bi-clock me-0.5"></i>' + fmt.dateTime(l.actedAt) + '</span>' : '') +
        '</div>' +
        (l.remarks ? '<div class="modern-trail-remarks">“' + fmt.esc(l.remarks) + '”</div>' : '') +
        '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderDraftTimeline(approvers) {
    if (!approvers || !approvers.length) {
      return '<div class="p-3 bg-light rounded text-center text-muted fs-12 border border-dashed"><i class="bi bi-diagram-3 me-1"></i>No approvers configured for this stage.</div>';
    }
    return '<div class="modern-trail-list">' + approvers.map(function (uid, i) {
      var u = store.find('users', uid) || { name: uid, designation: 'Approver' };
      return '<div class="modern-trail-step is-draft">' +
        '<div class="modern-trail-disc font-monospace fs-11 fw-bold">' + (i + 1) + '</div>' +
        '<div class="modern-trail-card">' +
        '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2">' +
        '<div class="d-flex align-items-center gap-2">' +
        '<span class="badge bg-light text-secondary border fs-10 font-monospace">L' + (i + 1) + '</span>' +
        '<span class="modern-trail-name">' + fmt.esc(u.name) + '</span>' +
        '</div>' +
        '<span class="badge bg-light text-muted border rounded-pill px-2 py-0.5 fs-10">Queued</span>' +
        '</div>' +
        '<div class="modern-trail-meta">' + fmt.esc(u.designation) + '</div>' +
        '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- Page Render ---------- */

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    if (!c) { ERec.router.go('#/circulars'); return; }

    var required = !!stg.requireVenueApproval;
    var approvers = stg.venueApprovers || [];
    if (!approvers.length) {
      approvers = ['u-gm', 'u-dmd', 'u-md'].filter(function (uid) { return !!store.find('users', uid); });
    }

    var ap = store.approvalFor(stg.id, KIND);
    var state = store.stepState(stg, STEP_KEY);
    var me = store.actingUser();
    var isHrAdmin = isHrAdminUser(me);

    var venues = store.venuesOf(stg.id);
    var roster = store.rosterOf(stg.id);

    var isVenueApproved = (state && state.done && !state.skipped) ||
      (ap && (ap.status === 'APPROVED' || (ap.chain && ap.chain.length > 0 && ap.chain.every(function (l) { return l.status === 'APPROVED'; }))));

    if (isVenueApproved && (!state || !state.done)) {
      store.markStep(stg.id, STEP_KEY, { approvalId: ap ? ap.id : null });
      state = store.stepState(stg, STEP_KEY);
    }

    var curLevel = (ap && ap.chain && ap.status === 'PENDING') ? ap.chain[ap.currentSeq] : null;
    var isApproverTurn = !!(!isVenueApproved && ap && ap.status === 'PENDING' && curLevel && curLevel.userId === me.id);
    var canSend = venues.length && approvers.length;
    var summary = fmt.plural(venues.length, 'venue') + ' for ' + pipe.typeLabel(stg.type) + ' — ' + c.post;

    /* Venue Schedule Rows */
    var venueRowsHtml = venues.length ? venues.map(function (v) {
      var seatedCount = roster.filter(function (r) {
        return r.rollNo && String(r.rollNo) >= String(v.rollFrom) && String(v.rollTo) && String(r.rollNo) <= String(v.rollTo);
      }).length;
      return '<tr>' +
        '<td>' +
        '<div class="fw-semibold text-dark fs-13">' + fmt.esc(v.name) + '</div>' +
        '<div class="fs-12 text-muted">' + fmt.esc(v.address || 'Address not set') + '</div>' +
        '</td>' +
        '<td class="nowrap fs-12 fw-semibold text-dark">' + fmt.date(v.examDate) + '</td>' +
        '<td class="nowrap fs-12">' +
        '<div><i class="bi bi-clock text-muted me-1"></i>' + fmt.time12(v.startTime) + ' – ' + fmt.time12(v.endTime) + '</div>' +
        '<div class="fs-11 text-secondary">Reporting: ' + fmt.time12(v.reportingTime || fmt.shiftTime(v.startTime, -30)) + '</div>' +
        '</td>' +
        '<td class="mono nowrap fw-semibold fs-12 text-dark">' + fmt.esc(v.rollFrom || '—') + ' – ' + fmt.esc(v.rollTo || '—') + '</td>' +
        '<td class="nowrap fs-12">' +
        '<span class="badge bg-light text-dark border font-monospace px-2 py-1">' + seatedCount + ' / ' + (v.capacity || 0) + ' seats</span>' +
        '</td>' +
        '</tr>';
    }).join('') : '';

    var totalCapacity = venues.reduce(function (s, v) { return s + (v.capacity || 0); }, 0);
    var seatedCandidates = roster.filter(function (r) { return r.venueId; }).length;

    var payload =
      '<div class="row g-2 mb-3">' +
      '<div class="col-sm-4 col-6"><div class="p-2 border rounded bg-light text-center">' +
      '<div class="fs-11 text-muted text-uppercase fw-bold">Exam Venues</div>' +
      '<div class="fs-5 fw-bold text-dark">' + venues.length + '</div>' +
      '</div></div>' +
      '<div class="col-sm-4 col-6"><div class="p-2 border rounded bg-light text-center">' +
      '<div class="fs-11 text-muted text-uppercase fw-bold">Total Capacity</div>' +
      '<div class="fs-5 fw-bold text-primary">' + totalCapacity + '</div>' +
      '</div></div>' +
      '<div class="col-sm-4 col-12"><div class="p-2 border rounded bg-light text-center">' +
      '<div class="fs-11 text-muted text-uppercase fw-bold">Seated Candidates</div>' +
      '<div class="fs-5 fw-bold text-success">' + seatedCandidates + '</div>' +
      '</div></div>' +
      '</div>' +
      (venues.length
        ? '<div class="table-responsive rounded border mb-2">' +
        '<table class="table table-hover align-middle mb-0 table-x" id="table-venue-schedule">' +
        '<thead style="background: #0f4c3a; color: #ffffff; position: sticky; top: 0; z-index: 2;">' +
        '<tr>' +
        '<th>VENUE & ADDRESS</th>' +
        '<th>EXAM DATE</th>' +
        '<th>TIME & REPORTING</th>' +
        '<th>ROLL RANGE</th>' +
        '<th>ALLOCATION</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' + venueRowsHtml + '</tbody>' +
        '</table>' +
        '</div>' +
        '<div class="d-flex align-items-center justify-content-between text-muted fs-12 px-1">' +
        '<span>Configured <strong>' + venues.length + ' venue' + (venues.length === 1 ? '' : 's') + '</strong> covering ' + seatedCandidates + ' candidate allocations.</span>' +
        '<span class="badge bg-light text-secondary border font-monospace">Exam Venues</span>' +
        '</div>'
        : '<div class="p-4 text-center rounded border bg-light">' +
        '<div class="avatar xl mx-auto mb-2 bg-white text-muted border"><i class="bi bi-geo-alt fs-3"></i></div>' +
        '<h6 class="fw-bold text-dark mb-1">No Venues Configured</h6>' +
        '<p class="fs-12 text-muted mb-3">Add examination halls and roll ranges in the Venue & Seating step before requesting authorization.</p>' +
        '<a href="#/circular/' + c.id + '/stage/' + stg.id + '/venue" class="btn btn-sm btn-green-solid px-3 py-1.5"><i class="bi bi-geo-alt me-1"></i> Open Venue & Seating</a>' +
        '</div>');

    /* Trail Card Action Buttons */
    var trailActionsHtml = '';
    if (isVenueApproved) {
      // When approvers approved, no action button is needed in Management List
      trailActionsHtml = '';
    } else if (!ap || ap.status === 'REJECTED') {
      if (isHrAdmin) {
        var isSendDisabled = !canSend;
        var btnTitle = approvers.length === 0
          ? 'Add approvers to send'
          : (!venues.length ? 'Configure venues to send' : 'Send for approval');

        trailActionsHtml =
          '<div class="pt-3 border-top mt-3">' +
          '<button type="button" class="btn btn-green-solid w-100 py-2.5 fw-semibold shadow-xs d-flex align-items-center justify-content-center gap-2" id="btn-card-send"' +
          (isSendDisabled ? ' disabled="disabled" aria-disabled="true"' : '') +
          ' title="' + fmt.esc(btnTitle) + '">' +
          '<i class="bi bi-send-fill"></i> ' + (ap ? 'Send Revised Request' : 'Send for Approval') +
          '</button>' +
          '</div>';
      } else {
        trailActionsHtml =
          '<div class="pt-3 border-top mt-3">' +
          '<button type="button" class="btn btn-secondary opacity-60 w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2" id="btn-card-send" disabled title="Only HR Admin · Senior Officer can send for approval">' +
          '<i class="bi bi-shield-lock"></i> Send for Approval (HR Admin only)' +
          '</button>' +
          '<div class="text-center text-muted fs-11 mt-1.5"><i class="bi bi-info-circle me-1"></i>Only <strong>HR Admin · Senior Officer</strong> can initiate approval requests.</div>' +
          '</div>';
      }
    } else if (isApproverTurn) {
      trailActionsHtml = '';
    } else if (ap && ap.status === 'PENDING') {
      trailActionsHtml =
        '<div class="pt-3 border-top mt-3 text-center text-muted fs-12">' +
        '<i class="bi bi-hourglass-split me-1 text-warning"></i> Awaiting decision from ' +
        '<strong>' + fmt.esc((curLevel ? curLevel.name : 'assigned approver')) + '</strong>' +
        '</div>';
    }

    /* Main Grid: Clean two-column layout without redundant Approval sequence card */
    var body =
      '<div class="row g-3">' +
      '<!-- Left Column: Unified Management List -->' +
      '<div class="col-lg-5">' +
      ui.card({
        title: 'Management List',
        hint: ap
          ? ('Requested by ' + fmt.esc(ap.createdBy) + ' · ' + fmt.dateTime(ap.createdAt))
          : ('Configured in Approval Channel: ' + approvers.length + ' level(s)'),
        actions: isVenueApproved
          ? '<span class="badge bg-success text-white rounded-pill px-2.5 py-1 fs-11"><i class="bi bi-check-circle-fill me-1"></i>Authorized</span>'
          : '',
        body: (ap ? renderActiveTimeline(ap, me) : renderDraftTimeline(approvers)) +
          trailActionsHtml
      }) +
      '</div>' +

      '<!-- Right Column: Exam Venue Plan Selected -->' +
      '<div class="col-lg-7">' +
      ui.card({
        title: 'Examination Venue',
        hint: summary,
        actions: '<button class="btn btn-sm btn-outline-primary" id="btn-details"><i class="bi bi-eye me-1"></i> View Full Plan</button>',
        body: payload
      }) +
      '</div>' +
      '</div>';

    /* Bottom Action Bar */
    var action = {
      secondary: []
    };

    if (isVenueApproved) {
      action.note = 'Exam venue authorized by assigned approvers';
      action.primary = {
        nav: 'instructions',
        label: 'Continue: Admit Card',
        icon: 'bi-chevron-right',
        disabled: false
      };
    } else if (state && state.skipped) {
      action.note = 'This step was skipped';
      action.primary = {
        nav: 'instructions',
        label: 'Continue: Admit Card',
        icon: 'bi-chevron-right',
        disabled: false
      };
    } else {
      if (!ap || ap.status === 'REJECTED') {
        action.primary = {
          id: 'btn-send',
          icon: 'bi-send',
          label: ap ? 'Send revised request' : 'Send for approval',
          disabled: !canSend || !isHrAdmin
        };
      } else if (ap.status === 'PENDING') {
        action.note = 'Awaiting authorization from assigned approvers';
      }
      if (!required) action.secondary.push({ id: 'btn-skip', label: 'Skip — not needed' });
    }

    if (isApproverTurn) {
      if (action.primary && action.primary.id) {
        action.secondary.push({ id: action.primary.id, label: action.primary.label });
      }
      action.primary = {
        id: 'btn-approve',
        tone: 'success',
        icon: 'bi-check-lg',
        label: 'Approve as ' + me.name.split(' ')[0]
      };
      action.secondary.push({ id: 'btn-reject', label: 'Reject', tone: 'outline-danger' });
    }

    ui.stagePage(view, stg, STEP_KEY, { body: body, action: action });

    /* ---------- Event Bindings ---------- */

    // Switch Acting Personnel button handlers
    ui.on(view, '[data-switch-user]', 'click', function (e, b) {
      var uid = b.dataset.switchUser;
      if (!uid) return;
      store.setActingUser(uid);
      var nu = store.find('users', uid);
      ui.toast('Acting as ' + (nu ? nu.name : uid) + (nu ? ' (' + nu.designation + ')' : ''), 'info');
      ERec.app.renderAll();
    });

    var detBtn = view.querySelector('#btn-details');
    if (detBtn) detBtn.addEventListener('click', function () { detailsModal(stg); });

    function doSend() {
      if (!canSend) {
        ui.toast('Cannot send: please ensure venues are configured and approvers set.', 'warning');
        return;
      }
      send(stg, summary);
      ui.toast('Sent for approval to ' + (store.find('users', approvers[0]) || {}).name, 'success');
      ERec.app.renderAll();
    }

    var sendBtn = view.querySelector('#btn-send');
    if (sendBtn) sendBtn.addEventListener('click', doSend);
    var cardSendBtn = view.querySelector('#btn-card-send');
    if (cardSendBtn) cardSendBtn.addEventListener('click', doSend);

    var skipBtn = view.querySelector('#btn-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function () {
        ui.confirm({
          title: 'Skip approval',
          body: 'This optional approval will be marked as skipped and the pipeline will move on.',
          okText: 'Skip step'
        }).then(function (ok) {
          if (!ok) return;
          store.markStep(stg.id, STEP_KEY, { skipped: true });
          store.audit('SKIP_APPROVAL', 'stage', stg.id, 'Venue approval skipped');
          ui.toast('Step skipped');
          ERec.router.refresh();
        });
      });
    }

    function doApprove() {
      decisionModal(ap, 'APPROVED', function () { ERec.app.renderAll(); });
    }
    function doReject() {
      decisionModal(ap, 'REJECTED', function () { ERec.app.renderAll(); });
    }

    var apr = view.querySelector('#btn-approve');
    if (apr) apr.addEventListener('click', doApprove);
    var cardApr = view.querySelector('#btn-card-approve');
    if (cardApr) cardApr.addEventListener('click', doApprove);

    var rej = view.querySelector('#btn-reject');
    if (rej) rej.addEventListener('click', doReject);
    var cardRej = view.querySelector('#btn-card-reject');
    if (cardRej) cardRej.addEventListener('click', doReject);
  }

  // Register Exam Venue Approval Page
  ERec.pages.seatplanapprove = { render: render };
  ERec.pages.seatplanApprove = ERec.pages.seatplanapprove;

  // Venue Approval API
  ERec.venueApproval = {
    send: send,
    act: act,
    decisionModal: decisionModal,
    detailsModal: detailsModal,
    renderActiveTimeline: renderActiveTimeline,
    renderDraftTimeline: renderDraftTimeline
  };

  // Augment ERec.approvals for backward compatibility & multi-kind routing
  ERec.approvals = ERec.approvals || {};
  var prevSend = ERec.approvals.send;
  ERec.approvals.send = function (stg, kind, summary) {
    if (kind === KIND) return send(stg, summary);
    if (prevSend) return prevSend(stg, kind, summary);
    return null;
  };
  var prevDetails = ERec.approvals.detailsModal;
  ERec.approvals.detailsModal = function (stg, kind) {
    if (kind === KIND) return detailsModal(stg);
    if (prevDetails) return prevDetails(stg, kind);
    return null;
  };
  var prevAct = ERec.approvals.act;
  ERec.approvals.act = function (approvalId, decision, remarks) {
    var ap = store.find('approvals', approvalId);
    if (ap && ap.kind === KIND) return act(approvalId, decision, remarks);
    if (prevAct) return prevAct(approvalId, decision, remarks);
    return act(approvalId, decision, remarks);
  };
  var prevDecisionModal = ERec.approvals.decisionModal;
  ERec.approvals.decisionModal = function (ap, decision, onDone) {
    if (ap && ap.kind === KIND) return decisionModal(ap, decision, onDone);
    if (prevDecisionModal) return prevDecisionModal(ap, decision, onDone);
    return decisionModal(ap, decision, onDone);
  };
})(window);
