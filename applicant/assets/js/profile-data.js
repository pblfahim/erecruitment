/**
 * Pubali Bank PLC E-Recruitment Portal
 * Profile Data Management Engine & Resume Defaults
 * Ensures all profile creation pages are completely populated from resume.html
 */

(function () {
    const STORAGE_KEY = 'pubali_profile_data';

    // Complete candidate profile data extracted directly from resume.html
    const RESUME_DEFAULT_DATA = {
        documents: {
            coverLetter: "I'm a passionate UI/UX designer and can bring innovative ideas & concepts to life for client-based design projects. I have more than 3 years of design experience in digital/e-commerce. I experienced at tackle various needs from landing page designs.",
            photoData: "assets/images/fahim.png",
            photoName: "fahim.png",
            signatureData: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='80' viewBox='0 0 300 80'><path d='M20,50 Q40,15 60,35 T90,30 T120,45 M35,25 L35,55 M70,40 Q85,20 100,45 T130,35 T160,40 M170,25 Q185,55 200,30 T230,45 M15,65 Q100,55 270,55' fill='none' stroke='%230b422a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/></svg>",
            signatureName: "fahim_signature.svg"
        },
        basicInfo: {
            applicantName: "Md. Fahim",
            mobileNumber: "1714581784",
            dateOfBirth: "10 / 12 / 1971",
            nidNumber: "5655687895",
            gender: "Male",
            disabledByBirth: "No",
            homeDistrict: "Dhaka",
            emailAddress: "info@example.com",
            emergencyContact: "1712345678",
            religion: "Islam",
            fatherName: "Md. Mojammel Hossain",
            motherName: "Mrs. Amina Ara",
            bloodGroup: "O+",
            maritalStatus: "Single",
            spouseName: "",
            portfolioLink: "https://www.infositeexample.com",
            presHouse: "Village: Mirpur DOSH, Block-C, Avenue-02",
            presDistrict: "Dhaka",
            presThana: "Mirpur",
            presPostal: "1216",
            presPostOffice: "Mirpur",
            sameAsPresent: false,
            permHouse: "Village: Mirpur-12 Block-C",
            permDistrict: "Dhaka",
            permThana: "Mirpur",
            permPostal: "1216",
            permPostOffice: "Mirpur"
        },
        education: [
            {
                level: "ssc",
                exam: "SSC",
                group: "Science",
                division: "Grade",
                gpa: "5.00",
                scale: "5.00",
                roll: "458921",
                board: "Chattogram",
                year: "2014"
            },
            {
                level: "hsc",
                exam: "HSC",
                group: "Science",
                division: "Grade",
                gpa: "5.00",
                scale: "5.00",
                roll: "125842",
                board: "Chattogram",
                year: "2016"
            },
            {
                level: "bachelor",
                exam: "B.Sc Engg",
                group: "Computer Science & Engg",
                division: "Grade",
                gpa: "3.75",
                scale: "4.00",
                roll: "160412",
                board: "Chittagong University",
                year: "2020"
            }
        ],
        workExperience: {
            hasExperience: "yes",
            records: [
                {
                    designation: "Frontend Engineer",
                    organization: "Codesmith Tech Limited",
                    jobtype: "FullTime",
                    responsibilities: "Creating high quality landing pages, e-commerce interfaces, design enhancements.",
                    joiningDate: "2022-04-01",
                    endDate: "",
                    toContinue: true
                },
                {
                    designation: "Software Engineer",
                    organization: "Sheba XYZ",
                    jobtype: "FullTime",
                    responsibilities: "Creating high quality landing pages, e-commerce interfaces, design enhancements.",
                    joiningDate: "2021-04-01",
                    endDate: "2022-05-31",
                    toContinue: false
                }
            ]
        },
        certifications: [
            {
                certification: "Web Design & Development",
                institution: "BASIS Institute of Technology & Management (BITM)",
                locations: "Dhaka, Bangladesh",
                joiningDate: "2022-04-01",
                endDate: "2022-12-31"
            }
        ],
        skills: {
            languages: [
                { language: "Bangla", ratings: ["Excellent", "Excellent", "Excellent", "Excellent"] },
                { language: "English", ratings: ["Good", "Good", "Good", "Good"] }
            ],
            computerSkills: [
                "Web Development",
                "UI/UX Designer",
                "React Development",
                "Figma & Wireframing",
                "User Research & Usability Testing"
            ]
        },
        references: {
            ref1Name: "Hannan Sarker",
            ref1Org: "Sonali Bank PLC.",
            ref1Contact: "01712345678",
            ref1Email: "hannan.sarker@example.com",
            ref1Address: "House No:32, Road No:1, Mirpur-12, Dhaka",
            ref2Name: "Amir Hossain",
            ref2Org: "Rppali Bank PLC.",
            ref2Contact: "01812345678",
            ref2Email: "amir.hossain@example.com",
            ref2Address: "House No:5/A, Road No:6, Nilkhet, Dhaka"
        }
    };

    /**
     * Retrieve profile data merged with resume.html defaults
     */
    function getProfileData() {
        let stored = {};
        try {
            stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            stored = {};
        }

        return {
            documents: (stored.documents && (stored.documents.coverLetter || stored.documents.photoData)) ? stored.documents : RESUME_DEFAULT_DATA.documents,
            basicInfo: (stored.basicInfo && stored.basicInfo.fatherName) ? stored.basicInfo : RESUME_DEFAULT_DATA.basicInfo,
            education: (Array.isArray(stored.education) && stored.education.length > 0) ? stored.education : RESUME_DEFAULT_DATA.education,
            workExperience: (stored.workExperience && Array.isArray(stored.workExperience.records) && stored.workExperience.records.length > 0) ? stored.workExperience : RESUME_DEFAULT_DATA.workExperience,
            certifications: (Array.isArray(stored.certifications) && stored.certifications.length > 0) ? stored.certifications : RESUME_DEFAULT_DATA.certifications,
            skills: (stored.skills && Array.isArray(stored.skills.computerSkills) && stored.skills.computerSkills.length > 0) ? stored.skills : RESUME_DEFAULT_DATA.skills,
            references: (stored.references && stored.references.ref1Name) ? stored.references : RESUME_DEFAULT_DATA.references
        };
    }

    /**
     * Save updated profile sections into localStorage
     */
    function saveProfileData(data) {
        try {
            const current = getProfileData();
            const updated = { ...current, ...data };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        } catch (err) {
            console.warn('Storage quota exceeded or unavailable', err);
            return null;
        }
    }

    /**
     * Initialize defaults in localStorage if not already present
     */
    function ensureDefaultsSeeded() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(RESUME_DEFAULT_DATA));
            } else {
                const parsed = JSON.parse(raw);
                let changed = false;
                Object.keys(RESUME_DEFAULT_DATA).forEach(key => {
                    if (!parsed[key] || (Array.isArray(parsed[key]) && parsed[key].length === 0)) {
                        parsed[key] = RESUME_DEFAULT_DATA[key];
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                }
            }
        } catch (e) {
            // Ignore storage read/write errors
        }
    }

    /**
     * Synchronize authenticated user credentials in sidebar & top navbar across all wizard pages
     */
    function syncUserHeader() {
        try {
            const rawUser = localStorage.getItem('currentUser');
            if (!rawUser) return;
            const user = JSON.parse(rawUser);
            if (!user) return;

            const name = user.name || (user.firstName ? (user.firstName + (user.lastName ? ' ' + user.lastName : '')) : 'Md. Fahim');
            const id = user.id || '1284647';

            // Sidebar and Navbar names
            document.querySelectorAll('.profile-card h6').forEach(el => el.textContent = name);
            document.querySelectorAll('.profile-card .badge').forEach(el => el.textContent = `ID : ${id}`);
            document.querySelectorAll('.navbar .dropdown span.fw-semibold').forEach(el => el.textContent = name);
        } catch (e) {
            // Quietly fall back to static Fahim display
        }
    }

    // Attach to global window
    window.PubaliProfile = {
        STORAGE_KEY: STORAGE_KEY,
        RESUME_DEFAULT_DATA: RESUME_DEFAULT_DATA,
        getProfileData: getProfileData,
        saveProfileData: saveProfileData,
        ensureDefaultsSeeded: ensureDefaultsSeeded,
        syncUserHeader: syncUserHeader
    };

    // Auto seed and sync on load
    ensureDefaultsSeeded();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncUserHeader);
    } else {
        syncUserHeader();
    }
})();
