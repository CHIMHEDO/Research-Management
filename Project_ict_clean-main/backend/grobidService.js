const axios = require('axios');
const FormData = require('form-data');
const xml2js = require('xml2js');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
require('dotenv').config();

const GROBID_URL = process.env.GROBID_URL || 'http://localhost:8070';

// ฟังก์ชันส่ง PDF ไป GROBID
async function extractMetadataFromGrobid(pdfBuffer) {
    const form = new FormData();
    form.append('input', pdfBuffer, { filename: 'document.pdf', contentType: 'application/pdf' });

    console.log('[GROBID] กำลังส่ง PDF ไปที่', `${GROBID_URL}/api/processFulltextDocument`);
    console.log('[GROBID] ขนาดไฟล์:', pdfBuffer.length, 'bytes');

    try {
        const response = await axios.post(`${GROBID_URL}/api/processFulltextDocument`, form, {
            headers: form.getHeaders(),
            responseType: 'text',
            timeout: 30000,
            validateStatus: () => true
        });

        console.log('[GROBID] ✓ ได้รับ response แล้ว Status:', response.status);

        if (response.status !== 200) {
            console.error('\n[GROBID HTTP Error]: Status', response.status);
            console.error('[GROBID Response]:', String(response.data).substring(0, 500));
            throw new Error(`GROBID error: ${response.status}`);
        }

        const responseText = String(response.data).trim();
        console.log('[GROBID] ✓ ได้รับ XML ความยาว:', responseText.length, 'characters');

        if (!responseText.startsWith('<')) {
            console.error('\n[GROBID ไม่ใช่ XML]:', responseText.substring(0, 300));
            throw new Error('GROBID ไม่ได้ตอบกลับมาเป็น XML');
        }

        // Clean XML
        console.log('[GROBID] กำลัง Clean XML...');
        const cleanedXml = cleanGROBIDXml(responseText);
        console.log('[GROBID] ✓ Clean XML เสร็จ ความยาว:', cleanedXml.length);
        
        // Parse cleaned XML for metadata
        console.log('[GROBID] กำลัง Parse XML...');
        const metadata = await parseTeiXml(cleanedXml);
        console.log('[GROBID] ✓ Parse XML เสร็จ:', JSON.stringify({
            article_title: metadata.article_title?.substring(0, 50),
            journal: metadata.journal?.substring(0, 50),
            doi: metadata.doi?.substring(0, 50),
            authors_count: metadata.authors?.length
        }, null, 2));
        
        return {
            ...metadata,
            raw_xml: responseText,
            cleaned_xml: cleanedXml
        };
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            console.error('\n[GROBID ERROR] ไม่สามารถเชื่อมต่อกับ GROBID ได้!');
            console.error('ตรวจสอบว่า GROBID กำลังรันอยู่ที่พอร์ต 8070:');
            console.error('  docker-compose up -d');
            console.error('  หรือ curl', `${GROBID_URL}/api/version`);
        } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
            console.error('\n[GROBID ERROR] Timeout! GROBID ใช้เวลาเกิน 30 วินาที');
        } else if (error.response) {
            console.error('\n[GROBID HTTP Error]: Status', error.response.status);
            console.error('[GROBID Response]:', error.response.data);
        } else {
            console.error('\n[GROBID Error]:', error.message);
        }
        throw new Error('ไม่สามารถดึงข้อมูลจาก GROBID ได้: ' + error.message);
    }
}

// แปลง XML เป็น JSON และดึงเฉพาะข้อมูลที่ต้องการ
async function parseTeiXml(xmlString) {
    console.log('[GROBID parseTeiXml] เริ่ม Parse XML ความยาว:', xmlString.length);
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    let json;
    try {
        json = await parser.parseStringPromise(xmlString);
        console.log('[GROBID parseTeiXml] ✓ Parse XML เป็น JSON เรียบร้อย');
    } catch (err) {
        console.error('[GROBID parseTeiXml] ✗ Parse XML ล้มเหลว:', err.message);
        throw err;
    }

    const metadata = {
        article_title: null,
        publish_date: null,
        authors: [],
        volume: "",
        issue: "",
        journal: "",
        doi: "",
        abstract: "",
        keywords: ""
    };

    try {
        const fileDesc = json.TEI?.teiHeader?.fileDesc;
        const profileDesc = json.TEI?.teiHeader?.profileDesc;
        const textBody = json.TEI?.text?.body;

        // 1. ดึงชื่อบทความ (Title)
        if (fileDesc?.titleStmt?.title) {
            metadata.article_title = typeof fileDesc.titleStmt.title === "string"
                ? fileDesc.titleStmt.title
                : fileDesc.titleStmt.title._;
        }

        // 2. ดึงวันที่เผยแพร่ (Date)
        const dateObj = fileDesc?.publicationStmt?.date;
        if (dateObj && dateObj.when) {
            metadata.publish_date = dateObj.when;
        }

        // 3. ดึงชื่อวารสาร (Journal) จาก <monogr><title level="j">
        const biblStruct = fileDesc?.sourceDesc?.biblStruct;
        if (biblStruct?.monogr?.title) {
            metadata.journal = typeof biblStruct.monogr.title === "string"
                ? biblStruct.monogr.title
                : biblStruct.monogr.title._ || "";
        }
        // Fallback: <title level="j"> ใน analytic
        if (!metadata.journal && fileDesc?.sourceDesc?.biblStruct?.analytic?.title) {
            const analyticTitle = fileDesc.sourceDesc.biblStruct.analytic.title;
            if (analyticTitle) {
                metadata.journal = typeof analyticTitle === "string" ? analyticTitle : analyticTitle._ || "";
            }
        }

        // 4. ดึง DOI จาก <idno type="DOI">
        if (biblStruct?.monogr?.idno) {
            const idno = biblStruct.monogr.idno;
            metadata.doi = typeof idno === "string" ? idno : (idno._ || idno["#text"] || "");
            // กรณี idno มี type attribute ตรวจสอบว่าเป็น DOI
        }
        if (!metadata.doi && fileDesc?.sourceDesc?.biblStruct?.idno) {
            const idno = fileDesc.sourceDesc.biblStruct.idno;
            metadata.doi = typeof idno === "string" ? idno : (idno._ || idno["#text"] || "");
        }

        // 5. ดึง Volume และ Issue จาก <biblScope type="volume"> และ <biblScope type="issue">
        if (biblStruct?.monogr?.imprint?.biblScope) {
            const biblScopes = Array.isArray(biblStruct.monogr.imprint.biblScope)
                ? biblStruct.monogr.imprint.biblScope
                : [biblStruct.monogr.imprint.biblScope];
            biblScopes.forEach(scope => {
                const scopeType = scope["@_type"] || scope.type || "";
                const scopeVal = scope._ || scope["#text"] || scope || "";
                if (scopeType === "volume" || scopeType === "vol") {
                    metadata.volume = scopeVal;
                } else if (scopeType === "issue" || scopeType === "number") {
                    metadata.issue = scopeVal;
                }
            });
        }
        // Fallback: biblScope ใน analytic
        if (!metadata.volume && biblStruct?.analytic?.biblScope) {
            const scopes = Array.isArray(biblStruct.analytic.biblScope) ? biblStruct.analytic.biblScope : [biblStruct.analytic.biblScope];
            scopes.forEach(scope => {
                const scopeType = scope["@_type"] || scope.type || "";
                const scopeVal = scope._ || scope["#text"] || scope || "";
                if (scopeType === "volume") metadata.volume = scopeVal;
                if (scopeType === "issue") metadata.issue = scopeVal;
            });
        }

        // 6. ดึง Abstract จาก <text><body> หรือ <abstract>
        if (textBody) {
            const bodyStr = JSON.stringify(textBody);
            // ค้นหา abstract ใน body text
            const abstractMatch = bodyStr.match(/(?:abstract|บทคัดย่อ)[\s:]*([\s\S]{10,500}?)(?:\n|\(|keywords|Keyword|คำสำคัญ)/i);
            if (abstractMatch) {
                metadata.abstract = abstractMatch[1].replace(/<[^>]+>/g, "").trim().substring(0, 2000);
            }
        }
        if (json.TEI?.text?.back?.div) {
            const backDivs = Array.isArray(json.TEI.text.back.div) ? json.TEI.text.back.div : [json.TEI.text.back.div];
            for (const div of backDivs) {
                if (div["@_type"] === "abstract") {
                    metadata.abstract = div._ || div["#text"] || "";
                }
            }
        }

        // 7. ดึง Keywords จาก <profileDesc><textClass><keywords>
        if (profileDesc?.textClass?.keywords) {
            const kw = profileDesc.textClass.keywords;
            if (typeof kw === "string") {
                metadata.keywords = kw;
            } else if (Array.isArray(kw)) {
                metadata.keywords = kw.map(k => typeof k === "string" ? k : (k._ || k["#text"] || "")).join(", ");
            } else if (kw._) {
                metadata.keywords = kw._;
            } else if (kw["#text"]) {
                metadata.keywords = kw["#text"];
            }
        }

        // 3. ดึงรายชื่อผู้แต่งและสังกัด (Authors & Affiliations)
        const rawAuthors = fileDesc?.sourceDesc?.biblStruct?.analytic?.author;
        if (rawAuthors) {
            const authorsArray = Array.isArray(rawAuthors) ? rawAuthors : [rawAuthors];
            
            metadata.authors = authorsArray.map((author, index) => {
                const persName = author.persName;
                const forename = Array.isArray(persName?.forename)
                    ? persName.forename.map(f => f._ || f).join(" ")
                    : (persName?.forename?._ || persName?.forename || "");
                const surname = persName?.surname || "";
                
                let affiliationParts = [];
                if (author.affiliation) {
                    const aff = author.affiliation;
                    
                    if (aff.orgName) {
                        const names = Array.isArray(aff.orgName) ? aff.orgName : [aff.orgName];
                        affiliationParts.push(...names.map(o => o._ || o).filter(Boolean));
                    }
                    
                    if (aff.address) {
                        const addr = Array.isArray(aff.address) ? aff.address : [aff.address];
                        addr.forEach(a => {
                            ["settlement", "postCode", "country", "addrLine"].forEach(key => {
                                if (a[key]) {
                                    const vals = Array.isArray(a[key]) ? a[key] : [a[key]];
                                    affiliationParts.push(...vals.map(v => v._ || v).filter(Boolean));
                                }
                            });
                        });
                    }
                }
                const affiliation = affiliationParts.join(", ");
                const authorRole = extractAuthorRoleFromAttributes(author, index);

                return {
                    name: `${forename} ${surname}`.trim(),
                    affiliation: affiliation,
                    _grobid_role_hints: authorRole
                };
            });
        }
    } catch (err) {
        console.error("[XML Parse Warning]: โครงสร้าง XML อาจไม่ตรงตามที่คาดหวัง", err.message);
    }

    console.log('[GROBID parseTeiXml] ✓ ดึงข้อมูลเสร็จ:', JSON.stringify({
        article_title: metadata.article_title?.substring(0, 50),
        journal: metadata.journal?.substring(0, 50),
        doi: metadata.doi?.substring(0, 50),
        volume: metadata.volume,
        issue: metadata.issue,
        authors_count: metadata.authors.length
    }, null, 2));
    return metadata;
}

function extractAuthorRoleFromAttributes(author, index) {
    const hints = {
        is_corresponding: false,
        corresp_id: null,
        role: null,
        footnote_refs: []
    };

    if (author['@_corresp'] === 'yes' || author.corresp === 'yes') {
        hints.is_corresponding = true;
    }

    if (author['@_role'] || author.role) {
        hints.role = author['@_role'] || author.role;
    }

    if (author['@_n']) {
        hints.footnote_refs.push(author['@_n']);
    }

    if (author.persName && author.persName['@_n']) {
        hints.footnote_refs.push(author.persName['@_n']);
    }

    return hints;
}

function extractBackSectionInfo(json) {
    const info = {
        footnotes: {},
        corresponding_authors: [],
        contribution_notes: []
    };

    const backSection = json.TEI?.text?.back;
    if (!backSection) return info;

    const divs = Array.isArray(backSection.div) ? backSection.div : (backSection.div ? [backSection.div] : []);
    
    for (const div of divs) {
        if (div['@_type'] === 'footnotes' || div['@_subtype'] === 'footnotes') {
            const notes = Array.isArray(div.note) ? div.note : (div.note ? [div.note] : []);
            
            for (const note of notes) {
                const marker = note['@_n'] || note['@_place'] || '';
                const text = note._ || note['#text'] || note;
                
                if (marker && text) {
                    info.footnotes[marker] = text;
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('corresponding author') || 
                        lowerText.includes('correspondence to') ||
                        lowerText.includes('email:') ||
                        lowerText.includes('✉')) {
                        info.corresponding_authors.push(text);
                    }
                    if (lowerText.includes('contribution') || 
                        lowerText.includes('author contribution') ||
                        lowerText.includes('equal contribution') ||
                        lowerText.includes('co-first')) {
                        info.contribution_notes.push(text);
                    }
                }
            }
        }

        if (div.p) {
            const paragraphs = Array.isArray(div.p) ? div.p : [div.p];
            for (const p of paragraphs) {
                const text = p._ || p['#text'] || p;
                if (text && typeof text === 'string') {
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('author contribution') || 
                        lowerText.includes('equal contribution') ||
                        lowerText.includes('contributed equally') ||
                        lowerText.includes('co-first') ||
                        lowerText.includes('co-corresponding')) {
                        info.contribution_notes.push(text);
                    }
                }
            }
        }
    }

    return info;
}

function cleanGROBIDXml(rawXml) {
    console.log('[CleanXML] เริ่ม Clean XML ความยาว:', rawXml.length);
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseNodeValue: true,
            parseAttributeValue: true,
            trimValues: true
        });
        
        const json = parser.parse(rawXml);
        
        if (!json?.TEI?.teiHeader) {
            console.warn('[CleanXML] ไม่พบ teiHeader คืน XML ต้นฉบับ');
            return rawXml;
        }

        const teiHeader = json.TEI.teiHeader;

        if (teiHeader.profileDesc?.textClass?.keywords) {
            const keywords = Array.isArray(teiHeader.profileDesc.textClass.keywords)
                ? teiHeader.profileDesc.textClass.keywords
                : [teiHeader.profileDesc.textClass.keywords];
            
            teiHeader.profileDesc.textClass.keywords = keywords.filter(k => {
                const text = k?.['#text'] || k?.text || '';
                return !text.includes('Academic Editors');
            });
            
            if (teiHeader.profileDesc.textClass.keywords.length === 0) {
                delete teiHeader.profileDesc.textClass.keywords;
            }
        }

        const analytic = teiHeader.fileDesc?.sourceDesc?.biblStruct?.analytic;
        if (analytic?.author) {
            const authors = Array.isArray(analytic.author) ? analytic.author : [analytic.author];
            analytic.author = authors.filter(a => a?.persName);
        }

        const backSection = json.TEI?.text?.back;
        const bodySection = json.TEI?.text?.body;

        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true,
            suppressEmptyNode: true
        });

        const result = { TEI: { teiHeader } };
        if (backSection || bodySection) {
            result.TEI.text = {};
            if (backSection) {
                result.TEI.text.back = backSection;
            }
            if (bodySection) {
                result.TEI.text.body = bodySection;
            }
        }

        const cleanedXml = builder.build(result);
        console.log('[CleanXML] ✓ Clean เสร็จ ความยาว:', cleanedXml.length);
        return cleanedXml;
    } catch (err) {
        console.error('[CleanXML Error]:', err.message);
        console.log('[CleanXML] คืน XML ต้นฉบับ');
        return rawXml;
    }
}

module.exports = { 
    extractMetadataFromGrobid,
    extractAuthorRoleFromAttributes,
    extractBackSectionInfo
};
