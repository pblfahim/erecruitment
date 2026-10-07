/* Roll number Generate - attaches to the FIRST exam stage only, whichever
   type that is (MCQ, Written or a straight Viva-Voce). */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var ORDERS = [
    ['appNo', 'Application number'],
    ['zone', 'Zone']
  ];

  /* Helper to parse comma-separated or array of zones */
  function parseZones(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return String(val)
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function orderedRoster(stg, orderBy, zoneInput) {
    var rows = store.rosterOf(stg.id).map(function (r) {
      return { row: r, a: store.applicant(r.applicantId) };
    }).filter(function (x) { return x.a; });

    if (orderBy === 'zone') {
      var selectedZones = parseZones(zoneInput).map(function (z) { return z.toLowerCase(); });
      return fmt.sortBy(rows, function (x) {
        var z = String(x.a.zone || x.a.division || x.a.district || '').toLowerCase();
        var matchIndex = -1;
        if (selectedZones.length) {
          for (var i = 0; i < selectedZones.length; i++) {
            var target = selectedZones[i];
            if (z === target || z.indexOf(target) !== -1 || target.indexOf(z) !== -1) {
              matchIndex = i;
              break;
            }
          }
        }
        var rank = (matchIndex !== -1) ? fmt.pad(matchIndex, 3) : '999';
        return rank + '_' + z + '_' + String(x.a.appNo || x.a.name || '');
      });
    }
    return fmt.sortBy(rows, function (x) { return x.a.appNo || ''; });
  }

  function render(view, params) {
    var stg = store.stage(params.sid);
    if (!stg) { ERec.router.go('#/circulars'); return; }
    var c = store.circular(stg.circularId);
    var state = store.stepState(stg, 'roll');
    var done = !!(state && state.done);
    var step = pipe.step(stg, 'roll');

    var validOrders = ORDERS.map(function (o) { return o[0]; });
    var currentOrder = (state && state.orderBy && validOrders.indexOf(state.orderBy) !== -1)
      ? state.orderBy
      : 'appNo';

    var cfg = {
      prefix: (state && state.prefix) || String(new Date(c.applyStart || Date.now()).getFullYear()).slice(2) +
        (String(store.stagesOf(c.id).length) + '0').slice(0, 2),
      start: (state && state.start) || 1,
      padding: (state && state.padding) || 4,
      orderBy: currentOrder,
      zoneName: (state && state.zoneName) || ''
    };

    var roster = store.rosterOf(stg.id);
    var body = ui.lockedNotice(stg, 'roll');

    // Exactly 3 suggestions shown as requested
    var top3Suggestions = ['Dhaka', 'Chattogram', 'Sylhet'];

    // All available zones for autocomplete
    var allZones = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Cumilla', 'Bogura'];
    roster.forEach(function (r) {
      var a = store.applicant(r.applicantId);
      if (a) {
        var z = a.zone || a.division || a.district;
        if (z && allZones.indexOf(z) === -1) allZones.push(z);
      }
    });

    var initialSelectedZones = parseZones(cfg.zoneName);
    var isGenerated = done || roster.some(function (r) { return !!r.rollNo; });
    var genBtnClass = isGenerated ? 'btn btn-regenerate-solid w-100 mt-3' : 'btn btn-green-solid w-100 mt-3';
    var genBtnText = isGenerated ? '<i class="bi bi-arrow-repeat me-1"></i> Regenarate Roll' : '<i class="bi bi-gear-wide-connected me-1"></i> Generate Roll';

    body += '<div class="row g-3"><div class="col-lg-4">' + ui.card({
      title: isGenerated ? 'Regenarate Roll' : 'Generate Roll',
      hint: isGenerated ? 'Update roll numbers with new prefix or sequence.' : 'Roll = prefix + running serial.',
      body:
        '<label class="form-label">Prefix</label>' +
        '<input class="form-control mono mb-3" id="f-prefix" value="' + fmt.esc(cfg.prefix) + '" maxlength="8">' +
        '<div class="row g-2 mb-3"><div class="col-6">' +
        '<label class="form-label">Start from</label>' +
        '<input type="number" min="1" class="form-control" id="f-start" value="' + cfg.start + '"></div>' +
        '<div class="col-6"><label class="form-label">Serial digits</label>' +
        '<select class="form-select" id="f-pad">' +
        [3, 4, 5, 6].map(function (p) {
          return '<option value="' + p + '"' + (p === cfg.padding ? ' selected' : '') + '>' + p + ' digits</option>';
        }).join('') + '</select></div></div>' +
        '<label class="form-label">Order candidates by</label>' +
        '<select class="form-select mb-3" id="f-order">' +
        ORDERS.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === cfg.orderBy ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>' +
        '<div id="zone-field-wrap" class="mb-3"' + (cfg.orderBy === 'zone' ? '' : ' style="display:none;"') + '>' +
        '<label class="form-label d-flex align-items-center justify-content-between mb-1">' +
        '<span>Select Zone(s)</span>' +
        '<span class="text-muted fs-11">Multiple selection supported</span>' +
        '</label>' +
        '<div class="input-group input-group-sm mb-2">' +
        '<span class="input-group-text bg-light text-muted"><i class="bi bi-geo-alt"></i></span>' +
        '<input type="text" class="form-control" id="f-zone-name" list="zone-suggestions" placeholder="Type or select zone..." value="' + fmt.esc(cfg.zoneName || '') + '" autocomplete="off">' +
        '<button class="btn btn-outline-secondary" type="button" id="btn-clear-zone" title="Clear all zones"><i class="bi bi-x-lg"></i></button>' +
        '</div>' +
        '<datalist id="zone-suggestions">' +
        allZones.map(function (z) { return '<option value="' + fmt.esc(z) + '">'; }).join('') +
        '</datalist>' +
        '<div class="d-flex align-items-center gap-2 flex-wrap">' +
        '<span class="fs-11 text-muted"><i class="bi bi-lightbulb me-0.5"></i>Suggestions:</span>' +
        top3Suggestions.map(function (z) {
          var isSel = initialSelectedZones.some(function (sz) { return sz.toLowerCase() === z.toLowerCase(); });
          return '<button type="button" class="btn btn-xs ' + (isSel ? 'btn-success text-white' : 'btn-light border') + ' py-0 px-2 fs-11 rounded-pill zone-chip" data-zone="' + fmt.esc(z) + '">' +
            (isSel ? '<i class="bi bi-check2 me-1"></i>' : '<i class="bi bi-plus me-0.5"></i>') + fmt.esc(z) +
            '</button>';
        }).join('') +
        '</div>' +
        '</div>' +
        '<button type="button" class="' + genBtnClass + '" id="btn-generate-rule"' + (!roster.length ? ' disabled' : '') + '>' +
        genBtnText + '</button>'
    }) + '</div><div class="col-lg-8">' + ui.card({
      tight: true,
      body: '<div class="table-scroll" id="preview-table"></div>'
    }) + '</div></div>';

    ui.stagePage(view, stg, 'roll', {
      body: body,
      action: done
        ? {
          note: fmt.plural(roster.length, 'roll number') + ' allotted',
          secondary: [
            { id: 'btn-Excel', label: 'Export Excel', icon: 'bi-filetype-Excel' }
          ]
        }
        : {
          primary: {
            id: 'btn-gen', tone: 'success',
            label: 'Generate roll numbers', disabled: !roster.length
          }
        }
    });

    /* ---- live preview ---- */
    function readCfg() {
      var orderEl = view.querySelector('#f-order');
      var zoneEl = view.querySelector('#f-zone-name');
      return {
        prefix: view.querySelector('#f-prefix').value.trim(),
        start: parseInt(view.querySelector('#f-start').value, 10) || 1,
        padding: parseInt(view.querySelector('#f-pad').value, 10) || 4,
        orderBy: orderEl ? orderEl.value : 'appNo',
        zoneName: zoneEl ? zoneEl.value.trim() : ''
      };
    }

    function rollAt(cfgv, i) { return cfgv.prefix + fmt.pad(cfgv.start + i, cfgv.padding); }

    function updateSelectedZonesUi(selectedList) {
      var container = view.querySelector('#selected-zones-pills');
      if (!container) return;
      if (!selectedList.length) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }
      container.style.display = 'flex';
      container.innerHTML = '<span class="fs-11 text-muted me-1">Selected:</span>' +
        selectedList.map(function (z) {
          return '<span class="badge bg-success text-white rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 fs-11">' +
            '<i class="bi bi-geo-alt-fill me-0.5"></i>' + fmt.esc(z) +
            '<button type="button" class="btn-close btn-close-white ms-1 p-0 zone-remove-btn" style="width:0.5rem;height:0.5rem;" data-remove-zone="' + fmt.esc(z) + '" aria-label="Remove ' + fmt.esc(z) + '"></button>' +
            '</span>';
        }).join('');
    }

    function syncZoneChipsAndInput(selectedList) {
      var zInp = view.querySelector('#f-zone-name');
      if (zInp) {
        zInp.value = selectedList.join(', ');
      }
      view.querySelectorAll('.zone-chip').forEach(function (btn) {
        var chipZone = btn.dataset.zone.toLowerCase();
        var isSel = selectedList.some(function (z) { return z.toLowerCase() === chipZone; });
        btn.classList.toggle('btn-success', isSel);
        btn.classList.toggle('text-white', isSel);
        btn.classList.toggle('btn-light', !isSel);
        btn.classList.toggle('border', !isSel);
        btn.innerHTML = (isSel ? '<i class="bi bi-check2 me-1"></i>' : '<i class="bi bi-plus me-0.5"></i>') + fmt.esc(btn.dataset.zone);
      });
      updateSelectedZonesUi(selectedList);
      paint();
    }

    function paint() {
      var v = readCfg();
      var list = orderedRoster(stg, v.orderBy, v.zoneName);

      var zoneInfo = '';
      if (v.orderBy === 'zone') {
        var selZones = parseZones(v.zoneName);
        if (selZones.length) {
          var selLower = selZones.map(function (z) { return z.toLowerCase(); });
          var matchCount = list.filter(function (x) {
            var z = String(x.a.zone || x.a.division || x.a.district || '').toLowerCase();
            return selLower.some(function (target) {
              return z === target || z.indexOf(target) !== -1 || target.indexOf(z) !== -1;
            });
          }).length;
          zoneInfo = matchCount > 0
            ? '<br><span class="badge bg-success-subtle text-success border border-success-subtle mt-1 fs-11"><i class="bi bi-check2 me-1"></i>' + matchCount + ' candidates in selected ' + fmt.plural(selZones.length, 'zone') + ' (' + fmt.esc(selZones.join(', ')) + ') numbered first</span>'
            : '<br><span class="text-muted fs-11 mt-1">No candidates match ' + fmt.esc(selZones.join(', ')) + ' (sorted alphabetically)</span>';
        } else {
          zoneInfo = '<br><span class="text-muted fs-11 mt-1">Grouped by zone &amp; district</span>';
        }
      }

      var sampleEl = view.querySelector('#sample');
      if (sampleEl) {
        sampleEl.innerHTML = list.length
          ? 'First: <strong class="mono">' + fmt.esc(rollAt(v, 0)) + '</strong><br>' +
          'Last: <strong class="mono">' + fmt.esc(rollAt(v, list.length - 1)) + '</strong><br>' +
          '<span class="muted">' + fmt.plural(list.length, 'candidate') + '</span>' + zoneInfo
          : 'No candidates to number.';
      }

      view.querySelector('#preview-table').innerHTML = list.length
        ? '<table class="table table-striped table-hover align-middle table-x" id="table-roll-preview"><thead><tr><th>#</th><th>Roll</th><th>Candidate</th><th>Application no.</th>' +
        '<th>Zone / District</th></tr></thead><tbody>' +
        list.map(function (x, i) {
          var roll = done ? (x.row.rollNo || rollAt(v, i)) : rollAt(v, i);
          var candZone = x.a.zone || x.a.division || x.a.district || '—';
          var candZoneLower = candZone.toLowerCase();
          var selZones = parseZones(v.zoneName).map(function (z) { return z.toLowerCase(); });
          var matchedIdx = -1;
          for (var zi = 0; zi < selZones.length; zi++) {
            if (candZoneLower === selZones[zi] || candZoneLower.indexOf(selZones[zi]) !== -1 || selZones[zi].indexOf(candZoneLower) !== -1) {
              matchedIdx = zi;
              break;
            }
          }
          var isMatch = v.orderBy === 'zone' && matchedIdx !== -1;
          var zoneCol = isMatch
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle fw-semibold"><i class="bi bi-geo-alt-fill me-0.5"></i>' + fmt.esc(candZone) + '</span>'
            : '<span class="fs-12 text-secondary">' + fmt.esc(candZone) + '</span>';

          return '<tr><td class="num muted">' + (i + 1) + '</td>' +
            '<td class="mono fw-semibold">' + fmt.esc(roll) + '</td>' +
            '<td>' + fmt.esc(x.a.name) + '</td>' +
            '<td class="mono fs-12">' + fmt.esc(x.a.appNo) + '</td>' +
            '<td>' + zoneCol + '</td></tr>';
        }).join('') + '</tbody></table>'
        : ui.empty('Nothing to preview');

      if (list.length) {
        ui.dataTable(view.querySelector('#table-roll-preview'), { pageLength: 10 });
      }
    }

    ['#f-prefix', '#f-start', '#f-pad', '#f-order'].forEach(function (sel) {
      var el = view.querySelector(sel);
      if (el) {
        el.addEventListener('input', paint);
        el.addEventListener('change', paint);
      }
    });

    var orderSel = view.querySelector('#f-order');
    var zoneWrap = view.querySelector('#zone-field-wrap');
    if (orderSel && zoneWrap) {
      orderSel.addEventListener('change', function () {
        var isZone = orderSel.value === 'zone';
        zoneWrap.style.display = isZone ? 'block' : 'none';
        if (isZone) {
          var zInp = view.querySelector('#f-zone-name');
          if (zInp && !zInp.value) {
            zInp.focus();
          }
        }
        paint();
      });
    }

    var zInput = view.querySelector('#f-zone-name');
    if (zInput) {
      zInput.addEventListener('input', function () {
        var curList = parseZones(zInput.value);
        view.querySelectorAll('.zone-chip').forEach(function (btn) {
          var chipZone = btn.dataset.zone.toLowerCase();
          var isSel = curList.some(function (z) { return z.toLowerCase() === chipZone; });
          btn.classList.toggle('btn-success', isSel);
          btn.classList.toggle('text-white', isSel);
          btn.classList.toggle('btn-light', !isSel);
          btn.classList.toggle('border', !isSel);
          btn.innerHTML = (isSel ? '<i class="bi bi-check2 me-1"></i>' : '<i class="bi bi-plus me-0.5"></i>') + fmt.esc(btn.dataset.zone);
        });
        updateSelectedZonesUi(curList);
        paint();
      });

      zInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var curList = parseZones(zInput.value);
          syncZoneChipsAndInput(curList);
        }
      });
    }

    ui.on(view, '.zone-chip', 'click', function (e, btn) {
      var zone = btn.dataset.zone;
      var curList = parseZones(view.querySelector('#f-zone-name').value);
      var idx = curList.findIndex(function (z) { return z.toLowerCase() === zone.toLowerCase(); });
      if (idx !== -1) {
        curList.splice(idx, 1);
      } else {
        curList.push(zone);
      }
      syncZoneChipsAndInput(curList);
    });

    ui.on(view, '.zone-remove-btn', 'click', function (e, btn) {
      var zone = btn.dataset.removeZone;
      var curList = parseZones(view.querySelector('#f-zone-name').value);
      curList = curList.filter(function (z) { return z.toLowerCase() !== zone.toLowerCase(); });
      syncZoneChipsAndInput(curList);
    });

    var clearZone = view.querySelector('#btn-clear-zone');
    if (clearZone) {
      clearZone.addEventListener('click', function () {
        syncZoneChipsAndInput([]);
      });
    }

    paint();

    /* ---- generate ---- */
    function generate() {
      var v = readCfg();
      if (!v.prefix) { ui.toast('Prefix is required', 'warning'); return; }
      var list = orderedRoster(stg, v.orderBy, v.zoneName);
      list.forEach(function (x, i) {
        var roll = rollAt(v, i);
        x.a.rollNo = roll;
        x.row.rollNo = roll;
      });
      /* Later stages reuse the same roll number for the same candidate. */
      store.all('stageApplicants').forEach(function (r) {
        var a = store.applicant(r.applicantId);
        if (a && a.circularId === c.id && a.rollNo) r.rollNo = a.rollNo;
      });
      store.markStep(stg.id, 'roll', {
        prefix: v.prefix, start: v.start, padding: v.padding, orderBy: v.orderBy, zoneName: v.zoneName, count: list.length
      });
      store.audit('GENERATE_ROLL', 'stage', stg.id, fmt.plural(list.length, 'roll number') + ' generated (' + v.prefix + ')');
      ui.toast(fmt.plural(list.length, 'roll number') + ' generated');
      ERec.router.refresh();
    }

    var genRule = view.querySelector('#btn-generate-rule');
    if (genRule) {
      genRule.addEventListener('click', function () {
        if (isGenerated) {
          var venues = store.venuesOf(stg.id);
          ui.confirm({
            title: 'Re-generate roll numbers',
            body: 'Every candidate gets a new roll number.' +
              (venues.length ? ' <strong class="text-danger">' + fmt.plural(venues.length, 'venue') +
                ' already reference roll ranges and will need to be re-checked.</strong>' : ''),
            okText: 'Re-generate', danger: true
          }).then(function (ok) { if (ok) generate(); });
        } else {
          generate();
        }
      });
    }

    var gen = view.querySelector('#btn-gen');
    if (gen) gen.addEventListener('click', generate);

    var Excel = view.querySelector('#btn-Excel');
    if (Excel) Excel.addEventListener('click', function () {
      ERec.exp.Excel(c.post.replace(/\W+/g, '_') + '_roll_numbers.Excel',
        ['Roll', 'Application No', 'Name', "Father's Name", 'Mobile', 'Zone / District'],
        store.rosterOf(stg.id).map(function (r) {
          var a = store.applicant(r.applicantId);
          return [r.rollNo, a.appNo, a.name, a.fatherName, a.mobile, a.zone || a.division || a.district];
        }));
    });
  }

  ERec.pages.rollcreate = { render: render };
  ERec.pages.rollCreate = ERec.pages.rollcreate;
  ERec.pages.rollnumber = ERec.pages.rollcreate;
})(window);
