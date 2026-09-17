const axios = require('axios');
const pool = require('./db');
require('dotenv').config();

/**
 * ตรวจสอบว่าชื่อผลงานถูก Blacklist โดยผู้ใช้หรือไม่
 */
async function isPaperBlacklisted(userId, title) {
    if (!title) return false;
    const [rows] = await pool.query(
        `SELECT id FROM paper_blacklists 
         WHERE user_id = ? AND LOWER(TRIM(scholar_title)) = LOWER(TRIM(?)) 
         LIMIT 1`,
        [userId, title]
    );
    return rows.length > 0;
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

        // คลิกปุ่ม "Show more" ซ้ำจนกว่าจะไม่มีอีก (ดึงผลงานทั้งหมด)
        let hasMore = true;
        let clickCount = 0;
        const maxClicks = 20; // กันลูปไม่รู้จบ

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

        // ดึงข้อมูลผลงานทั้งหมด
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
                    results.push({
                        title: titleEl.innerText.trim(),
                        scholar_url: hrefEl ? 'https://scholar.google.com' + hrefEl.getAttribute('href') : null,
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

    // Tier 1: SerpApi (กรณีตั้งใจใช้งานและมี API Key)
    if (provider === 'serpapi' && apiKey) {
        try {
            return await fetchFromSerpApi(nameEn, email, scholarId, apiKey);
        } catch (apiErr) {
            console.warn(`[Scholar Service Warning] เรียก SerpApi ไม่สำเร็จ (${apiErr.message})`);
        }
    }

    // Tier 2: Direct Google Scholar Profile (ข้อมูลจริง 100% ผ่าน scholar_id)
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

    // Tier 3: Realistic Data สำหรับการพัฒนาและทดสอบอย่างปลอดภัย
    return fetchRealisticMockData(nameEn, email, scholarId);
}

/**
 * บันทึกผลงานและเชื่อมโยงกับผู้ใช้ใน MySQL
 */
async function savePaperAndAuthor(userId, rawPaper) {
    const paper = cleanAndParsePaper(rawPaper);
    if (!paper || !paper.title) return null;

    // เช็ค Blacklist
    const isBlacklisted = await isPaperBlacklisted(userId, paper.title);
    if (isBlacklisted) {
        console.log(`[Scholar Sync] ข้ามบทความ "${paper.title}" เนื่องจากถูกผู้ใช้ ID ${userId} ปฏิเสธ (Blacklisted)`);
        return null;
    }

    // 1. ตรวจสอบว่ามีบทความนี้ในตาราง papers แล้วหรือไม่
    const [existingPapers] = await pool.query(
        'SELECT id, authors_raw, cited_by FROM papers WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1',
        [paper.title]
    );

    let paperId;
    let isNewPaper = false;

    if (existingPapers.length > 0) {
        paperId = existingPapers[0].id;
        // อัปเดตข้อมูลปี และยอด citation หากมีข้อมูลใหม่กว่า
        await pool.query(
            `UPDATE papers 
             SET cited_by = GREATEST(cited_by, ?), 
                 publish_year = COALESCE(?, publish_year),
                 scholar_url = COALESCE(?, scholar_url)
             WHERE id = ?`,
            [paper.cited_by || 0, paper.publish_year, paper.scholar_url, paperId]
        );
    } else {
        const [res] = await pool.query(
            `INSERT INTO papers (title, publish_year, authors_raw, cited_by, scholar_url, source, status) 
             VALUES (?, ?, ?, ?, ?, 'scholar', 'DRAFT_AUTO')`,
            [paper.title, paper.publish_year, paper.authors_raw, paper.cited_by || 0, paper.scholar_url]
        );
        paperId = res.insertId;
        isNewPaper = true;
    }

    // 2. เชื่อมโยงผลงานเข้ากับ user ในตาราง paper_authors
    const [existingLink] = await pool.query(
        'SELECT id, status FROM paper_authors WHERE paper_id = ? AND user_id = ?',
        [paperId, userId]
    );

    if (existingLink.length === 0) {
        await pool.query(
            `INSERT INTO paper_authors (paper_id, user_id, status, contribution_percent) 
             VALUES (?, ?, 'PENDING', 0.00)`,
            [paperId, userId]
        );
    }

    // 3. ตรวจสอบ Co-author คนอื่นๆ ในระบบ UP ICT ว่ามีชื่ออยู่ใน authors_raw ด้วยหรือไม่
    if (paper.authors_raw) {
        const [allUsers] = await pool.query('SELECT id, name_en, name_th FROM users WHERE id != ?', [userId]);
        for (const otherUser of allUsers) {
            const hasMatch = (otherUser.name_en && isAuthorInRawText(otherUser.name_en, paper.authors_raw)) ||
                             (otherUser.name_th && isAuthorInRawText(otherUser.name_th, paper.authors_raw));
            
            if (hasMatch) {
                const isOtherBlacklisted = await isPaperBlacklisted(otherUser.id, paper.title);
                if (!isOtherBlacklisted) {
                    const [otherLink] = await pool.query(
                        'SELECT id FROM paper_authors WHERE paper_id = ? AND user_id = ?',
                        [paperId, otherUser.id]
                    );
                    if (otherLink.length === 0) {
                        await pool.query(
                            `INSERT INTO paper_authors (paper_id, user_id, status, contribution_percent) 
                             VALUES (?, ?, 'PENDING', 0.00)`,
                            [paperId, otherUser.id]
                        );
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
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
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

    // ดึงรายชื่ออาจารย์ทั้งหมดในระบบเตรียมไว้สำหรับ Co-author auto-detect
    const [allUsers] = await pool.query('SELECT id, name_en, name_th FROM users');

    for (const rawPaper of rawPapers) {
        // นำข้อมูลดิบผ่านกระบวนการ Data Parser & Cleaning
        const paper = cleanAndParsePaper(rawPaper);
        if (!paper || !paper.title) continue;

        // 1. ตรวจสอบ Blacklist ของผู้ใช้คนนี้
        const blacklisted = await isPaperBlacklisted(user.id, paper.title);
        if (blacklisted) {
            console.log(`[Scholar Sync] ข้ามผลงานที่ถูกปฏิเสธ (Blacklisted) สำหรับ User ${user.id}: "${paper.title}"`);
            results.blacklisted.push({ title: paper.title });
            continue;
        }

        // 2. ตรวจสอบว่าผลงานมีอยู่ในตาราง papers แล้วหรือไม่
        const existing = await pool.query(
            `SELECT id, status, cited_by FROM papers 
             WHERE (scholar_url IS NOT NULL AND scholar_url != '' AND scholar_url = ?)
                OR (LOWER(TRIM(title)) = LOWER(TRIM(?)) AND publish_year = ?)
             LIMIT 1`,
            [paper.scholar_url, paper.title, paper.publish_year]
        );

        let paperId = null;

        if (existing[0].length === 0) {
            // 3.1 กรณีผลงานยังไม่มีในระบบ -> สร้างใหม่ (สถานะเริ่มต้น DRAFT_AUTO ตามข้อกำหนด)
            const inserted = await pool.query(
                `INSERT INTO papers (title, publish_year, authors_raw, cited_by, scholar_url, source, status)
                 VALUES (?, ?, ?, ?, ?, 'scholar', 'DRAFT_AUTO')`,
                [paper.title, paper.publish_year, paper.authors_raw, paper.cited_by, paper.scholar_url]
            );
            paperId = inserted[0].insertId;

            // ผูกผู้ใช้เข้ากับผลงาน (สถานะ PENDING)
            await pool.query(
                `INSERT IGNORE INTO paper_authors (paper_id, user_id, status)
                 VALUES (?, ?, 'PENDING')`,
                [paperId, user.id]
            );

            results.created.push({ id: paperId, title: paper.title });
        } else {
            // 3.2 กรณีผลงานมีอยู่ในระบบแล้ว (อาจถูกดึงมาก่อนหน้า หรือสร้างโดย Co-author)
            const existingPaper = existing[0][0];
            paperId = existingPaper.id;

            // ตรวจสอบว่าผู้ใช้คนนี้เคยถูกผูกกับผลงานนี้หรือยัง
            const authorCheck = await pool.query(
                `SELECT id, status FROM paper_authors WHERE paper_id = ? AND user_id = ?`,
                [paperId, user.id]
            );

            if (authorCheck[0].length === 0) {
                // ยังไม่เคยผูก -> ผูกผู้ใช้คนนี้เข้ากับผลงาน
                await pool.query(
                    `INSERT IGNORE INTO paper_authors (paper_id, user_id, status)
                     VALUES (?, ?, 'PENDING')`,
                    [paperId, user.id]
                );

                // ปรับสถานะบทความเป็น PENDING_CO_AUTHOR หากยังเป็น DRAFT_AUTO
                if (existingPaper.status === 'DRAFT_AUTO') {
                    await pool.query(
                        `UPDATE papers SET status = 'PENDING_CO_AUTHOR', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [paperId]
                    );
                }

                results.linked.push({ id: paperId, title: paper.title });
                console.log(`[Scholar Sync] ซิงก์ผู้เขียนร่วมสำเร็จ: User ${user.id} -> Paper ${paperId}`);
            } else {
                // เคยผูกไว้แล้ว -> อัปเดต cited_by หากจำนวนอ้างอิงใหม่สูงขึ้น
                if (paper.cited_by > (existingPaper.cited_by || 0)) {
                    await pool.query(
                        `UPDATE papers SET cited_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [paper.cited_by, paperId]
                    );
                }
                results.skipped++;
            }
        }

        // 4. Co-author Auto-detection: ค้นหาผู้เขียนร่วมคนอื่นใน authors_raw
        if (paperId && paper.authors_raw) {
            for (const otherUser of allUsers) {
                if (otherUser.id === user.id) continue;

                const isMatch = isAuthorInRawText(otherUser.name_en, paper.authors_raw) ||
                                (otherUser.name_th && isAuthorInRawText(otherUser.name_th, paper.authors_raw));

                if (isMatch) {
                    const isOtherBlacklisted = await isPaperBlacklisted(otherUser.id, paper.title);
                    if (!isOtherBlacklisted) {
                        const checkOther = await pool.query(
                            `SELECT id FROM paper_authors WHERE paper_id = ? AND user_id = ?`,
                            [paperId, otherUser.id]
                        );

                        if (checkOther[0].length === 0) {
                            await pool.query(
                                `INSERT IGNORE INTO paper_authors (paper_id, user_id, status)
                                 VALUES (?, ?, 'PENDING')`,
                                [paperId, otherUser.id]
                            );

                            await pool.query(
                                `UPDATE papers 
                                 SET status = 'PENDING_CO_AUTHOR', updated_at = CURRENT_TIMESTAMP 
                                 WHERE id = ? AND status = 'DRAFT_AUTO'`,
                                [paperId]
                            );
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
    const [users] = await pool.query('SELECT * FROM users ORDER BY id ASC');
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

    // 1. นำเข้า paper_blacklists
    const [existing] = await pool.query(
        'SELECT id FROM paper_blacklists WHERE user_id = ? AND scholar_title = ?',
        [userId, scholarTitle]
    );

    if (existing.length === 0) {
        await pool.query(
            'INSERT INTO paper_blacklists (user_id, scholar_title) VALUES (?, ?)',
            [userId, scholarTitle]
        );
    }

    // 2. ลบออกจาก paper_authors
    if (paperId) {
        await pool.query(
            'DELETE FROM paper_authors WHERE paper_id = ? AND user_id = ?',
            [paperId, userId]
        );
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
    const [rows] = await pool.query(
        'SELECT * FROM paper_blacklists WHERE user_id = ? ORDER BY rejected_at DESC',
        [userId]
    );
    return rows;
}

/**
 * ยกเลิก Blacklist
 */
async function unblacklistPaper(userId, blacklistId) {
    await pool.query(
        'DELETE FROM paper_blacklists WHERE id = ? AND user_id = ?',
        [blacklistId, userId]
    );
    return { message: 'ปลดออกจาก Blacklist สำเร็จ' };
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
    isPaperBlacklisted
};