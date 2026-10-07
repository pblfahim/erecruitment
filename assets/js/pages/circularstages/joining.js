/* Joining - on the reporting day the candidate's documents are verified one
   last time (including anything left over from a conditional scrutiny) and
   an employee ID is issued. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt;

  /* Any conditional scrutiny outcome for this candidate, from any stage. */
  function pendingDocs(applicantId) {
    var rows = store.where('stageApplicants', function (r) {
      return r.applicantId === applicantId && r.scrutiny && r.scrutiny.status === 'CONDITIONAL';
    });
    if (!rows.length) return null;
    var sc = rows[rows.length - 1].scrutiny;
    return {
      deadline: sc.deadline,
      remarks: sc.remarks,
      missing: (sc.checklist || []).filter(function (d) { return d.ok !== true; })
    };
  }

  /* PF numbers run in one series across the bank; the next free one is
     suggested but the user may override it. */
  function nextPfNumber() {
    var max = ERec.seed.PF_SERIES_START - 1;
    store.all('joinings').forEach(function (j) {
      var n = parseInt(j.pfNo, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return max + 1;
  }

  /* Employee ID = joining year + designation root id + '0' + PF number.
     It is never typed by hand - it is derived, and re-derives whenever the
     PF number or the joining date changes. */
  function makeEmployeeId(joinDate, rootId, pfNo) {
    var year = (joinDate && /^\d{4}/.test(joinDate)) ? joinDate.slice(0, 4) : String(new Date().getFullYear());
    return year + String(rootId || 15) + '0' + String(pfNo || '');
  }

  function joinModal(c, a, after) {
    var pd = pendingDocs(a.id);
    var o = store.offerFor(a.id);
    var checks = (pd ? pd.missing.map(function (d) { return d.name; }) : []);
    /* The designation is chosen per person here, not on the circular - an
       applicant can be appointed to a different designation than the one the
       circular advertised. It drives the middle block of the employee ID. */
    var desigTarget = (o && o.designation) || c.post || '';
    var matchedDesig = ERec.seed.DESIGNATIONS.find(function (d) {
      var dt = desigTarget.toLowerCase();
      var tt = d.title.toLowerCase();
      return tt === dt || dt.indexOf(tt) >= 0 || tt.indexOf(dt) >= 0;
    });
    var rootId = matchedDesig ? matchedDesig.rootId : ERec.seed.DESIGNATIONS[0].rootId;
    var pf = nextPfNumber();
    var joinDate = o ? o.joiningDate : fmt.isoDate();

    ui.modal({
      title: 'Initiate joining · ' + fmt.esc(a.name),
      size: 'lg',
      body:
        '<dl class="kv mb-3">' +
        '<dt>Roll number</dt><dd class="mono">' + fmt.esc(a.rollNo || '—') + '</dd>' +
        '<dt>Post</dt><dd>' + fmt.esc(c.post) + '</dd>' +
        '<dt>Offer reference</dt><dd class="mono">' + fmt.esc(o ? o.refNo : '—') + '</dd>' +
        '<dt>Offered joining date</dt><dd>' + fmt.date(o ? o.joiningDate : null) + '</dd>' +
        '</dl>' +
        (pd
          ? ui.alert('warn', '<strong>Conditional acceptance at scrutiny.</strong> ' +
            fmt.plural(checks.length, 'document') + ' were to be produced by ' + fmt.date(pd.deadline) + '.' +
            (pd.remarks ? '<div class="fs-12 mt-1">“' + fmt.esc(pd.remarks) + '”</div>' : ''))
          : '') +
        (checks.length
          ? '<div class="section-title">Outstanding documents</div>' +
          checks.map(function (n, i) {
            return '<div class="doc-row"><input class="form-check-input" type="checkbox" data-doc="' + i + '">' +
              '<span class="nm">' + fmt.esc(n) + '</span></div>';
          }).join('')
          : '') +
        '<div class="section-title">Joining details</div>' +
        '<div class="row g-3">' +
        '<div class="col-md-6"><label class="form-label">Designation on appointment</label>' +
        '<select class="form-select" id="j-desig">' +
        ERec.seed.DESIGNATIONS.map(function (d) {
          return '<option value="' + d.rootId + '"' + (d.rootId === rootId ? ' selected' : '') + '>' + fmt.esc(d.title) + ' (grade ' + d.rootId + ')</option>';
        }).join('') + '</select>' +
        '<div class="form-text">Advertised post: ' + fmt.esc(c.post) + '. May differ from it.</div></div>' +
        '<div class="col-md-6"><label class="form-label">PF number</label>' +
        '<input type="number" class="form-control mono" id="j-pf" value="' + pf + '">' +
        '<div class="form-text">Next free number, change it if needed.</div></div>' +
        '<div class="col-12"><label class="form-label">Employee ID</label>' +
        '<input class="form-control mono fw-semibold" id="j-emp" value="' +
        makeEmployeeId(joinDate, rootId, pf) + '" readonly>' +
        '<div class="form-text" id="j-emp-help"></div></div>' +
        '<div class="col-md-6"><label class="form-label">Actual joining date</label>' +
        '<input type="date" class="form-control" id="j-date" value="' + fmt.esc(joinDate) + '"></div>' +
        '<div class="col-md-6"><label class="form-label">Joining place</label>' +
        '<input class="form-control" id="j-place" list="places" placeholder="Head Office, Dhaka">' +
        '<datalist id="places">' +
        ['Head Office, Dhaka', 'Principal Branch, Dhaka', 'Motijheel Corporate Branch',
          'Gulshan Corporate Branch', 'Agrabad Branch, Chattogram', 'Khulna Branch',
          'Rajshahi Branch', 'Sylhet Branch'].map(function (p) {
            return '<option value="' + p + '">';
          }).join('') +
        '</datalist></div>' +
        '<div class="col-12"><label class="form-label">Remarks</label>' +
        '<textarea class="form-control" id="j-rem" rows="2" placeholder="All documents verified in original."></textarea></div>' +
        '</div>',
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-success" data-act="join">Confirm joining</button>',
      onShow: function (api) {
        function refreshId() {
          var pfv = api.find('#j-pf').value.trim();
          var dv = api.find('#j-date').value;
          rootId = parseInt(api.find('#j-desig').value, 10) || rootId;
          api.find('#j-emp').value = makeEmployeeId(dv, rootId, pfv);
          api.find('#j-emp-help').innerHTML = 'Generated automatically: ' +
            '<strong>' + (dv ? dv.slice(0, 4) : '····') + '</strong> (year) + ' +
            '<strong>' + rootId + '</strong> (grade) + <strong>0</strong> + ' +
            '<strong>' + (pfv || '·····') + '</strong> (PF no.)';
        }
        api.find('#j-desig').addEventListener('change', refreshId);
        api.find('#j-pf').addEventListener('input', refreshId);
        api.find('#j-date').addEventListener('change', refreshId);
        refreshId();

        api.find('[data-act="join"]').addEventListener('click', function () {
          var boxes = Array.prototype.slice.call(api.el.querySelectorAll('[data-doc]'));
          var unmet = boxes.filter(function (b) { return !b.checked; }).length;
          var pfv = api.find('#j-pf').value.trim();
          var place = api.find('#j-place').value.trim();
          if (!pfv) { ui.toast('PF number is required', 'warning'); return; }
          if (!place) { ui.toast('Enter the joining place', 'warning'); return; }
          var clash = store.first('joinings', function (j) { return String(j.pfNo) === String(pfv); });
          if (clash) { ui.toast('PF number ' + pfv + ' is already used', 'warning'); return; }
          var emp = makeEmployeeId(api.find('#j-date').value, rootId, pfv);

          function commit() {
            store.insert('joinings', {
              id: fmt.uid('joi'), applicantId: a.id, circularId: c.id,
              pfNo: pfv, employeeId: emp, joiningPlace: place,
              designationRootId: rootId,
              designation: (ERec.seed.DESIGNATIONS.find(function (d) { return d.rootId === rootId; }) || {}).title || c.post,
              joinedAt: api.find('#j-date').value,
              doExcelerified: unmet === 0, remarks: api.find('#j-rem').value.trim()
            });
            store.update('applicants', a.id, { status: 'JOINED' });
            if (o) store.update('offers', o.id, { status: 'JOINED' });
            store.audit('JOINING', 'applicant', a.id, a.name + ' joined as ' + emp);
            api.close();
            ui.toast(a.name + ' has joined');
            after();
          }

          if (unmet) {
            ui.confirm({
              title: 'Documents still outstanding',
              body: fmt.plural(unmet, 'document') + ' from the conditional scrutiny is not ticked as produced. ' +
                'Record the joining anyway?',
              okText: 'Join anyway', danger: true
            }).then(function (ok) { if (ok) commit(); });
          } else commit();
        });
      }
    });
  }

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var selected = ERec.pages.offer.selectedOf(c.id);
    var withOffer = selected.filter(function (a) { return store.offerFor(a.id); });
    var joined = selected.filter(function (a) { return store.joiningFor(a.id); });
    var state = store.circularStep(c.id, 'joining');
    var done = !!(state && state.done);

    var body = ui.lockedNotice(stg, 'joining');

    body += '<div class="stat-grid">' +
      '<div class="stat"><div class="k">Finally selected</div><div class="v">' + selected.length + '</div></div>' +
      '<div class="stat"><div class="k">Offer issued</div><div class="v">' + withOffer.length + '</div></div>' +
      '<div class="stat"><div class="k">Joined</div><div class="v text-success">' + joined.length + '</div></div>' +
      '<div class="stat"><div class="k">Yet to join</div><div class="v">' + (withOffer.length - joined.length) + '</div></div>' +
      '</div>';

    var rows = withOffer.map(function (a) {
      var j = store.joiningFor(a.id);
      var o = store.offerFor(a.id);
      var pd = pendingDocs(a.id);
      return '<tr>' +
        '<td class="mono nowrap">' + fmt.esc(a.rollNo || '—') + '</td>' +
        '<td><div class="name-cell">' + ui.avatar(a.name, 'sm') +
        '<div><div class="n">' + fmt.esc(a.name) + '</div><div class="m">' + fmt.esc(a.mobile) + '</div></div></div></td>' +
        '<td class="mono fs-12">' + fmt.esc(o.refNo) + '</td>' +
        '<td class="nowrap">' + fmt.date(o.joiningDate) + '</td>' +
        '<td>' + (pd
          ? ui.pill(fmt.plural(pd.missing.length, 'doc') + ' pending', 'amber', 'bi-exclamation-triangle')
          : ui.pill('Clear', 'green', 'bi-check-lg')) + '</td>' +
        '<td class="mono fs-12">' + (j ? fmt.esc(j.employeeId) : '<span class="muted">—</span>') +
        (j && j.pfNo ? '<div class="muted">PF ' + fmt.esc(j.pfNo) + '</div>' : '') + '</td>' +
        '<td class="fs-12">' + (j && j.designation ? fmt.esc(j.designation) : '<span class="muted">—</span>') + '</td>' +
        '<td class="fs-12">' + (j && j.joiningPlace ? fmt.esc(j.joiningPlace) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (j ? ui.statusPill('JOINED') : ui.pill('Awaiting', 'grey')) + '</td>' +
        '<td class="text-center">' + (j
          ? '<span class="fs-12 muted">' + fmt.date(j.joinedAt) + '</span> ' +
          '<button class="btn btn-sm btn-outline-danger" data-undo="' + a.id + '"><i class="bi bi-arrow-counterclockwise"></i></button>'
          : '<button class="btn btn-sm btn-primary" data-join="' + a.id + '">Initiate joining</button>') +
        '</td></tr>';
    }).join('');

    body += ui.card({
      title: 'Joining register',
      hint: 'Circular ' + fmt.esc(c.code) + ' · ' + fmt.esc(c.post),
      actions: '<button class="btn btn-sm btn-light btn-icon" id="btn-Excel"><i class="bi bi-filetype-Excel"></i> Export register</button>',
      tight: true,
      body: withOffer.length
        ? '<div class="table-responsive"><table class="table table-striped table-hover align-middle table-x" id="table-joining"><thead><tr><th>Roll</th><th>Candidate</th><th>Offer ref.</th>' +
        '<th>Joining date</th><th>Documents</th><th>Employee ID</th><th>Designation</th><th>Joining place</th><th>Status</th><th data-orderable="false"></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : ui.empty('No candidate with an Appointment Letter', 'Issue Appointment Letters first.', 'bi-person-badge')
    });

    ui.stagePage(view, stg, 'joining', {
      body: body,
      action: done
        ? {
          note: fmt.plural(state.count, 'candidate') + ' joined — cycle closed',
          secondary: [{ id: 'btn-reopen', label: 'Re-open the cycle' }]
        }
        : {
          note: (withOffer.length - joined.length) + ' of ' + withOffer.length + ' yet to report',
          primary: {
            id: 'btn-complete', tone: 'success', icon: 'bi-flag-fill',
            label: 'Close this recruitment', disabled: !joined.length
          }
        }
    });

    if (withOffer.length) {
      ui.dataTable(view.querySelector('#table-joining'), { pageLength: 10 });
    }

    ui.on(view, '[data-join]', 'click', function (e, b) {
      joinModal(c, store.applicant(b.dataset.join), function () { ERec.router.refresh(); });
    });

    ui.on(view, '[data-undo]', 'click', function (e, b) {
      var a = store.applicant(b.dataset.undo);
      ui.confirm({ title: 'Undo joining', body: 'Remove the joining record for <strong>' + fmt.esc(a.name) + '</strong>?', okText: 'Undo', danger: true })
        .then(function (ok) {
          if (!ok) return;
          var j = store.joiningFor(a.id);
          if (j) store.remove('joinings', j.id);
          store.update('applicants', a.id, { status: 'SELECTED' });
          ui.toast('Joining record removed');
          ERec.router.refresh();
        });
    });

    view.querySelector('#btn-Excel').addEventListener('click', function () {
      ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_joining_register.Excel',
        ['Roll', 'Name', 'Offer Ref', 'Offered Joining Date', 'PF No', 'Employee ID', 'Designation', 'Joining Place', 'Actual Joining Date', 'Docs Verified', 'Remarks'],
        withOffer.map(function (a) {
          var o = store.offerFor(a.id), j = store.joiningFor(a.id);
          return [a.rollNo, a.name, o.refNo, o.joiningDate, j ? j.pfNo : '', j ? j.employeeId : '',
          j ? j.designation : '', j ? j.joiningPlace : '', j ? j.joinedAt : '',
          j ? (j.doExcelerified ? 'Yes' : 'No') : '', j ? j.remarks : ''];
        }));
    });

    var comp = view.querySelector('#btn-complete');
    if (comp) comp.addEventListener('click', function () {
      ui.confirm({
        title: 'Complete recruitment cycle',
        body: fmt.plural(joined.length, 'candidate') + ' have joined out of ' +
          fmt.plural(withOffer.length, 'offer') + ' issued. Close the cycle for this circular?',
        okText: 'Complete'
      }).then(function (ok) {
        if (!ok) return;
        store.markCircularStep(c.id, 'joining', { count: joined.length });
        store.update('circulars', c.id, { status: 'CLOSED' });
        store.audit('COMPLETE_CYCLE', 'circular', c.id,
          'Recruitment cycle closed — ' + joined.length + ' joined');
        ui.toast('Recruitment cycle completed');
        ERec.app.renderNav();
        ERec.router.refresh();
      });
    });

    var reopen = view.querySelector('#btn-reopen');
    if (reopen) reopen.addEventListener('click', function () {
      store.clearCircularStep(c.id, 'joining');
      store.update('circulars', c.id, { status: 'ACTIVE' });
      ERec.router.refresh();
    });
  }

  ERec.pages.joining = { render: render, pendingDocs: pendingDocs, makeEmployeeId: makeEmployeeId, nextPfNumber: nextPfNumber };
})(window);
