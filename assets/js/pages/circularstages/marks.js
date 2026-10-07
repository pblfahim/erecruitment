/* Mark upload + selection, and the forward-to-next-stage step.

   Selection has two bases:
     CUTOFF     - everyone at or above a cut-off mark
     PRIVILEGED - selected under a privilege/quota, bypassing the cut-off */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var cutoffs = {}; // per stage: cut-off mark value

  /* Normalize roll value to trimmed string, stripping trailing .0 from Excel numbers */
  function normRoll(val) {
    if (val === null || val === undefined) return '';
    var s = String(val).trim();
    if (/^\d+\.0+$/.test(s)) s = s.split('.')[0];
    return s;
  }

  /* Viva candidates rejected at scrutiny never reach the mark sheet. */
  function eligible(stg) {
    return store.rosterOf(stg.id).filter(function (r) {
      if (stg.type !== 'VIVA') return true;
      return !(r.scrutiny && r.scrutiny.status === 'REJECTED');
    });
  }

  function recalc(stg, row) {
    var pMarks = Number(stg.passMarks !== undefined ? stg.passMarks : (stg.type === 'VIVA' ? 25 : 50));
    if (row.attendance === 'ABSENT') {
      row.marks = null;
      row.resultStatus = 'FAILED';
      row.selectedForNext = false;
      row.selectionBasis = null;
      return;
    }
    if (row.marks === null || row.marks === undefined || row.marks === '') {
      row.resultStatus = 'PENDING';
      return;
    }
    row.resultStatus = Number(row.marks) >= pMarks ? 'PASSED' : 'FAILED';
    if (row.resultStatus === 'FAILED' && row.selectionBasis === 'CUTOFF') {
      row.selectedForNext = false;
      row.selectionBasis = null;
    }
  }

  function summary(stg) {
    var rows = eligible(stg);
    rows.forEach(function (r) { if (!r.resultStatus) recalc(stg, r); });

    var present = rows.filter(function (r) { return r.attendance === 'PRESENT'; });
    var absent = rows.filter(function (r) { return r.attendance === 'ABSENT'; });
    var marked = rows.filter(function (r) { return r.marks !== null && r.marks !== undefined && r.marks !== ''; });
    var pendingMarks = rows.filter(function (r) { return r.attendance !== 'ABSENT' && (r.marks === null || r.marks === undefined || r.marks === ''); });
    var passed = rows.filter(function (r) { return r.resultStatus === 'PASSED'; });
    var failed = rows.filter(function (r) { return r.resultStatus === 'FAILED'; });
    var selected = rows.filter(function (r) { return r.selectedForNext; });

    return {
      rows: rows,
      total: rows.length,
      present: present.length,
      absent: absent.length,
      marked: marked.length,
      pendingMarks: pendingMarks.length,
      passed: passed.length,
      failed: failed.length,
      selected: selected.length,
      selectedRows: selected,
      highest: marked.length ? Math.max.apply(null, marked.map(function (r) { return Number(r.marks); })) : 0,
      average: marked.length ? Math.round(marked.reduce(function (s, r) { return s + Number(r.marks); }, 0) / marked.length) : 0
    };
  }

  /* ---------- mark import: Excel file, CSV, or pasted rows ---------- */

  /* SheetJS is fetched with multiple CDN fallbacks so .xlsx works reliably. */
  function loadXlsx() {
    return new Promise(function (resolve, reject) {
      if (global.XLSX) { resolve(global.XLSX); return; }
      var cdns = [
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
      ];
      var idx = 0;
      function tryNext() {
        if (idx >= cdns.length) {
          reject(new Error('could not be loaded from CDN (check internet or use CSV / paste)'));
          return;
        }
        var s = document.createElement('script');
        s.src = cdns[idx++];
        s.onload = function () {
          if (global.XLSX) resolve(global.XLSX);
          else tryNext();
        };
        s.onerror = function () {
          tryNext();
        };
        document.head.appendChild(s);
      }
      tryNext();
    });
  }

  /* Robust delimiter parser for pasted text and CSV/TSV */
  function rowsFromExcel(text) {
    if (!text || !text.trim()) return [];
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    return lines.map(function (line) {
      var hasTab = line.indexOf('\t') >= 0;
      var hasSemi = line.indexOf(';') >= 0;
      var delim = hasTab ? '\t' : (hasSemi ? ';' : ',');
      var cells = [];
      var cur = '';
      var inQuotes = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === delim && !inQuotes) {
          cells.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur.trim().replace(/^"|"$/g, ''));
      return cells;
    }).filter(function (row) {
      return row.some(function (c) { return c !== ''; });
    });
  }

  function downloadTemplate(stg) {
    var c = store.circular(stg.circularId) || {};
    var rows = eligible(stg).map(function (r) {
      var a = store.applicant(r.applicantId) || {};
      return [r.rollNo || '', a.name || '', ''];
    });
    ERec.exp.Excel((c.post || 'marks').replace(/\W+/g, '_') + '_' + pipe.typeLabel(stg.type) + '_marks_template.Excel',
      ['Roll', 'Candidate', 'Marks'], rows);
  }

  function importModal(stg, after) {
    ui.modal({
      title: 'Import marks',
      size: 'lg',
      body:
        ui.alert('info', 'Upload the filled mark sheet as <strong>Excel (.xlsx/.xls)</strong> or ' +
          '<strong>Excel</strong>, or paste the rows below. The first two columns must be ' +
          '<strong>roll number</strong> and <strong>marks</strong>; a header row is ignored. ' +
          'Write <code>absent</code> in place of a mark to record absence.') +
        '<div class="mb-3"><label class="form-label">Choose a file</label>' +
        '<input type="file" class="form-control" id="f-file" accept=".xlsx,.xls,.csv,.txt,.tsv,.Excel,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></div>' +
        '<label class="form-label">…or paste rows</label>' +
        '<textarea class="form-control mono" id="f-paste" rows="8" placeholder="26010001,72&#10;26010002,absent&#10;26010003,65"></textarea>' +
        '<div class="preview-box mt-2 fs-12" id="p-out">Nothing read yet.</div>',
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-primary" data-act="go">Apply to mark sheet</button>',
      onShow: function (api) {
        var rows = eligible(stg);
        var parsed = [];

        function evaluate(cells) {
          var out = [], bad = [];
          if (!cells || !cells.length) {
            parsed = [];
            api.find('#p-out').innerHTML = '<span class="text-muted">Nothing read yet.</span>';
            return out;
          }

          var cleanRows = cells.filter(function (row) {
            if (!Array.isArray(row)) return false;
            return row.some(function (val) { return val !== null && val !== undefined && String(val).trim() !== ''; });
          });

          if (!cleanRows.length) {
            parsed = [];
            api.find('#p-out').innerHTML = '<span class="text-muted">Nothing read yet.</span>';
            return out;
          }

          // Detect header row in first 3 rows
          var rollCol = -1;
          var markCol = -1;
          var attCol = -1;
          var nameCol = -1;
          var headerRowIdx = -1;

          for (var h = 0; h < Math.min(3, cleanRows.length); h++) {
            var rRow = cleanRows[h];
            var foundAny = false;
            for (var c = 0; c < rRow.length; c++) {
              var txt = String(rRow[c] || '').trim().toLowerCase();
              if (/roll/i.test(txt)) { rollCol = c; foundAny = true; }
              else if (/^(marks?|score|obtained|point|total)$/i.test(txt) || /marks?|score|obtained/i.test(txt)) { markCol = c; foundAny = true; }
              else if (/attend|presence|status/i.test(txt)) { attCol = c; foundAny = true; }
              else if (/name|candidate|applicant/i.test(txt)) { nameCol = c; foundAny = true; }
            }
            if (foundAny) {
              headerRowIdx = h;
              break;
            }
          }

          var dataRows = headerRowIdx !== -1 ? cleanRows.slice(headerRowIdx + 1) : cleanRows;

          if (rollCol === -1) rollCol = 0;

          // If marks column not found, intelligently infer column index
          if (markCol === -1) {
            var sample = dataRows[0] || [];
            if (sample.length === 2) {
              markCol = 1;
            } else if (sample.length >= 3) {
              var v1 = String(sample[1] || '').trim();
              var v2 = String(sample[2] || '').trim();
              var isNum1 = v1 !== '' && !isNaN(parseFloat(v1));
              var isNum2 = v2 !== '' && !isNaN(parseFloat(v2));
              var isAbs1 = /^(a|ab|abs|absent)$/i.test(v1);
              var isAbs2 = /^(a|ab|abs|absent)$/i.test(v2);

              if ((isNum2 || isAbs2) && !(isNum1 || isAbs1)) {
                markCol = 2;
                if (nameCol === -1) nameCol = 1;
              } else if (isNum1 || isAbs1) {
                markCol = 1;
              } else {
                for (var colIdx = 1; colIdx < sample.length; colIdx++) {
                  var val = String(sample[colIdx] || '').trim();
                  if ((val !== '' && !isNaN(parseFloat(val))) || /^(a|ab|abs|absent)$/i.test(val)) {
                    markCol = colIdx;
                    break;
                  }
                }
                if (markCol === -1) markCol = sample.length - 1;
              }
            } else {
              markCol = 1;
            }
          }

          var seen = {};
          dataRows.forEach(function (c) {
            if (!c || c.length < 2) return;
            var rawRoll = c[rollCol] !== undefined ? c[rollCol] : '';
            var rawMark = c[markCol] !== undefined ? c[markCol] : '';
            var rawAtt = (attCol !== -1 && c[attCol] !== undefined) ? c[attCol] : '';
            var rawName = (nameCol !== -1 && c[nameCol] !== undefined) ? c[nameCol] : '';

            var rollStr = normRoll(rawRoll);
            var markStr = String(rawMark !== null && rawMark !== undefined ? rawMark : '').trim();
            var attStr = String(rawAtt !== null && rawAtt !== undefined ? rawAtt : '').trim();
            var nameStr = String(rawName !== null && rawName !== undefined ? rawName : '').trim();

            if (!rollStr && !nameStr) return;
            if (/^roll/i.test(rollStr)) return; // repeated header row

            // Match candidate in eligible rows
            var row = null;
            if (rollStr) {
              row = rows.find(function (r) {
                var rRoll = normRoll(r.rollNo);
                if (rRoll === rollStr) return true;
                if (!isNaN(Number(rRoll)) && !isNaN(Number(rollStr)) && Number(rRoll) === Number(rollStr)) return true;
                if (r.applicantId === rollStr) return true;
                return false;
              });
            }
            if (!row && nameStr) {
              var qName = nameStr.toLowerCase();
              row = rows.find(function (r) {
                var a = store.applicant(r.applicantId);
                return a && a.name && a.name.trim().toLowerCase() === qName;
              });
            }

            if (!row) {
              bad.push((rollStr || nameStr) + ' (not on this list)');
              return;
            }
            if (seen[row.id]) return; // avoid duplicate row in sheet
            seen[row.id] = true;

            var isAbsent = /^(a|ab|abs|absent|no|false|-)$/i.test(markStr) || /^(a|ab|abs|absent)$/i.test(attStr);

            if (isAbsent) {
              out.push({ row: row, absent: true, marks: null });
            } else if (markStr !== '' && !isNaN(parseFloat(markStr))) {
              var num = parseFloat(markStr);
              out.push({ row: row, marks: num, absent: false });
            } else if (markStr === '' && attStr && /^(present|p|pr)$/i.test(attStr)) {
              out.push({ row: row, marks: null, attendance: 'PRESENT', absent: false });
            } else if (markStr !== '') {
              bad.push((rollStr || nameStr) + ' (“' + markStr + '” is not a mark)');
            }
          });

          parsed = out;
          var fullM = Number(stg.fullMarks || 100);
          var over = out.filter(function (o) { return !o.absent && o.marks !== null && o.marks > fullM; }).length;
          api.find('#p-out').innerHTML =
            '<strong>' + out.length + '</strong> row(s) ready to apply' +
            (over ? '<br><span class="text-warning">' + over + ' above the full mark of ' + fullM + ' — they will be capped.</span>' : '') +
            (bad.length ? '<br><span class="text-danger">' + bad.length + ' row(s) skipped: ' +
              fmt.esc(bad.slice(0, 3).join(' · ')) + (bad.length > 3 ? '…' : '') + '</span>' : '');
          return out;
        }

        var pasteEl = api.find('#f-paste');
        if (pasteEl) {
          var onPasteChange = function () { evaluate(rowsFromExcel(pasteEl.value)); };
          pasteEl.addEventListener('input', onPasteChange);
          pasteEl.addEventListener('change', onPasteChange);
          pasteEl.addEventListener('paste', function () { setTimeout(onPasteChange, 50); });
        }

        var fileEl = api.find('#f-file');
        if (fileEl) {
          fileEl.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var isExcel = /\.xls[xm]?$/i.test(file.name);
            api.find('#p-out').textContent = 'Reading ' + file.name + '…';

            if (!isExcel) {
              var fr = new FileReader();
              fr.onload = function () { evaluate(rowsFromExcel(String(fr.result))); };
              fr.onerror = function () { api.find('#p-out').innerHTML = '<span class="text-danger">Could not read that file.</span>'; };
              fr.readAsText(file);
              return;
            }

            loadXlsx().then(function (XLSX) {
              var fr = new FileReader();
              fr.onload = function () {
                try {
                  var wb = XLSX.read(new Uint8Array(fr.result), { type: 'array' });
                  var sheetName = wb.SheetNames[0];
                  if (!sheetName || !wb.Sheets[sheetName]) {
                    throw new Error('Workbook contains no sheets');
                  }
                  var sheet = wb.Sheets[sheetName];
                  var aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
                  evaluate(aoa.map(function (r) {
                    return (r || []).map(function (c) { return c === undefined || c === null ? '' : c; });
                  }));
                } catch (err) {
                  api.find('#p-out').innerHTML = '<span class="text-danger">That workbook could not be read: ' +
                    fmt.esc(err.message) + '</span>';
                }
              };
              fr.readAsArrayBuffer(file);
            }).catch(function (err) {
              api.find('#p-out').innerHTML = '<span class="text-danger">The Excel reader ' + fmt.esc(err.message) +
                '. Save the sheet as <strong>CSV</strong> or paste the text directly.</span>';
            });
          });
        }

        api.find('[data-act="go"]').addEventListener('click', function () {
          if (!parsed.length) { ui.toast('Nothing to import yet', 'warning'); return; }
          var fullM = Number(stg.fullMarks || 100);
          parsed.forEach(function (o) {
            if (o.absent) {
              o.row.attendance = 'ABSENT';
              o.row.marks = null;
              o.row.selectedForNext = false;
              o.row.selectionBasis = null;
            } else {
              o.row.attendance = 'PRESENT';
              if (o.marks !== null && o.marks !== undefined) {
                o.row.marks = Math.max(0, Math.min(fullM, Number(o.marks)));
              }
            }
            recalc(stg, o.row);
          });
          store.save();
          store.audit('IMPORT_MARKS', 'stage', stg.id, fmt.plural(parsed.length, 'mark') + ' imported');
          var n = parsed.length;
          api.close();
          ui.toast(fmt.plural(n, 'mark') + ' imported');
          if (typeof after === 'function') after();
        });
      }
    });
  }

  /* ---------- mark upload page ---------- */

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var s = summary(stg);
    var done = store.isStepDone(stg, 'marks');
    var cut = cutoffs[stg.id] = (cutoffs[stg.id] === undefined ? stg.passMarks : cutoffs[stg.id]);
    var isLast = pipe.context(stg).isLast;

    var body = ui.lockedNotice(stg, 'marks');

    /* 6 Modern Metric KPI Cards Row */
    body += '<div class="row g-3 mb-3">' +
      // Stat 1: Total Candidates
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-2">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px; font-size:11px;">Total</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-dark" id="kpi-total">' + s.total + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-primary-subtle text-primary">' +
      '<i class="bi bi-people-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 2: Present
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-2">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px; font-size:11px;">Present</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-success" id="kpi-present">' + s.present + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-success-subtle text-success">' +
      '<i class="bi bi-person-check-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 3: Absent
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-2">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px; font-size:11px;">Absent</span>' +
      '<h3 class="fw-bold mb-0 mt-1 ' + (s.absent ? 'text-danger' : 'text-muted') + '" id="kpi-absent">' + s.absent + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge ' + (s.absent ? 'bg-danger-subtle text-danger' : 'bg-light text-muted') + '">' +
      '<i class="bi bi-person-x-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 4: Marks Entered
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-2">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px; font-size:11px;">Marks Entered</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-primary" id="kpi-marked">' + s.marked + ' <small class="fs-12 text-muted fw-normal">/ ' + s.total + '</small></h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-info-subtle text-info">' +
      '<i class="bi bi-pencil-square"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 5: Passed
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-2">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px; font-size:11px;">Passed</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-success" id="kpi-passed">' + s.passed + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-success-subtle text-success">' +
      '<i class="bi bi-award-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Stat 6: Selected
      '<div class="col-12 col-sm-6 col-lg-4 col-xl-2">' +
      '<div class="stat-card-modern shadow-2xs h-100 bg-white border p-3 rounded-3">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div>' +
      '<span class="text-secondary fw-semibold small text-uppercase" style="letter-spacing:0.5px; font-size:11px;">Selected</span>' +
      '<h3 class="fw-bold mb-0 mt-1 text-primary" id="kpi-selected">' + s.selected + '</h3>' +
      '</div>' +
      '<div class="stat-icon-badge bg-primary-subtle text-primary">' +
      '<i class="bi bi-check-circle-fill"></i>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    /* Mark sheet rows HTML (With selection checkbox column) */
    var allSelected = s.rows.length > 0 && s.rows.every(function (r) { return r.selectedForNext; });
    var rowsHtml = s.rows.map(function (r) {
      var a = store.applicant(r.applicantId) || {};
      var absent = r.attendance === 'ABSENT';
      var initials = (a.name || 'C').charAt(0).toUpperCase();

      var basisPill = r.selectedForNext
        ? (r.selectionBasis === 'PRIVILEGED'
          ? '<span class="badge bg-purple-subtle text-purple border border-purple-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold" title="' + fmt.esc(r.privilegeNote || '') + '"><i class="bi bi-star-fill text-warning me-1"></i>Privilege</span>'
          : '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold"><i class="bi bi-funnel me-1"></i>Cut-off</span>')
        : '<span class="text-muted fs-12">—</span>';

      var resultBadge = r.resultStatus === 'PASSED'
        ? '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold"><i class="bi bi-check2 me-1"></i>PASSED</span>'
        : (r.resultStatus === 'FAILED'
          ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold"><i class="bi bi-x me-1"></i>FAILED</span>'
          : '<span class="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-0.5 fs-11 fw-normal">PENDING</span>');

      return '<tr data-row="' + r.id + '"' + (r.selectedForNext ? ' class="row-sel"' : '') + '>' +
        '<td class="text-center">' +
        '<input type="checkbox" class="form-check-input" data-sel="' + r.id + '"' + (r.selectedForNext ? ' checked' : '') + '>' +
        '</td>' +
        '<td class="mono fw-semibold text-dark nowrap">' + fmt.esc(r.rollNo || '—') + '</td>' +
        '<td>' +
        '<div class="d-flex align-items-center gap-2">' +
        '<div class="avatar sm rounded-circle bg-light text-primary border fw-bold fs-12 d-flex align-items-center justify-content-center" style="width:30px; height:30px; min-width:30px;">' +
        initials +
        '</div>' +
        '<div class="text-truncate" style="max-width: 220px;">' +
        '<div class="fw-semibold text-dark fs-13 text-truncate">' + fmt.esc(a.name || '—') + '</div>' +
        '<div class="text-muted fs-11 text-truncate">' + fmt.esc(a.fatherName || 'Father: —') + '</div>' +
        '</div>' +
        '</div>' +
        '</td>' +
        (stg.type === 'VIVA' ? '<td>' + (r.scrutiny ? ui.statusPill(r.scrutiny.status) : '<span class="text-muted fs-12">not scrutinised</span>') + '</td>' : '') +
        '<td>' +
        '<select class="form-select form-select-sm fw-semibold ' + (r.attendance === 'PRESENT' ? 'text-success border-success-subtle' : (absent ? 'text-danger border-danger-subtle' : 'text-muted')) + '" data-att="' + r.id + '" style="width:110px">' +
        '<option value=""' + (!r.attendance ? ' selected' : '') + '>— Select —</option>' +
        '<option value="PRESENT"' + (r.attendance === 'PRESENT' ? ' selected' : '') + ' class="text-success">Present</option>' +
        '<option value="ABSENT"' + (absent ? ' selected' : '') + ' class="text-danger">Absent</option>' +
        '</select>' +
        '</td>' +
        '<td>' +
        '<div class="d-flex align-items-center gap-1" style="max-width: 110px;">' +
        '<input type="number" min="0" max="' + stg.fullMarks + '" class="form-control form-control-sm text-center fw-bold font-monospace" ' +
        'data-mark="' + r.id + '" value="' + (r.marks === null || r.marks === undefined ? '' : r.marks) + '"' +
        'placeholder="—"' + (absent ? ' disabled' : '') + '>' +
        '<span class="fs-11 text-muted">/' + stg.fullMarks + '</span>' +
        '</div>' +
        '</td>' +
        '<td>' + resultBadge + '</td>' +
        '<td>' + basisPill + '</td>' +
        '<td class="text-center">' +
        '<button class="btn btn-sm ' + (r.selectionBasis === 'PRIVILEGED' ? 'btn-warning text-dark' : 'btn-outline-secondary') + '" data-priv="' + r.id + '" title="' + (r.selectionBasis === 'PRIVILEGED' ? 'Privilege: ' + fmt.esc(r.privilegeNote || '') : 'Select on privilege / quota') + '">' +
        '<i class="bi bi-star' + (r.selectionBasis === 'PRIVILEGED' ? '-fill' : '') + '"></i>' +
        '</button>' +
        '</td>' +
        '</tr>';
    }).join('');

    /* Mark Sheet Card */
    body += ui.card({
      title: 'Mark sheet · ' + fmt.esc(pipe.typeLabel(stg.type)),
      hint: 'Type a mark against each candidate, or import them in bulk.',
      actions:
        '<div class="d-flex align-items-center gap-2 flex-wrap">' +
        '<div class="marks-cfg d-flex align-items-center gap-2">' +
        '<span>Full marks</span>' +
        '<input type="number" min="1" class="form-control form-control-sm font-monospace text-center fw-bold" style="width:60px;" data-cfg="full" value="' + stg.fullMarks + '">' +
        '<span>Pass marks</span>' +
        '<input type="number" min="0" class="form-control form-control-sm font-monospace text-center fw-bold" style="width:60px;" data-cfg="pass" value="' + stg.passMarks + '">' +
        '</div>' +
        '<div class="marks-cfg d-flex align-items-center gap-2">' +
        '<span>Cut-off</span>' +
        '<input type="number" min="0" max="' + stg.fullMarks + '" class="form-control form-control-sm font-monospace text-center fw-bold" style="width:60px;" id="f-cut" value="' + cut + '">' +
        '<button class="btn btn-sm btn-primary btn-icon px-2 py-1 fs-12" id="btn-apply-cut" title="Apply cut-off mark to select candidates">' +
        '<i class="bi bi-funnel-fill"></i> Apply' +
        '</button>' +
        '</div>' +
        '<div id="cut-preview" class="d-inline-block"></div>' +
        '<button class="btn btn-sm btn-outline-secondary btn-icon ms-1" id="btn-Excel"><i class="bi bi-filetype-Excel"></i> Export Excel</button>' +
        '<button class="btn btn-sm btn-outline-secondary btn-icon ms-1" id="btn-print"><i class="bi bi-printer"></i> Result sheet</button>' +
        '</div>',
      tight: true,
      body:
        /* Bulk upload banner */
        '<div class="import-strip p-3 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">' +
        '<div class="d-flex align-items-center gap-3">' +
        '<div class="avatar md rounded-circle bg-white text-success border d-flex align-items-center justify-content-center shadow-2xs">' +
        '<i class="bi bi-file-earmark-arrow-up fs-5"></i>' +
        '</div>' +
        '<div>' +
        '<div class="fw-bold text-dark fs-13">Upload the filled mark sheet</div>' +
        '<div class="text-muted fs-11">Excel (.xlsx / .xls) or Excel — or type the marks into the grid below.</div>' +
        '</div>' +
        '</div>' +
        '<div>' +
        '<button class="btn btn-sm btn-green-solid btn-icon" id="btn-import">' +
        '<i class="bi bi-upload"></i> Import marks' +
        '</button>' +
        '</div>' +
        '</div>' +

        '<div class="p-3">' +
        (s.rows.length
          ? '<div class="table-scroll"><table class="table table-striped table-hover align-middle table-x mb-0" id="table-marks"><thead><tr>' +
          '<th style="width:34px" class="text-center" data-orderable="false">' +
          '<input type="checkbox" class="form-check-input" id="th-select-all" title="Select / Deselect all"' + (allSelected ? ' checked' : '') + '>' +
          '</th>' +
          '<th>Roll</th>' +
          '<th>Candidate</th>' +
          (stg.type === 'VIVA' ? '<th>Scrutiny</th>' : '') +
          '<th>Attendance</th>' +
          '<th>Marks</th>' +
          '<th>Result</th>' +
          '<th>Selection</th>' +
          '<th data-orderable="false" class="text-center">Quota</th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>'
          : ui.empty('No candidate on this roster', 'Confirm the applicant list first.', 'bi-clipboard-data')) +
        '</div>'
    });

    var awaiting = s.total - s.marked - s.absent;
    ui.stagePage(view, stg, 'marks', {
      body: body,
      action: done
        ? {
          note: awaiting
            ? '<span class="text-warning fw-semibold">' + fmt.plural(awaiting, 'candidate') + ' still without a mark</span>'
            : fmt.plural(s.selected, 'candidate') + ' selected',
          secondary: [{ id: 'btn-reopen', label: 'Take more / fewer candidates' }],
          primary: awaiting
            ? { id: 'btn-accept', tone: 'success', icon: 'bi-check2-circle', label: 'Update the selection' }
            : null
        }
        : {
          note: awaiting ? fmt.plural(awaiting, 'candidate') + ' still without a mark' : '',
          primary: {
            id: 'btn-accept', tone: 'success', icon: 'bi-check2-circle',
            label: 'Accept ' + fmt.plural(s.selected, 'selected candidate'), disabled: !s.selected
          }
        }
    });

    if (s.rows.length) {
      ui.dataTable(view.querySelector('#table-marks'), { pageLength: 25 });
    }

    /* ---- In-place UI synchronizers (instant response without page reload) ---- */

    function updateCutPreview() {
      var cutInput = view.querySelector('#f-cut');
      if (!cutInput) return;
      var v = Number(cutInput.value);
      var qualifying = s.rows.filter(function (r) {
        return r.attendance === 'PRESENT' && r.marks !== null && Number(r.marks) >= v && Number(r.marks) >= Number(stg.passMarks);
      }).length;
      var prevEl = view.querySelector('#cut-preview');
      if (prevEl) {
        prevEl.innerHTML =
          '<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fs-12 fw-semibold">' +
          '<i class="bi bi-check2-all me-1"></i><strong>' + qualifying + '</strong> candidates qualify' +
          (c.vacancies ? ' &middot; Vacancies: <span class="fw-bold text-dark">' + c.vacancies + '</span>' : '') +
          '</span>';
      }
    }

    function syncSelectAllState() {
      var selectAllEl = view.querySelector('#th-select-all');
      if (!selectAllEl) return;
      var selectableRows = s.rows.filter(function (r) { return r.attendance !== 'ABSENT'; });
      var anySelected = selectableRows.some(function (r) { return r.selectedForNext; });
      var allSelectedState = selectableRows.length > 0 && selectableRows.every(function (r) { return r.selectedForNext; });
      selectAllEl.checked = allSelectedState;
      selectAllEl.indeterminate = !allSelectedState && anySelected;
    }

    function updateKpis() {
      s = summary(stg);

      var kTotal = view.querySelector('#kpi-total');
      if (kTotal) kTotal.textContent = s.total;

      var kPresent = view.querySelector('#kpi-present');
      if (kPresent) kPresent.textContent = s.present;

      var kAbsent = view.querySelector('#kpi-absent');
      if (kAbsent) {
        kAbsent.textContent = s.absent;
        kAbsent.className = 'fw-bold mb-0 mt-1 ' + (s.absent ? 'text-danger' : 'text-muted');
      }

      var kMarked = view.querySelector('#kpi-marked');
      if (kMarked) kMarked.innerHTML = s.marked + ' <small class="fs-12 text-muted fw-normal">/ ' + s.total + '</small>';

      var kPassed = view.querySelector('#kpi-passed');
      if (kPassed) kPassed.textContent = s.passed;

      var kSelected = view.querySelector('#kpi-selected');
      if (kSelected) kSelected.textContent = s.selected;

      updateCutPreview();

      var curAwaiting = s.total - s.marked - s.absent;
      var abNote = view.querySelector('.ab-note');
      if (abNote) {
        abNote.innerHTML = '<i class="bi bi-info-circle text-success me-1"></i>' +
          (curAwaiting ? fmt.plural(curAwaiting, 'candidate') + ' still without a mark' : fmt.plural(s.selected, 'candidate') + ' selected');
      }

      var acceptBtn = view.querySelector('#btn-accept');
      if (acceptBtn) {
        acceptBtn.disabled = !s.selected;
        acceptBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Accept ' + fmt.plural(s.selected, 'selected candidate');
      }

      syncSelectAllState();
    }

    function updateRowState(r) {
      var tr = view.querySelector('tr[data-row="' + r.id + '"]');
      if (!tr) return;
      var isAbsent = r.attendance === 'ABSENT';

      var chk = tr.querySelector('[data-sel="' + r.id + '"]');
      if (chk) chk.checked = !!r.selectedForNext;
      if (r.selectedForNext) tr.classList.add('row-sel');
      else tr.classList.remove('row-sel');

      var attSel = tr.querySelector('[data-att="' + r.id + '"]');
      if (attSel) {
        attSel.value = r.attendance || '';
        attSel.className = 'form-select form-select-sm fw-semibold ' +
          (r.attendance === 'PRESENT' ? 'text-success border-success-subtle' :
            (isAbsent ? 'text-danger border-danger-subtle' : 'text-muted'));
      }

      var markInp = tr.querySelector('[data-mark="' + r.id + '"]');
      if (markInp) {
        markInp.value = (r.marks === null || r.marks === undefined ? '' : r.marks);
        markInp.disabled = isAbsent;
      }

      var resultBadge = r.resultStatus === 'PASSED'
        ? '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold"><i class="bi bi-check2 me-1"></i>PASSED</span>'
        : (r.resultStatus === 'FAILED'
          ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold"><i class="bi bi-x me-1"></i>FAILED</span>'
          : '<span class="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-0.5 fs-11 fw-normal">PENDING</span>');

      var basisPill = r.selectedForNext
        ? (r.selectionBasis === 'PRIVILEGED'
          ? '<span class="badge bg-purple-subtle text-purple border border-purple-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold" title="' + fmt.esc(r.privilegeNote || '') + '"><i class="bi bi-star-fill text-warning me-1"></i>Privilege</span>'
          : '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 fs-11 fw-semibold"><i class="bi bi-funnel me-1"></i>Cut-off</span>')
        : '<span class="text-muted fs-12">—</span>';

      var privBtn = tr.querySelector('[data-priv="' + r.id + '"]');
      if (privBtn) {
        privBtn.className = 'btn btn-sm ' + (r.selectionBasis === 'PRIVILEGED' ? 'btn-warning text-dark' : 'btn-outline-secondary');
        privBtn.title = (r.selectionBasis === 'PRIVILEGED' ? 'Privilege: ' + fmt.esc(r.privilegeNote || '') : 'Select on privilege / quota');
        privBtn.innerHTML = '<i class="bi bi-star' + (r.selectionBasis === 'PRIVILEGED' ? '-fill' : '') + '"></i>';
      }

      var cells = tr.querySelectorAll('td');
      var resultIdx = (stg.type === 'VIVA') ? 6 : 5;
      var basisIdx = (stg.type === 'VIVA') ? 7 : 6;
      if (cells[resultIdx]) cells[resultIdx].innerHTML = resultBadge;
      if (cells[basisIdx]) cells[basisIdx].innerHTML = basisPill;
    }

    /* ---- full / pass marks, edited in context ---- */
    ui.on(view, '[data-cfg]', 'change', function (e, inp) {
      var patch = {};
      var v = parseInt(inp.value, 10);
      if (isNaN(v) || v < 0) { ui.toast('Enter a valid number', 'warning'); ERec.router.refresh(); return; }
      patch[inp.dataset.cfg === 'full' ? 'fullMarks' : 'passMarks'] = v;
      store.update('stages', stg.id, patch);
      stg = store.stage(stg.id);
      s.rows.forEach(function (r) { recalc(stg, r); });
      store.save();
      ui.toast((inp.dataset.cfg === 'full' ? 'Full' : 'Pass') + ' marks set to ' + v);
      ERec.router.refresh();
    });

    /* ---- mark entry ---- */
    ui.on(view, '[data-mark]', 'change', function (e, inp) {
      var r = store.find('stageApplicants', inp.dataset.mark);
      if (!r) return;
      var raw = inp.value.trim();
      var v = raw === '' ? null : Math.max(0, Math.min(Number(stg.fullMarks), Number(raw)));
      r.marks = v;
      if (v !== null && !r.attendance) r.attendance = 'PRESENT';
      recalc(stg, r);
      store.save();
      updateRowState(r);
      updateKpis();
    });

    // Press Enter to quickly navigate to the next mark input
    ui.on(view, '[data-mark]', 'keydown', function (e, inp) {
      if (e.key === 'Enter') {
        e.preventDefault();
        inp.blur();
        var allMarks = Array.prototype.slice.call(view.querySelectorAll('input[data-mark]:not(:disabled)'));
        var idx = allMarks.indexOf(inp);
        if (idx >= 0 && idx < allMarks.length - 1) {
          allMarks[idx + 1].focus();
          allMarks[idx + 1].select();
        }
      }
    });

    ui.on(view, '[data-att]', 'change', function (e, sel) {
      var r = store.find('stageApplicants', sel.dataset.att);
      if (!r) return;
      r.attendance = sel.value || null;
      if (r.attendance === 'ABSENT') {
        r.marks = null;
        r.selectedForNext = false;
        r.selectionBasis = null;
      }
      recalc(stg, r);
      store.save();
      updateRowState(r);
      updateKpis();
    });

    /* ---- cut-off preview & apply ---- */
    var cutInput = view.querySelector('#f-cut');
    if (cutInput) {
      cutInput.addEventListener('input', function () {
        cutoffs[stg.id] = Number(cutInput.value);
        updateCutPreview();
      });
      updateCutPreview();
    }

    var applyCut = view.querySelector('#btn-apply-cut');
    if (applyCut) applyCut.addEventListener('click', function () {
      var v = Number(cutInput ? cutInput.value : stg.passMarks);
      if (isNaN(v) || v < 0) { ui.toast('Enter a valid cut-off mark', 'warning'); return; }
      if (v > Number(stg.fullMarks)) { ui.toast('Cut-off mark cannot exceed full marks (' + stg.fullMarks + ')', 'warning'); return; }
      var n = 0;
      s.rows.forEach(function (r) {
        /* privilege selections survive a cut-off run */
        if (r.selectionBasis === 'PRIVILEGED' && r.selectedForNext) { n++; return; }
        var pass = r.attendance === 'PRESENT' && r.marks !== null && Number(r.marks) >= v && Number(r.marks) >= Number(stg.passMarks);
        r.selectedForNext = pass;
        r.selectionBasis = pass ? 'CUTOFF' : null;
        if (pass) n++;
      });
      cutoffs[stg.id] = v;
      store.save();
      ui.toast(fmt.plural(n, 'candidate') + ' selected at cut-off ' + v);
      ERec.router.refresh();
    });

    ui.on(view, '[data-priv]', 'click', function (e, b) {
      var r = store.find('stageApplicants', b.dataset.priv);
      if (!r) return;
      var a = store.applicant(r.applicantId) || {};
      if (r.selectionBasis === 'PRIVILEGED') {
        r.selectedForNext = false; r.selectionBasis = null; r.privilegeNote = '';
        store.save();
        ui.toast('Privilege selection removed');
        updateRowState(r);
        updateKpis();
        return;
      }
      ui.modal({
        title: 'Select on privilege · ' + fmt.esc(a.name || 'Candidate'),
        body: '<p class="fs-13">Selecting this candidate for the next stage regardless of the cut-off mark. ' +
          'The basis is recorded against the candidate.</p>' +
          '<label class="form-label">Ground / quota</label>' +
          '<input class="form-control" id="f-note" placeholder="e.g. Freedom fighter quota, departmental candidate">',
        footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
          '<button class="btn btn-sm btn-primary" data-act="go">Select on privilege</button>',
        onShow: function (api) {
          function doPrivilegeSelect() {
            var note = api.find('#f-note').value.trim();
            if (!note) { ui.toast('State the ground for privilege selection', 'warning'); return; }
            r.selectedForNext = true; r.selectionBasis = 'PRIVILEGED'; r.privilegeNote = note;
            store.save();
            store.audit('PRIVILEGE_SELECT', 'applicant', a.id, (a.name || 'Candidate') + ' selected on privilege — ' + note);
            api.close();
            ui.toast((a.name || 'Candidate') + ' selected on privilege');
            updateRowState(r);
            updateKpis();
          }

          api.find('[data-act="go"]').addEventListener('click', doPrivilegeSelect);
          var noteInput = api.find('#f-note');
          if (noteInput) {
            noteInput.addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                doPrivilegeSelect();
              }
            });
            setTimeout(function () { noteInput.focus(); }, 150);
          }
        }
      });
    });

    /* ---- select all / individual row checkboxes ---- */
    ui.on(view, '#th-select-all', 'change', function (e, chk) {
      var isChecked = chk.checked;
      var n = 0;
      s.rows.forEach(function (r) {
        if (isChecked) {
          if (r.attendance === 'ABSENT') {
            r.selectedForNext = false;
            r.selectionBasis = null;
            return;
          }
          r.selectedForNext = true;
          if (r.selectionBasis !== 'PRIVILEGED') r.selectionBasis = 'CUTOFF';
          n++;
        } else {
          r.selectedForNext = false;
          if (r.selectionBasis !== 'PRIVILEGED') r.selectionBasis = null;
        }
      });
      store.save();
      ui.toast(isChecked ? fmt.plural(n, 'candidate') + ' selected' : 'Selections cleared');
      ERec.router.refresh();
    });

    ui.on(view, '[data-sel]', 'change', function (e, cb) {
      var r = store.find('stageApplicants', cb.dataset.sel);
      if (!r) return;
      if (cb.checked && r.attendance === 'ABSENT') {
        cb.checked = false;
        ui.toast('Cannot select an absent candidate', 'warning');
        return;
      }
      r.selectedForNext = cb.checked;
      if (cb.checked) {
        if (r.selectionBasis !== 'PRIVILEGED') r.selectionBasis = 'CUTOFF';
      } else {
        if (r.selectionBasis !== 'PRIVILEGED') r.selectionBasis = null;
      }
      store.save();
      updateRowState(r);
      updateKpis();
    });

    syncSelectAllState();

    /* ---- import / export ---- */
    ui.on(view, '#btn-import', 'click', function () {
      importModal(stg, function () { ERec.router.refresh(); });
    });

    ui.on(view, '#btn-Excel', 'click', function () {
      ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_' + pipe.typeLabel(stg.type) + '_marks.Excel',
        ['Roll', 'Name', 'Attendance', 'Marks', 'Full Marks', 'Result', 'Selected', 'Basis'],
        s.rows.map(function (r) {
          var a = store.applicant(r.applicantId) || {};
          return [r.rollNo, a.name, r.attendance || '', r.marks === null ? '' : r.marks,
          stg.fullMarks, r.resultStatus, r.selectedForNext ? 'Yes' : 'No', r.selectionBasis || ''];
        }));
    });

    ui.on(view, '#btn-print', 'click', function () {
      ERec.exp.printDoc('result', stg.id);
    });

    /* ---- accept ---- */
    var accept = view.querySelector('#btn-accept');
    if (accept) accept.addEventListener('click', function () {
      var curSummary = summary(stg);
      var unmarked = curSummary.total - curSummary.marked - curSummary.absent;
      ui.confirm({
        title: 'Accept mark upload',
        body: fmt.plural(curSummary.selected, 'candidate') + ' will be carried to the next step.' +
          (unmarked > 0 ? ' <strong class="text-danger">' + fmt.plural(unmarked, 'candidate') +
            ' still have no mark or attendance recorded.</strong>' : ''),
        okText: 'Accept'
      }).then(function (ok) {
        if (!ok) return;
        store.markStep(stg.id, 'marks', {
          entered: curSummary.marked, selected: curSummary.selected,
          basis: 'CUTOFF', cutOff: cutoffs[stg.id]
        });
        store.update('stages', stg.id, { status: 'COMPLETED' });
        store.audit('UPLOAD_MARKS', 'stage', stg.id,
          pipe.typeLabel(stg.type) + ' marks accepted — ' + curSummary.selected + ' selected');
        ui.toast('Mark upload accepted');
        var next = pipe.context(stg).isLast ? 'result' : 'forward';
        ERec.router.go('#/circular/' + c.id + '/stage/' + stg.id + '/' + next);
      });
    });

    var reopen = view.querySelector('#btn-reopen');
    if (reopen) reopen.addEventListener('click', function () {
      ui.confirm({
        title: 'Update the selected list',
        body: 'Re-open mark upload so you can take more or fewer candidates. ' +
          'Anything already forwarded stays until you forward again.',
        okText: 'Re-open'
      }).then(function (ok) {
        if (!ok) return;
        store.clearStep(stg.id, 'marks');
        store.update('stages', stg.id, { status: 'IN_PROGRESS' });
        ui.toast('Mark upload re-opened');
        ERec.router.refresh();
      });
    });
  }

  /* ---------- forward to next stage ---------- */

  function renderForward(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var targets = pipe.forwardTargets(stg);
    var s = summary(stg);
    var state = store.stepState(stg, 'forward');
    var done = !!(state && state.done);
    var panels = store.panelsOf(stg.id);

    var chosenTarget = (state && state.targetStageId) || (targets[0] && targets[0].id);

    var body = ui.lockedNotice(stg, 'forward');

    body += '<div class="row g-3"><div class="col-lg-5">' + ui.card({
      title: 'Forward to',
      body: targets.length
        ? targets.map(function (t) {
          return '<div class="form-check mb-2">' +
            '<input class="form-check-input" type="radio" name="tgt" value="' + t.id + '" id="t-' + t.id + '"' +
            (t.id === chosenTarget ? ' checked' : '') + (done ? ' disabled' : '') + '>' +
            '<label class="form-check-label" for="t-' + t.id + '">' +
            '<span class="fw-semibold">Stage ' + t.seq + ' · ' + fmt.esc(pipe.typeLabel(t.type)) + '</span>' +
            '<span class="d-block fs-12 muted">' + fmt.plural(store.rosterOf(t.id).length, 'candidate') + ' already on that roster</span>' +
            '</label></div>';
        }).join('')
        : ui.empty('No later stage configured')
    }) + ui.card({
      title: 'Interview panels',
      hint: 'Optional — split the call list into panels with their own date and slot.',
      actions: '<button class="btn btn-sm btn-light btn-icon" id="btn-panel"><i class="bi bi-people"></i> Generate panels</button>',
      body: panels.length
        ? panels.map(function (p) {
          return '<div class="d-flex align-items-center gap-2 border rounded p-2 mb-2">' +
            '<span class="pill blue">' + fmt.esc(p.name) + '</span>' +
            '<div class="flex-grow-1 fs-12"><div>' + fmt.plural(p.applicantIds.length, 'candidate') + '</div>' +
            '<div class="muted">' + fmt.date(p.slotDate) + ' · ' + fmt.esc(p.members.join(', ')) + '</div></div>' +
            '<button class="btn btn-sm btn-outline-danger" data-delpanel="' + p.id + '"><i class="bi bi-trash"></i></button>' +
            '</div>';
        }).join('')
        : '<div class="fs-13 muted">No panel created. Candidates will be called as one list.</div>'
    }) + '</div><div class="col-lg-7">' + ui.card({
      title: 'Selected candidates',
      hint: 'This is the list that moves forward.',
      actions: '<button class="btn btn-sm btn-light btn-icon" id="btn-Excel2"><i class="bi bi-filetype-Excel"></i> Export</button>',
      tight: true,
      body: s.selectedRows.length
        ? '<div class="table-scroll"><table class="table table-striped table-hover align-middle table-x" id="table-forward-marks"><thead><tr><th>Roll</th><th>Candidate</th>' +
        '<th class="num">Marks</th><th>Basis</th><th>Panel</th></tr></thead><tbody>' +
        fmt.sortBy(s.selectedRows, function (r) { return -Number(r.marks || 0); }).map(function (r) {
          var a = store.applicant(r.applicantId) || {};
          var p = panels.find(function (x) { return x.applicantIds.indexOf(r.applicantId) >= 0; });
          return '<tr><td class="mono">' + fmt.esc(r.rollNo) + '</td>' +
            '<td>' + fmt.esc(a.name || '—') + '</td>' +
            '<td class="num">' + (r.marks === null ? '—' : r.marks + ' / ' + stg.fullMarks) + '</td>' +
            '<td>' + (r.selectionBasis === 'PRIVILEGED'
              ? ui.pill('Privilege', 'purple', 'bi-star-fill') + '<div class="fs-12 muted mt-1">' + fmt.esc(r.privilegeNote || '') + '</div>'
              : ui.pill('Cut-off', 'green')) + '</td>' +
            '<td class="fs-12">' + (p ? fmt.esc(p.name) : '<span class="muted">—</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : ui.empty('Nothing selected yet', 'Go back to Mark Upload and select candidates.', 'bi-people')
    }) + '</div></div>';

    ui.stagePage(view, stg, 'forward', {
      body: body,
      action: done
        ? {
          note: fmt.plural(state.count, 'candidate') + ' already sent forward',
          secondary: [{ id: 'btn-undo', label: 'Send more forward' }]
        }
        : {
          primary: {
            id: 'btn-forward', tone: 'success', icon: 'bi-arrow-right-circle',
            label: 'Send ' + fmt.plural(s.selected, 'candidate') + ' forward',
            disabled: !targets.length || !s.selected
          }
        }
    });

    if (s.selectedRows.length) {
      ui.dataTable(view.querySelector('#table-forward-marks'), { pageLength: 10 });
    }

    ui.on(view, 'input[name="tgt"]', 'change', function (e, r) { chosenTarget = r.value; });

    var fwd = view.querySelector('#btn-forward');
    if (fwd) fwd.addEventListener('click', function () {
      var target = store.stage(chosenTarget);
      if (!target) {
        ui.toast('Please select a valid target stage', 'warning');
        return;
      }
      ui.confirm({
        title: 'Forward candidates',
        body: fmt.plural(s.selected, 'candidate') + ' will be enrolled into <strong>' +
          fmt.esc(pipe.typeLabel(target.type)) + '</strong>. Their roll numbers carry over.',
        okText: 'Forward'
      }).then(function (ok) {
        if (!ok) return;
        var added = 0;
        s.selectedRows.forEach(function (r) {
          if (store.rosterRow(target.id, r.applicantId)) return;
          store.insert('stageApplicants', {
            id: fmt.uid('sa'), stageId: target.id, applicantId: r.applicantId, rollNo: r.rollNo,
            venueId: null, attendance: null, marks: null, resultStatus: 'PENDING',
            selectedForNext: false, selectionBasis: null, scrutiny: null, panelId: null
          });
          added++;
        });
        store.markStep(stg.id, 'forward', { targetStageId: target.id, count: s.selected });
        store.markStep(target.id, 'search', { count: store.rosterOf(target.id).length });
        store.audit('FORWARD', 'stage', stg.id,
          fmt.plural(added, 'candidate') + ' forwarded from ' + pipe.typeLabel(stg.type) + ' to ' + pipe.typeLabel(target.type));
        ui.toast(fmt.plural(added, 'candidate') + ' forwarded to ' + pipe.typeLabel(target.type));
        ERec.router.go('#/circular/' + c.id + '/stage/' + target.id);
      });
    });

    var undo = view.querySelector('#btn-undo');
    if (undo) undo.addEventListener('click', function () {
      ui.confirm({
        title: 'Revise forwarded list',
        body: 'The forward step is re-opened. Candidates already on the next stage are not removed — ' +
          'forwarding again only adds the ones that are missing.',
        okText: 'Re-open'
      }).then(function (ok) {
        if (!ok) return;
        store.clearStep(stg.id, 'forward');
        ui.toast('Forward step re-opened');
        ERec.router.refresh();
      });
    });

    var panelBtn = view.querySelector('#btn-panel');
    if (panelBtn) panelBtn.addEventListener('click', function () {
      if (!s.selectedRows.length) { ui.toast('Select candidates first', 'warning'); return; }
      ui.modal({
        title: 'Generate interview panels',
        body: '<div class="row g-3">' +
          '<div class="col-6"><label class="form-label">Number of panels</label>' +
          '<input type="number" min="1" max="8" class="form-control" id="p-n" value="2"></div>' +
          '<div class="col-6"><label class="form-label">First panel date</label>' +
          '<input type="date" class="form-control" id="p-date" value="' + fmt.addDays(fmt.isoDate(), 14) + '"></div>' +
          '<div class="col-12"><label class="form-label">Board members (comma separated)</label>' +
          '<input class="form-control" id="p-mem" value="Chairman, Member (HR), Member (Technical)"></div>' +
          '</div><div class="form-text mt-2">Candidates are distributed in roll order, one panel per day.</div>',
        footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>' +
          '<button class="btn btn-sm btn-primary" data-act="go">Create panels</button>',
        onShow: function (api) {
          api.find('[data-act="go"]').addEventListener('click', function () {
            var n = Math.max(1, Math.min(8, parseInt(api.find('#p-n').value, 10) || 1));
            var date = api.find('#p-date').value;
            var members = api.find('#p-mem').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
            store.panelsOf(stg.id).forEach(function (p) { store.remove('panels', p.id); });
            var ordered = fmt.sortBy(s.selectedRows, 'rollNo');
            var size = Math.ceil(ordered.length / n);
            for (var i = 0; i < n; i++) {
              var chunk = ordered.slice(i * size, (i + 1) * size);
              if (!chunk.length) continue;
              var pid = fmt.uid('pnl');
              store.insert('panels', {
                id: pid, stageId: stg.id, name: 'Panel ' + String.fromCharCode(65 + i),
                members: members, slotDate: fmt.addDays(date, i),
                applicantIds: chunk.map(function (x) { return x.applicantId; })
              });
              chunk.forEach(function (x) { x.panelId = pid; });
            }
            store.save();
            api.close();
            ui.toast(n + ' panel(s) created');
            ERec.router.refresh();
          });
        }
      });
    });

    ui.on(view, '[data-delpanel]', 'click', function (e, b) {
      store.remove('panels', b.dataset.delpanel);
      ui.toast('Panel removed');
      ERec.router.refresh();
    });

    var Excel2 = view.querySelector('#btn-Excel2');
    if (Excel2) Excel2.addEventListener('click', function () {
      ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_selected_for_next_stage.Excel',
        ['Roll', 'Name', 'Marks', 'Basis', 'Ground', 'Panel'],
        s.selectedRows.map(function (r) {
          var a = store.applicant(r.applicantId) || {};
          var p = panels.find(function (x) { return x.applicantIds.indexOf(r.applicantId) >= 0; });
          return [r.rollNo, a.name || '—', r.marks, r.selectionBasis, r.privilegeNote || '', p ? p.name : ''];
        }));
    });
  }

  ERec.pages.marks = {
    render: render,
    renderForward: renderForward,
    eligible: eligible,
    summary: summary,
    downloadTemplate: downloadTemplate,
    importModal: importModal
  };
})(window);
