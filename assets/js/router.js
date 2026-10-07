/* Hash router.
   Pages register on ERec.pages and expose render(viewEl, params). */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  ERec.pages = ERec.pages || {};

  var ROUTES = [
    { pattern: '#/', name: 'dashboard', page: 'dashboard' },
    { pattern: '#/circulars', name: 'circulars', page: 'circulars' },
    { pattern: '#/circulars/new', name: 'newcircular-basicinfo', page: 'newcircularBasicInfo' },
    { pattern: '#/circulars/new/:cid', name: 'newcircular-basicinfo', page: 'newcircularBasicInfo' },
    { pattern: '#/newcircular', name: 'newcircular-basicinfo', page: 'newcircularBasicInfo' },
    { pattern: '#/circulars/new-eligibility/:cid', name: 'newcircular-eligibility', page: 'newcircularEligibility' },
    { pattern: '#/newcircular/eligibility/:cid', name: 'newcircular-eligibility', page: 'newcircularEligibility' },
    { pattern: '#/circulars/new-approval/:cid', name: 'newcircular-approval', page: 'newcircularApproval' },
    { pattern: '#/newcircular/approval/:cid', name: 'newcircular-approval', page: 'newcircularApproval' },
    { pattern: '#/circulars/new-preview/:cid', name: 'newcircular', page: 'newcircular' },
    { pattern: '#/newcircular/preview/:cid', name: 'newcircular', page: 'newcircular' },
    { pattern: '#/circulars/new-preview', name: 'newcircular', page: 'newcircular' },
    { pattern: '#/newcircular-preview', name: 'newcircular', page: 'newcircular' },
    { pattern: '#/approvals', name: 'approvals', page: 'pendingApproval' },
    { pattern: '#/pending-approval', name: 'pendingApproval', page: 'pendingApproval' },
    { pattern: '#/pendingapproval', name: 'pendingApproval', page: 'pendingApproval' },
    { pattern: '#/outbox', name: 'outbox', page: 'outbox' },
    { pattern: '#/activity', name: 'activity', page: 'outbox', props: { tab: 'activity' } },
    { pattern: '#/circular/:cid', name: 'circular', page: 'circular' },
    { pattern: '#/circular/:cid/stage/:sid', name: 'stage', page: '__stageRedirect' },
    { pattern: '#/circular/:cid/stage/:sid/:step', name: 'stage', page: '__stage' },
    { pattern: '#/print/:doc/:id', name: 'print', page: 'print' }
  ];

  /* step key -> page module + render method */
  var STEP_PAGES = {
    'search': ['applicantlist', 'render'],
    'approval-applicant': ['approvecandidate', 'render'],
    'roll': ['rollcreate', 'render'],
    'venue': ['seatplan', 'render'],
    'approval-venue': ['seatplanapprove', 'render'],
    'instructions': ['examinstructions', 'render'],
    'initiate': ['examnotice', 'render'],
    'scrutiny': ['scrutiny', 'render'],
    'marks': ['marks', 'render'],
    'forward': ['marks', 'renderForward'],
    'result': ['result', 'render'],
    'offer': ['offerletter', 'render'],
    'joining': ['joining', 'render']
  };

  var current = { name: '', params: {}, hash: '' };
  var crumbs = [];

  /* Where the user actually came from, so a "Back" button returns there
     rather than always dumping them on the circular workspace. */
  var curHash = '';
  var prevHash = '';

  function parse(hash) {
    hash = hash || '#/';
    var qi = hash.indexOf('?');
    var query = {};
    if (qi >= 0) {
      hash.slice(qi + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      hash = hash.slice(0, qi);
    }
    if (hash.length > 2 && hash.slice(-1) === '/') hash = hash.slice(0, -1);

    var parts = hash.split('/').filter(function (s) { return s !== ''; });

    for (var i = 0; i < ROUTES.length; i++) {
      var rp = ROUTES[i].pattern.split('/').filter(function (s) { return s !== ''; });
      if (rp.length !== parts.length) continue;
      var params = {}, ok = true;
      for (var j = 0; j < rp.length; j++) {
        if (rp[j][0] === ':') params[rp[j].slice(1)] = decodeURIComponent(parts[j]);
        else if (rp[j] !== parts[j]) { ok = false; break; }
      }
      if (ok) return { route: ROUTES[i], params: params, query: query, hash: hash };
    }
    return null;
  }

  function setCrumbs(list) {
    crumbs = list || [];
    var el = document.getElementById('crumbs');
    if (!el) return;
    el.innerHTML = crumbs.map(function (c, i) {
      var last = i === crumbs.length - 1;
      var body = last
        ? '<span class="cur">' + ERec.fmt.esc(c.label) + '</span>'
        : '<a href="' + (c.href || '#/') + '">' + ERec.fmt.esc(c.label) + '</a>';
      return (i ? '<span class="sep">/</span>' : '') + body;
    }).join('');
  }

  /* Pages attach delegated listeners to the view element itself. Replacing
     the element (rather than just its innerHTML) on every render throws those
     listeners away with it - otherwise they pile up each time you revisit a
     screen and a single click fires the handler once per past visit, opening
     the same modal several times over. */
  function freshView() {
    var old = document.getElementById('view');
    var fresh = document.createElement(old.tagName);
    fresh.id = 'view';
    fresh.className = old.className;
    old.parentNode.replaceChild(fresh, old);
    return fresh;
  }

  function render() {
    var m = parse(global.location.hash);
    var view = freshView();

    if (!m) {
      view.innerHTML = ERec.ui.pageHead({ title: 'Page not found' }) +
        ERec.ui.card({ body: ERec.ui.empty('That screen does not exist', 'Use the sidebar to get back on track.', 'bi-signpost-split') });
      setCrumbs([{ label: 'Not found' }]);
      return;
    }

    current = { name: m.route.name, params: m.params, query: m.query, hash: m.hash };

    /* Record the trail. Redirect hops (the bare /stage/:sid route) never get
       this far, so they cannot become a back target. */
    var full = global.location.hash;
    if (full !== curHash) { prevHash = curHash; curHash = full; }

    /* /circular/:cid/stage/:sid -> jump to the step the user should be on */
    if (m.route.page === '__stageRedirect') {
      var stg = ERec.store.stage(m.params.sid);
      if (!stg) { go('#/circulars'); return; }
      var cur = ERec.pipeline.currentStep(stg);
      go('#/circular/' + stg.circularId + '/stage/' + stg.id + '/' + (cur ? cur.key : 'search'));
      return;
    }

    /* /circular/:cid -> jump to the applicant list / current step of active stage */
    if (m.route.name === 'circular' && m.params.cid) {
      var circStages = ERec.store.stagesOf(m.params.cid);
      if (circStages && circStages.length) {
        var actStg = ERec.pipeline.activeStage(m.params.cid) || circStages[0];
        var curStep = ERec.pipeline.currentStep(actStg);
        go('#/circular/' + m.params.cid + '/stage/' + actStg.id + '/' + (curStep ? curStep.key : 'search'));
        return;
      }
    }

    var pageName = m.route.page;
    var method = 'render';

    if (pageName === '__stage') {
      var mapping = STEP_PAGES[m.params.step];
      if (!mapping) { go('#/circular/' + m.params.cid); return; }
      pageName = mapping[0];
      method = mapping[1];
    }

    var page = ERec.pages[pageName];
    if (!page || !page[method]) {
      view.innerHTML = ERec.ui.card({ body: ERec.ui.empty('Screen not available', pageName + '.' + method + ' is missing') });
      return;
    }

    ERec.ui.closeDrawer();
    view.scrollTop = 0;
    global.scrollTo(0, 0);
    setCrumbs([]);
    try {
      page[method](view, Object.assign({}, m.params, { query: m.query, props: m.route.props || {} }));
    } catch (err) {
      view.innerHTML = ERec.ui.pageHead({ title: 'Something went wrong' }) +
        ERec.ui.card({
          body: ERec.ui.alert('err', '<strong>' + ERec.fmt.esc(err.message) + '</strong>' +
            '<pre class="fs-12 mb-0 mt-2" style="white-space:pre-wrap">' + ERec.fmt.esc(err.stack || '') + '</pre>')
        });
      if (global.console) console.error(err);
    }
    if (ERec.app && ERec.app.syncNav) ERec.app.syncNav(current);
  }

  function go(hash) {
    if (global.location.hash === hash) render();
    else global.location.hash = hash;
  }

  function refresh() { render(); }

  /* Return to the previous screen. `fallback` is used when there is nowhere
     to go back to - a page opened directly from a pasted URL, say. The trail
     is cleared afterwards so a second Back does not bounce between two
     screens. */
  function back(fallback) {
    var target = prevHash && prevHash !== curHash ? prevHash : (fallback || '#/');
    prevHash = '';
    go(target);
  }

  function start() {
    global.addEventListener('hashchange', render);
    if (!global.location.hash) global.location.hash = '#/';
    else render();
  }

  ERec.router = {
    start: start, go: go, back: back, refresh: refresh, render: render,
    setCrumbs: setCrumbs,
    current: function () { return current; }
  };
})(window);
