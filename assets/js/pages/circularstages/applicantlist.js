/* Step 1 - Search applicants under a circular and confirm the roster for
   this stage. On a later stage the roster arrives from the previous stage's
   forward, so the list is shown read-only. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var filters = {};   // kept per stage so going back preserves the search
  var picks = {};     // ditto for the tick boxes - a filter change must not wipe a selection

  function highestEdu(a) {
    var e = a.education[a.education.length - 1];
    return e ? (e.level + (e.subject ? ' (' + e.subject + ')' : '')) : '—';
  }

  function matches(a, f) {
    if (f.q) {
      var q = f.q.toLowerCase();
      var hay = [a.name, a.appNo, a.rollNo, a.mobile, a.email, a.fatherName].join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    if (f.gender && a.gender !== f.gender) return false;
    if (f.district && a.district !== f.district) return false;
    if (f.edu && highestEdu(a).indexOf(f.edu) < 0) return false;
    if (f.status && a.status !== f.status) return false;
    return true;
  }

  /* The complete application as submitted. Shared with the scrutiny screen,
     which shows it side by side with the verification panel. */
  function fullProfileHtml(a) {
    var circ = store.circular(a.circularId);
    function block(title, rows) {
      return '<div class="cv-block"><div class="t">' + title + '</div>' +
        '<dl class="kv">' + rows.map(function (r) {
          return '<dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' +
            (r[1] === '' || r[1] === null || r[1] === undefined ? '<span class="muted">—</span>' : r[1]) + '</dd>';
        }).join('') + '</dl></div>';
    }

    return block('Applied for', [
      ['Post', fmt.esc(circ.post)],
      ['Circular no.', fmt.esc(circ.code), 'mono'],
      ['Application no.', fmt.esc(a.appNo), 'mono'],
      ['Applied on', fmt.date(a.appliedAt)],
      ['Roll number', a.rollNo ? fmt.esc(a.rollNo) : '', 'mono']
    ]) +
      block('Personal information', [
        ['Full name', fmt.esc(a.name)],
        ['Father\'s name', fmt.esc(a.fatherName)],
        ['Mother\'s name', fmt.esc(a.motherName)],
        ['Date of birth', fmt.date(a.dob)],
        ['Gender', fmt.esc(a.gender)],
        ['Marital status', fmt.esc(a.maritalStatus)],
        ['Religion', fmt.esc(a.religion)],
        ['Nationality', fmt.esc(a.nationality)],
        ['Blood group', fmt.esc(a.bloodGroup)],
        ['National ID', fmt.esc(a.nid), 'mono'],
        ['Quota claimed', fmt.esc(a.quota)]
      ]) +
      block('Contact', [
        ['Mobile', fmt.esc(a.mobile), 'mono'],
        ['Alternate contact', fmt.esc(a.altContact), 'mono'],
        ['E-mail', fmt.esc(a.email)],
        ['Present address', fmt.esc(a.presentAddress || a.address)],
        ['Permanent address', fmt.esc(a.permanentAddress)],
        ['Home district', fmt.esc(a.district)]
      ]) +
      '<div class="cv-block"><div class="t">Academic record</div>' +
      '<div class="table-responsive"><table class="table-x"><thead><tr><th>Examination</th><th>Institution / board</th>' +
      '<th>Year</th><th>Result</th></tr></thead><tbody>' +
      a.education.map(function (e) {
        return '<tr><td>' + fmt.esc(e.level) +
          (e.subject ? '<div class="fs-12 muted">' + fmt.esc(e.subject) + '</div>' : '') + '</td>' +
          '<td>' + fmt.esc(e.board) + '</td><td>' + e.year + '</td><td>' + fmt.esc(e.result) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="cv-block"><div class="t">Employment history</div>' +
      (a.experience.length
        ? '<div class="table-responsive"><table class="table-x"><thead><tr><th>Organisation</th><th>Designation</th><th>Years</th></tr></thead><tbody>' +
        a.experience.map(function (x) {
          return '<tr><td>' + fmt.esc(x.org) + '</td><td>' + fmt.esc(x.role) + '</td><td>' + x.years + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="fs-13 muted">No experience declared (fresher).</div>') + '</div>' +
      block('Other information', [
        ['Computer skills', fmt.esc(a.computerSkills)],
        ['Languages', fmt.esc(a.languages)],
        ['Expected salary', a.expectedSalary ? fmt.money(a.expectedSalary) : '']
      ]);
  }

  /* ---------- applicant profile drawer ---------- */

  function profileDrawer(a) {
    var circ = store.circular(a.circularId);
    var rows = store.where('stageApplicants', function (r) { return r.applicantId === a.id; });

    var history = rows.map(function (r) {
      var s = store.stage(r.stageId);
      if (!s) return '';
      return '<tr><td>' + fmt.esc(pipe.typeLabel(s.type)) + '</td>' +
        '<td class="mono">' + fmt.esc(r.rollNo || '—') + '</td>' +
        '<td class="num">' + (r.marks === null || r.marks === undefined ? '—' : r.marks + ' / ' + s.fullMarks) + '</td>' +
        '<td>' + (r.attendance ? ui.statusPill(r.attendance) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + ui.statusPill(r.resultStatus) + '</td></tr>';
    }).join('');

    ui.drawer({
      title: fmt.esc(a.name),
      body:
        '<div class="d-flex gap-3 mb-3">' + ui.avatar(a.name, 'lg primary') +
        '<div><div class="fw-semibold" style="font-size:16px">' + fmt.esc(a.name) + '</div>' +
        '<div class="fs-12 muted mono">' + fmt.esc(a.appNo) + (a.rollNo ? ' · Roll ' + fmt.esc(a.rollNo) : '') + '</div>' +
        '<div class="mt-2">' + ui.statusPill(a.status) + '</div></div></div>' +

        fullProfileHtml(a) +

        (history ? '<div class="cv-block"><div class="t">Examination record</div>' +
          '<div class="table-responsive"><table class="table-x"><thead><tr><th>Stage</th><th>Roll</th><th class="num">Marks</th><th>Attendance</th><th>Result</th></tr></thead>' +
          '<tbody>' + history + '</tbody></table></div></div>' : ''),
      footer:
        '<button class="btn btn-sm btn-primary btn-icon" data-print="' + a.id + '"><i class="bi bi-printer"></i> Print profile (PDF)</button>' +
        '<button class="btn btn-sm btn-light ms-auto" data-close-drawer>Close</button>',
      onShow: function (host) {
        host.querySelector('[data-print]').addEventListener('click', function () {
          ui.closeDrawer();
          ERec.exp.printDoc('profile', a.id);
        });
        host.querySelector('[data-close-drawer]').addEventListener('click', ui.closeDrawer);
      }
    });
  }

  /* Top up a circular with more sample applications - used when a circular
     was created with none, or when you want a bigger list to play with. */
  function addDemoApplicants(c, after) {
    var existing = store.applicantsOf(c.id).length;
    ui.modal({
      title: 'Generate Test Candidate Pool',
      body: '<p class="fs-13 text-secondary">Generates realistic Bangladeshi candidates against <strong>' + fmt.esc(c.post) +
        '</strong> with complete personal, educational, and contact records so this circular can be walked through. ' +
        (existing ? 'There are currently ' + fmt.plural(existing, 'candidate') + ' in this circular.' : 'There are none yet.') + '</p>' +
        '<div class="mb-3">' +
        '<label class="form-label fs-12 fw-semibold">Number of Candidates to Generate</label>' +
        '<select class="form-select" id="f-n">' +
        '<option value="15">15 Candidates (Fast testing)</option>' +
        '<option value="35" selected>35 Candidates (Standard bank pool)</option>' +
        '<option value="50">50 Candidates (Comprehensive pool)</option>' +
        '<option value="100">100 Candidates (Large exam scale)</option>' +
        '</select>' +
        '</div>',
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-green-solid px-4" data-act="go"><i class="bi bi-magic me-1"></i> Generate Pool</button>',
      onShow: function (api) {
        api.find('[data-act="go"]').addEventListener('click', function () {
          var n = parseInt(api.find('#f-n').value, 10);
          if (isNaN(n) || n < 1) { ui.toast('Enter how many to add', 'warning'); return; }
          ERec.seed.makeApplicants({
            circularId: c.id, count: n, startIndex: existing,
            prefix: (c.code || c.id).replace(/\W+/g, '').slice(-6).toUpperCase() || 'APP',
            appliedAt: c.applyStart
          }).forEach(function (a) { store.insert('applicants', a); });
          store.audit('ADD_APPLICANTS', 'circular', c.id, fmt.plural(n, 'applicant') + ' generated');
          api.close();
          ui.toast(fmt.plural(n, 'candidate') + ' generated successfully');
          if (after) after();
        });
      }
    });
  }

  /* Excel Import Modal */
  function importExcelModal(circ, after) {
    var sampleExcel = 'Name,FatherName,Gender,Mobile,Email,District,Division,Degree,Institution,Result\n' +
      'Mohammad Rahim,Abdul Karim,Male,01711223344,rahim@gmail.com,Dhaka,Dhaka,BBA,University of Dhaka,3.65\n' +
      'Nusrat Jahan,Faruk Hossain,Female,01811223344,nusrat@gmail.com,Chattogram,Chattogram,B.Sc.,University of Chittagong,3.50\n' +
      'Saiful Islam,Motiur Rahman,Male,01911223344,saiful@gmail.com,Sylhet,Sylhet,MBA,Shahjalal University,3.75';

    var body =
      '<div class="mb-3">' +
      '<label class="form-label fs-13 fw-semibold">Choose Excel File</label>' +
      '<input type="file" accept=".Excel,text/Excel" class="form-control form-control-sm mb-2" id="Excel-file-input">' +
      '<div class="fs-12 text-secondary mb-2">Or paste Excel records below:</div>' +
      '<textarea class="form-control form-control-sm fs-12" id="Excel-text-input" rows="8" placeholder="' + fmt.esc(sampleExcel) + '"></textarea>' +
      '<div class="fs-11 text-muted mt-2"><i class="bi bi-info-circle me-1"></i>First line should contain column headers: <code>Name, FatherName, Gender, Mobile, Email, District, Division, Degree, Institution, Result</code></div>' +
      '</div>';

    ui.modal({
      title: 'Import Candidates from Excel · ' + fmt.esc(circ.post),
      size: 'lg',
      body: body,
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-green-solid px-4" data-act="import"><i class="bi bi-upload me-1"></i> Import Candidates</button>',
      onShow: function (api) {
        var fileInput = api.find('#Excel-file-input');
        var textArea = api.find('#Excel-text-input');

        fileInput.addEventListener('change', function (e) {
          var file = e.target.files && e.target.files[0];
          if (file) {
            var reader = new FileReader();
            reader.onload = function (evt) {
              textArea.value = evt.target.result;
            };
            reader.readAsText(file);
          }
        });

        api.find('[data-act="import"]').addEventListener('click', function () {
          var text = (textArea.value || '').trim();
          if (!text) {
            ui.toast('Please select a Excel file or paste Excel content.', 'warning');
            return;
          }

          var lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
          if (lines.length < 2) {
            ui.toast('Excel must contain at least a header row and one candidate row.', 'warning');
            return;
          }

          var header = lines[0].split(',').map(function (h) { return h.trim().toLowerCase().replace(/[\s_]+/g, ''); });
          var colMap = {};
          header.forEach(function (h, idx) {
            if (h.indexOf('name') !== -1 && h.indexOf('father') === -1 && h.indexOf('mother') === -1) colMap.name = idx;
            else if (h.indexOf('father') !== -1) colMap.father = idx;
            else if (h.indexOf('mother') !== -1) colMap.mother = idx;
            else if (h.indexOf('gender') !== -1) colMap.gender = idx;
            else if (h.indexOf('mobile') !== -1 || h.indexOf('phone') !== -1) colMap.mobile = idx;
            else if (h.indexOf('email') !== -1) colMap.email = idx;
            else if (h.indexOf('district') !== -1) colMap.district = idx;
            else if (h.indexOf('division') !== -1) colMap.division = idx;
            else if (h.indexOf('degree') !== -1 || h.indexOf('education') !== -1) colMap.degree = idx;
            else if (h.indexOf('institution') !== -1 || h.indexOf('university') !== -1 || h.indexOf('board') !== -1) colMap.institution = idx;
            else if (h.indexOf('result') !== -1 || h.indexOf('cgpa') !== -1 || h.indexOf('gpa') !== -1) colMap.result = idx;
          });

          var existing = store.applicantsOf(circ.id);
          var importedCount = 0;

          for (var i = 1; i < lines.length; i++) {
            var row = lines[i].split(',').map(function (c) { return c.trim(); });
            var name = (colMap.name !== undefined ? row[colMap.name] : row[0]) || '';
            if (!name) continue;

            var father = (colMap.father !== undefined ? row[colMap.father] : row[1]) || 'Father';
            var gender = (colMap.gender !== undefined ? row[colMap.gender] : 'Male');
            var mobile = (colMap.mobile !== undefined ? row[colMap.mobile] : '01700000000');
            var email = (colMap.email !== undefined ? row[colMap.email] : (name.toLowerCase().replace(/\s+/g, '') + '@gmail.com'));
            var district = (colMap.district !== undefined ? row[colMap.district] : 'Dhaka') || 'Dhaka';
            var division = (colMap.division !== undefined ? row[colMap.division] : district) || 'Dhaka';
            var degree = (colMap.degree !== undefined ? row[colMap.degree] : 'B.Sc.') || 'B.Sc.';
            var institution = (colMap.institution !== undefined ? row[colMap.institution] : 'University of Dhaka') || 'University of Dhaka';
            var result = (colMap.result !== undefined ? row[colMap.result] : '3.50') || '3.50';

            var seq = existing.length + importedCount + 1;
            var candId = circ.id + '-A' + fmt.pad(seq, 3);
            var appNo = (circ.code || 'APP').replace(/\W+/g, '') + '-' + fmt.pad(seq, 4);

            var newApp = {
              id: candId,
              circularId: circ.id,
              appNo: appNo,
              name: name,
              fatherName: father,
              motherName: (colMap.mother !== undefined ? row[colMap.mother] : 'Mother'),
              gender: gender,
              dob: '1997-06-15',
              nid: '199' + Math.floor(10000000 + Math.random() * 90000000),
              maritalStatus: 'Single',
              religion: 'Islam',
              nationality: 'Bangladeshi',
              bloodGroup: 'A+',
              quota: 'General',
              mobile: mobile,
              email: email,
              district: district,
              division: division,
              presentAddress: district + ', Bangladesh',
              permanentAddress: district + ', Bangladesh',
              appliedAt: fmt.isoDate(),
              status: 'APPLIED',
              education: [
                {
                  level: degree,
                  degree: degree,
                  subject: 'General Studies',
                  institution: institution,
                  board: institution,
                  year: 2022,
                  result: 'CGPA ' + result
                }
              ],
              skills: 'MS Office, Internet'
            };

            store.insert('applicants', newApp);
            importedCount++;
          }

          store.audit('IMPORT_APPLICANTS', 'circular', circ.id, 'Imported ' + importedCount + ' candidates via Excel');
          ui.toast('Successfully imported ' + importedCount + ' candidates from Excel', 'ok');
          api.close();
          if (after) after();
        });
      }
    });
  }

  /* ---------- supplementary call ----------
     "I called 50 for the viva, now I want 10 more from the written pool."
     Candidates are pulled from the previous stage's leftovers, added to this
     stage as a later call round, and every downstream step (venue, admit
     card, scrutiny, marks) starts reporting them as outstanding work. */

  function nextRound(stageId) {
    var max = 1;
    store.rosterOf(stageId).forEach(function (r) { max = Math.max(max, r.callRound || 1); });
    return max + 1;
  }

  function callMoreModal(stg, after) {
    var c = store.circular(stg.circularId);
    var prev = pipe.previousStage(stg);
    var isFirstStage = !prev;
    var pool = [];

    if (isFirstStage) {
      var currentRoster = store.rosterOf(stg.id);
      var rosterMap = {};
      currentRoster.forEach(function (r) { rosterMap[r.applicantId] = true; });
      var uncalled = store.applicantsOf(c.id).filter(function (a) { return !rosterMap[a.id]; });

      if (!uncalled.length) {
        addDemoApplicants(c, function () {
          callMoreModal(stg, after);
        });
        return;
      }

      pool = uncalled.map(function (a) {
        return {
          id: a.id,
          applicantId: a.id,
          rollNo: a.rollNo || (c.rollPrefix ? c.rollPrefix + fmt.pad(store.rosterOf(stg.id).length + 1, 4) : '—'),
          marks: null,
          attendance: null,
          resultStatus: 'APPLIED',
          isApplicantRecord: true
        };
      });
    } else {
      /* everyone who sat the previous exam but is not on this stage's list */
      pool = store.rosterOf(prev.id)
        .filter(function (r) { return !store.rosterRow(stg.id, r.applicantId); })
        .filter(function (r) { return r.attendance !== 'ABSENT'; })
        .sort(function (a, b) { return Number(b.marks || 0) - Number(a.marks || 0); });
    }

    var panels = store.panelsOf(stg.id);
    var chosen = {};

    if (!pool.length) {
      ui.modal({
        title: 'Call more candidates',
        body: ui.empty('Nobody left to call',
          isFirstStage
            ? 'All applicants for this circular are already on this stage candidate list.'
            : 'Every candidate who appeared in the ' + pipe.typeLabel(prev.type) + ' examination is already on this list.',
          'bi-person-x'),
        footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Close</button>'
      });
      return;
    }

    ui.modal({
      title: 'Call more candidates for ' + fmt.esc(pipe.typeLabel(stg.type)),
      size: 'xl',
      body:
        ui.alert('info', isFirstStage
          ? 'These candidates applied for <strong>' + fmt.esc(c.post) + '</strong> but have not yet been added to the candidate list for ' + fmt.esc(pipe.typeLabel(stg.type)) + '.'
          : 'These candidates appeared in the <strong>' + fmt.esc(pipe.typeLabel(prev.type)) +
          '</strong> examination but were not called for ' + fmt.esc(pipe.typeLabel(stg.type)) +
          '. They are listed highest mark first. Whoever you add keeps their existing roll number and will show up as pending on venue, admit card, scrutiny and marks.') +
        '<div class="row g-3 mb-3">' +
        '<div class="col-md-3"><label class="form-label">Take the top</label>' +
        '<div class="input-group input-group-sm">' +
        '<input type="number" min="1" max="' + pool.length + '" class="form-control" id="cm-top" value="10">' +
        '<button class="btn btn-outline-primary" id="cm-take">Select</button></div></div>' +
        '<div class="col-md-4"><label class="form-label">Interview panel <span class="muted">(optional)</span></label>' +
        '<select class="form-select form-select-sm" id="cm-panel">' +
        '<option value="">Not assigned</option>' +
        panels.map(function (p) {
          return '<option value="' + p.id + '">' + fmt.esc(p.name) + ' · ' + fmt.date(p.slotDate) + '</option>';
        }).join('') +
        '<option value="__new">+ Create a new panel</option>' +
        '</select></div>' +
        '<div class="col-md-5" id="cm-newpanel" hidden>' +
        '<label class="form-label">New panel name &amp; date</label>' +
        '<div class="input-group input-group-sm">' +
        '<input class="form-control" id="cm-pname" value="Supplementary Panel">' +
        '<input type="date" class="form-control" id="cm-pdate" value="' + fmt.addDays(fmt.isoDate(), 10) + '">' +
        '</div></div>' +
        '</div>' +
        '<label class="form-label">Reason for the supplementary call</label>' +
        '<input class="form-control form-control-sm mb-3" id="cm-note" ' +
        'placeholder="e.g. 4 selected candidates did not join — calling 10 more from the waiting pool">' +
        '<div class="table-scroll" style="max-height:340px">' +
        '<table class="table-x"><thead><tr><th style="width:34px"></th><th>Rank</th><th>Roll</th>' +
        '<th>Candidate</th><th class="num">' + (isFirstStage ? 'Status' : fmt.esc(pipe.typeLabel(prev.type)) + ' marks') + '</th>' +
        '<th>Result</th></tr></thead><tbody>' +
        pool.map(function (r, i) {
          var a = store.applicant(r.applicantId);
          return '<tr data-pool="' + r.id + '"><td><input type="checkbox" class="form-check-input" data-cm="' + r.id + '"></td>' +
            '<td class="num muted">' + (i + 1) + '</td>' +
            '<td class="mono nowrap">' + fmt.esc(r.rollNo || '—') + '</td>' +
            '<td>' + fmt.esc(a.name) + '<div class="fs-12 muted">' + fmt.esc(a.fatherName) + '</div></td>' +
            '<td class="num">' + (isFirstStage ? 'Applied' : (r.marks === null || r.marks === undefined ? '—' : r.marks + ' / ' + prev.fullMarks)) + '</td>' +
            '<td>' + ui.statusPill(r.resultStatus) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div class="mt-2 fs-13"><strong id="cm-count">0</strong> selected</div>',
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" data-act="go">Add to this stage</button>',
      onShow: function (api) {
        function count() {
          var n = Object.keys(chosen).filter(function (k) { return chosen[k]; }).length;
          api.find('#cm-count').textContent = n;
        }
        ui.on(api.el, '[data-cm]', 'change', function (e, cb) {
          chosen[cb.dataset.cm] = cb.checked;
          cb.closest('tr').classList.toggle('row-sel', cb.checked);
          count();
        });
        api.find('#cm-take').addEventListener('click', function () {
          var n = parseInt(api.find('#cm-top').value, 10) || 0;
          api.el.querySelectorAll('[data-cm]').forEach(function (cb, i) {
            cb.checked = i < n;
            chosen[cb.dataset.cm] = i < n;
            cb.closest('tr').classList.toggle('row-sel', i < n);
          });
          count();
        });
        api.find('#cm-panel').addEventListener('change', function (e) {
          api.find('#cm-newpanel').hidden = e.target.value !== '__new';
        });

        api.find('[data-act="go"]').addEventListener('click', function () {
          var ids = Object.keys(chosen).filter(function (k) { return chosen[k]; });
          if (!ids.length) { ui.toast('Select at least one candidate', 'warning'); return; }
          var note = api.find('#cm-note').value.trim();
          var round = nextRound(stg.id);

          var panelId = api.find('#cm-panel').value;
          if (panelId === '__new') {
            var p = store.insert('panels', {
              id: fmt.uid('pnl'), stageId: stg.id,
              name: api.find('#cm-pname').value.trim() || 'Supplementary Panel',
              members: ['Chairman', 'Member (HR)'],
              slotDate: api.find('#cm-pdate').value, applicantIds: []
            });
            panelId = p.id;
          }

          ids.forEach(function (rowId) {
            var poolItem = pool.find(function (p) { return p.id === rowId; });
            var src = isFirstStage ? null : store.find('stageApplicants', rowId);
            var applicantId = src ? src.applicantId : (poolItem ? poolItem.applicantId : rowId);
            var a = store.applicant(applicantId);
            var roll = (src && src.rollNo) || (poolItem && poolItem.rollNo) || (a && a.rollNo) || (c.rollPrefix ? c.rollPrefix + fmt.pad(store.rosterOf(stg.id).length + 1, 4) : '—');

            store.insert('stageApplicants', {
              id: fmt.uid('sa'), stageId: stg.id, applicantId: applicantId, rollNo: roll,
              venueId: null, attendance: null, marks: null, resultStatus: 'PENDING',
              selectedForNext: false, selectionBasis: isFirstStage ? 'CALL' : null, scrutiny: null,
              panelId: panelId || null, callRound: round, callNote: note
            });
            /* keep the previous stage's record honest about who was taken */
            if (src) {
              src.selectedForNext = true;
              if (!src.selectionBasis) src.selectionBasis = 'SUPPLEMENTARY';
            }
            if (panelId) {
              var pn = store.find('panels', panelId);
              if (pn && pn.applicantIds.indexOf(applicantId) < 0) pn.applicantIds.push(applicantId);
            }
          });

          store.markStep(stg.id, 'search', {
            count: store.rosterOf(stg.id).length,
            rounds: round,
            lastCall: { at: new Date().toISOString(), added: ids.length, note: note }
          });
          store.save();
          store.audit('SUPPLEMENTARY_CALL', 'stage', stg.id,
            fmt.plural(ids.length, 'more candidate') + ' called for ' + pipe.typeLabel(stg.type) +
            ' (call ' + round + ')' + (note ? ' — ' + note : ''));
          api.close();
          ui.toast(fmt.plural(ids.length, 'candidate') + ' added — check Venue, Exam Notice, Scrutiny and Marks');
          if (after) after();
        });
      }
    });
  }

  /* ---------- main ---------- */

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    if (!c) { ERec.router.go('#/circulars'); return; }

    var stages = store.stagesOf(c.id);
    var activeStageIndex = stages.findIndex(function (s) { return s.id === stg.id; });

    ERec.router.setCrumbs([
      { label: 'Job Circulars', href: '#/circulars' },
      { label: c.post, href: '#/circular/' + c.id },
      { label: 'Candidate List' }
    ]);

    // Retrieve roster or applicants for this stage
    var isFirstStage = stg.seq === 1;
    var roster = store.rosterOf(stg.id);
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
          highestDegree: highestEdu(a),
          district: a.district,
          mobile: a.mobile,
          status: a.status || 'APPLIED',
          zone: a.division || a.district,
          gender: a.gender,
          university: (a.education && a.education.length && a.education[a.education.length - 1].board) || 'University of Dhaka',
          skills: a.computerSkills || 'MS Office, Internet',
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
            highestDegree: highestEdu(a),
            district: a.district,
            mobile: a.mobile,
            status: a.status || 'APPLIED',
            zone: a.division || a.district,
            gender: a.gender,
            university: (a.education && a.education.length && a.education[a.education.length - 1].board) || 'University of Dhaka',
            skills: a.computerSkills || 'MS Office, Internet',
            raw: a,
            rosterRow: r
          };
        }).filter(Boolean);
      } else {
        var prevStage = store.stagesOf(c.id).find(function (s) { return s.seq === stg.seq - 1; });
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
            highestDegree: highestEdu(a),
            district: a.district,
            mobile: a.mobile,
            status: a.status || 'APPLIED',
            zone: a.division || a.district,
            gender: a.gender,
            university: (a.education && a.education.length && a.education[a.education.length - 1].board) || 'University of Dhaka',
            skills: a.computerSkills || 'MS Office, Internet',
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

    var candTotal = allCandidates.length;

    // Extract unique districts and universities for filters
    var uniqueDistricts = Array.from(new Set(allCandidates.map(function (a) { return a.district; }))).filter(Boolean).sort();
    var uniqueUnis = Array.from(new Set(allCandidates.map(function (a) { return a.university; }))).filter(Boolean).sort();
    if (!uniqueUnis.length) {
      uniqueUnis = ['University of Dhaka', 'Bangladesh University of Engineering and Technology', 'University of Rajshahi', 'University of Chittagong', 'Jahangirnagar University', 'BRAC University', 'North South University'];
    }

    // 1. Unified Stage Navigation Bar and Attached Stepper
    var headerHtml = ui.stepHeader(stg, 'search');

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
      uniqueUnis.slice(0, 15).map(function (u) {
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
      '<i class="bi bi-file-earmark-arrow-up-fill me-1"></i> Upload Excel' +
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
      '<thead style="background:#0f4c3a; color:#ffffff;">' +
      '<tr>' +
      '<th style="width: 44px; text-align: center;"><input type="checkbox" class="form-check-input" id="chk-all-candidates" checked></th>' +
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
    var nextStepRoute = '#/circular/' + c.id + '/stage/' + stg.id + '/approval-applicant';
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

    // Assemble page
    view.innerHTML = headerHtml + bannerHtml + filterCardHtml + tableCardHtml + actionBarHtml;

    // Filter, pagination and selection state
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
        if (filterState.district && String(cand.district).toLowerCase() !== filterState.district.toLowerCase()) return false;
        if (filterState.gender && String(cand.gender).toLowerCase() !== filterState.gender.toLowerCase()) return false;
        if (filterState.degree && String(cand.highestDegree).toLowerCase().indexOf(filterState.degree.toLowerCase()) === -1) return false;
        if (filterState.status && String(cand.status).toUpperCase() !== filterState.status.toUpperCase()) return false;
        if (filterState.zone) {
          var z = filterState.zone.toLowerCase();
          var czone = String(cand.zone || '').toLowerCase();
          var cdist = String(cand.district || '').toLowerCase();
          if (czone !== z && cdist !== z && czone.indexOf(z) === -1 && cdist.indexOf(z) === -1) return false;
        }
        if (filterState.uni && String(cand.university).toLowerCase().indexOf(filterState.uni.toLowerCase()) === -1) return false;
        if (filterState.skills && String(cand.skills).toLowerCase().indexOf(filterState.skills.toLowerCase()) === -1) return false;
        if (filterState.exp) {
          var expYears = 0;
          if (cand.raw && cand.raw.experience && Array.isArray(cand.raw.experience)) {
            cand.raw.experience.forEach(function (x) { expYears += Number(x.years || 0); });
          }
          if (filterState.exp === '0-1' && (expYears < 0 || expYears > 1)) return false;
          if (filterState.exp === '1-3' && (expYears <= 1 || expYears > 3)) return false;
          if (filterState.exp === '3-5' && (expYears <= 3 || expYears > 5)) return false;
          if (filterState.exp === '5+' && expYears <= 5) return false;
        }
        return true;
      });
    }

    function updateBottomCounts() {
      var selCount = Object.keys(selectedMap).filter(function (k) { return selectedMap[k]; }).length;
      var totalCount = allCandidates.length;

      var el1 = view.querySelector('#bottom-cand-count');
      var el2 = view.querySelector('#bottom-cand-count-2');
      if (el1) el1.innerHTML = '<strong class="text-dark">' + selCount + ' of ' + totalCount + ' candidates</strong> selected';
      if (el2) el2.textContent = selCount + ' candidate' + (selCount === 1 ? '' : 's') + ' on this list';

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
            '</div>' +
            '</div>' +
            '</td></tr>';
          var eExcel = tbody.querySelector('#btn-empty-Excel');
          if (eExcel) eExcel.addEventListener('click', function () { importExcelModal(c, function () { ERec.router.refresh(); }); });
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
    ui.bindPipelineEvents(view, stg, 'search');

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
      if (app) profileDrawer(app);
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
          ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_' + pipe.typeLabel(stg.type) + '_candidates.Excel',
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

    // Call more candidates
    var btnCallMore = view.querySelector('#btn-call-more');
    if (btnCallMore) {
      btnCallMore.addEventListener('click', function () {
        callMoreModal(stg, function () {
          ERec.router.refresh();
        });
      });
    }

    // Import Excel modal
    var btnImportExcel = view.querySelector('#btn-import-Excel');
    if (btnImportExcel) {
      btnImportExcel.addEventListener('click', function () {
        importExcelModal(c, function () {
          ERec.router.refresh();
        });
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

          var currentStageRows = store.rosterOf(stg.id);
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
                stageId: stg.id,
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
          store.markStep(stg.id, 'search', { count: confirmedCount, confirmedAt: nowIso });
          store.audit('CONFIRM_ROSTER', 'stage', stg.id, 'Confirmed ' + confirmedCount + ' candidate' + (confirmedCount === 1 ? '' : 's') + ' for ' + pipe.typeLabel(stg.type));
          ui.toast(confirmedCount + ' candidate' + (confirmedCount === 1 ? '' : 's') + ' confirmed. Continuing to Approve Candidate List...', 'success');
          ERec.router.go(nextStepRoute);
        } catch (err) {
          if (window.console) console.error('Error continuing to approval:', err);
          ui.toast('Could not proceed: ' + err.message, 'danger');
        }
      });
    }
  }

  ERec.pages.applicantlist = {
    render: render,
    profileDrawer: profileDrawer,
    highestEdu: highestEdu,
    fullProfileHtml: fullProfileHtml,
    callMoreModal: callMoreModal,
    importExcelModal: importExcelModal,
    addDemoApplicants: addDemoApplicants
  };
  ERec.pages.applicantList = ERec.pages.applicantlist;
  ERec.pages.applicants = ERec.pages.applicantlist;
})(window);
