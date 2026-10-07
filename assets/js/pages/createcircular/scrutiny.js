/* Scrutiny - viva stages only.

   The list names every candidate; opening one shows a modal where each field
   of the application sits on its own row beside what the original document
   says. A field is either CONFIRMED (document agrees) or UPDATED (the
   candidate asked for a correction and the document supports it).

   Nothing here calls router.refresh() while the modal is open: ticking a
   field repaints only that row, so the page never jumps back to the top. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var TABS = [
    ['ALL', 'All'], ['PENDING', 'Not scrutinised'], ['ACCEPTED', 'Accepted'],
    ['CONDITIONAL', 'Conditional'], ['REJECTED', 'Rejected']
  ];
  var tab = 'ALL';

  var FIELDS = [
    { key: 'name', label: 'Candidate Name', shortLabel: 'Applicant Name' },
    { key: 'dob', label: 'Date of Birth', type: 'date', shortLabel: 'Date of Birth' },
    { key: 'gender', label: 'Gender', shortLabel: 'Gender' },
    { key: 'nid', label: 'National ID', shortLabel: 'National ID' },
    { key: 'district', label: 'Home District', shortLabel: 'District' },
    { key: 'fatherName', label: "Father's Name", shortLabel: "Father's Name" },
    { key: 'motherName', label: "Mother's Name", shortLabel: "Mother's Name" },
    { key: 'mobile', label: 'Mobile Number', shortLabel: 'Mobile' },
    { key: 'email', label: 'Email Address', type: 'email', shortLabel: 'Email' },
    { key: 'maritalStatus', label: 'Marital Status', shortLabel: 'Marital Status' },
    { key: 'quota', label: 'Quota Claimed', shortLabel: 'Quota' },
    { key: 'presentAddress', label: 'Present Address', shortLabel: 'Present Address' },
    { key: 'permanentAddress', label: 'Permanent Address', shortLabel: 'Permanent Address' }
  ];

  function fieldsFor(a) {
    var list = FIELDS.slice();
    (a.education || []).forEach(function (e, i) {
      list.push({ key: 'edu:' + i + ':result', label: e.level + ' result', shortLabel: 'Result' });
      list.push({ key: 'edu:' + i + ':year', label: e.level + ' passing year', shortLabel: 'Passing Year' });
    });
    return list;
  }

  function getVal(a, key) {
    var p = key.split(':');
    if (p[0] === 'edu') return a.education[+p[1]] ? a.education[+p[1]][p[2]] : '';
    if (key === 'presentAddress' && !a.presentAddress) return a.address || '';
    return a[key];
  }

  function setVal(a, key, v) {
    var p = key.split(':');
    if (p[0] === 'edu') { if (a.education[+p[1]]) a.education[+p[1]][p[2]] = v; }
    else {
      a[key] = v;
      if (key === 'presentAddress') a.address = v;
    }
  }

  function show(f, v) {
    if (v === '' || v === null || v === undefined) return '—';
    return f.type === 'date' ? fmt.date(v) : String(v);
  }

  function statusOf(row) { return (row.scrutiny && row.scrutiny.status) || 'PENDING'; }

  function counts(roster) {
    var c = { PENDING: 0, ACCEPTED: 0, CONDITIONAL: 0, REJECTED: 0 };
    roster.forEach(function (r) { c[statusOf(r)] = (c[statusOf(r)] || 0) + 1; });
    return c;
  }

  function draftOf(row, a) {
    row.scrutiny = row.scrutiny || {};
    if (!row.scrutiny.fields) row.scrutiny.fields = {};
    if (!row.scrutiny.checklist) {
      row.scrutiny.checklist = (a.documents || []).map(function (d) { return { name: d.name, ok: null }; });
    }
    if (!row.scrutiny.updates) row.scrutiny.updates = [];
    return row.scrutiny;
  }

  /* ---------- scrutiny modal ---------- */

  function openScrutiny(stg, row, onDone) {
    var a = store.applicant(row.applicantId);
    var c = store.circular(stg.circularId);
    var sc = draftOf(row, a);
    var fields = fieldsFor(a);
    var fieldMap = {};
    fields.forEach(function (f) { fieldMap[f.key] = f; });

    /* one field, applied value beside what the document shows */
    function rowHtml(f) {
      if (!f) return '';
      var st = sc.fields[f.key] || {};
      var cur = getVal(a, f.key);
      var cls = 'scrutiny-field-row' + (st.changed ? ' edited' : (st.ok ? ' ok' : ''));

      var applied = st.changed
        ? '<span class="was">' + fmt.esc(show(f, st.was)) + '</span><span class="val-changed"><i class="bi bi-pencil-fill me-1"></i>' + fmt.esc(show(f, cur)) + '</span>'
        : '<span class="val-text">' + fmt.esc(show(f, cur)) + '</span>';

      var verified = st.changed
        ? '<span class="ver-edited-badge"><i class="bi bi-pencil-fill me-1"></i>Corrected</span>'
        : (st.ok
          ? '<span class="ver-ok-badge"><i class="bi bi-check-circle-fill me-1"></i>Matches document</span>'
          : '<span class="ver-pending-badge"><i class="bi bi-clock-history me-1"></i>Pending</span>');

      var displayLabel = f.shortLabel || f.label;

      return '<li class="' + cls + '" data-field="' + fmt.esc(f.key) + '">' +
        '<div class="scrutiny-field-main">' +
        '<span class="scrutiny-prop-label">' + fmt.esc(displayLabel) + ':</span>' +
        '<span class="scrutiny-prop-val">' + applied + '</span>' +
        '</div>' +
        '<div class="scrutiny-field-ver">' + verified + '</div>' +
        '<div class="scrutiny-field-acts">' +
        '<button class="btn btn-sm btn-' + (st.ok && !st.changed ? 'success' : 'outline-success') +
        '" data-confirm="' + fmt.esc(f.key) + '" title="Matches original document">' +
        '<i class="bi bi-check-lg"></i></button>' +
        '<button class="btn btn-sm btn-' + (st.changed ? 'warning' : 'outline-secondary') +
        '" data-update="' + fmt.esc(f.key) + '" title="Correct this value">' +
        '<i class="bi bi-pencil"></i></button>' +
        '</div>' +
        '</li>';
    }

    function staticRowHtml(label, val) {
      return '<li class="scrutiny-field-row static-field">' +
        '<div class="scrutiny-field-main">' +
        '<span class="scrutiny-prop-label">' + fmt.esc(label) + ':</span>' +
        '<span class="scrutiny-prop-val"><span class="val-text">' + fmt.esc(val || '—') + '</span></span>' +
        '</div>' +
        '</li>';
    }

    function docHtml(d, i) {
      var ok = d.ok === true;
      var no = d.ok === false;
      var cardCls = 'doc-check-card' + (ok ? ' doc-ok' : (no ? ' doc-no' : ''));
      var statusBadge = ok
        ? '<span class="ver-ok-badge"><i class="bi bi-check-circle-fill me-1"></i>Produced</span>'
        : (no
          ? '<span class="ver-edited-badge text-danger border-danger-subtle bg-danger-subtle"><i class="bi bi-x-circle-fill me-1"></i>Missing</span>'
          : '<span class="ver-pending-badge"><i class="bi bi-clock-history me-1"></i>Not checked</span>');

      return '<div class="col-md-6" data-doc="' + i + '">' +
        '<div class="' + cardCls + '">' +
        '<div class="d-flex align-items-center justify-content-between gap-2">' +
        '<div class="d-flex align-items-center gap-2 min-w-0">' +
        '<i class="bi bi-file-earmark-check fs-5 ' + (ok ? 'text-success' : (no ? 'text-danger' : 'text-secondary')) + '"></i>' +
        '<div class="min-w-0">' +
        '<div class="doc-name text-truncate fw-semibold text-dark fs-13" title="' + fmt.esc(d.name) + '">' + fmt.esc(d.name) + '</div>' +
        '<div class="mt-1">' + statusBadge + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="btn-group btn-group-sm flex-shrink-0">' +
        '<button class="btn btn-' + (ok ? 'success' : 'outline-success') + '" data-dok="' + i + '" title="Mark produced">' +
        '<i class="bi bi-check-lg"></i></button>' +
        '<button class="btn btn-' + (no ? 'danger' : 'outline-danger') + '" data-dno="' + i + '" title="Mark missing">' +
        '<i class="bi bi-x-lg"></i></button>' +
        '</div>' +
        '</div></div></div>';
    }

    var educationHtml = (a.education || []).map(function (e, i) {
      return '<div class="educational-qualification">' +
        '<div class="passing-year">' +
        '<p><span>' + fmt.pad(i + 1, 2) + '.</span>' + fmt.esc(e.level) + '</p>' +
        '</div>' +
        '<div class="education-dt">' +
        '<h6>' + fmt.esc(e.board || 'Institution / Board') + '</h6>' +
        (e.subject ? '<div class="small text-muted mb-2">Major / Subject: <strong class="text-dark">' + fmt.esc(e.subject) + '</strong></div>' : '') +
        '<ul class="informations p-0 m-0">' +
        rowHtml(fieldMap['edu:' + i + ':result']) +
        rowHtml(fieldMap['edu:' + i + ':year']) +
        '</ul>' +
        '</div>' +
        '</div>';
    }).join('');
    if (!educationHtml) {
      educationHtml = '<div class="text-muted fst-italic py-2"><i class="bi bi-info-circle me-1"></i>No educational records found.</div>';
    }

    var experienceHtml = (a.experience || []).map(function (x, xi) {
      return '<div class="educational-qualification">' +
        '<div class="passing-year">' +
        '<p><span>' + fmt.pad(xi + 1, 2) + '.</span>' + fmt.esc(x.years) + ' Years Exp.</p>' +
        '</div>' +
        '<div class="education-dt">' +
        '<h6>' + fmt.esc(x.org) + '</h6>' +
        '<p class="position mb-0"><span>Position:</span> ' + fmt.esc(x.role) + '</p>' +
        '</div>' +
        '</div>';
    }).join('');
    if (!experienceHtml) {
      experienceHtml = '<div class="text-muted fst-italic py-2"><i class="bi bi-info-circle me-1"></i>No previous work experience declared.</div>';
    }

    var skillsList = [];
    if (Array.isArray(a.computerSkills)) {
      skillsList = a.computerSkills;
    } else if (typeof a.computerSkills === 'string' && a.computerSkills.trim()) {
      skillsList = a.computerSkills.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    } else {
      skillsList = ['MS Office (Word, Excel, PowerPoint)', 'Email & Internet Applications', 'Typing (Bangla & English)'];
    }

    var langList = [];
    if (Array.isArray(a.languages)) {
      langList = a.languages;
    } else if (typeof a.languages === 'string' && a.languages.trim()) {
      langList = a.languages.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    } else {
      langList = ['Bangla (Native)', 'English (Professional)'];
    }

    var tagsHtml = skillsList.map(function (sk) {
      return '<li>' + fmt.esc(sk) + '</li>';
    }).concat(langList.map(function (lg) {
      return '<li><i class="bi bi-translate me-1"></i>' + fmt.esc(lg) + '</li>';
    })).join('');

    if (a.expectedSalary) {
      tagsHtml += '<li><i class="bi bi-cash-stack me-1"></i>Expected: BDT ' + fmt.money(a.expectedSalary) + '</li>';
    }

    var avatarSrc = a.photo || a.avatar || 'assets/images/cv.png';

    var body =
      '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-3 mb-3 border-bottom">' +
      '<div>' +
      '<h5 class="fw-bold mb-1" style="color: var(--brand-primary, #0f4c3a);"><i class="bi bi-file-earmark-person me-2"></i>Candidate Resume &amp; Document Scrutiny</h5>' +
      '<div class="small text-muted">' +
      'Circular: <strong class="text-dark">' + fmt.esc(c.code) + '</strong> &bull; ' +
      'Post: <strong class="text-dark">' + fmt.esc(c.post) + '</strong> &bull; ' +
      'Viva Voce &amp; Document Verification' +
      '</div>' +
      '</div>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap">' +
      '<button class="btn btn-sm btn-outline-success" id="btn-all-ok" title="Mark all verifiable fields as matching document">' +
      '<i class="bi bi-check-all me-1"></i>Everything matches</button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="btn-clear-ok" title="Clear non-corrected verification ticks">' +
      '<i class="bi bi-arrow-counterclockwise me-1"></i>Clear checks</button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="btn-print-cv" title="Print candidate application / resume">' +
      '<i class="bi bi-printer me-1"></i>Print Resume</button>' +
      '</div>' +
      '</div>' +

      '<div class="verify-summary" id="sc-summary"></div>' +

      '<div class="resume-card-wrapper">' +
      '<div class="row g-4 mb-4">' +

      /* 1. AUTHOR PROFILE HEADER */
      '<div class="col-lg-6">' +
      '<div class="author-area">' +
      '<div class="author-img">' +
      '<img src="' + fmt.esc(avatarSrc) + '" alt="' + fmt.esc(a.name) + '" onerror="this.onerror=null;this.src=\'assets/images/cv.png\';">' +
      '</div>' +
      '<div class="name-degination">' +
      '<h4>' + fmt.esc(a.name) + '</h4>' +
      '<span class="post-title">' + fmt.esc(c.post) + '</span>' +
      '<div class="d-flex align-items-center gap-2 mt-2 flex-wrap">' +
      '<span class="badge bg-light text-dark border"><i class="bi bi-card-text me-1 text-success"></i>Roll: <b>' + fmt.esc(row.rollNo || '—') + '</b></span>' +
      '<span class="badge bg-light text-dark border"><i class="bi bi-file-earmark-person me-1 text-success"></i>App No: <b>' + fmt.esc(a.appNo) + '</b></span>' +
      '<span id="sc-status">' + ui.statusPill(statusOf(row)) + '</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      /* 2. CONTACT INFO HEADER */
      '<div class="col-lg-6">' +
      '<div class="contact-area">' +
      '<h4>Contact Info</h4>' +
      '<ul>' +
      '<li><i class="bi bi-telephone"></i> Mobile Number: <a href="tel:' + fmt.esc(a.mobile) + '">' + fmt.esc(a.mobile) + '</a></li>' +
      '<li><i class="bi bi-envelope"></i> Email Address: <a href="mailto:' + fmt.esc(a.email) + '">' + fmt.esc(a.email) + '</a></li>' +
      '<li><i class="bi bi-geo-alt"></i> Home District: <strong class="text-dark">' + fmt.esc(a.district || '—') + '</strong></li>' +
      '<li><i class="bi bi-calendar3"></i> Applied Date: <span>' + (a.appliedAt ? fmt.date(a.appliedAt) : '—') + '</span></li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '</div>' +

      /* 3. CAREER OBJECTIVE SECTION */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapseCareerObjective" aria-expanded="true" aria-controls="collapseCareerObjective" role="button">' +
      '<div class="section-title-text"><h6>Career Objective &amp; Summary</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapseCareerObjective">' +
      '<div class="description pt-1">' +
      '<p>' + fmt.esc(a.objective || a.summary || "To pursue a challenging and rewarding career in banking and financial sector with Pubali Bank PLC, utilising academic qualifications, professional acumen, and commitment to deliver exceptional customer value and institutional excellence.") + '</p>' +
      '</div>' +
      '</div>' +
      '</div>' +

      /* 4. WORK EXPERIENCE SECTION */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapseExperience" aria-expanded="true" aria-controls="collapseExperience" role="button">' +
      '<div class="section-title-text"><h6>Work Experience</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapseExperience">' +
      '<div class="pt-1">' + experienceHtml + '</div>' +
      '</div>' +
      '</div>' +

      /* 5. COMPUTER LITERACY & SKILLS SECTION */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapseSkills" aria-expanded="true" aria-controls="collapseSkills" role="button">' +
      '<div class="section-title-text"><h6>Computer Literacy &amp; Skills</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapseSkills">' +
      '<div class="tag-area pt-1"><ul>' + tagsHtml + '</ul></div>' +
      '</div>' +
      '</div>' +

      /* 6. EDUCATIONAL QUALIFICATION SECTION */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapseEducation" aria-expanded="true" aria-controls="collapseEducation" role="button">' +
      '<div class="section-title-text"><h6>Educational Qualification</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapseEducation">' +
      '<div class="pt-1">' + educationHtml + '</div>' +
      '</div>' +
      '</div>' +

      /* 7. PERSONAL INFORMATION SECTION */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapsePersonalInfo" aria-expanded="true" aria-controls="collapsePersonalInfo" role="button">' +
      '<div class="section-title-text"><h6>Personal Information</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapsePersonalInfo">' +
      '<div class="row g-4 pt-1">' +
      '<div class="col-lg-6 devaider1 position-relative">' +
      '<div class="informations"><ul>' +
      rowHtml(fieldMap['name']) +
      rowHtml(fieldMap['dob']) +
      rowHtml(fieldMap['gender']) +
      rowHtml(fieldMap['nid']) +
      rowHtml(fieldMap['district']) +
      staticRowHtml('Nationality', a.nationality || 'Bangladeshi') +
      staticRowHtml('Blood Group', a.bloodGroup || '—') +
      staticRowHtml('Religion', a.religion || '—') +
      '</ul></div>' +
      '</div>' +
      '<div class="col-lg-6 ps-lg-4">' +
      '<div class="informations"><ul>' +
      rowHtml(fieldMap['fatherName']) +
      rowHtml(fieldMap['motherName']) +
      rowHtml(fieldMap['mobile']) +
      rowHtml(fieldMap['email']) +
      staticRowHtml('Emergency Contact', a.altContact || '—') +
      rowHtml(fieldMap['maritalStatus']) +
      rowHtml(fieldMap['quota']) +
      rowHtml(fieldMap['presentAddress']) +
      rowHtml(fieldMap['permanentAddress']) +
      '</ul></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      /* 8. DOCUMENTS PRODUCED CHECKLIST */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapseDocuments" aria-expanded="true" aria-controls="collapseDocuments" role="button">' +
      '<div class="section-title-text"><h6>Documents Produced &amp; Verification</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapseDocuments">' +
      '<div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">' +
      '<span class="text-muted fs-12"><i class="bi bi-folder-check me-1 text-success"></i>Verify candidate\'s original certificates and transcripts produced in-person:</span>' +
      '<button class="btn btn-sm btn-outline-success" id="btn-docs-all"><i class="bi bi-check-all me-1"></i>Mark all produced</button>' +
      '</div>' +
      '<div class="row g-2" id="doc-list">' + sc.checklist.map(docHtml).join('') + '</div>' +
      '</div>' +
      '</div>' +

      /* 9. REMARKS & CONDITIONAL TERMS */
      '<div class="single-information-area">' +
      '<div class="section-title mb-3" data-bs-toggle="collapse" data-bs-target="#collapseRemarks" aria-expanded="true" aria-controls="collapseRemarks" role="button">' +
      '<div class="section-title-text"><h6>Scrutiny Observations &amp; Remarks</h6></div>' +
      '<span class="collapse-icon-btn" title="Toggle Section"><i class="bi bi-chevron-down"></i></span>' +
      '</div>' +
      '<div class="collapse show" id="collapseRemarks">' +
      '<div class="pt-1">' +
      '<label class="form-label fw-semibold text-dark fs-13"><i class="bi bi-chat-left-text me-1 text-success"></i>Scrutiny Observations &amp; Findings</label>' +
      '<textarea class="form-control" id="f-rem" rows="2" placeholder="e.g. Master\'s transcript not produced; undertaking taken to submit by deadline.">' +
      fmt.esc(sc.remarks || '') + '</textarea>' +
      '<div class="mt-3 p-3 bg-light rounded border" id="cond-wrap" hidden>' +
      '<label class="form-label fw-semibold text-dark fs-13 mb-1"><i class="bi bi-calendar-event me-1 text-warning"></i>Conditional Acceptance Deadline</label>' +
      '<div class="fs-12 text-muted mb-2">Candidate must submit all outstanding original documents by:</div>' +
      '<input type="date" class="form-control" id="f-deadline" style="max-width: 260px;" value="' +
      fmt.esc(sc.deadline || fmt.addDays(fmt.isoDate(), 30)) + '">' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '</div>'; /* End .resume-card-wrapper */

    ui.modal({
      title: 'Candidate Resume & Document Scrutiny',
      size: 'xl',
      body: body,
      footer:
        '<button class="btn btn-sm btn-outline-secondary me-auto" data-bs-dismiss="modal">Close</button>' +
        '<button class="btn btn-sm btn-outline-danger" data-act="REJECTED"><i class="bi bi-x-lg me-1"></i>Reject</button>' +
        '<button class="btn btn-sm btn-warning" data-act="CONDITIONAL"><i class="bi bi-hourglass-split me-1"></i>Conditional</button>' +
        '<button class="btn btn-sm btn-green-solid" data-act="ACCEPTED"><i class="bi bi-check-lg me-1"></i>Accept candidate</button>',
      onShow: function (api) {
        var changed = false;

        /* ---- repaint helpers: never re-render the page behind the modal ---- */
        function paintSummary() {
          var okN = fields.filter(function (f) { return sc.fields[f.key] && sc.fields[f.key].ok; }).length;
          var docsOk = sc.checklist.filter(function (d) { return d.ok === true; }).length;
          var totalFields = fields.length;
          var totalDocs = sc.checklist.length;
          var updatesN = sc.updates.length;

          api.find('#sc-summary').innerHTML =
            '<div class="summary-pill' + (okN === totalFields ? ' complete' : '') + '">' +
            '<div class="summary-num">' + okN + ' / ' + totalFields + '</div>' +
            '<div class="summary-label"><i class="bi bi-check2-circle me-1"></i>Fields Checked</div>' +
            '</div>' +
            '<div class="summary-pill' + (docsOk === totalDocs ? ' complete' : '') + '">' +
            '<div class="summary-num">' + docsOk + ' / ' + totalDocs + '</div>' +
            '<div class="summary-label"><i class="bi bi-folder-check me-1"></i>Documents Produced</div>' +
            '</div>' +
            '<div class="summary-pill' + (updatesN > 0 ? ' has-updates' : '') + '">' +
            '<div class="summary-num">' + updatesN + '</div>' +
            '<div class="summary-label"><i class="bi bi-pencil-square me-1"></i>Corrections Recorded</div>' +
            '</div>';

          var cw = api.find('#cond-wrap');
          if (cw) cw.hidden = docsOk === sc.checklist.length;
        }

        function paintField(key) {
          var f = fields.find(function (x) { return x.key === key; });
          var el = api.find('[data-field="' + key + '"]');
          if (f && el) el.outerHTML = rowHtml(f);
          paintSummary();
        }

        function paintAllFields() {
          fields.forEach(function (f) {
            var el = api.find('[data-field="' + f.key + '"]');
            if (el) el.outerHTML = rowHtml(f);
          });
          paintSummary();
        }

        function paintDocs() {
          api.find('#doc-list').innerHTML = sc.checklist.map(docHtml).join('');
          paintSummary();
        }

        paintSummary();

        /* ---- field confirm / correct (delegated, so repainted rows stay live) ---- */
        ui.on(api.el, '[data-confirm]', 'click', function (e, b) {
          var k = b.dataset.confirm;
          var st = sc.fields[k] || {};
          sc.fields[k] = { ok: !(st.ok && !st.changed), changed: false, at: new Date().toISOString() };
          store.save();
          changed = true;
          paintField(k);
        });

        ui.on(api.el, '[data-update]', 'click', function (e, b) {
          var k = b.dataset.update;
          var f = fields.find(function (x) { return x.key === k; });
          var current = getVal(a, k);
          ui.modal({
            title: 'Correct ' + f.label,
            body: '<p class="fs-13 text-muted">The candidate has asked for this to be corrected and the ' +
              'original document supports the new value. The change is recorded against the application.</p>' +
              '<label class="form-label">Applied value</label>' +
              '<input class="form-control mb-3" value="' + fmt.esc(String(current === undefined ? '' : current)) + '" disabled>' +
              '<label class="form-label">Corrected value</label>' +
              '<input type="' + (f.type === 'date' ? 'date' : 'text') + '" class="form-control" id="f-new" value="' +
              fmt.esc(String(current === undefined ? '' : current)) + '">' +
              '<label class="form-label mt-3">Reason</label>' +
              '<input class="form-control" id="f-why" placeholder="e.g. spelling differs from SSC certificate">',
            footer: '<button class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>' +
              '<button class="btn btn-sm btn-green-solid" data-act="go">Save correction</button>',
            onShow: function (m) {
              m.find('[data-act="go"]').addEventListener('click', function () {
                var nv = m.find('#f-new').value.trim();
                var why = m.find('#f-why').value.trim();
                if (nv === '') { ui.toast('Enter the corrected value', 'warning'); return; }
                if (String(nv) === String(current)) { ui.toast('That is the same as the applied value', 'warning'); return; }
                sc.updates.push({
                  field: k, label: f.label, from: current, to: nv,
                  reason: why, at: new Date().toISOString(), by: store.actingUser().name
                });
                setVal(a, k, nv);
                sc.fields[k] = { ok: true, changed: true, was: current, at: new Date().toISOString() };
                store.save();
                store.audit('SCRUTINY_UPDATE', 'applicant', a.id,
                  a.name + ' — ' + f.label + ' corrected from "' + current + '" to "' + nv + '"');
                changed = true;
                m.close();
                ui.toast(f.label + ' corrected');
                paintField(k);
              });
            }
          });
        });

        api.find('#btn-all-ok').addEventListener('click', function () {
          fields.forEach(function (f) {
            if (!sc.fields[f.key] || !sc.fields[f.key].changed) {
              sc.fields[f.key] = { ok: true, changed: false, at: new Date().toISOString() };
            }
          });
          store.save();
          changed = true;
          paintAllFields();
        });

        api.find('#btn-clear-ok').addEventListener('click', function () {
          fields.forEach(function (f) {
            if (sc.fields[f.key] && !sc.fields[f.key].changed) delete sc.fields[f.key];
          });
          store.save();
          changed = true;
          paintAllFields();
        });

        api.find('#btn-print-cv').addEventListener('click', function () {
          api.close();
          ERec.exp.printDoc('profile', a.id);
        });

        /* ---- documents ---- */
        ui.on(api.el, '[data-dok]', 'click', function (e, b) {
          sc.checklist[+b.dataset.dok].ok = true; store.save(); changed = true; paintDocs();
        });
        ui.on(api.el, '[data-dno]', 'click', function (e, b) {
          sc.checklist[+b.dataset.dno].ok = false; store.save(); changed = true; paintDocs();
        });
        api.find('#btn-docs-all').addEventListener('click', function () {
          sc.checklist.forEach(function (d) { d.ok = true; });
          store.save(); changed = true; paintDocs();
        });

        /* ---- decision ---- */
        ui.on(api.el, '[data-act]', 'click', function (e, b) {
          var decision = b.dataset.act;
          var remarks = api.find('#f-rem').value.trim();
          var missing = sc.checklist.filter(function (d) { return d.ok !== true; });
          var unchecked = fields.filter(function (f) { return !(sc.fields[f.key] && sc.fields[f.key].ok); });

          if (decision === 'REJECTED' && !remarks) {
            ui.toast('Remarks are required when rejecting', 'warning'); return;
          }
          if (decision === 'CONDITIONAL' && !missing.length) {
            ui.toast('All documents are produced — accept instead', 'warning'); return;
          }

          function commit() {
            sc.status = decision;
            sc.remarks = remarks;
            sc.deadline = decision === 'CONDITIONAL' ? api.find('#f-deadline').value : null;
            sc.at = new Date().toISOString();
            sc.by = store.actingUser().name;
            if (decision === 'REJECTED') {
              row.resultStatus = 'FAILED';
              store.update('applicants', a.id, { status: 'REJECTED' });
            } else if (a.status === 'REJECTED') {
              store.update('applicants', a.id, { status: 'APPLIED' });
            }
            store.save();
            store.audit('SCRUTINY', 'applicant', a.id, a.name + ' — scrutiny ' + decision.toLowerCase());
            api.close();
            ui.toast(a.name + ' marked ' + decision.toLowerCase());
            if (onDone) onDone();
          }

          if (decision === 'ACCEPTED' && (missing.length || unchecked.length)) {
            ui.confirm({
              title: 'Accept with checks outstanding?',
              body: (unchecked.length ? fmt.plural(unchecked.length, 'field') + ' not yet ticked. ' : '') +
                (missing.length ? fmt.plural(missing.length, 'document') + ' not marked as produced — ' +
                  'conditional acceptance is usually the right call there.' : ''),
              okText: 'Accept anyway'
            }).then(function (ok) { if (ok) commit(); });
            return;
          }
          commit();
        });

        /* Closing without a decision still keeps the ticks - refresh the list
           underneath so the counts there are right. */
        api.el.addEventListener('hidden.bs.modal', function () {
          if (changed && onDone) onDone();
        });
      }
    });
  }

  /* ---------- list ---------- */

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    if (stg.type !== 'VIVA') {
      ERec.router.go('#/circular/' + stg.circularId + '/stage/' + stg.id + '/marks');
      return;
    }

    var roster = store.rosterOf(stg.id);
    var cnt = counts(roster);
    var done = store.isStepDone(stg, 'scrutiny');
    var shown = roster.filter(function (r) { return tab === 'ALL' || statusOf(r) === tab; });

    var body = ui.lockedNotice(stg, 'scrutiny');

    body += '<div class="stat-grid">' +
      '<div class="stat"><div class="k">On list</div><div class="v">' + roster.length + '</div></div>' +
      '<div class="stat"><div class="k">Not scrutinised</div><div class="v">' + cnt.PENDING + '</div></div>' +
      '<div class="stat"><div class="k">Accepted</div><div class="v text-success">' + cnt.ACCEPTED + '</div></div>' +
      '<div class="stat"><div class="k">Conditional</div><div class="v text-warning">' + cnt.CONDITIONAL + '</div></div>' +
      '<div class="stat"><div class="k">Rejected</div><div class="v text-danger">' + cnt.REJECTED + '</div></div>' +
      '</div>';

    var tabsHtml = '<div class="btn-group btn-group-sm">' + TABS.map(function (t) {
      var n = t[0] === 'ALL' ? roster.length : (cnt[t[0]] || 0);
      return '<button class="btn btn-' + (tab === t[0] ? 'green-solid' : 'outline-secondary') + '" data-tab="' + t[0] + '">' +
        t[1] + ' <span class="badge rounded-pill text-bg-' + (tab === t[0] ? 'light' : 'secondary') + '">' + n + '</span></button>';
    }).join('') + '</div>';

    var rows = shown.map(function (r) {
      var a = store.applicant(r.applicantId);
      var st = statusOf(r);
      var sc = r.scrutiny || {};
      var fieldsN = fieldsFor(a).length;
      var okN = sc.fields ? Object.keys(sc.fields).filter(function (k) { return sc.fields[k].ok; }).length : 0;
      var docsN = sc.checklist ? sc.checklist.filter(function (d) { return d.ok === true; }).length : 0;
      var docsT = sc.checklist ? sc.checklist.length : (a.documents || []).length;
      return '<tr class="clickable" data-row="' + r.id + '">' +
        '<td class="mono nowrap">' + fmt.esc(r.rollNo || '—') + '</td>' +
        '<td><div class="name-cell">' + ui.avatar(a.name, 'sm') +
        '<div><div class="n">' + fmt.esc(a.name) + '</div><div class="m">' + fmt.esc(a.fatherName) + '</div></div></div></td>' +
        '<td class="num fs-12">' + okN + ' / ' + fieldsN + '</td>' +
        '<td class="num fs-12">' + docsN + ' / ' + docsT + '</td>' +
        '<td>' + ((sc.updates && sc.updates.length)
          ? ui.pill(fmt.plural(sc.updates.length, 'correction'), 'amber', 'bi-pencil')
          : '<span class="text-muted fs-12">none</span>') + '</td>' +
        '<td>' + ui.statusPill(st) +
        (sc.deadline && st === 'CONDITIONAL' ? '<div class="fs-12 text-muted mt-1">by ' + fmt.date(sc.deadline) + '</div>' : '') + '</td>' +
        '<td class="fs-12">' + (sc.remarks ? fmt.esc(sc.remarks) : '<span class="text-muted">—</span>') + '</td>' +
        '<td class="text-center"><button class="btn btn-sm btn-outline-success" data-open="' + r.id + '">' +
        (st === 'PENDING' ? 'Scrutinise' : 'Review') + '</button></td>' +
        '</tr>';
    }).join('');

    body += ui.card({
      title: 'Document scrutiny',
      hint: 'Click a candidate to open the verification sheet.',
      actions: tabsHtml + '<button class="btn btn-sm btn-outline-secondary ms-2" id="btn-Excel">' +
        '<i class="bi bi-filetype-Excel me-1"></i>Export</button>',
      tight: true,
      body: shown.length
        ? '<div class="table-scroll"><table class="table table-striped table-hover align-middle table-x" id="table-scrutiny"><thead><tr><th>Roll</th><th>Candidate</th>' +
        '<th class="num">Fields checked</th><th class="num">Documents</th><th>Corrections</th>' +
        '<th>Scrutiny</th><th>Remarks</th><th data-orderable="false"></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : ui.empty('Nothing in this view', 'Switch the filter above.', 'bi-folder-check')
    });

    ui.stagePage(view, stg, 'scrutiny', {
      body: body,
      action: done
        ? {
          note: cnt.PENDING ? fmt.plural(cnt.PENDING, 'candidate') + ' still unchecked' : 'Scrutiny complete',
          secondary: [{ id: 'btn-reopen', label: 'Re-open scrutiny' }],
          primary: cnt.PENDING ? { id: 'btn-close', tone: 'success', icon: 'bi-check2-circle', label: 'Update scrutiny result' } : null
        }
        : {
          note: cnt.PENDING ? fmt.plural(cnt.PENDING, 'candidate') + ' not yet checked' : '',
          primary: { id: 'btn-close', tone: 'success', icon: 'bi-check2-circle', label: 'Finish scrutiny' }
        }
    });

    if (shown.length) {
      ui.dataTable(view.querySelector('#table-scrutiny'), { pageLength: 25 });
    }

    ui.on(view, '[data-tab]', 'click', function (e, b) { tab = b.dataset.tab; ERec.router.refresh(); });

    function open(id) {
      openScrutiny(stg, store.find('stageApplicants', id), function () { ERec.router.refresh(); });
    }
    ui.on(view, '[data-open]', 'click', function (e, b) { open(b.dataset.open); });
    ui.on(view, 'tr[data-row]', 'click', function (e, tr) {
      if (e.target.closest('button')) return;
      open(tr.dataset.row);
    });

    view.querySelector('#btn-Excel').addEventListener('click', function () {
      ERec.exp.Excel('scrutiny_' + stg.id + '.Excel',
        ['Roll', 'Name', 'Scrutiny', 'Fields Checked', 'Docs Produced', 'Corrections', 'Deadline', 'Remarks', 'Scrutinised By'],
        roster.map(function (r) {
          var a = store.applicant(r.applicantId);
          var sc = r.scrutiny || {};
          var okN = sc.fields ? Object.keys(sc.fields).filter(function (k) { return sc.fields[k].ok; }).length : 0;
          var docsN = sc.checklist ? sc.checklist.filter(function (d) { return d.ok === true; }).length : '';
          return [r.rollNo, a.name, statusOf(r), okN, docsN,
          (sc.updates || []).map(function (u) { return u.label + ': ' + u.from + ' -> ' + u.to; }).join('; '),
          sc.deadline || '', sc.remarks || '', sc.by || ''];
        }));
    });

    var close = view.querySelector('#btn-close');
    if (close) close.addEventListener('click', function () {
      ui.confirm({
        title: 'Finish scrutiny',
        body: cnt.PENDING
          ? '<strong class="text-danger">' + fmt.plural(cnt.PENDING, 'candidate') +
          ' have not been scrutinised.</strong> They will still appear in mark upload.'
          : 'Scrutiny is complete for all ' + fmt.plural(roster.length, 'candidate') +
          '. Rejected candidates are excluded from mark upload.',
        okText: 'Finish'
      }).then(function (ok) {
        if (!ok) return;
        store.markStep(stg.id, 'scrutiny', {
          accepted: cnt.ACCEPTED, conditional: cnt.CONDITIONAL, rejected: cnt.REJECTED, pending: cnt.PENDING
        });
        store.audit('CLOSE_SCRUTINY', 'stage', stg.id,
          'Scrutiny closed — ' + cnt.ACCEPTED + ' accepted, ' + cnt.CONDITIONAL + ' conditional, ' + cnt.REJECTED + ' rejected');
        ui.toast('Scrutiny completed');
        ERec.router.refresh();
      });
    });

    var reopen = view.querySelector('#btn-reopen');
    if (reopen) reopen.addEventListener('click', function () {
      store.clearStep(stg.id, 'scrutiny');
      ui.toast('Scrutiny re-opened');
      ERec.router.refresh();
    });
  }

  ERec.pages.scrutiny = { render: render, statusOf: statusOf, fieldsFor: fieldsFor, openScrutiny: openScrutiny };
})(window);
