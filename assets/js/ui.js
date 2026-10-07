/* Shared renderers and overlays. Pages build HTML strings and hand them here
   so the chrome (step header, cards, drawer, modals, toasts, action bar)
   stays consistent, polished, and matches the Pubali Bank PLC design language. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var fmt = ERec.fmt;

  /* ---------- toasts ---------- */

  var TONE_ICON = {
    success: 'bi-check-circle-fill',
    danger: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };

  function toast(message, tone) {
    tone = tone || 'success';
    var host = document.getElementById('toast-host');
    var el = document.createElement('div');
    el.className = 'toast align-items-center text-bg-' + (tone === 'success' ? 'success' : tone) + ' border-0 show mb-2 shadow';
    el.setAttribute('role', 'alert');
    el.innerHTML =
      '<div class="d-flex">' +
      '<div class="toast-body"><i class="bi ' + (TONE_ICON[tone] || TONE_ICON.info) + ' me-2"></i>' + fmt.esc(message) + '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto"></button>' +
      '</div>';
    host.appendChild(el);
    el.querySelector('.btn-close').addEventListener('click', function () { el.remove(); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 3800);
  }

  /* ---------- modal ---------- */

  var lastModal = { key: '', at: 0 };

  function modal(opts) {
    var host = document.getElementById('modal-host');

    /* Belt and braces against the same dialog opening twice from one click.
       Intentional stacking (a confirm on top of a form) still works because
       the guard only catches an identical title within the same moment. */
    var key = String(opts.title || '');
    var now = Date.now();
    if (key && key === lastModal.key && now - lastModal.at < 500) {
      return { el: null, close: function () {}, find: function () { return null; } };
    }
    lastModal = { key: key, at: now };

    var wrap = document.createElement('div');
    wrap.className = 'modal fade';
    wrap.tabIndex = -1;
    wrap.innerHTML =
      '<div class="modal-dialog ' + (opts.size ? 'modal-' + opts.size : '') + ' modal-dialog-centered modal-dialog-scrollable">' +
      '<div class="modal-content border-0 shadow-lg">' +
      '<div class="modal-header py-3 px-4 border-bottom bg-light">' +
      '<h5 class="modal-title fs-6 fw-bold text-dark mb-0">' + (opts.title || '') + '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
      '</div>' +
      '<div class="modal-body p-4">' + (opts.body || '') + '</div>' +
      (opts.footer === null ? '' : '<div class="modal-footer py-3 px-4 bg-light border-top">' + (opts.footer || '') + '</div>') +
      '</div>' +
      '</div>';
    host.appendChild(wrap);
    var inst = new global.bootstrap.Modal(wrap, { backdrop: opts.static ? 'static' : true });
    wrap.addEventListener('hidden.bs.modal', function () {
      wrap.remove();
      /* Bootstrap strips modal-open from <body> whenever any dialog closes.
         When one modal was opened on top of another (correcting a field from
         inside the scrutiny sheet), put it back so the dialog underneath can
         still scroll. */
      if (document.querySelector('.modal.show')) document.body.classList.add('modal-open');
    });
    inst.show();
    var api = {
      el: wrap,
      close: function () { inst.hide(); },
      find: function (sel) { return wrap.querySelector(sel); },
      findAll: function (sel) { return wrap.querySelectorAll(sel); }
    };
    if (opts.onShow) opts.onShow(api);
    return api;
  }

  function confirm(opts) {
    if (!global.bootstrap || !global.bootstrap.Modal) {
      var plain = global.confirm((opts.title ? opts.title + '\n\n' : '') + (opts.body || '').replace(/<[^>]+>/g, ''));
      return Promise.resolve(plain);
    }
    return new Promise(function (resolve) {
      var settled = false;
      modal({
        title: opts.title || 'Please confirm',
        body: '<div class="fs-13 text-secondary lh-base">' + (opts.body || '') + '</div>',
        footer:
          '<button class="btn btn-sm btn-outline-secondary px-3" data-act="no">' + (opts.cancelText || 'Cancel') + '</button>' +
          '<button class="btn btn-sm ' + (opts.danger ? 'btn-danger' : 'btn-green-solid') + ' px-4" data-act="yes">' +
          (opts.okText || 'Confirm') + '</button>',
        onShow: function (api) {
          if (!api || !api.el) { resolve(false); return; }
          var yes = api.el.querySelector('[data-act="yes"]');
          var no = api.el.querySelector('[data-act="no"]');
          if (yes) {
            yes.addEventListener('click', function () {
              settled = true; resolve(true); api.close();
            });
          }
          if (no) {
            no.addEventListener('click', function () { api.close(); });
          }
          api.el.addEventListener('hidden.bs.modal', function () { if (!settled) resolve(false); });
        }
      });
    });
  }

  /* ---------- drawer ---------- */

  function drawer(opts) {
    closeDrawer();
    var host = document.getElementById('drawer-host');
    host.innerHTML =
      '<div class="drawer-backdrop" data-close></div>' +
      '<aside class="drawer">' +
      '<div class="drawer-head border-bottom">' +
      '<h3 class="flex-grow-1 fw-bold text-dark mb-0">' + (opts.title || '') + '</h3>' +
      '<button class="btn btn-sm btn-light rounded-circle" data-close><i class="bi bi-x-lg"></i></button>' +
      '</div>' +
      '<div class="drawer-body">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="drawer-foot border-top bg-light">' + opts.footer + '</div>' : '') +
      '</aside>';
    host.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', closeDrawer);
    });
    /* Hand back the panel, not the persistent host: delegated listeners must
       die with the drawer rather than accumulating on #drawer-host. */
    var panel = host.querySelector('.drawer');
    if (opts.onShow) opts.onShow(panel);
    return panel;
  }

  function closeDrawer() {
    var host = document.getElementById('drawer-host');
    if (host) host.innerHTML = '';
  }

  /* ---------- small html builders ---------- */

  function pill(text, tone, icon) {
    return '<span class="pill ' + (tone || 'grey') + '">' +
      (icon ? '<i class="bi ' + icon + '"></i>' : '') + fmt.esc(text) + '</span>';
  }

  var STATUS_TONE = {
    APPLIED: ['blue', 'Applied'], ACTIVE: ['blue', 'Active'], CLOSED: ['grey', 'Closed'],
    PENDING: ['amber', 'Pending'], APPROVED: ['green', 'Approved'], REJECTED: ['red', 'Rejected'],
    DRAFT: ['grey', 'Not sent'],
    PASSED: ['green', 'Passed'], FAILED: ['red', 'Failed'],
    PRESENT: ['green', 'Present'], ABSENT: ['red', 'Absent'],
    ACCEPTED: ['green', 'Accepted'], CONDITIONAL: ['amber', 'Conditional'],
    NOT_STARTED: ['grey', 'Not started'], IN_PROGRESS: ['blue', 'In progress'], COMPLETED: ['green', 'Completed'],
    SELECTED: ['green', 'Selected'], JOINED: ['purple', 'Joined'], OFFERED: ['blue', 'Offer issued']
  };

  function statusPill(status, fallbackTone) {
    var m = STATUS_TONE[status];
    if (!m) return pill(status || '—', fallbackTone || 'grey');
    return pill(m[1], m[0]);
  }

  function avatar(name, cls) {
    return '<span class="avatar ' + (cls || '') + '">' + fmt.esc(fmt.initials(name)) + '</span>';
  }

  function empty(text, sub, icon) {
    return '<div class="empty py-5"><i class="bi ' + (icon || 'bi-inbox') + ' text-success opacity-50 mb-3" style="font-size:2.5rem"></i>' +
      '<div class="fw-bold text-dark fs-6">' + fmt.esc(text) + '</div>' +
      (sub ? '<div class="fs-12 text-muted mt-1">' + fmt.esc(sub) + '</div>' : '') + '</div>';
  }

  function alert(tone, html, icon) {
    var ic = { info: 'bi-info-circle', warn: 'bi-exclamation-triangle', ok: 'bi-check-circle', err: 'bi-x-octagon' };
    return '<div class="alert-x ' + tone + '"><i class="bi ' + (icon || ic[tone]) + ' me-1"></i><div>' + html + '</div></div>';
  }

  function card(opts) {
    return '<div class="card' + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      (opts.title ?
        '<div class="card-header"><div><h2>' + opts.title + '</h2>' +
        (opts.hint ? '<p class="hint">' + opts.hint + '</p>' : '') + '</div>' +
        '<div class="spacer"></div>' + (opts.actions || '') + '</div>' : '') +
      '<div class="card-body' + (opts.tight ? ' tight' : '') + '">' + (opts.body || '') + '</div>' +
      (opts.foot ? '<div class="card-footer">' + opts.foot + '</div>' : '') +
      '</div>';
  }

  function pageHead(opts) {
    return '<div class="page-head"><div>' +
      '<h1>' + opts.title + '</h1>' +
      (opts.sub ? '<p class="sub">' + opts.sub + '</p>' : '') +
      '</div><div class="spacer"></div>' + (opts.actions || '') + '</div>';
  }

  function progressBar(pct) {
    return '<div class="progress-thin"><span style="width:' + Math.max(0, Math.min(100, pct)) + '%"></span></div>';
  }

  /* ---------- stage step header ----------
     Pubali Bank PLC Multi-Stage Pipeline Progress Tracker */

  /* ---------- stage step header ----------
     Pubali Bank PLC Multi-Stage Pipeline Progress Tracker */

  function stepHeader(stg, activeKey) {
    var steps = ERec.pipeline.steps(stg);
    var p = ERec.pipeline.progress(stg);
    var cur = steps.find(function (s) { return s.key === activeKey; }) || steps[0];
    var c = ERec.store.circular(stg.circularId);

    var stages = ERec.store.stagesOf(c.id);
    var activeStageIndex = stages.findIndex(function (s) { return s.id === stg.id; });

    // 1. Stage navigation tabs bar
    var stageTabsHtml = '<div class="stage-nav-bar"><div class="stage-nav-tabs">' +
      stages.map(function (s, idx) {
        var isActive = s.id === stg.id;
        var stgProg = ERec.pipeline.progress(s);
        var isDone = (stgProg.total > 0 && stgProg.done >= stgProg.total);
        var isPrior = idx < activeStageIndex;
        var hasProg = stgProg.done > 0;
        var statusCls = '';
        if (isActive) {
          statusCls = 'is-active';
        } else if (isDone || isPrior || hasProg) {
          statusCls = 'is-completed';
        }
        var iconHtml = isActive
          ? '<i class="bi bi-check-circle-fill text-white"></i>'
          : (statusCls === 'is-completed'
            ? '<i class="bi bi-check-circle-fill" style="color:#059669;"></i>'
            : '<i class="bi bi-check-circle text-muted"></i>');

        return '<button class="stage-nav-tab ' + statusCls + '" data-stage-tab="' + s.id + '">' +
          iconHtml + ' ' + fmt.esc(ERec.pipeline.typeLabel(s.type)) +
        '</button>';
      }).join('') +
    '</div></div>';

    // 2. Connected stepper attached
    var chips = steps.map(function (s, i) {
      var cls = 'step';
      if (s.key === activeKey) cls += ' is-current';
      else if (s.skipped) cls += ' is-skipped';
      else if (s.done) cls += ' is-done';
      else if (!s.enabled) cls += ' is-locked';
      if (s.pending) cls += ' has-pending';

      var dot = '';
      if (s.key === activeKey) {
        dot = s.done && !s.skipped ? '<i class="bi bi-check-lg"></i>' : String(s.number);
      } else if (s.done && !s.skipped) {
        dot = '<i class="bi bi-check-lg"></i>';
      } else if (s.skipped) {
        dot = '<i class="bi bi-dash-lg"></i>';
      } else if (!s.enabled) {
        dot = '<i class="bi bi-lock-fill"></i>';
      } else {
        dot = String(s.number);
      }

      var sub = '';
      if (s.key === 'search') {
        var rLen = ERec.store.rosterOf(stg.id).length;
        sub = rLen ? rLen + ' candidates' : (s.hint || 'Candidates');
      } else if (s.key === 'approval-applicant') {
        sub = s.done ? 'Approved' : (s.optional ? 'Optional' : (!s.enabled ? 'Locked' : 'Pending'));
      } else if (s.key === 'roll') {
        sub = s.done ? 'Assigned' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'venue') {
        var vLen = ERec.store.venuesOf(stg.id).length;
        sub = vLen ? vLen + ' venues' : (s.done ? 'Configured' : (!s.enabled ? 'Locked' : 'Pending'));
      } else if (s.key === 'approval-venue') {
        sub = s.done ? 'Approved' : (s.optional ? 'Optional' : (!s.enabled ? 'Locked' : 'Pending'));
      } else if (s.key === 'instructions') {
        sub = s.done ? 'Configured' : (s.optional ? 'Optional' : (!s.enabled ? 'Locked' : ''));
      } else if (s.key === 'initiate') {
        sub = s.done ? 'Sent' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'scrutiny') {
        sub = s.done ? 'Scrutinised' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'marks') {
        sub = s.done ? 'Entered' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'forward') {
        sub = s.done ? 'Forwarded' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'result') {
        sub = s.done ? 'Published' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'offer') {
        sub = s.done ? 'Issued' : (!s.enabled ? 'Locked' : 'Pending');
      } else if (s.key === 'joining') {
        sub = s.done ? 'Recorded' : (!s.enabled ? 'Locked' : 'Pending');
      } else {
        sub = s.pending ? s.pending + ' waiting' : (s.hint || (s.optional ? 'Optional' : (!s.enabled ? 'Locked' : '')));
      }

      return (i > 0 ? '<div class="step-line"></div>' : '') +
        '<div class="' + cls + '">' +
        '<button class="step-btn" data-step="' + s.key + '" data-step-key="' + s.key + '"' +
        (s.enabled ? '' : ' disabled title="' + fmt.esc(s.blockedReason) + '"') + '>' +
        '<span class="step-dot">' + dot +
        (s.pending ? '<span class="step-badge">' + s.pending + '</span>' : '') + '</span>' +
        '<span class="step-label"><span class="t">' + fmt.esc(s.label) + '</span>' +
        (sub ? '<span class="s">' + fmt.esc(sub) + '</span>' : '') + '</span>' +
        '</button></div>';
    }).join('');

    return '<div class="stage-head">' +
      stageTabsHtml +
      '<div class="stepper-wrap stage-stepper-attached"><div class="stepper stage-stepper-row">' + chips + '</div></div>' +
      '<div class="d-flex align-items-center gap-2 mb-1 flex-wrap mt-3">' +
        '<h4 class="fw-bold mb-0 text-dark" style="font-size:1.35rem;">' + fmt.esc(cur.label) + ' of ' + fmt.esc(ERec.pipeline.stageName(stg)) + '</h4>' +
        (cur.done && !cur.skipped ? '<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; border-radius:9999px; font-weight:600; font-size:12px; padding:3px 10px;"><i class="bi bi-check2 me-1"></i> Completed</span>' : '') +
        (cur.skipped ? ' <span class="pill outline">Skipped</span>' : '') +
        (cur.optional && !cur.done ? ' <span class="pill outline">Optional</span>' : '') +
        (cur.pending ? ' <span class="pill amber"><i class="bi bi-people"></i> ' + cur.pending + ' candidates waiting</span>' : '') +
      '</div>' +
      '<p class="text-secondary fs-13 mb-3">' + fmt.esc(cur.help || '') + '</p>' +
      '</div>';
  }

  function bindPipelineEvents(view, stg, currentStepKey) {
    if (!view || !stg) return;
    view.querySelectorAll('[data-stage-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sid = btn.dataset.stageTab;
        var targetStage = ERec.store.stage(sid);
        if (!targetStage) return;
        var targetSteps = ERec.pipeline.steps(targetStage);
        var hasStep = currentStepKey && targetSteps.some(function (x) { return x.key === currentStepKey; });
        if (hasStep) {
          ERec.router.go('#/circular/' + stg.circularId + '/stage/' + sid + '/' + currentStepKey);
        } else {
          var curSt = ERec.pipeline.currentStep(targetStage);
          ERec.router.go('#/circular/' + stg.circularId + '/stage/' + sid + '/' + (curSt ? curSt.key : 'search'));
        }
      });
    });

    view.querySelectorAll('[data-step], [data-step-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sk = btn.dataset.step || btn.dataset.stepKey;
        if (!sk) return;
        ERec.router.go('#/circular/' + stg.circularId + '/stage/' + stg.id + '/' + sk);
      });
    });

    view.querySelectorAll('[data-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ERec.router.go('#/circular/' + stg.circularId + '/stage/' + stg.id + '/' + btn.dataset.nav);
      });
    });
  }

  /* ---------- one obvious button, always in the same place ---------- */

  function actionBar(stg, key, opts) {
    opts = opts || {};
    var steps = ERec.pipeline.steps(stg);
    var i = steps.findIndex(function (s) { return s.key === key; });
    var prev = i > 0 ? steps[i - 1] : null;
    var next = i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;

    var html = '<div class="action-bar"><div class="ab-inner">';
    if (prev) {
      html += '<button class="btn btn-outline-secondary btn-back btn-sm d-inline-flex align-items-center gap-1" data-nav="' + prev.key + '">' +
        '<i class="bi bi-chevron-left"></i> <span class="d-none d-sm-inline">' + fmt.esc(prev.label) + '</span></button>';
    }
    html += '<div class="spacer"></div>';
    if (opts.note) html += '<span class="ab-note text-secondary fw-medium"><i class="bi bi-info-circle text-success me-1"></i>' + opts.note + '</span>';

    (opts.secondary || []).forEach(function (b) {
      html += '<button class="btn btn-sm btn-' + (b.tone || 'outline-secondary') + '" id="' + b.id + '"' +
        (b.disabled ? ' disabled' : '') + '>' +
        (b.icon ? '<i class="bi ' + b.icon + ' me-1"></i>' : '') + fmt.esc(b.label) + '</button>';
    });

    if (opts.primary) {
      html += '<button class="btn btn-green-solid btn-go' + (opts.primary.tone === 'success' ? ' btn-go-ok' : '') + '"' +
        (opts.primary.nav ? ' data-nav="' + opts.primary.nav + '"' : ' id="' + opts.primary.id + '"') +
        (opts.primary.disabled ? ' disabled' : '') + '>' +
        (opts.primary.icon ? '<i class="bi ' + opts.primary.icon + ' me-1"></i>' : '') +
        fmt.esc(opts.primary.label) + '</button>';
    } else if (next) {
      html += '<button class="btn btn-green-solid btn-go" data-nav="' + next.key + '"' +
        (next.enabled ? '' : ' disabled title="' + fmt.esc(next.blockedReason) + '"') + '>' +
        'Continue: ' + fmt.esc(next.label) + ' <i class="bi bi-chevron-right ms-1"></i></button>';
    }
    return html + '</div></div>';
  }

  /* ---------- stage page shell ---------- */

  function stagePage(view, stg, stepKey, opts) {
    var c = ERec.store.circular(stg.circularId);
    var step = ERec.pipeline.step(stg, stepKey);
    ERec.router.setCrumbs([
      { label: 'Job Circulars', href: '#/circulars' },
      { label: c.post, href: '#/circular/' + c.id },
      { label: step ? step.label : '' }
    ]);

    view.innerHTML =
      stepHeader(stg, stepKey) +
      (opts.body || '') +
      actionBar(stg, stepKey, opts.action || {});

    bindPipelineEvents(view, stg, stepKey);
    return view;
  }

  /* Guard used by every step screen: a locked step must not be operable. */
  function lockedNotice(stg, stepKey) {
    var step = ERec.pipeline.step(stg, stepKey);
    if (!step || step.enabled) return '';
    return alert('warn', '<strong>Prerequisite required:</strong> ' + fmt.esc(step.blockedReason) + '.');
  }

  /* ---------- DataTables Bootstrap 5 Integration ---------- */

  function dataTable(tableSelectorOrEl, options) {
    var el = typeof tableSelectorOrEl === 'string' ? document.querySelector(tableSelectorOrEl) : tableSelectorOrEl;
    if (!el) return null;

    // Must have thead and tbody with at least one row
    if (!el.querySelector('thead') || !el.querySelector('tbody')) return null;

    // Check if jQuery / DataTable is available
    var hasDt = !!(global.DataTable || (global.jQuery && global.jQuery.fn && global.jQuery.fn.dataTable));
    if (!hasDt) return null;

    // Destroy existing instance if any
    try {
      if (global.DataTable && global.DataTable.isDataTable && global.DataTable.isDataTable(el)) {
        var existing = new global.DataTable(el);
        existing.destroy();
      } else if (global.jQuery && global.jQuery.fn.DataTable && global.jQuery.fn.DataTable.isDataTable(el)) {
        global.jQuery(el).DataTable().destroy();
      }
    } catch (e) {
      console.warn('DataTable destroy error:', e);
    }

    // Ensure Bootstrap 5 table classes
    el.classList.add('table', 'table-striped', 'table-hover', 'align-middle');

    var defaults = {
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      language: {
        search: '_INPUT_',
        searchPlaceholder: 'Search records...',
        lengthMenu: 'Show _MENU_ entries',
        info: 'Showing _START_ to _END_ of _TOTAL_ entries',
        infoEmpty: 'Showing 0 to 0 of 0 entries',
        infoFiltered: '(filtered from _MAX_ total)',
        paginate: {
          first: '<i class="bi bi-chevron-double-left"></i>',
          previous: '<i class="bi bi-chevron-left"></i>',
          next: '<i class="bi bi-chevron-right"></i>',
          last: '<i class="bi bi-chevron-double-right"></i>'
        }
      },
      autoWidth: false
    };

    var opts = Object.assign({}, defaults, options || {});

    // Detect non-orderable columns
    var ths = el.querySelectorAll('thead th');
    var nonSortTargets = [];
    ths.forEach(function (th, idx) {
      var txt = th.textContent.trim().toUpperCase();
      if (th.getAttribute('data-orderable') === 'false' ||
          th.querySelector('input[type="checkbox"]') ||
          txt === 'ACTION' || txt === 'ACTIONS' || txt === '') {
        nonSortTargets.push(idx);
      }
    });

    if (nonSortTargets.length) {
      opts.columnDefs = opts.columnDefs || [];
      opts.columnDefs.push({ orderable: false, targets: nonSortTargets });
    }

    try {
      if (global.DataTable) {
        return new global.DataTable(el, opts);
      } else if (global.jQuery) {
        return global.jQuery(el).DataTable(opts);
      }
    } catch (err) {
      console.warn('DataTable init error:', err);
      return null;
    }
  }

  function initDataTables(root) {
    if (!root) return;
    var tables = root.querySelectorAll('table[data-datatable="true"], table.table-datatable');
    tables.forEach(function (tbl) {
      dataTable(tbl);
    });
  }

  /* ---------- event delegation ---------- */

  function on(root, selector, evt, handler) {
    root.addEventListener(evt, function (e) {
      var t = e.target.closest(selector);
      if (t && root.contains(t)) handler(e, t);
    });
  }

  /* ---------- modern chevron posting wizard ---------- */

  function postingWizard(currentStep, cid) {
    if (!cid) cid = 'draft';
    var steps = [
      { num: 1, key: 'basic', label: 'Basic Information' },
      { num: 2, key: 'eligibility', label: 'Eligibility Rules' },
      { num: 3, key: 'preview', label: 'Job Preview' },
      { num: 4, key: 'approval', label: 'Approval Channel' }
    ];

    var itemsHtml = steps.map(function (s, idx) {
      var isFirst = idx === 0;
      var isLast = idx === steps.length - 1;
      var statusClass = s.num < currentStep ? 'is-completed' : (s.num === currentStep ? 'is-active' : 'is-inactive');
      var firstClass = isFirst ? ' is-first' : '';
      var lastClass = isLast ? ' is-last' : '';
      var clickAttr = '';
      if (s.num < currentStep) {
        if (s.num === 1) clickAttr = ' data-wizard-go="#/circulars/new" role="button" title="Return to Basic Information"';
        else if (s.num === 2 && cid) clickAttr = ' data-wizard-go="#/circulars/new-eligibility/' + cid + '" role="button" title="Go to Eligibility Rules"';
        else if (s.num === 3 && cid) clickAttr = ' data-wizard-go="#/circulars/new-preview/' + cid + '" role="button" title="Go to Job Preview"';
        else if (s.num === 4 && cid) clickAttr = ' data-wizard-go="#/circulars/new-approval/' + cid + '" role="button" title="Go to Approval Channel"';
      }

      return '<div class="wizard-step ' + statusClass + firstClass + lastClass + '"' + clickAttr + '>' +
        '<div class="step-inner">' +
          '<span class="step-title">' + fmt.esc(s.label) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<!-- Stepper / Wizard -->' +
      '<div class="posting-wizard-card mb-4">' +
        '<div class="wizard-steps-container">' +
          itemsHtml +
        '</div>' +
      '</div>';
  }

  function bindPostingWizard(container) {
    if (!container) return;
    container.querySelectorAll('[data-wizard-go]').forEach(function (el) {
      el.addEventListener('click', function () {
        ERec.router.go(el.dataset.wizardGo);
      });
    });
  }

  ERec.ui = {
    toast: toast, modal: modal, confirm: confirm,
    stagePage: stagePage, lockedNotice: lockedNotice,
    stepHeader: stepHeader, actionBar: actionBar, bindPipelineEvents: bindPipelineEvents,
    postingWizard: postingWizard, bindPostingWizard: bindPostingWizard,
    drawer: drawer, closeDrawer: closeDrawer,
    pill: pill, statusPill: statusPill, avatar: avatar, empty: empty, alert: alert,
    card: card, pageHead: pageHead, progressBar: progressBar,
    dataTable: dataTable, initDataTables: initDataTables,
    on: on
  };
})(window);
