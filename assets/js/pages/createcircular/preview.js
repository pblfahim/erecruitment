/* Create Job Posting - Step 3: Job Preview.
   Displays the formal Pubali Bank PLC Circular Notice Document matching CAREER_GraphicsDesigner.pdf. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var store = ERec.store, ui = ERec.ui, fmt = ERec.fmt, pipe = ERec.pipeline;

  /* Official Graphic Designer Circular Data (from CAREER_GraphicsDesigner.pdf) */
  var GRAPHIC_DESIGNER_DATA = {
    code: 'HRD/REC/2026/02',
    post: 'Graphic Designer',
    rank: 'Trainee Assistant Junior Officer',
    postLine: 'Graphic Designer in the rank of Trainee Assistant Junior Officer',
    vacanciesText: '01 (one)',
    intro: 'Pubali Bank PLC., a leading largest private commercial bank with 519 online branches, 21 Islamic Banking Windows and 281 Sub-branches with a diverse and motivated workforce looking for a versatile, high-energy Graphic Designer specializing in Digital & Motion Content who fulfils the following criteria and have the ability to set trend in graphic designing with new ideas & innovations. If you live to breathe life into static designs and thrive on creating scroll-stopping digital experiences, we want you on our team.',
    responsibilities: [
      'Create high-quality visual and video content for Social Media, YouTube, Website and other digital platforms.',
      'Design static advertisements, social media posts, banners, thumbnails, promotional materials and campaign visuals for the Bank\'s products and services.',
      'Develop short-form video advertisements, reels, motion graphics and animated promotional content and digital campaigns (15/20/30 seconds).',
      'Edit and optimize video content suitable for social media engagement and digital marketing.',
      'Design layouts for brochures, annual reports, newsletters, presentations and corporate communication materials.',
      'Develop creative concepts for corporate branding, awareness campaigns and promotional events.',
      'Retouch high-resolution photographs and maintain organized digital design and multimedia archives.',
      'Work closely with relevant departments/teams to maintain brand consistency across all digital and print materials.',
      'Ensure timely delivery of creative content while maintaining quality and corporate standards.'
    ],
    qualifications: [
      '04 (four) years Diploma in Graphic Design/Fine Arts from a recognized polytechnic institute. Preference will be given to the candidates having Graduation in Graphic Design, Fine Arts, Creative Media, Multimedia, Visual Communication or related discipline from a reputed university.',
      'Only published result (by the competent authority) will be accepted. Testimonial for this matter will not be accepted.',
      'Candidates having foreign degree must obtain equivalence certificate from University Grants Commission (UGC) of Bangladesh.',
      '<strong>No 3rd Division/Class/GPA/CGPA in any academic examination is acceptable.</strong>'
    ],
    experience: [
      'At least 02 (two) years of professional experience in the relevant field as on 31.05.2026.',
      'Experience in an Advertising Agency, Digital Media Agency, Corporate House will be preferred.',
      'Practical experience in preparing short-form digital video content and motion graphics for social media platforms is highly desirable.'
    ],
    technicalProficiency: [
      'Strong proficiency in Adobe Photoshop, Illustrator and InDesign.',
      'Practical working knowledge in Adobe After Effects and Adobe Premiere Pro is mandatory.',
      'Knowledge in motion graphics, video editing, animated typography, color grading, audio synchronization and digital visual content preparation.',
      'Familiarity with social media content format and digital campaign requirements.',
      'Strong creativity, attention to detail and visual storytelling ability.',
      'Ability to work under pressure and manage multiple assignments within tight deadlines.'
    ],
    ageLimitText: 'Not over 32 years as on 31 May 2026. No affidavit in respect of age will be acceptable.',
    remunerationText: 'Selected candidate will be on probation for 01 (one) year with a consolidated monthly pay of Tk. 26,000/-. Upon successful completion of the probation period, he/she will be confirmed as Assistant Junior Officer with monthly gross salary of Tk. 45,375/- as per Bank\'s existing pay scale.',
    portfolioText: 'Candidates must provide a professional portfolio (online link or digital file) containing graphic design, digital content, motion graphics and/or video works during the selection process.',
    applyUrl: 'https://www.pubalibangla.com/career',
    closingText: '16 July 2026 by 6:00 p.m.'
  };

  /* Authentic SVG Stamp of Pubali Bank PLC Human Resources Division */
  function renderOfficialSealSvg(uid) {
    var idTop = 'stamp-arc-top-' + uid;
    var idBtm = 'stamp-arc-btm-' + uid;
    return '<div class="notice-official-seal" title="Official Stamp - Human Resources Division, Pubali Bank PLC">' +
      '<svg width="118" height="118" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
      '<path id="' + idTop + '" d="M 22 70 A 48 48 0 0 1 118 70" fill="none" />' +
      '<path id="' + idBtm + '" d="M 118 70 A 48 48 0 0 1 22 70" fill="none" />' +
      '</defs>' +
      '<!-- Outer Concentric Rings -->' +
      '<circle cx="70" cy="70" r="65" stroke="#52367d" stroke-width="2.4" stroke-dasharray="160 3" opacity="0.88" />' +
      '<circle cx="70" cy="70" r="59" stroke="#52367d" stroke-width="1.2" opacity="0.82" />' +
      '<circle cx="70" cy="70" r="41" stroke="#52367d" stroke-width="1.3" opacity="0.82" />' +
      '<!-- Top Curved Text -->' +
      '<text font-size="8.2" font-weight="700" fill="#52367d" letter-spacing="1.2" opacity="0.9">' +
      '<textPath href="#' + idTop + '" startOffset="50%" text-anchor="middle">HUMAN RESOURCES DIVISION</textPath>' +
      '</text>' +
      '<!-- Bottom Curved Text -->' +
      '<text font-size="8.8" font-weight="700" fill="#52367d" letter-spacing="1.4" opacity="0.9">' +
      '<textPath href="#' + idBtm + '" startOffset="50%" text-anchor="middle">PUBALI BANK PLC.</textPath>' +
      '</text>' +
      '<!-- Star accents -->' +
      '<text x="17" y="73" font-size="9" fill="#52367d" opacity="0.85">&#9733;</text>' +
      '<text x="115" y="73" font-size="9" fill="#52367d" opacity="0.85">&#9733;</text>' +
      '<!-- Center Emblem and Head Office text -->' +
      '<polygon points="70,47 73,56 82,57 75,63 77,72 70,67 63,72 65,63 58,57 67,56" fill="#52367d" opacity="0.8" />' +
      '<text x="70" y="80" font-size="7.5" font-weight="700" fill="#52367d" text-anchor="middle" letter-spacing="0.8" opacity="0.92">HEAD OFFICE</text>' +
      '<text x="70" y="89" font-size="7.5" font-weight="700" fill="#52367d" text-anchor="middle" letter-spacing="0.8" opacity="0.92">DHAKA</text>' +
      '</svg>' +
      '</div>';
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function numberToWords(num) {
    var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    num = parseInt(num, 10);
    if (isNaN(num) || num <= 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ones[num % 10] : '');
    }
    if (num < 1000) {
      var rem = num % 100;
      var remStr = rem ? (' and ' + numberToWords(rem)) : '';
      return ones[Math.floor(num / 100)] + ' hundred' + remStr;
    }
    return String(num);
  }

  function formatVacancies(num) {
    var n = parseInt(num, 10);
    if (isNaN(n) || n <= 0) n = 1;
    var pad = n < 10 ? ('0' + n) : String(n);
    var word = numberToWords(n);
    return word ? (pad + ' (' + word + ')') : pad;
  }

  function formatYears(num) {
    var n = parseFloat(num);
    if (isNaN(n) || n <= 0) return '0';
    var intN = Math.floor(n);
    var isInt = (n === intN);
    var pad = intN < 10 ? ('0' + intN) : String(intN);
    var word = numberToWords(intN);
    if (!isInt) {
      return n + ' years';
    }
    var unit = n === 1 ? 'year' : 'years';
    return word ? (pad + ' (' + word + ') ' + unit) : (n + ' ' + unit);
  }

  function formatDotDate(v) {
    if (!v) return '';
    var d = (v instanceof Date) ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    var day = d.getDate() < 10 ? '0' + d.getDate() : String(d.getDate());
    var m = (d.getMonth() + 1) < 10 ? '0' + (d.getMonth() + 1) : String(d.getMonth() + 1);
    return day + '.' + m + '.' + d.getFullYear();
  }

  function uploadCircularModal(c, onUploaded) {
    var selectedFile = null;
    var selectedDataUrl = null;

    var modalHtml =
      '<div class="mb-2">' +
      '<div class="circular-dropzone mb-3 position-relative" id="circular-dropzone">' +
      '<input type="file" id="modal-circular-file-input" accept=".pdf,image/png,image/jpeg,image/webp,image/jpg" class="d-none">' +
      '<div class="dropzone-icon mb-2">' +
      '<i class="bi bi-cloud-arrow-up" style="font-size: 2.8rem;"></i>' +
      '</div>' +
      '<h6 class="fw-bold text-dark mb-1">Click to browse or drag &amp; drop circular document</h6>' +
      '<p class="fs-12 text-muted mb-2.5">Supports official PDF notices (.pdf) or clear image scans (.png, .jpg, .jpeg) up to 25 MB</p>' +
      '<button type="button" class="btn btn-sm btn-outline-primary fw-semibold px-3 py-1.5" id="btn-browse-trigger">' +
      '<i class="bi bi-folder2-open me-1"></i> Choose File from Computer' +
      '</button>' +
      '</div>' +

      '<!-- Selected File Card (Hidden until file selected) -->' +
      '<div id="dropzone-file-card" class="card border rounded-3 p-3 bg-white mb-2 d-none shadow-xs">' +
      '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div id="file-card-icon" class="rounded-2 p-2 bg-danger-subtle text-danger fs-4">' +
      '<i class="bi bi-file-earmark-pdf-fill"></i>' +
      '</div>' +
      '<div>' +
      '<div class="fw-bold text-dark fs-13" id="file-card-name">document.pdf</div>' +
      '<div class="text-muted fs-11" id="file-card-size">0 KB</div>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="btn btn-sm btn-outline-danger" id="btn-clear-selected-file" title="Clear selection">' +
      '<i class="bi bi-trash3 me-1"></i> Clear' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    ui.modal({
      title: '<i class="bi bi-cloud-arrow-up-fill text-primary me-2"></i>Upload Job Circular Notice',
      size: 'lg',
      body: modalHtml,
      footer:
        '<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>' +
        '<button type="button" class="btn btn-primary fw-semibold" id="btn-confirm-upload" disabled>' +
        '<i class="bi bi-check2-circle me-1"></i> Upload &amp; Show in Preview' +
        '</button>',
      onShow: function (api) {
        var dropzone = api.find('#circular-dropzone');
        var fileInput = api.find('#modal-circular-file-input');
        var browseTrigger = api.find('#btn-browse-trigger');
        var fileCard = api.find('#dropzone-file-card');
        var fileNameEl = api.find('#file-card-name');
        var fileSizeEl = api.find('#file-card-size');
        var fileIconEl = api.find('#file-card-icon');
        var clearBtn = api.find('#btn-clear-selected-file');
        var confirmBtn = api.find('#btn-confirm-upload');

        function updateFileCard(name, size, type, dataUrl) {
          selectedFile = { name: name, size: size, type: type || 'application/pdf' };
          selectedDataUrl = dataUrl;

          if (fileNameEl) fileNameEl.textContent = name;
          if (fileSizeEl) fileSizeEl.textContent = formatBytes(size);

          var isPdf = /\.pdf$/i.test(name) || (type && type.indexOf('pdf') !== -1);
          if (fileIconEl) {
            if (isPdf) {
              fileIconEl.className = 'rounded-2 p-2 bg-danger-subtle text-danger fs-4';
              fileIconEl.innerHTML = '<i class="bi bi-file-earmark-pdf-fill"></i>';
            } else {
              fileIconEl.className = 'rounded-2 p-2 bg-primary-subtle text-primary fs-4';
              fileIconEl.innerHTML = '<i class="bi bi-file-earmark-image-fill"></i>';
            }
          }

          if (fileCard) fileCard.classList.remove('d-none');
          if (confirmBtn) confirmBtn.removeAttribute('disabled');
        }

        function clearSelected() {
          selectedFile = null;
          selectedDataUrl = null;
          if (fileInput) fileInput.value = '';
          if (fileCard) fileCard.classList.add('d-none');
          if (confirmBtn) confirmBtn.setAttribute('disabled', 'disabled');
        }

        function handleFile(file) {
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function (evt) {
            updateFileCard(file.name, file.size, file.type, evt.target.result);
          };
          reader.readAsDataURL(file);
        }

        if (browseTrigger) {
          browseTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (fileInput) fileInput.click();
          });
        }

        if (dropzone) {
          dropzone.addEventListener('click', function () {
            if (fileInput) fileInput.click();
          });

          ['dragenter', 'dragover'].forEach(function (evtName) {
            dropzone.addEventListener(evtName, function (e) {
              e.preventDefault();
              e.stopPropagation();
              dropzone.classList.add('is-dragover');
            });
          });

          ['dragleave', 'drop'].forEach(function (evtName) {
            dropzone.addEventListener(evtName, function (e) {
              e.preventDefault();
              e.stopPropagation();
              dropzone.classList.remove('is-dragover');
            });
          });

          dropzone.addEventListener('drop', function (e) {
            var dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length) {
              handleFile(dt.files[0]);
            }
          });
        }

        if (fileInput) {
          fileInput.addEventListener('change', function () {
            if (fileInput.files && fileInput.files.length) {
              handleFile(fileInput.files[0]);
            }
          });
        }

        if (clearBtn) {
          clearBtn.addEventListener('click', function () {
            clearSelected();
          });
        }

        if (confirmBtn) {
          confirmBtn.addEventListener('click', function () {
            if (!selectedFile || !selectedDataUrl) return;

            var uploadedDoc = {
              name: selectedFile.name,
              size: selectedFile.size,
              type: selectedFile.type,
              dataUrl: selectedDataUrl,
              uploadedAt: new Date().toISOString()
            };

            c.uploadedFile = uploadedDoc;
            if (c.isDraft || c.id === 'draft') {
              if (store.saveDraftCircular) store.saveDraftCircular(c);
            } else {
              store.update('circulars', c.id, { uploadedFile: uploadedDoc });
            }

            api.close();
            ui.toast('Circular document "' + selectedFile.name + '" uploaded and displayed in preview.', 'success');
            if (onUploaded) onUploaded(uploadedDoc);
          });
        }
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
      var allCircs = store.all('circulars');
      if (allCircs.length) {
        c = allCircs[allCircs.length - 1];
      } else {
        // Fallback sample object based on Graphic Designer notice
        c = {
          id: 'draft',
          isDraft: true,
          code: GRAPHIC_DESIGNER_DATA.code,
          post: GRAPHIC_DESIGNER_DATA.post,
          title: 'Recruitment of ' + GRAPHIC_DESIGNER_DATA.post,
          vacancies: 1,
          applyStart: '2026-06-01',
          applyEnd: '2026-07-16',
          applyEndTime: '6:00 p.m.',
          eligibilityRules: []
        };
      }
    }

    var isDraft = c.isDraft || c.id === 'draft';
    var editStep1Url = isDraft ? '#/circulars/new' : ('#/circulars/new/' + c.id);
    var step1Target = editStep1Url;
    var step2Target = '#/circulars/new-eligibility/' + (isDraft ? 'draft' : c.id);
    var step4Target = '#/circulars/new-approval/' + (isDraft ? 'draft' : c.id);

    ERec.router.setCrumbs([
      { label: 'Job Circulars', href: '#/circulars' },
      { label: 'Create Job Posting', href: editStep1Url },
      { label: 'Job Preview' }
    ]);

    var uploadedDoc = c.uploadedFile || null;
    var activePreviewSource = uploadedDoc ? 'UPLOADED' : 'TEMPLATE';

    // Active state toggles for toolbar
    var currentViewMode = 'ALL'; // 'ALL', 'PAGE_1', 'PAGE_2'
    var currentZoom = 100;       // 85, 100, 115

    function getDocData() {
      var post = (c && c.post) ? String(c.post).trim() : 'Officer (General)';
      var title = (c && c.title) ? String(c.title).trim() : ('Recruitment of ' + post);
      var isGraphicNotice = /graphic|design/i.test(post) || /graphic|design/i.test(title);

      var rules = (c && c.eligibilityRules) || [];
      var activeRules = rules.filter(function (r) { return r && r.status !== 'INACTIVE'; });

      // Step 1: Basic Information Mapping
      var code = (c && c.code) || 'HRD/REC/2026/01';
      var vacNum = parseInt(c && c.vacancies, 10) || 1;
      var vacanciesText = formatVacancies(vacNum);

      var rankStr = (c && c.rank) || (isGraphicNotice && /junior/i.test(title) ? 'Trainee Assistant Junior Officer' : '');
      var postLine;
      if (rankStr && rankStr.toLowerCase() !== post.toLowerCase()) {
        postLine = fmt.esc(post) + ' in the rank of ' + fmt.esc(rankStr);
      } else {
        postLine = fmt.esc(post);
      }

      var applyEndRaw = (c && c.applyEnd) || '2026-07-16';
      var deadlineTime = (c && c.applyEndTime)
        ? (/AM|PM/i.test(c.applyEndTime) ? c.applyEndTime : (fmt.time12(c.applyEndTime) || c.applyEndTime))
        : '6:00 p.m.';
      var closingDate = fmt.date(applyEndRaw);
      var closingText = closingDate + (deadlineTime ? (' by ' + deadlineTime) : '');

      var intro = (c && c.intro) || (isGraphicNotice
        ? GRAPHIC_DESIGNER_DATA.intro
        : ('Pubali Bank PLC., a leading largest private commercial bank with 519 online branches, 21 Islamic Banking Windows and 281 Sub-branches with a diverse and motivated workforce looking for versatile, high-energy and goal-oriented Bangladeshi citizens for the position of <strong>' + fmt.esc(post) + '</strong> who fulfil the following criteria and have the ability to contribute to the progressive growth of the Bank.'));

      // Section A: Key Job Responsibilities (from Step 1 or tailored to post)
      var responsibilities = [];
      if (c && c.responsibilities && Array.isArray(c.responsibilities) && c.responsibilities.length) {
        responsibilities = c.responsibilities.map(function (item) { return fmt.esc(item); });
      } else if (c && typeof c.responsibilities === 'string' && c.responsibilities.trim()) {
        responsibilities = c.responsibilities.split('\n').map(function (s) { return fmt.esc(s.trim()); }).filter(Boolean);
      } else if (isGraphicNotice) {
        responsibilities = GRAPHIC_DESIGNER_DATA.responsibilities.slice();
      } else if (/software|developer|programmer|engineer|it\b/i.test(post)) {
        responsibilities = [
          'Analyze functional and technical requirements to design, develop, and maintain robust core banking applications.',
          'Ensure database integrity, system availability, and high-performance secure transaction processing.',
          'Perform system troubleshooting, code refactoring, bug fixing, and continuous software performance optimization.',
          'Collaborate with cross-functional branch and divisional teams to integrate banking services and modern APIs.',
          'Ensure strict adherence to corporate governance, information security protocols, and Bangladesh Bank ICT guidelines.'
        ];
      } else {
        responsibilities = [
          'Execute operational, administrative, and customer service activities in compliance with Bank policy.',
          'Manage daily transactions, documentation processing, and regulatory compliance procedures.',
          'Coordinate with cross-functional branch and divisional teams to ensure standard service delivery.',
          'Prepare periodic analytical reports, account reconciliations, and departmental presentations.',
          'Ensure adherence to corporate governance, information security, and internal control guidelines.'
        ];
      }

      // Section B: Educational Qualification (Step 2: DEGREE_LEVEL, SUBJECT, RESULT_GRADE)
      var degRule = activeRules.find(function (r) { return r.type === 'DEGREE_LEVEL'; });
      var subRule = activeRules.find(function (r) { return r.type === 'SUBJECT'; });
      var resRule = activeRules.find(function (r) { return r.type === 'RESULT_GRADE'; });

      var qualifications = [];
      var degLevel = (degRule && degRule.degreeLevel) || (subRule && subRule.degreeLevel) || (c && c.minDegreeLevel) || '';
      var allowedSubs = (subRule && subRule.allowedSubjects) ? String(subRule.allowedSubjects).trim() : '';

      if (degLevel && allowedSubs) {
        qualifications.push('Minimum <strong>' + fmt.esc(degLevel) + '</strong> degree in <strong>' + fmt.esc(allowedSubs) + '</strong> from any UGC recognized university.');
      } else if (degLevel) {
        qualifications.push('Minimum <strong>' + fmt.esc(degLevel) + '</strong> degree from any UGC recognized university.');
      } else if (allowedSubs) {
        qualifications.push('Graduation / Post-Graduation degree in <strong>' + fmt.esc(allowedSubs) + '</strong> from any UGC recognized university.');
      } else if (isGraphicNotice) {
        qualifications.push('04 (four) years Diploma in Graphic Design/Fine Arts from a recognized polytechnic institute. Preference will be given to the candidates having Graduation in Graphic Design, Fine Arts, Creative Media, Multimedia, Visual Communication or related discipline from a reputed university.');
      } else {
        qualifications.push('Minimum <strong>Bachelor/Master</strong> degree from any UGC recognized university.');
      }

      if (degRule && degRule.mandatory === false) {
        qualifications.push('Higher academic degrees or additional relevant qualifications will be given preference.');
      }

      qualifications.push('Only published result (by the competent authority) will be accepted. Testimonial for this matter will not be accepted.');
      qualifications.push('Candidates having foreign degree must obtain equivalence certificate from University Grants Commission (UGC) of Bangladesh.');

      if (resRule && (resRule.divisionText || resRule.minGpa || resRule.minCgpa)) {
        var divText = resRule.divisionText ? (resRule.divisionText + ' Division/Class') : '3rd Division/Class';
        var gpaParts = [];
        if (resRule.minGpa) gpaParts.push('minimum GPA of ' + Number(resRule.minGpa).toFixed(2) + ' on a 05.0 scale (Secondary/Higher Secondary)');
        if (resRule.minCgpa) gpaParts.push('minimum CGPA of ' + Number(resRule.minCgpa).toFixed(2) + ' on a 04.0 scale (Bachelor or Higher Degree)');
        var gpaText = gpaParts.length ? (', and ' + gpaParts.join(', and ') + ' is required') : '';
        qualifications.push('<strong>No ' + fmt.esc(divText) + '/GPA/CGPA in any academic examination is acceptable' + gpaText + '.</strong>');
      } else {
        qualifications.push('<strong>No 3rd Division/Class/GPA/CGPA in any academic examination is acceptable.</strong>');
      }

      // Section C: Experience (Step 2: EXPERIENCE)
      var expRule = activeRules.find(function (r) { return r.type === 'EXPERIENCE'; });
      var experience = [];

      var ageRule = activeRules.find(function (r) { return r.type === 'AGE'; });
      var expAsOnRaw = (ageRule && ageRule.asOn) || applyEndRaw;
      var expAsOnFormatted = formatDotDate(expAsOnRaw) || fmt.date(expAsOnRaw);

      if (expRule && expRule.minYears !== '' && expRule.minYears !== null && !isNaN(expRule.minYears)) {
        var minYearsNum = parseFloat(expRule.minYears);
        if (minYearsNum > 0) {
          experience.push('At least ' + formatYears(minYearsNum) + ' of professional experience in the relevant field as on ' + expAsOnFormatted + '.');
        } else {
          experience.push('Fresh candidates are eligible to apply. No prior professional experience is required as on ' + expAsOnFormatted + '.');
        }
      } else if (isGraphicNotice) {
        experience.push('At least 02 (two) years of professional experience in the relevant field as on ' + expAsOnFormatted + '.');
      } else {
        experience.push('At least 02 (two) years of professional experience in the relevant discipline as on ' + expAsOnFormatted + '.');
      }

      if (expRule && expRule.industry) {
        experience.push('Experience in ' + fmt.esc(expRule.industry) + ' or reputable corporate houses will be preferred.');
      } else if (isGraphicNotice) {
        experience.push('Experience in an Advertising Agency, Digital Media Agency, Corporate House will be preferred.');
      } else {
        experience.push('Experience in financial institutions, banking sector or reputable corporate houses will be preferred.');
      }

      if (expRule && (expRule.designationKeywords || expRule.responsibilityKeywords)) {
        var desigKeywords = ERec.seed.ExcelList(expRule.designationKeywords);
        var respKeywords = ERec.seed.ExcelList(expRule.responsibilityKeywords);
        var expParts = [];
        if (desigKeywords.length) expParts.push('working as ' + desigKeywords.join(' / '));
        if (respKeywords.length) expParts.push('handling ' + respKeywords.join(' / '));
        experience.push('Practical working exposure ' + expParts.join(' and ') + ' is highly desirable.');
      } else if (isGraphicNotice) {
        experience.push('Practical experience in preparing short-form digital video content and motion graphics for social media platforms is highly desirable.');
      } else {
        experience.push('Demonstrated analytical mindset and proficiency in operational workflows.');
      }

      // Section D: Technical Proficiency (Step 2: OTHERS)
      var otherRules = activeRules.filter(function (r) { return r.type === 'OTHERS'; });
      var customProficiencies = [];
      otherRules.forEach(function (r) {
        var items = ERec.seed.ExcelList(r.otherCriteria);
        items.forEach(function (it) {
          if (it && customProficiencies.indexOf(it) === -1) {
            customProficiencies.push(it);
          }
        });
      });

      var technicalProficiency = [];
      if (customProficiencies.length > 0) {
        customProficiencies.forEach(function (crit) {
          if (/^strong|practical|hands-on|knowledge|ability|familiarity/i.test(crit)) {
            technicalProficiency.push(fmt.esc(crit) + (crit.slice(-1) === '.' ? '' : '.'));
          } else {
            technicalProficiency.push('Working proficiency and practical knowledge in ' + fmt.esc(crit) + '.');
          }
        });
        if (technicalProficiency.length < 3) {
          technicalProficiency.push('Strong analytical, problem-solving, and professional communication capabilities.');
          technicalProficiency.push('Ability to work under pressure and achieve deliverables within tight deadlines.');
        }
      } else if (isGraphicNotice) {
        technicalProficiency = GRAPHIC_DESIGNER_DATA.technicalProficiency.slice();
      } else if (/software|developer|programmer|engineer|it\b/i.test(post)) {
        technicalProficiency = [
          'Strong proficiency in core programming languages, modern frameworks, and database architecture.',
          'Practical working knowledge in RESTful APIs, version control (Git), and secure coding practices.',
          'Hands-on experience in system debugging, troubleshooting, and performance tuning.',
          'Familiarity with banking information security guidelines and enterprise IT governance.',
          'Ability to collaborate with cross-functional technical teams and deliver under tight deadlines.'
        ];
      } else {
        technicalProficiency = [
          'Strong proficiency in standard office productivity software (MS Word, Excel, PowerPoint).',
          'Practical working knowledge of modern database platforms and banking ERP systems.',
          'Strong analytical, problem-solving, and professional communication capabilities.',
          'Ability to work under pressure and achieve deliverables within tight deadlines.'
        ];
      }

      // Section E: Age Limit (Step 2: AGE)
      var maxAge = (ageRule && ageRule.maxAge) ? ageRule.maxAge : ((c && c.maxAge) || (isGraphicNotice ? 32 : 30));
      var ageAsOnRaw = (ageRule && ageRule.asOn) || applyEndRaw;
      var ageAsOnText = fmt.date(ageAsOnRaw);
      var ageLimitText;
      if (ageRule && ageRule.minAge && ageRule.minAge > 18) {
        ageLimitText = 'Between ' + ageRule.minAge + ' and ' + maxAge + ' years as on ' + ageAsOnText + '. No affidavit in respect of age will be acceptable.';
      } else {
        ageLimitText = 'Not over ' + maxAge + ' years as on ' + ageAsOnText + '. No affidavit in respect of age will be acceptable.';
      }

      // Section F: General Conditions & Selection Sequence (from Step 1 stages)
      var remunerationText;
      if (c && c.remunerationText) {
        remunerationText = c.remunerationText;
      } else if (isGraphicNotice) {
        remunerationText = GRAPHIC_DESIGNER_DATA.remunerationText;
      } else {
        var confirmRank = (c && c.rank) || post || 'Officer';
        remunerationText = 'Selected candidate will be on probation for 01 (one) year with a consolidated monthly pay as per Bank scale. Upon successful completion of the probation period, he/she will be confirmed as ' + fmt.esc(confirmRank) + ' in regular pay scale.';
      }

      var portfolioTitle = isGraphicNotice ? 'Portfolio' : 'Credentials & Verification';
      var portfolioText;
      if (c && c.portfolioText) {
        portfolioText = c.portfolioText;
      } else if (isGraphicNotice) {
        portfolioText = GRAPHIC_DESIGNER_DATA.portfolioText;
      } else if (/software|developer|programmer|engineer|it\b/i.test(post)) {
        portfolioText = 'Candidates may provide links to public code repositories, technical certifications, and system demonstrations during the selection process.';
      } else {
        portfolioText = 'Candidates may provide professional credentials, certifications, and academic achievements during the selection process. Original certificates and mark sheets must be presented during interview/viva-voce.';
      }

      var stages = (c && c.stages) || [];
      var stageNames = stages.map(function (s) {
        var type = s.type || s;
        if (type === 'MCQ') return 'MCQ test';
        if (type === 'WRITTEN') return 'written examination';
        if (type === 'PRACTICAL') return 'practical test';
        if (type === 'VIVA') return 'viva-voce';
        return s.name || type;
      });

      var selectionProcedureText;
      if (stageNames.length) {
        var stgText = stageNames.join(', ');
        var lastComma = stgText.lastIndexOf(',');
        if (lastComma !== -1) {
          stgText = stgText.slice(0, lastComma) + ' and/or ' + stgText.slice(lastComma + 2);
        }
        selectionProcedureText = 'Only shortlisted candidates will be called for the recruitment process (' + stgText + ').';
      } else {
        selectionProcedureText = 'Only shortlisted candidates will be called for the recruitment process (practical test and/or interview).';
      }

      return {
        code: code,
        post: post,
        rank: rankStr,
        postLine: postLine,
        vacanciesText: vacanciesText,
        intro: intro,
        responsibilities: responsibilities,
        qualifications: qualifications,
        experience: experience,
        technicalProficiency: technicalProficiency,
        ageLimitText: ageLimitText,
        remunerationText: remunerationText,
        portfolioTitle: portfolioTitle,
        portfolioText: portfolioText,
        selectionProcedureText: selectionProcedureText,
        applyUrl: (c && c.applyUrl) || 'https://www.pubalibangla.com/career',
        closingText: closingText
      };
    }

    function buildLetterheadHtml() {
      return '<div class="notice-letterhead">' +
        '<div class="notice-brand-logo">' +
        '<img src="assets/images/pbplc.svg" alt="Pubali Bank PLC Logo">' +
        '</div>' +
        '<div class="notice-hrd-contact">' +
        '<div class="notice-hrd-title">HUMAN RESOURCES DIVISION</div>' +
        '<div class="notice-hrd-line">Head Office, Level 4, 26 Dilkusha C/A, Dhaka 1000</div>' +
        '<div class="notice-hrd-line">Tel: 88 02 223381614 (PABX)</div>' +
        '<div class="notice-hrd-line">' +
        '<a href="mailto:hrd@pubalibankbd.com">hrd@pubalibankbd.com</a> | ' +
        '<a href="https://www.pubalibangla.com" target="_blank" rel="noopener noreferrer">www.pubalibangla.com</a>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="notice-header-rule"></div>';
    }

    function buildPage1Html(data) {
      return '<div class="notice-sheet" id="notice-sheet-1" style="min-height: auto;">' +
        '<div class="notice-page-badge">Page 1 of 1</div>' +

        buildLetterheadHtml() +

        '<!-- Centered Career Opportunity Title -->' +
        '<div class="notice-doc-title">CAREER OPPORTUNITY</div>' +

        '<!-- Opening Paragraph -->' +
        '<div class="notice-intro-text">' + data.intro + '</div>' +

        '<!-- Position & Vacancy -->' +
        '<div class="notice-post-line">' + data.postLine + '</div>' +
        '<div class="notice-post-count">No. of Post: ' + data.vacanciesText + '</div>' +

        '<!-- Terms and conditions header -->' +
        '<div class="notice-terms-title">Required terms &amp; conditions are as follows:</div>' +

        '<!-- Section A: Educational Qualification -->' +
        '<div class="notice-sec-heading">A. Educational Qualification:</div>' +
        '<ul class="notice-bullet-list">' +
        data.qualifications.map(function (item) {
          return '<li>' + item + '</li>';
        }).join('') +
        '</ul>' +

        '<!-- Section B: Experience -->' +
        '<div class="notice-sec-heading">B. Experience:</div>' +
        '<ul class="notice-bullet-list mb-3">' +
        data.experience.map(function (item) {
          return '<li>' + item + '</li>';
        }).join('') +
        '</ul>' +

        '<!-- Section C: Age limit -->' +
        '<div class="mb-3" style="font-size: 13px; line-height: 1.6; color: #111827;">' +
        '<strong>C. Age limit:</strong> ' + data.ageLimitText +
        '</div>' +

        '<!-- Section D: General Conditions -->' +
        '<div class="notice-sec-heading">D. General Conditions:</div>' +
        '<ol class="notice-numbered-list">' +
        '<li><strong>Remuneration:</strong> ' + data.remunerationText + '</li>' +
        '<li>In-house candidates are not permitted to apply.</li>' +
        '<li><strong>' + (data.portfolioTitle || 'Portfolio') + ':</strong><br>' + data.portfolioText + '</li>' +
        '</ol>' +

        '<ul class="notice-arrow-list">' +
        '<li><span class="arrow-icon">&#10148;</span> Proficiency in both Bengali and English is required.</li>' +
        '<li><span class="arrow-icon">&#10148;</span> All applications will be treated confidentially and evaluated strictly on merit.</li>' +
        '<li><span class="arrow-icon">&#10148;</span> Any incorrect or misleading information will cancel the candidature.</li>' +
        '<li><span class="arrow-icon">&#10148;</span> ' + (data.selectionProcedureText || 'Only shortlisted candidates will be called for the recruitment process (practical test and/or interview).') + '</li>' +
        '</ul>' +

        '<!-- Apply Instructions -->' +
        '<div class="notice-apply-section mt-3 mb-2 position-relative">' +
        '<div class="notice-apply-title">Apply Instructions:</div>' +
        '<p class="mb-2" style="text-align: justify;">' +
        'Interested candidates who fulfill the requirements should apply online, link: ' +
        '<a href="' + data.applyUrl + '" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: #111827; text-decoration: underline;">' + data.applyUrl + '</a> ' +
        'with recent passport size scanned colored photograph &amp; signature. After filling up the online application, the applicant will receive an Applicant Identification Number which should be preserved for future use. The closing date for submission of application is ' +
        '<strong style="text-decoration: underline;">' + data.closingText + '</strong>.' +
        '</p>' +
        '<p class="fw-bold mb-2" style="color: #111827;">' +
        'To avoid possible inconvenience due to server congestion, please apply well ahead of the deadline.' +
        '</p>' +
        '<p class="mb-4" style="color: #374151;">' +
        'Management of the Bank reserves the right to reject any or all applications without assigning any reason whatsoever.' +
        '</p>' +

        '<!-- Official Seal at bottom-right corner of Page -->' +
        renderOfficialSealSvg('p1') +
        '</div>' +

        '<!-- Sheet Footer Indicator -->' +
        '<div class="notice-sheet-footer">' +
        '<span>Pubali Bank PLC &middot; Circular Notice ' + fmt.esc(data.code) + '</span>' +
        '<span>Page 1 of 1</span>' +
        '</div>' +

        '</div>';
    }

    function buildPage2Html(data) {
      return '';
    }

    function buildUploadedFileView(doc) {
      if (!doc) return '';
      var isPdf = /\.pdf$/i.test(doc.name) || (doc.type && doc.type.indexOf('pdf') !== -1);

      var viewerContent = '';
      if (isPdf) {
        viewerContent =
          '<div class="pdf-viewer-embed-wrap">' +
          '<object data="' + doc.dataUrl + '" type="application/pdf" style="width: 100%; height: 100%;">' +
          '<iframe src="' + doc.dataUrl + '" style="width: 100%; height: 100%; border: none;" title="Uploaded Circular PDF Preview"></iframe>' +
          '</object>' +
          '</div>';
      } else {
        viewerContent =
          '<div class="p-4 bg-light text-center" style="min-height: 500px; display: flex; align-items: center; justify-content: center;">' +
          '<img src="' + doc.dataUrl + '" alt="' + fmt.esc(doc.name) + '" class="img-fluid rounded shadow-sm border bg-white p-2" style="max-height: 1000px; object-fit: contain;">' +
          '</div>';
      }

      return '<div class="uploaded-doc-preview-backdrop" id="circular-notice-document">' +
        '<div class="uploaded-doc-container bg-white rounded-3 border overflow-hidden" style="max-width: 980px; margin: 0 auto;">' +
        '<div class="p-3 bg-light border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">' +
        '<div class="d-flex align-items-center gap-3">' +
        '<div class="rounded-2 p-2 ' + (isPdf ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary') + '">' +
        '<i class="bi ' + (isPdf ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark-image-fill') + ' fs-5"></i>' +
        '</div>' +
        '<div>' +
        '<div class="fw-bold fs-13 text-dark">' + fmt.esc(doc.name) + '</div>' +
        '<div class="fs-11 text-muted">Uploaded Official Document &middot; ' + formatBytes(doc.size) + ' &middot; ' + fmt.ago(doc.uploadedAt || new Date()) + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2">' +
        '<button type="button" class="btn btn-sm btn-outline-primary fw-semibold" id="btn-reupload-file">' +
        '<i class="bi bi-cloud-arrow-up me-1"></i> Replace Document' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger fw-semibold" id="btn-remove-uploaded-file">' +
        '<i class="bi bi-trash3 me-1"></i> Remove File' +
        '</button>' +
        '</a>' +
        '</div>' +
        '</div>' +
        viewerContent +
        '</div>' +
        '</div>';
    }

    function buildNoticeDocumentView() {
      var data = getDocData();
      var zoomScale = currentZoom / 100;
      var zoomStyle = zoomScale !== 1 ? 'style="transform: scale(' + zoomScale + ');"' : '';

      return '<div class="preview-notice-backdrop" id="circular-notice-document">' +
        '<div class="notice-sheet-wrapper" id="notice-sheet-wrapper" ' + zoomStyle + '>' +
        buildPage1Html(data) +
        '</div>' +
        '</div>';
    }

    function buildToolbarHtml() {
      var isUploadedActive = activePreviewSource === 'UPLOADED' && uploadedDoc;

      var leftHtml = '';
      if (uploadedDoc) {
        leftHtml =
          '<span class="badge ' + (isUploadedActive ? 'bg-primary' : 'bg-secondary') + ' text-white px-2.5 py-1.5 fs-12 fw-semibold d-inline-flex align-items-center gap-1.5 shadow-xs">' +
          '<i class="bi bi-file-earmark-check-fill"></i> Uploaded Circular Active' +
          '</span>' +
          '<div class="btn-group btn-group-sm" role="group" aria-label="Preview Source">' +
          '<button type="button" class="btn btn-outline-secondary btn-src-toggle ' + (isUploadedActive ? 'active' : '') + '" data-source="UPLOADED" title="View uploaded circular document">' +
          '<i class="bi bi-file-earmark-arrow-up me-1"></i> Uploaded Document' +
          '</button>' +
          '<button type="button" class="btn btn-outline-secondary btn-src-toggle ' + (!isUploadedActive ? 'active' : '') + '" data-source="TEMPLATE" title="View generated notice template">' +
          '<i class="bi bi-file-earmark-text me-1"></i> System Circular' +
          '</button>' +
          '</div>';
      } else {
        leftHtml =
          '<span class="badge bg-success text-white px-2.5 py-1.5 fs-12 fw-semibold d-inline-flex align-items-center gap-1 shadow-xs">' +
          '<i class="bi bi-file-earmark-pdf-fill"></i> Official Circular Notice' +
          '</span>' +
          '<span class="badge bg-light text-dark border px-2.5 py-1.5 fs-12 fw-medium d-inline-flex align-items-center gap-1 shadow-2xs">' +
          '<i class="bi bi-file-earmark-check"></i> Page 1 of 1' +
          '</span>';
      }

      var rightHtml = '';
      if (!isUploadedActive) {
        rightHtml =
          '<div class="d-flex align-items-center gap-2 flex-wrap">' +
          '<!-- Zoom controls -->' +
          '<div class="btn-group btn-group-sm d-none d-md-inline-flex">' +
          '<button type="button" class="btn btn-outline-secondary" id="btn-zoom-out" title="Zoom Out"><i class="bi bi-zoom-out"></i></button>' +
          '<button type="button" class="btn btn-outline-secondary px-2 disabled fw-semibold text-dark" id="zoom-level-text">' + currentZoom + '%</button>' +
          '<button type="button" class="btn btn-outline-secondary" id="btn-zoom-in" title="Zoom In"><i class="bi bi-zoom-in"></i></button>' +
          '</div>' +

          '<!-- Edit dropdown -->' +
          '<div class="btn-group">' +
          '<button type="button" class="btn btn-sm btn-outline-success bg-white" id="btn-edit-circular">' +
          '<i class="bi bi-pencil me-1"></i> Edit' +
          '</button>' +
          '<button type="button" class="btn btn-sm btn-outline-success bg-white dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">' +
          '<span class="visually-hidden">Toggle Dropdown</span>' +
          '</button>' +
          '<ul class="dropdown-menu dropdown-menu-end shadow-sm">' +
          '<li><a class="dropdown-item fs-13" href="' + step1Target + '" id="link-edit-step1"><i class="bi bi-file-earmark-text me-2 text-success"></i>Edit Basic Information (Step 1)</a></li>' +
          '<li><a class="dropdown-item fs-13" href="' + step2Target + '" id="link-edit-step2"><i class="bi bi-shield-check me-2 text-success"></i>Edit Eligibility Rules (Step 2)</a></li>' +
          '<li><a class="dropdown-item fs-13" href="' + step4Target + '" id="link-edit-step4"><i class="bi bi-shield-lock me-2 text-success"></i>Edit Approval Channels (Step 4)</a></li>' +
          '</ul>' +
          '</div>' +

          '<!-- Print Notice Button -->' +
          '<button type="button" class="btn btn-sm btn-outline-dark bg-white shadow-xs fw-semibold" id="btn-quick-print" title="Print or save as PDF">' +
          '<i class="bi bi-printer-fill me-1 text-primary"></i> Print Notice' +
          '</button>' +
          '</div>';
      }

      return '<div class="preview-notice-toolbar d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2" style="max-width: 980px; margin: 0 auto;">' +
        '<div class="d-flex align-items-center gap-2 flex-wrap">' +
        leftHtml +
        '</div>' +
        rightHtml +
        '</div>';
    }

    function buildViewHtml() {
      var isUploadedActive = activePreviewSource === 'UPLOADED' && uploadedDoc;

      return '<div class="create-job-posting-container">' +
        ui.postingWizard(3, c.id) +

        buildToolbarHtml() +
        (isUploadedActive ? buildUploadedFileView(uploadedDoc) : buildNoticeDocumentView()) +

        '<!-- Bottom Actions Row -->' +
        '<div class="circular-action-bar d-flex align-items-center justify-content-between flex-wrap gap-2">' +
        '<button type="button" class="btn btn-outline-secondary btn-cancel-posting" id="btn-prev-step">' +
        '<i class="bi bi-arrow-left me-1"></i> Previous (Eligibility Rules)' +
        '</button>' +
        '<div class="d-flex align-items-center gap-3 flex-wrap">' +
        (uploadedDoc
          ? '<button type="button" class="btn btn-outline-primary fw-semibold" id="btn-upload-circular">' +
          '<i class="bi bi-cloud-arrow-up-fill me-1"></i> Upload Circular (Replace)' +
          '</button>' +
          '<span class="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fs-12 fw-medium d-inline-flex align-items-center gap-1 shadow-2xs">' +
          '<i class="bi bi-file-earmark-check-fill"></i> Document Uploaded' +
          '</span>'
          : '<button type="button" class="btn btn-outline-primary fw-semibold" id="btn-upload-circular">' +
          '<i class="bi bi-cloud-arrow-up-fill me-1"></i> Upload Circular' +
          '</button>') +
        '<button type="button" class="btn btn-save-next" id="btn-save-next">' +
        'Save &amp; Continue <i class="bi bi-arrow-right ms-1"></i>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }

    function bindEvents() {
      // Source toggle buttons (Uploaded Document vs Official Template)
      var srcToggles = view.querySelectorAll('.btn-src-toggle');
      srcToggles.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var src = btn.getAttribute('data-source');
          if (src === activePreviewSource) return;
          activePreviewSource = src;
          renderView();
        });
      });

      // Upload Circular Modal Triggers
      var uploadBtns = view.querySelectorAll('#btn-upload-circular, #btn-reupload-file');
      uploadBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          uploadCircularModal(c, function (newDoc) {
            uploadedDoc = newDoc;
            c.uploadedFile = newDoc;
            if (c.isDraft || c.id === 'draft') {
              if (store.saveDraftCircular) store.saveDraftCircular(c);
            } else {
              store.update('circulars', c.id, { uploadedFile: newDoc });
            }
            activePreviewSource = 'UPLOADED';
            renderView();
          });
        });
      });

      // Remove Uploaded Document Triggers
      var removeBtns = view.querySelectorAll('#btn-remove-uploaded-file');
      removeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          ui.confirm({
            title: 'Remove Uploaded Circular',
            body: 'Are you sure you want to remove the uploaded circular document and switch back to the official notice template?',
            okText: 'Remove File',
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            delete c.uploadedFile;
            uploadedDoc = null;
            activePreviewSource = 'TEMPLATE';
            if (c.isDraft || c.id === 'draft') {
              if (store.saveDraftCircular) store.saveDraftCircular(c);
            } else {
              store.update('circulars', c.id, { uploadedFile: null });
            }
            ui.toast('Uploaded document removed. Showing official notice template.', 'info');
            renderView();
          });
        });
      });

      // Page View Mode Toggles (All Pages / Page 1 / Page 2)
      var modeButtons = view.querySelectorAll('.btn-doc-toggle');
      modeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.getAttribute('data-mode');
          if (mode === currentViewMode) return;
          currentViewMode = mode;

          modeButtons.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');

          var sheet1 = view.querySelector('#notice-sheet-1');
          var sheet2 = view.querySelector('#notice-sheet-2');
          if (!sheet1 || !sheet2) return;

          if (currentViewMode === 'ALL') {
            sheet1.classList.remove('is-hidden');
            sheet2.classList.remove('is-hidden');
          } else if (currentViewMode === 'PAGE_1') {
            sheet1.classList.remove('is-hidden');
            sheet2.classList.add('is-hidden');
          } else if (currentViewMode === 'PAGE_2') {
            sheet1.classList.add('is-hidden');
            sheet2.classList.remove('is-hidden');
          }
        });
      });

      // Zoom In / Zoom Out
      var zoomText = view.querySelector('#zoom-level-text');
      var sheetWrapper = view.querySelector('#notice-sheet-wrapper');

      var zoomIn = view.querySelector('#btn-zoom-in');
      if (zoomIn) {
        zoomIn.addEventListener('click', function () {
          if (currentZoom >= 125) return;
          currentZoom += 15;
          if (zoomText) zoomText.textContent = currentZoom + '%';
          if (sheetWrapper) sheetWrapper.style.transform = 'scale(' + (currentZoom / 100) + ')';
        });
      }

      var zoomOut = view.querySelector('#btn-zoom-out');
      if (zoomOut) {
        zoomOut.addEventListener('click', function () {
          if (currentZoom <= 70) return;
          currentZoom -= 15;
          if (zoomText) zoomText.textContent = currentZoom + '%';
          if (sheetWrapper) sheetWrapper.style.transform = 'scale(' + (currentZoom / 100) + ')';
        });
      }

      // Edit Circular actions
      var editBtn = view.querySelector('#btn-edit-circular');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          ERec.router.go(step1Target);
        });
      }

      var editStep1 = view.querySelector('#link-edit-step1');
      if (editStep1) {
        editStep1.addEventListener('click', function (e) {
          e.preventDefault();
          ERec.router.go(step1Target);
        });
      }

      var editStep2 = view.querySelector('#link-edit-step2');
      if (editStep2) {
        editStep2.addEventListener('click', function (e) {
          e.preventDefault();
          ERec.router.go(step2Target);
        });
      }

      var editStep4 = view.querySelector('#link-edit-step4');
      if (editStep4) {
        editStep4.addEventListener('click', function (e) {
          e.preventDefault();
          ERec.router.go(step4Target);
        });
      }

      // Previous Step (Eligibility Rules)
      var prevBtn = view.querySelector('#btn-prev-step');
      if (prevBtn) {
        prevBtn.addEventListener('click', function (e) {
          if (e) e.preventDefault();
          ERec.router.go(step2Target);
        });
      }

      // Save & Continue (to Approval Channel)
      var saveNextBtn = view.querySelector('#btn-save-next');
      if (saveNextBtn) {
        saveNextBtn.addEventListener('click', function () {
          if (c && (c.id === 'draft' || c.isDraft)) {
            if (store.saveDraftCircular) store.saveDraftCircular(c);
          }
          ERec.router.go(step4Target);
        });
      }

      // Print Notice
      var quickPrint = view.querySelector('#btn-quick-print');
      if (quickPrint) {
        quickPrint.addEventListener('click', function () {
          // Temporarily show all pages for clean print
          var prevMode = currentViewMode;
          var sheet1 = view.querySelector('#notice-sheet-1');
          var sheet2 = view.querySelector('#notice-sheet-2');
          if (sheet1) sheet1.classList.remove('is-hidden');
          if (sheet2) sheet2.classList.remove('is-hidden');

          window.print();

          // Restore mode after print dialog
          setTimeout(function () {
            if (prevMode === 'PAGE_1' && sheet2) sheet2.classList.add('is-hidden');
            if (prevMode === 'PAGE_2' && sheet1) sheet1.classList.add('is-hidden');
          }, 500);
        });
      }
    }

    function renderView() {
      view.innerHTML = buildViewHtml();
      ui.bindPostingWizard(view);
      bindEvents();
    }

    renderView();
  }

  ERec.pages.newcircular = { render: render };
  ERec.pages.newcircularPreview = { render: render };
  ERec.pages.createcircularPreview = ERec.pages.newcircularPreview;
})(window);
