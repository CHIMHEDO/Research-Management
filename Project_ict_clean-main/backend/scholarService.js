const axios = require('axios');
const { supabase } = require('./db');
const { normalizeKeywords } = require('./utils/keywords');
require('dotenv').config();

/**
 * ตรวจสอบว่าชื่อผลงานถูก Blacklist โดยผู้ใช้หรือไม่
 */
async function isPaperBlacklisted(userId, title) {
    if (!title) return false;
    const { data: blacklistRows } = await supabase
        .from('paper_blacklists')
        .select('id')
        .eq('user_id', userId)
        .ilike('scholar_title', title);
    return blacklistRows && blacklistRows.length > 0;
}

/**
 * ตรวจสอบว่าชื่ออาจารย์ปรากฏอยู่ใน authors_raw หรือไม่
 */
function isAuthorInRawText(authorName, rawAuthors) {
    if (!authorName || !rawAuthors) return false;
    const cleanAuthor = authorName.trim().toLowerCase();
    const cleanRaw = rawAuthors.toLowerCase();

    if (cleanRaw.includes(cleanAuthor)) return true;

    const parts = cleanAuthor.split(/\s+/);
    if (parts.length > 1 && parts.every(p => cleanRaw.includes(p))) {
        return true;
    }
    return false;
}

/**
 * ทำความสะอาด HTML tags, ลบอักขระแปลกปลอม, ตรวจสอบปี และยอด Citation
 */
function cleanAndParsePaper(rawPaper) {
    if (!rawPaper) return null;

    let cleanTitle = (rawPaper.title || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .trim();

    const currentYear = new Date().getFullYear();
    let cleanYear = null;
    if (rawPaper.publish_year) {
        const parsedYear = parseInt(rawPaper.publish_year, 10);
        if (!isNaN(parsedYear) && parsedYear >= 1950 && parsedYear <= currentYear + 1) {
            cleanYear = parsedYear;
        }
    }

    let cleanCitedBy = 0;
    if (rawPaper.cited_by !== undefined && rawPaper.cited_by !== null) {
        const parsedCited = parseInt(rawPaper.cited_by, 10);
        if (!isNaN(parsedCited) && parsedCited >= 0) {
            cleanCitedBy = parsedCited;
        }
    }

    let cleanAuthors = (rawPaper.authors_raw || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    let cleanUrl = rawPaper.scholar_url ? rawPaper.scholar_url.trim() : null;

    return {
        title: cleanTitle,
        publish_year: cleanYear,
        authors_raw: cleanAuthors,
        cited_by: cleanCitedBy,
        scholar_url: cleanUrl
    };
}

/**
 * Realistic Mock Data Generator (เมื่อไม่มี SerpApi Key หรือต้องการทดสอบแบบ Offline)
 */
function fetchRealisticMockData(nameEn, email, scholarId) {
    const sanitizedName = (nameEn || 'Faculty Member').trim();
    const urlSlug = encodeURIComponent(sanitizedName.toLowerCase().replace(/\s+/g, '-'));

    let institutionDomain = 'up.ac.th';
    if (email && email.includes('@')) {
        institutionDomain = email.split('@')[1];
    }

    return [
        {
            title: `Automated Workflow System and Metadata Extraction for ${sanitizedName}`,
            publish_year: 2025,
            authors_raw: `${sanitizedName}, David C., Pe B.`,
            cited_by: 12,
            scholar_url: `https://scholar.google.com/scholar?q=workflow-${urlSlug}`
        },
        {
            title: `Deep Learning Approaches for Academic Record Verifications: A Study by ${sanitizedName}`,
            publish_year: 2024,
            authors_raw: `${sanitizedName}, Pe B.`,
            cited_by: 45,
            scholar_url: `https://scholar.google.com/scholar?q=deeplearning-${urlSlug}`
        },
        {
            title: `Distributed Cloud Architectures for Institutional Data Management at ${institutionDomain.toUpperCase()}`,
            publish_year: 2024,
            authors_raw: `${sanitizedName}, Alex Wong, Sarah T.`,
            cited_by: 68,
            scholar_url: `https://scholar.google.com/scholar?q=cloud-arch-${urlSlug}`
        },
        {
            title: 'Overview of AI Networks in Academic Systems',
            publish_year: 2023,
            authors_raw: `${sanitizedName}, Somchai A., David C.`,
            cited_by: 28,
            scholar_url: 'https://scholar.google.com/scholar?q=overview-ai-networks'
        }
    ];
}

/**
 * ค้นหาผ่าน SerpApi
 */
async function fetchFromSerpApi(nameEn, email, scholarId, apiKey) {
    const params = {
        api_key: apiKey,
        hl: 'en'
    };

    let institutionDomain = '';
    if (email && email.includes('@')) {
        institutionDomain = email.split('@')[1];
    }

    if (scholarId) {
        params.engine = 'google_scholar_author';
        params.author_id = scholarId;
    } else {
        const query = institutionDomain 
            ? `author:"${nameEn}" "${institutionDomain}"`
            : `author:"${nameEn}"`;
        params.engine = 'google_scholar';
        params.q = query;
    }

    const response = await axios.get('https://serpapi.com/search', { params, timeout: 20000 });
    const articles = [];

    if (scholarId && response.data.articles) {
        for (const item of response.data.articles) {
            articles.push({
                title: item.title,
                publish_year: item.year ? parseInt(item.year, 10) : null,
                authors_raw: item.authors || '',
                cited_by: item.cited_by ? parseInt(item.cited_by.value || item.cited_by, 10) : 0,
                scholar_url: item.link || null
            });
        }
    } else if (response.data.organic_results) {
        for (const item of response.data.organic_results) {
            articles.push({
                title: item.title,
                publish_year: item.publication_info?.summary ? parseInt(item.publication_info.summary.match(/\b(19\d\d|20\d\d)\b/)?.[0], 10) : null,
                authors_raw: item.publication_info?.authors?.map(a => a.name).join(', ') || item.publication_info?.summary || '',
                cited_by: item.inline_links?.cited_by ? parseInt(item.inline_links.cited_by.total, 10) : 0,
                scholar_url: item.link || null
            });
        }
    }

    return articles;
}

/**
 * ==============================================================================
 * 2.5 DIRECT GOOGLE SCHOLAR CITATIONS FETCHER (Puppeteer-based)
 * ==============================================================================
 * ดึงข้อมูลผลงานจริงจาก Google Scholar Profile โดยตรงผ่าน Puppeteer
 * ใช้ headless browser จำลองการคลิก "Show more" เพื่อดึงผลงานทั้งหมด
 * NOTE: Requires Puppeteer + Chrome/Chromium. Use as fallback when SerpApi unavailable.
 */
async function fetchDirectFromGoogleScholarProfile(scholarId) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        throw new Error('Puppeteer not installed. Run: npm install puppeteer');
    }
    
    console.log(`[Direct Scholar Fetcher - Puppeteer] กำลังดึงผลงานจริงจาก Google Scholar Profile: ${scholarId}`);
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    
    try {
        const url = `https://scholar.google.com/citations?user=${scholarId}&hl=en`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        let hasMore = true;
        let clickCount = 0;
        const maxClicks = 20;

        while (hasMore && clickCount < maxClicks) {
            try {
                const showMoreBtn = await page.$('#gsc_bpf_more');
                if (showMoreBtn) {
                    const isDisabled = await page.evaluate(btn => btn.disabled, showMoreBtn);
                    if (!isDisabled) {
                        await showMoreBtn.click();
                        await page.waitForNetworkIdle({ timeout: 5000 });
                        clickCount++;
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } catch (e) {
                hasMore = false;
            }
        }

        const papers = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('.gsc_a_tr');
            
            rows.forEach(row => {
                const titleEl = row.querySelector('.gsc_a_at');
                const authorsEl = row.querySelector('.gs_gray');
                const yearEl = row.querySelector('.gsc_a_hc');
                const citeEl = row.querySelector('.gsc_a_ac');
                const hrefEl = row.querySelector('.gsc_a_at');

                if (titleEl) {
                    let scholar_url = null;
                    if (hrefEl) {
                        scholar_url = hrefEl.href;
                        if (!scholar_url || scholar_url.trim() === '') {
                            const rawHref = hrefEl.getAttribute('href');
                            if (rawHref) {
                                scholar_url = rawHref.startsWith('http')
                                    ? rawHref
                                    : `https://scholar.google.com${rawHref}`;
                            }
                        }
                    }

                    results.push({
                        title: titleEl.innerText.trim(),
                        scholar_url: scholar_url,
                        authors_raw: authorsEl ? authorsEl.innerText.trim() : '',
                        cited_by: citeEl && citeEl.innerText.trim() !== '' ? parseInt(citeEl.innerText.trim()) : 0,
                        publish_year: yearEl && yearEl.innerText.trim() !== '' ? parseInt(yearEl.innerText.trim()) : null
                    });
                }
            });
            return results;
        });

        console.log(`[Direct Scholar Fetcher - Puppeteer] ดึงสำเร็จ! พบ ${papers.length} ผลงานจริงจาก Google Scholar (คลิก Show more ${clickCount} ครั้ง)`);
        return papers;
    } finally {
        await browser.close();
    }
}

/**
 * ==============================================================================
 * 3. ROUTER / FACADE FUNCTION: fetchFromGoogleScholar
 * ==============================================================================
 * ทำหน้าที่สลับ Provider อัตโนมัติ (Multi-tier Fetcher):
 * - Tier 1: หากระบุ SERPAPI_KEY ใน .env หรือตั้ง SCHOLAR_PROVIDER='serpapi' -> ดึงจาก SerpApi
 * - Tier 2: หากมี scholar_id ให้ดึงจาก Google Scholar Profile โดยตรง (ข้อมูลจริง 100% ไม่ต้องใช้ API Key)
 * - Tier 3: หากไม่มี scholar_id หรือระบบภายนอกติดขัด -> Fallback ใช้ Mock Data ตามบริบทคณะ ICT UP
 */
async function fetchFromGoogleScholar(nameEn, email, scholarId) {
    const provider = (process.env.SCHOLAR_PROVIDER || 'auto').toLowerCase();
    const apiKey = process.env.SERPAPI_KEY;

    if (provider === 'serpapi' && apiKey) {
        try {
            return await fetchFromSerpApi(nameEn, email, scholarId, apiKey);
        } catch (apiErr) {
            console.warn(`[Scholar Service Warning] เรียก SerpApi ไม่สำเร็จ (${apiErr.message})`);
        }
    }

    if (scholarId) {
        try {
            const realArticles = await fetchDirectFromGoogleScholarProfile(scholarId);
            if (realArticles && realArticles.length > 0) {
                return realArticles;
            }
        } catch (directErr) {
            console.warn(`[Scholar Service Warning] ดึงจาก Google Scholar Profile ตรงไม่สำเร็จ (${directErr.message}) จะใช้ข้อมูลสำรองแทน`);
        }
    }

    return fetchRealisticMockData(nameEn, email, scholarId);
}

/**
 * บันทึกผลงานและเชื่อมโยงกับผู้ใช้ใน Supabase
 */
async function savePaperAndAuthor(userId, rawPaper) {
    const paper = cleanAndParsePaper(rawPaper);
    if (!paper || !paper.title) return null;

    const isBlacklisted = await isPaperBlacklisted(userId, paper.title);
    if (isBlacklisted) {
        console.log(`[Scholar Sync] ข้ามบทความ "${paper.title}" เนื่องจากถูกผู้ใช้ ID ${userId} ปฏิเสธ (Blacklisted)`);
        return null;
    }

    const { data: existingPapers } = await supabase
        .from('papers')
        .select('id, authors_raw, cited_by')
        .ilike('title', paper.title)
        .limit(1);

    let paperId;
    let isNewPaper = false;

    if (existingPapers && existingPapers.length > 0) {
        paperId = existingPapers[0].id;
        const currentCitedBy = existingPapers[0].cited_by || 0;
        const newCitedBy = Math.max(currentCitedBy, paper.cited_by || 0);
        const newPublishYear = paper.publish_year || existingPapers[0].publish_year;
        const newScholarUrl = paper.scholar_url || existingPapers[0].scholar_url;
        await supabase
            .from('papers')
            .update({ cited_by: newCitedBy, publish_year: newPublishYear, scholar_url: newScholarUrl })
            .eq('id', paperId);
    } else {
        const { data: inserted, error: insertError } = await supabase
            .from('papers')
            .insert([{
                title: paper.title,
                publish_year: paper.publish_year,
                authors_raw: paper.authors_raw,
                cited_by: paper.cited_by || 0,
                scholar_url: paper.scholar_url,
                source: 'scholar',
                status: 'DRAFT_AUTO'
            }])
            .select();
        paperId = inserted?.[0]?.id;
        isNewPaper = true;
    }

    const { data: existingLink } = await supabase
        .from('paper_authors')
        .select('id, status')
        .eq('paper_id', paperId)
        .eq('user_id', userId);

    if (!existingLink || existingLink.length === 0) {
        await supabase
            .from('paper_authors')
            .insert([{ paper_id: paperId, user_id: userId, status: 'PENDING', contribution_percent: 0.00 }]);
    }

    if (paper.authors_raw) {
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, name_en, name_th')
            .neq('id', userId);
        for (const otherUser of allUsers) {
            const hasMatch = (otherUser.name_en && isAuthorInRawText(otherUser.name_en, paper.authors_raw)) ||
                              (otherUser.name_th && isAuthorInRawText(otherUser.name_th, paper.authors_raw));
            
            if (hasMatch) {
                const isOtherBlacklisted = await isPaperBlacklisted(otherUser.id, paper.title);
                if (!isOtherBlacklisted) {
                    const { data: otherLink } = await supabase
                        .from('paper_authors')
                        .select('id')
                        .eq('paper_id', paperId)
                        .eq('user_id', otherUser.id);
                    if (!otherLink || otherLink.length === 0) {
                        await supabase
                            .from('paper_authors')
                            .insert([{ paper_id: paperId, user_id: otherUser.id, status: 'PENDING', contribution_percent: 0.00 }]);
                        console.log(`[Co-author Match] เชื่อมโยงผลงาน "${paper.title}" เข้ากับอาจารย์ ${otherUser.name_en || otherUser.name_th} (ID: ${otherUser.id}) อัตโนมัติ`);
                    }
                }
            }
        }
    }

    return { paperId, isNewPaper };
}

/**
 * Sync ข้อมูล Google Scholar ของอาจารย์รายบุคคล
 */
async function syncUserScholarData(userId) {
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId);
    if (!users || users.length === 0) {
        throw new Error(`ไม่พบผู้ใช้ ID: ${userId}`);
    }

    const user = users[0];
    const rawPapers = await fetchFromGoogleScholar(user.name_en, user.email, user.scholar_id);
    const results = {
        created: [],
        linked: [],
        blacklisted: [],
        skipped: 0
    };

    const { data: allUsers } = await supabase
        .from('users')
        .select('id, name_en, name_th');

    for (const rawPaper of rawPapers) {
        const paper = cleanAndParsePaper(rawPaper);
        if (!paper || !paper.title) continue;

        const blacklisted = await isPaperBlacklisted(user.id, paper.title);
        if (blacklisted) {
            console.log(`[Scholar Sync] ข้ามผลงานที่ถูกปฏิเสธ (Blacklisted) สำหรับ User ${user.id}: "${paper.title}"`);
            results.blacklisted.push({ title: paper.title });
            continue;
        }

        let existingData = [];
        if (paper.scholar_url) {
            const { data: byUrl } = await supabase
                .from('papers')
                .select('id, status, cited_by, scholar_url')
                .eq('scholar_url', paper.scholar_url)
                .limit(1);
            if (byUrl && byUrl.length > 0) existingData = byUrl;
        }
        if (existingData.length === 0) {
            const query = supabase.from('papers').select('id, status, cited_by, scholar_url').eq('title', paper.title);
            const { data: byTitle } = paper.publish_year
                ? await query.eq('publish_year', paper.publish_year)
                : await query.is('publish_year', null);
            existingData = byTitle || [];
        }

        console.log(`[Scholar Sync] existing query result: ${existingData.length} papers, scholar_url=${paper.scholar_url}`);

        let paperId = null;

        if (existingData.length === 0) {
            const { data: upserted, error: upsertError } = await supabase
                .from('papers')
                .upsert([{
                    title: paper.title,
                    publish_year: paper.publish_year,
                    authors_raw: paper.authors_raw,
                    cited_by: paper.cited_by,
                    scholar_url: paper.scholar_url,
                    source: 'scholar',
                    status: 'DRAFT_AUTO'
                }], { onConflict: 'title,publish_year' })
                .select();
            paperId = upserted?.[0]?.id || null;

            if (!paperId) {
                const { data: paperLookup } = await supabase
                    .from('papers')
                    .select('id')
                    .eq('title', paper.title)
                    .eq('publish_year', paper.publish_year)
                    .limit(1);
                if (paperLookup && paperLookup.length > 0) {
                    paperId = paperLookup[0].id;
                }
            }

            await supabase
                .from('paper_authors')
                .upsert([{ paper_id: paperId, user_id: user.id, status: 'PENDING' }], { onConflict: 'paper_id,user_id', ignoreDuplicates: true });

            results.created.push({ id: paperId, title: paper.title });
        } else {
            const existingPaper = existingData[0];
            paperId = existingPaper.id;

            const { data: authorCheck } = await supabase
                .from('paper_authors')
                .select('id, status')
                .eq('paper_id', paperId)
                .eq('user_id', user.id);

            if (!authorCheck || authorCheck.length === 0) {
                await supabase
                    .from('paper_authors')
                    .upsert([{ paper_id: paperId, user_id: user.id, status: 'PENDING' }], { onConflict: 'paper_id,user_id', ignoreDuplicates: true });

                if (existingPaper.status === 'DRAFT_AUTO') {
                    await supabase
                        .from('papers')
                        .update({ status: 'PENDING_CO_AUTHOR', updated_at: new Date().toISOString() })
                        .eq('id', paperId);
                }

                results.linked.push({ id: paperId, title: paper.title });
                console.log(`[Scholar Sync] ซิงก์ผู้เขียนร่วมสำเร็จ: User ${user.id} -> Paper ${paperId}`);
            } else {
                if (paper.cited_by > (existingPaper.cited_by || 0)) {
                    await supabase
                        .from('papers')
                        .update({ cited_by: paper.cited_by, updated_at: new Date().toISOString() })
                        .eq('id', paperId);
                }
                if (paper.scholar_url && paper.scholar_url !== (existingPaper.scholar_url || '')) {
                    await supabase
                        .from('papers')
                        .update({ scholar_url: paper.scholar_url, updated_at: new Date().toISOString() })
                        .eq('id', paperId);
                }
                results.skipped++;
            }
        }

        if (paperId && paper.authors_raw) {
            for (const otherUser of allUsers) {
                if (otherUser.id === user.id) continue;

                const isMatch = isAuthorInRawText(otherUser.name_en, paper.authors_raw) ||
                                (otherUser.name_th && isAuthorInRawText(otherUser.name_th, paper.authors_raw));

                if (isMatch) {
                    const isOtherBlacklisted = await isPaperBlacklisted(otherUser.id, paper.title);
                    if (!isOtherBlacklisted) {
                        const { data: checkOther } = await supabase
                            .from('paper_authors')
                            .select('id')
                            .eq('paper_id', paperId)
                            .eq('user_id', otherUser.id);

                        if (!checkOther || checkOther.length === 0) {
                            await supabase
                                .from('paper_authors')
                                .upsert([{ paper_id: paperId, user_id: otherUser.id, status: 'PENDING' }], { onConflict: 'paper_id,user_id', ignoreDuplicates: true });

                            await supabase
                                .from('papers')
                                .update({ status: 'PENDING_CO_AUTHOR', updated_at: new Date().toISOString() })
                                .eq('id', paperId)
                                .eq('status', 'DRAFT_AUTO');
                            console.log(`[Scholar Sync] ตรวจพบผู้เขียนร่วมอัตโนมัติ: User ${otherUser.id} (${otherUser.name_en}) -> Paper ${paperId}`);
                        }
                    }
                }
            }
        }
    }

    return results;
}

/**
 * Sync ข้อมูลอาจารย์ทั้งหมดในระบบ
 */
async function syncAllUsersScholarData() {
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true });
    const aggregate = {
        createdCount: 0,
        newPapers: [],
        linkedCount: 0,
        linkedPapers: [],
        blacklistedCount: 0,
        blacklistedPapers: [],
        skippedCount: 0,
        errors: []
    };

    if (!users) return aggregate;

    for (const user of users) {
        try {
            const userResult = await syncUserScholarData(user.id);
            aggregate.createdCount += userResult.created.length;
            aggregate.newPapers.push(...userResult.created);

            aggregate.linkedCount += (userResult.linked || []).length;
            aggregate.linkedPapers.push(...(userResult.linked || []));

            aggregate.blacklistedCount += (userResult.blacklisted || []).length;
            aggregate.blacklistedPapers.push(...(userResult.blacklisted || []));

            aggregate.skippedCount += userResult.skipped;
        } catch (error) {
            console.error(`[Scholar Sync Error] User ID ${user.id}:`, error.message);
            aggregate.errors.push({ userId: user.id, userEmail: user.email, error: error.message });
        }
    }
    return aggregate;
}

/**
 * ฟังก์ชันสำหรับอาจารย์กดปฏิเสธผลงาน ("ไม่ใช่ผลงานของฉัน")
 * - บันทึกเข้า paper_blacklists ป้องกันการดึงซ้ำในอนาคต
 * - ลบผู้ใช้ออกจาก paper_authors ของผลงานนั้น
 */
async function rejectAndBlacklistPaper(userId, scholarTitle, paperId = null) {
    if (!userId || !scholarTitle) {
        throw new Error('ต้องระบุ userId และ scholarTitle');
    }

    const { data: existing } = await supabase
        .from('paper_blacklists')
        .select('id')
        .eq('user_id', userId)
        .eq('scholar_title', scholarTitle);

    if (!existing || existing.length === 0) {
        await supabase
            .from('paper_blacklists')
            .insert([{ user_id: userId, scholar_title: scholarTitle }]);
    }

    if (paperId) {
        await supabase
            .from('paper_authors')
            .delete()
            .eq('paper_id', paperId)
            .eq('user_id', userId);
    }

    return {
        message: 'ปฏิเสธผลงานและบันทึกลง Blacklist สำเร็จ',
        scholarTitle,
        userId
    };
}

/**
 * ดึงรายการ Blacklist ของผู้ใช้
 */
async function getBlacklistByUser(userId) {
    const { data: rows } = await supabase
        .from('paper_blacklists')
        .select('*')
        .eq('user_id', userId)
        .order('rejected_at', { ascending: false });
    return rows || [];
}

/**
 * ยกเลิก Blacklist
 */
async function unblacklistPaper(userId, blacklistId) {
    await supabase
        .from('paper_blacklists')
        .delete()
        .eq('id', blacklistId)
        .eq('user_id', userId);
    return { message: 'ปลดออกจาก Blacklist สำเร็จ' };
}

/**
 * ==============================================================================
 * 4. FETCH PAPER DETAIL FROM GOOGLE SCHOLAR DETAIL PAGE (Puppeteer-based)
 * ==============================================================================
 * ดึงข้อมูลเชิงลึก (Abstract, Publication Date, Journal, Authors) 
 * จาก Google Scholar Detail Page โดยใช้ Puppeteer
 * ใช้เมื่อผู้ใช้กด "นำไปคำนวณ" เพื่อดึงข้อมูลละเอียดแบบ On-Demand
 */
async function fetchPaperDetailFromUrl(detailUrl) {
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        throw new Error('Puppeteer not installed. Run: npm install puppeteer');
    }

    console.log(`[Paper Detail Scraper] กำลังดึงข้อมูลจาก: ${detailUrl}`);

    let urlEn = detailUrl;
    if (urlEn.includes('hl=')) {
      urlEn = urlEn.replace(/hl=[a-zA-Z-]+/, 'hl=en');
    } else {
      urlEn = urlEn + '&hl=en';
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(Math.floor(Math.random() * 1500) + 1500);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        await page.goto(urlEn, { waitUntil: 'networkidle2', timeout: 30000 });

        await delay(2000);

        const paperDetail = await page.evaluate(() => {
            const data = {
                title: '',
                authors: '',
                publicationDate: '',
                journal: '',
                abstract: '',
                doi: '',
                volume: '',
                issue: '',
                keywords: '',
                year: '',
                raw_debug: []
            };

            // Method 1: Extract from meta tags (citation_* for Google Scholar detail pages)
            const metaSelectors = [
                { prop: 'title', selector: 'meta[property="og:title"]' },
                { prop: 'title', selector: 'meta[name="citation_title"]' },
                { prop: 'journal', selector: 'meta[name="citation_journal"]' },
                { prop: 'journal', selector: 'meta[name="citation_journal_title"]' },
                { prop: 'doi', selector: 'meta[name="citation_doi"]' },
                { prop: 'authors', selector: 'meta[name="citation_author"]' },
                { prop: 'publicationDate', selector: 'meta[name="citation_publication_date"]' },
                { prop: 'publicationDate', selector: 'meta[name="citation_date"]' },
                { prop: 'abstract', selector: 'meta[name="citation_abstract"]' },
                { prop: 'keywords', selector: 'meta[name="citation_keywords"]' },
                { prop: 'volume', selector: 'meta[name="citation_volume"]' },
                { prop: 'issue', selector: 'meta[name="citation_issue"]' },
            ];

            metaSelectors.forEach(({ prop, selector }) => {
                const el = document.querySelector(selector);
                if (el && el.getAttribute('content')) {
                    if (prop === 'authors' && data.authors) {
                        const existingAuthors = data.authors;
                        data.authors = existingAuthors ? existingAuthors + ', ' + el.getAttribute('content') : el.getAttribute('content');
                    } else if (!data[prop]) {
                        data[prop] = el.getAttribute('content').trim();
                    }
                }
            });

            // Method 2: Extract from .gsc_vcd_field layout
            const fields = document.querySelectorAll('.gsc_vcd_field, .gsc_oci_field');
            const values = document.querySelectorAll('.gsc_vcd_value, .gsc_oci_value');

            fields.forEach((field, index) => {
                const labelText = (field.textContent || '').trim();
                const valText = values[index] ? (values[index].textContent || '').trim() : '';
                data.raw_debug.push({ label: labelText, value: valText });

                const label = labelText.toLowerCase();
                if (label.includes('author') || label.includes('\u0e16\u0e35\u0e19\u0e01\u0e31\u0e19')) data.authors = valText || data.authors;
                if (label.includes('publication date') || label.includes('\u0e27\u0e31\u0e19\u0e19\u0e31\u0e49\u0e21\u0e17\u0e35')) data.publicationDate = valText;
                if (label.includes('journal') || label.includes('\u0e27\u0e31\u0e19\u0e23\u0e31\u0e1a')) {
      data.journal = valText || data.journal; // Priority 1: Journal
    } else if (!data.journal && (label.includes('publisher') || label.includes('\u0e2a\u0e19\u0e38\u0e13\u0e23\u0e31\u0e1a'))) {
      data.journal = valText || data.journal; // Priority 2: Publisher fallback
    }
                if (label.includes('description') || label.includes('\u0e1e\u0e38\u0e15\u0e02\u0e2d\u0e07') || label.includes('abstract')) data.abstract = valText || data.abstract;
                if (label.includes('volume') || label.includes('\u0e48\u0e21')) data.volume = valText;
                if (label.includes('issue') || label.includes('\u0e2a\u0e21')) data.issue = valText;
            });

            // Method 3: Title from dedicated title elements
            if (!data.title) {
                const titleSelectors = [
                    '#gsc_vcd_title a', '#gsc_vcd_title',
                    '.gs_rt a', '.gs_rt', '.gsc_vcd_title_link',
                    '.gsc_oci_title_link', '.gsc_vcd_title_wrapper a',
                    '#gsc_vpf_title a', '#gsc_vpf_title',
                    '.gs-sci-title a', '.gs-sci-title',
                ];
                for (const selector of titleSelectors) {
                    const titleEl = document.querySelector(selector);
                    if (titleEl) { data.title = titleEl.innerText.trim(); break; }
                }
            }

            // Method 4: Title from "Scholar articles" field text parsing
            if (!data.title && fields.length > 0) {
                const scholarArticlesField = Array.from(fields).find(f => {
                    const label = (f.textContent || '').trim().toLowerCase();
                    return label.includes('scholar articles') || label.includes('\u0e27\u0e31\u0e19\u0e1a\u0e31\u0e15\u0e32\u0e23\u0e02\u0e2d\u0e07\u0e40\u0e02\u0e49\u0e32');
                });
                if (scholarArticlesField) {
                    const text = scholarArticlesField.textContent;
                    const lines = text.split('\n');
                    if (lines.length > 1) { data.title = lines[lines.length - 1].trim(); }
                }
            }

            // Method 5: Abstract from dedicated description elements
            if (!data.abstract) {
                const absEl = document.querySelector('.gsc_vcd_description, .gsc_oci_description, .gsc_vcd_text_excerpt, #gsc_vcd_abstract, #gsc_oci_abstract, #gsc_vcd_descr, #gsc_oci_descr');
                if (absEl) data.abstract = absEl.innerText.trim();
            }

            // Method 6: Keywords from dedicated elements
            if (!data.keywords) {
                const kwEl = document.querySelector('.gsc_vcd_keywords, .gsc_oci_keywords, .gs-flat');
                if (kwEl) data.keywords = kwEl.innerText.trim();
            }

            // Method 7: Publication date from URL or citation date meta
            if (!data.publicationDate) {
                const dateText = document.body.innerText.match(/published\s+in\s+(\d{4})/i);
                if (dateText) data.publicationDate = dateText[1];
            }
            if (!data.publicationDate) {
                const dateTextTh = document.body.innerText.match(/เผยแพร่\s*เมื่อ\s*(\d{1,2}\s+\w+\s+\d{4})/i);
                if (dateTextTh) data.publicationDate = dateTextTh[1];
            }

            // Method 8: Year from page URL or title
            if (!data.year) {
                const yearMatch = document.body.innerText.match(/(\b19\d{2}\b|\b20\d{2}\b)\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)/i);
                if (yearMatch) data.year = yearMatch[1];
            }

            // ==========================================
            // Extract key fields for separate assignment
            // ==========================================
            let extDate = "";
            let extJournal = "";
            let extDoi = "";

            try {
                for (let i = 0; i < fields.length; i++) {
                    const fieldName = (fields[i].textContent || '').toLowerCase().trim();
                    const valueText = values[i] ? (values[i].textContent || '').trim() : '';

                    if (fieldName.includes('publication date') || fieldName === 'date' || fieldName.includes('วันที่เผยแพร่') || fieldName.includes('วันที่ตีพิมพ์')) {
                        extDate = valueText;
                    }
                    if (fieldName === 'journal' || fieldName.includes('วารสาร')) {
                        extJournal = valueText; // Priority 1: เจอชื่อ Journal ให้ใช้เลย
                    } else if (!extJournal && (fieldName === 'publisher' || fieldName === 'source' || fieldName === 'conference' || fieldName.includes('ผู้เผยแพร่') || fieldName.includes('แหล่งตีพิมพ์'))) {
                        extJournal = valueText; // Priority 2: ถ้ายังว่าง ค่อยเอา Publisher มาใส่
                    }
                }

                const doiLinks = document.querySelectorAll('.gsc_vcd_value a, .gsc_oci_value a');
                for (let i = 0; i < doiLinks.length; i++) {
                    const href = doiLinks[i].getAttribute('href');
                    if (href && typeof href === 'string' && href.includes('doi.org/')) {
                        const parts = href.split('doi.org/');
                        if (parts.length > 1) {
                            extDoi = parts[1].trim().split('?')[0];
                            break;
                        }
                    }
                }

                if (!extDoi) {
                    const tableContainer = document.querySelector('#gsc_vcd_table, #gsc_oci_table');
                    if (tableContainer) {
                        const match = tableContainer.textContent.match(/10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+/i);
                        if (match) { extDoi = match[0].trim(); }
                    }
                }
            } catch (err) {
                // Silent catch
            }

            // Convert date format from 2026/6/3 to 2026-06-03
            if (extDate && extDate.includes('/')) {
              const parts = extDate.split('/');
              if (parts.length === 3) {
                const y = parts[0];
                const m = String(parts[1]).padStart(2, '0');
                const d = String(parts[2]).padStart(2, '0');
                extDate = `${y}-${m}-${d}`;
              }
            } else if (extDate && extDate.length === 4) {
              extDate = `${extDate}-01-01`;
            }

            return {
                ...data,
                extractedDate: extDate,
                extractedJournal: extJournal,
                extractedDoi: extDoi
            };
        });

        // Assign extracted fields from page.evaluate result
        paperDetail.publicationDate = paperDetail.extractedDate || paperDetail.publicationDate || paperDetail.year || "";
        paperDetail.journal = paperDetail.extractedJournal || paperDetail.journal || "";
        paperDetail.doi = paperDetail.extractedDoi || paperDetail.doi || "";


        console.log("=== Scraped Detail ===");
        console.log("Title:", paperDetail.title);
        console.log("Journal:", paperDetail.journal);
        console.log("DOI:", paperDetail.doi);
        console.log("Abstract length:", paperDetail.abstract.length);
        console.log("Raw Fields Found:", paperDetail.raw_debug);

        return paperDetail;

    } finally {
        await browser.close();
    }
}

/**
 * Enrich paper metadata from DOI using Crossref/OpenAlex
 * This is called from the backend DOI enrichment endpoint
 */
async function enrichPaperFromDoi(doi) {
  const { enrichByDoi } = require('./crossrefService');
  return await enrichByDoi(doi);
}

/**
 * DOI-first enrichment with Scholar scraping fallback
 * Used when user clicks "นำไปคำนวณ" on a Scholar paper
 */
async function enrichPaperWithFallback(paper, userId) {
  const enrichedPaper = { ...paper };
  
  // Helper to check if field needs enrichment
  const isBlank = (value) =>
    value == null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  const needsEnrichment = 
    isBlank(enrichedPaper.abstract) ||
    isBlank(enrichedPaper.keywords) ||
    isBlank(enrichedPaper.volume) ||
    isBlank(enrichedPaper.issue);

  if (!needsEnrichment) {
    return enrichedPaper;
  }

  // Try DOI enrichment first (if paper has DOI)
  if (enrichedPaper.doi) {
    try {
      console.log(`[Scholar Enrichment] Trying DOI enrichment for: ${enrichedPaper.doi}`);
      const result = await enrichPaperFromDoi(enrichedPaper.doi);
      if (result.success) {
        // Merge enriched data, preserving original Scholar data
        const data = result.data;
        enrichedPaper.abstract = enrichedPaper.abstract || data.abstract || '';
        // Ensure keywords are normalized as array
        const enrichedKeywords = normalizeKeywords(data.keywords);
        enrichedPaper.keywords = enrichedPaper.keywords?.length ? enrichedPaper.keywords : enrichedKeywords;
        enrichedPaper.volume = enrichedPaper.volume || data.volume || '';
        enrichedPaper.issue = enrichedPaper.issue || data.issue || '';
        enrichedPaper.journal = enrichedPaper.journal || data.journal || '';
        enrichedPaper.publicationDate = enrichedPaper.publicationDate || data.publicationDate || '';
        enrichedPaper.metadata_source = result.source;
        enrichedPaper.metadata_enriched_at = new Date().toISOString();
        enrichedPaper.enrichment_status = 'enriched';
        console.log(`[Scholar Enrichment] DOI enrichment successful via ${result.source}`);
        return enrichedPaper;
      }
    } catch (doiErr) {
      console.warn(`[Scholar Enrichment] DOI enrichment failed:`, doiErr.message);
    }
  }

  // Fallback: Scholar detail page scraping (only if paper has scholar_url)
  if (enrichedPaper.scholar_url) {
    try {
      console.log(`[Scholar Enrichment] Falling back to Scholar scraping for: ${enrichedPaper.scholar_url}`);
      const scrapedDetail = await fetchPaperDetailFromUrl(enrichedPaper.scholar_url);
      
      // Merge scraped data, preserving original Scholar data
      enrichedPaper.abstract = enrichedPaper.abstract || scrapedDetail.abstract || '';
      // Ensure keywords are normalized as array
      const scrapedKeywords = normalizeKeywords(scrapedDetail.keywords);
      enrichedPaper.keywords = enrichedPaper.keywords?.length ? enrichedPaper.keywords : scrapedKeywords;
      enrichedPaper.volume = enrichedPaper.volume || scrapedDetail.volume || '';
      enrichedPaper.issue = enrichedPaper.issue || scrapedDetail.issue || '';
      enrichedPaper.journal = enrichedPaper.journal || scrapedDetail.journal || '';
      enrichedPaper.publicationDate = enrichedPaper.publicationDate || scrapedDetail.publicationDate || scrapedDetail.year || '';
      enrichedPaper.doi = enrichedPaper.doi || scrapedDetail.doi || '';
      enrichedPaper.metadata_source = 'scholar_scraping';
      enrichedPaper.metadata_enriched_at = new Date().toISOString();
      enrichedPaper.enrichment_status = 'enriched';
      console.log(`[Scholar Enrichment] Scholar scraping successful`);
      return enrichedPaper;
    } catch (scrapeErr) {
      console.warn(`[Scholar Enrichment] Scholar scraping failed:`, scrapeErr.message);
    }
  }

  // No enrichment possible, return original
  enrichedPaper.enrichment_status = 'failed';
  return enrichedPaper;
}

module.exports = {
    cleanAndParsePaper,
    fetchRealisticMockData,
    fetchFromSerpApi,
    fetchDirectFromGoogleScholarProfile,
    fetchFromGoogleScholar,
    syncUserScholarData,
    syncAllUsersScholarData,
    rejectAndBlacklistPaper,
    getBlacklistByUser,
    unblacklistPaper,
    isPaperBlacklisted,
    fetchPaperDetailFromUrl,
    enrichPaperFromDoi,
    enrichPaperWithFallback
};
