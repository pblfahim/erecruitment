/* Create Job Posting - Step 4: Approval Channel.
   Configures sequential approval channels for Candidate List Approval (APPLICANT)
   and Exam Venue Approval (VENUE) using a sequential card-based layout. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var PHASES = [
    {
      key: 'APPLICANT',
      stepKey: 'approval-applicant',
      label: 'Approval for Candidate List',
      shortLabel: 'Candidate List',
      icon: 'bi-person-check',
      badgeText: 'Applicant Roster',
      desc: 'Hierarchical review & authorization of the verified candidate roster prior to roll number assignment and admit card issuance.'
    },
    {
      key: 'VENUE',
      stepKey: 'approval-venue',
      label: 'Approval for Exam Venue',
      shortLabel: 'Exam Venue',
      icon: 'bi-building-check',
      badgeText: 'Venue & Seating',
      desc: 'Hierarchical review & authorization of examination venues, hall capacities, reporting times, and seating arrangements.'
    }
  ];

  /* ---------- Approval Actions & Modals ---------- */

  function isHrAdminUser(u) {
    u = u || store.actingUser();
    return !!(u && (u.role === 'HR_ADMIN' || u.id === 'u-hr'));
  }


  /* Edit Approvers Modal */
  function editApproversModal(stg, kind, c, onSave) {
    var me = store.actingUser();
    if (!isHrAdminUser(me)) {
      ui.toast('Only HR Admin · Senior Officer can configure approval sequence.', 'warning');
      return;
    }
    var field = kind === 'APPLICANT' ? 'applicantApprovers' : 'venueApprovers';
    var chosen = (stg[field] || []).slice();
    var approvers = store.where('users', function (u) { return u.role === 'APPROVER'; });

    function listHtml() {
      var picked = chosen.map(function (id, i) {
        var u = store.find('users', id) || { name: id, designation: 'Approver' };
        return '<div class="d-flex align-items-center gap-2 border rounded p-2 mb-2 bg-white shadow-sm">' +
          '<span class="pill green">Level ' + (i + 1) + '</span>' +
          '<div class="flex-grow-1 min-w-0">' +
          '<div class="fw-semibold fs-13 text-dark text-truncate">' + fmt.esc(u.name) + '</div>' +
          '<div class="fs-12 text-muted text-truncate">' + fmt.esc(u.designation) + '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-light border" data-up="' + id + '"' + (i === 0 ? ' disabled' : '') + ' title="Move Up"><i class="bi bi-arrow-up"></i></button>' +
          '<button type="button" class="btn btn-sm btn-light border" data-down="' + id + '"' + (i === chosen.length - 1 ? ' disabled' : '') + ' title="Move Down"><i class="bi bi-arrow-down"></i></button>' +
          '<button type="button" class="btn btn-sm btn-outline-danger" data-rm="' + id + '" title="Remove"><i class="bi bi-x-lg"></i></button>' +
          '</div>';
      }).join('');

      var avail = approvers.filter(function (u) { return chosen.indexOf(u.id) < 0; });
      return '<div class="fw-bold fs-13 text-dark mb-2"><i class="bi bi-diagram-3 me-1 text-success"></i> Configured Sequence (Approves in order)</div>' +
        (picked || '<div class="fs-13 text-muted mb-3 p-3 bg-light rounded border text-center">No approver selected. This approval step will be optional.</div>') +
        '<div class="fw-bold fs-13 text-dark mt-3 mb-2"><i class="bi bi-person-plus me-1 text-success"></i> Add Available Approvers</div>' +
        (avail.length ? avail.map(function (u) {
          return '<button type="button" class="btn btn-sm btn-light d-flex align-items-center gap-2 w-100 mb-2 text-start p-2 border" data-add="' + u.id + '">' +
            ui.avatar(u.name, 'sm') +
            '<span class="flex-grow-1 min-w-0">' +
            '<span class="d-block fw-semibold fs-13 text-dark text-truncate">' + fmt.esc(u.name) + '</span>' +
            '<span class="d-block fs-12 text-muted text-truncate">' + fmt.esc(u.designation) + '</span>' +
            '</span>' +
            '<i class="bi bi-plus-lg text-success ms-auto fs-14"></i></button>';
        }).join('') : '<div class="fs-12 text-muted p-2 bg-light rounded text-center">All available bank approvers have been added to this sequence.</div>');
    }

    ui.modal({
      title: 'Select Approvers for · ' + pipe.typeLabel(stg.type) + ' · ' + (kind === 'APPLICANT' ? 'Candidate List' : 'Exam Venues'),
      body: '<div id="ap-body">' + listHtml() + '</div>',
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-success px-4" data-act="save"><i class="bi bi-check2-circle me-1"></i> Save Routing Sequence</button>',
      onShow: function (api) {
        function rebind() {
          var body = api.find('#ap-body');
          body.innerHTML = listHtml();
          body.querySelectorAll('[data-add]').forEach(function (b) {
            b.addEventListener('click', function () { chosen.push(b.dataset.add); rebind(); });
          });
          body.querySelectorAll('[data-rm]').forEach(function (b) {
            b.addEventListener('click', function () {
              chosen = chosen.filter(function (x) { return x !== b.dataset.rm; });
              rebind();
            });
          });
          body.querySelectorAll('[data-up]').forEach(function (b) {
            b.addEventListener('click', function () {
              var i = chosen.indexOf(b.dataset.up);
              if (i > 0) { chosen.splice(i - 1, 0, chosen.splice(i, 1)[0]); rebind(); }
            });
          });
          body.querySelectorAll('[data-down]').forEach(function (b) {
            b.addEventListener('click', function () {
              var i = chosen.indexOf(b.dataset.down);
              if (i < chosen.length - 1) { chosen.splice(i + 1, 0, chosen.splice(i, 1)[0]); rebind(); }
            });
          });
        }
        rebind();
        api.find('[data-act="save"]').addEventListener('click', function () {
          var patch = {};
          patch[field] = chosen;
          patch._approversConfigured = true;
          stg[field] = chosen;
          stg._approversConfigured = true;
          store.update('stages', stg.id, patch);

          // If working on draft circular, ensure draft memory reflects it
          if (c && (c.id === 'draft' || c.isDraft) && c.stages) {
            for (var si = 0; si < c.stages.length; si++) {
              if (c.stages[si].id === stg.id) {
                c.stages[si][field] = chosen;
                c.stages[si]._approversConfigured = true;
              }
            }
            if (store.saveDraftCircular) store.saveDraftCircular(c);
          }

          store.audit('SET_APPROVERS', 'stage', stg.id, kind + ' approvers updated for ' + pipe.typeLabel(stg.type));
          api.close();
          ui.toast('Approval sequence saved successfully');
          if (onSave) onSave();
        });
      }
    });
  }

  /* Details Modal (Candidate List or Venue Plan) */
  function detailsModal(stg, kind) {
    var c = store.circular(stg.circularId) || (store.getDraftCircular ? store.getDraftCircular() : null);
    var roster = store.rosterOf(stg.id);
    var venues = store.venuesOf(stg.id);

    var body = kind === 'APPLICANT'
      ? '<div class="verify-summary mb-3 p-3 bg-light rounded border d-flex gap-4 justify-content-around text-center">' +
      '<div><div class="fs-4 fw-bold text-success">' + roster.length + '</div><div class="fs-12 text-muted">Total Candidates</div></div>' +
      '<div><div class="fs-4 fw-bold text-dark">' + roster.filter(function (r) { return r.rollNo; }).length + '</div><div class="fs-12 text-muted">Roll Numbers Allocated</div></div>' +
      '<div><div class="fs-4 fw-bold text-primary">' + (c ? c.vacancies : '—') + '</div><div class="fs-12 text-muted">Approved Vacancies</div></div>' +
      '</div>' +
      (roster.length
        ? '<div class="table-responsive" style="max-height:60vh"><table class="table table-striped table-hover align-middle table-x mb-0" id="table-approval-roster"><thead><tr>' +
        '<th>#</th><th>Roll</th><th>Application no.</th><th>Candidate</th><th>Father\'s name</th>' +
        '<th>Degree</th><th>Mobile</th></tr></thead><tbody>' +
        roster.map(function (r, i) {
          var a = store.applicant(r.applicantId) || {};
          return '<tr><td class="num muted">' + (i + 1) + '</td>' +
            '<td class="mono nowrap">' + fmt.esc(r.rollNo || '—') + '</td>' +
            '<td class="mono fs-12">' + fmt.esc(a.appNo || '—') + '</td>' +
            '<td class="fw-semibold">' + fmt.esc(a.name || '—') + '</td>' +
            '<td class="fs-12">' + fmt.esc(a.fatherName || '—') + '</td>' +
            '<td class="fs-12">' + fmt.esc(ERec.pages.applicants ? ERec.pages.applicants.highestEdu(a) : (a.highestDegree || '—')) + '</td>' +
            '<td class="mono fs-12">' + fmt.esc(a.mobile || '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : ui.empty('No candidates assigned to this stage roster yet'))
      : (venues.length
        ? venues.map(function (v) {
          var seated = roster.filter(function (r) {
            return r.rollNo && String(r.rollNo) >= String(v.rollFrom) && String(r.rollTo) && String(r.rollNo) <= String(v.rollTo);
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
        : ui.empty('No examination venue currently scheduled', 'Venues can be configured in the stage workspace.', 'bi-geo-alt'));

    ui.modal({
      title: (kind === 'APPLICANT' ? 'Candidate Roster List' : 'Exam Venue Allocation Plan') + ' · ' +
        fmt.esc(pipe.typeLabel(stg.type)) + ' · ' + fmt.esc(c ? c.post : ''),
      size: 'xl',
      body: body,
      footer: '<button class="btn btn-sm btn-light px-3" data-bs-dismiss="modal">Close</button>' +
        (kind === 'APPLICANT'
          ? '<button class="btn btn-sm btn-primary px-3" data-act="print"><i class="bi bi-printer me-1"></i> Print Roster</button>'
          : ''),
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

  /* ---------- Main Page Render ---------- */

  function render(view, params) {
    var cid = (params && params.cid) || '';
    var c = store.circular(cid);
    if (!c && store.getDraftCircular) {
      c = store.getDraftCircular();
    }
    if (!c) {
      ERec.router.go('#/circulars');
      return;
    }
    if (!c.id && (c.isDraft || cid === 'draft')) {
      c.id = 'draft';
    }

    var stages = (c.stages && c.stages.length) ? c.stages : store.stagesOf(c.id);
    if (!stages || !stages.length) {
      var defaultStgId = (c.id || 'draft') + '-S1';
      var defaultStg = {
        id: defaultStgId,
        circularId: c.id || 'draft',
        type: 'MCQ',
        seq: 1,
        name: 'MCQ Examination',
        requireApplicantApproval: true,
        requireVenueApproval: true,
        applicantApprovers: [],
        venueApprovers: [],
        instructions: '',
        examDate: null,
        fullMarks: 100,
        passMarks: 50,
        status: 'NOT_STARTED',
        steps: {}
      };
      if (c.stages) {
        c.stages = [defaultStg];
      } else {
        store.insert('stages', defaultStg);
      }
      stages = (c.stages && c.stages.length) ? c.stages : store.stagesOf(c.id);
    }

    stages.forEach(function (s) {
      if (!s._requirementsConfigured) {
        s.requireApplicantApproval = true;
        s.requireVenueApproval = true;
      }
      if (s.requireApplicantApproval === undefined) s.requireApplicantApproval = true;
      if (s.requireVenueApproval === undefined) s.requireVenueApproval = true;
      if (!Array.isArray(s.applicantApprovers)) s.applicantApprovers = [];
      if (!Array.isArray(s.venueApprovers)) s.venueApprovers = [];
    });

    // Ensure draft stages initially start with clean approvers unless explicitly configured
    if (c && (c.id === 'draft' || c.isDraft) && c.stages) {
      var modified = false;
      c.stages.forEach(function (s) {
        if (!s._requirementsConfigured) {
          s.requireApplicantApproval = true;
          s.requireVenueApproval = true;
          modified = true;
        }
        if (!s._approversConfigured && Array.isArray(s.applicantApprovers) && s.applicantApprovers.length > 0 && s.applicantApprovers[0] === 'u-gm') {
          s.applicantApprovers = [];
          s.venueApprovers = [];
          modified = true;
        }
      });
      if (modified && store.saveDraftCircular) {
        store.saveDraftCircular(c);
      }
    }

    var isDraft = c.isDraft || c.id === 'draft';
    var editStep1Url = isDraft ? '#/circulars/new' : ('#/circulars/new/' + c.id);

    ERec.router.setCrumbs([
      { label: 'Job Circulars', href: '#/circulars' },
      { label: isDraft ? 'Create Job Posting' : (c.title || c.post), href: isDraft ? editStep1Url : ('#/circular/' + c.id) },
      { label: 'Approval Channel' }
    ]);

    var activeStageId = stages[0].id;

    function buildViewHtml() {
      var stg = stages.find(function (s) { return s.id === activeStageId; }) || store.stage(activeStageId) || stages[0];
      activeStageId = stg.id;
      var me = store.actingUser();
      var isHrAdmin = isHrAdminUser(me);

      var appApprovers = stg.applicantApprovers || [];
      var venApprovers = stg.venueApprovers || [];
      var reqApplicant = stg.requireApplicantApproval !== false;
      var reqVenue = stg.requireVenueApproval !== false;

      /* Stage Selector UI (matches stage-nav-bar section) */
      var stageSelectorHtml = '';
      if (stages && stages.length > 0) {
        stageSelectorHtml =
          '<div class="stage-nav-bar stage-selector-container mb-4" style="border-radius: 8px 8px 0 0;">' +
          '<div class="stage-nav-tabs">' +
          stages.map(function (s) {
            var isActive = s.id === stg.id;
            var numApp = (s.applicantApprovers || []).length;
            var numVen = (s.venueApprovers || []).length;
            var hasConfigured = numApp > 0 || numVen > 0;
            var statusCls = '';
            if (isActive) {
              statusCls = 'is-active';
            } else if (hasConfigured) {
              statusCls = 'is-completed';
            }
            var iconHtml = isActive
              ? '<i class="bi bi-check-circle-fill text-white"></i>'
              : (statusCls === 'is-completed'
                ? '<i class="bi bi-check-circle-fill" style="color:#059669;"></i>'
                : '<i class="bi bi-check-circle text-muted"></i>');

            return '<button type="button" class="stage-nav-tab ' + statusCls + '" data-select-stage="' + s.id + '">' +
              iconHtml + ' ' + (stages.length > 1 ? ('Stage ' + s.seq + ': ') : '') + fmt.esc(pipe.typeLabel(s.type)) +
              '</button>';
          }).join('') +
          '</div>' +
          '</div>';
      }

      /* Helper to render approver stepper items */
      function renderApproverListHtml(list, kind) {
        if (!list || !list.length) {
          var isApp = kind === 'APPLICANT';
          var emptyBtnId = isApp ? 'btn-add-applicant-approvers-empty' : 'btn-add-venue-approvers-empty';
          var emptyIcon = isApp ? 'bi-person-plus text-success' : 'bi-building-add text-primary';
          var roleName = isApp ? 'candidate list' : 'exam venue';

          return '<div class="empty-seq-box text-center p-3 rounded-3 mb-3 bg-light border border-dashed">' +
            '<div class="empty-icon-wrap mx-auto mb-2 ' + (isApp ? 'text-success' : 'text-primary') + '">' +
            '<i class="bi ' + emptyIcon + ' fs-3"></i>' +
            '</div>' +
            '<div class="fw-bold fs-13 text-dark mb-1">No Approvers Selected</div>' +
            '<div class="fs-12 text-muted mb-3 mx-auto" style="max-width: 320px;">' +
            'No approver sequence configured yet. Add executives to establish the ' + roleName + ' review routing.' +
            '</div>' +
            (isHrAdmin
              ? '<button type="button" class="btn btn-sm ' + (isApp ? 'btn-outline-success' : 'btn-outline-primary') + ' rounded-pill px-3 py-1.5 fw-semibold shadow-2xs" id="' + emptyBtnId + '">' +
              '<i class="bi bi-plus-lg me-1"></i> Add Approvers' +
              '</button>'
              : '<button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 fw-semibold opacity-50" disabled title="Only HR Admin · Senior Officer can configure approvers">' +
              '<i class="bi bi-lock me-1"></i> Add Approvers (HR Admin only)' +
              '</button>') +
            '</div>';
        }

        return '<div class="approval-seq-list mb-3">' + list.map(function (id, i) {
          var u = store.find('users', id) || { name: id, designation: 'Approver' };
          return '<div class="approval-seq-item">' +
            '<span class="seq-level-badge">' + (i + 1) + '</span>' +
            ui.avatar(u.name, 'sm') +
            '<div class="flex-grow-1 min-w-0">' +
            '<div class="seq-user-name text-truncate">' + fmt.esc(u.name) + '</div>' +
            '<div class="seq-user-role text-truncate">' + fmt.esc(u.designation) + '</div>' +
            '</div>' +
            '<span class="badge bg-light text-secondary border fs-10 font-monospace">Level ' + (i + 1) + '</span>' +
            '</div>';
        }).join('') + '</div>';
      }

      /* Card 1: Approval for Candidate List */
      var candidateCardHtml =
        '<div class="col-12 col-lg-6 d-flex flex-column">' +
        '<div class="card card-posting-section h-100 shadow-2xs">' +
        '<div class="card-posting-head d-flex align-items-center justify-content-between flex-wrap gap-2 px-3.5 py-3 bg-white border-bottom">' +
        '<div class="d-flex align-items-center gap-2 min-w-0">' +
        '<div class="header-icon-box bg-success-subtle text-success rounded-3" style="width: 38px; height: 38px; font-size: 18px;">' +
        '<i class="bi bi-person-check-fill"></i>' +
        '</div>' +
        '<div class="min-w-0">' +
        '<div class="fw-bold fs-14 text-dark lh-sm text-truncate">Approval for Candidate List</div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2">' +
        (isHrAdmin
          ? '<button type="button" class="btn btn-sm btn-outline-success px-2 py-1 fw-semibold shadow-2xs " id="btn-edit-applicant-approvers" title="Configure candidate list approvers">' +
          '<i class="bi bi-pencil-square me-1"></i>' + (appApprovers.length ? 'Edit Approvers' : 'Add Approvers') +
          '</button>'
          : '<button type="button" class="btn btn-sm btn-outline-secondary px-2 py-1 fw-semibold opacity-50" disabled title="Only HR Admin · Senior Officer can configure approvers">' +
          '<i class="bi bi-lock me-1"></i>Edit Approvers' +
          '</button>') +
        '</div>' +
        '</div>' +
        '<div class="card-posting-body p-3.5 d-flex flex-column justify-content-between flex-grow-1">' +
        '<div>' +
        renderApproverListHtml(appApprovers, 'APPLICANT') +
        '</div>' +
        '<div class="pt-3 border-top mt-auto">' +
        '<div class="approval-mandatory-box ' + (reqApplicant ? 'is-active' : '') + ' d-flex align-items-center justify-content-between p-2 rounded-3">' +
        '<div class="d-flex align-items-center gap-2 min-w-0">' +
        '<div class="header-icon-box ' + (reqApplicant ? 'bg-success-subtle text-success' : 'bg-light text-muted') + ' rounded-circle" style="width: 34px; height: 34px; font-size: 16px;">' +
        '<i class="bi ' + (reqApplicant ? 'bi-shield-check' : 'bi-shield') + '"></i>' +
        '</div>' +
        '<div class="min-w-0">' +
        '<label class="fw-semibold text-dark fs-12 mb-0 d-block cursor-pointer" for="f-required-applicant">Mandatory Sign-off (Candidate List)</label>' +
        '<div class="fs-11 text-muted text-truncate">' +
        (reqApplicant ? 'Requires authorization from all configured levels for Stage ' + stg.seq : 'Sign-off is optional for Stage ' + stg.seq) +
        (!isHrAdmin ? ' &middot; <span class="text-secondary">(HR Admin only)</span>' : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="form-check form-switch m-0 d-flex align-items-center ps-0">' +
        '<input class="form-check-input m-0 cursor-pointer" type="checkbox" id="f-required-applicant"' + (reqApplicant ? ' checked' : '') +
        (!isHrAdmin ? ' disabled title="Only HR Admin · Senior Officer can change mandatory sign-off"' : '') +
        ' role="switch" style="width: 36px; height: 18px;">' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      /* Card 2: Approval for Exam Venue */
      var venueCardHtml =
        '<div class="col-12 col-lg-6 d-flex flex-column">' +
        '<div class="card card-posting-section h-100 shadow-2xs">' +
        '<div class="card-posting-head d-flex align-items-center justify-content-between flex-wrap gap-2 px-3.5 py-3 bg-white border-bottom">' +
        '<div class="d-flex align-items-center gap-2 min-w-0">' +
        '<div class="header-icon-box bg-primary-subtle text-primary rounded-3" style="width: 38px; height: 38px; font-size: 18px;">' +
        '<i class="bi bi-building-check"></i>' +
        '</div>' +
        '<div class="min-w-0">' +
        '<div class="fw-bold fs-14 text-dark lh-sm text-truncate">Approval for Exam Venue</div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2">' +
        (isHrAdmin
          ? '<button type="button" class="btn btn-sm btn-outline-success px-2 py-1 fw-semibold shadow-2xs" id="btn-edit-venue-approvers" title="Configure exam venue approvers">' +
          '<i class="bi bi-pencil-square me-1"></i>' + (venApprovers.length ? 'Edit Approvers' : 'Add Approvers') +
          '</button>'
          : '<button type="button" class="btn btn-sm btn-outline-secondary px-2 py-1 fw-semibold opacity-50" disabled title="Only HR Admin · Senior Officer can configure approvers">' +
          '<i class="bi bi-lock me-1"></i>Edit Approvers' +
          '</button>') +
        '</div>' +
        '</div>' +
        '<div class="card-posting-body p-3.5 d-flex flex-column justify-content-between flex-grow-1">' +
        '<div>' +
        renderApproverListHtml(venApprovers, 'VENUE') +
        '</div>' +
        '<div class="pt-3 border-top mt-auto">' +
        '<div class="approval-mandatory-box ' + (reqVenue ? 'is-active' : '') + ' d-flex align-items-center justify-content-between p-2 rounded-3">' +
        '<div class="d-flex align-items-center gap-2 min-w-0">' +
        '<div class="header-icon-box ' + (reqVenue ? 'bg-primary-subtle text-primary' : 'bg-light text-muted') + ' rounded-circle" style="width: 34px; height: 34px; font-size: 16px;">' +
        '<i class="bi ' + (reqVenue ? 'bi-shield-check' : 'bi-shield') + '"></i>' +
        '</div>' +
        '<div class="min-w-0">' +
        '<label class="fw-semibold text-dark fs-12 mb-0 d-block cursor-pointer" for="f-required-venue">Mandatory Sign-off (Exam Venue)</label>' +
        '<div class="fs-11 text-muted text-truncate">' +
        (reqVenue ? 'Requires authorization from all configured levels for Stage ' + stg.seq : 'Sign-off is optional for Stage ' + stg.seq) +
        (!isHrAdmin ? ' &middot; <span class="text-secondary">(HR Admin only)</span>' : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="form-check form-switch m-0 d-flex align-items-center ps-0">' +
        '<input class="form-check-input m-0 cursor-pointer" type="checkbox" id="f-required-venue"' + (reqVenue ? ' checked' : '') +
        (!isHrAdmin ? ' disabled title="Only HR Admin · Senior Officer can change mandatory sign-off"' : '') +
        ' role="switch" style="width: 36px; height: 18px;">' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      /* Main container return */
      return '<div class="create-job-posting-container">' +
        ui.postingWizard(4, c.id) +
        stageSelectorHtml +
        '<div class="row g-4 mb-4">' +
        candidateCardHtml +
        venueCardHtml +
        '</div>' +

        '<!-- Bottom Actions Row -->' +
        '<div class="circular-action-bar d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4">' +
        '<button type="button" class="btn btn-outline-secondary btn-cancel-posting" id="btn-prev-step">' +
        '<i class="bi bi-arrow-left me-1"></i> Previous (Job Preview)' +
        '</button>' +
        '<div class="d-flex align-items-center gap-3 flex-wrap">' +
        '<button type="button" class="btn btn-outline-success" id="btn-save-draft">' +
        '<i class="bi bi-save me-1"></i>Save as Draft' +
        '</button>' +
        '<button type="button" class="btn btn-save-next" id="btn-publish-posting">' +
        '<i class="bi bi-check2-circle me-1"></i> Publish Circular' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }

    function renderView() {
      view.innerHTML = buildViewHtml();
      ui.bindPostingWizard(view);
      bindViewEvents();
    }

    function bindViewEvents() {
      var stg = stages.find(function (s) { return s.id === activeStageId; }) || store.stage(activeStageId) || stages[0];
      var me = store.actingUser();
      var isHrAdmin = isHrAdminUser(me);

      // Stage selector tabs
      view.querySelectorAll('[data-select-stage]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeStageId = btn.dataset.selectStage;
          renderView();
        });
      });

      // Edit / Add Candidate List Approvers
      view.querySelectorAll('#btn-edit-applicant-approvers, #btn-add-applicant-approvers-empty').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!isHrAdmin) {
            ui.toast('Only HR Admin · Senior Officer can configure approval routing.', 'warning');
            return;
          }
          editApproversModal(stg, 'APPLICANT', c, renderView);
        });
      });

      // Edit / Add Exam Venue Approvers
      view.querySelectorAll('#btn-edit-venue-approvers, #btn-add-venue-approvers-empty').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!isHrAdmin) {
            ui.toast('Only HR Admin · Senior Officer can configure approval routing.', 'warning');
            return;
          }
          editApproversModal(stg, 'VENUE', c, renderView);
        });
      });

      // Mandatory sign-off switch (Candidate List)
      var reqAppSwitch = view.querySelector('#f-required-applicant');
      if (reqAppSwitch) {
        reqAppSwitch.addEventListener('change', function () {
          if (!isHrAdmin) {
            reqAppSwitch.checked = !reqAppSwitch.checked;
            ui.toast('Only HR Admin · Senior Officer can change mandatory sign-off requirement.', 'warning');
            return;
          }
          var isChecked = reqAppSwitch.checked;
          stg.requireApplicantApproval = isChecked;
          stg._requirementsConfigured = true;
          store.update('stages', stg.id, { requireApplicantApproval: isChecked, _requirementsConfigured: true });

          if (c && (c.id === 'draft' || c.isDraft) && c.stages) {
            for (var si = 0; si < c.stages.length; si++) {
              if (c.stages[si].id === stg.id) {
                c.stages[si].requireApplicantApproval = isChecked;
                c.stages[si]._requirementsConfigured = true;
              }
            }
            if (store.saveDraftCircular) store.saveDraftCircular(c);
          }

          store.audit('SET_APPROVAL_REQUIREMENT', 'stage', stg.id,
            'Candidate List approval required flag set to ' + isChecked + ' for Stage ' + stg.seq + ' (' + pipe.typeLabel(stg.type) + ')');
          ui.toast('Mandatory sign-off ' + (isChecked ? 'enabled' : 'disabled') + ' for Candidate List (Stage ' + stg.seq + ')');
          renderView();
        });
      }

      // Mandatory sign-off switch (Exam Venue)
      var reqVenSwitch = view.querySelector('#f-required-venue');
      if (reqVenSwitch) {
        reqVenSwitch.addEventListener('change', function () {
          if (!isHrAdmin) {
            reqVenSwitch.checked = !reqVenSwitch.checked;
            ui.toast('Only HR Admin · Senior Officer can change mandatory sign-off requirement.', 'warning');
            return;
          }
          var isChecked = reqVenSwitch.checked;
          stg.requireVenueApproval = isChecked;
          stg._requirementsConfigured = true;
          store.update('stages', stg.id, { requireVenueApproval: isChecked, _requirementsConfigured: true });

          if (c && (c.id === 'draft' || c.isDraft) && c.stages) {
            for (var si = 0; si < c.stages.length; si++) {
              if (c.stages[si].id === stg.id) {
                c.stages[si].requireVenueApproval = isChecked;
                c.stages[si]._requirementsConfigured = true;
              }
            }
            if (store.saveDraftCircular) store.saveDraftCircular(c);
          }

          store.audit('SET_APPROVAL_REQUIREMENT', 'stage', stg.id,
            'Exam Venue approval required flag set to ' + isChecked + ' for Stage ' + stg.seq + ' (' + pipe.typeLabel(stg.type) + ')');
          ui.toast('Mandatory sign-off ' + (isChecked ? 'enabled' : 'disabled') + ' for Exam Venue (Stage ' + stg.seq + ')');
          renderView();
        });
      }

      // Header Back button
      var backBtn = view.querySelector('#btn-back');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          ERec.router.go('#/circulars');
        });
      }

      // Previous Step (Job Preview)
      var prevBtn = view.querySelector('#btn-prev-step');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          ERec.router.go('#/circulars/new-preview/' + (c.isDraft || c.id === 'draft' ? 'draft' : c.id));
        });
      }

      // Save as Draft
      var saveDraftBtn = view.querySelector('#btn-save-draft');
      if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function () {
          if (isDraft) {
            store.saveDraftCircular(c);
            ui.toast('Circular draft progress saved. It will be officially created when published.', 'info');
            ERec.router.go('#/circulars');
          } else {
            store.update('circulars', c.id, { status: 'DRAFT' });
            store.audit('DRAFT_CIRCULAR', 'circular', c.id, 'Saved circular ' + c.code + ' as draft configuration');
            if (ERec.app && ERec.app.renderNav) {
              ERec.app.renderNav();
            }
            ui.toast('Circular ' + c.code + ' saved as draft', 'info');
            ERec.router.go('#/circulars');
          }
        });
      }

      // Publish Circular
      var publishBtn = view.querySelector('#btn-publish-posting');
      if (publishBtn) {
        publishBtn.addEventListener('click', function () {
          ui.confirm({
            title: 'Publish Job Circular',
            body: 'Are you sure you want to publish <strong>' + fmt.esc(c.title || c.post) + '</strong> (' + fmt.esc(c.code) + ')? This will create the recruitment circular in the database and enable applicant processing.',
            okText: 'Publish Circular',
            danger: false
          }).then(function (ok) {
            if (!ok) return;

            var finalCirc;
            if (isDraft) {
              finalCirc = store.publishDraftCircular(c);
            } else {
              store.update('circulars', c.id, { status: 'ACTIVE' });
              store.audit('PUBLISH_CIRCULAR', 'circular', c.id, 'Published job circular ' + c.code + ' (' + c.post + ')');
              finalCirc = c;
            }

            if (ERec.app && ERec.app.renderNav) {
              ERec.app.renderNav();
            }
            ui.toast('Job Circular ' + finalCirc.code + ' created and published successfully! Redirecting to circular workspace...', 'success');
            setTimeout(function () {
              ERec.router.go('#/circular/' + finalCirc.id);
            }, 600);
          });
        });
      }
    }
    renderView();
  }

  ERec.pages.newcircularApproval = { render: render, editApproversModal: editApproversModal, detailsModal: detailsModal };
  ERec.pages.createcircularApproval = ERec.pages.newcircularApproval;
})(window);