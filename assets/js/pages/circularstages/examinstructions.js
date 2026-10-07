/* Admit Card - printed on the admit card for this stage.
   Referenced from PBL_Admitcard.pdf sample for Pubali Bank Limited. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var DEFAULT_PBL_INSTRUCTIONS = [
    'Applicant must bring this admit card at examination center and must preserve the same for future use.',
    'Applicant shall report to the examination center at least 30 minutes prior to start of examination. No candidate will be allowed to enter examination center after exam starts.',
    'Calculator, books, bag, mobile phone, smart watch and any other electronic/communication devices are strictly prohibited in examination center. Applicant will be expelled if these things are found in his/her possession during examination.',
    'Applicant shall use black ink ball point pen.',
    'Applicant must put same signature of application in attendance sheet and answer script.',
    'No Applicant will be allowed to leave examinaiton center before exam ends.',
    'TA/DA will not be admissible in this connection.',
    'Applicant will be expelled if found guilty of forgery, copying, adopting any type of unfair means, misconduct, misbehaviour. If necessary, hall authority can hand over him/her to law enforcement agency for taking legal action in this regard.'
  ];

  function lines(text) {
    return (text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function formatAdmitDate(val) {
    if (!val) return 'Friday, 21 October 2022';
    var d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return days[d.getDay()] + ', ' + fmt.pad(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function formatShortDate(val) {
    if (!val) return '06 October 2022';
    var d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return fmt.pad(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function formatAdmitTime(v) {
    if (!v || !v.startTime) return '10:00 AM to 11:00 AM (01 Hour)';
    var st = fmt.time12(v.startTime);
    var et = v.endTime ? fmt.time12(v.endTime) : '';
    if (!et) return st;
    var p1 = String(v.startTime).split(':');
    var p2 = String(v.endTime).split(':');
    var m1 = parseInt(p1[0], 10) * 60 + parseInt(p1[1] || '0', 10);
    var m2 = parseInt(p2[0], 10) * 60 + parseInt(p2[1] || '0', 10);
    var diffM = m2 - m1;
    var durStr = '';
    if (diffM > 0) {
      var hrs = Math.floor(diffM / 60);
      var mins = diffM % 60;
      durStr = ' (' + (hrs > 0 ? fmt.pad(hrs) + ' Hour' + (hrs > 1 ? 's' : '') : '') + (mins > 0 ? ' ' + mins + ' Mins' : '') + ')';
    }
    return st + ' to ' + et + durStr;
  }

  function formatReportingTime(v) {
    if (!v || !v.startTime) return '09:30 AM';
    var rep = v.reportingTime ? fmt.time12(v.reportingTime) : fmt.time12(fmt.shiftTime(v.startTime, -30));
    return rep || '09:30 AM';
  }

  function formatPrintDate(d) {
    d = d || new Date();
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return fmt.pad(d.getDate()) + ' ' + months[d.getMonth()] + ', ' + d.getFullYear() + ' ' +
      fmt.pad(d.getHours()) + ':' + fmt.pad(d.getMinutes()) + ':' + fmt.pad(d.getSeconds());
  }

  /* Renders the official Pubali Bank Admit Card HTML layout matching PBL_Admitcard.pdf */
  function buildAdmitCardHtml(stg, text, row, options) {
    options = options || {};
    var c = store.circular(stg.circularId) || { post: 'UI/UX Designer', code: 'SDD/2022' };
    var roster = store.rosterOf(stg.id);
    var r = row || roster[0];
    var a = r ? store.applicant(r.applicantId) : null;
    var v = r && r.venueId ? store.find('venues', r.venueId) : (store.venuesOf(stg.id)[0] || null);

    var rollNo = (r && r.rollNo) ? r.rollNo : '3037';
    var idNumber = (a && a.appNo)
      ? (a.appNo.match(/\d{4,}/) ? a.appNo.match(/\d{4,}/)[0] : a.appNo.replace(/^[^\d]*-?/, ''))
      : ((a && a.id) ? a.id.replace(/\D/g, '') : '20220543');
    if (!idNumber || idNumber.length < 4) idNumber = '20220543';

    var applicantName = a ? a.name : 'MD. FAHIM';
    var fatherName = (a && a.fatherName) ? a.fatherName : 'MD. AMIR HOSSAIN';
    var motherName = (a && a.motherName) ? a.motherName : 'MST. SALEHA BEGUM';

    var examDateStr = v ? formatAdmitDate(v.examDate) : 'Friday, 21 October 2022';
    var examTimeStr = formatAdmitTime(v);
    var reportingTimeStr = formatReportingTime(v);
    var venueStr = v
      ? fmt.esc(v.name) + (v.address ? ', ' + fmt.esc(v.address) : '')
      : 'Govt. Laboratory High School, NAEM Road (New Market Area) Dhanmondi, Dhaka';

    var postName = c.post || 'UI/UX Designer';
    var rankName = c.rank || (c.grade ? c.grade.toUpperCase() : 'SENIOR OFFICER');
    var refNo = c.refNo || ('PBL/HO/HRD/RECRUITMENT/' + (c.code || 'SDD') + '/2022');
    var issueDate = formatShortDate(stg.createdAt || c.publishedAt || new Date());

    var examTitle = pipe.typeLabel(stg.type).toUpperCase();
    if (examTitle.indexOf('TEST') === -1 && examTitle.indexOf('EXAM') === -1) {
      examTitle += ' TEST';
    }

    var instList = lines(text);
    if (!instList.length) instList = DEFAULT_PBL_INSTRUCTIONS;

    var instructionsHtml = instList.map(function (lineText, idx) {
      return '<div style="display:flex;margin-bottom:3.5px;align-items:flex-start;">' +
        '<span style="min-width:26px;font-weight:bold;">' + fmt.pad(idx + 1, 2) + '.</span>' +
        '<span style="flex:1;">' + fmt.esc(lineText) + '</span>' +
        '</div>';
    }).join('');

    var photoSrc = (a && a.photo) ? a.photo : 'assets/images/fahim.png';
    var printTimestamp = formatPrintDate(new Date());

    /* Official HRD Seal Stamp SVG overlapping bottom-right corner of photo */
    var sealStampSvg =
      '<svg width="78" height="78" viewBox="0 0 100 100" style="position:absolute;right:-14px;bottom:-18px;pointer-events:none;z-index:2;transform:rotate(-8deg);opacity:0.92;">' +
      '<defs>' +
      '<path id="pbl-seal-top" d="M 12,50 A 38,38 0 1,1 88,50" fill="none" />' +
      '<path id="pbl-seal-bottom" d="M 88,50 A 38,38 0 0,1 12,50" fill="none" />' +
      '</defs>' +
      '<circle cx="50" cy="50" r="47" fill="none" stroke="#096E40" stroke-width="1.8" />' +
      '<circle cx="50" cy="50" r="43.5" fill="none" stroke="#096E40" stroke-width="0.8" stroke-dasharray="2.5,1.5" />' +
      '<circle cx="50" cy="50" r="28" fill="none" stroke="#096E40" stroke-width="1" />' +
      '<text font-family="\'Times New Roman\', Times, serif" font-size="7.6" font-weight="bold" fill="#096E40" letter-spacing="0.5">' +
      '<textPath href="#pbl-seal-top" startOffset="50%" text-anchor="middle">PUBALI BANK LIMITED</textPath>' +
      '</text>' +
      '<text font-family="\'Times New Roman\', Times, serif" font-size="6.4" font-weight="bold" fill="#096E40" letter-spacing="0.4">' +
      '<textPath href="#pbl-seal-bottom" startOffset="50%" text-anchor="middle">★ HUMAN RESOURCES DIVISION ★</textPath>' +
      '</text>' +
      '<polygon points="50,33 54,42 63,43 57,50 59,59 50,54 41,59 43,50 37,43 46,42" fill="#096E40" opacity="0.9" />' +
      '</svg>';

    return '<div class="pbl-admit-card">' +
      /* Faint Watermark Logo */
      '<div class="pbl-admit-watermark"></div>' +

      /* Top Header Section */
      '<div style="position:relative;margin-bottom:12px;min-height:92px;z-index:1;">' +
      '<div style="position:absolute;left:18px;top:2px;">' +
      '<img src="assets/images/pbl_admit_logo.jpg" alt="Pubali Bank Logo" style="width:68px;height:68px;object-fit:contain;display:block;">' +
      '</div>' +
      '<div style="text-align:center;">' +
      '<div style="font-size:17.5px;font-weight:bold;letter-spacing:0.4px;">PUBALI BANK LIMITED</div>' +
      '<div style="font-size:13px;font-weight:normal;margin-top:2px;">Human Resources Division</div>' +
      '<div style="font-size:12px;margin-top:1px;">Head Office</div>' +
      '<div style="font-size:11.5px;margin-top:1px;">26 Dilkusha Commercial Area</div>' +
      '<div style="font-size:11.5px;margin-top:1px;">P.O.Box. 853, Dhaka-1000</div>' +
      '<div style="font-size:11.5px;margin-top:1px;">Bangladesh</div>' +
      '</div>' +
      '</div>' +

      /* Reference & Date Bar */
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:12px;position:relative;z-index:1;">' +
      '<div><strong>Ref:</strong> ' + fmt.esc(refNo) + '</div>' +
      '<div><strong>Date:</strong> ' + fmt.esc(issueDate) + '</div>' +
      '</div>' +

      /* Stage / Exam Title */
      '<div style="text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;margin-bottom:12px;position:relative;z-index:1;letter-spacing:0.5px;">' +
      fmt.esc(examTitle) +
      '</div>' +

      /* Candidate Details & Photo Grid */
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;margin-bottom:10px;">' +
      '<table style="border-collapse:collapse;font-size:12.5px;color:#000;flex:1;">' +
      '<tbody>' +
      '<tr>' +
      '<td style="padding:2.5px 0;width:130px;white-space:nowrap;">Roll No.</td>' +
      '<td style="padding:2.5px 10px;width:15px;text-align:center;">:</td>' +
      '<td style="padding:2.5px 0;">' +
      '<div class="pbl-admit-val-box">' + fmt.esc(rollNo) + '</div>' +
      '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:2.5px 0;white-space:nowrap;">ID Number</td>' +
      '<td style="padding:2.5px 10px;text-align:center;">:</td>' +
      '<td style="padding:2.5px 0;">' +
      '<div class="pbl-admit-val-box">' + fmt.esc(idNumber) + '</div>' +
      '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;">Applicant\'s Name</td>' +
      '<td style="padding:3px 10px;text-align:center;">:</td>' +
      '<td style="padding:3px 0;font-weight:bold;text-transform:uppercase;">' + fmt.esc(applicantName) + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;">Father\'s Name</td>' +
      '<td style="padding:3px 10px;text-align:center;">:</td>' +
      '<td style="padding:3px 0;font-weight:bold;text-transform:uppercase;">' + fmt.esc(fatherName) + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;">Mother\'s Name</td>' +
      '<td style="padding:3px 10px;text-align:center;">:</td>' +
      '<td style="padding:3px 0;font-weight:bold;text-transform:uppercase;">' + fmt.esc(motherName) + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;">Date</td>' +
      '<td style="padding:3px 10px;text-align:center;">:</td>' +
      '<td style="padding:3px 0;">' + fmt.esc(examDateStr) + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;">Time</td>' +
      '<td style="padding:3px 10px;text-align:center;">:</td>' +
      '<td style="padding:3px 0;">' + fmt.esc(examTimeStr) + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;">Reporting Time</td>' +
      '<td style="padding:3px 10px;text-align:center;">:</td>' +
      '<td style="padding:3px 0;">' + fmt.esc(reportingTimeStr) + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:3px 0;white-space:nowrap;vertical-align:top;">Venue</td>' +
      '<td style="padding:3px 10px;text-align:center;vertical-align:top;">:</td>' +
      '<td style="padding:3px 0;vertical-align:top;line-height:1.4;">' + venueStr + '</td>' +
      '</tr>' +
      '</tbody>' +
      '</table>' +

      /* Photo and Seal Frame */
      '<div style="margin-left:20px;position:relative;flex-shrink:0;">' +
      '<div class="pbl-admit-photo-box">' +
      '<img src="' + fmt.esc(photoSrc) + '" alt="' + fmt.esc(applicantName) + '" onerror="this.onerror=null;this.src=\'assets/images/fahim.png\';">' +
      '</div>' +
      sealStampSvg +
      '</div>' +
      '</div>' +

      /* Reference Letter Text */
      '<div style="font-size:12px;line-height:1.45;margin:10px 0;position:relative;z-index:1;">' +
      'With reference to your application for the post of <strong>' + fmt.esc(postName) + '</strong> in the rank of <strong>' + fmt.esc(rankName) + '</strong> in our Bank you are requested to appear at the <strong>' + fmt.esc(examTitle) + '</strong> as per above mentioned schedule.' +
      '</div>' +

      /* Instructions Section */
      '<div style="position:relative;z-index:1;margin-top:10px;">' +
      '<div style="font-size:12.5px;font-weight:bold;margin-bottom:6px;">' +
      'Instructions for applicants:' +
      '</div>' +
      '<div style="font-size:11px;line-height:1.42;">' +
      instructionsHtml +
      '</div>' +
      '</div>' +

      /* Signatory and Printing Date Footer */
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;position:relative;z-index:1;">' +
      '<div style="font-size:12px;line-height:1.35;">' +
      '<div>Yours sincerely,</div>' +
      '<div style="height:38px;margin:2px 0;">' +
      '<img src="assets/images/pbl_admit_sign.jpg" alt="Signature" style="height:36px;width:auto;display:block;">' +
      '</div>' +
      '<div style="font-weight:bold;">(Ismat Ara Huq)</div>' +
      '<div>General Manager</div>' +
      '</div>' +
      '<div style="font-size:11px;color:#111;text-align:right;padding-bottom:2px;">' +
      '<strong>Printing Date:</strong> ' + fmt.esc(printTimestamp) +
      '</div>' +
      '</div>' +

      '<div style="clear:both;"></div>' +
      '</div>';
  }

  function admitPreview(stg, text, row) {
    return buildAdmitCardHtml(stg, text, row, { isPrint: false });
  }

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var roster = store.rosterOf(stg.id);
    var done = store.isStepDone(stg, 'instructions');
    var text = stg.instructions || DEFAULT_PBL_INSTRUCTIONS.join('\n');
    var next = pipe.step(stg, 'initiate');

    var body = ui.lockedNotice(stg, 'instructions');

    body += '<div class="row justify-content-center">' +
      '<div class="col-lg-10 col-xl-9">' +
      ui.card({
        title: 'Total Candidate (' + roster.length + ')',
        actions: '<div class="d-flex align-items-center gap-2">' +
          (roster.length > 1
            ? '<select class="form-select form-select-sm" id="f-who" style="width:200px">' +
            roster.slice(0, 60).map(function (r, i) {
              var a = store.applicant(r.applicantId);
              return '<option value="' + r.id + '"' + (i === 0 ? ' selected' : '') + '>' +
                fmt.esc((r.rollNo ? r.rollNo + ' · ' : '') + a.name) + '</option>';
            }).join('') + '</select>'
            : '') +
          '<button class="btn btn-sm btn-outline-primary btn-icon" id="btn-edit-inst">' +
          '<i class="bi bi-pencil-square"></i> Edit instructions' +
          '</button>' +
          '</div>',
        body:
          '<div id="preview" class="p-1">' + admitPreview(stg, text, roster[0]) + '</div>' +
          '<div class="d-flex justify-content-end mt-3 pt-3 border-top">' +
          '<a href="#/print/admit/' + stg.id + '" target="_blank" class="btn btn-sm btn-outline-secondary btn-icon" id="btn-print-admit">' +
          '<i class="bi bi-printer"></i> Print admit card' +
          '</a>' +
          '</div>'
      }) +
      '</div>' +
      '</div>';

    var numInst = lines(text).length;
    var action = {
      note: done ? fmt.plural(numInst, 'instruction') + ' saved · Ready for exam notice' : 'Admit card instructions ready',
      secondary: [],
      primary: done && next
        ? { nav: next.key, label: 'Continue: ' + next.label, icon: 'bi-chevron-right' }
        : { id: 'btn-bar-edit', tone: 'primary', icon: 'bi-pencil', label: done ? 'Edit instructions' : 'Configure instructions' }
    };

    ui.stagePage(view, stg, 'instructions', { body: body, action: action });

    function currentRow() {
      var sel = view.querySelector('#f-who');
      if (sel && sel.value) {
        var r = store.find('stageApplicants', sel.value);
        if (r) return r;
      }
      return roster[0];
    }

    function repaint() {
      var prevEl = view.querySelector('#preview');
      if (prevEl) {
        prevEl.innerHTML = admitPreview(stg, text, currentRow());
      }
    }

    var who = view.querySelector('#f-who');
    if (who) who.addEventListener('change', repaint);

    function openEditModal() {
      ui.modal({
        title: 'Edit Admit Card instructions · ' + fmt.esc(pipe.typeLabel(stg.type)),
        size: 'lg',
        body:
          '<div class="mb-3">' +
          '<label class="form-label fw-semibold">Admit Card instructions</label>' +
          '<p class="form-text mt-0 mb-2">Write one instruction per line — they are automatically numbered (01, 02, ...) on the admit card.</p>' +
          '<textarea class="form-control font-monospace fs-13" id="m-text" rows="12" placeholder="Applicant must bring this admit card...">' +
          fmt.esc(text) +
          '</textarea>' +
          '<div class="d-flex justify-content-between align-items-center mt-2">' +
          '<span class="form-text fw-semibold text-primary" id="m-line-count"></span>' +
          '<span class="form-text text-muted">Printed on every candidate admit card</span>' +
          '</div>' +
          '</div>',
        footer:
          '<button class="btn btn-sm btn-light btn-icon" id="m-btn-preset"><i class="bi bi-magic me-1"></i> Load standard Pubali Bank instructions</button>' +
          '<div class="ms-auto d-flex gap-2">' +
          '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
          '<button class="btn btn-sm btn-primary" id="m-btn-save"><i class="bi bi-check2 me-1"></i> Save instructions</button>' +
          '</div>',
        onShow: function (api) {
          var mText = api.find('#m-text');
          var mCount = api.find('#m-line-count');

          function updateCount() {
            var n = lines(mText.value).length;
            mCount.textContent = fmt.plural(n, 'instruction');
          }

          mText.addEventListener('input', updateCount);
          updateCount();

          api.find('#m-btn-preset').addEventListener('click', function () {
            mText.value = DEFAULT_PBL_INSTRUCTIONS.join('\n');
            updateCount();
            ui.toast('Standard Pubali Bank instructions loaded — click Save instructions to apply');
          });

          api.find('#m-btn-save').addEventListener('click', function () {
            var val = mText.value;
            if (!lines(val).length) {
              ui.toast('Add at least one instruction', 'warning');
              return;
            }
            text = val;
            stg.instructions = val;
            store.update('stages', stg.id, { instructions: val });
            store.markStep(stg.id, 'instructions', { count: lines(val).length });
            store.audit('SET_INSTRUCTIONS', 'stage', stg.id,
              fmt.plural(lines(val).length, 'instruction') + ' saved for ' + pipe.typeLabel(stg.type));
            repaint();
            api.close();
            ui.toast('Admit Card instructions saved');
            ERec.router.refresh();
          });
        }
      });
    }

    var editBtn = view.querySelector('#btn-edit-inst');
    if (editBtn) editBtn.addEventListener('click', openEditModal);

    var barEditBtn = view.querySelector('#btn-bar-edit');
    if (barEditBtn) barEditBtn.addEventListener('click', openEditModal);

    var cd = view.querySelector('#btn-clear-done');
    if (cd) cd.addEventListener('click', function () {
      store.clearStep(stg.id, 'instructions');
      ERec.router.refresh();
    });
  }

  ERec.pages.examinstructions = {
    render: render,
    lines: lines,
    buildAdmitCardHtml: buildAdmitCardHtml,
    DEFAULT_PBL_INSTRUCTIONS: DEFAULT_PBL_INSTRUCTIONS
  };
  ERec.pages.examInstructions = ERec.pages.examinstructions;
  ERec.pages.instructions = ERec.pages.examinstructions;
  ERec.pages.admitcard = ERec.pages.examinstructions;
})(window);
