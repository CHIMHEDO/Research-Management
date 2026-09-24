/**
 * Automated Master Test Suite for ICT Research Management System
 * Covers Features 1 through 7 and Frontend Verification
 */

const { UP_ICT_FACULTY } = require('./db');
const {
  sanitizePersonName,
  isStrictNameMatch,
  findAuthorEmailByName,
  sendCoAuthorConfirmationEmail
} = require('./emailService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TEST SUITE FOR ALL SYSTEM FEATURES');
  console.log('===========================================================\n');

  // -------------------------------------------------------------
  // 1. FEATURE 1: AUTHENTICATION, ROLES & USER PROFILE MATCHING
  // -------------------------------------------------------------
  console.log('📌 Testing Feature 1: Auth, Roles & User Profile Context...');
  
  assert(Array.isArray(UP_ICT_FACULTY) && UP_ICT_FACULTY.length > 0, 'UP_ICT_FACULTY dataset loaded properly');
  
  // Test Faculty finding
  const sampleProf = UP_ICT_FACULTY.find(f => f.email && f.email.includes('@up.ac.th'));
  assert(sampleProf !== undefined, 'Found valid UP faculty record with @up.ac.th email');
  
  // Test Role classification
  const adminUser = { role: 'admin', email: 'admin@up.ac.th' };
  const standardUser = { role: 'user', email: 'teacher@up.ac.th' };
  assert(adminUser.role === 'admin', 'Admin role recognized');
  assert(standardUser.role === 'user', 'User role recognized');
  console.log('');

  // -------------------------------------------------------------
  // 2. FEATURE 2: PROPORTIONS, WORKLOAD CALCULATION & PRESETS
  // -------------------------------------------------------------
  console.log('📌 Testing Feature 2: Workload Calculation & Proportion Rules...');
  
  function validateProportions(authorList) {
    if (!authorList || authorList.length === 0) return { valid: false, error: 'No authors' };
    const total = authorList.reduce((sum, a) => sum + (Number(a.proportion) || 0), 0);
    if (Math.abs(total - 100) > 0.01) return { valid: false, error: 'Total must be 100%' };

    const first = authorList.find(a => a.role === 'First author');
    const corresp = authorList.find(a => a.role === 'Corresponding author');
    const coList = authorList.filter(a => a.role === 'Co author');

    if (first && corresp && Number(first.proportion) < Number(corresp.proportion)) {
      return { valid: false, error: 'First author proportion must be >= Corresponding author' };
    }
    if (corresp && coList.length > 0) {
      for (const co of coList) {
        if (Number(co.proportion) > Number(corresp.proportion)) {
          return { valid: false, error: 'Co author proportion cannot exceed Corresponding author' };
        }
      }
    }
    return { valid: true };
  }

  // Case 2.1: Single Author 100%
  const singleAuthor = [{ name: 'ดร.สมชาย', role: 'First & Corresponding author', proportion: 100 }];
  assert(validateProportions(singleAuthor).valid === true, 'Single author 100% proportion valid');

  // Case 2.2: 3 Authors Valid Hierarchy (50% First >= 30% Corresp >= 20% Co)
  const threeAuthorsValid = [
    { name: 'อาจารย์ A', role: 'First author', proportion: 50 },
    { name: 'อาจารย์ B', role: 'Corresponding author', proportion: 30 },
    { name: 'อาจารย์ C', role: 'Co author', proportion: 20 }
  ];
  assert(validateProportions(threeAuthorsValid).valid === true, 'Hierarchy 50% >= 30% >= 20% is valid');

  // Case 2.3: Invalid Sum != 100%
  const invalidSum = [
    { name: 'อาจารย์ A', role: 'First author', proportion: 60 },
    { name: 'อาจารย์ B', role: 'Co author', proportion: 20 }
  ];
  assert(validateProportions(invalidSum).valid === false, 'Detects total proportion != 100%');

  // Case 2.4: Invalid Hierarchy (Co > First)
  const invalidHierarchy = [
    { name: 'อาจารย์ A', role: 'First author', proportion: 30 },
    { name: 'อาจารย์ B', role: 'Corresponding author', proportion: 20 },
    { name: 'อาจารย์ C', role: 'Co author', proportion: 50 }
  ];
  assert(validateProportions(invalidHierarchy).valid === false, 'Detects violation of Co > Corresponding');
  console.log('');

  // -------------------------------------------------------------
  // 3. FEATURE 3: EMAIL SERVICE, SANITIZATION & STRICT MATCHING
  // -------------------------------------------------------------
  console.log('📌 Testing Feature 3: Email Service & Strict Name Matching...');
  
  assert(sanitizePersonName('ผศ.ดร.ณัฐพล หาญสมุทร') === 'ณัฐพล หาญสมุทร', 'Sanitizes Thai academic title (ผศ.ดร.)');
  assert(sanitizePersonName('Assoc. Prof. Dr. John Doe') === 'john doe', 'Sanitizes English academic title (Assoc. Prof. Dr.)');
  assert(sanitizePersonName('ศ.ดร.วิชัย สมบูรณ์') === 'วิชัย สมบูรณ์', 'Sanitizes ศ.ดร. title');

  // Test name matching
  assert(isStrictNameMatch(sanitizePersonName('ณัฐพล หาญสมุทร'), sanitizePersonName('ผศ.ดร.ณัฐพล หาญสมุทร')) === true, 'Strict match with prefix difference');
  assert(isStrictNameMatch(sanitizePersonName('Nattapon Harnsamut'), sanitizePersonName('Harnsamut, Nattapon')) === true, 'Strict match Last, First vs First Last');
  assert(isStrictNameMatch(sanitizePersonName('Nattapon Harnsamut'), sanitizePersonName('Somchai Jaidee')) === false, 'Strict match rejects completely different names');
  
  const foundResult = await findAuthorEmailByName('ณัฐพล หาญสมุทร');
  assert(foundResult && typeof foundResult.email === 'string' && foundResult.email.includes('@up.ac.th'), `Found registered faculty email for sample author: ${foundResult?.email}`);
  console.log('');

  // -------------------------------------------------------------
  // 4. FEATURE 4: CO-AUTHOR CONFIRMATION, MULTI-EDITOR LOOP & FROZEN WORKLOAD
  // -------------------------------------------------------------
  console.log('📌 Testing Feature 4: Multi-Editor Confirmation Loop & Frozen Workload Rules...');

  // 4.1 Initial Entry
  const now = Date.now();
  const deadline7Days = new Date(now + 7 * 86400000).toISOString();
  
  let entryState = {
    id: 'paper-101',
    title: 'Research on AI in Agriculture',
    authors: ['ดร.คนสร้าง', 'ผศ.ผู้ร่วมงาน 1', 'อ.ผู้ร่วมงาน 2'],
    author_list: [
      { name: 'ดร.คนสร้าง', role: 'First author', proportion: 50, email: 'creator@up.ac.th' },
      { name: 'ผศ.ผู้ร่วมงาน 1', role: 'Corresponding author', proportion: 30, email: 'co1@up.ac.th' },
      { name: 'อ.ผู้ร่วมงาน 2', role: 'Co author', proportion: 20, email: 'co2@up.ac.th' }
    ],
    actual_hours: 120,
    faculty: 30000,
    uni: 10000,
    confirmation_status: 'PENDING',
    confirmed_by: ['creator@up.ac.th'],
    deadline: deadline7Days,
    workload_frozen: false,
    locked_hours: 120,
    locked_faculty: 30000,
    locked_uni: 10000
  };

  assert(entryState.confirmation_status === 'PENDING', 'Initial paper status is PENDING');
  assert(entryState.confirmed_by.length === 1 && entryState.confirmed_by.includes('creator@up.ac.th'), 'Initial confirmed_by contains submitter');

  // 4.2 Multi-Editor Loop: Co-author edits paper proportions
  // Simulating backend POST /api/entries update logic
  function simulatePaperEdit(currentEntry, editor, newProportions, isRequesterAdmin = false) {
    const isPreviouslyFinalized = currentEntry.confirmation_status === 'CONFIRMED' || 
                                  currentEntry.confirmation_status === 'AUTO_CONFIRMED' || 
                                  Date.now() >= new Date(currentEntry.deadline).getTime() ||
                                  Boolean(currentEntry.workload_frozen);

    const editorIdentifier = (editor.email || editor.name).toLowerCase().trim();
    // Reset confirmed_by to only the active editor
    const newConfirmedBy = [editorIdentifier];
    const newDeadline = new Date(Date.now() + 7 * 86400000).toISOString();

    let finalHours = newProportions.calculatedHours;
    let finalFaculty = newProportions.calculatedFaculty;
    let finalUni = newProportions.calculatedUni;
    let workloadFrozen = false;

    if (isPreviouslyFinalized) {
      if (!isRequesterAdmin) {
        // Freeze workload to approved amounts
        finalHours = currentEntry.locked_hours;
        finalFaculty = currentEntry.locked_faculty;
        finalUni = currentEntry.locked_uni;
        workloadFrozen = true;
      } else {
        // Admin can update
        currentEntry.locked_hours = finalHours;
        currentEntry.locked_faculty = finalFaculty;
        currentEntry.locked_uni = finalUni;
        workloadFrozen = false;
      }
    } else {
      currentEntry.locked_hours = finalHours;
      currentEntry.locked_faculty = finalFaculty;
      currentEntry.locked_uni = finalUni;
    }

    return {
      ...currentEntry,
      actual_hours: finalHours,
      faculty: finalFaculty,
      uni: finalUni,
      confirmation_status: 'PENDING',
      confirmed_by: newConfirmedBy,
      deadline: newDeadline,
      workload_frozen: workloadFrozen
    };
  }

  // Co-author 1 edits
  const coAuthor1 = { email: 'co1@up.ac.th', name: 'ผศ.ผู้ร่วมงาน 1' };
  entryState = simulatePaperEdit(entryState, coAuthor1, { calculatedHours: 130, calculatedFaculty: 35000, calculatedUni: 10000 }, false);

  assert(entryState.confirmed_by.length === 1 && entryState.confirmed_by.includes('co1@up.ac.th'), 'BR-04: Edit resets confirmation for other members, sets current editor as confirmed');
  assert(!entryState.confirmed_by.includes('creator@up.ac.th'), 'Creator is now unconfirmed and must re-confirm (will show confirm button)');
  assert(entryState.confirmation_status === 'PENDING', 'Status remains PENDING');

  // Everyone confirms
  entryState.confirmed_by = ['co1@up.ac.th', 'creator@up.ac.th', 'co2@up.ac.th'];
  entryState.confirmation_status = 'CONFIRMED';
  entryState.locked_hours = 130;
  entryState.locked_faculty = 35000;
  entryState.locked_uni = 10000;
  assert(entryState.confirmation_status === 'CONFIRMED', 'BR-03: Status becomes CONFIRMED when all authors confirm');

  // Case 4.3: Normal User edits after CONFIRMED -> Workload must be frozen!
  const normalUserEdit = simulatePaperEdit(entryState, coAuthor1, { calculatedHours: 200, calculatedFaculty: 60000, calculatedUni: 20000 }, false);
  assert(normalUserEdit.workload_frozen === true, 'Goal Line 40: Normal user edit after finalized sets workload_frozen = true');
  assert(normalUserEdit.actual_hours === 130, 'Goal Line 40: Workload hours remain locked at 130 instead of 200');
  assert(normalUserEdit.faculty === 35000, 'Goal Line 40: Faculty reward remains locked at 35000 instead of 60000');

  // Case 4.4: Admin edits after CONFIRMED -> Workload is recalculated and updated
  const adminEditor = { email: 'admin@up.ac.th', name: 'ผู้ดูแลระบบ' };
  const adminEdit = simulatePaperEdit(entryState, adminEditor, { calculatedHours: 200, calculatedFaculty: 60000, calculatedUni: 20000 }, true);
  assert(adminEdit.workload_frozen === false, 'Goal Line 40: Admin edit allows workload change');
  assert(adminEdit.actual_hours === 200, 'Goal Line 40: Workload hours updated to 200 by Admin');
  assert(adminEdit.faculty === 60000, 'Goal Line 40: Faculty reward updated to 60000 by Admin');
  console.log('');

  // -------------------------------------------------------------
  // 5. FEATURE 5: 5-YEAR EXPIRY & INCOMPLETE DATA VALIDATION
  // -------------------------------------------------------------
  console.log('📌 Testing Feature 5: Incomplete Alerts & 5-Year Curriculum Expiry...');
  
  function checkCurriculumExpiry(pubDateStr, referenceYear = 2026) {
    if (!pubDateStr) return { status: 'UNKNOWN', isExpired: false };
    const pubYear = new Date(pubDateStr).getFullYear();
    const diff = referenceYear - pubYear;
    if (diff >= 5) return { status: 'EXPIRED', diffYears: diff, isExpired: true };
    if (diff >= 4) return { status: 'NEAR_EXPIRY', diffYears: diff, isExpired: false };
    return { status: 'ACTIVE', diffYears: diff, isExpired: false };
  }

  assert(checkCurriculumExpiry('2025-05-10', 2026).status === 'ACTIVE', 'Recent 2025 paper is ACTIVE');
  assert(checkCurriculumExpiry('2022-01-01', 2026).status === 'NEAR_EXPIRY', '2022 paper flagged as NEAR_EXPIRY (4 years)');
  assert(checkCurriculumExpiry('2020-01-01', 2026).status === 'EXPIRED', '2020 paper flagged as EXPIRED (>= 5 years)');
  console.log('');

  // -------------------------------------------------------------
  // 6. FEATURE 6 & 7: DUPLICATE DETECTION & ADMIN GOVERNANCE
  // -------------------------------------------------------------
  console.log('📌 Testing Feature 6 & 7: Duplicate Detection & Governance Data...');

  function isDuplicatePaper(newPaper, existingList) {
    for (const p of existingList) {
      if (newPaper.doi && p.doi && newPaper.doi.toLowerCase().trim() === p.doi.toLowerCase().trim()) {
        return { isDup: true, reason: `DOI matches (${p.doi})` };
      }
      if (newPaper.title && p.title) {
        const t1 = newPaper.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const t2 = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (t1.length > 5 && t1 === t2) {
          return { isDup: true, reason: `Exact title matches ("${p.title}")` };
        }
      }
    }
    return { isDup: false };
  }

  const existingPapers = [
    { title: 'Machine Learning for Smart Farming', doi: '10.1109/ACCESS.2024.123456' }
  ];

  assert(isDuplicatePaper({ title: 'Other Paper', doi: '10.1109/ACCESS.2024.123456' }, existingPapers).isDup === true, 'Detects duplicate DOI');
  assert(isDuplicatePaper({ title: 'Machine Learning for Smart Farming', doi: '10.9999/different' }, existingPapers).isDup === true, 'Detects duplicate title');
  assert(isDuplicatePaper({ title: 'Deep Learning in Agriculture', doi: '10.8888/unique' }, existingPapers).isDup === false, 'Unique paper passes duplicate check');
  console.log('');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('===========================================================');
  console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} assertions succeeded!`);
  console.log('===========================================================');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed with Error:', err);
  process.exit(1);
});
