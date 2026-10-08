/* Create Job Posting - Step 2: Eligibility Rules.
   Renders individual Eligibility Rules Section Cards for each post configured under the circular. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt;

  function getPostsOf(c) {
    if (c && Array.isArray(c.posts) && c.posts.length > 0) {
      return c.posts.map(function (p, idx) {
        var postTitle = (p.post || p.name || ('Post ' + (idx + 1))).trim();
        return {
          id: p.id || ('post-' + (idx + 1)),
          post: postTitle,
          name: postTitle,
          vacancies: parseInt(p.vacancies, 10) || 1
        };
      });
    }
    var rawPost = (c && c.post) ? String(c.post).trim() : 'Senior Officer';
    var vac = parseInt(c && c.vacancies, 10) || 1;
    return [{
      id: 'post-1',
      post: rawPost,
      name: rawPost,
      vacancies: vac
    }];
  }

  function rulesOf(c, postId) {
    var allRules = c.eligibilityRules || [];
    if (!postId) return allRules;
    var posts = getPostsOf(c);
    var firstPostId = posts.length ? posts[0].id : null;
    return allRules.filter(function (r) {
      if (r.postId) return r.postId === postId;
      return postId === firstPostId;
    });
  }

  function saveRules(c, list, note, callback) {
    if (Array.isArray(c.posts)) {
      c.posts.forEach(function (p) {
        p.eligibilityRules = list.filter(function (r) { return r.postId === p.id; });
      });
    }

    if (c.isDraft || c.id === 'draft') {
      c.eligibilityRules = list;
      if (store.saveDraftCircular) store.saveDraftCircular(c);
      if (callback) callback();
      return;
    }

    store.update('circulars', c.id, {
      eligibilityRules: list,
      posts: c.posts
    });
    store.audit('EDIT_RULES', 'circular', c.id, note);
    if (callback) callback();
  }

  function ruleFieldsHtml(r) {
    var levels = '<option value="">Select one</option>' + ERec.seed.DEGREE_LEVELS.map(function (l) {
      return '<option value="' + l + '"' + (r.degreeLevel === l ? ' selected' : '') + '>' + l + '</option>';
    }).join('');

    switch (r.type) {
      case 'AGE':
        return '<div class="row g-3">' +
          '<div class="col-md-6"><label class="form-label">Maximum Age <span class="text-danger">*</span></label>' +
          '<input type="number" min="14" max="70" class="form-control" data-f="maxAge" value="' +
          fmt.esc(r.maxAge || '') + '" placeholder="e.g. 30"></div>' +
          '<div class="col-md-6"><label class="form-label">Age counted as on <span class="text-danger">*</span></label>' +
          '<input type="date" class="form-control" data-f="asOn" value="' + fmt.esc(r.asOn || '') + '">' +
          '</div></div>';

      case 'EXPERIENCE':
        return '<label class="form-label">Minimum Years of Experience <span class="text-danger">*</span></label>' +
          '<input type="number" min="0" max="40" step="0.5" class="form-control mb-3" data-f="minYears" value="' +
          fmt.esc(r.minYears || '') + '" placeholder="e.g. 2">' +
          '<label class="form-label">Industry (optional)</label>' +
          '<input class="form-control" data-f="industry" value="' + fmt.esc(r.industry || '') + '" placeholder="e.g. Banking">' +
          '<div class="form-text mb-3">Only experience where the applicant selected this industry counts towards the total.</div>' +
          '<label class="form-label">Designation keywords (optional, comma-separated)</label>' +
          '<input class="form-control mb-3" data-f="designationKeywords" value="' +
          fmt.esc(r.designationKeywords || '') + '" placeholder="e.g. Officer, Executive">' +
          '<label class="form-label">Responsibility keywords (optional, comma-separated)</label>' +
          '<input class="form-control" data-f="responsibilityKeywords" value="' +
          fmt.esc(r.responsibilityKeywords || '') + '" placeholder="e.g. accounting, audit">' +
          '<div class="form-text">Only experience where the job title or responsibilities contain one of these words counts towards the total.</div>';

      case 'DEGREE_LEVEL':
        return '<label class="form-label">Minimum Degree Level <span class="text-danger">*</span></label>' +
          '<select class="form-select mb-3" data-f="degreeLevel">' + levels + '</select>' +
          '<div class="form-check">' +
          '<input class="form-check-input" type="checkbox" id="r-mandatory" data-f="mandatory"' +
          (r.mandatory === false ? '' : ' checked') + '>' +
          '<label class="form-check-label fw-semibold" for="r-mandatory">Mandatory</label>' +
          '</div>' +
          '<div class="form-text">Untick "Mandatory" to just prefer this degree without disqualifying applicants who don\'t have it.</div>';

      case 'RESULT_GRADE': {
        var curDiv = r.divisionText || 'Third';
        var divOptions = ['First', 'Second', 'Third'].map(function (d) {
          return '<option value="' + d + '"' + (curDiv === d ? ' selected' : '') + '>' + d + '</option>';
        }).join('');

        return '<label class="form-label">Division/Class text (fails if any result contains this) <span class="text-danger">*</span></label>' +
          '<select class="form-select mb-3" data-f="divisionText">' + divOptions + '</select>' +
          '<label class="form-label">Minimum GPA (Secondary, Higher Secondary), on a 05.00 scale <span class="text-danger">*</span></label>' +
          '<input type="number" step="0.01" min="0" max="5.00" class="form-control mb-3" data-f="minGpa" value="' +
          fmt.esc(r.minGpa !== undefined && r.minGpa !== null ? r.minGpa : '') + '" placeholder="e.g. 3.50">' +
          '<label class="form-label">Minimum CGPA (Bachelor or Higher Degree), on a 04.00 scale <span class="text-danger">*</span></label>' +
          '<input type="number" step="0.01" min="0" max="4.00" class="form-control mb-3" data-f="minCgpa" value="' +
          fmt.esc(r.minCgpa !== undefined && r.minCgpa !== null ? r.minCgpa : '') + '" placeholder="e.g. 3.00">' +
          '<div class="form-text">Specify the division/class restriction, the minimum SSC/HSC GPA (out of 05.00), and the minimum Bachelor/Higher degree CGPA (out of 04.00).</div>';
      }

      case 'SUBJECT':
        return '<label class="form-label">Degree Level</label>' +
          '<select class="form-select mb-3" data-f="degreeLevel">' + levels + '</select>' +
          '<label class="form-label">Allowed subjects (comma-separated) <span class="text-danger">*</span></label>' +
          '<input class="form-control" data-f="allowedSubjects" value="' +
          fmt.esc(r.allowedSubjects || '') + '" placeholder="e.g. Accounting, Finance, Management">' +
          '<div class="form-text">Applicant\'s result at this degree level must be in one of these subjects.</div>';

      case 'OTHERS': {
        var critVal = Array.isArray(r.otherCriteria) ? r.otherCriteria.join(', ') : (r.otherCriteria || '');
        return '<label class="form-label">Allowed criteria (comma-separated) <span class="text-danger">*</span></label>' +
          '<input class="form-control" data-f="otherCriteria" value="' +
          fmt.esc(critVal) + '" placeholder="e.g. Certification, Special Training, Computer Literacy">' +
          '<div class="form-text">Applicant must meet one of these criteria.</div>';
      }

      default:
        return '';
    }
  }

  function ruleModal(c, existing, targetPostId, onSaved) {
    var posts = getPostsOf(c);
    var activePostId = (existing && existing.postId) || targetPostId || (posts[0] ? posts[0].id : 'post-1');
    var targetPostObj = posts.find(function (p) { return p.id === activePostId; }) || posts[0];

    var r = existing
      ? JSON.parse(JSON.stringify(existing))
      : ERec.seed.blankRule('AGE');
    if (r.type === 'AGE') delete r.minAge;
    if (!existing && r.type === 'DEGREE_LEVEL') r.degreeLevel = '';
    if (!existing && r.type !== 'OTHERS') r.name = ERec.seed.ruleTypeLabel(r.type);
    if (r.type === 'OTHERS' && !r.otherCriteria) r.otherCriteria = '';

    var postSelectionHtml = '';
    if (posts.length > 1) {
      postSelectionHtml = '<div class="col-12">' +
        '<label class="form-label">Applicable Post <span class="text-danger">*</span></label>' +
        '<select class="form-select" id="r-post-select">' +
        posts.map(function (p) {
          return '<option value="' + p.id + '"' + (p.id === activePostId ? ' selected' : '') + '>' +
            fmt.esc(p.post) + ' (' + (p.vacancies < 10 ? fmt.pad(p.vacancies, 2) : p.vacancies) + ' vacancies)</option>';
        }).join('') +
        '</select>' +
        '<div class="form-text">This eligibility rule will apply specifically to applicants for this post.</div>' +
        '</div>';
    } else {
      postSelectionHtml = '<div class="col-12">' +
        '<div class="p-2 px-3 rounded bg-light border d-flex align-items-center justify-content-between">' +
        '<span class="fs-12 text-muted">Target Post:</span>' +
        '<span class="fw-semibold text-dark fs-13"><i class="bi bi-briefcase text-success me-1"></i>' +
        fmt.esc(targetPostObj ? targetPostObj.post : 'Default Post') + '</span>' +
        '</div>' +
        '</div>';
    }

    ui.modal({
      title: '<i class="bi bi-shield-check text-success me-2"></i>' +
        (existing ? 'Edit Eligibility Rule' : ('Add Eligibility Rule — ' + fmt.esc(targetPostObj ? targetPostObj.post : ''))),
      size: 'lg',
      body:
        '<div class="row g-3 mb-2">' +
        postSelectionHtml +
        '<div class="col-md-7"><label class="form-label">Rule Type <span class="text-danger">*</span></label>' +
        '<select class="form-select" id="r-type">' +
        ERec.seed.RULE_TYPES.map(function (t) {
          return '<option value="' + t.key + '"' + (r.type === t.key ? ' selected' : '') + '>' +
            fmt.esc(t.label) + '</option>';
        }).join('') + '</select>' +
        '<div class="form-text">These ' + ERec.seed.RULE_TYPES.length +
        ' types are evaluated by the automatic scrutiny engine.</div></div>' +
        '<div class="col-md-5"><label class="form-label">Status</label>' +
        '<select class="form-select" id="r-status">' +
        '<option value="ACTIVE"' + (r.status !== 'INACTIVE' ? ' selected' : '') + '>Active</option>' +
        '<option value="INACTIVE"' + (r.status === 'INACTIVE' ? ' selected' : '') + '>Inactive</option>' +
        '</select></div>' +
        '</div>' +

        '<label class="form-label">Rule Name / Title <span class="text-danger">*</span></label>' +
        '<input class="form-control mb-1' + (r.type !== 'OTHERS' ? ' bg-light' : '') + '" id="r-name" value="' +
        fmt.esc(r.type !== 'OTHERS' ? ERec.seed.ruleTypeLabel(r.type) : (r.name || '')) + '"' +
        (r.type !== 'OTHERS' ? ' readonly' : '') +
        ' placeholder="' + (r.type === 'OTHERS' ? 'e.g., Certification' : 'Auto-filled based on rule type') + '">' +
        '<div class="form-text mb-3" id="r-name-hint">' +
        (r.type === 'OTHERS' ? 'Enter a custom rule name / title.' : 'Automatically set based on selected rule type.') + '</div>' +

        '<div id="r-fields">' + ruleFieldsHtml(r) + '</div>',
      footer: '<button class="btn btn-sm btn-outline-secondary px-3" data-bs-dismiss="modal">Cancel</button>' +
        '<button class="btn btn-sm btn-green-solid px-4" data-act="save">' +
        '<i class="bi bi-check2 me-1"></i> Save Rule</button>',
      onShow: function (api) {
        function syncRuleNameField(isTypeSwitch) {
          var nameInput = api.find('#r-name');
          var hintEl = api.find('#r-name-hint');
          if (!nameInput) return;
          if (r.type === 'OTHERS') {
            nameInput.readOnly = false;
            nameInput.classList.remove('bg-light');
            nameInput.placeholder = 'e.g., Certification';
            if (isTypeSwitch) {
              nameInput.value = (existing && existing.type === 'OTHERS') ? existing.name : '';
              r.name = nameInput.value;
            }
            if (hintEl) hintEl.textContent = 'Enter a custom rule name / title.';
          } else {
            nameInput.readOnly = true;
            nameInput.classList.add('bg-light');
            nameInput.value = ERec.seed.ruleTypeLabel(r.type) || '';
            r.name = nameInput.value;
            if (hintEl) hintEl.textContent = 'Automatically set based on selected rule type.';
          }
        }

        function collect() {
          api.findAll('[data-f]').forEach(function (el) {
            var k = el.dataset.f;
            if (el.type === 'checkbox') r[k] = el.checked;
            else if (el.type === 'number') r[k] = el.value === '' ? null : Number(el.value);
            else r[k] = el.value;
          });
          r.name = api.find('#r-name').value.trim();
          r.status = api.find('#r-status').value;
        }

        api.find('#r-type').addEventListener('change', function () {
          collect();
          r.type = this.value;
          api.find('#r-fields').innerHTML = ruleFieldsHtml(r);
          syncRuleNameField(true);
          if (r.type === 'OTHERS') {
            api.find('#r-name').focus();
          }
        });

        ui.on(api.el, '[data-f]', 'input', collect);
        ui.on(api.el, '[data-f]', 'change', collect);
        api.find('#r-name').addEventListener('input', collect);

        // Enforce maximum GPA and CGPA limits
        ui.on(api.el, '[data-f="minGpa"]', 'input', function (e, input) {
          if (input.value && parseFloat(input.value) > 5) {
            input.value = '5.00';
            r.minGpa = '5.00';
            ui.toast('Minimum GPA cannot exceed 05.00', 'warning');
          }
        });
        ui.on(api.el, '[data-f="minGpa"]', 'change', function (e, input) {
          if (input.value && parseFloat(input.value) > 5) {
            input.value = '5.00';
            r.minGpa = '5.00';
          }
        });
        ui.on(api.el, '[data-f="minCgpa"]', 'input', function (e, input) {
          if (input.value && parseFloat(input.value) > 4) {
            input.value = '4.00';
            r.minCgpa = '4.00';
            ui.toast('Minimum CGPA cannot exceed 04.00', 'warning');
          }
        });
        ui.on(api.el, '[data-f="minCgpa"]', 'change', function (e, input) {
          if (input.value && parseFloat(input.value) > 4) {
            input.value = '4.00';
            r.minCgpa = '4.00';
          }
        });

        syncRuleNameField(false);

        api.find('[data-act="save"]').addEventListener('click', function () {
          collect();
          if (r.type !== 'OTHERS') {
            r.name = ERec.seed.ruleTypeLabel(r.type) || r.name;
          }
          if (!r.name) {
            ui.toast(r.type === 'OTHERS' ? 'Enter a rule name / title' : 'Give the rule a name', 'warning');
            if (r.type === 'OTHERS') api.find('#r-name').focus();
            return;
          }
          if (r.type === 'AGE') {
            if (!r.maxAge) { ui.toast('Set a maximum age', 'warning'); return; }
            if (!r.asOn) { ui.toast('Select the date for "Age counted as on"', 'warning'); return; }
          }
          if (r.type === 'EXPERIENCE' && !r.minYears) {
            ui.toast('Set the minimum years of experience', 'warning'); return;
          }
          if (r.type === 'DEGREE_LEVEL' && !r.degreeLevel) {
            ui.toast('Select a minimum degree level', 'warning'); return;
          }
          if (r.type === 'RESULT_GRADE') {
            if (!r.divisionText) { ui.toast('Select the division/class text', 'warning'); return; }
            if (r.minGpa === '' || r.minGpa === null || isNaN(r.minGpa)) {
              ui.toast('Set the Minimum GPA (Secondary, Higher Secondary)', 'warning');
              return;
            }
            if (parseFloat(r.minGpa) > 5) {
              ui.toast('Minimum GPA cannot exceed 05.00', 'warning');
              return;
            }
            if (parseFloat(r.minGpa) < 0) {
              ui.toast('Minimum GPA cannot be negative', 'warning');
              return;
            }
            if (r.minCgpa === '' || r.minCgpa === null || isNaN(r.minCgpa)) {
              ui.toast('Set the Minimum CGPA (Bachelor or Higher Degree)', 'warning');
              return;
            }
            if (parseFloat(r.minCgpa) > 4) {
              ui.toast('Minimum CGPA cannot exceed 04.00', 'warning');
              return;
            }
            if (parseFloat(r.minCgpa) < 0) {
              ui.toast('Minimum CGPA cannot be negative', 'warning');
              return;
            }
          }
          if (r.type === 'SUBJECT' && !ERec.seed.ExcelList(r.allowedSubjects).length) {
            ui.toast('List at least one allowed subject', 'warning'); return;
          }
          if (r.type === 'OTHERS' && !ERec.seed.ExcelList(r.otherCriteria).length) {
            ui.toast('List at least one allowed criteria', 'warning'); return;
          }

          var postSelectEl = api.find('#r-post-select');
          var chosenPostId = postSelectEl ? postSelectEl.value : activePostId;
          var chosenPostObj = posts.find(function (p) { return p.id === chosenPostId; }) || targetPostObj;

          r.postId = chosenPostId;
          r.postName = chosenPostObj ? chosenPostObj.post : '';
          r.failureMessage = ERec.seed.describeRule(r);

          var list = rulesOf(c).slice();
          var i = list.findIndex(function (x) { return x.id === r.id; });
          if (i >= 0) list[i] = r; else list.push(r);
          saveRules(c, list, (existing ? 'Rule updated for ' : 'Rule added for ') + r.postName + ': ' + r.name, function () {
            if (onSaved) onSaved(chosenPostId);
          });
          api.close();
          ui.toast(existing ? 'Rule updated for ' + r.postName : 'Rule added for ' + r.postName);
        });
      }
    });
  }

  function copyRulesModal(c, targetPostId, onSaved) {
    var posts = getPostsOf(c);
    var targetPost = posts.find(function (p) { return p.id === targetPostId; }) || posts[0];

    // Other posts in the current circular that have rules
    var internalSourcePosts = posts.filter(function (p) {
      return p.id !== targetPostId && rulesOf(c, p.id).length > 0;
    });

    // Other external circulars with rules
    var otherCirculars = store.where('circulars', function (x) {
      return x.id !== c.id && (x.eligibilityRules || []).length > 0;
    });

    if (!internalSourcePosts.length && !otherCirculars.length) {
      ui.modal({
        title: 'Copy Rules to ' + fmt.esc(targetPost.post),
        body: ui.empty('No eligibility rules available to copy',
          'Configure rules for another post or circular first, then you can copy them here.', 'bi-shield-exclamation'),
        footer: '<button class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>'
      });
      return;
    }

    var internalPostsHtml = '';
    if (internalSourcePosts.length > 0) {
      internalPostsHtml = '<div class="mb-3">' +
        '<div class="fw-bold fs-12 text-secondary text-uppercase mb-2"><i class="bi bi-briefcase me-1 text-success"></i>From Another Post in this Circular:</div>' +
        internalSourcePosts.map(function (srcPost) {
          var rCount = rulesOf(c, srcPost.id).length;
          return '<button class="btn btn-light d-flex align-items-center gap-2 w-100 mb-2 text-start p-2.5 border" data-from-post="' + srcPost.id + '">' +
            '<span class="flex-grow-1">' +
            '<span class="d-block fw-semibold fs-13 text-dark">' + fmt.esc(srcPost.post) + '</span>' +
            '<span class="d-block fs-12 text-muted">Same circular &bull; ' + (srcPost.vacancies < 10 ? fmt.pad(srcPost.vacancies, 2) : srcPost.vacancies) + ' vacancies</span>' +
            '</span>' +
            '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fs-11">' +
            fmt.plural(rCount, 'rule') + '</span>' +
            '<i class="bi bi-arrow-right ms-1 text-muted"></i></button>';
        }).join('') +
        '</div>';
    }

    var otherCircsHtml = '';
    if (otherCirculars.length > 0) {
      otherCircsHtml = '<div>' +
        '<div class="fw-bold fs-12 text-secondary text-uppercase mb-2"><i class="bi bi-journal-text me-1 text-primary"></i>From Other Circulars:</div>' +
        otherCirculars.map(function (x) {
          var rCount = (x.eligibilityRules || []).length;
          return '<button class="btn btn-light d-flex align-items-center gap-2 w-100 mb-2 text-start p-2.5 border" data-from-circ="' + x.id + '">' +
            '<span class="flex-grow-1">' +
            '<span class="d-block fw-semibold fs-13 text-dark">' + fmt.esc(x.post || x.title) + '</span>' +
            '<span class="d-block fs-12 text-muted mono">' + fmt.esc(x.code) + '</span>' +
            '</span>' +
            '<span class="badge bg-light text-secondary border px-2 py-1 fs-11">' +
            fmt.plural(rCount, 'rule') + '</span>' +
            '<i class="bi bi-arrow-right ms-1 text-muted"></i></button>';
        }).join('') +
        '</div>';
    }

    ui.modal({
      title: '<i class="bi bi-files text-success me-2"></i>Copy Rules to ' + fmt.esc(targetPost.post),
      body: '<p class="fs-13 text-muted mb-3">Select a source post or circular to duplicate its rules for <strong>' +
        fmt.esc(targetPost.post) + '</strong>. Any existing rules for this post will be kept.</p>' +
        internalPostsHtml + otherCircsHtml,
      footer: '<button class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>',
      onShow: function (api) {
        // Copy from other post in same circular
        ui.on(api.el, '[data-from-post]', 'click', function (e, b) {
          var srcPostId = b.dataset.fromPost;
          var srcRules = rulesOf(c, srcPostId);
          var copied = srcRules.map(function (x) {
            return Object.assign({}, x, {
              id: fmt.uid('rul'),
              postId: targetPostId,
              postName: targetPost.post
            });
          });
          saveRules(c, rulesOf(c).concat(copied), fmt.plural(copied.length, 'rule') + ' copied to ' + targetPost.post, function () {
            if (onSaved) onSaved(targetPostId);
          });
          api.close();
          ui.toast(fmt.plural(copied.length, 'rule') + ' copied to ' + targetPost.post, 'success');
        });

        // Copy from external circular
        ui.on(api.el, '[data-from-circ]', 'click', function (e, b) {
          var src = store.circular(b.dataset.fromCirc);
          var copied = (src.eligibilityRules || []).map(function (x) {
            return Object.assign({}, x, {
              id: fmt.uid('rul'),
              postId: targetPostId,
              postName: targetPost.post
            });
          });
          saveRules(c, rulesOf(c).concat(copied), fmt.plural(copied.length, 'rule') + ' copied from ' + src.post + ' to ' + targetPost.post, function () {
            if (onSaved) onSaved(targetPostId);
          });
          api.close();
          ui.toast(fmt.plural(copied.length, 'rule') + ' copied from ' + src.post + ' to ' + targetPost.post, 'success');
        });
      }
    });
  }

  function render(view, params) {
    var cid = (params && params.cid) || '';
    var c = store.circular(cid);
    if (!c && store.getDraftCircular) {
      c = store.getDraftCircular();
    }
    if (!c) {
      ui.toast('Circular not found', 'danger');
      ERec.router.go('#/circulars');
      return;
    }

    var posts = getPostsOf(c);
    var isMultiPost = posts.length > 1;

    var isDraft = c.isDraft || c.id === 'draft';
    var step1Target = isDraft ? '#/circulars/new' : ('#/circulars/new/' + c.id);

    ERec.router.setCrumbs([
      { label: 'Job Circulars', href: '#/circulars' },
      { label: isDraft ? 'Create Job Posting' : ('Edit ' + (c.title || c.post || 'Circular')), href: step1Target },
      { label: 'Eligibility Rules' }
    ]);

    function renderRulesTable(postId) {
      var post = posts.find(function (p) { return p.id === postId; });
      var postName = post ? post.post : 'this post';
      var rules = rulesOf(c, postId);

      if (!rules.length) {
        return '<div class="p-4 text-center text-muted fs-13 bg-white">' +
          '<div class="mb-2"><i class="bi bi-shield-exclamation text-secondary fs-2"></i></div>' +
          '<div class="fw-semibold text-dark mb-1">No eligibility rules configured for ' + fmt.esc(postName) + ' yet</div>' +
          '<div class="text-muted fs-12 mb-3">Add rules or copy from another post/circular to start screening applicants for this position.</div>' +
          '<div class="d-flex align-items-center justify-content-center gap-2">' +
          '<button class="btn btn-sm btn-green-solid" data-add-rule="' + postId + '">' +
          '<i class="bi bi-plus-lg me-1"></i> Add Rule for ' + fmt.esc(postName) +
          '</button>' +
          '<button class="btn btn-sm btn-outline-secondary" data-copy-rules="' + postId + '">' +
          '<i class="bi bi-files me-1"></i> Copy Rules' +
          '</button>' +
          '</div>' +
          '</div>';
      }

      var ruleRows = rules.map(function (r) {
        var off = r.status === 'INACTIVE';
        return '<tr' + (off ? ' style="opacity:.55"' : '') + '>' +
          '<td><div class="fw-semibold text-dark">' + fmt.esc(r.name) + '</div>' +
          '<div class="fs-12 muted">' + fmt.esc(r.failureMessage || 'No failure message set') + '</div></td>' +
          '<td class="nowrap"><span class="pill blue">' +
          fmt.esc(ERec.seed.ruleTypeLabel(r.type)) + '</span></td>' +
          '<td class="fs-13">' + fmt.esc(ERec.seed.describeRule(r)) + '</td>' +
          '<td>' + (off ? ui.pill('Inactive', 'grey') : ui.pill('Active', 'green')) + '</td>' +
          '<td class="text-center">' +
          '<button class="btn btn-sm btn-light me-1" data-editrule="' + r.id + '" data-post-id="' + postId + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger" data-delrule="' + r.id + '" data-post-id="' + postId + '" title="Remove"><i class="bi bi-trash"></i></button>' +
          '</td></tr>';
      }).join('');

      return '<div class="table-scroll"><table class="table table-striped table-hover align-middle table-x" id="table-eligibility-rules-' + postId + '"><thead><tr>' +
        '<th>Rule Name</th><th>Type</th><th>What it checks</th><th>Status</th><th class="text-center" data-orderable="false">Actions</th>' +
        '</tr></thead><tbody>' + ruleRows + '</tbody></table></div>';
    }

    function renderPostCardsHtml() {
      return posts.map(function (post, postIdx) {
        var postRules = rulesOf(c, post.id);
        var postTitle = isMultiPost
          ? ('Eligibility Rules for Post #' + (postIdx + 1) + ': ' + fmt.esc(post.post))
          : 'Eligibility Rules';

        return '<!-- Eligibility Rules Section Card -->' +
          '<div class="card card-posting-section mb-4" data-post-card="' + post.id + '">' +
          '<div class="card-posting-head d-flex align-items-center justify-content-between flex-wrap gap-2">' +
          '<div class="d-flex align-items-center gap-2 flex-wrap">' +
          '<i class="bi bi-shield-check text-success"></i>' +
          '<span class="fw-bold text-dark fs-13.5">' + postTitle + '</span>' +
          '<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5 fs-11">' +
          (post.vacancies < 10 ? fmt.pad(post.vacancies, 2) : post.vacancies) + ' ' + (post.vacancies === 1 ? 'Vacancy' : 'Vacancies') +
          '</span>' +
          '<span class="badge bg-light text-secondary border px-2 py-0.5 fs-11" id="badge-count-' + post.id + '">' +
          postRules.length + ' ' + (postRules.length === 1 ? 'Rule' : 'Rules') +
          '</span>' +
          '</div>' +
          '<div class="d-flex align-items-center gap-2">' +
          '<button class="btn btn-sm btn-outline-secondary btn-icon" data-copy-rules="' + post.id + '" title="Copy rules to ' + fmt.esc(post.post) + '">' +
          '<i class="bi bi-files"></i> Copy Rules From' +
          '</button>' +
          '<button class="btn btn-sm btn-green-solid btn-icon shadow-sm" data-add-rule="' + post.id + '" title="Add rule for ' + fmt.esc(post.post) + '">' +
          '<i class="bi bi-plus-lg"></i> Add Eligibility Rule' +
          '</button>' +
          '</div>' +
          '</div>' +
          '<div id="rules-table-container-' + post.id + '">' +
          renderRulesTable(post.id) +
          '</div>' +
          '</div>';
      }).join('');
    }

    var headerSummaryBar =
      '<div class="d-flex align-items-center justify-content-between p-3 rounded-3 bg-white border mb-4 shadow-2xs">' +
      '<div class="d-flex align-items-center gap-2.5">' +
      '<div class="badge bg-success-subtle text-success p-2 rounded-2">' +
      '<i class="bi bi-briefcase fs-5"></i>' +
      '</div>' +
      '<div>' +
      '<div class="fw-bold text-dark fs-14">' + fmt.esc(c.title || c.post) + '</div>' +
      '<div class="text-muted fs-12">' +
      '<span class="mono">' + fmt.esc(c.code) + '</span> &bull; ' +
      '<strong class="text-dark">' + posts.length + ' ' + (posts.length === 1 ? 'Post' : 'Posts') + '</strong> configured &bull; ' +
      'Define tailored screening requirements for each post below' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<span class="badge bg-light text-secondary border px-2.5 py-1.5 fs-12 fw-medium">' +
      'Step 2 of 4' +
      '</span>' +
      '</div>';

    var html =
      '<div class="create-job-posting-container">' +
      ui.postingWizard(2, c.id) +
      headerSummaryBar +

      '<!-- Eligibility Rules Section Cards (one per post) -->' +
      '<div id="all-post-cards-wrap">' +
      renderPostCardsHtml() +
      '</div>' +

      '<!-- Bottom Actions Row -->' +
      '<div class="circular-action-bar d-flex align-items-center justify-content-between flex-wrap gap-2">' +
      '<button type="button" class="btn btn-outline-secondary btn-cancel-posting" id="btn-prev-step">' +
      '<i class="bi bi-arrow-left me-1"></i> Previous (Basic Information)' +
      '</button>' +
      '<div class="d-flex align-items-center gap-2">' +
      '<button type="button" class="btn btn-save-next" id="btn-save-next">' +
      'Save &amp; Continue <i class="bi bi-arrow-right ms-1"></i>' +
      '</button>' +
      '</div>' +
      '</div>' +

      '</div>';

    view.innerHTML = html;
    ui.bindPostingWizard(view);

    function initPostTable(postId) {
      var tbl = view.querySelector('#table-eligibility-rules-' + postId);
      if (tbl && !tbl.classList.contains('dataTable')) {
        ui.dataTable(tbl, { pageLength: 10 });
      }
    }

    function initAllTables() {
      posts.forEach(function (p) {
        initPostTable(p.id);
      });
    }

    initAllTables();

    function refreshPostTable(postId) {
      var container = view.querySelector('#rules-table-container-' + postId);
      if (container) {
        container.innerHTML = renderRulesTable(postId);
        initPostTable(postId);
      }
      var badge = view.querySelector('#badge-count-' + postId);
      if (badge) {
        var count = rulesOf(c, postId).length;
        badge.textContent = count + ' ' + (count === 1 ? 'Rule' : 'Rules');
      }
    }

    function refreshAllTables() {
      posts.forEach(function (p) {
        refreshPostTable(p.id);
      });
    }

    // Add Rule button click handler
    ui.on(view, '[data-add-rule]', 'click', function (e, btn) {
      var targetPostId = btn.dataset.addRule;
      ruleModal(c, null, targetPostId, function (savedPostId) {
        refreshPostTable(savedPostId || targetPostId);
      });
    });

    // Copy Rules button click handler
    ui.on(view, '[data-copy-rules]', 'click', function (e, btn) {
      var targetPostId = btn.dataset.copyRules;
      copyRulesModal(c, targetPostId, function () {
        refreshPostTable(targetPostId);
      });
    });

    // Edit Rule click handler
    ui.on(view, '[data-editrule]', 'click', function (e, btn) {
      var ruleId = btn.dataset.editrule;
      var targetPostId = btn.dataset.postId;
      var r = rulesOf(c).find(function (x) { return x.id === ruleId; });
      if (r) {
        ruleModal(c, r, targetPostId, function (savedPostId) {
          refreshAllTables();
        });
      }
    });

    // Delete Rule click handler
    ui.on(view, '[data-delrule]', 'click', function (e, btn) {
      var ruleId = btn.dataset.delrule;
      var targetPostId = btn.dataset.postId;
      var r = rulesOf(c).find(function (x) { return x.id === ruleId; });
      if (!r) return;

      ui.confirm({
        title: 'Remove Eligibility Rule',
        body: 'Are you sure you want to remove the rule <strong>' + fmt.esc(r.name) + '</strong>?',
        okText: 'Remove Rule',
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        var list = rulesOf(c).filter(function (x) { return x.id !== r.id; });
        saveRules(c, list, 'Rule removed: ' + r.name, function () {
          refreshPostTable(targetPostId);
        });
        ui.toast('Rule removed');
      });
    });

    var backBtn = view.querySelector('#btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        ERec.router.go('#/circulars');
      });
    }

    view.querySelector('#btn-prev-step').addEventListener('click', function () {
      ERec.router.go(step1Target);
    });

    view.querySelector('#btn-save-next').addEventListener('click', function () {
      if (posts.length > 1) {
        var missingRulesPost = posts.find(function (p) {
          return rulesOf(c, p.id).length === 0;
        });
        if (missingRulesPost) {
          ui.toast('Please add at least one eligibility rule for ' + missingRulesPost.post + ' before proceeding', 'warning');
          var card = view.querySelector('[data-post-card="' + missingRulesPost.id + '"]');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else {
        var rules = rulesOf(c);
        if (!rules.length) {
          ui.toast('Please add at least one eligibility rule before proceeding', 'warning');
          return;
        }
      }

      var previewId = (c.isDraft || c.id === 'draft') ? 'draft' : c.id;
      ERec.router.go('#/circulars/new-preview/' + previewId);
    });
  }

  ERec.pages.newcircularEligibility = { render: render };
  ERec.pages.createcircularEligibility = ERec.pages.newcircularEligibility;
})(window);
