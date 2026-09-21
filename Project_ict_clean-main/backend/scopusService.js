const axios = require('axios');
const { supabase } = require('./db');
const { normalizeKeywords } = require('./utils/keywords');
require('dotenv').config();

/**
 * Extract full author list from Scopus Abstract Retrieval API response
 * Returns array of authors with name, affiliation, seq, isCorresponding
 */
function extractScopusAuthors(entry = {}) {
  // Priority 1: Full author list from Abstract Retrieval API
  const rawAuthors = entry.authors?.author || entry.author || [];
  const list = Array.isArray(rawAuthors) ? rawAuthors : [rawAuthors].filter(Boolean);

  if (list.length > 0) {
    return list
      .map((author) => {
        const given = author['ce:given-name'] || author.givenName || '';
        const surname = author.surname || author.lastName || '';
        const name = [given, surname].filter(Boolean).join(' ').trim() || author.authname || author['ce:indexed-name'] || '';
        
        const affiliation = author.affiliation?.affilname || author['affiliation']?.[0]?.affilname || '';
        
        const seq = Number(author['@seq'] || author.seq || 0);
        
        // Check for corresponding author indicators
        const isCorresponding = 
          author['@id'] === entry.correspondence ||
          String(author['@type'] || '').toLowerCase().includes('corresp') ||
          String(author['@type'] || '').toLowerCase().includes('correspond');
        
        return {
          name,
          affiliation,
          seq,
          isCorresponding,
          raw: author // keep raw for debugging
        };
      })
      .filter((author) => author.name)
      .sort((a, b) => a.seq - b.seq);
  }

  // Priority 2: Fallback to dc:creator (first author only)
  const creator = entry['dc:creator'] || entry.creator;
  if (creator) {
    return String(creator)
      .split(/\s*;\s*/)
      .map((name, index) => ({ name: name.trim(), seq: index + 1, affiliation: '', isCorresponding: index === 0 }));
  }

  return [];
}

/**
 * Extract actual publication date from Scopus entry
 * Priority: article date > issue cover date > year only
 */
function extractPublicationDate(entry = {}) {
  const coredata = entry.coredata || entry;
  
  // Priority 1: Actual article publication date (YYYY-MM-DD)
  const fullDate = 
    coredata['prism:coverDate'] ||  // This is often issue cover date
    coredata['prism:publicationDate'] ||
    coredata['prism:coverDisplayDate'] ||
    coredata.coverDate ||
    entry.coverDate ||
    '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(fullDate)) {
    return fullDate;
  }
  
  // Priority 2: Year only
  const year = 
    coredata['prism:coverDisplayDate'] ||
    coredata['prism:coverDate']?.slice(0, 4) ||
    coredata.publish_year ||
    entry.publish_year ||
    entry.year;
  
  const yearOnly = String(year || '').match(/\d{4}/)?.[0];
  return yearOnly ? `${yearOnly}-01-01` : '';
}

async function isPaperBlacklisted(userId, title) {
    if (!title) return false;
    const { data: blacklistRows } = await supabase
        .from('paper_blacklists')
        .select('id')
        .eq('user_id', userId)
        .ilike('scholar_title', title);
    return blacklistRows && blacklistRows.length > 0;
}

function isAuthorInRawText(authorName, rawAuthors) {
    if (!authorName || !rawAuthors) return false;
    const cleanAuthor = authorName.trim().toLowerCase();
    const cleanRaw = rawAuthors.toLowerCase();
    if (cleanRaw.includes(cleanAuthor)) return true;
    const parts = cleanAuthor.split(/\s+/);
    if (parts.length > 1 && parts.every(p => cleanRaw.includes(p))) return true;
    return false;
}

function cleanScopusPaper(paper) {
    if (!paper) return null;
    return {
        eid: paper.eid ?? null,
        title: paper.title?.trim() || 'Untitled',
        publish_year: paper.publish_year ?? null,
        authors_raw: paper.authors_raw ?? '',
        cited_by: Number(paper.cited_by ?? 0),
        journal: paper.journal ?? null,
        volume: paper.volume ?? null,
        issue: paper.issue ?? null,
        doi: paper.doi ?? null,
        abstract: paper.abstract ?? '',
        keywords: normalizeKeywords(
            paper.authkeywords ||
            paper.authorKeywords ||
            paper.keywords
        ),
        publication_date: paper.coverDate ? paper.coverDate.split('T')[0] : null,
        source: 'scopus'
    };
}

/**
 * Sync ข้อมูล Scopus ของอาจารย์รายบุคคล
 * บันทึกผลงานลง papers table พร้อม source: 'scopus'
 */
async function syncUserScopusData(userId) {
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId);
    if (!users || users.length === 0) {
        throw new Error(`ไม่พบผู้ใช้ ID: ${userId}`);
    }
    const user = users[0];
    if (!user.scopus_id) {
        throw new Error(`ผู้ใช้ยังไม่ได้ตั้งค่า Scopus ID`);
    }

    console.log(`[Scopus Sync] Fetching papers for authorId: ${user.scopus_id}`);
    const rawPapers = await getAuthorPapers(user.scopus_id);
    console.log(`[Scopus Sync] Before Supabase: ${rawPapers.length} papers, eids: ${rawPapers.map(p => p.eid).join(', ')}`);

    const results = {
        attempted: rawPapers.length,
        created: 0,
        updated: 0,
        linked: 0,
        alreadyLinked: 0,
        conflicts: 0,
        errors: 0,
        invalid: 0,
    };

    for (const rawPaper of rawPapers) {
        const paper = cleanScopusPaper(rawPaper);
        if (!paper || !paper.eid || !paper.title) {
            results.invalid++;
            continue;
        }

        if (await isPaperBlacklisted(userId, paper.title)) {
            continue;
        }

        // Step 1: Lookup by eid first
        const { data: existingByEid, error: eidLookupError } = await supabase
            .from('papers')
            .select('id,eid,title,publish_year,source,status')
            .eq('eid', paper.eid)
            .maybeSingle();
        if (eidLookupError) {
            console.error('[Scopus EID Lookup Error]', { eid: paper.eid, error: eidLookupError.message });
            results.errors++;
            continue;
        }

        let existingPaper = existingByEid;

        // Step 2: Fallback to title + publish_year
        if (!existingPaper) {
            const { data: existingByTitle, error: titleLookupError } = await supabase
                .from('papers')
                .select('id,eid,title,publish_year,source,status')
                .eq('title', paper.title)
                .eq('publish_year', paper.publish_year)
                .maybeSingle();
            if (titleLookupError) {
                console.error('[Scopus Title Lookup Error]', { title: paper.title, error: titleLookupError.message });
                results.errors++;
                continue;
            }
            existingPaper = existingByTitle;

            // Conflict check: if title+year matches but has different eid
            if (existingPaper && existingPaper.eid && existingPaper.eid !== paper.eid) {
                console.warn('[Scopus EID Conflict]', {
                    paperId: existingPaper.id, title: paper.title,
                    existingEid: existingPaper.eid, incomingEid: paper.eid
                });
                results.conflicts++;
                continue;
            }
        }

        let paperId = null;

        // Step 3: Update existing paper or create new
        if (existingPaper) {
            paperId = existingPaper.id;
            const { error: updError } = await supabase
                .from('papers')
                .update({
                    eid: paper.eid,
                    cited_by: paper.cited_by,
                    journal: paper.journal ?? existingPaper.journal,
                    volume: paper.volume ?? existingPaper.volume,
                    issue: paper.issue ?? existingPaper.issue,
                    doi: paper.doi ?? existingPaper.doi,
                    abstract: paper.abstract ?? existingPaper.abstract,
                    keywords: paper.keywords ?? existingPaper.keywords,
                    publication_date: paper.publication_date ?? existingPaper.publication_date
                })
                .eq('id', paperId);
            if (updError) {
                console.error('[Scopus Paper Update Error]', { paperId, eid: paper.eid, error: updError.message });
                results.errors++;
                continue;
            }
            results.updated++;
            console.log('[Scopus Paper Updated]', { paperId, eid: paper.eid });
        } else {
            const { data: createdPaper, error: createError } = await supabase
                .from('papers')
                .insert({
                    eid: paper.eid,
                    title: paper.title,
                    publish_year: paper.publish_year,
                    authors_raw: paper.authors_raw,
                    cited_by: paper.cited_by,
                    journal: paper.journal,
                    volume: paper.volume,
                    issue: paper.issue,
                    doi: paper.doi,
                    abstract: paper.abstract,
                    keywords: paper.keywords,
                    publication_date: paper.publication_date,
                    source: 'scopus',
                    status: 'DRAFT_AUTO'
                })
                .select('id,eid')
                .single();
            if (createError) {
                console.error('[Scopus Paper Create Error]', { eid: paper.eid, error: createError.message });
                results.errors++;
                continue;
            }
            paperId = createdPaper.id;
            results.created++;
            console.log('[Scopus Paper Created]', { paperId, eid: paper.eid });
        }

        // Step 4: Check/create user-paper relation
        const { data: existingLink, error: linkLookupError } = await supabase
            .from('paper_authors')
            .select('id')
            .eq('paper_id', paperId)
            .eq('user_id', userId)
            .maybeSingle();
        if (linkLookupError) {
            console.error('[Scopus Link Lookup Error]', { paperId, error: linkLookupError.message });
            results.errors++;
            continue;
        }

        if (existingLink) {
            results.alreadyLinked++;
        } else {
            const { error: linkError } = await supabase
                .from('paper_authors')
                .insert({ paper_id: paperId, user_id: userId, status: 'PENDING' });
            if (linkError) {
                console.error('[Scopus Link Create Error]', { paperId, error: linkError.message });
                results.errors++;
            } else {
                results.linked++;
                console.log('[Scopus Link Created]', { paperId, userId });
            }
        }
    }

    // Co-author matching (keep existing logic)
    const { data: allUsers } = await supabase
        .from('users')
        .select('id, name_en, name_th');

    // Note: co-author matching is skipped for scopus papers to avoid duplicate relations
    // The above loop already creates the user-paper relation for the syncing user

    console.log(`[Scopus Sync] User ${userId}: ${JSON.stringify(results)}`);

    return results;
}

const getPaperDetailsByEid = async (eid) => {
  try {
    const url = `https://api.elsevier.com/content/abstract/eid/${eid}`;
    const response = await axios.get(url, {
      headers: {
        'X-ELS-APIKey': process.env.SCOPUS_API_KEY,
        'Accept': 'application/json'
      }
    });
    const data = response.data['abstracts-retrieval-response'];
    const coredata = data.coredata || {};
    const entry = { ...data, coredata };
    
    // Extract full author list with seq, affiliation, corresponding status
    const authors = extractScopusAuthors(entry);
    
    // Extract actual publication date (article date, not issue cover date)
    const publication_date = extractPublicationDate(entry);
    
    // Abstract - try multiple fallback fields
    const abstract = coredata['dc:description'] 
      || coredata['prism:description'] 
      || coredata['description'] 
      || '';
    
    // Keywords - check multiple possible locations
    const keywords = data.authkeywords?.['author-keyword']?.map(k => k.$) 
      || coredata['subject-area']?.map(sa => sa['$']) 
      || [];
    
    const paperInfo = {
      title: coredata['dc:title'],
      doi: coredata['prism:doi'] || '',
      journal: coredata['prism:publicationName'] || '',
      publication_date,  // Actual article date, not issue cover date
      volume: coredata['prism:volume'] || '',
      issue: coredata['prism:issueIdentifier'] || '',
      abstract: abstract || '',
      authors,  // Full author array with seq, affiliation, isCorresponding
      keywords: normalizeKeywords(keywords)
    };
    return paperInfo;
  } catch (error) {
    console.error('Scopus API Error:', error.response?.data || error.message);
    throw new Error('ไม่สามารถดึงข้อมูลจาก Scopus ได้');
  }
};

const searchAuthorByName = async (name) => {
  try {
    // 🌟 ดักจับ: ถ้าผู้ใช้พิมพ์ตัวเลขล้วน (Author ID) ให้ข้ามการยิง API ค้นหาชื่อไปเลย
    if (/^\d+$/.test(name.trim())) {
      return [{
        name: `เข้าถึงข้อมูลด้วย Author ID: ${name.trim()}`,
        authorId: name.trim(),
        affiliation: 'คลิกเพื่อดึงข้อมูลผลงาน (Bypass Search)'
      }];
    }

    // โค้ดเดิมสำหรับยิง API ค้นหาชื่อ
    const response = await axios.get('https://api.elsevier.com/content/search/author', {
      params: { 
        query: `authlast(${name}) OR authfirst(${name})`, 
        view: 'STANDARD'
      },
      headers: {
        'X-ELS-APIKey': process.env.SCOPUS_API_KEY,
        'Accept': 'application/json'
      }
    });

    const entries = response.data['search-results']?.entry || [];
    return entries.map(entry => {
      const givenName = entry['preferred-name']?.['ce:given-name'] || '';
      const surname = entry['preferred-name']?.['ce:surname'] || '';
      const fullName = (givenName || surname) ? `${givenName} ${surname}`.trim() : (entry['dc:title'] || 'Unknown Author');
      const rawId = entry['dc:identifier'] || '';
      const authorId = rawId.replace('AUTHOR_ID:', '');
      const affiliation = entry['affiliation-current']?.['affiliation-name'] || 'ไม่ระบุสังกัด';
      return { name: fullName, authorId, affiliation };
    });

  } catch (error) {
    console.error("Scopus Author Search Error:", error.response?.data || error.message);
    throw new Error('ไม่สามารถค้นหาอาจารย์จาก Scopus ได้ (อาจติดสิทธิ์ Subscription)');
  }
};

async function getAuthorPapers(authorId) {
  const count = 25;
  let start = 0;
  let total = null;
  let page = 0;
  const maxPages = 20;
  const allEntries = [];

  try {
    do {
      const headers = {
        'X-ELS-APIKey': process.env.SCOPUS_API_KEY,
        Accept: 'application/json',
        ...(process.env.SCOPUS_INST_TOKEN ? { 'X-ELS-Insttoken': process.env.SCOPUS_INST_TOKEN } : {}),
      };

      const response = await axios.get('https://api.elsevier.com/content/search/scopus', {
        params: { query: `AU-ID(${authorId})`, view: 'STANDARD', count, start, sort: '-coverDate' },
        headers
      });

      const results = response.data?.['search-results'];
      const entries = Array.isArray(results?.entry) ? results.entry : [];

      total = Number(results?.['opensearch:totalResults'] ?? 0);
      const parsedTotal = Number.isFinite(total) ? total : allEntries.length + entries.length;
      total = parsedTotal;

      console.log('[Scopus API Response]', {
        authorId,
        page: page + 1,
        status: response.status,
        totalResults: total,
        startIndex: Number(results?.['opensearch:startIndex'] ?? start),
        itemsPerPage: Number(results?.['opensearch:itemsPerPage'] ?? entries.length),
        entriesReceived: entries.length,
      });

      if (entries.length === 0) break;
      allEntries.push(...entries);
      start += entries.length;
      page += 1;
    } while (start < total && page < maxPages);

    if (start < total && page >= maxPages) {
      console.warn('[Scopus Pagination Limit Reached]', {
        authorId, total, fetched: allEntries.length, maxPages
      });
    }

    const missingEidEntries = allEntries.filter(entry => !entry.eid);
    if (missingEidEntries.length > 0) {
      console.warn('[Scopus Missing EID]', {
        count: missingEidEntries.length,
        titles: missingEidEntries.map(e => e['dc:title'])
      });
    }

    const uniqueEntries = [
      ...new Map(
        allEntries.filter(entry => entry?.eid).map(entry => [entry.eid, entry])
      ).values()
    ];

    console.log('[Scopus Search Complete]', {
      authorId,
      reportedTotal: total,
      received: allEntries.length,
      unique: uniqueEntries.length
    });

    const mappedEntries = uniqueEntries.map(entry => {
      const coverDate = entry['prism:coverDate'] || '';
      const publishYear = coverDate ? Number(coverDate.slice(0, 4)) : null;
      
      // Parse authors from various possible fields
      let authorsRaw = '';
      if (entry['dc:creator']) {
        authorsRaw = entry['dc:creator'];
      } else if (entry.author && Array.isArray(entry.author)) {
        authorsRaw = entry.author.map(a => a?.authname).filter(Boolean).join(', ');
      } else if (entry.authors && Array.isArray(entry.authors)) {
        authorsRaw = entry.authors.map(a => a?.authname || a?.['ce:indexed-name']).filter(Boolean).join(', ');
      }
      
      // Extract author array if available in search results
      const authors = entry.author && Array.isArray(entry.author) 
        ? extractScopusAuthors({ authors: { author: entry.author }, coredata: entry })
        : [];

      return {
        eid: entry.eid ?? null,
        title: entry['dc:title']?.trim() || 'Untitled',
        publish_year: publishYear,
        coverDate: coverDate, // Full date for publication_date fallback
        authors_raw: authorsRaw,
        authors,  // Author array if available in search results
        cited_by: Number(entry['citedby-count'] ?? 0),
        journal: entry['prism:publicationName'] ?? null,
        volume: entry['prism:volume'] ?? null,
        issue: entry['prism:issueIdentifier'] ?? null,
        doi: entry['prism:doi'] ?? null,
        source: 'scopus',
        // These fields may be empty in search results, will be filled by detail retrieval
        abstract: '',
        keywords: []
      };
    });

    // For entries missing key fields, fetch details by EID
    const entriesNeedingDetail = mappedEntries.filter(e => 
      e.eid && (!e.abstract || !e.keywords?.length || !e.volume || !e.issue || !e.authors?.length)
    );

    if (entriesNeedingDetail.length > 0) {
      console.log(`[Scopus] Fetching details for ${entriesNeedingDetail.length} entries missing fields`);
      for (const entry of entriesNeedingDetail) {
        try {
          const detail = await getPaperDetailsByEid(entry.eid);
          if (detail) {
            entry.abstract = detail.abstract || entry.abstract;
            entry.keywords = detail.keywords || entry.keywords;
            entry.volume = detail.volume || entry.volume;
            entry.issue = detail.issue || entry.issue;
            entry.journal = detail.journal || entry.journal;
            // Use full author array from detail (prefer detail's authors over search's dc:creator)
            entry.authors = detail.authors || entry.authors;
            // Use actual publication date from detail (not issue cover date)
            entry.publication_date = detail.publication_date || entry.publication_date;
            entry.doi = detail.doi || entry.doi;
          }
        } catch (detailErr) {
          console.warn(`[Scopus] Detail fetch failed for ${entry.eid}:`, detailErr.message);
        }
      }
    }

    return mappedEntries;
  } catch (error) {
    console.error('[Scopus Author Papers Error]', {
      authorId,
      status: error.response?.status,
      headers: error.response?.headers,
      data: error.response?.data,
      message: error.message
    });
    throw new Error('ไม่สามารถดึงรายการผลงานจาก Scopus ได้');
  }
}

module.exports = {
  getPaperDetailsByEid,
  searchAuthorByName,
  getAuthorPapers,
  syncUserScopusData
};
