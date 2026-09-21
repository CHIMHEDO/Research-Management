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