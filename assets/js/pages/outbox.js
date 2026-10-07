/* Mail / SMS outbox + activity log - proof of what the demo actually sent. */
(function (global) {
  'use strict';

  var ERec = global.ERec;
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  var KIND_LABEL = { ADMIT: 'Admit card / exam call', FINAL: 'Final result', OFFER: 'Appointment Letter' };
  var filters = { channel: '', kind: '', circular: '', q: '' };
  var tab = 'outbox';

  function matches(n) {
    if (filters.channel && n.channel !== filters.channel) return false;
    if (filters.kind && n.kind !== filters.kind) return false;
    if (filters.circular && n.circularId !== filters.circular) return false;
    if (filters.q) {
      var q = filters.q.toLowerCase();
      if ([n.applicantName, n.to, n.subject, n.body].join(' ').toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }

  function detail(n) {
    ui.modal({
      title: (n.channel === 'MAIL' ? '<i class="bi bi-envelope"></i> E-mail' : '<i class="bi bi-chat-dots"></i> SMS') +
        ' to ' + fmt.esc(n.applicantName),
      size: 'lg',
      body:
        '<dl class="kv mb-3">' +
        '<dt>To</dt><dd class="mono">' + fmt.esc(n.to) + '</dd>' +
        '<dt>Type</dt><dd>' + fmt.esc(KIND_LABEL[n.kind] || n.kind) + '</dd>' +
        '<dt>Sent</dt><dd>' + fmt.dateTime(n.sentAt) + '</dd>' +
        '</dl>' +
        (n.subject ? '<div class="section-title">Subject</div><div class="fs-13 fw-semibold mb-3">' + fmt.esc(n.subject) + '</div>' : '') +
        '<div class="section-title">Body</div>' +
        '<div class="preview-box">' + fmt.esc(n.body) + '</div>' +
        (n.channel === 'SMS'
          ? '<div class="sms-count mt-2">' + fmt.smsParts(n.body).len + ' characters · ' +
          fmt.plural(fmt.smsParts(n.body).parts, 'SMS part') + '</div>' : ''),
      footer: '<button class="btn btn-sm btn-light" data-bs-dismiss="modal">Close</button>'
    });
  }

  function outboxView() {
    var all = store.all('notifications');
    var list = all.filter(matches).slice(0, 400);
    var circulars = store.all('circulars');

    var bar = '<div class="filter-bar">' +
      '<div class="fg" style="min-width:220px"><label>Search</label>' +
      '<input class="form-control" id="f-q" placeholder="Candidate, address or text" value="' + fmt.esc(filters.q) + '"></div>' +
      '<div class="fg"><label>Channel</label><select class="form-select" id="f-channel">' +
      [['', 'All'], ['MAIL', 'E-mail'], ['SMS', 'SMS']].map(function (o) {
        return '<option value="' + o[0] + '"' + (filters.channel === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="fg"><label>Type</label><select class="form-select" id="f-kind">' +
      [['', 'All']].concat(Object.keys(KIND_LABEL).map(function (k) { return [k, KIND_LABEL[k]]; })).map(function (o) {
        return '<option value="' + o[0] + '"' + (filters.kind === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="fg"><label>Circular</label><select class="form-select" id="f-circular">' +
      '<option value="">All</option>' + circulars.map(function (c) {
        return '<option value="' + c.id + '"' + (filters.circular === c.id ? ' selected' : '') + '>' + fmt.esc(c.post) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-sm btn-light" id="f-clear"><i class="bi bi-x-circle"></i> Clear</button>' +
      '</div>';

    var rows = list.map(function (n) {
      return '<tr class="clickable" data-n="' + n.id + '">' +
        '<td class="nowrap">' + (n.channel === 'MAIL'
          ? ui.pill('E-mail', 'blue', 'bi-envelope') : ui.pill('SMS', 'purple', 'bi-chat-dots')) + '</td>' +
        '<td>' + fmt.esc(n.applicantName) + '</td>' +
        '<td class="mono fs-12">' + fmt.esc(n.to) + '</td>' +
        '<td class="fs-12">' + fmt.esc(KIND_LABEL[n.kind] || n.kind) + '</td>' +
        '<td class="fs-12" style="max-width:420px"><div class="text-truncate">' +
        fmt.esc(n.subject || n.body) + '</div></td>' +
        '<td class="nowrap fs-12 muted">' + fmt.dateTime(n.sentAt) + '</td>' +
        '</tr>';
    }).join('');

    return ui.card({
      title: 'Sent notifications',
      hint: all.length + ' total · showing ' + list.length,
      actions: '<button class="btn btn-sm btn-light btn-icon" id="btn-Excel"><i class="bi bi-filetype-Excel"></i> Export</button>',
      tight: true,
      body: bar + (list.length
        ? '<div class="table-scroll"><table class="table table-striped table-hover align-middle table-x" id="table-outbox"><thead><tr><th>Channel</th><th>Candidate</th>' +
        '<th>To</th><th>Type</th><th>Subject / message</th><th>Sent</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : ui.empty('Nothing sent yet', 'Initiate an exam or publish a result to dispatch notifications.', 'bi-envelope-paper'))
    });
  }

  function activityView() {
    var log = store.all('auditLog');
    return ui.card({
      title: 'Activity log',
      hint: 'Every action taken in this demo, newest first.',
      body: log.length
        ? '<div class="timeline">' + log.slice(0, 120).map(function (l) {
          return '<div class="tl-item ok"><span class="tl-dot"><i class="bi bi-dot"></i></span>' +
            '<div class="tl-title">' + fmt.esc(l.note || l.action) + '</div>' +
            '<div class="tl-meta">' + fmt.esc(l.userName) + ' · ' + fmt.esc(l.action) + ' · ' + fmt.dateTime(l.at) + '</div></div>';
        }).join('') + '</div>'
        : ui.empty('No activity recorded yet')
    });
  }

  function render(view, params) {
    ERec.router.setCrumbs([{ label: 'Mail / SMS Outbox' }]);
    tab = (params && params.props && params.props.tab) || 'outbox';

    var html = ui.pageHead({
      title: 'Notification outbox',
      sub: 'Everything the system dispatched to candidates, plus the audit trail.',
      actions: '<div class="btn-group btn-group-sm">' +
        '<button class="btn btn-' + (tab === 'outbox' ? 'primary' : 'light') + '" data-tab="outbox">Mail / SMS</button>' +
        '<button class="btn btn-' + (tab === 'activity' ? 'primary' : 'light') + '" data-tab="activity">Activity log</button>' +
        '</div>'
    });

    html += tab === 'outbox' ? outboxView() : activityView();
    view.innerHTML = html;

    ui.on(view, '[data-tab]', 'click', function (e, b) {
      tab = b.dataset.tab;
      render(view, { props: { tab: tab } });
    });

    if (tab !== 'outbox') return;

    var tbl = view.querySelector('#table-outbox');
    if (tbl) ui.dataTable(tbl, { pageLength: 10 });

    var q = view.querySelector('#f-q');
    var t = null;
    q.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { filters.q = q.value; render(view, { props: { tab: tab } }); }, 260);
    });
    ['channel', 'kind', 'circular'].forEach(function (k) {
      view.querySelector('#f-' + k).addEventListener('change', function (e) {
        filters[k] = e.target.value;
        render(view, { props: { tab: tab } });
      });
    });
    view.querySelector('#f-clear').addEventListener('click', function () {
      filters = { channel: '', kind: '', circular: '', q: '' };
      render(view, { props: { tab: tab } });
    });

    ui.on(view, 'tr[data-n]', 'click', function (e, tr) {
      detail(store.find('notifications', tr.dataset.n));
    });

    view.querySelector('#btn-Excel').addEventListener('click', function () {
      ERec.exp.Excel('notification_outbox.Excel',
        ['Channel', 'Candidate', 'To', 'Type', 'Subject', 'Body', 'Sent At'],
        store.all('notifications').filter(matches).map(function (n) {
          return [n.channel, n.applicantName, n.to, KIND_LABEL[n.kind] || n.kind, n.subject, n.body, n.sentAt];
        }));
    });
  }

  ERec.pages.outbox = { render: render };
})(window);
