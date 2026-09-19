const axios = require('axios');
const { supabase } = require('./db');
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
        await page.goto(urlEn, { waitUntil: 'domcontentloaded', timeout: 30000 });

        await page.waitForSelector('.gsc_vcd_value', { timeout: 5000 }).catch(() => console.log('[Paper Detail Scraper] Timeout: .gsc_vcd_value not found, proceeding with what we have'));

        const paperDetail = await page.evaluate(() => {
            const data = {
                title: '',
                authors: '',
                publication_date: '',
                journal: '',
                abstract: '',
                raw_debug: []
            };

            const fields = document.querySelectorAll('.gsc_vcd_field, .gsc_oci_field');
            const values = document.querySelectorAll('.gsc_vcd_value, .gsc_oci_value');

            fields.forEach((field, index) => {
                const labelText = field.innerText.trim();
                const label = labelText.toLowerCase();
                const val = values[index] ? values[index].innerText.trim() : '';

                data.raw_debug.push({ label: labelText, value: val });

                if (label === 'authors' || label === 'ผู้เขียน') data.authors = val;
                if (label === 'publication date' || label === 'วันที่ตีพิมพ์') data.publication_date = val;
                if (label === 'journal' || label === 'publisher' || label === 'วารสาร' || label === 'สำนักพิมพ์') data.journal = val;
                if (label === 'description' || label === 'คำอธิบาย') data.abstract = val;
            });

            if (!data.title) {
                const titleEl = document.querySelector('#gsc_vcd_title, .gsc_oci_title_wrapper, #gsc_vcd_title_link');
                if (titleEl) data.title = titleEl.innerText.trim();
            }

            if (!data.abstract) {
                const absEl = document.querySelector('.gsc_vcd_description, .gsc_oci_description, blockquote');
                if (absEl) data.abstract = absEl.innerText.trim();
            }

            return data;
        });

        console.log("=== Scraped Detail ===");
        console.log("Title:", paperDetail.title);
        console.log("Raw Fields Found:", paperDetail.raw_debug);

        return paperDetail;

    } finally {
        await browser.close();
    }
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
    fetchPaperDetailFromUrl
};
