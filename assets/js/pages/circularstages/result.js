/* Final result - generated from the last stage's selected candidates.
   The merit list aggregates marks across every stage of the circular, and
   the notification text is shown and editable before publishing. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var excluded = {};   // applicantId -> true, un-ticked before publishing

  function meritList(stg) {
    var stages = store.stagesOf(stg.circularId);
    return store.rosterOf(stg.id)
      .filter(function (r) { return r.selectedForNext; })
      .map(function (r) {
        var a = store.applicant(r.applicantId);
        var perStage = stages.map(function (s) {
          var row = store.rosterRow(s.id, a.id);
          return { stage: s, marks: row && row.marks !== null && row.marks !== undefined ? Number(row.marks) : null };
        });
        var total = perStage.reduce(function (sum, x) { return sum + (x.marks || 0); }, 0);
        var full = perStage.reduce(function (sum, x) { return sum + (x.marks === null ? 0 : x.stage.fullMarks); }, 0);
        return { row: r, a: a, perStage: perStage, total: total, full: full };
      })
      .sort(function (x, y) { return y.total - x.total; });
  }

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var stages = store.stagesOf(c.id);
    var list = meritList(stg);
    var state = store.circularStep(c.id, 'result');
    var done = !!(state && state.done);
    var tpl = store.templateFor(c.id, null, 'FINAL', ERec.seed.defaultTemplates('FINAL'));

    var included = list.filter(function (x) { return !excluded[x.a.id]; });

    var body = ui.lockedNotice(stg, 'result');

    var markCols = stages.map(function (s) {
      return '<th class="num nowrap">' + fmt.esc(pipe.typeLabel(s.type)) + '<br><span class="fs-12">/' + s.fullMarks + '</span></th>';
    }).join('');

    var rows = list.map(function (x, i) {
      var inc = !excluded[x.a.id];
      return '<tr' + (inc ? '' : ' style="opacity:.5"') + '>' +
        '<td><input type="checkbox" class="form-check-input" data-inc="' + x.a.id + '"' + (inc ? ' checked' : '') +
        (done ? ' disabled' : '') + '></td>' +
        '<td class="num muted">' + (i + 1) + '</td>' +
        '<td class="mono nowrap">' + fmt.esc(x.row.rollNo) + '</td>' +
        '<td><div class="name-cell"><div><div class="n">' + fmt.esc(x.a.name) + '</div>' +
        '<div class="m">' + fmt.esc(x.a.fatherName) + '</div></div></div></td>' +
        x.perStage.map(function (p) {
          return '<td class="num">' + (p.marks === null ? '<span class="muted">—</span>' : p.marks) + '</td>';
        }).join('') +
        '<td class="num fw-semibold">' + x.total + ' <span class="muted fs-12">/ ' + x.full + '</span></td>' +
        '<td>' + (x.row.selectionBasis === 'PRIVILEGED'
          ? ui.pill('Privilege', 'purple', 'bi-star-fill') : ui.pill('Merit', 'green')) + '</td>' +
        '<td>' + ui.statusPill(x.a.status) + '</td>' +
        '</tr>';
    }).join('');

    body += ui.card({
      title: 'Merit list',
      hint: 'Ordered by aggregate marks across all stages. ' + c.vacancies + ' vacancies were advertised.',
      actions: '<button class="btn btn-sm btn-light btn-icon" id="btn-Excel"><i class="bi bi-filetype-Excel"></i> Export</button>' +
        '<button class="btn btn-sm btn-light btn-icon ms-2" id="btn-print"><i class="bi bi-printer"></i> Print final result</button>',
      tight: true,
      body: list.length
        ? '<div class="table-scroll"><table class="table table-striped table-hover align-middle table-x" id="table-merit-list"><thead><tr><th style="width:34px" data-orderable="false"></th><th>Merit</th>' +
        '<th>Roll</th><th>Candidate</th>' + markCols + '<th class="num">Total</th><th>Basis</th><th>Status</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : ui.empty('No candidate selected in the final stage', 'Complete mark upload and select candidates first.', 'bi-trophy')
    });

    body += '<div class="row g-3">' +
      '<div class="col-lg-8">' +
      ui.card({
        title: 'Result notification preview',
        hint: 'Merged with candidate details as it will be dispatched upon publication.',
        actions: '<div class="d-flex align-items-center gap-2">' +
          (included.length > 1
            ? '<select class="form-select form-select-sm" id="f-who" style="width:200px">' +
            included.slice(0, 60).map(function (x, i) {
              return '<option value="' + x.a.id + '"' + (i === 0 ? ' selected' : '') + '>' +
                fmt.esc((x.row.rollNo ? x.row.rollNo + ' · ' : '') + x.a.name) + '</option>';
            }).join('') + '</select>'
            : '') +
          '<button class="btn btn-sm btn-outline-primary btn-icon" id="btn-edit-tpl"><i class="bi bi-pencil-square"></i> Edit</button>' +
          '</div>',
        body: included.length
          ? '<div class="fs-12 muted mb-1">E-MAIL TO <span class="mono" id="p-to"></span></div>' +
          '<div class="preview-box mb-3">' +
          '<strong id="p-sub"></strong><hr class="hr-soft my-2"><span id="p-mail" style="white-space:pre-wrap;"></span></div>' +
          '<div class="d-flex justify-content-between align-items-center mb-1">' +
          '<div class="fs-12 muted">SMS TO <span class="mono" id="p-mob"></span></div>' +
          '<span class="fs-12 text-muted" id="p-sms-count"></span>' +
          '</div>' +
          '<div class="preview-box" id="p-sms"></div>'
          : ui.empty('Nobody to notify')
      }) +
      '</div>' +
      '<div class="col-lg-4">' +
      ui.card({
        title: 'Summary',
        body: '<dl class="kv">' +
          '<dt>Vacancies</dt><dd>' + c.vacancies + '</dd>' +
          '<dt>Cleared final stage</dt><dd>' + list.length + '</dd>' +
          '<dt>Included in result</dt><dd class="fw-semibold">' + included.length + '</dd>' +
          '<dt>Excluded</dt><dd>' + (list.length - included.length) + '</dd>' +
          '</dl>' +
          (included.length > c.vacancies
            ? ui.alert('warn', included.length + ' selected against ' + c.vacancies + ' vacancies.')
            : '')
      }) +
      '</div>' +
      '</div>';

    ui.stagePage(view, stg, 'result', {
      body: body,
      action: done
        ? {
          note: fmt.plural(state.count, 'candidate') + ' finally selected',
          secondary: [{ id: 'btn-reopen', label: 'Change the result' }]
        }
        : {
          primary: {
            id: 'btn-publish', tone: 'success', icon: 'bi-trophy',
            label: 'Publish result for ' + fmt.plural(included.length, 'candidate'),
            disabled: !included.length
          }
        }
    });

    if (list.length) {
      ui.dataTable(view.querySelector('#table-merit-list'), { pageLength: 10 });
    }

    /* ---- wiring ---- */
    function currentCandidate() {
      var sel = view.querySelector('#f-who');
      if (sel && sel.value) {
        var found = included.find(function (x) { return x.a.id === sel.value; });
        if (found) return found;
      }
      return included[0] || null;
    }

    function varsFor(x) {
      return { name: x.a.name, roll: x.row.rollNo, post: c.post, circular: c.code };
    }

    function repaint() {
      var x = currentCandidate();
      var smsCount = view.querySelector('#p-sms-count');
      if (!x) {
        if (smsCount) smsCount.textContent = '';
        return;
      }
      var v = varsFor(x);
      var sms = fmt.merge(tpl.smsBody, v);
      var p = fmt.smsParts(sms);
      var toEl = view.querySelector('#p-to');
      var mobEl = view.querySelector('#p-mob');
      var subEl = view.querySelector('#p-sub');
      var mailEl = view.querySelector('#p-mail');
      var smsEl = view.querySelector('#p-sms');
      if (toEl) toEl.textContent = x.a.email || '—';
      if (mobEl) mobEl.textContent = x.a.mobile || '—';
      if (subEl) subEl.textContent = fmt.merge(tpl.mailSubject, v);
      if (mailEl) mailEl.textContent = fmt.merge(tpl.mailBody, v);
      if (smsEl) smsEl.textContent = sms;
      if (smsCount) {
        smsCount.textContent = p.len + ' characters · ' + fmt.plural(p.parts, 'SMS part');
        smsCount.classList.toggle('over', p.parts > 1);
      }
    }
    if (included.length) repaint();

    var who = view.querySelector('#f-who');
    if (who) who.addEventListener('change', repaint);

    function openEditModal() {
      var placeholders = [
        ['name', 'Candidate full name'],
        ['roll', 'Roll number'],
        ['post', 'Advertised post title'],
        ['circular', 'Circular reference code']
      ];
      var chips = placeholders.map(function (p) {
        return '<span class="ph-chip" data-ph="' + p[0] + '" title="' + fmt.esc(p[1]) + '">{{' + p[0] + '}}</span>';
      }).join('');

      ui.modal({
        title: 'Edit result notification',
        size: 'lg',
        body:
          '<div class="mb-3">' +
          '<div class="fs-12 text-muted mb-2">Click a placeholder to insert it at the cursor:</div>' +
          chips +
          '</div>' +
          '<div class="mb-3">' +
          '<label class="form-label fw-semibold">E-mail subject</label>' +
          '<input class="form-control" id="m-subject" value="' + fmt.esc(tpl.mailSubject) + '">' +
          '</div>' +
          '<div class="mb-3">' +
          '<label class="form-label fw-semibold">E-mail body</label>' +
          '<textarea class="form-control" id="m-mail" rows="8">' + fmt.esc(tpl.mailBody) + '</textarea>' +
          '</div>' +
          '<div class="mb-3">' +
          '<label class="form-label fw-semibold">SMS body</label>' +
          '<textarea class="form-control" id="m-sms" rows="4">' + fmt.esc(tpl.smsBody) + '</textarea>' +
          '<div class="d-flex justify-content-between mt-1">' +
          '<span class="sms-count" id="m-sms-count"></span>' +
          '<span class="form-text">Merged length is what actually gets sent</span>' +
          '</div>' +
          '</div>',
        footer:
          '<button class="btn btn-sm btn-light" id="m-btn-reset">Reset to default</button>' +
          '<div class="ms-auto d-flex gap-2">' +
          '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
          '<button class="btn btn-sm btn-primary" id="m-btn-save"><i class="bi bi-check2 me-1"></i> Save changes</button>' +
          '</div>',
        onShow: function (api) {
          var mSub = api.find('#m-subject');
          var mMail = api.find('#m-mail');
          var mSms = api.find('#m-sms');
          var mCount = api.find('#m-sms-count');
          var lastField = mMail;

          function updateSmsCount() {
            var x = currentCandidate();
            var v = x ? varsFor(x) : {};
            var merged = fmt.merge(mSms.value, v);
            var p = fmt.smsParts(merged);
            if (mCount) {
              mCount.textContent = p.len + ' characters · ' + fmt.plural(p.parts, 'SMS part');
              mCount.classList.toggle('over', p.parts > 1);
            }
          }

          [mSub, mMail, mSms].forEach(function (el) {
            if (!el) return;
            el.addEventListener('focus', function () { lastField = el; });
            el.addEventListener('input', function () {
              if (el === mSms) updateSmsCount();
            });
          });

          var phChips = api.findAll ? api.findAll('[data-ph]') : api.el.querySelectorAll('[data-ph]');
          phChips.forEach(function (chip) {
            chip.addEventListener('click', function () {
              var token = '{{' + chip.dataset.ph + '}}';
              var el = lastField || mMail;
              var s = el.selectionStart || 0, t = el.selectionEnd || 0;
              el.value = el.value.slice(0, s) + token + el.value.slice(t);
              el.focus();
              el.selectionStart = el.selectionEnd = s + token.length;
              if (el === mSms) updateSmsCount();
            });
          });

          updateSmsCount();

          api.find('#m-btn-reset').addEventListener('click', function () {
            var d = ERec.seed.defaultTemplates('FINAL');
            mSub.value = d.mailSubject;
            mMail.value = d.mailBody;
            mSms.value = d.smsBody;
            updateSmsCount();
            ui.toast('Default text restored — remember to save changes');
          });

          api.find('#m-btn-save').addEventListener('click', function () {
            tpl.mailSubject = mSub.value;
            tpl.mailBody = mMail.value;
            tpl.smsBody = mSms.value;
            store.update('templates', tpl.id, {
              mailSubject: tpl.mailSubject,
              mailBody: tpl.mailBody,
              smsBody: tpl.smsBody
            });
            repaint();
            api.close();
            ui.toast('Result notification updated');
          });
        }
      });
    }

    var editBtn = view.querySelector('#btn-edit-tpl');
    if (editBtn) editBtn.addEventListener('click', openEditModal);

    ui.on(view, '[data-inc]', 'change', function (e, cb) {
      excluded[cb.dataset.inc] = !cb.checked;
      ERec.router.refresh();
    });

    view.querySelector('#btn-Excel').addEventListener('click', function () {
      ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_final_result.Excel',
        ['Merit', 'Roll', 'Name', "Father's Name", 'Total', 'Basis', 'Included'],
        list.map(function (x, i) {
          return [i + 1, x.row.rollNo, x.a.name, x.a.fatherName, x.total,
          x.row.selectionBasis || 'MERIT', excluded[x.a.id] ? 'No' : 'Yes'];
        }));
    });
    view.querySelector('#btn-print').addEventListener('click', function () {
      ERec.exp.printDoc('final-result', c.id);
    });

    var pub = view.querySelector('#btn-publish');
    if (pub) pub.addEventListener('click', function () {
      ui.confirm({
        title: 'Publish final result',
        body: fmt.plural(included.length, 'candidate') + ' will be marked <strong>finally selected</strong> and ' +
          'will receive the e-mail and SMS shown in the preview.',
        okText: 'Publish result'
      }).then(function (ok) {
        if (!ok) return;
        store.update('templates', tpl.id, { mailSubject: tpl.mailSubject, mailBody: tpl.mailBody, smsBody: tpl.smsBody });
        var records = [];
        included.forEach(function (x) {
          store.update('applicants', x.a.id, { status: 'SELECTED' });
          x.row.resultStatus = 'PASSED';
          var v = varsFor(x);
          records.push({
            applicantId: x.a.id, applicantName: x.a.name, circularId: c.id, stageId: stg.id,
            kind: 'FINAL', channel: 'MAIL', to: x.a.email,
            subject: fmt.merge(tpl.mailSubject, v), body: fmt.merge(tpl.mailBody, v)
          });
          records.push({
            applicantId: x.a.id, applicantName: x.a.name, circularId: c.id, stageId: stg.id,
            kind: 'FINAL', channel: 'SMS', to: x.a.mobile, subject: '', body: fmt.merge(tpl.smsBody, v)
          });
        });
        list.filter(function (x) { return excluded[x.a.id]; }).forEach(function (x) {
          store.update('applicants', x.a.id, { status: 'REJECTED' });
        });
        store.notify(records);
        store.markCircularStep(c.id, 'result', { count: included.length });
        store.audit('FINAL_RESULT', 'circular', c.id,
          'Final result published — ' + included.length + ' selected, ' + included.length * 2 + ' notifications sent');
        ui.toast('Final result published to ' + fmt.plural(included.length, 'candidate'));
        ERec.router.go('#/circular/' + c.id + '/stage/' + stg.id + '/offer');
      });
    });

    var reopen = view.querySelector('#btn-reopen');
    if (reopen) reopen.addEventListener('click', function () {
      store.clearCircularStep(c.id, 'result');
      ui.toast('Final result re-opened');
      ERec.router.refresh();
    });
  }

  ERec.pages.result = { render: render, meritList: meritList };
})(window);
