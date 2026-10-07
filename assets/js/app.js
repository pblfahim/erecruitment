/* Boot: sidebar, topbar role switcher, reset, router start.
   Pubali Bank PLC &middot; HRD Admin Portal Theme Integration */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  function isNewCircularRoute(name) {
    return name === 'newcircular-basicinfo' ||
      name === 'newcircular-eligibility' ||
      name === 'newcircular-approval' ||
      name === 'newcircular';
  }

  function addCreateCircularSubmenu() {
    renderNav();
  }

  function navItems() {
    var me = store.actingUser();
    var pending = store.pendingApprovalsFor(me.id).length;
    var items = [
      { name: 'dashboard', href: '#/', icon: 'bi-columns-gap', label: 'Dashboard' },
      { name: 'circulars', href: '#/circulars', icon: 'bi-briefcase', label: 'Job Circulars' },
      { name: 'approvals', href: '#/approvals', icon: 'bi-check2-circle', label: 'Pending Approval', badge: pending || 0 },
      { name: 'outbox', href: '#/outbox', icon: 'bi-envelope', label: 'Mail / SMS Outbox' }
    ];
    return items;
  }

  function renderProfileCard() {
    var me = store.actingUser();
    var nameEl = document.getElementById('sidebar-user-name');
    var roleEl = document.getElementById('sidebar-user-role');
    var avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl) nameEl.textContent = me.name;
    if (roleEl) {
      roleEl.textContent = me.role === 'HR_ADMIN'
        ? 'HR Admin \u00B7 Senior Officer'
        : 'Approver \u00B7 ' + (me.short || me.designation.split(',')[0]);
    }
    if (avatarEl) {
      avatarEl.textContent = fmt.initials(me.name);
    }
  }

  function renderNav() {
    var el = document.getElementById('sidebar-nav');
    if (!el) return;
    var cur = (ERec.router && ERec.router.current) ? ERec.router.current() : { name: '' };
    var isNewCirc = isNewCircularRoute(cur.name);

    var html = '<div class="d-flex flex-column">';
    navItems().forEach(function (it) {
      if (it.name === 'circulars') {
        var isCircActive = cur.name === 'circulars' || isNewCirc;
        var showSubmenu = isNewCirc;

        html += '<div class="nav-item-group' + (showSubmenu ? ' has-submenu-open' : '') + '">';
        html += '<a class="nav-link-custom nav-link-x' + (isCircActive ? ' active' : '') + '" href="' + it.href + '" data-nav="' + it.name + '">' +
          '<i class="bi ' + it.icon + '"></i><span>' + it.label + '</span>' +
          '</a>';

        if (showSubmenu) {
          html += '<div class="nav-submenu" id="nav-circulars-submenu">' +
            '<a class="nav-submenu-link active" href="#/circulars/new" data-nav="newcircular" title="Create Circular">' +
            '<i class="bi bi-plus-lg"></i><span>Create Circular</span>' +
            '</a>' +
            '</div>';
        }
        html += '</div>';
      } else {
        var isActive = cur.name === it.name || (it.name === 'approvals' && (cur.name === 'pendingApproval' || cur.name === 'approvals'));
        var badgeHtml = it.badge ? ' <span class="badge bg-danger ms-auto px-2 py-2  ">' + it.badge + '</span>' : '';
        html += '<a class="nav-link-custom nav-link-x d-flex align-items-center' + (isActive ? ' active' : '') + '" href="' + it.href + '" data-nav="' + it.name + '">' +
          '<i class="bi ' + it.icon + '"></i><span class="flex-grow-1">' + it.label + '</span>' + badgeHtml +
          '</a>';
      }
    });
    html += '</div>';

    var activeCircs = store.where('circulars', function (c) { return c.status === 'ACTIVE'; });
    html += '<div class="nav-section mt-2">Active Circulars</div>';
    html += '<div class="d-flex flex-column">';
    if (!activeCircs.length) {
      html += '<div class="px-3 py-2 text-muted fs-12"><i class="bi bi-inbox me-1"></i>No active circulars</div>';
    } else {
      activeCircs.forEach(function (c) {
        var active = cur.params && cur.params.cid === c.id;
        var activeStg = pipe.activeStage(c.id);
        var step = activeStg ? pipe.currentStep(activeStg) : null;
        var href = step ? step.route : ('#/circular/' + c.id);
        html += '<a class="nav-link-custom nav-link-x' + (active ? ' active' : '') + '" href="' + href + '" title="' + fmt.esc(c.title) + '">' +
          '<i class="bi bi-file-earmark-text"></i>' +
          '<span class="text-truncate">' + fmt.esc(c.navTitle || c.post) + '</span>' +
          '</a>';
      });
    }
    html += '</div>';

    el.innerHTML = html;
  }

  function renderTopbar() {
    var el = document.getElementById('topbar-right');
    if (!el) return;
    var me = store.actingUser();
    var users = store.all('users');
    var pendingList = store.pendingApprovalsFor(me.id);
    var pendingCount = pendingList.length;

    // Topbar notification dropdown + user switch chip
    var html = '';

    // Approvals quick button if approver
    if (me.role === 'APPROVER') {
      html += '<a href="#/approvals" class="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 shadow-sm">' +
        '<i class="bi bi-check2-square"></i> <span class="d-none d-sm-inline">Pending Approval</span>' +
        (pendingCount ? ' <span class="badge bg-danger ms-auto px-2 py-2 ">' + pendingCount + '</span>' : '') +
        '</a>';
    }

    // Notification Bell Dropdown
    html +=
      '<div class="dropdown">' +
      '<button class="position-relative nav-icon-btn cursor-pointer" type="button" id="adminNotificationBtn" data-bs-toggle="dropdown" aria-expanded="false" title="Notifications">' +
      '<i class="bi bi-bell fs-6 text-secondary"></i>' +
      (pendingCount > 0
        ? '<span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" id="unreadBadgeDot"></span>'
        : '') +
      '</button>' +
      '<div class="dropdown-menu dropdown-menu-end notification-menu-dropdown p-0 mt-2" aria-labelledby="adminNotificationBtn">' +
      '<div class="p-3 bg-light border-bottom d-flex align-items-center justify-content-between">' +
      '<h6 class="fw-bold mb-0 text-dark" style="font-size:0.9rem;">' +
      '<i class="bi bi-bell-fill text-success me-1"></i> Notifications' +
      (pendingCount ? ' <span class="badge bg-danger ms-auto px-2 py-2  ms-1">' + pendingCount + '</span>' : '') +
      '</h6>' +
      '<button class="btn btn-link btn-sm text-decoration-none p-0 text-success fw-semibold" style="font-size: 0.75rem;" id="btn-mark-notifications-read">' +
      'Dismiss' +
      '</button>' +
      '</div>' +
      '<div class="notification-list" style="max-height: 300px; overflow-y: auto;">';

    if (pendingCount === 0) {
      html +=
        '<div class="p-4 text-center text-muted small">' +
        '<i class="bi bi-check2-circle text-success fs-3 d-block mb-1"></i>' +
        'All clear &middot; No pending tasks' +
        '</div>';
    } else {
      pendingList.forEach(function (ap) {
        var circ = store.find('circulars', ap.circularId);
        html +=
          '<div class="notification-item unread d-flex align-items-start gap-2" onclick="location.hash=\'#/approvals\'">' +
          '<div class="bg-warning-subtle text-warning p-2 rounded-circle flex-shrink-0" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">' +
          '<i class="bi bi-shield-exclamation"></i>' +
          '</div>' +
          '<div>' +
          '<h6 class="fw-semibold mb-0 text-dark" style="font-size:0.82rem;">Approval Required: ' + fmt.esc(ap.kind) + '</h6>' +
          '<p class="text-muted mb-0 small" style="font-size:0.75rem;">' + fmt.esc(circ ? circ.post : 'Circular') + '</p>' +
          '<small class="text-secondary" style="font-size:0.68rem;">Action needed</small>' +
          '</div>' +
          '</div>';
      });
    }

    html +=
      '</div>' +
      '<div class="p-2 text-center bg-light border-top">' +
      '<a href="#/outbox" class="small text-decoration-none text-success fw-semibold">View Sent Outbox &rarr;</a>' +
      '</div>' +
      '</div>' +
      '</div>';

    // Fullscreen Mode Direct Toggle Icon Button
    html +=
      '<button class="nav-icon-btn cursor-pointer" type="button" id="btn-toggle-fullscreen" title="Toggle Fullscreen Mode">' +
      '<i class="bi bi-arrows-fullscreen fs-6 text-secondary" id="fullscreenIcon"></i>' +
      '</button>';

    // Topbar Display & Portal Settings Dropdown Icon
    var isCompact = document.body.classList.contains('table-compact');
    var isCollapsed = document.body.classList.contains('sidebar-collapsed');
    html +=
      '<div class="dropdown">' +
      '<button class="nav-icon-btn cursor-pointer" type="button" id="topbarSettingsBtn" data-bs-toggle="dropdown" aria-expanded="false" title="Display & Workspace Settings">' +
      '<i class="bi bi-gear fs-6 text-secondary"></i>' +
      '</button>' +
      '<ul class="dropdown-menu dropdown-menu-end shadow-sm mt-2" style="min-width: 250px;" aria-labelledby="topbarSettingsBtn">' +
      '<li><h6 class="dropdown-header text-uppercase text-secondary" style="font-size:0.7rem;letter-spacing:0.05em">Display & Workspace</h6></li>' +
      '<li>' +
      '<a class="dropdown-item d-flex align-items-center justify-content-between py-2" href="#" id="menu-toggle-fullscreen">' +
      '<span class="d-flex align-items-center gap-2">' +
      '<i class="bi bi-arrows-fullscreen text-secondary" id="menuFullscreenIcon"></i>' +
      '<span id="menuFullscreenText">Fullscreen Mode</span>' +
      '</span>' +
      '<span class="badge bg-light text-muted border">F11</span>' +
      '</a>' +
      '</li>' +
      '<li>' +
      '<a class="dropdown-item d-flex align-items-center justify-content-between py-2" href="#" id="menu-toggle-density">' +
      '<span class="d-flex align-items-center gap-2">' +
      '<i class="bi bi-view-list text-secondary"></i>' +
      '<span>Compact Table Rows</span>' +
      '</span>' +
      '<div class="form-check form-switch mb-0">' +
      '<input class="form-check-input" type="checkbox" id="switchCompactTables" style="pointer-events:none;"' + (isCompact ? ' checked' : '') + ' />' +
      '</div>' +
      '</a>' +
      '</li>' +
      '<li>' +
      '<a class="dropdown-item d-flex align-items-center justify-content-between py-2" href="#" id="menu-toggle-sidebar">' +
      '<span class="d-flex align-items-center gap-2">' +
      '<i class="bi bi-layout-sidebar-inset text-secondary"></i>' +
      '<span>Collapse Sidebar</span>' +
      '</span>' +
      '<div class="form-check form-switch mb-0">' +
      '<input class="form-check-input" type="checkbox" id="switchCollapseSidebar" style="pointer-events:none;"' + (isCollapsed ? ' checked' : '') + ' />' +
      '</div>' +
      '</a>' +
      '</li>' +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><h6 class="dropdown-header text-uppercase text-secondary" style="font-size:0.7rem;letter-spacing:0.05em">Portal Navigation</h6></li>' +
      '<li>' +
      '<a class="dropdown-item d-flex align-items-center gap-2 py-2" href="applicant/index.html">' +
      '<i class="bi bi-box-arrow-up-right text-success"></i>' +
      '<span>Switch to Applicant Portal</span>' +
      '</a>' +
      '</li>' +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><h6 class="dropdown-header text-uppercase text-secondary" style="font-size:0.7rem;letter-spacing:0.05em">System Operations</h6></li>' +
      '<li>' +
      '<a class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger" href="#" id="menu-reset-portal">' +
      '<i class="bi bi-arrow-counterclockwise"></i>' +
      '<span>Reset Demo Data</span>' +
      '</a>' +
      '</li>' +
      '</ul>' +
      '</div>';

    // Divider
    html += '<div class="vr my-2 text-secondary opacity-25 d-none d-sm-block" style="height: 24px"></div>';

    // Role-Switcher / Acting Chip Dropdown
    html +=
      '<div class="dropdown">' +
      '<div class="acting-chip" data-bs-toggle="dropdown" role="button">' +
      ui.avatar(me.name, me.role === 'HR_ADMIN' ? 'primary' : '') +
      '<span class="d-none d-md-flex flex-column lh-sm text-start">' +
      '<span class="fw-semibold text-dark" style="font-size:12.5px">' + fmt.esc(me.name) + '</span>' +
      '<span class="text-success fw-semibold" style="font-size:10.5px">' + fmt.esc(me.role === 'HR_ADMIN' ? 'HR Administrator' : 'Approver') + '</span>' +
      '</span>' +
      '<i class="bi bi-chevron-down text-secondary ms-1" style="font-size:11px"></i>' +
      '</div>' +
      '<ul class="dropdown-menu dropdown-menu-end shadow-sm" style="min-width:280px">' +
      '<li><h6 class="dropdown-header text-uppercase text-secondary" style="font-size:0.7rem;letter-spacing:0.05em">Switch Acting Personnel</h6></li>' +
      users.map(function (u) {
        var np = store.pendingApprovalsFor(u.id).length;
        var isCur = u.id === me.id;
        return '<li><a class="dropdown-item d-flex align-items-center gap-2 py-2 ' + (isCur ? 'active bg-success text-white' : '') + '" href="#" data-user="' + u.id + '">' +
          ui.avatar(u.name, 'sm ' + (isCur ? 'bg-white text-success' : '')) +
          '<span class="flex-grow-1"><span class="d-block fw-semibold" style="font-size:12.5px">' + fmt.esc(u.name) + '</span>' +
          '<span class="d-block ' + (isCur ? 'text-white-50' : 'text-muted') + '" style="font-size:11px">' + fmt.esc(u.designation) + '</span></span>' +
          (np ? '<span class="badge rounded-pill ' + (isCur ? 'bg-white text-danger' : 'bg-danger text-white') + '">' + np + '</span>' : '') +
          '</a></li>';
      }).join('') +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><span class="dropdown-item-text fs-12 text-muted">Switch role to approve requests that were routed for sign-off.</span></li>' +
      '</ul>' +
      '</div>';

    el.innerHTML = html;

    // Attach role switch listeners
    el.querySelectorAll('[data-user]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        store.setActingUser(a.dataset.user);
        var u = store.find('users', a.dataset.user);
        ui.toast('Acting as ' + u.name + ' (' + u.designation + ')', 'info');
        renderAll();
      });
    });

    var dismissBtn = el.querySelector('#btn-mark-notifications-read');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var dot = document.getElementById('unreadBadgeDot');
        if (dot) dot.remove();
        ui.toast('Notifications dismissed');
      });
    }

    // Fullscreen direct button listener
    var fsBtn = el.querySelector('#btn-toggle-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleFullscreen();
      });
    }

    // Fullscreen menu item listener
    var menuFs = el.querySelector('#menu-toggle-fullscreen');
    if (menuFs) {
      menuFs.addEventListener('click', function (e) {
        e.preventDefault();
        toggleFullscreen();
      });
    }

    // Compact tables menu item listener
    var menuDensity = el.querySelector('#menu-toggle-density');
    if (menuDensity) {
      menuDensity.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.toggle('table-compact');
        var compact = document.body.classList.contains('table-compact');
        try { localStorage.setItem('erec_density', compact ? 'compact' : 'normal'); } catch (err) { }
        var sw = document.getElementById('switchCompactTables');
        if (sw) sw.checked = compact;
        ui.toast(compact ? 'Compact table row density enabled' : 'Default table row density enabled', 'info');
      });
    }

    // Collapse sidebar menu item listener
    var menuSidebar = el.querySelector('#menu-toggle-sidebar');
    if (menuSidebar) {
      menuSidebar.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.toggle('sidebar-collapsed');
        var collapsed = document.body.classList.contains('sidebar-collapsed');
        try { localStorage.setItem('erec_sidebar_collapsed', collapsed ? '1' : '0'); } catch (err) { }
        var sw = document.getElementById('switchCollapseSidebar');
        if (sw) sw.checked = collapsed;
        ui.toast(collapsed ? 'Sidebar collapsed' : 'Sidebar expanded', 'info');
      });
    }

    // Portal reset menu item listener
    var menuReset = el.querySelector('#menu-reset-portal');
    if (menuReset) {
      menuReset.addEventListener('click', function (e) {
        e.preventDefault();
        resetDemoData();
      });
    }

    updateFullscreenUi();
  }

  function isFullscreenActive() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      document.body.classList.contains('portal-fullscreen-fallback')
    );
  }

  function updateFullscreenUi(active) {
    if (active === undefined) active = isFullscreenActive();
    var icon = document.getElementById('fullscreenIcon');
    var menuIcon = document.getElementById('menuFullscreenIcon');
    var menuText = document.getElementById('menuFullscreenText');
    var btn = document.getElementById('btn-toggle-fullscreen');

    if (active) {
      if (icon) icon.className = 'bi bi-fullscreen-exit fs-5 text-success';
      if (menuIcon) menuIcon.className = 'bi bi-fullscreen-exit text-success';
      if (menuText) menuText.textContent = 'Exit Fullscreen';
      if (btn) btn.title = 'Exit Fullscreen (Esc)';
    } else {
      if (icon) icon.className = 'bi bi-arrows-fullscreen fs-6 text-secondary';
      if (menuIcon) menuIcon.className = 'bi bi-arrows-fullscreen text-secondary';
      if (menuText) menuText.textContent = 'Fullscreen Mode';
      if (btn) btn.title = 'Enter Fullscreen (F11)';
    }
  }

  function toggleFullscreen() {
    var doc = document;
    var docEl = doc.documentElement;
    var request =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;
    var exit =
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen;

    if (!isFullscreenActive()) {
      if (request) {
        try {
          var p = request.call(docEl);
          if (p && p.then) {
            p.then(function () {
              updateFullscreenUi(true);
            }).catch(function () {
              doc.body.classList.add('portal-fullscreen-fallback');
              updateFullscreenUi(true);
            });
          } else {
            updateFullscreenUi(true);
          }
        } catch (e) {
          doc.body.classList.add('portal-fullscreen-fallback');
          updateFullscreenUi(true);
        }
      } else {
        doc.body.classList.add('portal-fullscreen-fallback');
        updateFullscreenUi(true);
      }
    } else {
      if (doc.body.classList.contains('portal-fullscreen-fallback')) {
        doc.body.classList.remove('portal-fullscreen-fallback');
        updateFullscreenUi(false);
      } else if (exit) {
        try {
          var ep = exit.call(doc);
          if (ep && ep.then) {
            ep.then(function () {
              updateFullscreenUi(false);
            }).catch(function () {
              updateFullscreenUi(false);
            });
          } else {
            updateFullscreenUi(false);
          }
        } catch (e) {
          updateFullscreenUi(false);
        }
      } else {
        updateFullscreenUi(false);
      }
    }
  }

  function resetDemoData() {
    ui.confirm({
      title: 'Reset Demo Data',
      body: 'Are you sure you want to reset demo data? This will restore the 3 official job circulars (<strong>Recruitment for Head of Law Division</strong>, <strong>Senior Principal Officer (Computer)</strong>, and <strong>Graphic Designer specializing in Digital & Motion Content</strong>) with their candidate rosters, and reset all recruitment stages to their default state.',
      okText: 'Reset Demo Data',
      cancelText: 'Cancel',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      store.reset();
      ui.toast('Demo data reset successfully to default state', 'success');
      ERec.router.go('#/');
      renderAll();
    });
  }

  function renderAll() {
    renderProfileCard();
    renderNav();
    renderTopbar();
    ERec.router.refresh();
  }

  function syncNav() {
    renderProfileCard();
    renderNav();
    renderTopbar();
  }

  function storageNote() {
    var el = document.getElementById('storage-note');
    if (!el) return;
    el.innerHTML = store.storageAvailable()
      ? '<span class="text-success"><i class="bi bi-hdd me-1"></i> Data synced in local session</span>'
      : '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i> Session storage in-memory only</span>';
  }

  function boot() {
    store.load();

    try {
      if (localStorage.getItem('erec_density') === 'compact') {
        document.body.classList.add('table-compact');
      }
    } catch (e) { }

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (evt) {
      document.addEventListener(evt, function () {
        updateFullscreenUi(isFullscreenActive());
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('portal-fullscreen-fallback')) {
        document.body.classList.remove('portal-fullscreen-fallback');
        updateFullscreenUi(false);
      }
    });

    var resetBtn = document.getElementById('btn-reset-demo');
    if (resetBtn) {
      resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        resetDemoData();
      });
    }

    try {
      if (localStorage.getItem('erec_sidebar_collapsed') === '1') {
        document.body.classList.add('sidebar-collapsed');
      }
    } catch (err) { }

    var toggleBtn = document.getElementById('btn-sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        document.body.classList.toggle('sidebar-open');
      });
    }

    var desktopToggleBtn = document.getElementById('btn-sidebar-desktop-toggle');
    if (desktopToggleBtn) {
      desktopToggleBtn.addEventListener('click', function (e) {
        e.preventDefault();
        document.body.classList.toggle('sidebar-collapsed');
        var collapsed = document.body.classList.contains('sidebar-collapsed');
        try { localStorage.setItem('erec_sidebar_collapsed', collapsed ? '1' : '0'); } catch (err) { }
        var sw = document.getElementById('switchCollapseSidebar');
        if (sw) sw.checked = collapsed;
        ui.toast(collapsed ? 'Sidebar collapsed' : 'Sidebar expanded', 'info');
      });
    }

    var backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        document.body.classList.remove('sidebar-open');
      });
    }

    global.addEventListener('hashchange', function () {
      document.body.classList.remove('sidebar-open');
    });

    ERec.router.start();
    renderProfileCard();
    renderNav();
    renderTopbar();
    //storageNote();
  }

  ERec.app = {
    syncNav: syncNav,
    renderAll: renderAll,
    renderNav: renderNav,
    renderTopbar: renderTopbar,
    renderProfileCard: renderProfileCard,
    addCreateCircularSubmenu: addCreateCircularSubmenu,
    toggleFullscreen: toggleFullscreen,
    isFullscreenActive: isFullscreenActive,
    resetDemoData: resetDemoData,
    openDbOperationsModal: resetDemoData
  };
  ERec.resetDemoData = resetDemoData;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
