const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { supabase, initDatabase, UP_ICT_FACULTY } = require("./db");
const authRoutes = require("./authRoutes");
const { extractMetadataWithGemini } = require("./llmService");
const {
  getPaperDetailsByEid, searchAuthorByName, getAuthorPapers,
  syncUserScopusData
} = require("./scopusService");
const {
  syncAllUsersScholarData,
  syncUserScholarData,
  rejectAndBlacklistPaper,
  getBlacklistByUser,
  unblacklistPaper,
  fetchDirectFromGoogleScholarProfile,
  savePaperAndAuthor,
  fetchPaperDetailFromUrl
} = require("./scholarService");
const { enrichByDoi, findDoiByTitle } = require("./crossrefService");
const { initScholarCron, getCronStatus } = require("./cronService");
const { 
  triggerCoAuthorNotificationWorkflow,
  sanitizePersonName,
  isStrictNameMatch 
} = require("./emailService");
require("dotenv").config();

const app = express();

const UPLOADS_DIR = __dirname + "/uploads";
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

let isSyncRunning = false;

const upload = multer({ storage: multer.memoryStorage() });

const NO_DB = "ไม่มีฐานข้อมูล";

const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ", db: NO_DB, code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับนานาชาติ", db: NO_DB, code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: NO_DB, code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 2", code: "2.1.6", hours: 80, quality: 0.6, faculty: 2500, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 1", code: "2.1.7", hours: 120, quality: 0.8, faculty: 2500, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: NO_DB, code: "2.1.7", hours: 120, quality: 0.8, faculty: 10000, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q1", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 40000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q2", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 30000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q3", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 20000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q4", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 10000 },
  { type: "จดทะเบียนทรัพย์สินทางปัญญาอื่นๆ", db: NO_DB, code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
  { type: "จดทะเบียนอนุสิทธิบัตร", db: NO_DB, code: "2.1.10", hours: 150, quality: 0.4, faculty: 0, uni: 3000 },
  { type: "จดทะเบียนสิทธิบัตร", db: NO_DB, code: "2.1.11", hours: 300, quality: 1, faculty: 0, uni: 5000 },
  { type: "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)", db: NO_DB, code: "2.2.1", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน", db: NO_DB, code: "2.2.2", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ", db: NO_DB, code: "2.2.3", hours: 80, quality: 0.6, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ", db: NO_DB, code: "2.2.4", hours: 120, quality: 0.8, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ", db: NO_DB, code: "2.2.5", hours: 150, quality: 1, faculty: 0, uni: 0 },
];

function calculateFacultyFunding(type, author, baseFaculty) {
  const isFirst = author === "First author" || author === "First & Corresponding author" || author === "First Author";
  const isCorr = author === "Corresponding author" || author === "First & Corresponding author" || author === "Corresponding Author";
  const isCo = author === "Co author" || author === "Co Author" || author === "Co-author";

  if (type === "การประชุมวิชาการระดับชาติ") {
    if (isFirst) return 1000;
    if (isCorr) return 500;
    return 0;
  }
  if (type === "การประชุมวิชาการระดับนานาชาติ") {
    if (isFirst || isCorr) return 9000;
    if (isCo) return 2500;
    return 0;
  }
  return baseFaculty;
}

function findAuthorRowForUserBackend(authorList, { authorName, userEmail, userFullName, name_th, name_en, authorRole }) {
  if (!Array.isArray(authorList) || authorList.length === 0) return null;

  const candidateNames = new Set();
  if (authorName) candidateNames.add(authorName);
  if (userFullName) candidateNames.add(userFullName);
  if (name_th) candidateNames.add(name_th);
  if (name_en) candidateNames.add(name_en);

  if (userEmail || authorName || userFullName) {
    const cleanUserEmail = (userEmail || '').toLowerCase().trim();
    const matchedStaff = (UP_ICT_FACULTY || []).find(staff => {
      if (cleanUserEmail && staff.email && staff.email.toLowerCase().trim() === cleanUserEmail) return true;
      for (const cName of candidateNames) {
        if (isStrictNameMatch(sanitizePersonName(cName), sanitizePersonName(staff.name_th)) ||
            isStrictNameMatch(sanitizePersonName(cName), sanitizePersonName(staff.name_en))) {
          return true;
        }
      }
      return false;
    });

    if (matchedStaff) {
      if (matchedStaff.name_th) candidateNames.add(matchedStaff.name_th);
      if (matchedStaff.name_en) candidateNames.add(matchedStaff.name_en);
    }
  }

  const candidateList = Array.from(candidateNames).filter(Boolean);

  for (let i = 0; i < authorList.length; i++) {
    const author = authorList[i];
    const cleanAName = sanitizePersonName(author.name || '');
    if (!cleanAName) continue;

    for (const cName of candidateList) {
      if (isStrictNameMatch(cleanAName, sanitizePersonName(cName))) {
        return { ...author, matchIndex: i, isUserMatched: true };
      }
    }
  }

  if (authorList.length === 1) {
    return { ...authorList[0], matchIndex: 0, isUserMatched: true };
  }

  return { ...authorList[0], matchIndex: 0, isUserMatched: false };
}

function computeDateInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const beYear = y + 543;
  const month = d.getMonth(); // 0-indexed: 0=Jan, 6=Jul, 11=Dec
  
  // รอบปีการศึกษาเดิม (เริ่ม 15 มิ.ย.)
  const juneStart = new Date(y, 5, 15);
  const acadGregorian = d >= juneStart ? y : y - 1;
   const julyStart = new Date(y, 6, 1);
   const fiscalEndGregorian = d >= julyStart ? y + 1 : y;

   // รอบปีภาระงาน: กรกฎาคม (ปี N) - มิถุนายน (ปี N+1)
   const startBeYear = month >= 6 ? beYear : beYear - 1;
   const endBeYear = startBeYear + 1;
   const shortStartBe = String(startBeYear).slice(-2);
   const shortEndBe = String(endBeYear).slice(-2);

  return {
    beLabel: `ปี พ.ศ. ${beYear}`,
    acadLabel: `ปีการศึกษา ${acadGregorian + 543}`,
    fiscalLabel: `ปีงบประมาณ ${fiscalEndGregorian + 543}`,
    workloadLabel: `กรกฎาคม ${shortStartBe} - มิถุนายน ${shortEndBe}`,
    workloadFullLabel: `กรกฎาคม ${startBeYear} - มิถุนายน ${endBeYear}`,
    workloadCycleKey: `${startBeYear}-${endBeYear}`,
    workloadStartYear: startBeYear,
    workloadEndYear: endBeYear,
  };
}

function formatEntry(row) {
  let dateInfo = row.date_info;
  let disbursement = {};
  let confirmation = null;

  if (typeof dateInfo === "string") {
    try { 
      const parsed = JSON.parse(dateInfo); 
      dateInfo = parsed;
      if (parsed && typeof parsed === "object") {
        if (parsed.disbursement) disbursement = parsed.disbursement;
        if (parsed.confirmation) confirmation = parsed.confirmation;
      }
    } catch { 
      dateInfo = null; 
    }
  } else if (dateInfo && typeof dateInfo === "object") {
    if (dateInfo.disbursement) disbursement = dateInfo.disbursement;
    if (dateInfo.confirmation) confirmation = dateInfo.confirmation;
  }

  // ⏰ คำนวณสถานะการยืนยันสัดส่วน 7 วัน (7-Day Auto-Lock Rule)
  const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const deadlineMs = confirmation?.deadline ? new Date(confirmation.deadline).getTime() : (createdAtMs + 7 * 86400000);
  const nowMs = Date.now();
  const isPast7Days = nowMs >= deadlineMs;

  let confirmedAuthors = Array.isArray(confirmation?.confirmed_by) ? confirmation.confirmed_by : [];
  let authorListMeta = Array.isArray(confirmation?.author_list) ? confirmation.confirmation_author_list || confirmation.author_list : [];

  let confirmationStatus = confirmation?.status || (isPast7Days ? "AUTO_CONFIRMED" : "PENDING");
  if (confirmationStatus === "PENDING" && isPast7Days) {
    confirmationStatus = "AUTO_CONFIRMED";
  }

  const daysRemaining = Math.max(0, Math.ceil((deadlineMs - nowMs) / 86400000));

  return {
    id: row.id,
    user_id: row.user_id || null,
    userId: row.user_id || null,
    submitter_email: (dateInfo && dateInfo.submitter_email) || null,
    title: row.title || "",
    authors: row.authors || "",
    author: row.author,
    authorName: row.author_name || "",
    affiliations: row.affiliations || "",
    correspondingAuthor: row.corresponding_author || "",
    publicationDate: row.publication_date || row.date || "",
    doi: row.doi || "",
    journal: row.journal || "",
    volume: row.volume || "",
    issue: row.issue || "",
    abstract: row.abstract || "",
    keywords: row.keywords || "",
    type: row.type,
    db: row.db,
    proportion: Number(row.proportion),
    date: row.publication_date || row.date,
    code: row.code,
    baseHours: Number(row.base_hours),
    hours: Number(row.base_hours),
    quality: Number(row.quality),
    actualHours: Number(row.actual_hours),
    faculty: Number(row.faculty),
    facultyNote: row.faculty_note,
    uni: Number(row.uni),
    dateInfo: dateInfo,
    savedAt: row.created_at,
    disbursement_status: disbursement.status || row.disbursement_status || "PENDING",
    disbursed_at: disbursement.disbursed_at || row.disbursed_at || null,
    disbursed_amount: disbursement.amount || row.disbursed_amount || null,
    disbursement_ref_no: disbursement.ref_no || row.disbursement_ref_no || "",
    disbursement_note: disbursement.note || row.disbursement_note || "",
    // 🤝 ข้อมูลยืนยันสัดส่วนผู้ร่วมงาน (Co-author Confirmation State)
    confirmation_status: confirmationStatus, // 'PENDING' | 'CONFIRMED' | 'AUTO_CONFIRMED'
    confirmation_deadline: new Date(deadlineMs).toISOString(),
    confirmation_days_remaining: daysRemaining,
    confirmed_by: confirmedAuthors,
    author_list: authorListMeta,
    is_workload_counted: (confirmationStatus === "CONFIRMED" || confirmationStatus === "AUTO_CONFIRMED")
  };
}

/* ==========================================
    1. Endpoints สำหรับคำนวณและบันทึกภาระงาน (Workload APIs)
    ========================================== */

app.post("/api/calculate", (req, res) => {
  const { author, authorName, userEmail, userFullName, name_th, name_en, type, db: selectedDb, proportion, date, publicationDate, authorList } = req.body;
  
  if (!type) {
    return res.json({
      success: true,
      data: {
        code: "-",
        hours: 0,
        quality: 0,
        faculty: 0,
        facultyNote: "กรุณากดเลือกกลุ่มประเภทผลงานวิชาการ",
        uni: 0,
        actualHours: 0,
        effectiveRole: author || "First author",
        userProportion: proportion || 0,
        matchedAuthorName: ""
      }
    });
  }

  let lookup = LOOKUP_TABLE.find((r) => r.type === type && r.db === selectedDb);
  if (!lookup) {
    lookup = LOOKUP_TABLE.find((r) => r.type === type);
  }
  if (!lookup) {
    lookup = {
      code: "2.1.8",
      hours: 150,
      quality: 1,
      faculty: 10000,
      facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)",
      uni: 40000
    };
  }

  const matchedAuthor = findAuthorRowForUserBackend(authorList, { authorName, userEmail, userFullName, name_th, name_en, authorRole: author });

  const userProportion = Number(matchedAuthor?.proportion ?? proportion ?? 0);
  const actualHours = Math.round((userProportion * lookup.hours) / 100 * 100) / 100;
  const dateInfo = computeDateInfo(publicationDate || date);
  const effectiveRole = matchedAuthor?.role || author || "First author";
  const faculty = calculateFacultyFunding(type, effectiveRole, lookup.faculty);

  res.json({ 
    success: true, 
    data: { 
      ...lookup, 
      faculty, 
      actualHours, 
      dateInfo, 
      effectiveRole, 
      userProportion,
      matchedAuthorName: matchedAuthor?.name || authorName || ""
    } 
  });
});

// 1.2 API ดึงรายการภาระงานทั้งหมด
app.get("/api/entries", async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.3 API บันทึกผลงานลงระบบ
app.post("/api/entries", async (req, res) => {
  try {
    const id = req.body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const {
      title, authors, author, authorName, affiliations, correspondingAuthor,
      publicationDate, doi, journal, volume, issue, abstract, keywords,
      type, db: selectedDb, proportion, date, code, baseHours, quality,
      actualHours, faculty, facultyNote, uni, dateInfo,
      disbursement_status, disbursed_at, disbursed_amount, disbursement_ref_no, disbursement_note
    } = req.body;
    const pubDate = publicationDate || date || null;

    if (req.body.id) {
      const { error: deleteError } = await supabase.from("entries").delete().eq("id", req.body.id);
      if (deleteError) {
        console.error('[Delete Entry On Update Error]', deleteError);
      }
    }

    let parsedDateInfo = dateInfo || {};
    if (typeof parsedDateInfo === "string") {
      try { parsedDateInfo = JSON.parse(parsedDateInfo); } catch { parsedDateInfo = {}; }
    }
    if (disbursement_status || disbursed_at || disbursement_ref_no || disbursed_amount) {
      parsedDateInfo.disbursement = {
        status: disbursement_status || "PENDING",
        disbursed_at: disbursed_at || null,
        amount: disbursed_amount || null,
        ref_no: disbursement_ref_no || "",
        note: disbursement_note || ""
      };
    }

    if (req.body.userEmail || req.body.user_email) {
      parsedDateInfo.submitter_email = req.body.userEmail || req.body.user_email;
    }

    // 🤝 เตรียมข้อมูลการยืนยันสัดส่วน (Co-author Confirmation Metadata)
    let processedAuthorList = req.body.authorList;
    if (!Array.isArray(processedAuthorList) || processedAuthorList.length === 0) {
      if (authors) {
        const names = authors.split(/[,;]/).map(n => n.trim()).filter(Boolean);
        processedAuthorList = names.map((name, idx) => ({
          name,
          role: idx === 0 ? "First author" : "Co author",
          proportion: idx === 0 ? (proportion || 100) : 0
        }));
      } else if (authorName) {
        processedAuthorList = [{ name: authorName, role: author || "First author", proportion: proportion || 100 }];
      }
    }

    const isUpdate = !!req.body.id;
    // ดึงข้อมูลตัวตนของผู้ที่กำลังกดบันทึก/แก้ไขในขณะนี้ (Active Editor / Submitter)
    const currentEditorEmail = (req.body.editorEmail || req.body.userEmail || req.body.user_email || '').toLowerCase().trim();
    const currentEditorName = (req.body.editorName || req.body.userName || req.body.userFullName || '').toLowerCase().trim();
    const currentEditorId = (req.body.editorId || req.body.userId || req.body.user_id) ? String(req.body.editorId || req.body.userId || req.body.user_id).trim() : '';

    const activeEditorIdentifiers = [currentEditorEmail, currentEditorName, currentEditorId].filter(Boolean);
    const isOnlyOneAuthor = (processedAuthorList?.length || 1) <= 1;

    // BR-04 & BR-06: หากเป็นการแก้ไขผลงาน/สัดส่วน รีเซ็ตสถานะการยืนยันของทุกคน และเริ่มนับ 7 วันใหม่ทันที
    let initialDeadline = new Date(Date.now() + 7 * 86400000).toISOString();
    let existingConfirmedBy;
    let revisionCount = parsedDateInfo.confirmation?.revision_count || 0;

    if (isUpdate) {
      // มีการแก้ไข -> นับ 7 วันใหม่ และบันทึกเฉพาะคนที่กดแก้ไขเป็นผู้ยืนยัน ส่วนสมาชิกคนอื่น (รวมถึงคนสร้างการ์ดเดิม) ต้องกดยืนยันใหม่
      existingConfirmedBy = activeEditorIdentifiers.length > 0 ? activeEditorIdentifiers : [(authorName || 'submitter').toLowerCase().trim()];
      revisionCount += 1;
    } else {
      // บันทึกใหม่ครั้งแรก
      existingConfirmedBy = activeEditorIdentifiers.length > 0 ? activeEditorIdentifiers : [(authorName || 'submitter').toLowerCase().trim()];
    }

    // BR-03 & BR-05: ตรวจสอบว่าผู้แต่งทุกคนกดยืนยันครบแล้วจริงหรือไม่
    let isAllConfirmed = false;
    if (isOnlyOneAuthor) {
      isAllConfirmed = true;
    } else {
      const confirmedSet = new Set(existingConfirmedBy.map(c => String(c).toLowerCase().trim()));
      isAllConfirmed = (processedAuthorList || []).every(author => {
        const aName = (author.name || "").toLowerCase().trim();
        if (!aName) return false;
        for (const c of confirmedSet) {
          if (c && (c.includes(aName) || aName.includes(c))) return true;
        }
        return false;
      });
    }

    parsedDateInfo.confirmation = {
      status: isAllConfirmed ? "CONFIRMED" : "PENDING",
      deadline: initialDeadline,
      last_modified_at: new Date().toISOString(),
      last_editor_email: currentEditorEmail || null,
      last_editor_name: currentEditorName || null,
      revision_count: revisionCount,
      confirmed_by: existingConfirmedBy,
      author_list: processedAuthorList || []
    };

    const entryData = {
      id, 
      user_id: req.body.userId || req.body.user_id || null,
      title: title || null, authors: authors || null, author: author || null,
      author_name: authorName || null, affiliations: affiliations || null,
      corresponding_author: correspondingAuthor || null, publication_date: pubDate,
      doi: doi || null, journal: journal || null, volume: volume || null,
      issue: issue || null, abstract: abstract || null, keywords: keywords || null,
      type: type || "", db: selectedDb || "",
      proportion: proportion !== undefined ? Number(proportion) : 100,
      date: pubDate, code: code || "",
      base_hours: baseHours !== undefined ? Number(baseHours) : 0,
      quality: quality !== undefined ? Number(quality) : 0,
      actual_hours: actualHours !== undefined ? Number(actualHours) : 0,
      faculty: faculty !== undefined ? Number(faculty) : 0,
      faculty_note: facultyNote || "",
      uni: uni !== undefined ? Number(uni) : 0,
      date_info: JSON.stringify(parsedDateInfo)
    };

    const { error: insertError } = await supabase.from("entries").insert([entryData]);
    if (insertError) throw insertError;

    const { data: rows, error: fetchError } = await supabase
      .from("entries").select("*").order("created_at", { ascending: false });
    if (fetchError) throw fetchError;

    // BR-01: 📧 ส่งอีเมลแจ้งเตือนผู้แต่งทุกคนที่พบใน Database อัตโนมัติ (เมื่อเพิ่มใหม่หรือแก้ไขสัดส่วน)
    if (Array.isArray(processedAuthorList) && processedAuthorList.length > 0) {
      console.log(`[Email Workflow] ตรวจพบผู้แต่ง ${processedAuthorList.length} คน สำหรับบทความ: "${title || 'ผลงานวิจัย'}" (${isUpdate ? 'มีการแก้ไขสัดส่วน - ส่งแจ้งเตือนใหม่' : 'บันทึกใหม่'}) กำลังส่งอีเมลแจ้งเตือน...`);
      triggerCoAuthorNotificationWorkflow({
        paperId: id,
        submitterUserId: req.body.userId || null,
        submitterName: authorName || (processedAuthorList[0]?.name) || "ผู้บันทึกผลงาน",
        submitterProportion: proportion || (processedAuthorList[0]?.proportion) || 100,
        paperTitle: title || "ผลงานวิจัย",
        authorList: processedAuthorList
      }).then(res => {
        console.log(`[Email Workflow] ส่งอีเมลแจ้งเตือนสำเร็จทั้งหมด ${res?.totalRecipients || 0} ท่าน (จากผู้แต่งที่พบใน Database)`);
      }).catch(err => console.error("[Auto-Email Notification Error]:", err.message));
    }

    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error saving entry:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.4 API ยืนยันสัดส่วนผู้ร่วมงาน (Co-author Proportion Confirmation)
app.post("/api/entries/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userEmail, userId } = req.body;
    const userIdentifier = (userName || userEmail || userId || "").toLowerCase().trim();

    if (!userIdentifier) {
      return res.status(400).json({ success: false, message: "ไม่พบข้อมูลผู้ยืนยัน" });
    }

    const { data: entryRows, error: fetchErr } = await supabase
      .from("entries")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (fetchErr || !entryRows || entryRows.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบผลงานที่ต้องการยืนยัน" });
    }

    const entry = entryRows[0];
    let parsedDateInfo = {};
    if (typeof entry.date_info === "string") {
      try { parsedDateInfo = JSON.parse(entry.date_info); } catch { parsedDateInfo = {}; }
    } else if (entry.date_info && typeof entry.date_info === "object") {
      parsedDateInfo = entry.date_info;
    }

    const confirmation = parsedDateInfo.confirmation || {
      status: "PENDING",
      deadline: new Date(new Date(entry.created_at || Date.now()).getTime() + 7 * 86400000).toISOString(),
      confirmed_by: [],
      author_list: []
    };

    const confirmedSet = new Set((confirmation.confirmed_by || []).map(c => String(c).toLowerCase().trim()));
    confirmedSet.add(userIdentifier);
    if (userName) confirmedSet.add(userName.toLowerCase().trim());
    if (userEmail) confirmedSet.add(userEmail.toLowerCase().trim());

    // ตรวจสอบว่าผู้ร่วมงานทุกคนกดยืนยันครบหรือยัง
    const authorList = confirmation.author_list || [];
    let isAllConfirmed = false;

    if (authorList.length > 0) {
      const allConfirmedCheck = authorList.every(author => {
        const aName = (author.name || "").toLowerCase().trim();
        if (!aName) return true;
        for (const c of confirmedSet) {
          if (c && (c.includes(aName) || aName.includes(c))) return true;
        }
        return false;
      });
      isAllConfirmed = allConfirmedCheck;
    } else {
      isAllConfirmed = true;
    }

    parsedDateInfo.confirmation = {
      ...confirmation,
      status: isAllConfirmed ? "CONFIRMED" : "PENDING",
      confirmed_by: Array.from(confirmedSet),
      confirmed_at: new Date().toISOString()
    };

    const { error: updateErr } = await supabase
      .from("entries")
      .update({ date_info: JSON.stringify(parsedDateInfo) })
      .eq("id", id);

    if (updateErr) throw updateErr;

    const { data: allRows, error: allErr } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (allErr) throw allErr;

    res.json({
      success: true,
      message: isAllConfirmed ? "ผู้ร่วมงานทุกคนยืนยันสัดส่วนครบถ้วนแล้ว" : "บันทึกการยืนยันสัดส่วนของท่านเรียบร้อยแล้ว",
      data: allRows.map(formatEntry)
    });
  } catch (error) {
    console.error("Confirm proportion error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.5 API ลบรายการภาระงาน
app.delete("/api/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from("entries").delete().eq("id", id);
    const { data: rows, error } = await supabase.from("entries").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================
    2. Endpoints สกัดข้อมูลจาก PDF (Gemini AI Only - GROBID Removed)
    ========================================== */

app.post("/api/upload", upload.single("pdf_file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
  try {
    console.log("[System] กำลังส่งไฟล์ PDF ให้ Gemini สกัด Metadata...");
    const metadata = await extractMetadataWithGemini(req.file.buffer);
    res.json({ message: "สกัดข้อมูลสำเร็จ", metadata });
  } catch (error) {
    console.error("Extract error:", error);
    res.status(500).json({ error: "สกัดข้อมูลไม่สำเร็จ: " + error.message });
  }
});

app.post("/api/extract", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์ PDF ที่อัปโหลด" });
  try {
    console.log("[System] กำลังส่งไฟล์ PDF ให้ Gemini สกัด Metadata...");
    const metadata = await extractMetadataWithGemini(req.file.buffer);
    res.json({ success: true, message: "สกัดข้อมูลสำเร็จ", metadata });
  } catch (error) {
    console.error("Extract error:", error);
    res.status(500).json({ success: false, error: "สกัดข้อมูลไม่สำเร็จ: " + error.message });
  }
});

app.post("/api/save", async (req, res) => {
  const { article_title, publish_date, authors, author_contribution, file_info,
    doi, journal, publication_level, volume, issue, pages, abstract,
    keywords, study_design, participants } = req.body;
  if (!article_title) return res.status(400).json({ error: "ต้องระบุชื่อบทความ" });

  try {
    const { data: dupCheck, error } = await supabase
      .from("research_papers").select("id").eq("article_title", article_title).limit(1);
    if (dupCheck && dupCheck.length > 0) {
      return res.status(409).json({ error: "พบบทความชื่อนี้ในระบบแล้ว", existing_id: dupCheck[0].id });
    }
    const { error: insertError } = await supabase.from("research_papers").insert([{
      article_title, publish_date: publish_date || null,
      authors: authors ? JSON.stringify(authors) : null,
      author_contribution: author_contribution || null,
      file_name: file_info?.fileName || null, bucket_name: file_info?.bucket || null,
      doi: doi || null, journal: journal || null, publication_level: publication_level || null,
      volume: volume || null, issue: issue || null, pages: pages || null,
      abstract: abstract || null, keywords: keywords || null,
      study_design: study_design || null,
      participants: participants ? JSON.stringify(participants) : null
    }]);
    if (insertError) throw insertError;

    // 📧 ส่งอีเมลแจ้งเตือนผู้แต่งทุกคนที่พบในฐานข้อมูลทันที (Async Background)
    let saveAuthorList = [];
    if (Array.isArray(authors)) {
      saveAuthorList = authors.map((a, idx) => ({
        name: typeof a === 'string' ? a : (a.name || a.full_name || ''),
        role: typeof a === 'object' && a.role ? a.role : (idx === 0 ? 'First author' : 'Co author'),
        proportion: typeof a === 'object' && a.proportion ? a.proportion : ''
      }));
    }
    if (saveAuthorList.length > 0) {
      triggerCoAuthorNotificationWorkflow({
        submitterName: saveAuthorList[0]?.name || "ผู้บันทึกผลงาน",
        paperTitle: article_title || "ผลงานวิจัย",
        authorList: saveAuthorList
      }).catch(err => console.error("[Save Paper Auto-Email Error]:", err.message));
    }

    res.json({ message: "บันทึกข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("[DB Save Error]:", error);
    res.status(500).json({ error: "บันทึกข้อมูลไม่สำเร็จ: " + error.message });
  }
});

/* ==========================================
    3. Endpoints ระบบบุคลากร & Google Scholar
    ========================================== */

// 3.1 ดึงรายชื่ออาจารย์ทั้งหมดในระบบ
app.get("/api/users", async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("users")
      .select("id, email, full_name, name_en, name_th, department, position, scholar_id, scopus_id")
      .order("department", { ascending: true }).order("id", { ascending: true });
    if (error) throw error;
    res.json(rows);
  } catch (error) {
    console.error("[Get Users Error]:", error);
    res.status(500).json({ error: "ดึงรายชื่อผู้ใช้ไม่สำเร็จ: " + error.message });
  }
});

// 3.1a ดึงรายชื่ออาจารย์สำหรับ Auto-Mapping Affiliation
app.get("/api/users/staff", async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("users")
.select("id, name_en, name_th, full_name, email, department, position, scholar_id, scopus_id")
       .order("name_en", { ascending: true });
    if (error) throw error;
    res.json(rows || []);
  } catch (error) {
    console.error("[Get Staff Error]:", error);
    res.status(500).json({ error: "ดึงรายชื่ออาจารย์ไม่สำเร็จ: " + error.message });
  }
});

// 3.2 อัปเดต Scholar ID และข้อมูลอาจารย์
app.put("/api/users/:userId/scholar-id", async (req, res) => {
  const { userId } = req.params;
  const { scholarId, scopusId, position } = req.body;
  try {
    const cleanedScholarId = scholarId ? scholarId.trim() : null;
    const cleanedScopusId = scopusId ? scopusId.trim() : null;
    const updateData = { scholar_id: cleanedScholarId, scopus_id: cleanedScopusId };
    if (position) updateData.position = position;
    await supabase.from("users").update(updateData).eq("id", userId);
    const { data: rows, error } = await supabase
      .from("users").select("id, email, full_name, name_en, name_th, department, position, scholar_id, scopus_id")
      .eq("id", userId).limit(1);
    if (error) throw error;
    res.json({ message: "บันทึกข้อมูลสำเร็จ", user: rows[0] });
  } catch (error) {
    console.error("[Update Scholar ID Error]:", error);
    res.status(500).json({ error: "อัปเดตข้อมูลไม่สำเร็จ: " + error.message });
  }
});

// 3.3 ดึงผลงานวิชาการของอาจารย์รายบุคคล พร้อมสถานะ Co-author & Contribution
app.get("/api/users/:userId/papers", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: rows, error } = await supabase
      .from("papers")
      .select(`
        paper_id:id,
        eid,
        scopus_id,
        cited_by_count,
        doi,
        title,
        publish_year,
        authors_raw,
        cited_by,
        scholar_url,
        source,
        journal,
        volume,
        issue,
        abstract,
        keywords,
        publication_date,
        metadata_enriched_at,
        metadata_source,
        enrichment_status,
        paper_status:status,
        paper_authors!inner (
          author_entry_id:id,
          contribution_percent,
          is_first_author,
          is_co_first_author,
          is_corresponding,
          is_co_corresponding,
          author_status:status,
          confirmed_at
        )
      `)
      .eq("paper_authors.user_id", userId);

    if (error) throw error;

    console.log('[Papers API Response]', {
      userId,
      count: rows?.length ?? 0,
      scopusCount: rows?.filter(p => Boolean(p.eid)).length ?? 0,
      scholarCount: rows?.filter(p => p.source === 'scholar' || p.source === 'google_scholar').length ?? 0
    });

    // Flatten nested data
    const formattedRows = [];
    for (const paper of (rows || [])) {
      const authors = paper.paper_authors || [];
      for (const pa of authors) {
        formattedRows.push({
          paper_id: paper.paper_id,
          eid: paper.eid,
          scopus_id: paper.scopus_id,
          cited_by_count: paper.cited_by_count,
          doi: paper.doi,
          title: paper.title,
          publish_year: paper.publish_year,
          authors_raw: paper.authors_raw,
          cited_by: paper.cited_by,
          scholar_url: paper.scholar_url,
          source: paper.source,
          journal: paper.journal,
          volume: paper.volume,
          issue: paper.issue,
          abstract: paper.abstract,
          keywords: paper.keywords,
          publication_date: paper.publication_date,
          metadata_enriched_at: paper.metadata_enriched_at,
          metadata_source: paper.metadata_source,
          enrichment_status: paper.enrichment_status,
          status: paper.paper_status,
          author_entry_id: pa.author_entry_id,
          contribution_percent: Number(pa.contribution_percent) || 0,
          is_first_author: Boolean(pa.is_first_author),
          is_co_first_author: Boolean(pa.is_co_first_author),
          is_corresponding: Boolean(pa.is_corresponding),
          is_co_corresponding: Boolean(pa.is_co_corresponding),
          author_status: pa.author_status,
          confirmed_at: pa.confirmed_at,
        });
      }
    }
    // Sort: PENDING first, then by year desc
    formattedRows.sort((a, b) => {
      const orderA = a.author_status === 'PENDING' ? 0 : 1;
      const orderB = b.author_status === 'PENDING' ? 0 : 1;
      if (orderA !== orderB) return orderA - orderB;
      const yearA = a.publish_year || 0;
      const yearB = b.publish_year || 0;
      if (yearA !== yearB) return yearB - yearA;
      return b.paper_id - a.paper_id;
    });

    res.json(formattedRows);
  } catch (error) {
    console.error("[Get User Papers Error]:", error);
    res.status(500).json({ error: "ดึงรายการผลงานไม่สำเร็จ: " + error.message });
  }
});

// 3.4 สั่ง Sync Google Scholar ข้อมูลอาจารย์ทั้งหมด
app.post("/api/sync-scholar", async (req, res) => {
  if (isSyncRunning) {
    return res.status(409).json({ error: "Sync already in progress", message: "กำลังมีการประมวลผลดึงข้อมูล กรุณารอสักครู่" });
  }
  isSyncRunning = true;
  const startTime = Date.now();
  try {
    const result = await syncAllUsersScholarData();
    const duration = Date.now() - startTime;
    res.json({ message: "Sync completed", durationMs: duration, stats: { createdCount: result.createdCount, linkedCount: result.linkedCount, errors: result.errors } });
  } catch (error) {
    console.error("[Sync Scholar Error]:", error);
    res.status(500).json({ error: "Sync failed", details: error.message });
  } finally {
    isSyncRunning = false;
  }
});

app.post("/api/sync-scholar/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await syncUserScholarData(userId);
    res.json({ message: `Sync completed for user ${userId}`, data: result });
  } catch (error) {
    console.error(`[Sync Scholar User ${userId} Error]:`, error);
    res.status(500).json({ error: "Sync user failed", details: error.message });
  }
});

app.post("/api/sync-scopus/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await syncUserScopusData(userId);
    res.json({ message: `Sync completed for user ${userId}`, data: result });
  } catch (error) {
    console.error(`[Sync Scopus User ${userId} Error]:`, error);
    res.status(500).json({ error: "Sync Scopus failed", details: error.message });
  }
});

app.post("/api/scrape-scholar/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: users, error } = await supabase.from("users").select("scholar_id").eq("id", userId).limit(1);
    if (error) throw error;
    if (!users || users.length === 0) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    const scholarId = users[0].scholar_id;
    if (!scholarId) return res.status(400).json({ error: "ผู้ใช้นี้ยังไม่ได้ตั้งค่า Google Scholar ID" });
    console.log(`[Scrape Scholar] เริ่มดึงข้อมูลโดยตรงจาก Google Scholar Profile: ${scholarId}`);
    const papers = await fetchDirectFromGoogleScholarProfile(scholarId);
    let createdCount = 0, linkedCount = 0;
    for (const paper of papers) {
      try {
        const r = await savePaperAndAuthor(userId, paper);
        if (r) { linkedCount++; if (r.isNewPaper) createdCount++; }
      } catch (saveErr) { console.error(`[Save Paper Error] ${paper.title}:`, saveErr.message); }
    }
    res.json({ message: `Direct scrape completed for user ${userId}`, stats: { totalFetched: papers.length, createdCount, linkedCount } });
  } catch (error) {
    console.error(`[Scrape Scholar User ${userId} Error]:`, error);
    res.status(500).json({ error: "Direct scrape failed", details: error.message });
  }
});

// 3.5.2 ดึงข้อมูลละเอียดเปเปอร์จาก Google Scholar Detail Page (On-Demand)
app.post("/api/scholar/paper-detail", async (req, res) => {
  const { detailUrl } = req.body;
  if (!detailUrl) return res.status(400).json({ error: 'Missing detailUrl' });
  try {
    const detail = await fetchPaperDetailFromUrl(detailUrl);
    res.json(detail);
  } catch (error) {
    console.error("[Paper Detail Error]:", error.message);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

// 3.6 ยืนยันข้อมูลผลงานและอัปเดตสัดส่วนภาระงาน (Confirm Action)
app.put("/api/papers/:paperId/confirm", async (req, res) => {
  const { paperId } = req.params;
  const { userId, contributionPercent, isFirstAuthor, isCorresponding } = req.body;
  if (!userId) return res.status(400).json({ error: "ต้องระบุ userId" });
  const percent = parseFloat(contributionPercent) || 0;
  if (percent < 0 || percent > 100) return res.status(400).json({ error: "สัดส่วนภาระงานต้องอยู่ระหว่าง 0% ถึง 100%" });

  try {
    const updateData = { contribution_percent: percent };
    if (isFirstAuthor !== undefined) updateData.is_first_author = isFirstAuthor ? 1 : 0;
    if (isCorresponding !== undefined) updateData.is_corresponding = isCorresponding ? 1 : 0;
    await supabase.from("paper_authors").update(updateData)
      .eq("paper_id", paperId).eq("user_id", userId);

    const { data: statRows, error: statError } = await supabase
      .from("paper_authors").select("contribution_percent, status")
      .eq("paper_id", paperId);
    if (statError) throw statError;

    const total_percent = statRows.reduce((sum, r) => sum + (Number(r.contribution_percent) || 0), 0);
    const total_authors = statRows.length;
    const confirmed_authors = statRows.filter(r => r.status === 'CONFIRMED').length;

    let newPaperStatus = null;
    if (total_percent >= 100 || total_authors === confirmed_authors) {
      newPaperStatus = "COMPLETED";
      await supabase.from("papers").update({ status: newPaperStatus, updated_at: new Date().toISOString() }).eq("id", paperId);
    }

    // 📧 ส่งอีเมลแจ้งเตือนผู้แต่งร่วมที่ยังไม่ได้ยืนยัน (Async Background)
    try {
      const { data: paperRows } = await supabase.from("papers").select("title, authors_raw").eq("id", paperId).limit(1);
      const { data: userRows } = await supabase.from("users").select("name_th, name_en, full_name").eq("id", userId).limit(1);
      const submitterName = userRows?.[0]?.name_th || userRows?.[0]?.name_en || userRows?.[0]?.full_name || "ผู้แต่ง";
      const paperTitle = paperRows?.[0]?.title || "ผลงานวิจัย";

      triggerCoAuthorNotificationWorkflow({
        paperId: parseInt(paperId, 10),
        submitterUserId: parseInt(userId, 10),
        submitterName,
        submitterProportion: percent,
        paperTitle,
        authorsRaw: paperRows?.[0]?.authors_raw
      }).catch(err => console.error("[Confirm Paper Auto-Email Error]:", err.message));
    } catch (notifyErr) {
      console.error("[Email Notification Prep Error]:", notifyErr.message);
    }

    res.json({ message: "ยืนยันข้อมูลเรียบร้อยแล้ว", paperStatus: newPaperStatus || "PENDING_CO_AUTHOR", totalPercent: parseFloat(total_percent) });
  } catch (error) {
    console.error("[Confirm Paper Error]:", error);
    res.status(500).json({ error: "ยืนยันข้อมูลไม่สำเร็จ", details: error.message });
  }
});

// 3.7 ปฏิเสธผลงาน ("ไม่ใช่ผลงานของฉัน" -> Blacklist)
app.post("/api/papers/reject", async (req, res) => {
  const { userId, scholarTitle, paperId } = req.body;
  if (!userId || !scholarTitle) return res.status(400).json({ error: "ต้องระบุ userId และ scholarTitle" });
  try {
    const result = await rejectAndBlacklistPaper(userId, scholarTitle, paperId);
    res.json(result);
  } catch (error) {
    console.error("[Reject Paper Error]:", error);
    res.status(500).json({ error: "ปฏิเสธผลงานไม่สำเร็จ", details: error.message });
  }
});

app.get("/api/cron/status", (req, res) => { res.json(getCronStatus()); });

// Scopus API - ดึงข้อมูลเปเปอร์ฉบับเต็มด้วย EID
app.get("/api/scopus/paper/:eid", async (req, res) => {
  try {
    const { eid } = req.params;
    const paperData = await getPaperDetailsByEid(eid);
    res.json(paperData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scopus API - ค้นหาอาจารย์โดยชื่อ
app.get("/api/scopus/authors/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const authors = await searchAuthorByName(name);
    res.json(authors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scopus API - ดึงรายการเปเปอร์ทั้งหมดของอาจารย์
app.get("/api/scopus/author-papers/:authorId", async (req, res) => {
  try {
    const { authorId } = req.params;
    const papers = await getAuthorPapers(authorId);
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Paper DOI Enrichment Endpoint (with caching)
// ==========================================
app.post("/api/papers/enrich-by-doi", async (req, res) => {
  const { doi } = req.body;
  if (!doi) return res.status(400).json({ success: false, error: 'DOI is required' });

  const cleanDoi = String(doi).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();

  try {
    // Check if already enriched in papers table
    const { data: existingPaper } = await supabase
      .from('papers')
      .select('id, title, abstract, keywords, volume, issue, journal, publication_date, metadata_enriched_at, metadata_source, enrichment_status')
      .eq('doi', cleanDoi)
      .maybeSingle();

    if (existingPaper && existingPaper.enrichment_status === 'enriched' && existingPaper.metadata_enriched_at) {
      const enrichedAt = new Date(existingPaper.metadata_enriched_at);
      const hoursSinceEnrichment = (Date.now() - enrichedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceEnrichment < 168) { // 1 week cache
        return res.json({
          success: true,
          cached: true,
          data: {
            title: existingPaper.title,
            abstract: existingPaper.abstract,
            keywords: existingPaper.keywords,
            volume: existingPaper.volume,
            issue: existingPaper.issue,
            journal: existingPaper.journal,
            publicationDate: existingPaper.publication_date,
            authors: existingPaper.authors || [],
            metadata_source: existingPaper.metadata_source,
            metadata_enriched_at: existingPaper.metadata_enriched_at
          }
        });
      }
    }

    // Enrich from Crossref/OpenAlex
    const { enrichByDoi } = require('./crossrefService');
    const result = await enrichByDoi(cleanDoi);

    if (!result.success) {
      return res.json({ success: false, reason: result.reason, cached: false });
    }

    const enrichedData = result.data;

    // Update or insert paper with enriched data
    if (existingPaper) {
      await supabase
        .from('papers')
        .update({
          abstract: enrichedData.abstract || existingPaper.abstract,
          keywords: enrichedData.keywords || existingPaper.keywords,
          volume: enrichedData.volume || existingPaper.volume,
          issue: enrichedData.issue || existingPaper.issue,
          journal: enrichedData.journal || existingPaper.journal,
          publication_date: enrichedData.publicationDate || existingPaper.publication_date,
          metadata_source: result.source,
          metadata_enriched_at: new Date().toISOString(),
          enrichment_status: 'enriched'
        })
        .eq('id', existingPaper.id);
    } else {
      await supabase
        .from('papers')
        .insert({
          doi: cleanDoi,
          title: enrichedData.title,
          abstract: enrichedData.abstract,
          keywords: enrichedData.keywords,
          volume: enrichedData.volume,
          issue: enrichedData.issue,
          journal: enrichedData.journal,
          publication_date: enrichedData.publicationDate,
          metadata_source: result.source,
          metadata_enriched_at: new Date().toISOString(),
          enrichment_status: 'enriched',
          source: 'enrichment'
        });
    }

    res.json({
      success: true,
      cached: false,
      data: {
        title: enrichedData.title,
        abstract: enrichedData.abstract,
        keywords: enrichedData.keywords,
        volume: enrichedData.volume,
        issue: enrichedData.issue,
        journal: enrichedData.journal,
        publicationDate: enrichedData.publicationDate,
        authors: enrichedData.authors || [],
        metadata_source: result.source
      }
    });
  } catch (error) {
    console.error('[DOI Enrichment Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Unified Research Workload Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📂 Uploads dir: ${UPLOADS_DIR}`);
  console.log(`=======================================================`);
  initScholarCron();
  initDatabase();
});
