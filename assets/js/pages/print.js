/* Print-only document routes. Styled by print.css; Ctrl+P (or the toolbar
   button) turns them into PDFs - no PDF library needed. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var ORG = {
    name: 'PUBALI BANK PLC.',
    addr: 'Human Resources Division · Head Office, 12 Motijheel C/A, Dhaka-1000'
  };

  var lastPrinted = null;

  function head(title, sub) {
    return '<div class="doc-head">' +
      '<div class="org">' + ORG.name + '</div>' +
      '<div class="addr">' + ORG.addr + '</div>' +
      '<div class="doc-title">' + fmt.esc(title) + '</div>' +
      (sub ? '<div class="addr" style="margin-top:6px">' + fmt.esc(sub) + '</div>' : '') +
      '</div>';
  }

  function signs(left, right) {
    return '<div class="doc-signs">' +
      '<div class="doc-sign"><div class="line">' + fmt.esc(left || 'Prepared by') + '</div></div>' +
      '<div class="doc-sign"><div class="line">' + fmt.esc(right || 'Authorised Signatory') + '</div></div>' +
      '</div>';
  }

  function foot(note) {
    return '<div class="doc-foot">' + fmt.esc(note || 'Computer generated document — printed on ' + fmt.date(new Date())) + '</div>';
  }

  /* ---------- documents ---------- */

  function admitCard(row, stg) {
    if (ERec.pages.examinstructions && ERec.pages.examinstructions.buildAdmitCardHtml) {
      return ERec.pages.examinstructions.buildAdmitCardHtml(stg, stg.instructions, row, { isPrint: true });
    }
    var c = store.circular(stg.circularId);
    var a = store.applicant(row.applicantId);
    var v = row.venueId ? store.find('venues', row.venueId) : null;
    var instr = ERec.pages.instructions.lines(stg.instructions);

    return '<div class="doc-page">' +
      head('Admit Card · ' + pipe.typeLabel(stg.type) + ' Examination', c.title) +
      '<div class="doc-photo">' +
      '<div><span class="initials">' + fmt.esc(fmt.initials(a.name)) + '</span>' +
      '<div style="font-size:8px;margin-top:4px">affix photograph</div></div>' +
      '</div>' +
      '<dl class="doc-grid">' +
      '<dt>Roll Number</dt><dd style="font-size:15px">' + fmt.esc(row.rollNo || 'NOT ALLOTTED') + '</dd>' +
      '<dt>Candidate Name</dt><dd>' + fmt.esc(a.name) + '</dd>' +
      '<dt>Father\'s Name</dt><dd>' + fmt.esc(a.fatherName) + '</dd>' +
      '<dt>Mother\'s Name</dt><dd>' + fmt.esc(a.motherName) + '</dd>' +
      '<dt>Date of Birth</dt><dd>' + fmt.date(a.dob) + '</dd>' +
      '<dt>National ID</dt><dd>' + fmt.esc(a.nid) + '</dd>' +
      '<dt>Post Applied For</dt><dd>' + fmt.esc(c.post) + '</dd>' +
      '<dt>Circular No.</dt><dd>' + fmt.esc(c.code) + '</dd>' +
      '<dt>Examination</dt><dd>' + fmt.esc(pipe.typeLabel(stg.type)) + '</dd>' +
      '<dt>Examination Date</dt><dd>' + (v ? fmt.date(v.examDate) : 'To be notified') + '</dd>' +
      '<dt>Reporting Time</dt><dd>' + (v ? fmt.time12(v.reportingTime || fmt.shiftTime(v.startTime, -30)) : 'To be notified') + '</dd>' +
      '<dt>Examination Time</dt><dd>' + (v ? fmt.time12(v.startTime) + ' – ' + fmt.time12(v.endTime) : 'To be notified') + '</dd>' +
      '<dt>Venue</dt><dd>' + fmt.esc(v ? v.name : 'To be notified') +
      (v && v.address ? '<div style="font-weight:400">' + fmt.esc(v.address) + '</div>' : '') + '</dd>' +
      '</dl>' +
      '<div style="clear:both"></div>' +
      '<div class="doc-section-title">Instructions to the Candidate</div>' +
      (instr.length
        ? '<div class="doc-instructions"><ol>' + instr.map(function (l) { return '<li>' + fmt.esc(l) + '</li>'; }).join('') + '</ol></div>'
        : '<div style="font-size:11px">No instruction recorded.</div>') +
      signs('Signature of the Candidate', 'Controller of Examinations') +
      foot() +
      '</div>';
  }

  function profile(a) {
    var c = store.circular(a.circularId);
    var rows = store.where('stageApplicants', function (r) { return r.applicantId === a.id; });

    return '<div class="doc-page">' +
      head('Application Profile', c.title) +
      '<div class="doc-photo"><span class="initials">' + fmt.esc(fmt.initials(a.name)) + '</span></div>' +
      '<dl class="doc-grid">' +
      '<dt>Application No.</dt><dd>' + fmt.esc(a.appNo) + '</dd>' +
      '<dt>Roll Number</dt><dd>' + fmt.esc(a.rollNo || '—') + '</dd>' +
      '<dt>Name</dt><dd>' + fmt.esc(a.name) + '</dd>' +
      '<dt>Father\'s Name</dt><dd>' + fmt.esc(a.fatherName) + '</dd>' +
      '<dt>Mother\'s Name</dt><dd>' + fmt.esc(a.motherName) + '</dd>' +
      '<dt>Date of Birth</dt><dd>' + fmt.date(a.dob) + '</dd>' +
      '<dt>Gender</dt><dd>' + fmt.esc(a.gender) + '</dd>' +
      '<dt>National ID</dt><dd>' + fmt.esc(a.nid) + '</dd>' +
      '<dt>Mobile / E-mail</dt><dd>' + fmt.esc(a.mobile) + ' · ' + fmt.esc(a.email) + '</dd>' +
      '<dt>Home District</dt><dd>' + fmt.esc(a.district) + '</dd>' +
      '<dt>Address</dt><dd>' + fmt.esc(a.address) + '</dd>' +
      '<dt>Post Applied For</dt><dd>' + fmt.esc(c.post) + ' (' + fmt.esc(c.code) + ')</dd>' +
      '</dl>' +
      '<div style="clear:both"></div>' +
      '<div class="doc-section-title">Academic Record</div>' +
      '<table class="doc-table"><thead><tr><th>Examination</th><th>Institution / Board</th><th class="ctr">Year</th><th>Result</th></tr></thead><tbody>' +
      a.education.map(function (e) {
        return '<tr><td>' + fmt.esc(e.level) + (e.subject ? ' — ' + fmt.esc(e.subject) : '') + '</td>' +
          '<td>' + fmt.esc(e.board) + '</td><td class="ctr">' + e.year + '</td><td>' + fmt.esc(e.result) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="doc-section-title">Experience</div>' +
      (a.experience.length
        ? '<table class="doc-table"><thead><tr><th>Organisation</th><th>Designation</th><th class="ctr">Years</th></tr></thead><tbody>' +
        a.experience.map(function (x) {
          return '<tr><td>' + fmt.esc(x.org) + '</td><td>' + fmt.esc(x.role) + '</td><td class="ctr">' + x.years + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<div style="font-size:11px">No experience declared.</div>') +
      '<div class="doc-section-title">Documents Declared</div>' +
      '<div style="font-size:11px">' + a.documents.map(function (d) { return fmt.esc(d.name); }).join(' · ') + '</div>' +
      (rows.length
        ? '<div class="doc-section-title">Examination Record</div>' +
        '<table class="doc-table"><thead><tr><th>Stage</th><th class="ctr">Roll</th><th class="ctr">Attendance</th>' +
        '<th class="num">Marks</th><th class="ctr">Result</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var s = store.stage(r.stageId);
          if (!s) return '';
          return '<tr><td>' + fmt.esc(pipe.typeLabel(s.type)) + '</td><td class="ctr">' + fmt.esc(r.rollNo || '—') + '</td>' +
            '<td class="ctr">' + fmt.esc(r.attendance || '—') + '</td>' +
            '<td class="num">' + (r.marks === null || r.marks === undefined ? '—' : r.marks + ' / ' + s.fullMarks) + '</td>' +
            '<td class="ctr">' + fmt.esc(r.resultStatus) + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '') +
      signs('Verified by', 'Head of HR Division') + foot() +
      '</div>';
  }

  function applicantList(stg) {
    var c = store.circular(stg.circularId);
    var roster = store.rosterOf(stg.id);
    return '<div class="doc-page landscape">' +
      head('Candidate List · ' + pipe.typeLabel(stg.type), c.title + ' (' + c.code + ')') +
      '<div class="doc-meta"><span>Total candidates: <strong>' + roster.length + '</strong></span>' +
      '<span>Printed: ' + fmt.date(new Date()) + '</span></div>' +
      '<table class="doc-table"><thead><tr><th class="ctr">Sl.</th><th class="ctr">Roll</th><th>Candidate</th>' +
      '<th>Father\'s Name</th><th class="ctr">Mobile</th><th>District</th><th>Venue</th></tr></thead><tbody>' +
      roster.map(function (r, i) {
        var a = store.applicant(r.applicantId);
        var v = r.venueId ? store.find('venues', r.venueId) : null;
        return '<tr><td class="ctr">' + (i + 1) + '</td><td class="ctr">' + fmt.esc(r.rollNo || '—') + '</td>' +
          '<td>' + fmt.esc(a.name) + '</td><td>' + fmt.esc(a.fatherName) + '</td>' +
          '<td class="ctr">' + fmt.esc(a.mobile) + '</td><td>' + fmt.esc(a.district) + '</td>' +
          '<td>' + fmt.esc(v ? v.name : '—') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      signs() + foot() + '</div>';
  }

  function attendanceSheet(stg, venueId) {
    var c = store.circular(stg.circularId);
    var venues = venueId ? [store.find('venues', venueId)] : store.venuesOf(stg.id);
    return venues.filter(Boolean).map(function (v) {
      var rows = store.rosterOf(stg.id).filter(function (r) { return r.venueId === v.id; });
      return '<div class="doc-page">' +
        head('Attendance Sheet · ' + pipe.typeLabel(stg.type), c.title) +
        '<div class="doc-meta"><span><strong>' + fmt.esc(v.name) + '</strong><br>' + fmt.esc(v.address) + '</span>' +
        '<span style="text-align:right">' + fmt.date(v.examDate) + '<br>' +
        'Reporting ' + fmt.time12(v.reportingTime || fmt.shiftTime(v.startTime, -30)) + '<br>' +
        fmt.time12(v.startTime) + ' – ' + fmt.time12(v.endTime) + '<br>Roll ' +
        fmt.esc(v.rollFrom) + ' – ' + fmt.esc(v.rollTo) + '</span></div>' +
        '<table class="doc-table"><thead><tr><th class="ctr">Sl.</th><th class="ctr">Roll</th><th>Candidate</th>' +
        '<th>Father\'s Name</th><th style="width:26%">Signature of the Candidate</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r, i) {
          var a = store.applicant(r.applicantId);
          return '<tr><td class="ctr">' + (i + 1) + '</td><td class="ctr">' + fmt.esc(r.rollNo) + '</td>' +
            '<td>' + fmt.esc(a.name) + '</td><td>' + fmt.esc(a.fatherName) + '</td><td>&nbsp;</td></tr>';
        }).join('') : '<tr><td colspan="5" class="ctr">No candidate allocated to this venue</td></tr>') +
        '</tbody></table>' +
        '<div style="font-size:11px;margin-top:10px">Total present: ____________ &nbsp;&nbsp; Total absent: ____________</div>' +
        signs('Invigilator', 'Centre In-charge') + foot() + '</div>';
    }).join('');
  }

  function resultSheet(stg) {
    var c = store.circular(stg.circularId);
    var rows = ERec.pages.marks.eligible(stg);
    return '<div class="doc-page landscape">' +
      head('Result Sheet · ' + pipe.typeLabel(stg.type), c.title + ' (' + c.code + ')') +
      '<div class="doc-meta"><span>Full marks: <strong>' + stg.fullMarks + '</strong> · Pass marks: <strong>' + stg.passMarks + '</strong></span>' +
      '<span>Candidates: ' + rows.length + '</span></div>' +
      '<table class="doc-table"><thead><tr><th class="ctr">Sl.</th><th class="ctr">Roll</th><th>Candidate</th>' +
      '<th class="ctr">Attendance</th><th class="num">Marks</th><th class="ctr">Result</th>' +
      '<th class="ctr">Selected</th><th>Basis</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        var a = store.applicant(r.applicantId);
        return '<tr><td class="ctr">' + (i + 1) + '</td><td class="ctr">' + fmt.esc(r.rollNo) + '</td>' +
          '<td>' + fmt.esc(a.name) + '</td><td class="ctr">' + fmt.esc(r.attendance || '—') + '</td>' +
          '<td class="num">' + (r.marks === null || r.marks === undefined ? '—' : r.marks) + '</td>' +
          '<td class="ctr">' + fmt.esc(r.resultStatus) + '</td>' +
          '<td class="ctr">' + (r.selectedForNext ? 'Yes' : 'No') + '</td>' +
          '<td>' + fmt.esc(r.selectionBasis === 'PRIVILEGED' ? 'Privilege — ' + (r.privilegeNote || '') : (r.selectionBasis || '—')) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      signs('Prepared by', 'Controller of Examinations') + foot() + '</div>';
  }

  function finalResult(c) {
    var stages = store.stagesOf(c.id);
    var last = stages[stages.length - 1];
    var list = ERec.pages.result.meritList(last).filter(function (x) {
      return x.a.status === 'SELECTED' || x.a.status === 'JOINED';
    });
    return '<div class="doc-page landscape">' +
      head('Final Result', c.title + ' (' + c.code + ')') +
      '<div class="doc-meta"><span>Post: <strong>' + fmt.esc(c.post) + '</strong> · Vacancies: <strong>' + c.vacancies + '</strong></span>' +
      '<span>Finally selected: <strong>' + list.length + '</strong></span></div>' +
      '<div style="font-size:11.5px;margin-bottom:8px">The following candidates are hereby declared finally selected for the post of ' +
      fmt.esc(c.post) + ' against circular no. ' + fmt.esc(c.code) + '. Appointment Letter will be issued separately.</div>' +
      '<table class="doc-table"><thead><tr><th class="ctr">Merit</th><th class="ctr">Roll</th><th>Candidate</th>' +
      '<th>Father\'s Name</th>' + stages.map(function (s) {
        return '<th class="num">' + fmt.esc(pipe.typeLabel(s.type)) + '</th>';
      }).join('') + '<th class="num">Total</th></tr></thead><tbody>' +
      (list.length ? list.map(function (x, i) {
        return '<tr><td class="ctr">' + (i + 1) + '</td><td class="ctr">' + fmt.esc(x.row.rollNo) + '</td>' +
          '<td>' + fmt.esc(x.a.name) + '</td><td>' + fmt.esc(x.a.fatherName) + '</td>' +
          x.perStage.map(function (p) { return '<td class="num">' + (p.marks === null ? '—' : p.marks) + '</td>'; }).join('') +
          '<td class="num">' + x.total + '</td></tr>';
      }).join('') : '<tr><td colspan="9" class="ctr">Final result not yet published</td></tr>') +
      '</tbody></table>' +
      signs('Prepared by', 'Head of HR Division') + foot() + '</div>';
  }

  function offerLetter(a) {
    var c = store.circular(a.circularId);
    var o = store.offerFor(a.id);
    if (!o) return '<div class="doc-page">' + head('Offer of Appointment') +
      '<p>No Appointment Letter has been issued to this candidate.</p></div>';
    var post = (o && o.designation) || c.post;

    return '<div class="doc-page">' +
      head('Offer of Appointment') +
      '<div class="doc-meta"><span>Ref: <strong>' + fmt.esc(o.refNo) + '</strong></span>' +
      '<span>Date: ' + fmt.date(o.issuedAt) + '</span></div>' +
      '<div class="doc-body" style="margin-top:14px">' +
      '<p><strong>' + fmt.esc(a.name) + '</strong><br>' +
      'S/o, D/o ' + fmt.esc(a.fatherName) + '<br>' +
      fmt.esc(a.address) + '<br>Mobile: ' + fmt.esc(a.mobile) + '</p>' +
      '<p><strong>Subject: Offer of appointment to the post of ' + fmt.esc(post) + '.</strong></p>' +
      '<p>Dear ' + fmt.esc(a.name) + ',</p>' +
      '<p>With reference to your application against circular no. ' + fmt.esc(c.code) + ' and your performance in the ' +
      'recruitment examinations, we are pleased to offer you appointment to the post of <strong>' + fmt.esc(post) +
      '</strong>, on a consolidated salary of <strong>' +
      fmt.esc(fmt.money(o.salary)) + '</strong> per month.</p>' +
      '<p>You are requested to report to the Human Resources Division on <strong>' + fmt.date(o.joiningDate) +
      '</strong> along with all original academic certificates, transcripts, National ID card, and two recent ' +
      'passport size photographs for verification. Your appointment is subject to satisfactory verification of ' +
      'these documents and of the particulars furnished in your application.</p>' +
      '<p>Should you fail to report on the date mentioned above, this offer shall stand cancelled without ' +
      'further notice.</p>' +
      '<p>We look forward to welcoming you.</p>' +
      '</div>' +
      '<div style="margin-top:26px;font-size:11.5px">Yours sincerely,</div>' +
      '<div class="doc-sign" style="text-align:left;min-width:0"><div class="line" style="display:inline-block;min-width:180px">' +
      'Head of Human Resources</div></div>' +
      foot('Ref ' + o.refNo + ' · computer generated on ' + fmt.date(new Date())) +
      '</div>';
  }

  /* ---------- router entry ---------- */

  function render(view, params) {
    var doc = params.doc, id = params.id, query = params.query || {};
    var title = 'Document', content = '', backHref = '#/';

    if (doc === 'profile') {
      var a = store.applicant(id);
      if (!a) { view.innerHTML = ui.empty('Applicant not found'); return; }
      title = 'Application profile · ' + a.name;
      backHref = '#/circular/' + a.circularId;
      content = profile(a);

    } else if (doc === 'admit') {
      var stg = store.stage(id);
      if (!stg) { view.innerHTML = ui.empty('Stage not found'); return; }
      var rows = store.rosterOf(stg.id);
      if (query.applicant) rows = rows.filter(function (r) { return r.applicantId === query.applicant; });
      title = 'Admit cards · ' + pipe.typeLabel(stg.type) + ' (' + rows.length + ')';
      backHref = '#/circular/' + stg.circularId + '/stage/' + stg.id + '/initiate';
      content = rows.map(function (r) { return admitCard(r, stg); }).join('');

    } else if (doc === 'applicant-list') {
      var stg2 = store.stage(id);
      if (!stg2) { view.innerHTML = ui.empty('Stage not found'); return; }
      title = 'Candidate list · ' + pipe.typeLabel(stg2.type);
      backHref = '#/circular/' + stg2.circularId + '/stage/' + stg2.id + '/search';
      content = applicantList(stg2);

    } else if (doc === 'attendance') {
      var stg3 = store.stage(id);
      if (!stg3) { view.innerHTML = ui.empty('Stage not found'); return; }
      title = 'Attendance sheet · ' + pipe.typeLabel(stg3.type);
      backHref = '#/circular/' + stg3.circularId + '/stage/' + stg3.id + '/venue';
      content = attendanceSheet(stg3, query.venue);

    } else if (doc === 'result') {
      var stg4 = store.stage(id);
      if (!stg4) { view.innerHTML = ui.empty('Stage not found'); return; }
      title = 'Result sheet · ' + pipe.typeLabel(stg4.type);
      backHref = '#/circular/' + stg4.circularId + '/stage/' + stg4.id + '/marks';
      content = resultSheet(stg4);

    } else if (doc === 'final-result') {
      var c1 = store.circular(id);
      if (!c1) { view.innerHTML = ui.empty('Circular not found'); return; }
      title = 'Final result · ' + c1.post;
      backHref = '#/circular/' + c1.id;
      content = finalResult(c1);

    } else if (doc === 'offer') {
      var a2 = store.applicant(id);
      if (!a2) { view.innerHTML = ui.empty('Applicant not found'); return; }
      title = 'Appointment Letter · ' + a2.name;
      backHref = '#/circular/' + a2.circularId;
      content = offerLetter(a2);

    } else if (doc === 'offer-all') {
      var c2 = store.circular(id);
      if (!c2) { view.innerHTML = ui.empty('Circular not found'); return; }
      var people = ERec.pages.offer.selectedOf(c2.id).filter(function (x) { return store.offerFor(x.id); });
      title = 'Appointment Letter · ' + c2.post + ' (' + people.length + ')';
      backHref = '#/circular/' + c2.id;
      content = people.length ? people.map(offerLetter).join('') :
        '<div class="doc-page">' + head('Offer of Appointment') + '<p>No Appointment Letter has been issued yet.</p></div>';

    } else {
      view.innerHTML = ui.empty('Unknown document type', doc);
      return;
    }

    ERec.router.setCrumbs([{ label: 'Print' }, { label: title }]);

    view.innerHTML =
      '<div class="print-toolbar">' +
      '<button class="btn btn-sm btn-outline-secondary btn-icon" id="btn-back">' +
      '<i class="bi bi-chevron-left"></i> Back</button>' +
      '<div><div class="fw-semibold">' + fmt.esc(title) + '</div>' +
      '<div class="fs-12 muted">Use the browser print dialog and choose “Save as PDF”.</div></div>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-sm btn-green-solid btn-icon" id="btn-print"><i class="bi bi-printer"></i> Print / Save as PDF</button>' +
      '</div>' +
      '<div class="doc-stack">' + content + '</div>';

    /* Go back where the user actually came from; the per-document href is
       only the fallback for a print page opened directly by URL. */
    view.querySelector('#btn-back').addEventListener('click', function () {
      ERec.router.back(backHref);
    });

    view.querySelector('#btn-print').addEventListener('click', function () { global.print(); });

    /* Fire the dialog once per navigation - the button that got here said "print". */
    var key = global.location.hash;
    if (lastPrinted !== key) {
      lastPrinted = key;
      setTimeout(function () { global.print(); }, 450);
    }
  }

  ERec.pages.print = { render: render };
})(window);
