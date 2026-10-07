/* Circular workspace: configure the exam stage chain, set approver chains,
   and see the whole pipeline at a glance. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var TYPES = ['MCQ', 'WRITTEN', 'VIVA'];

  /* Ordered approver picker - the order of selection is the approval order.
     Opened from the approval step, which is where approvers are set up. */
  function editApprovers(stg, kind) {
    var field = kind === 'APPLICANT' ? 'applicantApprovers' : 'venueApprovers';
    var chosen = (stg[field] || []).slice();
    var approvers = store.where('users', function (u) { return u.role === 'APPROVER'; });

    function listHtml() {
      var picked = chosen.map(function (id, i) {
        var u = store.find('users', id);
        return '<div class="d-flex align-items-center gap-2 border rounded p-2 mb-2">' +
          '<span class="pill green">Level ' + (i + 1) + '</span>' +
          '<div class="flex-grow-1"><div class="fw-semibold fs-13">' + fmt.esc(u.name) + '</div>' +
          '<div class="fs-12 muted">' + fmt.esc(u.designation) + '</div></div>' +
          '<button class="btn btn-sm btn-light" data-up="' + id + '"' + (i === 0 ? ' disabled' : '') + ' title="Move Up"><i class="bi bi-arrow-up"></i></button>' +
          '<button class="btn btn-sm btn-light" data-down="' + id + '"' + (i === chosen.length - 1 ? ' disabled' : '') + ' title="Move Down"><i class="bi bi-arrow-down"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger" data-rm="' + id + '" title="Remove"><i class="bi bi-x-lg"></i></button>' +
          '</div>';
      }).join('');

      var avail = approvers.filter(function (u) { return chosen.indexOf(u.id) < 0; });
      return '<div class="section-title">Approval sequence</div>' +
        (picked || '<div class="fs-13 muted mb-2">No approver selected — this approval step can still be skipped.</div>') +
        '<div class="section-title">Add approver</div>' +
        (avail.length ? avail.map(function (u) {
          return '<button class="btn btn-sm btn-light d-flex align-items-center gap-2 w-100 mb-2 text-start p-2 border" data-add="' + u.id + '">' +
            ui.avatar(u.name, 'sm') +
            '<span><span class="d-block fw-semibold fs-13">' + fmt.esc(u.name) + '</span>' +
            '<span class="d-block fs-12 muted">' + fmt.esc(u.designation) + '</span></span>' +
            '<i class="bi bi-plus-lg ms-auto"></i></button>';
        }).join('') : '<div class="fs-12 muted">All approvers added.</div>');
    }

    var m = ui.modal({
      title: 'Configure Approvers &middot; ' + pipe.typeLabel(stg.type) + ' &middot; ' + (kind === 'APPLICANT' ? 'Candidate Roster' : 'Exam Venues'),
      body: '<div id="ap-body">' + listHtml() + '</div>',
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-green-solid px-4" data-act="save"><i class="bi bi-check2-circle me-1"></i> Save Routing Sequence</button>',
      onShow: function (api) {
        function rebind() {
          var body = api.find('#ap-body');
          body.innerHTML = listHtml();
          body.querySelectorAll('[data-add]').forEach(function (b) {
            b.addEventListener('click', function () { chosen.push(b.dataset.add); rebind(); });
          });
          body.querySelectorAll('[data-rm]').forEach(function (b) {
            b.addEventListener('click', function () {
              chosen = chosen.filter(function (x) { return x !== b.dataset.rm; }); rebind();
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
          store.update('stages', stg.id, patch);
          store.audit('SET_APPROVERS', 'stage', stg.id, kind + ' approvers updated for ' + pipe.typeLabel(stg.type));
          api.close();
          ui.toast('Approval sequence saved');
          ERec.router.refresh();
        });
      }
    });
    return m;
  }

  /* ---------- eligibility rule builder ----------
     One dropdown picks the rule type; only that type's fields are shown, and
     the preview line restates the rule in plain English as it is filled in. */

  function rulesOf(c) { return c.eligibilityRules || []; }

  function saveRules(c, list, note) {
    store.update('circulars', c.id, { eligibilityRules: list });
    store.audit('EDIT_RULES', 'circular', c.id, note);
    ERec.router.refresh();
  }

  /* The fields that belong to each rule type. */
  function ruleFieldsHtml(r) {
    var levels = '<option value="">Select one</option>' + ERec.seed.DEGREE_LEVELS.map(function (l) {
      return '<option value="' + l + '"' + (r.degreeLevel === l ? ' selected' : '') + '>' + l + '</option>';
    }).join('');

    switch (r.type) {
      case 'AGE':
        return '<div class="row g-3">' +
          '<div class="col-md-6"><label class="form-label">Maximum Age <span class="text-danger">*</span></label>' +
          '<input type="number" min="14" max="70" class="form-control" data-f="maxAge" value="' +
          fmt.esc(r.maxAge || '') + '" placeholder="e.g. 30"></div>' +
          '<div class="col-md-6"><label class="form-label">Age counted as on <span class="text-danger">*</span></label>' +
          '<input type="date" class="form-control" data-f="asOn" value="' + fmt.esc(r.asOn || '') + '">' +
          '</div></div>';

      case 'EXPERIENCE':
        return '<label class="form-label">Minimum Years of Experience <span class="text-danger">*</span></label>' +
          '<input type="number" min="0" max="40" step="0.5" class="form-control mb-3" data-f="minYears" value="' +
          fmt.esc(r.minYears || '') + '" placeholder="e.g. 2">' +
          '<label class="form-label">Industry (optional)</label>' +
          '<input class="form-control" data-f="industry" value="' + fmt.esc(r.industry || '') + '" placeholder="e.g. Banking">' +
          '<div class="form-text mb-3">Only experience where the applicant selected this industry counts towards the total.</div>' +
          '<label class="form-label">Designation keywords (optional, comma-separated)</label>' +
          '<input class="form-control mb-3" data-f="designationKeywords" value="' +
          fmt.esc(r.designationKeywords || '') + '" placeholder="e.g. Officer, Executive">' +
          '<label class="form-label">Responsibility keywords (optional, comma-separated)</label>' +
          '<input class="form-control" data-f="responsibilityKeywords" value="' +
          fmt.esc(r.responsibilityKeywords || '') + '" placeholder="e.g. accounting, audit">' +
          '<div class="form-text">Only experience where the job title or responsibilities contain one of these words counts towards the total.</div>';

      case 'DEGREE_LEVEL':
        return '<label class="form-label">Minimum Degree Level <span class="text-danger">*</span></label>' +
          '<select class="form-select mb-3" data-f="degreeLevel">' + levels + '</select>' +
          '<div class="form-check">' +
          '<input class="form-check-input" type="checkbox" id="r-mandatory" data-f="mandatory"' +
          (r.mandatory === false ? '' : ' checked') + '>' +
          '<label class="form-check-label fw-semibold" for="r-mandatory">Mandatory</label>' +
          '</div>' +
          '<div class="form-text">Untick "Mandatory" to just prefer this degree without disqualifying applicants who don\'t have it.</div>';

      case 'RESULT_GRADE': {
        var curDiv = r.divisionText || 'Third';
        var divOptions = ['First', 'Second', 'Third'].map(function (d) {
          return '<option value="' + d + '"' + (curDiv === d ? ' selected' : '') + '>' + d + '</option>';
        }).join('');

        return '<label class="form-label">Division/Class text (fails if any result contains this) <span class="text-danger">*</span></label>' +
          '<select class="form-select mb-3" data-f="divisionText">' + divOptions + '</select>' +
          '<label class="form-label">Minimum GPA (Secondary, Higher Secondary), on a 05.0 scale <span class="text-danger">*</span></label>' +
          '<input type="number" step="0.01" min="0" max="5.00" class="form-control mb-3" data-f="minGpa" value="' +
          fmt.esc(r.minGpa !== undefined && r.minGpa !== null ? r.minGpa : '') + '" placeholder="e.g. 3.50">' +
          '<label class="form-label">Minimum CGPA (Bachelor or Higher Degree), on a 04.0 scale <span class="text-danger">*</span></label>' +
          '<input type="number" step="0.01" min="0" max="4.00" class="form-control mb-3" data-f="minCgpa" value="' +
          fmt.esc(r.minCgpa !== undefined && r.minCgpa !== null ? r.minCgpa : '') + '" placeholder="e.g. 3.00">' +
          '<div class="form-text">Specify the division/class restriction, the minimum SSC/HSC GPA (out of 05.00), and the minimum Bachelor/Higher degree CGPA (out of 04.00).</div>';
      }

      case 'SUBJECT':
        return '<label class="form-label">Degree Level</label>' +
          '<select class="form-select mb-3" data-f="degreeLevel">' + levels + '</select>' +
          '<label class="form-label">Allowed subjects (comma-separated) <span class="text-danger">*</span></label>' +
          '<input class="form-control" data-f="allowedSubjects" value="' +
          fmt.esc(r.allowedSubjects || '') + '" placeholder="e.g. Accounting, Finance, Management">' +
          '<div class="form-text">Applicant\'s result at this degree level must be in one of these subjects.</div>';

      default:
        return '';
    }
  }

  function ruleModal(c, existing) {
    /* Work on a copy so Cancel really cancels. */
    var r = existing
      ? JSON.parse(JSON.stringify(existing))
      : ERec.seed.blankRule('AGE');
    if (!existing && r.type === 'DEGREE_LEVEL') r.degreeLevel = '';

    ui.modal({
      title: '<i class="bi bi-shield-check text-success me-2"></i>' +
        (existing ? 'Edit Eligibility Rule' : 'Add Eligibility Rule'),
      size: 'lg',
      body:
        '<div class="row g-3 mb-1">' +
        '<div class="col-md-7"><label class="form-label">Rule Type <span class="text-danger">*</span></label>' +
        '<select class="form-select" id="r-type">' +
        ERec.seed.RULE_TYPES.map(function (t) {
          return '<option value="' + t.key + '"' + (r.type === t.key ? ' selected' : '') + '>' +
            fmt.esc(t.label) + '</option>';
        }).join('') + '</select>' +
        '<div class="form-text">These ' + ERec.seed.RULE_TYPES.length +
        ' types are the only ones the eligibility engine actually evaluates.</div></div>' +
        '<div class="col-md-5"><label class="form-label">Status</label>' +
        '<select class="form-select" id="r-status">' +
        '<option value="ACTIVE"' + (r.status !== 'INACTIVE' ? ' selected' : '') + '>Active</option>' +
        '<option value="INACTIVE"' + (r.status === 'INACTIVE' ? ' selected' : '') + '>Inactive</option>' +
        '</select></div>' +
        '</div>' +

        '<label class="form-label">Rule Name / Title <span class="text-danger">*</span></label>' +
        '<input class="form-control mb-3" id="r-name" value="' + fmt.esc(r.name || '') +
        '" placeholder="e.g., Minimum Age Requirement, SSC GPA >= 3.5">' +

        '<div id="r-fields">' + ruleFieldsHtml(r) + '</div>' +

        '<label class="form-label mt-3">Preview</label>' +
        '<div class="preview-box fst-italic" id="r-preview">' + fmt.esc(ERec.seed.describeRule(r)) + '</div>' +

        '<label class="form-label mt-3">Failure Message</label>' +
        '<input class="form-control" id="r-fail" value="' + fmt.esc(r.failureMessage || '') +
        '" placeholder="e.g., Applicant must be between 21 and 30 years old.">',
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-green-solid px-4" data-act="save">' +
        '<i class="bi bi-check2 me-1"></i> Save Rule</button>',
      onShow: function (api) {
        /* Pull whatever the type-specific inputs currently hold into `r`. */
        function collect() {
          api.el.querySelectorAll('[data-f]').forEach(function (el) {
            r[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim();
          });
          r.name = api.find('#r-name').value.trim();
          r.status = api.find('#r-status').value;
          r.failureMessage = api.find('#r-fail').value.trim();
        }

        function paintPreview() {
          collect();
          api.find('#r-preview').textContent = ERec.seed.describeRule(r);
        }

        /* Changing the type swaps the whole field set, keeping name/status. */
        api.find('#r-type').addEventListener('change', function (e) {
          var keep = { id: r.id, name: r.name, status: r.status, failureMessage: r.failureMessage };
          r = Object.assign(ERec.seed.blankRule(e.target.value), keep);
          if (r.type === 'DEGREE_LEVEL') r.degreeLevel = '';
          api.find('#r-fields').innerHTML = ruleFieldsHtml(r);
          paintPreview();
        });

        ui.on(api.el, '[data-f]', 'input', paintPreview);
        ui.on(api.el, '[data-f]', 'change', paintPreview);
        api.find('#r-name').addEventListener('input', collect);
        api.find('#r-fail').addEventListener('input', collect);
        paintPreview();

        api.find('[data-act="save"]').addEventListener('click', function () {
          collect();
          if (!r.name) { ui.toast('Give the rule a name', 'warning'); return; }
          if (r.type === 'AGE') {
            if (!r.maxAge) { ui.toast('Set a maximum age', 'warning'); return; }
            if (!r.asOn) { ui.toast('Select the date for "Age counted as on"', 'warning'); return; }
          }
          if (r.type === 'EXPERIENCE' && !r.minYears) {
            ui.toast('Set the minimum years of experience', 'warning'); return;
          }
          if (r.type === 'DEGREE_LEVEL' && !r.degreeLevel) {
            ui.toast('Select a minimum degree level', 'warning'); return;
          }
          if (r.type === 'RESULT_GRADE') {
            if (!r.divisionText) { ui.toast('Select the division/class text', 'warning'); return; }
            if (r.minGpa === '' || r.minGpa === null || isNaN(r.minGpa)) {
              ui.toast('Set the Minimum GPA (Secondary, Higher Secondary)', 'warning');
              return;
            }
            if (parseFloat(r.minGpa) > 5) {
              ui.toast('Minimum GPA cannot exceed 05.00', 'warning');
              return;
            }
            if (parseFloat(r.minGpa) < 0) {
              ui.toast('Minimum GPA cannot be negative', 'warning');
              return;
            }
            if (r.minCgpa === '' || r.minCgpa === null || isNaN(r.minCgpa)) {
              ui.toast('Set the Minimum CGPA (Bachelor or Higher Degree)', 'warning');
              return;
            }
            if (parseFloat(r.minCgpa) > 4) {
              ui.toast('Minimum CGPA cannot exceed 04.00', 'warning');
              return;
            }
            if (parseFloat(r.minCgpa) < 0) {
              ui.toast('Minimum CGPA cannot be negative', 'warning');
              return;
            }
          }
          if (r.type === 'SUBJECT' && !ERec.seed.ExcelList(r.allowedSubjects).length) {
            ui.toast('List at least one allowed subject', 'warning'); return;
          }

          var list = rulesOf(c).slice();
          var i = list.findIndex(function (x) { return x.id === r.id; });
          if (i >= 0) list[i] = r; else list.push(r);
          saveRules(c, list, (existing ? 'Rule updated: ' : 'Rule added: ') + r.name);
          api.close();
          ui.toast(existing ? 'Rule updated' : 'Rule added');
        });
      }
    });
  }

  /* Copy the whole rule set across from another circular. */
  function copyRulesModal(c) {
    var others = store.where('circulars', function (x) {
      return x.id !== c.id && (x.eligibilityRules || []).length;
    });
    if (!others.length) {
      ui.modal({
        title: 'Copy Rules From',
        body: ui.empty('No other circular has rules yet',
          'Add rules to another circular first, then you can copy them here.', 'bi-shield-exclamation'),
        footer: '<button class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>'
      });
      return;
    }
    ui.modal({
      title: '<i class="bi bi-files text-success me-2"></i>Copy Rules From',
      body: '<p class="fs-13 text-muted">The selected circular\'s rules are appended to this one. ' +
        'Existing rules are kept.</p>' +
        others.map(function (x) {
          return '<button class="btn btn-light d-flex align-items-center gap-2 w-100 mb-2 text-start p-2 border" ' +
            'data-from="' + x.id + '">' +
            '<span class="flex-grow-1"><span class="d-block fw-semibold fs-13">' + fmt.esc(x.post) + '</span>' +
            '<span class="d-block fs-12 muted mono">' + fmt.esc(x.code) + '</span></span>' +
            '<span class="badge bg-light text-secondary border">' +
            fmt.plural((x.eligibilityRules || []).length, 'rule') + '</span>' +
            '<i class="bi bi-arrow-right ms-1"></i></button>';
        }).join(''),
      footer: '<button class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>',
      onShow: function (api) {
        ui.on(api.el, '[data-from]', 'click', function (e, b) {
          var src = store.circular(b.dataset.from);
          /* fresh ids, so editing a copy never touches the original */
          var copied = (src.eligibilityRules || []).map(function (x) {
            return Object.assign({}, x, { id: fmt.uid('rul') });
          });
          saveRules(c, rulesOf(c).concat(copied), fmt.plural(copied.length, 'rule') + ' copied from ' + src.post);
          api.close();
          ui.toast(fmt.plural(copied.length, 'rule') + ' copied from ' + src.post);
        });
      }
    });
  }

  function stageHasProgress(stg) {
    return Object.keys(stg.steps || {}).length > 0;
  }

  function resequence(circularId) {
    store.stagesOf(circularId).forEach(function (s, i) { s.seq = i + 1; });
    store.save();
  }

  function addStage(circularId) {
    var stages = store.stagesOf(circularId);
    ui.modal({
      title: 'Add Examination Stage',
      body: '<label class="form-label">Examination Type</label>' +
        '<select class="form-select" id="f-type">' +
        TYPES.map(function (t) { return '<option value="' + t + '">' + pipe.typeLabel(t) + '</option>'; }).join('') +
        '</select>' +
        '<div class="form-text mt-2">The new stage is appended at the end of the chain. ' +
        'Roll numbers are generated at the first stage, and scrutiny appears automatically on a Viva-Voce stage.</div>',
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-green-solid px-4" data-act="add"><i class="bi bi-plus-lg me-1"></i> Add Stage</button>',
      onShow: function (api) {
        api.find('[data-act="add"]').addEventListener('click', function () {
          var type = api.find('#f-type').value;
          store.insert('stages', {
            id: fmt.uid('stg'), circularId: circularId, type: type, seq: stages.length + 1,
            name: pipe.typeLabel(type) + ' Examination',
            requireApplicantApproval: false, requireVenueApproval: false,
            applicantApprovers: [], venueApprovers: [],
            instructions: '', examDate: null,
            fullMarks: type === 'VIVA' ? 50 : 100, passMarks: type === 'VIVA' ? 25 : 50,
            status: 'NOT_STARTED', steps: {}
          });
          store.audit('ADD_STAGE', 'circular', circularId, pipe.typeLabel(type) + ' stage added');
          api.close();
          ui.toast('Stage added');
          ERec.router.refresh();
        });
      }
    });
  }

  /* One compact line per approval point. The switches and the approver
     sequence itself are edited on the approval step, where the user is
     actually doing that job - this screen only says what is set up. */
  function approvalSummary(stg, kind) {
    var required = kind === 'APPLICANT' ? stg.requireApplicantApproval : stg.requireVenueApproval;
    var ids = (kind === 'APPLICANT' ? stg.applicantApprovers : stg.venueApprovers) || [];
    var label = kind === 'APPLICANT' ? 'Candidate list' : 'Venue';
    var route = '#/circular/' + stg.circularId + '/stage/' + stg.id + '/' +
      (kind === 'APPLICANT' ? 'approval-applicant' : 'approval-venue');
    return '<div class="appr-line">' +
      '<span class="appr-what">' + label + '</span>' +
      (required ? ui.pill('Required', 'blue') : ui.pill('Optional', 'outline')) +
      '<span class="appr-who">' + (ids.length
        ? ids.map(function (id, i) {
          var u = store.find('users', id);
          return (i ? ' → ' : '') + fmt.esc(u ? u.name : id);
        }).join('')
        : '<span class="muted">no approver set</span>') + '</span>' +
      '<a class="appr-set" href="' + route + '">Set up</a>' +
      '</div>';
  }

  function stageRow(stg, i, total) {
    var p = pipe.progress(stg);
    var locked = stageHasProgress(stg);
    return '<tr data-sid="' + stg.id + '">' +
      '<td class="nowrap"><span class="pill green">Stage ' + stg.seq + '</span></td>' +
      '<td>' +
      '<select class="form-select form-select-sm" data-type="' + stg.id + '" style="width:132px"' +
      (locked ? ' disabled title="This stage has already been started"' : '') + '>' +
      TYPES.map(function (t) {
        return '<option value="' + t + '"' + (t === stg.type ? ' selected' : '') + '>' + pipe.typeLabel(t) + '</option>';
      }).join('') + '</select>' +
      (stg.seq === 1 ? '<div class="fs-12 muted mt-1"><i class="bi bi-123"></i> roll numbers are given here</div>' : '') +
      (stg.type === 'VIVA' ? '<div class="fs-12 muted mt-1"><i class="bi bi-folder-check"></i> includes document scrutiny</div>' : '') +
      '</td>' +
      '<td>' + approvalSummary(stg, 'APPLICANT') + approvalSummary(stg, 'VENUE') + '</td>' +
      '<td style="min-width:130px">' + ui.progressBar(fmt.pct(p.done, p.total)) +
      '<div class="fs-12 muted mt-1">' + p.done + ' of ' + p.total + ' steps' +
      (p.pending ? ' · <span class="text-warning fw-semibold">' + p.pending + ' waiting</span>' : '') + '</div></td>' +
      '<td class="text-center">' +
      '<a class="btn btn-sm btn-outline-success" href="#/circular/' + stg.circularId + '/stage/' + stg.id + '">Open <i class="bi bi-chevron-right"></i></a> ' +
      '<button class="btn btn-sm btn-light" data-move="up" data-sid="' + stg.id + '"' + (i === 0 ? ' disabled' : '') + ' title="Move earlier"><i class="bi bi-arrow-up"></i></button> ' +
      '<button class="btn btn-sm btn-light" data-move="down" data-sid="' + stg.id + '"' + (i === total - 1 ? ' disabled' : '') + ' title="Move later"><i class="bi bi-arrow-down"></i></button> ' +
      '<button class="btn btn-sm btn-outline-danger" data-del="' + stg.id + '" title="Remove stage"><i class="bi bi-trash"></i></button>' +
      '</td></tr>';
  }

  function pipelineMap(c) {
    var stages = store.stagesOf(c.id);
    return stages.map(function (s) {
      var steps = pipe.steps(s);
      var p = pipe.progress(s);
      return '<div class="mb-3 p-3 bg-light rounded-3 border">' +
        '<div class="d-flex align-items-center gap-2 mb-2 flex-wrap">' +
        '<span class="pill ' + (p.done === p.total ? 'green' : 'blue') + '">Stage ' + s.seq + '</span>' +
        '<span class="fw-bold text-dark fs-6">' + fmt.esc(pipe.stageName(s)) + '</span>' +
        '<span class="badge bg-white text-secondary border ms-1">' + p.done + '/' + p.total + ' required completed</span>' +
        '<div class="spacer flex-grow-1"></div>' +
        '<a class="btn btn-sm btn-green-solid" href="#/circular/' + c.id + '/stage/' + s.id + '">Enter Stage <i class="bi bi-chevron-right ms-1"></i></a>' +
        '</div>' +
        '<div class="d-flex flex-wrap gap-1">' + steps.map(function (st) {
          var tone = st.done ? (st.skipped ? 'outline' : 'green') : (st.enabled ? 'blue' : 'grey');
          var icon = st.done ? (st.skipped ? 'bi-dash-lg' : 'bi-check-lg') : (st.enabled ? 'bi-play-fill' : 'bi-lock-fill');
          return '<a href="' + st.route + '" class="pill ' + tone + ' shadow-sm py-1 px-2" title="' + fmt.esc(st.blockedReason || st.label) + '">' +
            '<i class="bi ' + icon + '"></i> ' + fmt.esc(st.label) + (st.optional ? ' <span class="badge bg-light text-muted ms-1" style="font-size:0.65rem">OPT</span>' : '') + '</a>';
        }).join('') + '</div></div>';
    }).join('<hr class="hr-soft">');
  }

  function render(view, params) {
    var c = store.circular(params.cid);
    if (!c) { ERec.router.go('#/circulars'); return; }
    ERec.router.setCrumbs([{ label: 'Job Circulars', href: '#/circulars' }, { label: c.post }]);

    var stages = store.stagesOf(c.id);
    if (!stages.length) {
      view.innerHTML = ui.card({ body: ui.empty('No stages configured', 'This circular has no stages.') });
      return;
    }

    // Determine active stage from query param or default to stage 1 (MCQ)
    var activeStage = null;
    if (params.query && params.query.stage) {
      activeStage = stages.find(function (s) { return s.id === params.query.stage || s.type === params.query.stage; });
    }
    if (!activeStage) {
      activeStage = stages[0];
    }
    var activeStageIndex = stages.findIndex(function (s) { return s.id === activeStage.id; });

    // Retrieve roster or applicants for the active stage
    var isFirstStage = activeStageIndex === 0;
    var roster = store.rosterOf(activeStage.id);
    var rosterMap = {};
    (roster || []).forEach(function (r) { rosterMap[r.applicantId] = r; });

    var allCandidates = [];
    if (isFirstStage) {
      var apps = store.applicantsOf(c.id);
      allCandidates = apps.map(function (a, idx) {
        var r = rosterMap[a.id];
        return {
          id: a.id,
          rollNo: (r && r.rollNo) || a.rollNo || (c.rollPrefix ? c.rollPrefix + fmt.pad(idx + 1, 4) : '—'),
          appNo: a.appNo,
          name: a.name,
          fatherName: a.fatherName,
          highestDegree: (ERec.pages.applicants && ERec.pages.applicants.highestEdu) ? ERec.pages.applicants.highestEdu(a) : (a.education && a.education.length ? a.education[a.education.length - 1].degree : 'B.Sc.'),
          district: a.district,
          mobile: a.mobile,
          status: a.status || 'APPLIED',
          zone: a.division || a.district,
          gender: a.gender,
          university: (a.education && a.education.length && a.education[a.education.length - 1].institution) || 'University of Dhaka',
          skills: a.skills || 'MS Office, Internet',
          raw: a,
          rosterRow: r
        };
      });
    } else {
      if (roster && roster.length) {
        allCandidates = roster.map(function (r) {
          var a = store.applicant(r.applicantId);
          if (!a) return null;
          return {
            id: a.id,
            rollNo: r.rollNo || a.rollNo || '—',
            appNo: a.appNo,
            name: a.name,
            fatherName: a.fatherName,
            highestDegree: (ERec.pages.applicants && ERec.pages.applicants.highestEdu) ? ERec.pages.applicants.highestEdu(a) : (a.education && a.education.length ? a.education[a.education.length - 1].degree : 'B.Sc.'),
            district: a.district,
            mobile: a.mobile,
            status: a.status || 'APPLIED',
            zone: a.division || a.district,
            gender: a.gender,
            university: (a.education && a.education.length && a.education[a.education.length - 1].institution) || 'University of Dhaka',
            skills: a.skills || 'MS Office, Internet',
            raw: a,
            rosterRow: r
          };
        }).filter(Boolean);
      } else {
        var prevStage = stages[activeStageIndex - 1];
        var prevRoster = prevStage ? store.rosterOf(prevStage.id).filter(function (r) { return r.selectedForNext; }) : [];
        allCandidates = prevRoster.map(function (r) {
          var a = store.applicant(r.applicantId);
          if (!a) return null;
          return {
            id: a.id,
            rollNo: r.rollNo || a.rollNo || '—',
            appNo: a.appNo,
            name: a.name,
            fatherName: a.fatherName,
            highestDegree: (ERec.pages.applicants && ERec.pages.applicants.highestEdu) ? ERec.pages.applicants.highestEdu(a) : (a.education && a.education.length ? a.education[a.education.length - 1].degree : 'B.Sc.'),
            district: a.district,
            mobile: a.mobile,
            status: a.status || 'APPLIED',
            zone: a.division || a.district,
            gender: a.gender,
            university: (a.education && a.education.length && a.education[a.education.length - 1].institution) || 'University of Dhaka',
            skills: a.skills || 'MS Office, Internet',
            raw: a,
            rosterRow: r
          };
        }).filter(Boolean);
      }
    }

    // Sort candidates by roll number ascending
    allCandidates.sort(function (a, b) {
      return String(a.rollNo).localeCompare(String(b.rollNo));
    });

    // Extract unique districts and universities for filters
    var uniqueDistricts = Array.from(new Set(allCandidates.map(function (a) { return a.district; }))).filter(Boolean).sort();
    var uniqueUnis = Array.from(new Set(allCandidates.map(function (a) { return a.university; }))).filter(Boolean).sort();
    if (!uniqueUnis.length) {
      uniqueUnis = ['University of Dhaka', 'Bangladesh University of Engineering and Technology', 'University of Rajshahi', 'University of Chittagong', 'Jahangirnagar University', 'BRAC University', 'North South University'];
    }

    var candTotal = allCandidates.length;

    // Page Top Header
    var pageTopHtml = '<div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">' +
      '<div>' +
      '<h4 class="fw-bold text-dark mb-1 d-flex align-items-center gap-2">' +
      fmt.esc(c.post) +
      ' <span class="badge ' + (c.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary') + ' fs-12">' + fmt.esc(c.status || 'ACTIVE') + '</span>' +
      '</h4>' +
      '<div class="fs-12 text-secondary">' +
      '<span class="mono fw-semibold text-dark me-2">' + fmt.esc(c.code) + '</span>' +
      '<span class="me-2">&middot; ' + c.vacancies + ' vacancies</span>' +
      '<span>&middot; Deadline: ' + fmt.date(c.applyEnd) + '</span>' +
      '</div>' +
      '</div>' +
      '</div>';

    // 1. Unified Stage Navigation Bar and Attached Stepper
    var headerHtml = ui.stepHeader(activeStage, 'search');

    // 4. Alert Callout Banner (removed)
    var bannerHtml = '';

    // 5. Filter Card
    var filterCardHtml = '<div class="stage-filter-card">' +
      '<div class="stage-filter-grid">' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Zone</label>' +
      '<select class="form-select form-select-sm" id="f-zone">' +
      '<option value="">All</option>' +
      ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'].map(function (z) {
        return '<option value="' + z + '">' + z + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Home district</label>' +
      '<select class="form-select form-select-sm" id="f-district">' +
      '<option value="">All</option>' +
      uniqueDistricts.map(function (d) {
        return '<option value="' + fmt.esc(d) + '">' + fmt.esc(d) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Gender</label>' +
      '<select class="form-select form-select-sm" id="f-gender">' +
      '<option value="">All</option>' +
      '<option value="Male">Male</option>' +
      '<option value="Female">Female</option>' +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Experience</label>' +
      '<select class="form-select form-select-sm" id="f-exp">' +
      '<option value="">All</option>' +
      '<option value="0-1">0-1 Years</option>' +
      '<option value="1-3">1-3 Years</option>' +
      '<option value="3-5">3-5 Years</option>' +
      '<option value="5+">5+ Years</option>' +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">University</label>' +
      '<select class="form-select form-select-sm" id="f-uni">' +
      '<option value="">All</option>' +
      uniqueUnis.slice(0, 10).map(function (u) {
        return '<option value="' + fmt.esc(u) + '">' + fmt.esc(u) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Skills</label>' +
      '<select class="form-select form-select-sm" id="f-skills">' +
      '<option value="">All</option>' +
      ['MS Office', 'Excel', 'Tally', 'SQL', 'Internet'].map(function (s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Highest degree</label>' +
      '<select class="form-select form-select-sm" id="f-degree">' +
      '<option value="">All</option>' +
      ['BBA', 'MBA', 'B.Sc.', 'M.Sc.', 'LL.B.', 'LL.M.', 'B.A.', 'M.Com.'].map(function (d) {
        return '<option value="' + d + '">' + d + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="filter-col">' +
      '<label class="filter-lbl">Status</label>' +
      '<select class="form-select form-select-sm" id="f-status">' +
      '<option value="">All</option>' +
      '<option value="APPLIED">Applied</option>' +
      '<option value="SHORTLISTED">Shortlisted</option>' +
      '<option value="REJECTED">Rejected</option>' +
      '<option value="SELECTED">Selected</option>' +
      '</select>' +
      '</div>' +
      '<div class="filter-actions">' +
      '<button class="btn-filter-apply" id="btn-apply-filters">Apply Filters</button>' +
      '<button class="btn-filter-clear" id="btn-clear-filters">Clear</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    // 6. Candidate Table Card Structure
    var tableCardHtml = '<div class="stage-table-card">' +
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
      '<button class="btn btn-sm btn-outline-primary fw-semibold px-2 py-1 fs-12" id="btn-import-Excel" title="Import Candidates from Excel">' +
      '<i class="bi bi-file-earmark-arrow-up-fill me-1"></i> Import Excel' +
      '</button>' +
      '<button class="btn btn-sm btn-outline-secondary fw-semibold px-2 py-1 fs-12" id="btn-gen-test-cands" title="Generate Test Applicants">' +
      '<i class="bi bi-magic me-1"></i> Generate Test Pool' +
      '</button>' +
      '<button class="btn-toolbar-tool" id="btn-export-Excel">' +
      '<span class="badge-export-Excel"><i class="bi bi-file-earmark-spreadsheet-fill"></i></span> Export Excel' +
      '</button>' +
      '<button class="btn-toolbar-tool" id="btn-print-pdf">' +
      '<span class="badge-export-pdf"><i class="bi bi-printer-fill"></i></span> Print list' +
      '</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-scroll">' +
      '<table class="table table-hover align-middle mb-0 table-x" id="candidates-table">' +
      '<thead style="background:#0f4c3a; color:#ffffff;">' +
      '<tr>' +
      '<th style="width: 40px;"><input type="checkbox" class="form-check-input" id="chk-all-candidates" checked></th>' +
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
      '</div>';

    // 7. Sticky Bottom Action Bar
    var nextStepRoute = '#/circular/' + c.id + '/stage/' + activeStage.id + '/approval-applicant';
    var actionBarHtml = '<div class="circular-action-bar d-flex align-items-center justify-content-between flex-wrap gap-2">' +
      '<div class="d-flex align-items-center gap-2">' +
      '<i class="bi bi-info-circle text-success fs-5"></i>' +
      '<span class="fs-13 text-secondary"><strong class="text-dark" id="bottom-cand-count">' + candTotal + ' candidates</strong> on this list</span>' +
      '</div>' +
      '<div class="d-flex align-items-center gap-3">' +
      '<button class="btn btn-sm fw-semibold px-3 py-2 d-inline-flex align-items-center gap-1" id="btn-call-more" style="border: 1.5px solid #0f4c3a; color: #0f4c3a; background: transparent; border-radius: 6px; font-size: 13px;">' +
      '<i class="bi bi-person-plus"></i> Call more candidates' +
      '</button>' +
      '<button type="button" class="btn btn-sm fw-semibold px-4 py-2 d-inline-flex align-items-center gap-1 text-white shadow-sm" id="btn-continue-step" style="background-color: #059669; border-radius: 6px; font-size: 13.5px;">' +
      'Continue: Approve Candidate List <i class="bi bi-chevron-right ms-1"></i>' +
      '</button>' +
      '</div>' +
      '</div>';

    // Assemble the complete page
    view.innerHTML = pageTopHtml + headerHtml + bannerHtml + filterCardHtml + tableCardHtml + actionBarHtml;

    // State management for filters, selection and pagination
    var filterState = {
      zone: '',
      district: '',
      gender: '',
      exp: '',
      uni: '',
      skills: '',
      degree: '',
      status: ''
    };
    var currentPage = 1;
    var pageSize = 10;
    var selectedMap = {};
    if (roster && roster.length) {
      allCandidates.forEach(function (cand) { selectedMap[cand.id] = !!rosterMap[cand.id]; });
    } else {
      allCandidates.forEach(function (cand) { selectedMap[cand.id] = true; });
    }

    function getFilteredList() {
      return allCandidates.filter(function (cand) {
        if (filterState.district && cand.district !== filterState.district) return false;
        if (filterState.gender && cand.gender !== filterState.gender) return false;
        if (filterState.degree && cand.highestDegree.indexOf(filterState.degree) === -1) return false;
        if (filterState.status && cand.status !== filterState.status) return false;
        if (filterState.zone && cand.zone !== filterState.zone && cand.district !== filterState.zone) return false;
        if (filterState.uni && cand.university.indexOf(filterState.uni) === -1) return false;
        if (filterState.skills && cand.skills.indexOf(filterState.skills) === -1) return false;
        return true;
      });
    }

    function updateBottomCounts() {
      var selCount = Object.keys(selectedMap).filter(function (k) { return selectedMap[k]; }).length;
      var totalCount = allCandidates.length;

      var el1 = view.querySelector('#bottom-cand-count');
      if (el1) el1.innerHTML = '<strong class="text-dark">' + selCount + ' of ' + totalCount + ' candidates</strong> selected';

      var btn = view.querySelector('#btn-continue-step');
      if (btn) {
        if (selCount === 0) {
          btn.disabled = true;
          btn.classList.add('disabled');
          btn.style.opacity = '0.55';
          btn.style.cursor = 'not-allowed';
          btn.innerHTML = 'Select Candidates to Continue <i class="bi bi-chevron-right ms-1"></i>';
        } else {
          btn.disabled = false;
          btn.classList.remove('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.innerHTML = 'Continue: Approve Candidate List (' + selCount + ') <i class="bi bi-chevron-right ms-1"></i>';
        }
      }
    }

    function renderTable() {
      var filtered = getFilteredList();
      var total = filtered.length;
      var totalPages = Math.ceil(total / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      var startIndex = (currentPage - 1) * pageSize;
      var endIndex = Math.min(startIndex + pageSize, total);
      var pageItems = filtered.slice(startIndex, endIndex);

      var tbody = view.querySelector('#candidates-tbody');
      if (pageItems.length === 0) {
        if (allCandidates.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5">' +
            '<div class="py-2">' +
            '<i class="bi bi-people text-muted" style="font-size: 2.4rem;"></i>' +
            '<h6 class="fw-bold text-dark mt-2 mb-1">No candidate applications received yet</h6>' +
            '<p class="text-secondary fs-13 mb-3">Candidate applications will appear once submitted online, or you can import from Excel or generate a test applicant pool.</p>' +
            '<div class="d-inline-flex gap-2 flex-wrap justify-content-center">' +
            '<button class="btn btn-sm btn-outline-primary px-3" id="btn-empty-Excel"><i class="bi bi-file-earmark-arrow-up-fill me-1"></i> Import Excel</button>' +
            '<button class="btn btn-sm btn-outline-secondary px-3" id="btn-empty-gen"><i class="bi bi-magic me-1"></i> Generate Test Pool</button>' +
            '</div>' +
            '</div>' +
            '</td></tr>';
          var eExcel = tbody.querySelector('#btn-empty-Excel');
          if (eExcel) eExcel.addEventListener('click', function () { if (ERec.pages.applicants) ERec.pages.applicants.importExcelModal(c, function () { ERec.router.refresh(); }); });
          var eGen = tbody.querySelector('#btn-empty-gen');
          if (eGen) eGen.addEventListener('click', function () { if (ERec.pages.applicants) ERec.pages.applicants.addDemoApplicants(c, function () { ERec.router.refresh(); }); });
        } else {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted fs-13">No candidates match the selected filters.</td></tr>';
        }
      } else {
        tbody.innerHTML = pageItems.map(function (cand) {
          var isChecked = !!selectedMap[cand.id];
          return '<tr data-aid="' + cand.id + '" class="' + (isChecked ? 'row-sel ' : '') + 'clickable">' +
            '<td class="text-center" style="width: 44px;"><input type="checkbox" class="form-check-input cand-chk" data-aid="' + cand.id + '"' + (isChecked ? ' checked' : '') + '></td>' +
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
            '<td><span class="status-pill-applied">Applied</span></td>' +
            '<td class="text-center nowrap">' +
            '<button class="btn-tbl-action" data-view="' + cand.id + '" title="View Application"><i class="bi bi-eye"></i></button>' +
            '<button class="btn-tbl-action ms-1" data-pdf="' + cand.id + '" title="Print Profile"><i class="bi bi-printer"></i></button>' +
            '</td>' +
            '</tr>';
        }).join('');
      }

      // Check all box in header
      var allChecked = pageItems.length > 0 && pageItems.every(function (cand) { return selectedMap[cand.id]; });
      var someChecked = pageItems.some(function (cand) { return selectedMap[cand.id]; });
      var chkAll = view.querySelector('#chk-all-candidates');
      if (chkAll) {
        chkAll.checked = allChecked;
        chkAll.indeterminate = !allChecked && someChecked;
      }

      // Pagination bar
      var paginationBar = view.querySelector('#pagination-bar');
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

      // Attach pagination click handlers
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

      updateBottomCounts();
    }

    // Initial table render
    renderTable();

    // Event Listeners

    // Pipeline stage and step navigation
    ui.bindPipelineEvents(view, activeStage, 'search');

    // Filter controls
    var btnApply = view.querySelector('#btn-apply-filters');
    if (btnApply) {
      btnApply.addEventListener('click', function () {
        filterState.zone = view.querySelector('#f-zone').value;
        filterState.district = view.querySelector('#f-district').value;
        filterState.gender = view.querySelector('#f-gender').value;
        filterState.exp = view.querySelector('#f-exp').value;
        filterState.uni = view.querySelector('#f-uni').value;
        filterState.skills = view.querySelector('#f-skills').value;
        filterState.degree = view.querySelector('#f-degree').value;
        filterState.status = view.querySelector('#f-status').value;
        currentPage = 1;
        renderTable();
      });
    }

    var btnClear = view.querySelector('#btn-clear-filters');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        ['#f-zone', '#f-district', '#f-gender', '#f-exp', '#f-uni', '#f-skills', '#f-degree', '#f-status'].forEach(function (selId) {
          var el = view.querySelector(selId);
          if (el) el.value = '';
        });
        filterState = { zone: '', district: '', gender: '', exp: '', uni: '', skills: '', degree: '', status: '' };
        currentPage = 1;
        renderTable();
      });
    }

    // Page size dropdown
    var selPageSize = view.querySelector('#sel-page-size');
    if (selPageSize) {
      selPageSize.addEventListener('change', function () {
        pageSize = parseInt(selPageSize.value, 10);
        currentPage = 1;
        renderTable();
      });
    }

    // Header checkbox (toggle all)
    ui.on(view, '#chk-all-candidates', 'change', function (e, chk) {
      var filtered = getFilteredList();
      filtered.forEach(function (cand) { selectedMap[cand.id] = chk.checked; });
      view.querySelectorAll('#candidates-tbody tr').forEach(function (tr) {
        var aid = tr.dataset.aid;
        if (aid) {
          tr.classList.toggle('row-sel', chk.checked);
          var cb = tr.querySelector('.cand-chk');
          if (cb) cb.checked = chk.checked;
        }
      });
      updateBottomCounts();
    });

    // Row checkbox
    ui.on(view, '.cand-chk', 'change', function (e, chk) {
      var aid = chk.dataset.aid;
      selectedMap[aid] = chk.checked;
      var tr = chk.closest('tr');
      if (tr) tr.classList.toggle('row-sel', chk.checked);
      var filtered = getFilteredList();
      var allChecked = filtered.length > 0 && filtered.every(function (cand) { return selectedMap[cand.id]; });
      var someChecked = filtered.some(function (cand) { return selectedMap[cand.id]; });
      var chkAll = view.querySelector('#chk-all-candidates');
      if (chkAll) {
        chkAll.checked = allChecked;
        chkAll.indeterminate = !allChecked && someChecked;
      }
      updateBottomCounts();
    });

    // Row click anywhere (toggles selection)
    ui.on(view, '#candidates-tbody tr', 'click', function (e, tr) {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
      var chk = tr.querySelector('.cand-chk');
      if (chk) {
        chk.checked = !chk.checked;
        var aid = chk.dataset.aid;
        selectedMap[aid] = chk.checked;
        tr.classList.toggle('row-sel', chk.checked);
        var filtered = getFilteredList();
        var allChecked = filtered.length > 0 && filtered.every(function (cand) { return selectedMap[cand.id]; });
        var someChecked = filtered.some(function (cand) { return selectedMap[cand.id]; });
        var chkAll = view.querySelector('#chk-all-candidates');
        if (chkAll) {
          chkAll.checked = allChecked;
          chkAll.indeterminate = !allChecked && someChecked;
        }
        updateBottomCounts();
      }
    });

    // View Application Profile
    ui.on(view, '[data-view]', 'click', function (e, btn) {
      var aid = btn.dataset.view;
      var app = store.applicant(aid);
      if (app && ERec.pages.applicants && ERec.pages.applicants.profileDrawer) {
        ERec.pages.applicants.profileDrawer(app);
      }
    });

    // Print Profile
    ui.on(view, '[data-pdf]', 'click', function (e, btn) {
      var aid = btn.dataset.pdf;
      if (ERec.exp && ERec.exp.printDoc) {
        ERec.exp.printDoc('profile', aid);
      }
    });

    // Export Excel
    var btnExport = view.querySelector('#btn-export-Excel');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        var filtered = getFilteredList();
        var rows = filtered.map(function (cand) {
          return [cand.rollNo, cand.appNo, cand.name, cand.highestDegree, cand.district, cand.mobile, 'Applied'];
        });
        if (ERec.exp && ERec.exp.Excel) {
          ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_' + pipe.typeLabel(activeStage.type) + '_candidates.Excel',
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
          ERec.exp.printDoc('applicant-list', activeStage.id);
        }
      });
    }

    // Call more candidates
    var btnCallMore = view.querySelector('#btn-call-more');
    if (btnCallMore) {
      btnCallMore.addEventListener('click', function () {
        if (ERec.pages.applicants && ERec.pages.applicants.callMoreModal) {
          ERec.pages.applicants.callMoreModal(activeStage, function () {
            ERec.router.refresh();
          });
        }
      });
    }

    // Import Excel modal
    var btnImportExcel = view.querySelector('#btn-import-Excel');
    if (btnImportExcel) {
      btnImportExcel.addEventListener('click', function () {
        if (ERec.pages.applicants && ERec.pages.applicants.importExcelModal) {
          ERec.pages.applicants.importExcelModal(c, function () {
            ERec.router.refresh();
          });
        }
      });
    }

    // Generate test candidates
    var btnGenCands = view.querySelector('#btn-gen-test-cands');
    if (btnGenCands) {
      btnGenCands.addEventListener('click', function () {
        if (ERec.pages.applicants && ERec.pages.applicants.addDemoApplicants) {
          ERec.pages.applicants.addDemoApplicants(c, function () {
            ERec.router.refresh();
          });
        }
      });
    }


    // Continue: Confirm candidate list & proceed to approval
    var btnContinue = view.querySelector('#btn-continue-step');
    if (btnContinue) {
      btnContinue.addEventListener('click', function (e) {
        e.preventDefault();
        try {
          var selectedCandidates = allCandidates.filter(function (cand) { return selectedMap[cand.id]; });
          if (!selectedCandidates.length) {
            ui.toast('Please select at least one candidate before continuing to the next phase.', 'warning');
            return;
          }

          var currentStageRows = store.rosterOf(activeStage.id);
          var currentStageMap = {};
          currentStageRows.forEach(function (r) { currentStageMap[r.applicantId] = r; });

          // Remove unselected candidates from stage roster
          currentStageRows.forEach(function (r) {
            if (!selectedMap[r.applicantId]) {
              store.remove('stageApplicants', r.id);
            }
          });

          var nowIso = (fmt.isoNow ? fmt.isoNow() : new Date().toISOString());

          // Insert newly selected candidates into stage roster or mark confirmed
          selectedCandidates.forEach(function (cand) {
            var existing = currentStageMap[cand.id];
            if (!existing) {
              var a = store.applicant(cand.id);
              var roll = (a && a.rollNo) || (cand.rollNo && cand.rollNo !== '—' ? cand.rollNo : null);
              store.insert('stageApplicants', {
                id: fmt.uid('sa'),
                stageId: activeStage.id,
                circularId: c.id,
                applicantId: cand.id,
                rollNo: roll,
                venueId: null,
                attendance: null,
                marks: null,
                resultStatus: 'PENDING',
                selectedForNext: false,
                selectionBasis: null,
                scrutiny: null,
                panelId: null,
                status: 'CONFIRMED',
                callRound: 1,
                createdAt: nowIso
              });
            } else {
              store.update('stageApplicants', existing.id, { status: 'CONFIRMED' });
            }
          });

          var confirmedCount = selectedCandidates.length;
          store.markStep(activeStage.id, 'search', { count: confirmedCount, confirmedAt: nowIso });
          store.audit('CONFIRM_ROSTER', 'stage', activeStage.id, 'Confirmed ' + confirmedCount + ' candidate' + (confirmedCount === 1 ? '' : 's') + ' for ' + pipe.typeLabel(activeStage.type));
          ui.toast(confirmedCount + ' candidate' + (confirmedCount === 1 ? '' : 's') + ' confirmed. Continuing to Approve Candidate List...', 'success');
          ERec.router.go(nextStepRoute);
        } catch (err) {
          if (window.console) console.error('Error continuing to approval:', err);
          ui.toast('Could not proceed: ' + err.message, 'danger');
        }
      });
    }
  }

  ERec.pages.circular = {
    render: render, editApprovers: editApprovers,
    ruleModal: ruleModal, ruleFieldsHtml: ruleFieldsHtml, copyRulesModal: copyRulesModal
  };
})(window);
