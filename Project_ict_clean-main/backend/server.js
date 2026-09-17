const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Minio = require("minio");
const fs = require("fs");
const path = require("path");
const pool = require("./db");
const authRoutes = require("./authRoutes");
const { extractMetadataFromGrobid } = require("./grobidService");
const { refineMetadataWithLLM, identifyAuthorRoles } = require("./llmService");
const {
  syncAllUsersScholarData,
  syncUserScholarData,
  rejectAndBlacklistPaper,
  getBlacklistByUser,
  unblacklistPaper,
  fetchDirectFromGoogleScholarProfile,
  savePaperAndAuthor
} = require("./scholarService");
const { initScholarCron, getCronStatus } = require("./cronService");
require("dotenv").config();

const app = express();

// ตรวจสอบและสร้างไดเรกทอรี uploads/ ในเครื่องเสมอ สำหรับกรณี Graceful Fallback หาก MinIO ไม่ได้เปิด
const UPLOADS_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// เส้นทางสำหรับ Authentication (Microsoft Login & User Management)
app.use("/api/auth", authRoutes);

// In-memory lock ป้องกันการซิงก์ Google Scholar ซ้อนกัน
let isSyncRunning = false;

/* ==========================================
   MinIO Client & Graceful Local Storage Fallback
   ========================================== */
let minioClient = null;
let useMinio = false;
const bucketName = process.env.MINIO_BUCKET || "research-papers";

if (process.env.MINIO_ENDPOINT) {
  try {
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT || "9000", 10),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || "admin_minio",
      secretKey: process.env.MINIO_SECRET_KEY || "minio_password123",
    });

    minioClient.bucketExists(bucketName)
      .then((exists) => {
        if (!exists) {
          return minioClient.makeBucket(bucketName, "us-east-1");
        }
      })
      .then(() => {
        useMinio = true;
        console.log(`[MinIO] Bucket '${bucketName}' พร้อมใช้งาน`);
      })
      .catch((err) => {
        console.warn(`[MinIO Warning] ไม่สามารถเชื่อมต่อ MinIO ได้ (${err.message}) -> สลับไปบันทึกไฟล์ในโฟลเดอร์ uploads/ อัตโนมัติ`);
        useMinio = false;
      });
  } catch (err) {
    console.warn(`[MinIO Init Error] สลับไปใช้ Local Storage ใน uploads/`);
  }
}

// Multer memory storage สำหรับรับไฟล์เข้า RAM ก่อนส่งต่อไป MinIO หรือเขียนลง Disk
const upload = multer({ storage: multer.memoryStorage() });

/* ==========================================
   ข้อมูลอ้างอิงและเกณฑ์คำนวณภาระงาน (Workload Calculation Engine)
   ========================================== */
const NO_DB = "ไม่มีฐานข้อมูล";

const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ (สายสนับสนุน)", db: NO_DB, code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับชาติ (สายวิชาการ)", db: NO_DB, code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับนานาชาติ", db: NO_DB, code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: NO_DB, code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 2", code: "2.1.6", hours: 80, quality: 0.6, faculty: 2500, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 1", code: "2.1.7", hours: 120, quality: 0.8, faculty: 2500, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: NO_DB, code: "2.1.7", hours: 120, quality: 0.8, faculty: 10000, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q1", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 40000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q2", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 30000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q3", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 20000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q4", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 10000 },
  { type: "จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", db: NO_DB, code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
  { type: "จดทะเบียนอนุสิทธิบัตร", db: NO_DB, code: "2.1.10", hours: 150, quality: 0.4, faculty: 0, uni: 3000 },
  { type: "จดทะเบียนสิทธิบัตร", db: NO_DB, code: "2.1.11", hours: 300, quality: 1, faculty: 0, uni: 5000 },
  { type: "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)", db: NO_DB, code: "2.2.1", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน", db: NO_DB, code: "2.2.2", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ", db: NO_DB, code: "2.2.3", hours: 80, quality: 0.6, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ", db: NO_DB, code: "2.2.4", hours: 120, quality: 0.8, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ", db: NO_DB, code: "2.2.5", hours: 150, quality: 1, faculty: 0, uni: 0 },
];

function calculateFacultyFunding(type, author, baseFaculty) {
  if (type === "การประชุมวิชาการระดับชาติ (สายสนับสนุน)") {
    return author === "First author" ? 2500 : 0;
  }
  if (type === "การประชุมวิชาการระดับชาติ (สายวิชาการ)") {
    if (author === "First author") return 1000;
    if (author === "Corresponding author") return 500;
    return 0;
  }
  if (type === "การประชุมวิชาการระดับนานาชาติ") {
    if (author === "First author" || author === "Corresponding author") return 9000;
    if (author === "Co author") return 2500;
    return 0;
  }
  return baseFaculty;
}

function computeDateInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  
  const beYear = y + 543;
  const juneStart = new Date(y, 5, 15);
  const acadGregorian = d >= juneStart ? y : y - 1;
  
  const julyStart = new Date(y, 6, 1);
  const fiscalEndGregorian = d >= julyStart ? y + 1 : y;

  return {
    beLabel: `ปี พ.ศ. ${beYear}`,
    acadLabel: `ปีการศึกษา ${acadGregorian + 543}`,
    fiscalLabel: `ปีงบประมาณ ${fiscalEndGregorian + 543}`,
    workloadLabel: `ปีภาระงาน ${acadGregorian + 543}`,
  };
}

function formatEntry(row) {
  let dateInfo = row.date_info;
  if (typeof dateInfo === "string") {
    try {
      dateInfo = JSON.parse(dateInfo);
    } catch {
      dateInfo = null;
    }
  }

  return {
    id: row.id,
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
  };
}

/* ==========================================
   1. Endpoints สำหรับคำนวณและบันทึกภาระงาน (Workload APIs)
   ========================================== */

// 1.1 API คำนวณผลลัพธ์แบบ Live Preview
app.post("/api/calculate", (req, res) => {
  const { author, type, db: selectedDb, proportion, date, publicationDate } = req.body;
  const lookup = LOOKUP_TABLE.find((r) => r.type === type && r.db === selectedDb);
  
  if (!lookup) {
    return res.json({ success: false, message: "No match found" });
  }

  const actualHours = Math.round(((Number(proportion) || 0) * lookup.hours) / 100 * 100) / 100;
  const dateInfo = computeDateInfo(publicationDate || date);
  const faculty = calculateFacultyFunding(type, author, lookup.faculty);

  res.json({ success: true, data: { ...lookup, faculty, actualHours, dateInfo } });
});

// 1.2 API ดึงรายการภาระงานทั้งหมด
app.get("/api/entries", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM entries ORDER BY created_at DESC, id DESC");
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
      title,
      authors,
      author,
      authorName,
      affiliations,
      correspondingAuthor,
      publicationDate,
      doi,
      journal,
      volume,
      issue,
      abstract,
      keywords,
      type,
      db: selectedDb,
      proportion,
      date,
      code,
      baseHours,
      quality,
      actualHours,
      faculty,
      facultyNote,
      uni,
      dateInfo
    } = req.body;

    const pubDate = publicationDate || date || null;

    const sql = `
      INSERT INTO entries (
        id, title, authors, author, author_name, affiliations, corresponding_author,
        publication_date, doi, journal, volume, issue, abstract, keywords,
        type, db, proportion, date, code,
        base_hours, quality, actual_hours, faculty, faculty_note, uni, date_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      id,
      title || null,
      authors || null,
      author || null,
      authorName || null,
      affiliations || null,
      correspondingAuthor || null,
      pubDate,
      doi || null,
      journal || null,
      volume || null,
      issue || null,
      abstract || null,
      keywords || null,
      type || "",
      selectedDb || "",
      proportion !== undefined ? Number(proportion) : 100,
      pubDate,
      code || "",
      baseHours !== undefined ? Number(baseHours) : 0,
      quality !== undefined ? Number(quality) : 0,
      actualHours !== undefined ? Number(actualHours) : 0,
      faculty !== undefined ? Number(faculty) : 0,
      facultyNote || "",
      uni !== undefined ? Number(uni) : 0,
      dateInfo ? JSON.stringify(dateInfo) : null
    ]);

    const [rows] = await pool.query("SELECT * FROM entries ORDER BY created_at DESC, id DESC");
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error saving entry:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1.4 API ลบรายการภาระงาน
app.delete("/api/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM entries WHERE id = ?", [id]);

    const [rows] = await pool.query("SELECT * FROM entries ORDER BY created_at DESC, id DESC");
    res.json({ success: true, data: rows.map(formatEntry) });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================================
   2. Endpoints สกัดข้อมูลจาก PDF (GROBID + Gemini AI)
   ========================================== */

// 2.1 API สำหรับรับไฟล์ PDF พร้อมบันทึกขึ้น Storage และสกัด Metadata
app.post("/api/upload", upload.single("pdf_file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
  }

  const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;

  try {
    // บันทึกไฟล์ขึ้น MinIO หรือบันทึกลง Local Disk หาก MinIO ไม่ทำงาน
    if (useMinio && minioClient) {
      try {
        await minioClient.putObject(
          bucketName,
          fileName,
          req.file.buffer,
          req.file.size,
          { "Content-Type": req.file.mimetype }
        );
        console.log(`[MinIO] อัปโหลดไฟล์ ${fileName} สำเร็จ`);
      } catch (minioErr) {
        console.warn(`[MinIO Upload Warning] บันทึกลง Disk สำรองแทน: ${minioErr.message}`);
        fs.writeFileSync(path.join(UPLOADS_DIR, fileName), req.file.buffer);
      }
    } else {
      fs.writeFileSync(path.join(UPLOADS_DIR, fileName), req.file.buffer);
      console.log(`[Storage] บันทึกไฟล์ลง Local Disk ${fileName} สำเร็จ`);
    }

    // ส่งไฟล์เข้า GROBID สกัด Metadata
    console.log("[System] 1. กำลังส่งไฟล์ให้ GROBID ประมวลผล...");
    let grobidData = { article_title: null, publish_date: null, authors: [], raw_xml: null };
    try {
      grobidData = await extractMetadataFromGrobid(req.file.buffer);
    } catch (grobidError) {
      console.warn("[Warning] ดึงข้อมูลจาก GROBID ไม่สำเร็จ จะใช้การอนุมานพื้นฐาน");
    }

    // ส่งข้อมูลให้ Gemini ตรวจทานและขัดเกลา
    let finalMetadata = {
      article_title: grobidData.article_title,
      publish_date: grobidData.publish_date,
      authors: grobidData.authors,
      author_contribution: null
    };

    const xmlForLLM = grobidData.cleaned_xml || grobidData.raw_xml;
    if (xmlForLLM && process.env.GEMINI_API_KEY) {
      console.log("[System] 2. ส่งให้ Gemini AI ขัดเกลาและจำแนก Author Role...");
      try {
        const refined = await refineMetadataWithLLM(xmlForLLM, grobidData);
        finalMetadata = { ...finalMetadata, ...refined };
      } catch (llmErr) {
        console.warn("[Warning] Gemini refinement ขัดข้อง:", llmErr.message);
      }
    }

    res.json({
      message: "อัปโหลดและประมวลผลไฟล์สำเร็จ",
      file_info: {
        fileName: fileName,
        bucket: useMinio ? bucketName : "local_uploads"
      },
      metadata: finalMetadata
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "อัปโหลดหรือประมวลผลไฟล์ไม่สำเร็จ: " + error.message });
  }
});

// 2.2 API สกัดข้อมูลจาก PDF โดยตรงสำหรับ Modal (PDF -> Form Auto-fill)
app.post("/api/extract", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "ไม่พบไฟล์ PDF ที่อัปโหลด" });
  }

  try {
    console.log("[System] 1. ส่งไฟล์ PDF ให้ GROBID ประมวลผล...");
    let grobidData = { article_title: null, publish_date: null, authors: [], raw_xml: null };
    try {
      grobidData = await extractMetadataFromGrobid(req.file.buffer);
    } catch (grobidError) {
      console.warn("[Warning] ดึงข้อมูลจาก GROBID ไม่สำเร็จ:", grobidError.message);
    }

    let finalMetadata = {
      title: grobidData.article_title || "",
      publish_date: grobidData.publish_date || "",
      authors: grobidData.authors || [],
      volume: grobidData.volume || "",
      issue: grobidData.issue || "",
      abstract: grobidData.abstract || "",
      keywords: grobidData.keywords || "",
      journal: grobidData.journal || "",
      doi: grobidData.doi || ""
    };

    const xmlForLLM = grobidData.cleaned_xml || grobidData.raw_xml;
    const MAX_XML_LENGTH = 15000;
    const truncatedXml = xmlForLLM && xmlForLLM.length > MAX_XML_LENGTH
      ? xmlForLLM.substring(0, MAX_XML_LENGTH) + "\n\n[...truncated...]"
      : xmlForLLM;

    if (truncatedXml && process.env.GEMINI_API_KEY) {
      console.log("[System] 2. ส่งเนื้อหาให้ Gemini ตรวจทานและแก้ไขข้อผิดพลาด...");
      try {
        const refined = await refineMetadataWithLLM(truncatedXml, grobidData);
        finalMetadata = {
          title: refined.article_title || finalMetadata.title,
          publish_date: refined.publish_date || finalMetadata.publish_date,
          authors: refined.authors && refined.authors.length > 0 ? refined.authors : finalMetadata.authors,
          volume: refined.volume || finalMetadata.volume,
          issue: refined.issue || finalMetadata.issue,
          abstract: refined.abstract || finalMetadata.abstract,
          keywords: refined.keywords || finalMetadata.keywords,
          journal: refined.journal || finalMetadata.journal,
          doi: refined.doi || finalMetadata.doi,
          study_design: refined.study_design || "",
          participants: refined.participants || { description: "", sample_size: "" }
        };

        // STAGE 2: Author Role Identification
        if (finalMetadata.authors && finalMetadata.authors.length > 0) {
          console.log("[System] 3. วิเคราะห์บทบาทผู้แต่งด้วย AI (First/Corresponding/Co-author)...");
          try {
            const roleResult = await identifyAuthorRoles(truncatedXml, finalMetadata.authors);
            if (roleResult && roleResult.authors) {
              finalMetadata.authors = roleResult.authors;
            }
          } catch (roleErr) {
            console.warn("[Warning] ระบุบทบาทผู้แต่งล้มเหลว:", roleErr.message);
          }
        }
      } catch (err) {
        console.warn("[Warning] AI refinement error:", err.message);
      }
    }

    res.json({
      success: true,
      message: "สกัดข้อมูลสำเร็จ",
      metadata: finalMetadata
    });
  } catch (error) {
    console.error("Extract error:", error);
    res.status(500).json({ success: false, error: "สกัดข้อมูลไม่สำเร็จ: " + error.message });
  }
});

// 2.3 API บันทึกผลงานที่สกัดจาก PDF ลงฐานข้อมูล
app.post("/api/save", async (req, res) => {
  const {
    article_title,
    publish_date,
    authors,
    author_contribution,
    file_info,
    doi,
    journal,
    publication_level,
    volume,
    issue,
    pages,
    abstract,
    keywords,
    study_design,
    participants
  } = req.body;

  if (!article_title) {
    return res.status(400).json({ error: "ต้องระบุชื่อบทความ" });
  }

  try {
    const [dupCheck] = await pool.query(
      "SELECT id FROM research_papers WHERE article_title = ? LIMIT 1",
      [article_title]
    );
    if (dupCheck.length > 0) {
      return res.status(409).json({ error: "พบบทความชื่อนี้ในระบบแล้ว", existing_id: dupCheck[0].id });
    }

    const [paperResult] = await pool.query(
      `INSERT INTO research_papers 
       (article_title, publish_date, authors, author_contribution, file_name, bucket_name,
        doi, journal, publication_level, volume, issue, pages, abstract, keywords,
        study_design, participants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        article_title,
        publish_date || null,
        authors ? JSON.stringify(authors) : null,
        author_contribution || null,
        file_info?.fileName || null,
        file_info?.bucket || null,
        doi || null,
        journal || null,
        publication_level || null,
        volume || null,
        issue || null,
        pages || null,
        abstract || null,
        keywords || null,
        study_design || null,
        participants ? JSON.stringify(participants) : null
      ]
    );

    res.json({ message: "บันทึกข้อมูลสำเร็จ", record_id: paperResult.insertId });
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
    const [rows] = await pool.query(
      "SELECT id, email, full_name, name_en, name_th, department, position, scholar_id, scopus_id FROM users ORDER BY department ASC, id ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error("[Get Users Error]:", error);
    res.status(500).json({ error: "ดึงรายชื่อผู้ใช้ไม่สำเร็จ: " + error.message });
  }
});

// 3.2 อัปเดต Scholar ID และข้อมูลอาจารย์
app.put("/api/users/:userId/scholar-id", async (req, res) => {
  const { userId } = req.params;
  const { scholarId, scopusId, position } = req.body;
  try {
    const cleanedScholarId = scholarId ? scholarId.trim() : null;
    const cleanedScopusId = scopusId ? scopusId.trim() : null;

    await pool.query(
      `UPDATE users 
       SET scholar_id = ?, scopus_id = ?, position = COALESCE(?, position)
       WHERE id = ?`,
      [cleanedScholarId, cleanedScopusId, position || null, userId]
    );

    const [rows] = await pool.query(
      "SELECT id, email, full_name, name_en, name_th, department, position, scholar_id, scopus_id FROM users WHERE id = ?",
      [userId]
    );
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
    const query = `
      SELECT 
        p.id AS paper_id,
        p.title,
        p.publish_year,
        p.authors_raw,
        p.cited_by,
        p.scholar_url,
        p.source,
        p.status AS paper_status,
        pa.id AS author_entry_id,
        pa.contribution_percent,
        pa.is_first_author,
        pa.is_co_first_author,
        pa.is_corresponding,
        pa.is_co_corresponding,
        pa.status AS author_status,
        pa.confirmed_at
      FROM papers p
      JOIN paper_authors pa ON p.id = pa.paper_id
      WHERE pa.user_id = ?
      ORDER BY 
        (CASE WHEN pa.status = 'PENDING' THEN 0 ELSE 1 END),
        ISNULL(p.publish_year), p.publish_year DESC, 
        p.id DESC
    `;
    const [rows] = await pool.query(query, [userId]);
    
    // แปลงค่า Boolean TINYINT(1) ให้เป็น JavaScript boolean แท้ เพื่อป้องกัน Gotcha
    const formattedRows = rows.map(r => ({
      ...r,
      is_first_author: Boolean(r.is_first_author),
      is_co_first_author: Boolean(r.is_co_first_author),
      is_corresponding: Boolean(r.is_corresponding),
      is_co_corresponding: Boolean(r.is_co_corresponding),
      contribution_percent: Number(r.contribution_percent) || 0
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error("[Get User Papers Error]:", error);
    res.status(500).json({ error: "ดึงรายการผลงานไม่สำเร็จ: " + error.message });
  }
});

// 3.4 สั่ง Sync Google Scholar ข้อมูลอาจารย์ทั้งหมด
app.post("/api/sync-scholar", async (req, res) => {
  if (isSyncRunning) {
    return res.status(409).json({
      error: "Sync already in progress",
      message: "กำลังมีการประมวลผลดึงข้อมูล กรุณารอสักครู่"
    });
  }

  isSyncRunning = true;
  const startTime = Date.now();

  try {
    const result = await syncAllUsersScholarData();
    const duration = Date.now() - startTime;

    res.json({
      message: "Sync completed",
      durationMs: duration,
      stats: {
        createdCount: result.createdCount,
        linkedCount: result.linkedCount,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error("[Sync Scholar Error]:", error);
    res.status(500).json({ error: "Sync failed", details: error.message });
  } finally {
    isSyncRunning = false;
  }
});

// 3.5 สั่ง Sync Google Scholar ข้อมูลอาจารย์รายบุคคล
app.post("/api/sync-scholar/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await syncUserScholarData(userId);
    res.json({
      message: `Sync completed for user ${userId}`,
      data: result
    });
  } catch (error) {
    console.error(`[Sync Scholar User ${userId} Error]:`, error);
    res.status(500).json({ error: "Sync user failed", details: error.message });
  }
});

// 3.5.1 Direct Puppeteer scrape Google Scholar Profile (สำหรับผู้ที่มี scholar_id แต่ไม่มี SerpApi)
app.post("/api/scrape-scholar/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [users] = await pool.query('SELECT scholar_id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }
    const scholarId = users[0].scholar_id;
    if (!scholarId) {
      return res.status(400).json({ error: "ผู้ใช้นี้ยังไม่ได้ตั้งค่า Google Scholar ID" });
    }

    console.log(`[Scrape Scholar] เริ่มดึงข้อมูลโดยตรงจาก Google Scholar Profile: ${scholarId}`);
    const papers = await fetchDirectFromGoogleScholarProfile(scholarId);
    
    // บันทึกผลงานที่ดึงมา
    let createdCount = 0;
    let linkedCount = 0;
    for (const paper of papers) {
      try {
        const res = await savePaperAndAuthor(userId, paper);
        if (res) {
          linkedCount++;
          if (res.isNewPaper) createdCount++;
        }
      } catch (saveErr) {
        console.error(`[Save Paper Error] ${paper.title}:`, saveErr.message);
      }
    }

    res.json({
      message: `Direct scrape completed for user ${userId}`,
      stats: {
        totalFetched: papers.length,
        createdCount,
        linkedCount
      }
    });
  } catch (error) {
    console.error(`[Scrape Scholar User ${userId} Error]:`, error);
    res.status(500).json({ error: "Direct scrape failed", details: error.message });
  }
});

// 3.6 ยืนยันข้อมูลผลงานและอัปเดตสัดส่วนภาระงาน (Confirm Action)
app.put("/api/papers/:paperId/confirm", async (req, res) => {
  const { paperId } = req.params;
  const { userId, contributionPercent, isFirstAuthor, isCorresponding } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "ต้องระบุ userId" });
  }

  const percent = parseFloat(contributionPercent) || 0;
  if (percent < 0 || percent > 100) {
    return res.status(400).json({ error: "สัดส่วนภาระงานต้องอยู่ระหว่าง 0% ถึง 100%" });
  }

  try {
    await pool.query(
      `UPDATE paper_authors 
       SET contribution_percent = ?,
           is_first_author = COALESCE(?, is_first_author),
           is_corresponding = COALESCE(?, is_corresponding),
           status = 'CONFIRMED',
           confirmed_at = CURRENT_TIMESTAMP
       WHERE paper_id = ? AND user_id = ?`,
      [
        percent,
        isFirstAuthor !== undefined ? (isFirstAuthor ? 1 : 0) : null,
        isCorresponding !== undefined ? (isCorresponding ? 1 : 0) : null,
        paperId,
        userId
      ]
    );

    // ตรวจสอบภาพรวมสัดส่วน
    const [statRes] = await pool.query(
      `SELECT 
         COALESCE(SUM(contribution_percent), 0) AS total_percent,
         COUNT(*) AS total_authors,
         COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) AS confirmed_authors
       FROM paper_authors 
       WHERE paper_id = ?`,
      [paperId]
    );

    const { total_percent, total_authors, confirmed_authors } = statRes[0];
    let newPaperStatus = null;

    if (parseFloat(total_percent) >= 100 || parseInt(total_authors, 10) === parseInt(confirmed_authors, 10)) {
      newPaperStatus = "COMPLETED";
      await pool.query(
        "UPDATE papers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [newPaperStatus, paperId]
      );
    }

    res.json({
      message: "ยืนยันข้อมูลเรียบร้อยแล้ว",
      paperStatus: newPaperStatus || "PENDING_CO_AUTHOR",
      totalPercent: parseFloat(total_percent)
    });
  } catch (error) {
    console.error("[Confirm Paper Error]:", error);
    res.status(500).json({ error: "ยืนยันข้อมูลไม่สำเร็จ", details: error.message });
  }
});

// 3.7 ปฏิเสธผลงาน ("ไม่ใช่ผลงานของฉัน" -> Blacklist)
app.post("/api/papers/reject", async (req, res) => {
  const { userId, scholarTitle, paperId } = req.body;
  if (!userId || !scholarTitle) {
    return res.status(400).json({ error: "ต้องระบุ userId และ scholarTitle" });
  }

  try {
    const result = await rejectAndBlacklistPaper(userId, scholarTitle, paperId);
    res.json(result);
  } catch (error) {
    console.error("[Reject Paper Error]:", error);
    res.status(500).json({ error: "ปฏิเสธผลงานไม่สำเร็จ", details: error.message });
  }
});

// 3.8 สถานะ Cron Job
app.get("/api/cron/status", (req, res) => {
  res.json(getCronStatus());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Unified Research Workload Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📂 Uploads dir: ${UPLOADS_DIR}`);
  console.log(`=======================================================`);
  initScholarCron();
});