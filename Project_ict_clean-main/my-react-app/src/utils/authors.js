import { AUTHOR_ROLE, isFirstRole, isCorrespondingRole, isCoAuthorRole } from '../constants/authorRoles.js';
import { UP_ICT_FACULTY } from '../constants/facultyList.js';

const TITLES = /^(นาย|นาง|นางสาว|ดร|ผศ|รศ|ศ|น\.ส|mr|mrs|ms|dr|prof|assoc|asst)\.?\s*/i;

const key = (s) => {
  let t = String(s).replace(TITLES, '').replace(/[.,]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!t.length) return '';
  if (t.length === 1) return t[0].toLowerCase();
  const last = t[t.length - 1];
  const first = t.find(x => x !== last) || '';
  return `${last}|${first[0] || ''}`.toLowerCase();
};

function norm(s) {
  return String(s).toLowerCase().replace(/[.\s]/g, '');
}

/**
 * Extract author name from various object formats:
 * - Crossref/OpenAlex: { given, family, affiliation, isCorresponding, orcid, seq }
 * - Scopus: { name, affiliation, seq, isCorresponding }
 * - Simple: { name, affiliation }
 * - String: 'Author Name'
 */
const extractAuthorInfo = (author) => {
  if (typeof author === 'string') {
    return { name: author, affiliation: '', seq: 0, isCorresponding: false };
  }
  if (!author || typeof author !== 'object') {
    return { name: '', affiliation: '', seq: 0, isCorresponding: false };
  }
  
  // Crossref/OpenAlex format: { given, family, affiliation, isCorresponding, orcid, seq }
  if (author.given || author.family) {
    const name = [author.given, author.family].filter(Boolean).join(' ').trim();
    return {
      name,
      affiliation: author.affiliation || '',
      seq: Number(author.seq || 0),
      isCorresponding: author.isCorresponding === true
    };
  }
  
  // Scopus/other format: { name, authname, affiliation, isCorresponding, seq }
  if (author.name || author.authname) {
    return {
      name: author.name || author.authname,
      affiliation: author.affiliation || '',
      seq: Number(author.seq || author['@seq'] || 0),
      isCorresponding: author.isCorresponding === true
    };
  }
  
  return { name: '', affiliation: '', seq: 0, isCorresponding: false };
};

export function parseImportedAuthors(raw, { isScopusImport = false, correspondingName = null } = {}) {
  let authors = [];
  
  if (Array.isArray(raw)) {
    // Handle array of objects (Crossref/OpenAlex/Scopus) or strings
    authors = raw.map(extractAuthorInfo).filter(a => a.name);
  } else if (typeof raw === 'string') {
    // String format: split by separators
    const names = raw.split(isScopusImport ? /\s*;\s*/ : /\s*;\s*|\s+and\s+|\s*,\s*(?![A-Z]\.?\s*$)/i);
    authors = names
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((name, index) => ({ name, affiliation: '', seq: index + 1, isCorresponding: false }));
  } else {
    return [];
  }

  // Filter out "et al."
  authors = authors.filter(a => a.name && !/^et\s*\.?\s*al\.?$/i.test(a.name));
  
  // Deduplicate by normalized name key
  const nameMap = new Map();
  for (const a of authors) {
    const k = key(a.name);
    if (!nameMap.has(k)) {
      nameMap.set(k, a);
    }
  }
  authors = [...nameMap.values()];
  
  if (!authors.length) return [];

  // Sort by seq if available (Crossref/OpenAlex/Scopus)
  authors.sort((a, b) => (a.seq || 0) - (b.seq || 0));

  // Check if source explicitly specifies corresponding author
  const hasExplicitCorresponding = correspondingName != null;

  // Find index of explicitly specified corresponding author
  const idxExplicitCorr = hasExplicitCorresponding 
    ? authors.findIndex(a => key(a.name) === key(correspondingName))
    : -1;

  const baseAuthors = authors.map((a, i) => {
    const isFirst = i === 0;
    const isLast = i === authors.length - 1;

    let role;
    let isCorresponding = a.isCorresponding || false;

    if (authors.length === 1) {
      // Single author: First & Corresponding
      role = AUTHOR_ROLE.FIRST_AND_CORRESPONDING;
      isCorresponding = true;
    } else if (hasExplicitCorresponding && idxExplicitCorr >= 0 && i === idxExplicitCorr) {
      // Explicit corresponding author from source
      role = AUTHOR_ROLE.CORRESPONDING;
      isCorresponding = true;
    } else if (hasExplicitCorresponding) {
      // Source has corresponding but not this author
      if (isFirst) role = AUTHOR_ROLE.FIRST;
      else if (isLast) role = AUTHOR_ROLE.CORRESPONDING;
      else role = AUTHOR_ROLE.CO_AUTHOR;
      isCorresponding = isLast; // Fallback: last is corresponding
    } else {
      // No explicit corresponding from source: check if any author has isCorresponding flag
      const anyHasCorresponding = authors.some(au => au.isCorresponding);
      if (anyHasCorresponding) {
        if (a.isCorresponding) role = AUTHOR_ROLE.CORRESPONDING;
        else if (isFirst) role = AUTHOR_ROLE.FIRST;
        else role = AUTHOR_ROLE.CO_AUTHOR;
      } else {
        // No explicit corresponding from source: last author = Corresponding
        if (isFirst) role = AUTHOR_ROLE.FIRST;
        else if (isLast) { role = AUTHOR_ROLE.CORRESPONDING; isCorresponding = true; }
        else role = AUTHOR_ROLE.CO_AUTHOR;
      }
    }

    return {
      role,
      name: a.name,
      affiliation: a.affiliation || '',
      proportion: 0,
      isCorresponding,
      seq: a.seq
    };
  });

  return applyEqualSplit(baseAuthors);
}

export function applyEqualSplit(list) {
  const n = list.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...list[0], proportion: 100 }];
  const base = Math.floor((100 / n) * 100) / 100;
  const out = list.map(a => ({ ...a, proportion: base }));
  out[0].proportion = Math.round((out[0].proportion + (100 - base * n)) * 100) / 100;
  return out;
}

export function titleSimilarity(a, b) {
  const STOP = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'for', 'and', 'to', 'with', 'among', 'its']);
  const clean = s => String(s || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const tok = s => new Set(clean(s).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
  const A = tok(a), B = tok(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return (2 * hit) / (A.size + B.size);
}

/**
 * Real-time author proportion and hierarchy validation
 * Rule: First author >= Corresponding author >= Co author, Total = 100%
 */
export function validateAuthorProportions(authorList = []) {
  if (!authorList || authorList.length === 0) {
    return {
      isValid: false,
      totalSum: 0,
      isTotal100: false,
      hasEmpty: true,
      isHierarchyValid: false,
      hierarchyErrors: ["กรุณาเพิ่มผู้แต่งอย่างน้อย 1 คน"]
    };
  }

  const hasEmpty = authorList.some(
    a => a.proportion === "" || a.proportion === undefined || a.proportion === null
  );

  const totalSum = Number(authorList.reduce((sum, a) => sum + (Number(a.proportion) || 0), 0).toFixed(1));
  const isTotal100 = Math.abs(totalSum - 100) < 0.1;

  const hierarchyErrors = [];
  const firstAuthor = authorList.find(a => isFirstRole(a.role));
  const pFirst = firstAuthor && firstAuthor.proportion !== "" && firstAuthor.proportion !== undefined 
    ? Number(firstAuthor.proportion) 
    : null;
  const corrAuthors = authorList.filter(a => isCorrespondingRole(a.role) && a !== firstAuthor);
  const coAuthors = authorList.filter(a => isCoAuthorRole(a.role));

  if (authorList.length === 1) {
    if (!hasEmpty && pFirst !== null && pFirst !== 100) {
      hierarchyErrors.push("ผู้แต่ง 1 คน สัดส่วนต้องเท่ากับ 100%");
    }
  } else if (authorList.length > 1) {
    if (!firstAuthor) {
      hierarchyErrors.push("ต้องระบุ First author อย่างน้อย 1 ท่าน");
    }

    if (!hasEmpty && pFirst !== null && pFirst >= 100) {
      hierarchyErrors.push("กรณีมีผู้แต่งหลายคน First author จะต้องน้อยกว่า 100% (ต้องกระจายสัดส่วนให้ผู้แต่งท่านอื่น)");
    }

    const hasZeroOrLess = authorList.some(
      a => a.proportion !== "" && a.proportion !== undefined && a.proportion !== null && Number(a.proportion) <= 0
    );
    if (hasZeroOrLess) {
      hierarchyErrors.push("กรณีมีผู้แต่งหลายคน ผู้แต่งทุกคนต้องมีสัดส่วนมากกว่า 0%");
    }

    // Rule: First author >= Corresponding author
    if (pFirst !== null) {
      for (const corr of corrAuthors) {
        if (corr.proportion !== "" && corr.proportion !== undefined && corr.proportion !== null) {
          const pCorr = Number(corr.proportion);
          if (pCorr > pFirst) {
            hierarchyErrors.push(`สัดส่วน Corresponding author (${pCorr}%) ต้องไม่มากกว่า First author (${pFirst}%)`);
          }
        }
      }
    }

    // Rule: Corresponding author >= Co author (or First author >= Co author if no Corresponding)
    if (corrAuthors.length > 0) {
      const validCorrProps = corrAuthors
        .filter(c => c.proportion !== "" && c.proportion !== undefined && c.proportion !== null)
        .map(c => Number(c.proportion));
      if (validCorrProps.length > 0) {
        const minCorrProp = Math.min(...validCorrProps);
        for (const co of coAuthors) {
          if (co.proportion !== "" && co.proportion !== undefined && co.proportion !== null) {
            const pCo = Number(co.proportion);
            if (pCo > minCorrProp) {
              hierarchyErrors.push(`สัดส่วน Co author (${pCo}%) ต้องไม่มากกว่า Corresponding author (${minCorrProp}%)`);
            }
          }
        }
      }
    } else if (pFirst !== null) {
      for (const co of coAuthors) {
        if (co.proportion !== "" && co.proportion !== undefined && co.proportion !== null) {
          const pCo = Number(co.proportion);
          if (pCo > pFirst) {
            hierarchyErrors.push(`สัดส่วน Co author (${pCo}%) ต้องไม่มากกว่า First author (${pFirst}%)`);
          }
        }
      }
    }
  }

  const isHierarchyValid = hierarchyErrors.length === 0;
  const isValid = !hasEmpty && isTotal100 && isHierarchyValid;

  return {
    isValid,
    totalSum,
    isTotal100,
    hasEmpty,
    isHierarchyValid,
    hierarchyErrors,
    firstAuthorProportion: pFirst
  };
}

/**
 * ทำความสะอาดชื่อและตัดคำนำหน้าทางวิชาการ (ไทย / อังกฤษ)
 */
export function sanitizePersonName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let name = rawName.trim();

  const thPrefixes = [
    /^(ศาสตราจารย์\s*ดร\.|ศ\.\s*ดร\.)/i,
    /^(รองศาสตราจารย์\s*ดร\.|รศ\.\s*ดร\.)/i,
    /^(ผู้ช่วยศาสตราจารย์\s*ดร\.|ผศ\.\s*ดร\.)/i,
    /^(ศาสตราจารย์|ศ\.)/i,
    /^(รองศาสตราจารย์|รศ\.)/i,
    /^(ผู้ช่วยศาสตราจารย์|ผศ\.)/i,
    /^(อาจารย์\s*ดร\.|อ\.\s*ดร\.)/i,
    /^(อาจารย์|อ\.)/i,
    /^(ดร\.|ดร\b)/i,
    /^(นาย|นางสาว|นาง)/i
  ];

  const enPrefixes = [
    /^(assoc\.\s*prof\.\s*dr\.|assoc\.\s*prof\.|asst\.\s*prof\.\s*dr\.|asst\.\s*prof\.)/i,
    /^(prof\.\s*dr\.|prof\.)/i,
    /^(dr\.|dr\b)/i,
    /^(mr\.|mrs\.|ms\.)/i,
    /^(lecturer|instructor|teacher)/i
  ];

  for (const regex of [...thPrefixes, ...enPrefixes]) {
    name = name.replace(regex, '');
  }

  return name.replace(/['"`,]/g, ' ')
             .replace(/\./g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
             .toLowerCase();
}

/**
 * ตรวจสอบว่าชื่อ 2 ชื่อตรงกันหรือไม่ (Strict & Multi-tier Matching)
 */
export function isNameMatch(nameA, nameB) {
  const cleanA = sanitizePersonName(nameA);
  const cleanB = sanitizePersonName(nameB);

  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const tokensA = cleanA.split(' ').filter(Boolean);
  const tokensB = cleanB.split(' ').filter(Boolean);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // 1. ตรวจสอบชื่อ-นามสกุล 2 คำขึ้นไป
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const aFirst = tokensA[0];
    const aLast = tokensA[tokensA.length - 1];
    const bFirst = tokensB[0];
    const bLast = tokensB[tokensB.length - 1];

    // First Last === First Last
    if (aFirst === bFirst && aLast === bLast) return true;
    // Last First === First Last
    if (aFirst === bLast && aLast === bFirst) return true;

    // ชื่อย่อ: "N. Harnsamut" vs "Nattapon Harnsamut"
    if (aFirst.length === 1 && aLast === bLast && bFirst.startsWith(aFirst)) return true;
    if (bFirst.length === 1 && aLast === bLast && aFirst.startsWith(bFirst)) return true;

    // Scopus format: "Harnsamut, N." vs "Nattapon Harnsamut"
    if (aLast.length === 1 && aFirst === bLast && bFirst.startsWith(aLast)) return true;
    if (bLast.length === 1 && aFirst === bFirst && aLast.startsWith(bLast)) return true;
  }

  // 2. กรณีตรงกันแบบ Exact Substring สำหรับภาษาไทย (ไม่มี space)
  if (cleanA.length >= 4 && (cleanB.includes(cleanA) || cleanA.includes(cleanB))) {
    return true;
  }

  return false;
}

/**
 * ค้นหาแถวผู้แต่งใน authorList ที่ตรงกับผู้ใช้งาน (เจ้าของไอดี / ผู้ยื่น)
 * โดยรองรับทั้งภาษาไทย, ภาษาอังกฤษ, และการจับคู่ผ่านฐานข้อมูลอาจารย์ staffList
 */
export function findAuthorRowForUser(authorList = [], user = null, formAuthorName = '', staffList = []) {
  if (!Array.isArray(authorList) || authorList.length === 0) return null;

  // รวบรวมชื่อ candidate ทั้งหมดของผู้ใช้ปัจจุบัน
  const candidateNames = new Set();

  if (user) {
    if (user.name_th) candidateNames.add(user.name_th);
    if (user.name_en) candidateNames.add(user.name_en);
    if (user.full_name) candidateNames.add(user.full_name);
    if (user.username) candidateNames.add(user.username);
  }

  if (formAuthorName) {
    candidateNames.add(formAuthorName);
  }

  // ใช้ staffList ที่ส่งเข้ามา หรือใช้ฐานข้อมูล UP_ICT_FACULTY เป็น fallback ทันที
  const effectiveStaffList = (Array.isArray(staffList) && staffList.length > 0) ? staffList : UP_ICT_FACULTY;

  if (Array.isArray(effectiveStaffList) && effectiveStaffList.length > 0) {
    const userEmail = user?.email?.toLowerCase().trim();
    
    // หา staff จาก email หรือ candidate names ที่มีอยู่
    const matchedStaff = effectiveStaffList.find(staff => {
      if (userEmail && staff.email && staff.email.toLowerCase().trim() === userEmail) return true;
      for (const cName of candidateNames) {
        if (isNameMatch(cName, staff.name_th) || isNameMatch(cName, staff.name_en) || isNameMatch(cName, staff.full_name)) {
          return true;
        }
      }
      return false;
    });

    if (matchedStaff) {
      if (matchedStaff.name_th) candidateNames.add(matchedStaff.name_th);
      if (matchedStaff.name_en) candidateNames.add(matchedStaff.name_en);
      if (matchedStaff.full_name) candidateNames.add(matchedStaff.full_name);
    }
  }

  const candidateList = Array.from(candidateNames).filter(Boolean);

  // 1. ค้นหาแถวใน authorList ที่ตรงกับ candidate names
  for (let i = 0; i < authorList.length; i++) {
    const author = authorList[i];
    const aName = author.name || '';
    if (!aName) continue;

    for (const cName of candidateList) {
      if (isNameMatch(aName, cName)) {
        return {
          ...author,
          matchIndex: i,
          isUserMatched: true
        };
      }
    }
  }

  // 2. ถ้ามีผู้แต่งคนเดียว ให้ถือว่าเป็นผู้ใช้เลย
  if (authorList.length === 1) {
    return {
      ...authorList[0],
      matchIndex: 0,
      isUserMatched: true
    };
  }

  // 3. Fallback: ถ้าหาไม่พบจริงๆ คืนค่าแถวแรกพร้อมระบุว่าไม่เจาะจง
  return {
    ...authorList[0],
    matchIndex: 0,
    isUserMatched: false
  };
}