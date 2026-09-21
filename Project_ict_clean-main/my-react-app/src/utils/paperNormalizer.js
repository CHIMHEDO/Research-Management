const isBlank = (value) =>
  value == null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const normalizeDoi = (value = '') =>
  value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase();

const parseKeywords = (keywords) => {
  if (isBlank(keywords)) return [];
  if (Array.isArray(keywords)) return keywords.filter(k => !isBlank(k));
  if (typeof keywords === 'string') {
    const trimmed = keywords.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(k => !isBlank(k));
      } catch { /* fall through */ }
    }
    return trimmed.split(/[,;|]/).map(k => k.trim()).filter(Boolean);
  }
  return [];
};

/**
 * Normalize keywords from API response (handles null, JSON string, CSV, array)
 * Used when receiving data from backend API where keywords might be stored as JSON string
 */
export const normalizePaperKeywords = (value) => {
  if (Array.isArray(value)) return value.filter(k => !isBlank(k));
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(k => !isBlank(k));
    } catch {
      return value
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

/**
 * Parse authors from various formats:
 * - Array of strings: ['Author One', 'Author Two']
 * - Array of objects with .name: [{ name: 'Author One' }, ...]
 * - Crossref/OpenAlex format: [{ given: 'First', family: 'Last', affiliation, isCorresponding, orcid }, ...]
 * - Comma-separated string: 'Author One, Author Two'
 */
const parseAuthors = (authors) => {
  if (isBlank(authors)) return [];
  if (Array.isArray(authors)) {
    // Crossref/OpenAlex format: array of objects with given/family
    if (authors.length > 0 && typeof authors[0] === 'object' && authors[0].given) {
      return authors
        .map(a => [a.given, a.family].filter(Boolean).join(' '))
        .filter(Boolean);
    }
    // Scopus format: array of strings OR objects with .name
    return authors.map(a => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean);
  }
  if (typeof authors === 'string') return authors.split(/[,;]| and /i).map(s => s.trim()).filter(Boolean);
  return [];
};

export const normalizeImportedPaper = (paperData = {}) => {
  const rawPublicationDate = 
    paperData.publicationDate ||
    paperData.publication_date ||
    paperData.coverDate ||
    paperData.cover_date ||
    paperData.date ||
    paperData.extractedDate ||
    paperData.publishDate ||
    paperData.publish_date ||
    paperData['prism:coverDate'] ||
    '';

  let publicationDate = '';
  if (rawPublicationDate) {
    if (typeof rawPublicationDate === 'string' && rawPublicationDate.includes('/')) {
      const parts = rawPublicationDate.split('/');
      if (parts.length === 3) {
        publicationDate = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
      }
    } else if (typeof rawPublicationDate === 'string' && rawPublicationDate.length === 4) {
      publicationDate = `${rawPublicationDate}-01-01`;
    } else if (typeof rawPublicationDate === 'string') {
      publicationDate = rawPublicationDate.split('T')[0];
    }
  } else if (paperData.publish_year) {
    publicationDate = `${paperData.publish_year}-01-01`;
  }

  const normalizedAuthors = parseAuthors(
    paperData.authors ||
    paperData.author_names ||
    paperData.creator ||
    paperData.authors_raw ||
    paperData['dc:creator'] ||
    []
  );

  const normalizedKeywords = parseKeywords(
    paperData.keywords ||
    paperData.authkeywords ||
    paperData.author_keywords ||
    paperData.subject ||
    paperData.concepts ||
    []
  );

  return {
    title: paperData.title || paperData.article_title || paperData.name || paperData['dc:title'] || '',
    authors: normalizedAuthors,
    journal: paperData.journal || paperData.publicationName || paperData.publication_name || paperData.publisher || paperData.venue || paperData.source_title || paperData['prism:publicationName'] || paperData.extractedJournal || '',
    doi: normalizeDoi(paperData.doi || paperData.article_doi || paperData.prism_doi || paperData['prism:doi'] || paperData.extractedDoi || ''),
    publicationDate,
    volume: paperData.volume || paperData.prism_volume || paperData['prism:volume'] || paperData.biblio?.volume || '',
    issue: paperData.issue || paperData.issueIdentifier || paperData.issue_identifier || paperData['prism:issueIdentifier'] || paperData.biblio?.issue || '',
    abstract: paperData.abstract || paperData.description || paperData.dc_description || paperData['dc:description'] || paperData.extractedAbstract || '',
    keywords: normalizedKeywords,
    source: paperData.source || '',
    eid: paperData.eid || '',
    scholar_url: paperData.scholar_url || '',
    publish_year: paperData.publish_year || '',
    cited_by: paperData.cited_by || 0,
    metadata_enriched_at: paperData.metadata_enriched_at || null,
    metadata_source: paperData.metadata_source || null,
    enrichment_status: paperData.enrichment_status || 'pending'
  };
};

/**
 * Smart merge: only fill missing fields from enriched data
 * - Authors: use enriched if it has MORE authors than source (Crossref fallback when Scopus incomplete)
 * - Date: prefer enriched if source date is issue cover date (day=01)
 */
export const mergeMissingPaperFields = (source, enriched) => {
  const srcAuthors = Array.isArray(source.authors) ? source.authors : [];
  const enrAuthors = Array.isArray(enriched.authors) ? enriched.authors : [];
  
  // Date: prefer enriched if source date is issue cover date (day=01)
  const srcDate = source.publicationDate || '';
  const enrDate = enriched.publicationDate || '';
  let finalDate = srcDate;
  if (enrDate && (!srcDate || (srcDate.split('-')[2] === '01'))) {
    finalDate = enrDate;
  }

  return {
    ...source,
    authors: enrAuthors.length > srcAuthors.length ? enrAuthors : srcAuthors,
    publicationDate: finalDate,
    abstract: isBlank(source.abstract) ? (enriched.abstract || '') : source.abstract,
    keywords: isBlank(source.keywords) ? (enriched.keywords || []) : source.keywords,
    volume: isBlank(source.volume) ? (enriched.volume || '') : source.volume,
    issue: isBlank(source.issue) ? (enriched.issue || '') : source.issue,
    journal: isBlank(source.journal) ? (enriched.journal || '') : source.journal,
    metadata_enriched_at: enriched.metadata_enriched_at || source.metadata_enriched_at || new Date().toISOString(),
    metadata_source: enriched.metadata_source || source.metadata_source || 'enrichment',
    enrichment_status: 'enriched'
  };
};

export const needsDoiEnrichment = (paper) =>
  [
    paper.abstract,
    paper.keywords,
    paper.volume,
    paper.issue
  ].some(isBlank);

export { isBlank, normalizeDoi, parseKeywords, parseAuthors };