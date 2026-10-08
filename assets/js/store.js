/* Persistent demo store.
   Everything lives in one JSON blob under localStorage["erec_demo_v1"].
   localStorage is unavailable on file:// in Safari and in some private
   windows, so every access is guarded and silently degrades to memory —
   the demo keeps working, it just forgets on refresh. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var fmt = ERec.fmt;

  var KEY = 'erec_demo_v1';
  var ACTING_KEY = 'erec_demo_acting_v1';
  var DRAFT_KEY = 'erec_wizard_draft_v1';

  var memory = {};          // fallback when localStorage throws
  var storageOk = true;
  var db = null;
  var draftCircular = null;
  var saveTimer = null;
  var listeners = [];

  function rawGet(k) {
    try {
      var v = global.localStorage.getItem(k);
      storageOk = true;
      return v;
    } catch (e) {
      storageOk = false;
      return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null;
    }
  }

  function rawSet(k, v) {
    memory[k] = v;
    try {
      global.localStorage.setItem(k, v);
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
  }

  function rawRemove(k) {
    delete memory[k];
    try { global.localStorage.removeItem(k); } catch (e) { /* memory only */ }
  }

  /* ---------- lifecycle ---------- */

  function load() {
    var raw = rawGet(KEY);
    if (raw) {
      try {
        db = JSON.parse(raw);
      } catch (e) {
        db = null;
      }
    }
    if (!db || !db.meta || db.meta.version !== ERec.seed.SEED_VERSION) {
      db = ERec.seed.build();
      persist();
    } else if (db && db.circulars) {
      // Cleanse any demo circular previously saved as 'Officer (General)'
      var hasOfficerGeneral = false;
      var cleanCircs = [];
      db.circulars.forEach(function (c) {
        if (c.post === 'Officer (General)' || (c.title && c.title.indexOf('Officer (General)') !== -1)) {
          hasOfficerGeneral = true;
          if (db.stages) db.stages = db.stages.filter(function (s) { return s.circularId !== c.id; });
          if (db.applicants) db.applicants = db.applicants.filter(function (a) { return a.circularId !== c.id; });
          if (db.stageApplicants) {
            db.stageApplicants = db.stageApplicants.filter(function (sa) {
              return !sa.stageId || sa.stageId.indexOf(c.id) !== 0;
            });
          }
        } else {
          cleanCircs.push(c);
        }
      });
      if (hasOfficerGeneral) {
        db.circulars = cleanCircs;
        persist();
      }
    }
    return db;
  }

  function persist() {
    rawSet(KEY, JSON.stringify(db));
  }

  /* Batches the writes that a single user action fans out into. */
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      persist();
    }, 60);
    listeners.forEach(function (fn) { fn(); });
  }

  function reset() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    rawRemove(KEY);
    db = ERec.seed.build();
    rawRemove(ACTING_KEY);
    clearDraftCircular();
    persist();
    listeners.forEach(function (fn) { fn(); });
    return db;
  }

  function getDraftCircular() {
    if (draftCircular) {
      if (draftCircular.post === 'Officer (General)') draftCircular.post = '';
      if (draftCircular.title && draftCircular.title.indexOf('Officer (General)') !== -1) draftCircular.title = '';
      return draftCircular;
    }
    var raw = rawGet(DRAFT_KEY);
    if (raw) {
      try {
        draftCircular = JSON.parse(raw);
        if (draftCircular) {
          if (draftCircular.post === 'Officer (General)') draftCircular.post = '';
          if (draftCircular.title && draftCircular.title.indexOf('Officer (General)') !== -1) draftCircular.title = '';
        }
        return draftCircular;
      } catch (e) {
        draftCircular = null;
      }
    }
    return null;
  }

  function saveDraftCircular(draft) {
    draftCircular = draft;
    rawSet(DRAFT_KEY, JSON.stringify(draft));
    return draftCircular;
  }

  function clearDraftCircular() {
    draftCircular = null;
    rawRemove(DRAFT_KEY);
  }

  function publishDraftCircular(draft) {
    var d = draft || getDraftCircular();
    if (!d) return null;

    var id = fmt.uid('C');
    var y = new Date().getFullYear();
    var code = d.code || ('HRD/REC/' + y + '/' + fmt.pad(all('circulars').length + 1, 2));

    var circRecord = {
      id: id,
      code: code,
      title: d.title || ('Recruitment of ' + (d.post || 'Officer')),
      post: d.post || 'Officer',
      posts: d.posts || [{ id: 'post-1', post: d.post || 'Officer', vacancies: d.vacancies || 1 }],
      navTitle: d.title || d.navTitle || d.post || 'Officer',
      vacancies: d.vacancies || 1,
      applyStart: d.applyStart || fmt.isoDate(),
      applyEnd: d.applyEnd || fmt.addDays(fmt.isoDate(), 30),
      applyEndTime: d.applyEndTime || '',
      eligibilityRules: d.eligibilityRules || [],
      status: 'ACTIVE',
      steps: {},
      createdAt: d.createdAt || new Date().toISOString()
    };

    insert('circulars', circRecord);

    var stages = d.stages || [];
    stages.forEach(function (stg, i) {
      var stageRecord = Object.assign({}, stg, {
        id: id + '-S' + (i + 1),
        circularId: id,
        seq: i + 1
      });
      insert('stages', stageRecord);
    });

    var poolCount = typeof d.poolCount === 'number' ? d.poolCount : 10;
    if (poolCount > 0) {
      var appPrefix = code.replace(/\W+/g, '').slice(-6).toUpperCase() || 'APP';
      var apps = ERec.seed.makeApplicants({
        circularId: id,
        count: poolCount,
        prefix: appPrefix,
        appliedAt: d.applyStart || fmt.isoDate()
      });
      apps.forEach(function (a) { insert('applicants', a); });
    }

    // Remap any approvals created during draft
    var draftApprovals = where('approvals', function (ap) {
      return ap.circularId === 'draft' || ap.circularId === (d.id || 'draft');
    });
    draftApprovals.forEach(function (ap) {
      ap.circularId = id;
      if (ap.stageId && ap.stageId.indexOf('draft-S') === 0) {
        var seqMatch = ap.stageId.match(/draft-S(\d+)/);
        if (seqMatch) {
          ap.stageId = id + '-S' + seqMatch[1];
        } else {
          ap.stageId = id + '-S1';
        }
      } else if (!ap.stageId || ap.stageId === 'draft') {
        ap.stageId = id + '-S1';
      }
    });

    audit('CREATE_CIRCULAR', 'circular', id, 'Created circular ' + circRecord.post + ' (' + code + ') upon publishing');
    audit('PUBLISH_CIRCULAR', 'circular', id, 'Published job circular ' + code + ' (' + circRecord.post + ')');

    clearDraftCircular();
    save();
    return circRecord;
  }

  function onChange(fn) { listeners.push(fn); }

  function data() { return db || load(); }

  /* ---------- generic collection access ---------- */

  function all(coll) { return data()[coll] || []; }

  function find(coll, id) {
    var list = all(coll);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function where(coll, pred) { return all(coll).filter(pred); }

  function first(coll, pred) {
    var list = all(coll);
    for (var i = 0; i < list.length; i++) if (pred(list[i])) return list[i];
    return null;
  }

  function insert(coll, rec) {
    if (!rec.id) rec.id = fmt.uid(coll.slice(0, 3));
    data()[coll].push(rec);
    save();
    return rec;
  }

  function update(coll, id, patch) {
    if (coll === 'circulars' && (id === 'draft' || (draftCircular && draftCircular.id === id))) {
      var d = draftCircular || getDraftCircular();
      if (d) {
        Object.assign(d, patch);
        saveDraftCircular(d);
        return d;
      }
    }
    if (coll === 'stages') {
      var d = draftCircular || getDraftCircular();
      if (d && d.stages) {
        for (var s = 0; s < d.stages.length; s++) {
          if (d.stages[s].id === id) {
            Object.assign(d.stages[s], patch);
            saveDraftCircular(d);
            return d.stages[s];
          }
        }
      }
    }
    var rec = find(coll, id);
    if (!rec) return null;
    Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
    save();
    return rec;
  }

  function remove(coll, id) {
    var list = data()[coll];
    var i = list.findIndex(function (r) { return r.id === id; });
    if (i >= 0) { list.splice(i, 1); save(); return true; }
    return false;
  }

  /* ---------- acting user ---------- */

  function actingUser() {
    var id = rawGet(ACTING_KEY);
    var u = id ? find('users', id) : null;
    return u || first('users', function (x) { return x.role === 'HR_ADMIN'; }) || all('users')[0];
  }

  function setActingUser(id) { rawSet(ACTING_KEY, id); }

  function isAdmin() { return actingUser().role === 'HR_ADMIN'; }

  /* ---------- audit ---------- */

  function audit(action, entity, entityId, note) {
    data().auditLog.unshift({
      id: fmt.uid('log'),
      at: new Date().toISOString(),
      userId: actingUser().id,
      userName: actingUser().name,
      action: action, entity: entity, entityId: entityId, note: note || ''
    });
    if (data().auditLog.length > 400) data().auditLog.length = 400;
    save();
  }

  /* ---------- domain shortcuts ---------- */

  function circular(id) {
    if (!id) return null;
    if (id === 'draft' || (draftCircular && draftCircular.id === id)) {
      return draftCircular || getDraftCircular();
    }
    return find('circulars', id);
  }

  function stagesOf(circularId) {
    if (circularId === 'draft' || (draftCircular && draftCircular.id === circularId)) {
      var d = draftCircular || getDraftCircular();
      return (d && d.stages) || [];
    }
    return where('stages', function (s) { return s.circularId === circularId; })
      .sort(function (a, b) { return a.seq - b.seq; });
  }

  function stage(id) {
    if (!id) return null;
    var d = draftCircular || getDraftCircular();
    if (d && d.stages) {
      for (var i = 0; i < d.stages.length; i++) {
        if (d.stages[i].id === id) return d.stages[i];
      }
    }
    return find('stages', id);
  }

  function applicantsOf(circularId) {
    if (circularId === 'draft' || (draftCircular && draftCircular.id === circularId)) {
      return [];
    }
    return where('applicants', function (a) { return a.circularId === circularId; });
  }

  function applicant(id) { return find('applicants', id); }

  /* Roster rows for one stage, in roll order when rolls exist. */
  function rosterOf(stageId) {
    var rows = where('stageApplicants', function (r) { return r.stageId === stageId; });
    return rows.sort(function (a, b) {
      if (a.rollNo && b.rollNo) return String(a.rollNo).localeCompare(String(b.rollNo));
      return 0;
    });
  }

  function rosterRow(stageId, applicantId) {
    return first('stageApplicants', function (r) {
      return r.stageId === stageId && r.applicantId === applicantId;
    });
  }

  function venuesOf(stageId) {
    return where('venues', function (v) { return v.stageId === stageId; })
      .sort(function (a, b) { return String(a.rollFrom).localeCompare(String(b.rollFrom)); });
  }

  /* Latest approval request of a kind for a stage. */
  function approvalFor(stageId, kind) {
    var list = where('approvals', function (a) { return a.stageId === stageId && a.kind === kind; });
    return list.length ? list[list.length - 1] : null;
  }

  function pendingApprovalsFor(userId) {
    return where('approvals', function (a) {
      if (a.status !== 'PENDING') return false;
      var level = a.chain[a.currentSeq];
      return level && level.userId === userId && level.status === 'PENDING';
    });
  }

  /* Notification/document templates are per stage (or per circular for the
     final-result / offer / joining documents, where stageId is null). */
  function templateFor(circularId, stageId, kind, fallback) {
    var t = first('templates', function (x) {
      return x.circularId === circularId && x.stageId === stageId && x.kind === kind;
    });
    if (t) return t;
    t = {
      id: fmt.uid('tpl'), circularId: circularId, stageId: stageId, kind: kind,
      mailSubject: fallback.mailSubject, mailBody: fallback.mailBody, smsBody: fallback.smsBody
    };
    insert('templates', t);
    return t;
  }

  function panelsOf(stageId) {
    return where('panels', function (p) { return p.stageId === stageId; });
  }

  function offerFor(applicantId) {
    return first('offers', function (o) { return o.applicantId === applicantId; });
  }

  function joiningFor(applicantId) {
    return first('joinings', function (j) { return j.applicantId === applicantId; });
  }

  /* ---------- stage step state ---------- */

  function stepState(stg, key) {
    return (stg.steps && stg.steps[key]) || null;
  }

  function isStepDone(stg, key) {
    var s = stepState(stg, key);
    return !!(s && s.done);
  }

  function markStep(stageId, key, meta) {
    var stg = stage(stageId);
    if (!stg) return null;
    stg.steps = stg.steps || {};
    stg.steps[key] = Object.assign(
      { done: true, at: new Date().toISOString(), by: actingUser().name },
      meta || {}
    );
    save();
    return stg.steps[key];
  }

  function clearStep(stageId, key) {
    var stg = stage(stageId);
    if (stg && stg.steps) { delete stg.steps[key]; save(); }
  }

  /* Final result, Appointment Letter and joining happen once per circular, so their
     completion hangs off the circular rather than any single stage. */
  function markCircularStep(circularId, key, meta) {
    var c = circular(circularId);
    if (!c) return null;
    c.steps = c.steps || {};
    c.steps[key] = Object.assign(
      { done: true, at: new Date().toISOString(), by: actingUser().name },
      meta || {}
    );
    save();
    return c.steps[key];
  }

  function circularStep(circularId, key) {
    var c = circular(circularId);
    return (c && c.steps && c.steps[key]) || null;
  }

  function clearCircularStep(circularId, key) {
    var c = circular(circularId);
    if (c && c.steps) { delete c.steps[key]; save(); }
  }

  function notify(records) {
    var now = new Date().toISOString();
    records.forEach(function (n) {
      n.id = fmt.uid('ntf');
      n.sentAt = now;
      data().notifications.unshift(n);
    });
    save();
  }

  function deleteCircular(circularId) {
    var c = circular(circularId);
    if (!c) return false;
    var stageIds = stagesOf(circularId).map(function (s) { return s.id; });
    var stageIdMap = {};
    stageIds.forEach(function (sid) { stageIdMap[sid] = true; });

    var applicantIds = applicantsOf(circularId).map(function (a) { return a.id; });
    var applicantIdMap = {};
    applicantIds.forEach(function (aid) { applicantIdMap[aid] = true; });

    var d = data();
    d.circulars = (d.circulars || []).filter(function (x) { return x.id !== circularId; });
    d.stages = (d.stages || []).filter(function (x) { return x.circularId !== circularId; });
    d.applicants = (d.applicants || []).filter(function (x) { return x.circularId !== circularId; });
    d.stageApplicants = (d.stageApplicants || []).filter(function (x) {
      return !stageIdMap[x.stageId] && !applicantIdMap[x.applicantId];
    });
    d.venues = (d.venues || []).filter(function (x) { return x.circularId !== circularId; });
    d.approvals = (d.approvals || []).filter(function (x) { return x.circularId !== circularId; });
    d.templates = (d.templates || []).filter(function (x) { return x.circularId !== circularId; });
    d.notifications = (d.notifications || []).filter(function (x) { return x.circularId !== circularId; });
    d.panels = (d.panels || []).filter(function (x) { return !stageIdMap[x.stageId]; });
    d.offers = (d.offers || []).filter(function (x) { return x.circularId !== circularId; });
    d.joinings = (d.joinings || []).filter(function (x) { return x.circularId !== circularId; });

    audit('DELETE_CIRCULAR', 'circular', circularId, 'Deleted circular ' + (c.code || c.post || circularId));
    save();
    return true;
  }

  ERec.store = {
    load: load, save: save, persist: persist, reset: reset, onChange: onChange,
    data: data, all: all, find: find, where: where, first: first,
    insert: insert, update: update, remove: remove,
    actingUser: actingUser, setActingUser: setActingUser, isAdmin: isAdmin,
    audit: audit,
    circular: circular, circulars: function () { return all('circulars'); },
    deleteCircular: deleteCircular,
    stagesOf: stagesOf, stage: stage,
    applicantsOf: applicantsOf, applicant: applicant,
    rosterOf: rosterOf, rosterRow: rosterRow,
    venuesOf: venuesOf, approvalFor: approvalFor, pendingApprovalsFor: pendingApprovalsFor,
    templateFor: templateFor, panelsOf: panelsOf,
    offerFor: offerFor, joiningFor: joiningFor,
    stepState: stepState, isStepDone: isStepDone, markStep: markStep, clearStep: clearStep,
    markCircularStep: markCircularStep, circularStep: circularStep, clearCircularStep: clearCircularStep,
    notify: notify,
    getDraftCircular: getDraftCircular, saveDraftCircular: saveDraftCircular,
    clearDraftCircular: clearDraftCircular, publishDraftCircular: publishDraftCircular,
    storageAvailable: function () { return storageOk; }
  };
})(window);
