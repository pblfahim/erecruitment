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
    { key: 'name', label: 'Name' },
    { key: 'fatherName', label: "Father's name" },
    { key: 'motherName', label: "Mother's name" },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'nid', label: 'National ID' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'maritalStatus', label: 'Marital status' },
    { key: 'quota', label: 'Quota claimed' },
    { key: 'presentAddress', label: 'Present address' },
    { key: 'permanentAddress', label: 'Permanent address' }
  ];

  function fieldsFor(a) {
    var list = FIELDS.slice();
    (a.education || []).forEach(function (e, i) {
      list.push({ key: 'edu:' + i + ':result', label: e.level + ' result' });
      list.push({ key: 'edu:' + i + ':year', label: e.level + ' passing year' });
    });
    return list;
  }

  function getVal(a, key) {
    var p = key.split(':');
    if (p[0] === 'edu') return a.education[+p[1]] ? a.education[+p[1]][p[2]] : '';
    return a[key];
  }

  function setVal(a, key, v) {
    var p = key.split(':');
    if (p[0] === 'edu') { if (a.education[+p[1]]) a.education[+p[1]][p[2]] = v; }
    else a[key] = v;
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

    /* one field, applied value beside what the document shows */
    function rowHtml(f) {
      var st = sc.fields[f.key] || {};
      var cur = getVal(a, f.key);
      var cls = 'vrow' + (st.changed ? ' edited' : (st.ok ? ' ok' : ''));

      var applied = st.changed
        ? '<span class="was">' + fmt.esc(show(f, st.was)) + '</span>'
        : fmt.esc(show(f, cur));

      var verified = st.changed
        ? '<span class="val changed"><i class="bi bi-pencil-fill me-1"></i>' + fmt.esc(show(f, cur)) + '</span>'
        : st.ok
          ? '<span class="ver-ok"><i class="bi bi-check-circle-fill me-1"></i>Matches the document</span>'
          : '<span class="ver-none">Not checked yet</span>';

      return '<div class="' + cls + '" data-field="' + fmt.esc(f.key) + '">' +
        '<span class="lbl">' + fmt.esc(f.label) + '</span>' +
        '<span class="val">' + applied + '</span>' +
        '<span class="ver">' + verified + '</span>' +
        '<span class="acts">' +
        '<button class="btn btn-sm btn-' + (st.ok && !st.changed ? 'success' : 'outline-success') +
        '" data-confirm="' + fmt.esc(f.key) + '" title="Matches the document">' +
        '<i class="bi bi-check-lg"></i></button>' +
        '<button class="btn btn-sm btn-' + (st.changed ? 'warning' : 'outline-secondary') +
        '" data-update="' + fmt.esc(f.key) + '" title="Correct this value">' +
        '<i class="bi bi-pencil"></i></button>' +
        '</span></div>';
    }

    function docHtml(d, i) {
      return '<div class="doc-row" data-doc="' + i + '">' +
        '<div class="nm">' + fmt.esc(d.name) + '</div>' +
        '<div class="btn-group btn-group-sm">' +
        '<button class="btn btn-outline-success' + (d.ok === true ? ' active' : '') + '" data-dok="' + i + '">' +
        '<i class="bi bi-check-lg"></i></button>' +
        '<button class="btn btn-outline-danger' + (d.ok === false ? ' active' : '') + '" data-dno="' + i + '">' +
        '<i class="bi bi-x-lg"></i></button>' +
        '</div></div>';
    }

    var body =
      '<div class="d-flex align-items-center gap-2 flex-wrap mb-3">' +
      ui.avatar(a.name, 'primary') +
      '<div><div class="fw-bold">' + fmt.esc(a.name) + '</div>' +
      '<div class="fs-12 text-muted mono">Roll ' + fmt.esc(row.rollNo || '—') + ' · ' + fmt.esc(a.appNo) +
      ' · ' + fmt.esc(c.post) + '</div></div>' +
      '<div class="ms-auto" id="sc-status">' + ui.statusPill(statusOf(row)) + '</div>' +
      '</div>' +

      '<div class="verify-summary" id="sc-summary"></div>' +

      '<div class="d-flex gap-2 mb-2 flex-wrap">' +
      '<button class="btn btn-sm btn-outline-success" id="btn-all-ok">' +
      '<i class="bi bi-check-all me-1"></i>Everything matches</button>' +
      '<button class="btn btn-sm btn-outline-secondary" id="btn-clear-ok">Clear checks</button>' +
      '<button class="btn btn-sm btn-outline-secondary ms-auto" id="btn-print-cv">' +
      '<i class="bi bi-printer me-1"></i>Print application</button>' +
      '</div>' +

      '<div class="vrow vrow-head">' +
      '<span>Field</span><span>As submitted</span><span>Against the document</span><span></span>' +
      '</div>' +
      '<div id="verify-list">' + fields.map(rowHtml).join('') + '</div>' +

      '<div class="section-title mt-4"><i class="bi bi-folder-check"></i> Documents produced</div>' +
      '<div id="doc-list">' + sc.checklist.map(docHtml).join('') + '</div>' +
      '<button class="btn btn-sm btn-outline-secondary mt-2" id="btn-docs-all">Mark all produced</button>' +

      '<div class="section-title mt-4"><i class="bi bi-chat-left-text"></i> Remarks</div>' +
      '<textarea class="form-control" id="f-rem" rows="2" ' +
      'placeholder="e.g. Master\'s transcript not produced; undertaking taken.">' +
      fmt.esc(sc.remarks || '') + '</textarea>' +
      '<div class="mt-3" id="cond-wrap" hidden>' +
      '<label class="form-label">Produce remaining documents by</label>' +
      '<input type="date" class="form-control" id="f-deadline" value="' +
      fmt.esc(sc.deadline || fmt.addDays(fmt.isoDate(), 30)) + '">' +
      '</div>';

    ui.modal({
      title: 'Document Scrutiny',
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
          api.find('#sc-summary').innerHTML =
            '<div><b>' + okN + ' / ' + fields.length + '</b>fields checked</div>' +
            '<div><b>' + docsOk + ' / ' + sc.checklist.length + '</b>documents produced</div>' +
            '<div><b>' + sc.updates.length + '</b>corrections</div>';
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
          api.find('#verify-list').innerHTML = fields.map(rowHtml).join('');
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
