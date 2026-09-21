import { AUTHOR_ROLE } from '../constants/authorRoles';

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

export function parseImportedAuthors(raw, { isScopusImport = false, correspondingName = null } = {}) {
  let names;
  if (Array.isArray(raw)) {
    names = raw.map(a => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean);
  } else if (typeof raw === 'string') {
    names = raw.split(isScopusImport ? /\s*;\s*/ : /\s*;\s*|\s+and\s+|\s*,\s*(?![A-Z]\.?\s*$)/i);
    names = names.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  } else {
    return [];
  }

  names = names.filter(n => n && !/^et\s*\.?\s*al\.?$/i.test(n));
  const nameMap = new Map();
  for (const n of names) {
    nameMap.set(key(n), n);
  }
  names = [...nameMap.values()];
  if (!names.length) return [];

  const affOf = (n) => {
    if (Array.isArray(raw)) {
      return raw.find(a => (a?.name || a) === n)?.affiliation || '';
    }
    return '';
  };

  // Check if source explicitly specifies corresponding author
  const hasExplicitCorresponding = correspondingName != null;

  // Find index of explicitly specified corresponding author
  const idxExplicitCorr = hasExplicitCorresponding 
    ? names.findIndex(n => key(n) === key(correspondingName))
    : -1;

  const baseAuthors = names.map((n, i) => {
    const isFirst = i === 0;
    const isLast = i === names.length - 1;

    let role;
    let isCorresponding = false;

    if (names.length === 1) {
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
      // No explicit corresponding from source: last author = Corresponding
      if (isFirst) role = AUTHOR_ROLE.FIRST;
      else if (isLast) { role = AUTHOR_ROLE.CORRESPONDING; isCorresponding = true; }
      else role = AUTHOR_ROLE.CO_AUTHOR;
    }

    return {
      role,
      name: n,
      affiliation: affOf(n),
      proportion: 0,
      isCorresponding
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