/* Initiate exam - the user must see (and may edit) the exact mail and SMS
   body that goes to candidates before anything is sent. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var PLACEHOLDERS = [
    ['name', 'Candidate name'], ['roll', 'Roll number'], ['post', 'Post applied for'],
    ['circular', 'Circular number'], ['date', 'Exam date'], ['time', 'Reporting time'],
    ['examTime', 'Exam start time'],
    ['venue', 'Venue name'], ['venueAddress', 'Venue address']
  ];

  function varsFor(stg, row) {
    var c = store.circular(stg.circularId);
    var a = store.applicant(row.applicantId);
    var v = row.venueId ? store.find('venues', row.venueId) : store.venuesOf(stg.id)[0];
    return {
      name: a.name, roll: row.rollNo || '(roll not generated)', post: c.post, circular: c.code,
      date: (v && v.examDate) ? fmt.date(v.examDate) : (stg.examDate ? fmt.date(stg.examDate) : '(date not set)'),
      time: v ? fmt.time12(v.reportingTime || fmt.shiftTime(v.startTime, -30)) : '(time not set)',
      examTime: v ? fmt.time12(v.startTime) : '(time not set)',
      venue: v ? v.name : '(venue not set)',
      venueAddress: v ? v.address : ''
    };
  }

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var roster = store.rosterOf(stg.id);
    var state = store.stepState(stg, 'initiate');
    var done = !!(state && state.done);
    var label = pipe.typeLabel(stg.type);
    var tpl = store.templateFor(c.id, stg.id, 'ADMIT', ERec.seed.defaultTemplates(stg.type, label));

    /* Candidates added later by a supplementary call have had nothing sent
       to them yet, so they are tracked separately from the first dispatch. */
    var notified = {};
    store.all('notifications').forEach(function (n) {
      if (n.stageId === stg.id && n.kind === 'ADMIT') notified[n.applicantId] = true;
    });
    var pendingRows = roster.filter(function (r) { return !notified[r.applicantId]; });

    var body = ui.lockedNotice(stg, 'initiate');

    var chips = PLACEHOLDERS.map(function (p) {
      return '<span class="ph-chip" data-ph="' + p[0] + '" title="' + fmt.esc(p[1]) + '">{{' + p[0] + '}}</span>';
    }).join('');

    // Fetch Exam Date from seatplan (venues configured in seatplan.js)
    var seatVenues = store.venuesOf(stg.id) || [];
    var seatDates = seatVenues.map(function (v) { return v.examDate; }).filter(Boolean);
    var uniqueSeatDates = Array.from(new Set(seatDates)).sort();

    var examDateDisplay = 'Not scheduled';
    var examDateTitle = 'Not scheduled';

    if (uniqueSeatDates.length === 1) {
      examDateDisplay = fmt.date(uniqueSeatDates[0]);
      examDateTitle = examDateDisplay;
    } else if (uniqueSeatDates.length > 1) {
      examDateDisplay = fmt.date(uniqueSeatDates[0]) + ' – ' + fmt.date(uniqueSeatDates[uniqueSeatDates.length - 1]);
      examDateTitle = uniqueSeatDates.map(fmt.date).join(', ');
    } else if (stg.examDate) {
      examDateDisplay = fmt.date(stg.examDate);
      examDateTitle = examDateDisplay;
    }

    body += '<div class="row g-3">' +
      '<!-- Metric 1: Candidates -->' +
      '<div class="col-12 col-sm-6 col-xl-3">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px;">Candidates</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-dark">' + roster.length + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-primary-subtle text-primary">' +
      '<i class="bi bi-people-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<!-- Metric 2: Already Notified -->' +
      '<div class="col-12 col-sm-6 col-xl-3">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px;">Already Notified</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-success">' + (roster.length - pendingRows.length) + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-success-subtle text-success">' +
      '<i class="bi bi-check2-all"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<!-- Metric 3: Not Yet Notified -->' +
      '<div class="col-12 col-sm-6 col-xl-3">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px;">Not Yet Notified</span>' +
      '<h3 class="fw-bold mb-0 mt-1 ' + (pendingRows.length ? 'text-warning' : 'text-dark') + '">' + pendingRows.length + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-warning-subtle text-warning">' +
      '<i class="bi bi-hourglass-split"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<!-- Metric 4: Exam Date -->' +
      '<div class="col-12 col-sm-6 col-xl-3">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div class="overflow-hidden pe-2">' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px;">Exam Date</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-primary fs-5 text-truncate" title="' + fmt.esc(examDateTitle) + '">' + fmt.esc(examDateDisplay) + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-info-subtle text-info">' +
      '<i class="bi bi-calendar-event-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="col-12">' +
      ui.card({
        title: 'Total Candidate (' + roster.length + ')',
        actions: (roster.length > 1
          ? '<div class="d-flex align-items-center gap-2">' +
          '<label for="f-who" class="fs-12 text-muted text-nowrap mb-0 d-none d-sm-inline">Preview candidate:</label>' +
          '<select class="form-select form-select-sm" id="f-who" style="width:220px">' +
          roster.slice(0, 60).map(function (r, i) {
            var a = store.applicant(r.applicantId);
            return '<option value="' + r.id + '"' + (i === 0 ? ' selected' : '') + '>' +
              fmt.esc((r.rollNo ? r.rollNo + ' · ' : '') + a.name) + '</option>';
          }).join('') + '</select>' +
          '</div>'
          : ''),
        body: roster.length
          ? '<div class="row g-3">' +
          '<!-- E-MAIL Section -->' +
          '<div class="col-md-6">' +
          '<div class="p-3 border rounded bg-white h-100 d-flex flex-column shadow-2xs">' +
          '<div class="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom flex-wrap gap-1">' +
          '<div class="d-flex align-items-center gap-2">' +
          '<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded px-2 py-0.5 fs-11 fw-semibold">' +
          '<i class="bi bi-envelope-fill me-1"></i>E-MAIL' +
          '</span>' +
          '<span class="fs-12 text-muted text-truncate" style="max-width:220px;">To: <span class="mono fw-semibold text-dark" id="p-to"></span></span>' +
          '</div>' +
          '<button type="button" class="btn-table-action px-2.5 py-1 fs-11 rounded d-flex align-items-center gap-1" id="btn-edit-email">' +
          '<i class="bi bi-pencil-square"></i> Edit E-mail' +
          '</button>' +
          '</div>' +
          '<div class="preview-box flex-grow-1 d-flex flex-column mb-0" style="min-height: 220px;">' +
          '<div class="fs-11 text-muted text-uppercase fw-semibold mb-1">Subject</div>' +
          '<div class="fw-bold text-dark fs-13 mb-2" id="p-sub"></div>' +
          '<hr class="hr-soft my-1.5">' +
          '<div class="fs-11 text-muted text-uppercase fw-semibold mb-1">Body</div>' +
          '<div class="flex-grow-1" id="p-mail" style="white-space: pre-wrap;"></div>' +
          '</div>' +
          '</div>' +
          '</div>' +

          '<!-- SMS Section -->' +
          '<div class="col-md-6">' +
          '<div class="p-3 border rounded bg-white h-100 d-flex flex-column shadow-2xs">' +
          '<div class="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom flex-wrap gap-1">' +
          '<div class="d-flex align-items-center gap-2">' +
          '<span class="badge bg-success-subtle text-success border border-success-subtle rounded px-2 py-0.5 fs-11 fw-semibold">' +
          '<i class="bi bi-chat-dots-fill me-1"></i>SMS' +
          '</span>' +
          '<span class="fs-12 text-muted text-truncate" style="max-width:220px;">To: <span class="mono fw-semibold text-dark" id="p-mob"></span></span>' +
          '</div>' +
          '<button type="button" class="btn-table-action px-2.5 py-1 fs-11 rounded d-flex align-items-center gap-1" id="btn-edit-sms">' +
          '<i class="bi bi-pencil-square"></i> Edit SMS' +
          '</button>' +
          '</div>' +
          '<div class="preview-box flex-grow-1 d-flex flex-column mb-0" style="min-height: 220px;">' +
          '<div class="d-flex justify-content-between align-items-center mb-1.5">' +
          '<span class="fs-11 text-muted text-uppercase fw-semibold">SMS Text</span>' +
          '<span class="fs-11 text-muted font-monospace" id="p-sms-count"></span>' +
          '</div>' +
          '<div class="flex-grow-1" id="p-sms" style="white-space: pre-wrap;"></div>' +
          '<div class="mt-2 pt-2 border-top text-muted fs-11 d-flex align-items-center gap-1">' +
          '<i class="bi bi-info-circle"></i> Merged length is what actually gets sent' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>'
          : ui.empty('No candidate on this roster')
      }) +
      '</div></div>';

    var action;
    if (!done) {
      action = {
        primary: {
          id: 'btn-send', tone: 'success', icon: 'bi-send-fill',
          label: 'Send to ' + fmt.plural(roster.length, 'candidate'), disabled: !roster.length
        }
      };
    } else if (pendingRows.length) {
      action = {
        note: fmt.plural(roster.length - pendingRows.length, 'candidate') + ' already notified',
        primary: {
          id: 'btn-send-pending', tone: 'success', icon: 'bi-send-fill',
          label: 'Send to the ' + pendingRows.length + ' new candidate' + (pendingRows.length === 1 ? '' : 's')
        }
      };
    } else {
      var next = pipe.step(stg, 'scrutiny') || pipe.step(stg, 'marks');
      action = {
        note: fmt.plural(roster.length, 'candidate') + ' notified',
        secondary: [
          { id: 'btn-resend', label: 'Send again to everyone' }
        ],
        primary: next ? { nav: next.key, label: 'Continue: ' + next.label, icon: 'bi-chevron-right' } : null
      };
    }

    ui.stagePage(view, stg, 'initiate', { body: body, action: action });

    function currentRow() {
      var sel = view.querySelector('#f-who');
      if (sel && sel.value) {
        var r = store.find('stageApplicants', sel.value);
        if (r) return r;
      }
      return roster[0];
    }

    function repaint() {
      var row = currentRow();
      if (!row) return;
      var v = varsFor(stg, row);
      var a = store.applicant(row.applicantId);
      var mergedSms = fmt.merge(tpl.smsBody, v);
      var p = fmt.smsParts(mergedSms);

      var pTo = view.querySelector('#p-to');
      var pMob = view.querySelector('#p-mob');
      var pSub = view.querySelector('#p-sub');
      var pMail = view.querySelector('#p-mail');
      var pSms = view.querySelector('#p-sms');
      var pCount = view.querySelector('#p-sms-count');

      if (pTo) pTo.textContent = a.email;
      if (pMob) pMob.textContent = a.mobile;
      if (pSub) pSub.textContent = fmt.merge(tpl.mailSubject, v);
      if (pMail) pMail.textContent = fmt.merge(tpl.mailBody, v);
      if (pSms) pSms.textContent = mergedSms;
      if (pCount) {
        pCount.textContent = p.len + ' characters · ' + fmt.plural(p.parts, 'SMS part');
        pCount.classList.toggle('text-danger', p.parts > 1);
      }
    }

    var who = view.querySelector('#f-who');
    if (who) who.addEventListener('change', repaint);
    if (roster.length) repaint();

    function openEditModal(channel) {
      channel = channel || 'all';
      var isEmailOnly = channel === 'email';
      var isSmsOnly = channel === 'sms';

      var modalTitle = isEmailOnly
        ? 'Edit E-mail notification'
        : (isSmsOnly
          ? 'Edit SMS notification'
          : 'Edit notification content');

      var emailFieldsHtml =
        '<div class="mb-3">' +
        '<label class="form-label fw-semibold">E-mail subject</label>' +
        '<input class="form-control" id="m-subject" value="' + fmt.esc(tpl.mailSubject) + '">' +
        '</div>' +
        '<div class="mb-3">' +
        '<label class="form-label fw-semibold">E-mail body</label>' +
        '<textarea class="form-control" id="m-mail" rows="' + (isEmailOnly ? '10' : '6') + '">' + fmt.esc(tpl.mailBody) + '</textarea>' +
        '</div>';

      var smsFieldsHtml =
        '<div class="mb-3">' +
        '<label class="form-label fw-semibold">SMS body</label>' +
        '<textarea class="form-control" id="m-sms" rows="' + (isSmsOnly ? '6' : '4') + '">' + fmt.esc(tpl.smsBody) + '</textarea>' +
        '<div class="d-flex justify-content-between mt-1">' +
        '<span class="sms-count" id="m-sms-count"></span>' +
        '<span class="form-text">Merged length is what actually gets sent</span>' +
        '</div>' +
        '</div>';

      ui.modal({
        title: modalTitle,
        size: 'lg',
        body:
          '<div class="mb-3">' +
          '<div class="fs-12 text-muted mb-2">Click a placeholder to insert it at the cursor:</div>' +
          chips +
          '</div>' +
          (!isSmsOnly ? emailFieldsHtml : '') +
          (!isEmailOnly ? smsFieldsHtml : ''),
        footer:
          '<button class="btn btn-sm btn-light" id="m-btn-reset">' +
          (isEmailOnly ? 'Reset to standard e-mail' : (isSmsOnly ? 'Reset to standard SMS' : 'Reset to standard text')) +
          '</button>' +
          '<div class="ms-auto d-flex gap-2">' +
          '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
          '<button class="btn btn-sm btn-primary" id="m-btn-save"><i class="bi bi-check2 me-1"></i> Save changes</button>' +
          '</div>',
        onShow: function (api) {
          var mSub = api.find('#m-subject');
          var mMail = api.find('#m-mail');
          var mSms = api.find('#m-sms');
          var mCount = api.find('#m-sms-count');
          var lastField = isSmsOnly ? mSms : mMail;

          function updateSmsCount() {
            if (!mSms || !mCount) return;
            var row = currentRow();
            var v = row ? varsFor(stg, row) : {};
            var merged = fmt.merge(mSms.value, v);
            var p = fmt.smsParts(merged);
            mCount.textContent = p.len + ' characters · ' + fmt.plural(p.parts, 'SMS part');
            mCount.classList.toggle('over', p.parts > 1);
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
              var el = lastField || (isSmsOnly ? mSms : mMail);
              if (!el) return;
              var s = el.selectionStart || 0, t = el.selectionEnd || 0;
              el.value = el.value.slice(0, s) + token + el.value.slice(t);
              el.focus();
              el.selectionStart = el.selectionEnd = s + token.length;
              if (el === mSms) updateSmsCount();
            });
          });

          if (mSms) updateSmsCount();

          var resetBtn = api.find('#m-btn-reset');
          if (resetBtn) {
            resetBtn.addEventListener('click', function () {
              var d = ERec.seed.defaultTemplates(stg.type, pipe.typeLabel(stg.type));
              if (!isSmsOnly && mSub && mMail) {
                mSub.value = d.mailSubject;
                mMail.value = d.mailBody;
              }
              if (!isEmailOnly && mSms) {
                mSms.value = d.smsBody;
                updateSmsCount();
              }
              ui.toast('Standard text restored — remember to save changes');
            });
          }

          var saveBtn = api.find('#m-btn-save');
          if (saveBtn) {
            saveBtn.addEventListener('click', function () {
              var updates = {};
              if (!isSmsOnly && mSub && mMail) {
                tpl.mailSubject = mSub.value;
                tpl.mailBody = mMail.value;
                updates.mailSubject = tpl.mailSubject;
                updates.mailBody = tpl.mailBody;
              }
              if (!isEmailOnly && mSms) {
                tpl.smsBody = mSms.value;
                updates.smsBody = tpl.smsBody;
              }
              store.update('templates', tpl.id, updates);
              repaint();
              api.close();
              ui.toast((isEmailOnly ? 'E-mail' : (isSmsOnly ? 'SMS' : 'Notification')) + ' content updated');
            });
          }
        }
      });
    }

    var editEmailBtn = view.querySelector('#btn-edit-email');
    if (editEmailBtn) editEmailBtn.addEventListener('click', function () { openEditModal('email'); });

    var editSmsBtn = view.querySelector('#btn-edit-sms');
    if (editSmsBtn) editSmsBtn.addEventListener('click', function () { openEditModal('sms'); });

    var editBtn = view.querySelector('#btn-edit-tpl');
    if (editBtn) editBtn.addEventListener('click', function () { openEditModal('all'); });

    /* ---- dispatch ---- */
    function dispatch(rows) {
      var records = [];
      rows.forEach(function (row) {
        var a = store.applicant(row.applicantId);
        var v = varsFor(stg, row);
        records.push({
          applicantId: a.id, applicantName: a.name, circularId: c.id, stageId: stg.id,
          kind: 'ADMIT', channel: 'MAIL', to: a.email,
          subject: fmt.merge(tpl.mailSubject, v), body: fmt.merge(tpl.mailBody, v)
        });
        records.push({
          applicantId: a.id, applicantName: a.name, circularId: c.id, stageId: stg.id,
          kind: 'ADMIT', channel: 'SMS', to: a.mobile,
          subject: '', body: fmt.merge(tpl.smsBody, v)
        });
      });
      store.notify(records);
      store.update('stages', stg.id, { status: 'IN_PROGRESS' });
      var prior = done ? (state.mail || 0) : 0;
      store.markStep(stg.id, 'initiate', { mail: prior + rows.length, sms: prior + rows.length });
      store.audit('INITIATE_EXAM', 'stage', stg.id,
        pipe.typeLabel(stg.type) + ' notice sent to ' + fmt.plural(rows.length, 'candidate'));
      ui.toast(rows.length * 2 + ' notifications dispatched');
      ERec.router.refresh();
    }

    function confirmSend(rows, title, extraLine) {
      var noVenue = rows.filter(function (r) { return !r.venueId; }).length;
      ui.confirm({
        title: title,
        body: fmt.plural(rows.length, 'candidate') + ' will receive the e-mail and SMS shown in the preview, ' +
          'and their admit cards become printable.' + (extraLine || '') +
          (noVenue ? ' <strong class="text-danger">' + fmt.plural(noVenue, 'candidate') +
            ' have no venue allocated.</strong>' : ''),
        okText: 'Send now'
      }).then(function (ok) { if (ok) dispatch(rows); });
    }

    var sendBtn = view.querySelector('#btn-send');
    if (sendBtn) sendBtn.addEventListener('click', function () {
      confirmSend(roster, 'Send the ' + pipe.typeLabel(stg.type) + ' examination notice');
    });

    var sendPending = view.querySelector('#btn-send-pending');
    if (sendPending) sendPending.addEventListener('click', function () {
      confirmSend(pendingRows, 'Send to the newly called candidates',
        ' Candidates who were already notified are not contacted again.');
    });


    var resend = view.querySelector('#btn-resend');
    if (resend) resend.addEventListener('click', function () {
      ui.confirm({
        title: 'Send again to everyone',
        body: 'The current e-mail and SMS text will be sent again to all ' +
          fmt.plural(roster.length, 'candidate') + ', including those who already received it.',
        okText: 'Send again'
      }).then(function (ok) { if (ok) dispatch(roster); });
    });
  }

  ERec.pages.examnotice = { render: render, varsFor: varsFor };
  ERec.pages.examNotice = ERec.pages.examnotice;
  ERec.pages.initiate = ERec.pages.examnotice;
})(window);
