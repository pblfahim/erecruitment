/* The step engine.
   Every screen in a stage is driven from here: which steps exist for this
   stage, which are optional, which are unlocked, and what the stepper shows.
   Flow variants are NOT special-cased anywhere else in the app -
   `roll` appears only on the first stage and `scrutiny` only on a viva, so
   MCQ->Written->Viva, Written->Viva and Viva-only all fall out of this list. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var fmt = ERec.fmt;

  var TYPE_LABEL = {
    MCQ: 'MCQ',
    WRITTEN: 'Written',
    VIVA: 'Viva-Voce',
    PRACTICAL: 'Practical Test'
  };

  /* `help` is the one-line plain-language instruction shown under the step
     title - the users of this module are HR staff, not software people.
     scope 'circular' -> completion is stored on the circular, not the stage,
     because these three happen once per circular after the last exam. */
  var DEFS = [
    {
      key: 'search', label: 'Candidate List', icon: 'bi-people',
      help: 'Pick the candidates who will sit for this examination.'
    },
    {
      key: 'approval-applicant', label: 'Approve Candidate List', icon: 'bi-person-check',
      optional: function (s) { return !s.requireApplicantApproval; },
      help: 'Send the candidate list to your senior for approval. When approval is marked as required, the next steps stay locked until it is approved.'
    },
    {
      key: 'roll', label: 'Roll Numbers', icon: 'bi-123',
      present: function (s, c) { return c.isFirst; },
      help: 'Give every candidate a roll number. Done once, before the first examination.'
    },
    {
      key: 'venue', label: 'Venue & Seating', icon: 'bi-geo-alt',
      help: 'Say where and when the examination is held, and which roll numbers sit in which hall.'
    },
    {
      key: 'approval-venue', label: 'Approve Venue', icon: 'bi-building-check',
      optional: function (s) { return !s.requireVenueApproval; },
      help: 'Send the venue plan to your senior for approval. When approval is marked as required, the next steps stay locked until it is approved.'
    },
    {
      key: 'instructions', label: 'Admit Card', icon: 'bi-file-earmark-person',
      help: 'Configure admit card instructions and preview candidate admit cards.'
    },
    {
      key: 'initiate', label: 'Send Exam Notice', icon: 'bi-send',
      help: 'Check the e-mail and SMS wording, then send it to the candidates.'
    },
    {
      key: 'scrutiny', label: 'Document Scrutiny', icon: 'bi-folder-check',
      present: function (s) { return s.type === 'VIVA'; },
      help: 'Match each candidate\'s application against the original documents they bring.'
    },
    {
      key: 'marks', label: 'Marks & Selection', icon: 'bi-clipboard-data',
      help: 'Enter the marks, then choose who goes forward.'
    },
    {
      key: 'forward', label: 'Send to Next Stage', icon: 'bi-arrow-right-circle',
      present: function (s, c) { return !c.isLast; },
      help: 'Move the selected candidates into the next examination stage.'
    },
    {
      key: 'result', label: 'Final Result', icon: 'bi-trophy', scope: 'circular',
      present: function (s, c) { return c.isLast; },
      help: 'Publish the final merit list and inform the selected candidates.'
    },
    {
      key: 'offer', label: 'Appointment Letter', icon: 'bi-file-earmark-text', scope: 'circular',
      present: function (s, c) { return c.isLast; },
      help: 'Issue the appointment letter with the joining date and salary.'
    },
    {
      key: 'joining', label: 'Joining', icon: 'bi-person-badge', scope: 'circular',
      present: function (s, c) { return c.isLast; },
      help: 'On the reporting day, verify the candidate and record the joining.'
    }
  ];

  function typeLabel(t) { return TYPE_LABEL[t] || t; }

  function stageName(stg) { return typeLabel(stg.type) + ' Examination'; }

  function context(stg) {
    var store = ERec.store;
    var all = store.stagesOf(stg.circularId);
    return {
      all: all,
      index: all.findIndex(function (x) { return x.id === stg.id; }),
      isFirst: all.length ? all[0].id === stg.id : true,
      isLast: all.length ? all[all.length - 1].id === stg.id : true
    };
  }

  /* How many candidates are still waiting on each step.
     This is what makes a supplementary call ("call 10 more for viva") work:
     the step stays green, but it reports the newcomers who still need a
     venue, an admit card, scrutiny or a mark. */
  function outstanding(stg, ctx) {
    var store = ERec.store;
    var roster = store.rosterOf(stg.id);
    var out = {};

    out.roll = roster.filter(function (r) { return !r.rollNo; }).length;

    /* Judged from the roll ranges themselves, not from the stored allocation:
       a newly called candidate whose roll already falls inside an existing
       range needs no attention, and should not raise a false warning. */
    var venues = store.venuesOf(stg.id);
    out.venue = roster.filter(function (r) {
      if (!r.rollNo) return true;
      return !venues.some(function (v) {
        return String(r.rollNo) >= String(v.rollFrom) && String(r.rollNo) <= String(v.rollTo);
      });
    }).length;

    var notified = {};
    store.all('notifications').forEach(function (n) {
      if (n.stageId === stg.id && n.kind === 'ADMIT') notified[n.applicantId] = true;
    });
    out.initiate = roster.filter(function (r) { return !notified[r.applicantId]; }).length;

    if (stg.type === 'VIVA') {
      out.scrutiny = roster.filter(function (r) { return !r.scrutiny; }).length;
    }

    var live = roster.filter(function (r) {
      return !(stg.type === 'VIVA' && r.scrutiny && r.scrutiny.status === 'REJECTED');
    });
    out.marks = live.filter(function (r) {
      return r.attendance !== 'ABSENT' && (r.marks === null || r.marks === undefined || r.marks === '');
    }).length;

    if (!ctx.isLast) {
      var st = stg.steps && stg.steps.forward;
      if (st && st.targetStageId) {
        out.forward = roster.filter(function (r) {
          return r.selectedForNext && !store.rosterRow(st.targetStageId, r.applicantId);
        }).length;
      }
    } else {
      var selected = store.where('applicants', function (a) {
        return a.circularId === stg.circularId && (a.status === 'SELECTED' || a.status === 'JOINED');
      });
      out.offer = selected.filter(function (a) { return !store.offerFor(a.id); }).length;
      out.joining = selected.filter(function (a) {
        return store.offerFor(a.id) && !store.joiningFor(a.id);
      }).length;
    }
    return out;
  }

  /* Short line under a completed step's label. */
  function hintFor(stg, key, state) {
    if (!state || !state.done) return '';
    if (state.skipped) return 'Skipped';
    var m = state;
    switch (key) {
      case 'search': return fmt.plural(m.count || 0, 'candidate');
      case 'approval-applicant':
      case 'approval-venue': return 'Approved';
      case 'roll': return m.count ? m.count + ' rolls' : 'Generated';
      case 'venue': return fmt.plural(m.count || 0, 'venue');
      case 'instructions': return 'Ready';
      case 'initiate': return (m.mail || 0) + ' mail · ' + (m.sms || 0) + ' SMS';
      case 'scrutiny': return (m.accepted || 0) + ' accepted';
      case 'marks': return (m.selected || 0) + ' selected';
      case 'forward': return fmt.plural(m.count || 0, 'candidate');
      case 'result': return fmt.plural(m.count || 0, 'selected', 'selected');
      case 'offer': return fmt.plural(m.count || 0, 'offer');
      case 'joining': return fmt.plural(m.count || 0, 'joined', 'joined');
      default: return 'Done';
    }
  }

  function stateOf(stg, def) {
    var store = ERec.store;
    if (def.scope === 'circular') {
      var c = store.circular(stg.circularId);
      return (c.steps && c.steps[def.key]) || null;
    }
    var st = (stg.steps && stg.steps[def.key]) || null;
    if (def.key === 'approval-venue') {
      var apVenue = store.approvalFor(stg.id, 'VENUE');
      if (apVenue) {
        var isVenueAllApproved = apVenue.status === 'APPROVED' ||
          (apVenue.chain && apVenue.chain.length > 0 && apVenue.chain.every(function (l) { return l.status === 'APPROVED'; }));
        if (isVenueAllApproved) {
          if (!st || !st.done) {
            st = { done: true, at: apVenue.actedAt || new Date().toISOString(), approvalId: apVenue.id };
            if (stg.steps) stg.steps[def.key] = st;
          }
        }
      }
    } else if (def.key === 'approval-applicant') {
      var apApp = store.approvalFor(stg.id, 'APPLICANT');
      if (apApp) {
        var isAppAllApproved = apApp.status === 'APPROVED' ||
          (apApp.chain && apApp.chain.length > 0 && apApp.chain.every(function (l) { return l.status === 'APPROVED'; }));
        if (isAppAllApproved) {
          if (!st || !st.done) {
            st = { done: true, at: apApp.actedAt || new Date().toISOString(), approvalId: apApp.id };
            if (stg.steps) stg.steps[def.key] = st;
          }
        }
      }
    }
    return st;
  }

  /* The whole step list for a stage, already resolved for presence,
     completion, unlock state and outstanding work. */
  function steps(stg) {
    var ctx = context(stg);
    var pend = outstanding(stg, ctx);
    var out = [];
    var blockedBy = null;
    var n = 0;

    DEFS.forEach(function (def) {
      if (def.present && !def.present(stg, ctx)) return;
      var st = stateOf(stg, def);
      var done = !!(st && st.done);
      /* an approval that the stage marks as REQUIRED is not optional, and so
         blocks everything behind it until it has been approved */
      var isOptional = typeof def.optional === 'function' ? def.optional(stg) : !!def.optional;
      var step = {
        key: def.key,
        label: def.label,
        help: def.help,
        icon: def.icon,
        number: ++n,
        optional: isOptional,
        scope: def.scope || 'stage',
        state: st,
        done: done,
        skipped: !!(st && st.skipped),
        /* work waiting on this step even though it is already marked done -
           i.e. candidates added later by a supplementary call */
        pending: done && !st.skipped ? (pend[def.key] || 0) : 0,
        hint: hintFor(stg, def.key, st),
        enabled: !blockedBy,
        blockedReason: blockedBy ? ('Finish "' + blockedBy + '" first') : '',
        route: '#/circular/' + stg.circularId + '/stage/' + stg.id + '/' + def.key
      };
      /* Optional steps never gate the ones behind them. */
      if (!done && !isOptional && !blockedBy) blockedBy = def.label;
      out.push(step);
    });

    out.forEach(function (s) { s.total = out.length; });
    return out;
  }

  function step(stg, key) {
    return steps(stg).find(function (s) { return s.key === key; }) || null;
  }

  /* Where "Continue" goes.
     Candidates left waiting on an already-finished step come FIRST: after a
     supplementary call the newcomers still need a venue, an admit card and a
     mark, and sending the user off to publish the final result instead would
     quietly strand them. Only once nobody is waiting do we move on to the
     next unfinished step. */
  function currentStep(stg) {
    var list = steps(stg);
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].pending > 0 && list[i].enabled) return list[i];
    }
    for (i = 0; i < list.length; i++) {
      if (!list[i].done && !list[i].optional && list[i].enabled) return list[i];
    }
    for (i = 0; i < list.length; i++) if (!list[i].done && list[i].enabled) return list[i];
    return list[list.length - 1] || null;
  }

  function progress(stg) {
    var list = steps(stg);
    var mandatory = list.filter(function (s) { return !s.optional; });
    return {
      done: mandatory.filter(function (s) { return s.done; }).length,
      total: mandatory.length,
      pending: list.reduce(function (a, s) { return a + s.pending; }, 0),
      steps: list
    };
  }

  /* Circular-wide progress = every mandatory step across every stage. */
  function circularProgress(circularId) {
    var stgs = ERec.store.stagesOf(circularId);
    var done = 0, total = 0, pending = 0;
    stgs.forEach(function (s) {
      var p = progress(s);
      done += p.done; total += p.total; pending += p.pending;
    });
    return { done: done, total: total, pending: pending, pct: fmt.pct(done, total) };
  }

  /* Where a stage's selected candidates may be forwarded - any later stage,
     so MCQ can send to Written *or* straight to Viva. */
  function forwardTargets(stg) {
    var ctx = context(stg);
    return ctx.all.slice(ctx.index + 1);
  }

  function nextStage(stg) {
    var t = forwardTargets(stg);
    return t.length ? t[0] : null;
  }

  function previousStage(stg) {
    var ctx = context(stg);
    return ctx.index > 0 ? ctx.all[ctx.index - 1] : null;
  }

  /* The stage a user should land on when opening a circular. */
  function activeStage(circularId) {
    var stgs = ERec.store.stagesOf(circularId);
    var i;
    for (i = 0; i < stgs.length; i++) {
      var p = progress(stgs[i]);
      if (p.done < p.total) return stgs[i];
    }
    for (i = 0; i < stgs.length; i++) {
      if (progress(stgs[i]).pending > 0) return stgs[i];
    }
    return stgs[stgs.length - 1] || null;
  }

  function chainLabel(circularId) {
    return ERec.store.stagesOf(circularId).map(function (s) { return typeLabel(s.type); }).join(' → ');
  }

  ERec.pipeline = {
    DEFS: DEFS,
    typeLabel: typeLabel,
    stageName: stageName,
    steps: steps,
    step: step,
    currentStep: currentStep,
    progress: progress,
    circularProgress: circularProgress,
    forwardTargets: forwardTargets,
    nextStage: nextStage,
    previousStage: previousStage,
    activeStage: activeStage,
    chainLabel: chainLabel,
    context: context,
    outstanding: outstanding
  };
})(window);
