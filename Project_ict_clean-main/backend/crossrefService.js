const CROSSREF_API = 'https://api.crossref.org/works';
const OPENALEX_API = 'https://api.openalex.org/works';

const STOP = new Set(['a','an','the','of','in','on','for','and','to','with','among','its']);

function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}

function tok(s) {
  return new Set(norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
}

function titleSimilarity(a, b) {
  const A = tok(a), B = tok(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return (2 * hit) / (A.size + B.size);
}

function cleanDoi(doi) {
  return String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
}

function firstAuthorLastName(authors) {
  if (!Array.isArray(authors) || !authors.length) return '';
  const name = authors[0]?.family || authors[0]?.name || '';
  return String(name).split(/\s+/).pop() || '';
}

async function enrichByDoi(doi, signal) {
  if (!doi) return { success: false, reason: 'no_doi' };
  const clean = cleanDoi(doi);

  // Try Crossref first
  try {
    const url = `${CROSSREF_API}/${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UP-ICT-Research/1.0 (mailto:ict@up.ac.th)' },
      signal
    });
    if (res.ok) {
      const m = (await res.json()).message || {};
      const out = mapCrossref(m);
      if (out.abstract || out.keywords || out.concepts) {
        return { success: true, source: 'crossref', data: out };
      }
    }
  } catch (_) { /* fall through */ }

  // Fallback OpenAlex
  try {
    const url = `${OPENALEX_API}/doi:${encodeURIComponent(clean)}`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const m = await res.json();
      if (m) {
        const out = mapOpenAlex(m);
        return { success: true, source: 'openalex', data: out };
      }
    }
  } catch (_) { /* fall through */ }

  return { success: false, reason: 'not_found' };
}

async function findDoiByTitle(title, year, signal) {
  if (!title) return { success: false, reason: 'no_title' };

  // Try Crossref title search
  try {
    const url = `${CROSSREF_API}?query.title=${encodeURIComponent(title)}&rows=5`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UP-ICT-Research/1.0 (mailto:ict@up.ac.th)' },
      signal
    });
    if (res.ok) {
      const items = (await res.json()).message?.items || [];
      for (const item of items) {
        if (titleSimilarity(title, item.title?.[0] || '') >= 0.92) {
          const y = item.published?.['date-parts']?.[0]?.[0];
          if (!year || Math.abs((y || 0) - year) <= 1) {
            const firstAuth = firstAuthorLastName(item.author);
            return { success: true, source: 'crossref', doi: item.DOI, similarity: 0.92 };
          }
        }
      }
    }
  } catch (_) { /* fall through */ }

  // Try OpenAlex title search
  try {
    const url = `${OPENALEX_API}?filter=title.search:${encodeURIComponent(title)}&per-page=5`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const results = (await res.json()).results || [];
      for (const item of results) {
        const sim = titleSimilarity(title, item.display_name || '');
        if (sim >= 0.92) {
          const y = item.publication_year;
          if (!year || Math.abs((y || 0) - year) <= 1) {
            return { success: true, source: 'openalex', doi: item.doi, similarity: sim };
          }
        }
      }
    }
  } catch (_) { /* fall through */ }

  return { success: false, reason: 'not_found' };
}

function mapCrossref(m) {
  const parts = m.published?.['date-parts']?.[0] ||
    m['published-online']?.['date-parts']?.[0] ||
    m['published-print']?.['date-parts']?.[0] || [];
  const [y, mo = 1, d = 1] = parts;

  return {
    title: Array.isArray(m.title) ? m.title[0] : m.title,
    journal: m['container-title']?.[0] || m['event']?.name || m.publisher || '',
    volume: m.volume || '',
    issue: m.issue || '',
    pages: m.page || '',
    publicationDate: y ? `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '',
    abstract: (m.abstract || '').replace(/<[^>]+>/g, '').trim(),
    keywords: Array.isArray(m.subject) ? m.subject : (m.subject ? [m.subject] : []),
    authors: (m.author || []).map(a => ({
      name: [a.given, a.family].filter(Boolean).join(' '),
      affiliation: a.affiliation?.[0]?.name || '',
      isCorresponding: a.sequence === 'additional' ? false : undefined,
      orcid: a.ORCID || ''
    })),
    concepts: [],
    type: m.type
  };
}

function mapOpenAlex(m) {
  const inv = m.abstract_inverted_index;
  let abstract = '';
  if (inv) {
    const arr = [];
    for (const [word, positions] of Object.entries(inv)) {
      for (const pos of positions) arr[pos] = word;
    }
    abstract = arr.join(' ');
  }

  // รวมทั้ง keywords และ concepts จาก OpenAlex
  const kwList = (m.keywords || []).map(k => k.display_name)
    .concat((m.concepts || []).slice(0, 8).map(c => c.display_name));
  const uniqueKw = Array.from(new Set(kwList));

  return {
    title: m.display_name,
    journal: m.primary_location?.source?.display_name || m.host_venue?.display_name || '',
    volume: m.biblio?.volume || '',
    issue: m.biblio?.issue || '',
    pages: m.biblio?.first_page ? `${m.biblio.first_page}-${m.biblio.last_page || ''}` : '',
    publicationDate: m.publication_date || '',
    abstract,
    keywords: uniqueKw,
    authors: (m.authorships || []).map(a => ({
      name: a.author?.display_name || '',
      affiliation: a.institutions?.[0]?.display_name || '',
      isCorresponding: a.is_corresponding || undefined,
      orcid: a.author?.orcid || ''
    })),
    concepts: (m.concepts || []).slice(0, 10).map(c => c.display_name),
    type: m.type
  };
}

module.exports = {
  enrichByDoi,
  findDoiByTitle,
  titleSimilarity
};