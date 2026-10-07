/**
 * Pubali Bank PLC E-Recruitment Portal
 * Cross-Module Recruitment Bridge (RecruitmentBridge)
 * Seamlessly connects the Applicant Module (Candidate Portal) with
 * the Management Module (HRD Portal State & Database).
 */

(function (global) {
  'use strict';

  var EREC_STORE_KEY = 'erec_demo_v1';
  var APPLICANT_APPLIED_KEY = 'pubali_applicant_applied_jobs';
  var CANDIDATE_PROFILE_KEY = 'pubali_profile_data';

  // Fallback circular definitions if HRD store is not yet initialized
  var DEFAULT_CIRCULARS = [
    {
      id: 'C-2026-01',
      code: 'HRD/REC/2026/01',
      title: 'Recruitment for Head of Law Division - 2026',
      post: 'Head of Law Division',
      vacancies: 1,
      applyStart: '2026-10-01',
      applyEnd: '2026-11-25',
      status: 'ACTIVE',
      intro: 'Pubali Bank PLC invites applications for Head of Law Division. Candidate must possess LL.B. / LL.M. with extensive corporate banking litigation experience.'
    },
    {
      id: 'C-2026-02',
      code: 'HRD/REC/2026/02',
      title: 'Recruitment of Senior Principal Officer (Computer) - 2026',
      post: 'Senior Principal Officer (Computer)',
      vacancies: 2,
      applyStart: '2026-10-01',
      applyEnd: '2026-12-20',
      status: 'ACTIVE',
      intro: 'Seeking visionary IT professionals for core banking engineering, network security, and mission-critical payment architecture.'
    },
    {
      id: 'C-2026-03',
      code: 'HRD/REC/2026/03',
      title: 'Recruitment of Graphic Designer specializing in Digital & Motion Content - 2026',
      post: 'Graphic Designer specializing in Digital & Motion Content',
      vacancies: 1,
      applyStart: '2026-10-01',
      applyEnd: '2026-11-05',
      status: 'ACTIVE',
      intro: 'Looking for creative multimedia professionals to spearhead brand identity, visual communication, and promotional campaigns.'
    }
  ];

  function getHrdData() {
    try {
      var raw = localStorage.getItem(EREC_STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('RecruitmentBridge: Could not read HRD database from localStorage', e);
    }
    return null;
  }

  function saveHrdData(db) {
    try {
      localStorage.setItem(EREC_STORE_KEY, JSON.stringify(db));
      window.dispatchEvent(new CustomEvent('erec:db-updated', { detail: db }));
      return true;
    } catch (e) {
      console.error('RecruitmentBridge: Failed saving to HRD database', e);
      return false;
    }
  }

  function getApplicantProfile() {
    try {
      var storedUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
      var profileData = JSON.parse(localStorage.getItem(CANDIDATE_PROFILE_KEY) || 'null');
      var basic = (profileData && profileData.basicInfo) || {};

      return {
        id: (storedUser && storedUser.applicantId) || '1284647',
        name: (storedUser && (storedUser.name || storedUser.applicantName)) || basic.applicantName || 'Md. Fahim',
        email: (storedUser && storedUser.email) || basic.emailAddress || 'info@example.com',
        mobile: (storedUser && storedUser.mobile) || basic.mobileNumber || '01714581784',
        nid: basic.nidNumber || '5655687895',
        fatherName: basic.fatherName || 'Md. Mojammel Hossain',
        motherName: basic.motherName || 'Mrs. Amina Ara',
        gender: basic.gender || 'Male',
        district: basic.homeDistrict || 'Dhaka',
        address: basic.presHouse || 'Mirpur DOSH, Block-C, Dhaka',
        dob: '1995-10-12',
        education: [
          { level: 'B.Sc Engg', board: 'Chittagong University', year: 2020, result: 'CGPA 3.75', subject: 'Computer Science & Engg' },
          { level: 'HSC', board: 'Chattogram', year: 2016, result: 'GPA 5.00' },
          { level: 'SSC', board: 'Chattogram', year: 2014, result: 'GPA 5.00' }
        ],
        experience: [
          { org: 'Codesmith Tech Limited', role: 'Frontend Engineer', years: '3.5' }
        ]
      };
    } catch (e) {
      return {
        id: '1284647',
        name: 'Md. Fahim',
        email: 'info@example.com',
        mobile: '01714581784'
      };
    }
  }

  var RecruitmentBridge = {
    // 1. Get Active Circulars from HRD Portal
    getCirculars: function () {
      var db = getHrdData();
      if (db && Array.isArray(db.circulars) && db.circulars.length > 0) {
        return db.circulars.filter(function (c) {
          // Never display draft or invalid Officer (General)
          return c.status === 'ACTIVE' && c.post !== 'Officer (General)';
        });
      }
      return DEFAULT_CIRCULARS;
    },

    // 2. Find Single Circular
    getCircular: function (idOrTitle) {
      if (!idOrTitle) return null;
      var list = this.getCirculars();
      var query = String(idOrTitle).trim().toLowerCase();

      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.id === idOrTitle || (c.code && c.code.toLowerCase() === query)) return c;
        if (c.post && c.post.toLowerCase() === query) return c;
        if (c.title && c.title.toLowerCase().indexOf(query) !== -1) return c;
      }
      return null;
    },

    // 3. Get All Applied Jobs for Current Candidate
    getAppliedJobs: function () {
      var list = [];
      try {
        var raw = localStorage.getItem(APPLICANT_APPLIED_KEY);
        if (raw) list = JSON.parse(raw);
      } catch (e) {
        list = [];
      }

      // Merge with any applied status from HRD store
      var profile = getApplicantProfile();
      var db = getHrdData();
      if (db && Array.isArray(db.applicants)) {
        db.applicants.forEach(function (app) {
          if (app.name === profile.name || app.mobile === profile.mobile || app.id === profile.id) {
            var circ = (db.circulars || []).find(function (c) { return c.id === app.circularId; });
            var alreadyInList = list.some(function (item) {
              return item.circularId === app.circularId || (circ && item.refCode === circ.code);
            });
            if (!alreadyInList && circ) {
              list.push({
                circularId: circ.id,
                jobTitle: circ.post || circ.title,
                refCode: circ.code,
                appNo: app.appNo || ('PBPLC-APP-' + Math.floor(1000 + Math.random() * 9000)),
                appliedDate: app.appliedAt ? app.appliedAt.split('T')[0] : '2026-10-06',
                status: 'Applied'
              });
            }
          }
        });
      }

      return list;
    },

    // 4. Check if Candidate Already Applied
    hasApplied: function (idOrTitle) {
      var applied = this.getAppliedJobs();
      var target = this.getCircular(idOrTitle);
      var targetId = target ? target.id : idOrTitle;
      var targetTitle = target ? (target.post || target.title) : idOrTitle;

      return applied.some(function (item) {
        return (targetId && item.circularId === targetId) ||
          (targetTitle && item.jobTitle && item.jobTitle.toLowerCase() === targetTitle.toLowerCase());
      });
    },

    // 5. Submit Application (Stores in applicant log AND HRD management database)
    applyForCircular: function (idOrTitle) {
      var circ = this.getCircular(idOrTitle);
      if (!circ) {
        // Fallback for custom title
        circ = {
          id: 'C-2026-' + Date.now(),
          code: 'PBPLC/HRD/REC/2026/' + Math.floor(10 + Math.random() * 90),
          title: String(idOrTitle),
          post: String(idOrTitle)
        };
      }

      if (this.hasApplied(circ.id)) {
        return { success: false, message: 'You have already applied for this circular.' };
      }

      var profile = getApplicantProfile();
      var trackingNo = 'PBPLC-' + (circ.code ? circ.code.replace(/[^A-Za-z0-9]/g, '').slice(-4) : '2026') + '-' + Math.floor(1000 + Math.random() * 9000);
      var today = new Date().toISOString().split('T')[0];

      var applicationEntry = {
        circularId: circ.id,
        jobTitle: circ.post || circ.title,
        refCode: circ.code || 'PBPLC/HRD/REC/2026',
        appNo: trackingNo,
        appliedDate: today,
        status: 'Applied'
      };

      // 1. Update applicant store
      var appliedList = [];
      try {
        var raw = localStorage.getItem(APPLICANT_APPLIED_KEY);
        if (raw) appliedList = JSON.parse(raw);
      } catch (e) { }
      appliedList.unshift(applicationEntry);
      localStorage.setItem(APPLICANT_APPLIED_KEY, JSON.stringify(appliedList));

      // 2. Synchronize candidate directly into HRD Management Database
      var db = getHrdData();
      if (db) {
        if (!Array.isArray(db.applicants)) db.applicants = [];
        if (!Array.isArray(db.stageApplicants)) db.stageApplicants = [];

        var applicantId = circ.id + '-A' + (db.applicants.length + 1);
        var newApplicantRecord = {
          id: applicantId,
          circularId: circ.id,
          appNo: trackingNo,
          name: profile.name,
          fatherName: profile.fatherName,
          motherName: profile.motherName,
          gender: profile.gender,
          dob: profile.dob,
          nid: profile.nid,
          mobile: profile.mobile,
          email: profile.email,
          district: profile.district,
          address: profile.address,
          education: profile.education || [],
          experience: profile.experience || [],
          documents: [
            { name: 'SSC Certificate & Transcript', claimed: true },
            { name: 'HSC Certificate & Transcript', claimed: true },
            { name: 'Graduation Certificate & Transcript', claimed: true },
            { name: 'National ID Card', claimed: true },
            { name: 'Recent Passport Size Photograph', claimed: true }
          ],
          appliedAt: new Date().toISOString(),
          rollNo: null,
          status: 'APPLIED'
        };

        db.applicants.push(newApplicantRecord);

        // If this circular has an active first stage in HRD, add to stageApplicants
        var firstStage = (db.stages || []).find(function (s) { return s.circularId === circ.id && s.seq === 1; });
        if (firstStage) {
          db.stageApplicants.push({
            id: 'sa-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            stageId: firstStage.id,
            applicantId: applicantId,
            rollNo: null,
            venueId: null,
            attendance: null,
            marks: null,
            resultStatus: 'PENDING',
            selectedForNext: false,
            selectionBasis: null,
            scrutiny: null,
            panelId: null
          });
        }

        saveHrdData(db);
      }

      // Dispatch real-time cross-tab & local events
      window.dispatchEvent(new CustomEvent('erec:applicant-applied', { detail: applicationEntry }));

      return {
        success: true,
        message: 'Your application has been successfully submitted and forwarded to HRD!',
        trackingNo: trackingNo,
        circular: circ,
        candidate: profile
      };
    },

    getApplicantProfile: getApplicantProfile,

    // Navigation Helpers
    redirectToManagement: function () {
      window.location.href = '../index.html';
    },

    redirectToApplicant: function () {
      window.location.href = 'applicant/index.html';
    }
  };

  // Expose global bridge
  global.RecruitmentBridge = RecruitmentBridge;

})(typeof window !== 'undefined' ? window : this);
