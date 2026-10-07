/* Deterministic demo data.
   A fixed PRNG seed means "Reset demo data" always reproduces the exact same
   applicants, marks and roll numbers, so a walkthrough is repeatable. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};
  var fmt = ERec.fmt || (global.ERec && global.ERec.fmt) || {};

  /* Bump this whenever seed data changes shape or content (the approver
     roster, a new applicant field, default templates, ...). store.js
     compares it against whatever a browser's cached localStorage blob was
     built with and reseeds on a mismatch - so a fix here reaches everyone
     automatically, with nobody needing to remember to click
     "Reset demo data". */
  var SEED_VERSION = 10;

  /* mulberry32 - tiny seeded PRNG */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var MALE = ['Fahim', 'Santunu', 'Md.', 'Sabbir', 'Mahmudul', 'Shahriar', 'Nazmul', 'Fahim',
    'Ashiqur', 'Rezaul', 'Mizanur', 'Sohel', 'Arif', 'Rasel', 'Jubayer', 'Imran', 'Nayeem', 'Zahid',
    'Kamrul', 'Saiful', 'Mehedi', 'Rifat', 'Tauhid', 'Shakib', 'Anisur'];
  var FEMALE = ['Farhana', 'Nusrat', 'Sadia', 'Tasnim', 'Rumana', 'Shamima', 'Israt', 'Maliha',
    'Sanjida', 'Afsana', 'Jannatul', 'Sumaiya', 'Nishat', 'Tahmina', 'Rubaiya'];
  var LAST = ['Md.', 'Hasan', 'Fahim', 'Ahmed', 'Chowdhury', 'Karim', 'Hossain', 'Sarker',
    'Mia', 'Bhuiyan', 'Talukder', 'Alam', 'Siddique', 'Mondol', 'Haque', 'Khan', 'Uddin', 'Akter'];
  var FATHER = ['Md. Abdul', 'Md. Nurul', 'Late Abdur', 'Md. Shafiqul', 'Md. Habibur', 'Md. Golam',
    'Md. Anwar', 'Md. Delwar', 'Md. Mokbul', 'Md. Ruhul'];
  var DISTRICTS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur',
    'Mymensingh', 'Cumilla', 'Bogura', 'Jashore', 'Dinajpur'];
  var UNIS = ['University of Dhaka', 'BUET', 'Rajshahi University', 'Chittagong University',
    'Jahangirnagar University', 'North South University', 'BRAC University', 'Khulna University',
    'Islamic University', 'Jagannath University'];
  var DEGREES = [
    { deg: 'BBA', sub: 'Finance' }, { deg: 'BBA', sub: 'Accounting' }, { deg: 'MBA', sub: 'Management' },
    { deg: 'B.Sc.', sub: 'Computer Science' }, { deg: 'B.Sc.', sub: 'Economics' },
    { deg: 'LL.B.', sub: 'Law' }, { deg: 'LL.M.', sub: 'Law' }, { deg: 'M.Com.', sub: 'Accounting' },
    { deg: 'B.A.', sub: 'English' }, { deg: 'M.Sc.', sub: 'Statistics' }
  ];
  var CLASSES = ['1st Class', '2nd Class', 'CGPA 3.85', 'CGPA 3.52', 'CGPA 3.20', 'CGPA 3.71'];

  /* Designation grades. The root id is the middle block of an employee id:
     year + rootId + '0' + PF number. */
  var DESIGNATIONS = [
    { rootId: 15, title: 'Officer' },
    { rootId: 17, title: 'Senior Officer' },
    { rootId: 19, title: 'Principal Officer' },
    { rootId: 21, title: 'Senior Principal Officer' },
    { rootId: 23, title: 'Assistant Vice President' }
  ];

  /* PF numbers are issued in one running series across the bank. */
  var PF_SERIES_START = 20964;

  /* ---------- eligibility rules ----------
     A circular carries a list of typed rules instead of one flat block of
     free text. These five are the only types the eligibility engine
     evaluates, so the rule builder offers exactly these and nothing else. */
  var RULE_TYPES = [
    { key: 'AGE', label: 'Age Limit' },
    { key: 'EXPERIENCE', label: 'Years of Experience' },
    { key: 'DEGREE_LEVEL', label: 'Required Degree Level' },
    { key: 'RESULT_GRADE', label: 'Minimum Result / Grade' },
    { key: 'SUBJECT', label: 'Required Subject of Study' },
    { key: 'OTHERS', label: 'Others' }
  ];

  var DEGREE_LEVELS = ['SSC', 'HSC', 'Bachelor', 'Masters'];


  function ruleTypeLabel(key) {
    var t = RULE_TYPES.find(function (x) { return x.key === key; });
    return t ? t.label : key;
  }

  function ExcelList(v) {
    if (Array.isArray(v)) return v;
    return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* Plain-English summary of a rule, shown live in the builder's Preview box
     and again in the rule list. Returns guidance text while a rule is still
     incomplete, so the preview always tells the user what is missing. */
  function describeRule(r) {
    if (!r) return '';
    switch (r.type) {
      case 'AGE':
        if (r.minAge && r.maxAge) return 'Applicant must be between ' + r.minAge + ' and ' + r.maxAge + ' years old.';
        if (r.minAge) return 'Applicant must be at least ' + r.minAge + ' years old.';
        if (r.maxAge) return 'Applicant must be no older than ' + r.maxAge + ' years.';
        return 'Set a minimum and/or maximum age.';

      case 'EXPERIENCE': {
        if (!r.minYears) return 'Set the minimum years of experience required.';
        var s = 'Applicant must have at least ' + r.minYears +
          (Number(r.minYears) === 1 ? ' year' : ' years') + ' of experience';
        if (r.industry) s += ' in ' + r.industry;
        var desig = ExcelList(r.designationKeywords);
        var resp = ExcelList(r.responsibilityKeywords);
        if (desig.length) s += ', as ' + desig.join(' / ');
        if (resp.length) s += ', covering ' + resp.join(' / ');
        return s + '.';
      }

      case 'DEGREE_LEVEL':
        if (!r.degreeLevel) return 'Choose the minimum degree level.';
        return 'Applicant must hold a ' + r.degreeLevel + ' qualification (' +
          (r.mandatory === false ? 'preferred, does not disqualify' : 'required, disqualifies if missing') + ').';

      case 'RESULT_GRADE': {
        if (!r.divisionText && !r.minGpa && !r.minCgpa) return 'Set a division/class text and/or a minimum GPA/CGPA.';
        var parts = [];
        if (r.divisionText) parts.push('no "' + r.divisionText + '" in any result');
        if (r.minGpa) parts.push('GPA at least ' + Number(r.minGpa).toFixed(2) + ' on a 5.0 scale (SSC/HSC)');
        if (r.minCgpa) parts.push('CGPA at least ' + Number(r.minCgpa).toFixed(2) + ' on a 4.0 scale (Bachelor/Higher)');
        return 'Applicant must have ' + parts.join(', and ') + '.';
      }

      case 'SUBJECT': {
        var subs = ExcelList(r.allowedSubjects);
        if (!subs.length) return 'List the allowed subjects.';
        return 'Applicant\'s ' + (r.degreeLevel || 'degree') + ' result must be in one of: ' + subs.join(', ') + '.';
      }

      case 'OTHERS': {
        var items = ExcelList(r.otherCriteria);
        if (!items.length) return 'List the allowed criteria.';
        return 'Must fulfill one or more of: ' + items.join(', ') + '.';
      }

      default:
        return '';
    }
  }

  /* A fresh rule of a given type, with the defaults the builder starts from. */
  function blankRule(type) {
    var r = { id: fmt.uid('rul'), type: type || 'AGE', name: '', status: 'ACTIVE', failureMessage: '' };
    if (r.type === 'AGE') { r.minAge = 21; r.maxAge = 30; }
    if (r.type === 'EXPERIENCE') { r.minYears = ''; r.industry = ''; r.designationKeywords = ''; r.responsibilityKeywords = ''; }
    if (r.type === 'DEGREE_LEVEL') { r.degreeLevel = ''; r.mandatory = true; }
    if (r.type === 'RESULT_GRADE') { r.divisionText = 'Third'; r.minGpa = ''; r.minCgpa = ''; }
    if (r.type === 'SUBJECT') { r.degreeLevel = 'Bachelor'; r.allowedSubjects = ''; }
    if (r.type === 'OTHERS') { r.otherCriteria = ''; }
    return r;
  }

  var MARITAL = ['Single', 'Married'];
  var RELIGION = ['Islam', 'Hinduism', 'Christianity', 'Buddhism'];
  var BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  var QUOTA = ['General', 'General', 'General', 'General', 'Freedom Fighter\'s Child', 'Tribal', 'Physically Challenged'];
  var SKILLS = ['MS Office, Internet', 'MS Office, Tally, Internet', 'MS Office, Advanced Excel',
    'MS Office, Oracle, SQL', 'MS Word & Excel'];
  var LANGS = ['Bangla, English', 'Bangla, English, Hindi', 'Bangla, English, Arabic'];

  var DOC_TYPES = [
    'SSC Certificate & Transcript',
    'HSC Certificate & Transcript',
    'Graduation Certificate & Transcript',
    "Master's Certificate & Transcript",
    'National ID Card',
    'Recent Passport Size Photograph',
    'Experience Certificate',
    'Character Certificate'
  ];

  var DEFAULT_INSTRUCTIONS = {
    MCQ: 'Applicant must bring this admit card at examination center and must preserve the same for future use.\n' +
      'Applicant shall report to the examination center at least 30 minutes prior to start of examination. No candidate will be allowed to enter examination center after exam starts.\n' +
      'Calculator, books, bag, mobile phone, smart watch and any other electronic/communication devices are strictly prohibited in examination center. Applicant will be expelled if these things are found in his/her possession during examination.\n' +
      'Applicant shall use black ink ball point pen.\n' +
      'Applicant must put same signature of application in attendance sheet and answer script.\n' +
      'No Applicant will be allowed to leave examinaiton center before exam ends.\n' +
      'TA/DA will not be admissible in this connection.\n' +
      'Applicant will be expelled if found guilty of forgery, copying, adopting any type of unfair means, misconduct, misbehaviour. If necessary, hall authority can hand over him/her to law enforcement agency for taking legal action in this regard.',
    WRITTEN: 'Applicant must bring this admit card at examination center and must preserve the same for future use.\n' +
      'Applicant shall report to the examination center at least 30 minutes prior to start of examination. No candidate will be allowed to enter examination center after exam starts.\n' +
      'Calculator, books, bag, mobile phone, smart watch and any other electronic/communication devices are strictly prohibited in examination center. Applicant will be expelled if these things are found in his/her possession during examination.\n' +
      'Applicant shall use black ink ball point pen.\n' +
      'Applicant must put same signature of application in attendance sheet and answer script.\n' +
      'No Applicant will be allowed to leave examinaiton center before exam ends.\n' +
      'TA/DA will not be admissible in this connection.\n' +
      'Applicant will be expelled if found guilty of forgery, copying, adopting any type of unfair means, misconduct, misbehaviour. If necessary, hall authority can hand over him/her to law enforcement agency for taking legal action in this regard.',
    VIVA: 'Applicant must bring this admit card along with all original certificates, transcripts, and National ID Card.\n' +
      'Applicant shall report to the interview venue at least 30 minutes prior to start of interview.\n' +
      'Mobile phones, bags and any electronic devices are strictly prohibited.\n' +
      'One set of attested photocopies of all academic documents and two passport size photographs must be submitted.\n' +
      'Applicant must put same signature of application in attendance sheet.\n' +
      'TA/DA will not be admissible in this connection.'
  };

  function defaultTemplates(kind, examLabel) {
    if (kind === 'FINAL') {
      return {
        mailSubject: 'Final Result - {{post}} ({{circular}})',
        mailBody: 'Dear {{name}},\n\n' +
          'Congratulations! You have been finally selected for the post of {{post}} against circular {{circular}}.\n\n' +
          'Your roll number is {{roll}}. The Appointment Letter along with joining instructions will be issued to you shortly.\n' +
          'Please keep all original academic and personal documents ready for verification on the day of joining.\n\n' +
          'Regards,\nHuman Resources Division',
        smsBody: 'Congratulations {{name}}! Roll {{roll}} - finally selected for {{post}}. Appointment Letter will follow. - HR Division'
      };
    }
    /* The appointment letter itself is handed over in person at HRD - the
       notification only tells the candidate to come and collect it. */
    if (kind === 'OFFER') {
      return {
        mailSubject: 'Appointment - {{post}} ({{circular}})',
        mailBody: 'Dear {{name}},\n\n' +
          'Congratulations. You have been selected for appointment to the post of {{post}} against ' +
          'circular {{circular}}.\n\n' +
          'Your appointment letter has been issued and is ready for collection. Please collect it in person ' +
          'from the Human Resources Division, Head Office, on any working day between 10:00 AM and 4:00 PM, ' +
          'and bring your National ID Card for identification.\n\n' +
          'Your date of joining is {{joiningDate}}.\n\n' +
          'Regards,\nHuman Resources Division',
        smsBody: 'Dear {{name}}, you are selected for {{post}}. Please collect your appointment letter from HRD, Head Office (10 AM-4 PM) with your NID. Joining {{joiningDate}}. - HR Division'
      };
    }
    return {
      mailSubject: examLabel + ' Examination - {{post}} ({{circular}})',
      mailBody: 'Dear {{name}},\n\n' +
        'You are hereby informed that the ' + examLabel + ' examination for the post of {{post}} against circular {{circular}} ' +
        'will be held as follows.\n\n' +
        'Roll Number : {{roll}}\n' +
        'Date        : {{date}}\n' +
        'Reporting   : {{time}}\n' +
        'Venue       : {{venue}}\n' +
        '              {{venueAddress}}\n\n' +
        'Please download and print your admit card from the recruitment portal and bring it along with your ' +
        'original National ID Card. Detailed instructions are printed on the admit card.\n\n' +
        'Regards,\nHuman Resources Division',
      smsBody: 'Dear {{name}}, your ' + examLabel + ' exam for {{post}} is on {{date}} at {{time}}. Roll {{roll}}, Venue: {{venue}}. Bring admit card & NID. - HR Division'
    };
  }

  /* Applicant generator, shared by the seeded demo circulars and by any
     circular the user creates in the app - a new circular with no candidates
     cannot be walked through, so one is never left empty. */
  function makeApplicants(opts) {
    var circularId = opts.circularId;
    var count = opts.count || 30;
    var prefix = opts.prefix || 'APP';
    var start = opts.startIndex || 0;
    var applyDate = opts.appliedAt || fmt.isoDate();
    var r = rng(opts.seed === undefined ? Math.floor(Math.random() * 1e9) : opts.seed);
    var pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    var int = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    var out = [];
    var degreesList = opts.degrees && opts.degrees.length ? opts.degrees : DEGREES;

    for (var n = 0; n < count; n++) {
      var i = start + n;
      var female = r() < 0.34;
      var name = pick(female ? FEMALE : MALE) + ' ' + pick(LAST);
      var edu = pick(degreesList);
      var hasExp = r() < 0.6;
      out.push({
        id: circularId + '-A' + fmt.pad(i + 1, 3),
        circularId: circularId,
        appNo: prefix + '-APP-' + fmt.pad(i + 1, 4),
        name: name,
        fatherName: pick(FATHER) + ' ' + pick(LAST),
        motherName: pick(FEMALE) + ' ' + pick(LAST),
        gender: female ? 'Female' : 'Male',
        dob: (1990 + int(0, 8)) + '-' + fmt.pad(int(1, 12)) + '-' + fmt.pad(int(1, 28)),
        nid: String(int(1990, 1999)) + String(int(1000000, 9999999)),
        mobile: '01' + pick(['7', '8', '9', '6']) + String(int(10000000, 99999999)),
        email: name.toLowerCase().replace(/[^a-z]+/g, '.') + int(10, 99) + '@example.com',
        district: pick(DISTRICTS),
        address: 'House ' + int(1, 90) + ', Road ' + int(1, 25) + ', ' + pick(DISTRICTS),

        /* the rest of the application form, shown in "View application" and
           checked field by field during scrutiny */
        presentAddress: 'House ' + int(1, 90) + ', Road ' + int(1, 25) + ', ' + pick(DISTRICTS),
        permanentAddress: 'Vill: ' + pick(LAST) + 'pur, P.O: ' + pick(DISTRICTS) + ' Sadar, Dist: ' + pick(DISTRICTS),
        maritalStatus: pick(MARITAL),
        religion: pick(RELIGION),
        bloodGroup: pick(BLOOD),
        nationality: 'Bangladeshi',
        quota: pick(QUOTA),
        altContact: '01' + pick(['7', '8', '9']) + String(int(10000000, 99999999)),
        computerSkills: pick(SKILLS),
        languages: pick(LANGS),
        expectedSalary: (int(30, 60) * 1000),
        education: [
          { level: 'SSC', board: pick(DISTRICTS), year: 2006 + int(0, 4), result: 'GPA ' + (4 + r()).toFixed(2) },
          { level: 'HSC', board: pick(DISTRICTS), year: 2008 + int(0, 4), result: 'GPA ' + (4 + r()).toFixed(2) },
          { level: edu.deg, board: pick(UNIS), year: 2013 + int(0, 6), result: pick(CLASSES), subject: edu.sub }
        ],
        experience: hasExp ? [{
          org: pick(['ABC Bank Ltd.', 'Delta Insurance', 'Nexus Group', 'Prime Consultants', 'Unity Textiles']),
          role: pick(['Junior Officer', 'Executive', 'Trainee Officer', 'Assistant Manager']),
          years: (1 + r() * 4).toFixed(1)
        }] : [],
        documents: DOC_TYPES.filter(function (d, di) {
          if (d === "Master's Certificate & Transcript") return /^(MBA|LL\.M\.|M\.Com\.|M\.Sc\.)$/.test(edu.deg);
          if (d === 'Experience Certificate') return hasExp;
          return di < 8;
        }).map(function (d) { return { name: d, claimed: true }; }),
        appliedAt: applyDate,
        rollNo: null,
        status: 'APPLIED'
      });
    }
    return out;
  }

  function build() {
    var r = rng(20260907);
    var pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    var int = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };

    var db = {
      meta: { version: SEED_VERSION, seededAt: new Date().toISOString() },
      users: [], circulars: [], stages: [], applicants: [], stageApplicants: [],
      venues: [], approvals: [], templates: [], notifications: [], panels: [],
      offers: [], joinings: [], auditLog: []
    };

    /* ---------- users ---------- */
    /* Approval runs upward: GM (HRD) -> DMD -> MD. */
    db.users = [
      { id: 'u-hr', name: 'Md.Fahim', designation: 'Senior Officer, Human Resources Division', role: 'HR_ADMIN' },
      { id: 'u-gm', name: 'ISMAT ARA HUQ', designation: 'General Manager & Division Head (HRD)', role: 'APPROVER', short: 'Ismat' },
      { id: 'u-dmd', name: 'AHMED ENAYET MANZUR', designation: 'Deputy Managing Director & Head of Internal Control and Compliance', role: 'APPROVER', short: 'DMD' },
      { id: 'u-md', name: 'MOHAMMAD ALI', designation: 'Managing Director', role: 'APPROVER', short: 'MD' }
    ];

    /* ---------- circulars ---------- */
    var circularDefs = [
      {
        id: 'C-2026-01',
        code: 'HRD/REC/2026/01',
        title: 'Recruitment for Head of Law Division - 2026',
        post: 'Recruitment for Head of Law Division',
        navTitle: 'Head of Law Division',
        vacancies: 1,
        maxAge: 48,
        minDegreeLevel: 'Master',
        allowedSubjects: 'LL.B., LL.M., Law',
        minExperience: 10,
        expIndustry: 'Banking / Corporate Legal Affairs',
        applyStart: '2026-10-01',
        applyEnd: '2026-11-25',
        count: 10,
        rollPrefix: '2601',
        stages: ['WRITTEN', 'VIVA'],
        degrees: [
          { deg: 'LL.M.', sub: 'Law' },
          { deg: 'LL.B.', sub: 'Law' }
        ]
      },
      {
        id: 'C-2026-02',
        code: 'HRD/REC/2026/02',
        title: 'Recruitment of Senior Principal Officer (Computer) - 2026',
        post: 'Senior Principal Officer (Computer)',
        navTitle: 'Senior Principal Officer (Computer)',
        vacancies: 2,
        maxAge: 40,
        minDegreeLevel: 'Bachelor',
        allowedSubjects: 'Computer Science, CSE, Software Engineering, IT',
        minExperience: 7,
        expIndustry: 'Banking IT / Software Systems / Network Infrastructure',
        applyStart: '2026-10-01',
        applyEnd: '2026-12-20',
        count: 15,
        rollPrefix: '2602',
        stages: ['MCQ', 'WRITTEN', 'VIVA'],
        degrees: [
          { deg: 'B.Sc.', sub: 'Computer Science' },
          { deg: 'M.Sc.', sub: 'Computer Science' },
          { deg: 'B.Sc.', sub: 'Software Engineering' }
        ]
      },
      {
        id: 'C-2026-03',
        code: 'HRD/REC/2026/03',
        title: 'Recruitment of Graphic Designer specializing in Digital & Motion Content - 2026',
        post: 'Graphic Designer specializing in Digital & Motion Content',
        navTitle: 'Graphic Designer',
        vacancies: 1,
        maxAge: 32,
        minDegreeLevel: 'Bachelor',
        allowedSubjects: 'Graphic Design, Fine Arts, Multimedia, Creative Media',
        minExperience: 2,
        expIndustry: 'Advertising Agency / Digital Media Agency / Corporate House',
        applyStart: '2026-10-01',
        applyEnd: '2026-11-05',
        count: 30,
        rollPrefix: '2603',
        stages: ['WRITTEN', 'VIVA'],
        degrees: [
          { deg: 'B.F.A.', sub: 'Graphic Design' },
          { deg: 'Diploma', sub: 'Multimedia & Graphic Arts' },
          { deg: 'B.A.', sub: 'Fine Arts' },
          { deg: 'B.Sc.', sub: 'Creative Media & Visual Arts' }
        ]
      }
    ];

    var stageLabel = { MCQ: 'MCQ', WRITTEN: 'Written', VIVA: 'Viva-Voce' };

    /* The eligibility rules each seeded circular advertises. */
    function buildRules(def) {
      if (def.customRules) return def.customRules;
      var out = [
        Object.assign(blankRule('AGE'), {
          name: 'Age Limit', minAge: 21, maxAge: def.maxAge || 30,
          failureMessage: 'Applicant must be between 21 and ' + (def.maxAge || 30) + ' years old.'
        }),
        Object.assign(blankRule('DEGREE_LEVEL'), {
          name: 'Minimum Academic Qualification',
          degreeLevel: def.minDegreeLevel || 'Bachelor', mandatory: true,
          failureMessage: 'Applicant must hold at least a ' + (def.minDegreeLevel || 'Bachelor') + ' degree.'
        }),
        Object.assign(blankRule('RESULT_GRADE'), {
          name: 'No Third Division / Class', divisionText: 'Third', minGpa: '',
          failureMessage: 'Candidates having a third division/class at any level of examination need not apply.'
        })
      ];
      if (def.allowedSubjects) {
        out.push(Object.assign(blankRule('SUBJECT'), {
          name: 'Required Field of Study',
          degreeLevel: def.minDegreeLevel || 'Bachelor',
          allowedSubjects: def.allowedSubjects,
          failureMessage: 'Applicant must have studied ' + def.allowedSubjects + '.'
        }));
      }
      if (def.minExperience) {
        out.push(Object.assign(blankRule('EXPERIENCE'), {
          name: 'Relevant Work Experience',
          minYears: def.minExperience, industry: def.expIndustry || '',
          failureMessage: 'Applicant must have at least ' + def.minExperience + ' years of relevant experience.'
        }));
      }
      return out;
    }

    circularDefs.forEach(function (def, ci) {
      db.circulars.push({
        id: def.id, code: def.code, title: def.title, post: def.post,
        navTitle: def.navTitle || def.post,
        vacancies: def.vacancies,
        applyStart: def.applyStart,
        applyEnd: def.applyEnd, applyEndTime: '17:00',
        /* Typed eligibility rules advertised with the circular. The
           designation is NOT set here - an applicant can be appointed to a
           different designation than the circular advertised, so it is
           chosen per person at joining. */
        eligibilityRules: buildRules(def),
        status: 'ACTIVE',
        steps: {},
        createdAt: '2026-10-01T00:00:00.000Z'
      });

      /* stages */
      def.stageIds = [];
      def.stages.forEach(function (type, i) {
        var sid = def.id + '-S' + (i + 1);
        def.stageIds.push(sid);
        db.stages.push({
          id: sid, circularId: def.id, type: type, seq: i + 1,
          name: stageLabel[type] + ' Examination',
          requireApplicantApproval: true,
          requireVenueApproval: (i === 0 && def.stages.length > 1),
          applicantApprovers: ['u-gm', 'u-dmd', 'u-md'],
          venueApprovers: ['u-gm', 'u-dmd'],
          instructions: DEFAULT_INSTRUCTIONS[type] || '',
          examDate: null,
          fullMarks: type === 'VIVA' ? 50 : 100,
          passMarks: type === 'VIVA' ? 25 : 50,
          status: 'NOT_STARTED',
          steps: {}
        });
      });

      /* applicants - fixed seed per circular keeps "Reset demo data" repeatable */
      makeApplicants({
        circularId: def.id, count: def.count, prefix: def.rollPrefix,
        appliedAt: def.applyStart, seed: 4100 + ci, degrees: def.degrees
      }).forEach(function (a) { db.applicants.push(a); });
    });

    /* ---------- helpers used while advancing seeded circulars ---------- */

    function stg(id) { return db.stages.find(function (s) { return s.id === id; }); }

    function markStep(stageId, key, meta) {
      var s = stg(stageId);
      s.steps[key] = Object.assign({ done: true, at: '2026-01-01T00:00:00.000Z', by: 'Md.Fahim' }, meta || {});
    }

    function confirmRoster(stageId, applicants) {
      applicants.forEach(function (a) {
        db.stageApplicants.push({
          id: fmt.uid('sa'), stageId: stageId, applicantId: a.id,
          rollNo: a.rollNo, venueId: null, attendance: null, marks: null,
          resultStatus: 'PENDING', selectedForNext: false, selectionBasis: null,
          scrutiny: null, panelId: null
        });
      });
      markStep(stageId, 'search', { count: applicants.length });
    }

    function generateRolls(def, stageId) {
      var list = db.applicants.filter(function (a) { return a.circularId === def.id; });
      list = fmt.sortBy(list, 'name');
      list.forEach(function (a, i) {
        a.rollNo = def.rollPrefix + fmt.pad(i + 1, 4);
        var row = db.stageApplicants.find(function (x) { return x.stageId === stageId && x.applicantId === a.id; });
        if (row) row.rollNo = a.rollNo;
      });
      markStep(stageId, 'roll', {
        prefix: def.rollPrefix, start: 1, padding: 4, orderBy: 'name', count: list.length
      });
    }

    function addVenues(def, stageId, examDate, from, to) {
      var s = stg(stageId);
      s.examDate = examDate;
      var rows = db.stageApplicants.filter(function (x) { return x.stageId === stageId; });
      rows = fmt.sortBy(rows, 'rollNo');
      var half = Math.ceil(rows.length / 2);
      var venueDefs = [
        { name: 'City Model College', address: '24 Green Road, Dhanmondi, Dhaka-1205', cap: 120 },
        { name: 'National Ideal School & College', address: '11 Bijoynagar, Ramna, Dhaka-1000', cap: 100 }
      ];
      venueDefs.forEach(function (v, i) {
        var chunk = i === 0 ? rows.slice(0, half) : rows.slice(half);
        if (!chunk.length) return;
        var vid = fmt.uid('ven');
        db.venues.push({
          id: vid, circularId: def.id, stageId: stageId,
          name: v.name, address: v.address, examDate: examDate,
          startTime: from, endTime: to, reportingTime: fmt.shiftTime(from, -30),
          rollFrom: chunk[0].rollNo,
          rollTo: chunk[chunk.length - 1].rollNo, capacity: v.cap
        });
        chunk.forEach(function (row) { row.venueId = vid; });
      });
      markStep(stageId, 'venue', { count: Math.min(2, venueDefs.length) });
    }

    function approve(def, stageId, kind, approverIds) {
      var s = stg(stageId);
      var ap = {
        id: fmt.uid('apr'), circularId: def.id, stageId: stageId, kind: kind,
        summary: '', status: 'APPROVED', currentSeq: approverIds.length,
        createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'Md.Fahim',
        chain: approverIds.map(function (uid, i) {
          var u = db.users.find(function (x) { return x.id === uid; });
          return {
            seq: i, userId: uid, name: u.name, designation: u.designation,
            status: 'APPROVED', remarks: i === 0 ? 'Verified and recommended.' : 'Approved.',
            actedAt: '2026-01-02T00:00:00.000Z'
          };
        })
      };
      db.approvals.push(ap);
      markStep(stageId, kind === 'APPLICANT' ? 'approval-applicant' : 'approval-venue', { approvalId: ap.id });
      return ap;
    }

    function setInstructions(stageId) {
      var s = stg(stageId);
      s.instructions = DEFAULT_INSTRUCTIONS[s.type];
      markStep(stageId, 'instructions', {});
    }

    function initiate(def, stageId) {
      var s = stg(stageId);
      var label = stageLabel[s.type];
      var tpl = defaultTemplates(s.type, label);
      db.templates.push({
        id: fmt.uid('tpl'), circularId: def.id, stageId: stageId, kind: 'ADMIT',
        mailSubject: tpl.mailSubject, mailBody: tpl.mailBody, smsBody: tpl.smsBody
      });
      var rows = db.stageApplicants.filter(function (x) { return x.stageId === stageId; });
      rows.forEach(function (row) {
        var a = db.applicants.find(function (x) { return x.id === row.applicantId; });
        var v = db.venues.find(function (x) { return x.id === row.venueId; });
        var vars = {
          name: a.name, roll: row.rollNo, post: def.post, circular: def.code,
          date: fmt.date(s.examDate), time: fmt.time12(v ? v.startTime : '09:00'),
          venue: v ? v.name : '', venueAddress: v ? v.address : ''
        };
        db.notifications.push({
          id: fmt.uid('ntf'), applicantId: a.id, applicantName: a.name, circularId: def.id,
          stageId: stageId, kind: 'ADMIT', channel: 'MAIL',
          subject: fmt.merge(tpl.mailSubject, vars), body: fmt.merge(tpl.mailBody, vars),
          to: a.email, sentAt: '2026-01-05T04:00:00.000Z'
        });
        db.notifications.push({
          id: fmt.uid('ntf'), applicantId: a.id, applicantName: a.name, circularId: def.id,
          stageId: stageId, kind: 'ADMIT', channel: 'SMS',
          subject: '', body: fmt.merge(tpl.smsBody, vars),
          to: a.mobile, sentAt: '2026-01-05T04:00:00.000Z'
        });
      });
      s.status = 'IN_PROGRESS';
      markStep(stageId, 'initiate', { mail: rows.length, sms: rows.length });
    }

    function enterMarks(stageId, cutOff) {
      var s = stg(stageId);
      var rows = db.stageApplicants.filter(function (x) { return x.stageId === stageId; });
      rows.forEach(function (row) {
        var absent = r() < 0.08;
        if (absent) {
          row.attendance = 'ABSENT'; row.marks = null; row.resultStatus = 'FAILED';
          return;
        }
        row.attendance = 'PRESENT';
        row.marks = Math.round((0.30 + r() * 0.68) * s.fullMarks);
        row.resultStatus = row.marks >= cutOff ? 'PASSED' : 'FAILED';
      });
      var passed = rows.filter(function (x) { return x.resultStatus === 'PASSED'; });
      passed.forEach(function (x) { x.selectedForNext = true; x.selectionBasis = 'CUTOFF'; });
      markStep(stageId, 'marks', {
        entered: rows.length, selected: passed.length, basis: 'CUTOFF', cutOff: cutOff
      });
      s.status = 'COMPLETED';
      return passed;
    }

    function forwardTo(stageId, targetStageId, passedRows) {
      passedRows.forEach(function (row) {
        db.stageApplicants.push({
          id: fmt.uid('sa'), stageId: targetStageId, applicantId: row.applicantId,
          rollNo: row.rollNo, venueId: null, attendance: null, marks: null,
          resultStatus: 'PENDING', selectedForNext: false, selectionBasis: null,
          scrutiny: null, panelId: null
        });
      });
      markStep(stageId, 'forward', { targetStageId: targetStageId, count: passedRows.length });
      markStep(targetStageId, 'search', { count: passedRows.length });
    }

    var logUid = (fmt.uid ? fmt.uid('log') : ('log-' + Date.now()));
    db.auditLog = [
      { id: logUid, at: new Date().toISOString(), userId: 'u-hr', userName: 'Md.Fahim', action: 'INIT_PORTAL', entity: 'system', entityId: '', note: 'Pubali Bank HRD e-Recruitment Portal initialized with 3 active job circulars' }
    ];

    return db;
  }

  ERec.seed = {
    build: build,
    SEED_VERSION: SEED_VERSION,
    makeApplicants: makeApplicants,
    DESIGNATIONS: DESIGNATIONS,
    RULE_TYPES: RULE_TYPES,
    DEGREE_LEVELS: DEGREE_LEVELS,
    ruleTypeLabel: ruleTypeLabel,
    describeRule: describeRule,
    blankRule: blankRule,
    ExcelList: ExcelList,
    PF_SERIES_START: PF_SERIES_START,
    DEFAULT_INSTRUCTIONS: DEFAULT_INSTRUCTIONS,
    defaultTemplates: defaultTemplates,
    DOC_TYPES: DOC_TYPES
  };
})(window);
