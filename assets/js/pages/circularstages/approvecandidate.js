/* Stage Approval Step: Candidate List (approvecandidate.js).
   Dedicated approval workflow for authorizing the verified candidate roster.
   Displays the confirmed candidate roster, modern hierarchical timeline,
   acting officer switching, and authorization actions. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  ERec.pages = ERec.pages || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var STEP_KEY = 'approval-applicant';
  var KIND = 'APPLICANT';

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
    var ids = stg.applicantApprovers || [];
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
      'Candidate roster sent for approval · ' + pipe.typeLabel(stg.type));
    return ap;
  }

  function act(approvalId, decision, remarks) {
    var ap = store.find('approvals', approvalId);
    if (!ap || ap.status !== 'PENDING') return null;
    var level = ap.chain[ap.currentSeq];
    if (!level) return null;

    var stepKey = ap.kind === 'VENUE' ? 'approval-venue' : 'approval-applicant';

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
    var label = ap.kind === 'VENUE' ? 'Venue plan ' : 'Candidate roster ';
    store.audit(decision === 'REJECTED' ? 'REJECT' : 'APPROVE', 'approval', ap.id,
      label + decision.toLowerCase() + ' · ' + (stg ? pipe.typeLabel(stg.type) : ''));
    store.save();
    return ap;
  }

  function decisionModal(ap, decision, onDone) {
    var isApprove = decision === 'APPROVED';
    var isVenue = ap && ap.kind === 'VENUE';
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

  /* Candidate Roster Details Modal */
  function detailsModal(stg) {
    var c = store.circular(stg.circularId);
    var roster = store.rosterOf(stg.id);

    var body =
      '<div class="verify-summary mb-3 p-3 bg-light rounded border d-flex gap-4 justify-content-around text-center">' +
      '<div><div class="fs-4 fw-bold text-success">' + roster.length + '</div><div class="fs-12 text-muted">Total Selected Candidates</div></div>' +
      '<div><div class="fs-4 fw-bold text-primary">' + (c ? c.vacancies : '—') + '</div><div class="fs-12 text-muted">Approved Vacancies</div></div>' +
      '</div>' +
      '<div class="table-scroll" style="max-height: 58vh">' +
      '<table class="table-x"><thead><tr><th>#</th><th>Roll</th><th>Application no.</th><th>Candidate</th><th>Father\'s name</th><th>Degree</th><th>District</th><th>Mobile</th><th>Status</th></tr></thead><tbody>' +
      (roster.length ? roster.map(function (r, i) {
        var a = store.applicant(r.applicantId) || {};
        return '<tr><td class="num muted">' + (i + 1) + '</td>' +
          '<td class="mono nowrap fw-semibold">' + fmt.esc(r.rollNo || a.rollNo || '—') + '</td>' +
          '<td class="mono fs-12">' + fmt.esc(a.appNo || '—') + '</td>' +
          '<td><div class="fw-semibold">' + fmt.esc(a.name || '—') + '</div></td>' +
          '<td class="fs-12 text-muted">' + fmt.esc(a.fatherName || '—') + '</td>' +
          '<td class="fs-12">' + fmt.esc(ERec.pages.applicants ? ERec.pages.applicants.highestEdu(a) : (a.highestDegree || '—')) + '</td>' +
          '<td class="fs-12">' + fmt.esc(a.district || '—') + '</td>' +
          '<td class="mono fs-12">' + fmt.esc(a.mobile || '—') + '</td>' +
          '<td><span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11"><i class="bi bi-check2 me-1"></i>Selected</span></td></tr>';
      }).join('') : '<tr><td colspan="9" class="text-center py-4 text-muted">No candidates currently on this roster.</td></tr>') +
      '</tbody></table></div>';

    ui.modal({
      title: 'Selected Candidate · ' + fmt.esc(pipe.typeLabel(stg.type)) + ' · ' + fmt.esc(c ? c.post : ''),
      size: 'xl',
      body: body,
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Close</button>' +
        '<button class="btn btn-sm btn-primary" data-act="print"><i class="bi bi-printer me-1"></i> Print Roster</button>',
      onShow: function (api) {
        var p = api.find('[data-act="print"]');
        if (p) {
          p.addEventListener('click', function () {
            api.close();
            if (ERec.exp && ERec.exp.printDoc) ERec.exp.printDoc('applicant-list', stg.id);
          });
        }
      }
    });
  }

  /* ---------- Modern Minimal Timelines (Compact Low-Height Flow) ---------- */

  function renderActiveTimeline(ap, me) {
    if (!ap.chain || !ap.chain.length) {
      return '<div class="p-2.5 bg-light rounded text-center text-muted fs-12 border border-dashed">No approvers configured for this request.</div>';
    }
    me = me || store.actingUser();
    return '<div class="modern-trail-flow">' + ap.chain.map(function (l, i) {
      var isCur = ap.status === 'PENDING' && i === ap.currentSeq;
      var isPassed = l.status === 'APPROVED';
      var isRej = l.status === 'REJECTED';
      var stepCls = isPassed ? 'is-passed' : isRej ? 'is-rejected' : (isCur ? 'is-current' : 'is-queued');
      var discContent = isPassed ? '<i class="bi bi-check-lg"></i>' : isRej ? '<i class="bi bi-x-lg"></i>' : (isCur ? '<i class="bi bi-hourglass-split"></i>' : '<span class="font-monospace fs-11">' + (i + 1) + '</span>');
      var isMyTurn = isCur && l.userId === me.id;

      var statusBadge = '';
      if (isPassed) {
        statusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-10"><i class="bi bi-check2 me-0.5"></i>Approved</span>';
      } else if (isRej) {
        statusBadge = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 fs-10"><i class="bi bi-x me-0.5"></i>Rejected</span>';
      } else if (isMyTurn) {
        statusBadge = '<span class="badge bg-success text-white rounded-pill px-2 py-0.5 fs-10"><i class="bi bi-person-check me-0.5"></i>Your turn</span>';
      } else if (isCur) {
        statusBadge = '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-0.5 fs-10"><i class="bi bi-hourglass-split me-0.5"></i>Awaiting</span>';
      } else {
        statusBadge = '<span class="badge bg-light text-muted border rounded-pill px-2 py-0.5 fs-10">Queued</span>';
      }

      var remarkIcon = l.remarks
        ? '<span class="text-success ms-1 cursor-pointer" title="Remarks: “' + fmt.esc(l.remarks) + '”"><i class="bi bi-chat-quote-fill fs-11"></i></span>'
        : '';

      var hasNext = i < ap.chain.length - 1;

      return '<div class="modern-trail-flow-step ' + stepCls + '">' +
        '<div class="modern-trail-compact-card">' +
        '<div class="modern-trail-disc flex-shrink-0">' + discContent + '</div>' +
        '<div class="modern-trail-compact-info">' +
        '<div class="d-flex align-items-center gap-2 min-w-0">' +
        '<span class="badge bg-light text-secondary border font-monospace fs-10 px-1 py-0">L' + (i + 1) + '</span>' +
        '<span class="modern-trail-compact-name" title="' + fmt.esc(l.name) + '">' + fmt.esc(l.name) + '</span>' +
        remarkIcon +
        '</div>' +
        '<div class="modern-trail-compact-role" title="' + fmt.esc(l.designation) + '">' + fmt.esc(l.designation) + (l.actedAt ? ' &middot; ' + fmt.date(l.actedAt) : '') + '</div>' +
        '</div>' +
        '<div class="modern-trail-compact-status">' +
        statusBadge +
        '</div>' +
        '</div>' +
        (hasNext ? '<div class="modern-trail-flow-connector"><i class="bi bi-chevron-right trail-connector-icon"></i></div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function renderDraftTimeline(approvers) {
    if (!approvers || !approvers.length) {
      return '<div class="p-2.5 bg-light rounded text-center text-muted fs-12 border border-dashed"><i class="bi bi-diagram-3 me-1"></i>No approvers configured for this stage.</div>';
    }
    return '<div class="modern-trail-flow">' + approvers.map(function (uid, i) {
      var u = store.find('users', uid) || { name: uid, designation: 'Approver' };
      var hasNext = i < approvers.length - 1;
      return '<div class="modern-trail-flow-step is-draft">' +
        '<div class="modern-trail-compact-card">' +
        '<div class="modern-trail-disc flex-shrink-0 font-monospace fs-11 fw-bold">' + (i + 1) + '</div>' +
        '<div class="modern-trail-compact-info">' +
        '<div class="d-flex align-items-center gap-1.5 min-w-0">' +
        '<span class="badge bg-light text-secondary border font-monospace fs-10 px-1 py-0">L' + (i + 1) + '</span>' +
        '<span class="modern-trail-compact-name" title="' + fmt.esc(u.name) + '">' + fmt.esc(u.name) + '</span>' +
        '</div>' +
        '<div class="modern-trail-compact-role" title="' + fmt.esc(u.designation) + '">' + fmt.esc(u.designation) + '</div>' +
        '</div>' +
        '<div class="modern-trail-compact-status">' +
        '<span class="badge bg-light text-muted border rounded-pill px-2 py-0.5 fs-10">Queued</span>' +
        '</div>' +
        '</div>' +
        (hasNext ? '<div class="modern-trail-flow-connector"><i class="bi bi-chevron-right trail-connector-icon"></i></div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- Page Render ---------- */

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    if (!c) { ERec.router.go('#/circulars'); return; }

    var required = !!stg.requireApplicantApproval;
    var approvers = stg.applicantApprovers || [];
    if (!approvers.length) {
      approvers = ['u-gm', 'u-dmd', 'u-md'].filter(function (uid) { return !!store.find('users', uid); });
    }

    var ap = store.approvalFor(stg.id, KIND);
    var state = store.stepState(stg, STEP_KEY);
    var me = store.actingUser();
    var isHrAdmin = isHrAdminUser(me);

    /* Selected Candidates: exclusively rows confirmed in this stage's roster */
    var roster = store.rosterOf(stg.id).filter(function (r) {
      return r && store.applicant(r.applicantId);
    });

    var curLevel = (ap && ap.chain) ? ap.chain[ap.currentSeq] : null;
    var isApproverTurn = !!(ap && ap.status === 'PENDING' && curLevel && curLevel.userId === me.id);
    var canSend = roster.length && approvers.length;
    var summary = fmt.plural(roster.length, 'candidate') + ' for ' + pipe.typeLabel(stg.type) + ' — ' + c.post;

    /* Candidate Roster Data */
    var candidateList = roster.map(function (r) {
      var a = store.applicant(r.applicantId) || {};
      var deg = ERec.pages.applicants ? ERec.pages.applicants.highestEdu(a) : (a.highestDegree || '—');
      return {
        id: a.id || r.applicantId,
        rollNo: r.rollNo || a.rollNo || '—',
        appNo: a.appNo || '—',
        name: a.name || 'Candidate',
        fatherName: a.fatherName || 'Father: —',
        highestDegree: deg,
        district: a.district || '—',
        mobile: a.mobile || '—',
        status: 'Selected',
        raw: a
      };
    });

    var payload =
      (roster.length
        ? '<div class="stage-table-card mb-0">' +
        '<div class="stage-table-toolbar">' +
        '<div class="d-flex align-items-center gap-2">' +
        '<span class="fs-13 text-secondary">Per Page:</span>' +
        '<select class="form-select form-select-sm" id="sel-page-size" style="width: 75px; font-size: 12.5px;">' +
        '<option value="10" selected>10</option>' +
        '<option value="25">25</option>' +
        '<option value="50">50</option>' +
        '<option value="100">100</option>' +
        '</select>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2 flex-wrap">' +
        '<button class="btn-toolbar-tool" id="btn-details" title="View Full Candidate Roster Modal">' +
        '<i class="bi bi-eye text-primary"></i> Seletcted Candidate' +
        '</button>' +
        '<button class="btn-toolbar-tool" id="btn-export-Excel">' +
        '<span class="badge-export-Excel">Excel</span> Export Excel' +
        '</button>' +
        '<button class="btn-toolbar-tool" id="btn-print-pdf">' +
        '<span class="badge-export-pdf"><i class="bi bi-printer-fill"></i></span> Print list' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div class="table-scroll">' +
        '<table class="table table-hover align-middle mb-0 table-x" id="candidates-table">' +
        '<thead style="background: #0f4c3a; color: #ffffff;">' +
        '<tr>' +
        '<th class="text-center" style="width: 44px;">#</th>' +
        '<th>ROLL</th>' +
        '<th>APPLICATION NO.</th>' +
        '<th>CANDIDATE</th>' +
        '<th>HIGHEST DEGREE</th>' +
        '<th>DISTRICT</th>' +
        '<th>MOBILE</th>' +
        '<th>STATUS</th>' +
        '<th class="text-center" style="width: 90px;">ACTION</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody id="candidates-tbody"></tbody>' +
        '</table>' +
        '</div>' +
        '<div class="stage-pagination-wrap" id="pagination-bar"></div>' +
        '</div>'
        : '<div class="p-4 text-center rounded border bg-light">' +
        '<div class="avatar xl mx-auto mb-2 bg-white text-muted border"><i class="bi bi-people fs-3"></i></div>' +
        '<h6 class="fw-bold text-dark mb-1">No Candidates Selected</h6>' +
        '<p class="fs-12 text-muted mb-3">Please return to the Candidate List step to select and confirm candidates for this stage.</p>' +
        '<a href="#/circular/' + c.id + '/stage/' + stg.id + '/search" class="btn btn-sm btn-green-solid px-3 py-1.5"><i class="bi bi-people me-1"></i> Open Candidate List</a>' +
        '</div>');

    /* Trail Card Header Actions */
    var trailHeaderActions = '';
    if (!ap || ap.status === 'REJECTED') {
      if (isHrAdmin) {
        var isSendDisabled = !canSend;
        var btnTitle = approvers.length === 0
          ? 'Add approvers to send'
          : (!roster.length ? 'Confirm candidates to send' : 'Send for approval');

        trailHeaderActions =
          '<button type="button" class="btn btn-sm btn-green-solid px-3 py-1.5 fw-semibold shadow-xs d-flex align-items-center gap-2" id="btn-card-send"' +
          (isSendDisabled ? ' disabled="disabled" aria-disabled="true"' : '') +
          ' title="' + fmt.esc(btnTitle) + '">' +
          '<i class="bi bi-send-fill"></i> ' + (ap ? 'Send Revised Request' : 'Send for Approval') +
          '</button>';
      } else {
        trailHeaderActions =
          '<button type="button" class="btn btn-sm btn-secondary opacity-60 px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5" id="btn-card-send" disabled title="Only HR Admin · Senior Officer can send for approval">' +
          '<i class="bi bi-shield-lock"></i> Send for Approval (HR Admin only)' +
          '</button>';
      }
    } else if (isApproverTurn) {
      trailHeaderActions =
        '<div class="d-flex align-items-center gap-2">' +
        '<button type="button" class="btn btn-sm btn-success px-3 py-1.5 shadow-xs fw-semibold d-flex align-items-center gap-2" id="btn-card-approve">' +
        '<i class="bi bi-check2-circle"></i> Approve as ' + fmt.esc(me.name.split(' ')[0]) +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger px-2.5 py-1.5 fw-semibold d-flex align-items-center gap-2" id="btn-card-reject">' +
        '<i class="bi bi-x-circle"></i> Reject' +
        '</button>' +
        '</div>';
    } else if (ap && ap.status === 'PENDING') {
      trailHeaderActions =
        '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2.5 py-1 fs-11"><i class="bi bi-hourglass-split me-1"></i>Awaiting ' + fmt.esc((curLevel ? curLevel.name.split(' ')[0] : 'Approver')) + '</span>';
    } else if (ap && ap.status === 'APPROVED') {
      trailHeaderActions =
        '<span class="badge bg-success text-white rounded-pill px-2.5 py-1 fs-11"><i class="bi bi-check-circle-fill me-1"></i>Authorized</span>';
    }

    /* Stacked Layout: Management List (UP), Candidate roster being authorized (DOWN) */
    var body =
      '<div class="row g-3">' +
      '<!-- Top Section: Unified Management List -->' +
      '<div class="col-12">' +
      ui.card({
        title: 'Management List',
        hint: ap
          ? ('Requested by ' + fmt.esc(ap.createdBy) + ' · ' + fmt.dateTime(ap.createdAt))
          : ('Configured in Approval Channel: ' + approvers.length + ' level(s)'),
        actions: trailHeaderActions,
        body: (ap ? renderActiveTimeline(ap, me) : renderDraftTimeline(approvers))
      }) +
      '</div>' +

      '<!-- Bottom Section: Candidate Roster Selected -->' +
      '<div class="col-12">' +
      payload +
      '</div>' +
      '</div>';

    /* Bottom Action Bar */
    var action = {
      secondary: []
    };

    if (!state || !state.done) {
      if (!ap || ap.status === 'REJECTED') {
        action.primary = {
          id: 'btn-send',
          icon: 'bi-send',
          label: ap ? 'Send revised request' : 'Send for approval',
          disabled: !canSend || !isHrAdmin
        };
      }
      if (!required) action.secondary.push({ id: 'btn-skip', label: 'Skip — not needed' });
    } else {
      action.note = state.skipped ? 'This step was skipped' : 'Authorized';
    }

    if (isApproverTurn) {
      if (action.primary) action.secondary.push({ id: action.primary.id, label: action.primary.label });
      action.primary = {
        id: 'btn-approve',
        tone: 'success',
        icon: 'bi-check-lg',
        label: 'Approve as ' + me.name.split(' ')[0]
      };
      action.secondary.push({ id: 'btn-reject', label: 'Reject', tone: 'outline-danger' });
    }

    ui.stagePage(view, stg, STEP_KEY, { body: body, action: action });

    /* Candidate Table Pagination & Rendering (identical to applicantlist.js) */
    var currentPage = 1;
    var pageSize = 10;

    function renderTable() {
      var total = candidateList.length;
      var totalPages = Math.ceil(total / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      var startIndex = (currentPage - 1) * pageSize;
      var endIndex = Math.min(startIndex + pageSize, total);
      var pageItems = candidateList.slice(startIndex, endIndex);

      var tbody = view.querySelector('#candidates-tbody');
      if (!tbody) return;

      if (pageItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted fs-13">No candidates selected for this stage roster yet. Confirm candidates in Candidate List step.</td></tr>';
      } else {
        tbody.innerHTML = pageItems.map(function (cand, idx) {
          var rowNum = startIndex + idx + 1;
          return '<tr data-aid="' + cand.id + '" class="clickable" style="cursor: pointer;">' +
            '<td class="text-center num text-muted fs-12" style="width: 44px;">' + rowNum + '</td>' +
            '<td class="mono fw-bold fs-13 text-dark">' + fmt.esc(cand.rollNo) + '</td>' +
            '<td class="mono fs-12 text-secondary">' + fmt.esc(cand.appNo) + '</td>' +
            '<td>' +
            '<div class="name-cell">' +
            ui.avatar(cand.name, 'sm') +
            '<div>' +
            '<div class="n fs-13">' + fmt.esc(cand.name) + '</div>' +
            '<div class="m fs-11 text-muted">' + fmt.esc(cand.fatherName) + '</div>' +
            '</div>' +
            '</div>' +
            '</td>' +
            '<td class="fs-12 text-secondary">' + fmt.esc(cand.highestDegree) + '</td>' +
            '<td class="fs-12 text-secondary">' + fmt.esc(cand.district) + '</td>' +
            '<td class="mono fs-12 text-secondary">' + fmt.esc(cand.mobile) + '</td>' +
            '<td><span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11"><i class="bi bi-check2 me-1"></i>Selected</span></td>' +
            '<td class="text-center nowrap">' +
            '<button class="btn-tbl-action" data-view="' + cand.id + '" title="View Application"><i class="bi bi-eye"></i></button>' +
            '<button class="btn-tbl-action ms-1" data-pdf="' + cand.id + '" title="Print Profile"><i class="bi bi-printer"></i></button>' +
            '</td>' +
            '</tr>';
        }).join('');
      }

      var paginationBar = view.querySelector('#pagination-bar');
      if (paginationBar) {
        var pagesHtml = '';
        for (var p = 1; p <= totalPages; p++) {
          pagesHtml += '<button class="stage-page-btn ' + (p === currentPage ? 'is-active' : '') + '" data-page="' + p + '">' + p + '</button>';
        }

        paginationBar.innerHTML = '<div class="fs-12 text-secondary">' +
          'Showing ' + (total === 0 ? 0 : startIndex + 1) + ' to ' + endIndex + ' of ' + total + ' entries' +
          '</div>' +
          '<div class="d-flex align-items-center gap-1">' +
          '<button class="stage-page-btn" id="btn-page-prev"' + (currentPage === 1 ? ' disabled' : '') + '>Previous</button>' +
          pagesHtml +
          '<button class="stage-page-btn" id="btn-page-next"' + (currentPage === totalPages || totalPages === 0 ? ' disabled' : '') + '>Next</button>' +
          '</div>';

        paginationBar.querySelectorAll('[data-page]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            currentPage = parseInt(btn.dataset.page, 10);
            renderTable();
          });
        });
        var btnPrev = paginationBar.querySelector('#btn-page-prev');
        if (btnPrev) {
          btnPrev.addEventListener('click', function () {
            if (currentPage > 1) { currentPage--; renderTable(); }
          });
        }
        var btnNext = paginationBar.querySelector('#btn-page-next');
        if (btnNext) {
          btnNext.addEventListener('click', function () {
            if (currentPage < totalPages) { currentPage++; renderTable(); }
          });
        }
      }
    }

    renderTable();

    // Page size dropdown
    var selPageSize = view.querySelector('#sel-page-size');
    if (selPageSize) {
      selPageSize.addEventListener('change', function () {
        pageSize = parseInt(selPageSize.value, 10);
        currentPage = 1;
        renderTable();
      });
    }

    // Export Excel
    var btnExport = view.querySelector('#btn-export-Excel');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        var rows = candidateList.map(function (cand) {
          return [cand.rollNo, cand.appNo, cand.name, cand.highestDegree, cand.district, cand.mobile, cand.status];
        });
        if (ERec.exp && ERec.exp.Excel) {
          ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_' + pipe.typeLabel(stg.type) + '_roster.Excel',
            ['Roll', 'Application No', 'Candidate Name', 'Highest Degree', 'District', 'Mobile', 'Status'],
            rows);
        }
      });
    }

    // Print PDF list
    var btnPrintList = view.querySelector('#btn-print-pdf');
    if (btnPrintList) {
      btnPrintList.addEventListener('click', function () {
        if (ERec.exp && ERec.exp.printDoc) {
          ERec.exp.printDoc('applicant-list', stg.id);
        }
      });
    }

    // View Candidate Profile Drawer
    ui.on(view, '[data-view]', 'click', function (e, btn) {
      var aid = btn.dataset.view;
      var app = store.applicant(aid);
      if (app) {
        if (ERec.pages.applicantlist && ERec.pages.applicantlist.profileDrawer) {
          ERec.pages.applicantlist.profileDrawer(app);
        } else if (ERec.pages.applicants && ERec.pages.applicants.profileDrawer) {
          ERec.pages.applicants.profileDrawer(app);
        }
      }
    });

    // Row click anywhere opens Candidate Profile Drawer
    ui.on(view, '#candidates-tbody tr', 'click', function (e, tr) {
      if (e.target.closest('button') || e.target.closest('a')) return;
      var aid = tr.dataset.aid;
      var app = store.applicant(aid);
      if (app) {
        if (ERec.pages.applicantlist && ERec.pages.applicantlist.profileDrawer) {
          ERec.pages.applicantlist.profileDrawer(app);
        } else if (ERec.pages.applicants && ERec.pages.applicants.profileDrawer) {
          ERec.pages.applicants.profileDrawer(app);
        }
      }
    });

    // Print Profile
    ui.on(view, '[data-pdf]', 'click', function (e, btn) {
      var aid = btn.dataset.pdf;
      if (ERec.exp && ERec.exp.printDoc) {
        ERec.exp.printDoc('profile', aid);
      }
    });

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
        ui.toast('Cannot send: please ensure candidates are selected and approvers configured.', 'warning');
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
          store.audit('SKIP_APPROVAL', 'stage', stg.id, 'Applicant approval skipped');
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

  // Register Candidate Approval Page
  ERec.pages.approvecandidate = { render: render };
  ERec.pages.approveCandidate = ERec.pages.approvecandidate;

  // Candidate Approval API
  ERec.candidateApproval = {
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
