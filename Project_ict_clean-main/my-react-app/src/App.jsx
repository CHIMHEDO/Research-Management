// frontend/src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  BookMarked, 
  Trash2, 
  Plus, 
  Coins, 
  Clock, 
  CalendarDays, 
  CheckCircle2,
  FileText,
  Layers,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Award,
  ExternalLink,
  Users,
  Globe,
  Calendar,
  GraduationCap
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ScholarDashboard from "./components/ScholarDashboard";
import ScholarImportModal from "./components/ScholarImportModal";
import PdfUploadModal from "./components/PdfUploadModal";
import api from "./api/client";
import "./App.css";

const API_URL = "http://localhost:5000/api";

const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ (สายสนับสนุน)", db: "ไม่มีฐานข้อมูล", code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับชาติ (สายวิชาการ)", db: "ไม่มีฐานข้อมูล", code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับนานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 2", code: "2.1.6", hours: 80, quality: 0.6, faculty: 2500, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 1", code: "2.1.7", hours: 120, quality: 0.8, faculty: 2500, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.7", hours: 120, quality: 0.8, faculty: 10000, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q1", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 40000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q2", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 30000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q3", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 20000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q4", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 10000 },
  { type: "จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", db: "ไม่มีฐานข้อมูล", code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
  { type: "จดทะเบียนอนุสิทธิบัตร", db: "ไม่มีฐานข้อมูล", code: "2.1.10", hours: 150, quality: 0.4, faculty: 0, uni: 3000 },
  { type: "จดทะเบียนสิทธิบัตร", db: "ไม่มีฐานข้อมูล", code: "2.1.11", hours: 300, quality: 1, faculty: 0, uni: 5000 },
  { type: "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)", db: "ไม่มีฐานข้อมูล", code: "2.2.1", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน", db: "ไม่มีฐานข้อมูล", code: "2.2.2", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.2.3", hours: 80, quality: 0.6, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ", db: "ไม่มีฐานข้อมูล", code: "2.2.4", hours: 120, quality: 0.8, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.2.5", hours: 150, quality: 1, faculty: 0, uni: 0 },
];

const TYPE_GROUPS = [
  {
    label: "การประชุมวิชาการ",
    types: [
      "การประชุมวิชาการระดับชาติ (สายสนับสนุน)",
      "การประชุมวิชาการระดับชาติ (สายวิชาการ)",
      "การประชุมวิชาการระดับนานาชาติ"
    ]
  },
  { label: "วารสารวิชาการ", types: ["วารสารระดับชาติ", "วารสารระดับนานาชาติ"] },
  { label: "ทรัพย์สินทางปัญญา", types: ["จดทะเบียนทรัพย์สินทางปัญหาอื่นๆ", "จดทะเบียนอนุสิทธิบัตร", "จดทะเบียนสิทธิบัตร"] },
  {
    label: "งานสร้างสรรค์",
    types: [
      "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ",
    ],
  },
];
const AUTHOR_OPTIONS = ["First author", "Corresponding author", "Co author"];
const DB_OPTIONS = ["ไม่มีฐานข้อมูล", "TCI กลุ่ม 2", "TCI กลุ่ม 1", "Scopus Q1", "Scopus Q2", "Scopus Q3", "Scopus Q4"];

const emptyForm = { 
  title: "", 
  authors: "",
  affiliations: "",
  correspondingAuthor: "",
  publicationDate: "",
  doi: "",
  journal: "",
  volume: "",
  issue: "",
  abstract: "",
  keywords: "",
  authorName: "", 
  author: AUTHOR_OPTIONS[0], 
  type: TYPE_GROUPS[0].types[0], 
  db: DB_OPTIONS[0], 
  proportion: 100, 
  date: "" 
};

function AcademicWorkloadMain() {
  const { user, authLoading, token, toast, setToast } = useAuth();

  const [tab, setTab] = useState("form");
  const [form, setForm] = useState(emptyForm);
  const [entries, setEntries] = useState([]);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [scholarModalOpen, setScholarModalOpen] = useState(false);
  
  // สถานะผลการคำนวณจาก Backend
  const [previewData, setPreviewData] = useState(null);

  // Data Viewing & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ทั้งหมด");
  const [viewMode, setViewMode] = useState("card"); // "card" or "table"

  // Handler for importing paper data from Scholar Dashboard / Modal to Form
  const handleImportFromScholar = (paperData, userObj) => {
    const authorDisplayName = userObj?.name_th || userObj?.name_en || userObj?.full_name || user?.full_name || '';
    
    // Auto-detect author role if available
    let detectedAuthorRole = AUTHOR_OPTIONS[0];
    if (paperData.is_first_author) {
      detectedAuthorRole = "First author";
    } else if (paperData.is_corresponding) {
      detectedAuthorRole = "Corresponding author";
    } else if (paperData.is_co_first_author) {
      detectedAuthorRole = "Co author";
    }

    const mappedForm = {
      ...form,
      title: paperData.title || '',
      authors: paperData.authors_raw || '',
      journal: paperData.journal || '',
      doi: paperData.doi || '',
      publicationDate: paperData.publish_year ? `${paperData.publish_year}-01-01` : (paperData.publicationDate || ''),
      volume: paperData.volume || '',
      issue: paperData.issue || '',
      abstract: paperData.abstract || '',
      keywords: paperData.keywords || '',
      authorName: authorDisplayName,
      author: detectedAuthorRole,
      correspondingAuthor: paperData.corresponding_author || '',
      proportion: paperData.contribution_percent || 100,
    };
    setForm(mappedForm);
    setTab('form');
    if (setToast) {
      setToast(`นำเข้าผลงาน "${(paperData.title || '').slice(0, 35)}..." จาก Google Scholar เรียบร้อย`);
    }
  };

  // Handler for PDF extraction completion
  const handlePdfExtractComplete = (metadata) => {
    const mappedForm = {
      ...form,
      title: metadata.title || metadata.article_title || '',
      authors: (metadata.authors || []).map(a => a.name).join(', '),
      journal: metadata.journal || '',
      doi: metadata.doi || '',
      publicationDate: metadata.publish_date || metadata.publicationDate || '',
      volume: metadata.volume || '',
      issue: metadata.issue || '',
      abstract: metadata.abstract || '',
      keywords: metadata.keywords || '',
      authorName: user?.full_name || '',
      correspondingAuthor: '', // Will be filled from authors if corresponding found
      proportion: 100,
    };
    // Try to find corresponding author
    const corresponding = (metadata.authors || []).find(a => a.is_corresponding);
    if (corresponding) {
      mappedForm.correspondingAuthor = corresponding.name;
    }
    setForm(mappedForm);
    setTab('form');
  };

  // 1. ดึงข้อมูลรายการที่เคยบันทึกไว้เมื่อโหลดและล็อกอินแล้ว
  useEffect(() => {
    if (!user) return;
    api.get('/entries')
      .then(res => { if (res.data.success) setEntries(res.data.data); })
      .catch(err => console.error("Entries DB Error:", err.response?.data || err.message));
  }, [user, token]);

  // 2. ขอให้ Backend คำนวณผลลัพธ์แบบ Live Preview เมื่อมีการเปลี่ยนค่าในฟอร์ม
  useEffect(() => {
    if (!user) return;
    const fetchCalculation = async () => {
      try {
        const res = await fetch(`${API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        setPreviewData(data.success ? data.data : null);
      } catch (err) {
        setPreviewData(null);
      }
    };
    fetchCalculation();
  }, [form, user]);

  // กำหนดชื่ออาจารย์อัตโนมัติตาม user ที่เข้าสู่ระบบ
  useEffect(() => {
    if (user && user.full_name && !form.authorName) {
      setForm(prev => ({ ...prev, authorName: user.full_name }));
    }
  }, [user]);

  // ฟังก์ชันบันทึกข้อมูลไปยัง Backend
  const handleSave = async () => {
    if (!previewData) return;
    
    const payload = {
      ...form,
      code: previewData.code,
      baseHours: previewData.hours,
      quality: previewData.quality,
      actualHours: previewData.actualHours,
      faculty: previewData.faculty,
      facultyNote: previewData.facultyNote,
      uni: previewData.uni,
      dateInfo: previewData.dateInfo
    };

    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setToast("บันทึกผลงานเรียบร้อยแล้ว");
        setForm({ ...emptyForm, authorName: user?.full_name || "" });
        setTab("dashboard");
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // ฟังก์ชันลบข้อมูล
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/entries/${id}`, { 
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        setToast("ลบรายการเรียบร้อยแล้ว");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const totals = useMemo(() => {
    let hours = 0, faculty = 0, uni = 0, count = entries.length;
    entries.forEach(e => {
      hours += e.actualHours || 0;
      faculty += e.faculty || 0;
      uni += e.uni || 0;
    });
    return { hours: Math.round(hours * 100) / 100, faculty, uni, count };
  }, [entries]);

  // Filtered entries according to search keyword & category tag
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        (item.title && item.title.toLowerCase().includes(searchLower)) ||
        (item.authors && item.authors.toLowerCase().includes(searchLower)) ||
        (item.journal && item.journal.toLowerCase().includes(searchLower)) ||
        (item.doi && item.doi.toLowerCase().includes(searchLower)) ||
        (item.authorName && item.authorName.toLowerCase().includes(searchLower)) ||
        (item.type && item.type.toLowerCase().includes(searchLower));

      const matchCategory = selectedCategoryFilter === "ทั้งหมด" || 
        (item.type && item.type.includes(selectedCategoryFilter.replace("การประชุมวิชาการ", "การประชุม").replace("วารสารวิชาการ", "วารสาร")));

      return matchSearch && matchCategory;
    });
  }, [entries, searchTerm, selectedCategoryFilter]);

  // Helper for Database Quality Badge
  const renderDbBadge = (dbName) => {
    if (!dbName || dbName === "ไม่มีฐานข้อมูล") {
      return <span className="badge-db badge-db-none">ไม่มีฐานข้อมูล</span>;
    }
    if (dbName.startsWith("Scopus")) {
      return <span className="badge-db badge-db-scopus"><Sparkles size={11} style={{ marginRight: 4 }} /> {dbName}</span>;
    }
    if (dbName.startsWith("TCI")) {
      return <span className="badge-db badge-db-tci"><Award size={11} style={{ marginRight: 4 }} /> {dbName}</span>;
    }
    return <span className="badge-db badge-db-none">{dbName}</span>;
  };

  // Find active main category
  const activeMainCategory = useMemo(() => {
    for (const g of TYPE_GROUPS) {
      if (g.types.includes(form.type)) return g.label;
    }
    return TYPE_GROUPS[0].label;
  }, [form.type]);

  // แสดงหน้าจอโหลดขณะตรวจสอบสถานะการเข้าสู่ระบบ
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner"></div>
        <p>กำลังตรวจสอบข้อมูลผู้ใช้งาน...</p>
      </div>
    );
  }

  // หากยังไม่ได้เข้าสู่ระบบ แสดงหน้า Login
// พักไว้จนกว่าจะแก้ไมโครซอฟท์ได้
  if (!user) {
    return <LoginPage />;
  }   


  return (
    <div className="app-layout">
      {/* Left Sidebar Navigation */}
      <Sidebar tab={tab} setTab={setTab} entriesCount={entries.length} />

      {/* Main Content Area */}
      <div className="app-content-wrapper">
        <Header tab={tab} entriesCount={entries.length} />

        <main className="app-main">
          {tab === "form" && (
            <div className="form-grid-layout">
              {/* Form Card */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title-group">
                    <FileText size={20} color="#6C2BD9" />
                    <h2 className="card-title">ข้อมูลผลงานและรายละเอียดบทความ</h2>
                  </div>
                </div>

                {/* Quick Auto-Import Buttons: Google Scholar & PDF AI */}
                <div className="form-group">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setScholarModalOpen(true)}
                      className="btn-scholar-extract"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "12px 14px",
                        background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        boxShadow: "0 3px 10px rgba(109, 40, 217, 0.25)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <GraduationCap size={18} />
                      <span>🎓 ดึงข้อมูลจาก Google Scholar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfModalOpen(true)}
                      className="btn-ai-extract"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "12px 14px",
                        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Sparkles size={18} />
                      <span>✨ สกัดข้อมูลจาก PDF ด้วย AI</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Category Selector Tiles */}
                <div className="form-group">
                  <label className="form-label">เลือกกลุ่มประเภทผลงานวิชาการ</label>
                  <div className="category-tiles-grid">
                    {TYPE_GROUPS.map(g => (
                      <div
                        key={g.label}
                        className={`category-tile ${activeMainCategory === g.label ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, type: g.types[0] })}
                      >
                        <span className="category-tile-title">{g.label}</span>
                        <span style={{ fontSize: 11, color: "#8b94a5" }}>{g.types.length} ประเภทย่อย</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-type Selection */}
                <div className="form-group">
                  <label className="form-label">ประเภทผลงานย่อย</label>
                  <select
                    className="form-control"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPE_GROUPS.find(g => g.label === activeMainCategory)?.types.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* ชื่องานวิจัย / ชื่อผลงาน (Title) */}
              <div className="form-group">
                <label className="form-label">
                  Title (ชื่อเรื่อง / ชื่อบทความ) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="กรอกชื่อบทความวิจัย / ชื่อผลงานวิชาการ"
                  value={form.title || ""}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              {/* ผู้แต่ง / ผู้เขียน (Authors) */}
              <div className="form-group">
                <label className="form-label">
                  Authors (ผู้แต่ง / ผู้เขียน) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น Somchai J., Somying R., Kittisak P."
                  value={form.authors || ""}
                  onChange={e => setForm({ ...form, authors: e.target.value })}
                  required
                />
              </div>

              {/* สถาบัน / หน่วยงานต้นสังกัดของผู้แต่ง (Affiliations) */}
              <div className="form-group">
                <label className="form-label">
                  Affiliations (สถาบัน / หน่วยงานต้นสังกัดของผู้แต่ง) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น Faculty of ICT, Mahidol University"
                  value={form.affiliations || ""}
                  onChange={e => setForm({ ...form, affiliations: e.target.value })}
                  required
                />
              </div>

              {/* ผู้แต่งที่ทำหน้าที่ติดต่อ / ผู้รับผิดชอบบทความ (Corresponding Author) */}
              <div className="form-group">
                <label className="form-label">
                  Corresponding Author (ผู้แต่งที่ทำหน้าที่ติดต่อ / ผู้รับผิดชอบบทความ) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น Somchai J. (somchai.j@ict.university.ac.th)"
                  value={form.correspondingAuthor || ""}
                  onChange={e => setForm({ ...form, correspondingAuthor: e.target.value })}
                  required
                />
              </div>

              {/* ชื่อวารสาร (Journal) */}
              <div className="form-group">
                <label className="form-label">
                  Journal (ชื่อวารสาร / แหล่งตีพิมพ์) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="กรอกชื่อวารสารทางวิชาการ หรือการประชุมวิชาการ"
                  value={form.journal || ""}
                  onChange={e => setForm({ ...form, journal: e.target.value })}
                  required
                />
              </div>

              {/* DOI รหัสประจำตัวดิจิทัลของบทความ */}
              <div className="form-group">
                <label className="form-label">
                  DOI (รหัส DOI ประจำตัวดิจิทัลของบทความ) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น 10.1109/ACCESS.2023.1234567"
                  value={form.doi || ""}
                  onChange={e => setForm({ ...form, doi: e.target.value })}
                  required
                />
              </div>

              {/* วันที่ตีพิมพ์ (Publication Date) */}
              <div className="form-group">
                <label className="form-label">
                  Publication Date (วันที่ตีพิมพ์ / เผยแพร่) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={form.publicationDate || form.date || ""}
                  onChange={e => setForm({ ...form, publicationDate: e.target.value, date: e.target.value })}
                  required
                />
              </div>

              {/* Volume & Issue */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Volume (ปีที่ / เล่มที่พิมพ์)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น 12"
                    value={form.volume || ""}
                    onChange={e => setForm({ ...form, volume: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Issue (ฉบับที่พิมพ์)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น 4"
                    value={form.issue || ""}
                    onChange={e => setForm({ ...form, issue: e.target.value })}
                  />
                </div>
              </div>

              {/* Abstract (บทคัดย่อ) */}
              <div className="form-group">
                <label className="form-label">Abstract (บทคัดย่อ)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="สรุปเนื้อหาและบทคัดย่อของผลงานวิจัย..."
                  value={form.abstract || ""}
                  onChange={e => setForm({ ...form, abstract: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Keywords (คำสำคัญ) */}
              <div className="form-group">
                <label className="form-label">Keywords (คำสำคัญ)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น Machine Learning, NLP, Data Mining (คั่นด้วยจุลภาค)"
                  value={form.keywords || ""}
                  onChange={e => setForm({ ...form, keywords: e.target.value })}
                />
              </div>

              <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "20px 0" }} />

              {/* ชื่ออาจารย์ / ผู้จัดทำ (ผู้ยื่นขอคำนวณ) */}
              <div className="form-group">
                <label className="form-label">ชื่ออาจารย์ / ผู้ยื่นขอประเมินภาระงาน</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="กรอกชื่อ-นามสกุลอาจารย์ หรือผู้จัดทำผลงาน"
                  value={form.authorName || ""}
                  onChange={e => setForm({ ...form, authorName: e.target.value })}
                />
              </div>

              {/* ตำแหน่งผู้ประพันธ์ */}
              <div className="form-group">
                <label className="form-label">ตำแหน่งผู้ประพันธ์ (ของผู้ยื่น)</label>
                <select
                  className="form-control"
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                >
                  {AUTHOR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* ประเภทผลงาน */}
              <div className="form-group">
                <label className="form-label">ประเภทผลงานวิชาการ</label>
                <select
                  className="form-control"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {TYPE_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* ฐานข้อมูล */}
              <div className="form-group">
                <label className="form-label">ฐานข้อมูล / การรับรอง</label>
                <select
                  className="form-control"
                  value={form.db}
                  onChange={e => setForm({ ...form, db: e.target.value })}
                >
                  {DB_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* สัดส่วน (0-100%) */}
              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label" style={{ margin: 0 }}>สัดส่วนการมีส่วนร่วม (%)</label>
                  <span className="badge-value">
                    {form.proportion !== "" ? `${form.proportion}%` : "0%"}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.proportion}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "") {
                      setForm({ ...form, proportion: "" });
                    } else {
                      const num = Number(val);
                      if (num >= 0 && num <= 100) {
                        setForm({ ...form, proportion: num });
                      }
                    }
                  }}
                  placeholder="กรอกตัวเลข 0 - 100"
                  className="form-control"
                />
                {/* Fast Preset Buttons */}
                <div className="preset-buttons">
                  {[100, 50, 33.3, 25].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm({ ...form, proportion: pct })}
                      className={`preset-btn ${form.proportion === pct ? "active" : ""}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Royal Purple Hero Calculation Card */}
            <div className="preview-card-purple">
              <div className="purple-card-header">
                <div className="purple-card-title">
                  <Layers size={18} />
                  <span>สรุปผลคำนวณภาระงานที่คุณจะได้รับ</span>
                </div>
                <span className="purple-live-badge">Live Preview</span>
              </div>

              {!previewData ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "#e9d5ff" }}>
                  <Clock size={32} style={{ margin: "0 auto 10px", opacity: 0.8 }} />
                  <p style={{ fontSize: 14 }}>กำลังประมวลผลคะแนน...</p>
                </div>
              ) : (
                <>
                  {/* Big Hero Number Box */}
                  <div className="purple-hero-stat">
                    <div className="hero-stat-label">ชั่วโมงภาระงานที่ได้รับจริง</div>
                    <div className="hero-stat-number">
                      {previewData.actualHours}
                      <span className="hero-stat-unit">ชม.</span>
                    </div>
                    <div className="hero-stat-formula">
                      = {previewData.hours} ชม.ฐาน × {form.proportion || 0}% สัดส่วน
                    </div>
                  </div>

                  {/* Criteria 3 Metrics Block */}
                  <div className="purple-metrics-grid">
                    <div className="purple-metric-item">
                      <div className="purple-metric-label">รหัสเกณฑ์</div>
                      <div className="purple-metric-val">{previewData.code}</div>
                    </div>
                    <div className="purple-metric-item">
                      <div className="purple-metric-label">ชั่วโมงฐาน</div>
                      <div className="purple-metric-val">{previewData.hours} ชม.</div>
                    </div>
                    <div className="purple-metric-item">
                      <div className="purple-metric-label">ค่าน้ำหนัก (Q)</div>
                      <div className="purple-metric-val">{previewData.quality}</div>
                    </div>
                  </div>

                  {/* Finance & Budget Support Box */}
                  <div className="purple-finance-box">
                    <div className="purple-finance-row">
                      <span className="purple-finance-name">
                        <Coins size={14} color="#fde047" /> เงินสนับสนุนคณะ
                      </span>
                      <span className="purple-finance-amount">
                        {previewData.faculty > 0 ? `${previewData.faculty.toLocaleString()} ฿` : "-"}
                      </span>
                    </div>
                    {previewData.facultyNote && (
                      <div style={{ fontSize: 11, color: "#fef08a", marginTop: -4 }}>
                        * {previewData.facultyNote}
                      </div>
                    )}
                    <div className="purple-finance-row">
                      <span className="purple-finance-name">
                        <Coins size={14} color="#86efac" /> เงินสนับสนุนมหาวิทยาลัย
                      </span>
                      <span className="purple-finance-amount">
                        {previewData.uni > 0 ? `${previewData.uni.toLocaleString()} ฿` : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Fiscal & Academic Calendar Tags */}
                  {previewData.dateInfo && (
                    <div className="purple-calendar-tags">
                      <span className="purple-calendar-chip">
                        <CalendarDays size={11} style={{ marginRight: 4, display: "inline" }} />
                        {previewData.dateInfo.beLabel}
                      </span>
                      <span className="purple-calendar-chip">{previewData.dateInfo.acadLabel}</span>
                      <span className="purple-calendar-chip">{previewData.dateInfo.fiscalLabel}</span>
                    </div>
                  )}

                  {/* Big Action Button */}
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn-purple-save"
                  >
                    <Plus size={18} />
                    บันทึกผลงานลงระบบ
                  </button>
                </>
              )}
            </div>
          </div>
        )}


        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div className="dashboard-container">
            {/* Top Banner: Subtitle + Button */}
            <div className="dashboard-top-banner">
              <h2 className="dashboard-intro-title">
                นี่คือภาพรวมผลงานวิชาการของคุณในภาคเรียนนี้
              </h2>
              <button
                type="button"
                onClick={() => setTab("form")}
                className="btn-ams-primary-add"
              >
                <Plus size={16} />
                <span>เพิ่มผลงานใหม่</span>
              </button>
            </div>

            {/* Top Row: [Score Card + 3 KPI Cards in Single Row] */}
            <div className="dashboard-top-grid">
              {/* Workload Progress Donut Chart */}
              <div className="ams-score-card">
                <div className="score-card-title">คะแนนภาระงาน</div>

                <div className="donut-chart-wrapper">
                  {(() => {
                    const targetHours = 200;
                    const pct = Math.min(100, Math.round(((totals.hours || 0) / targetHours) * 100)) || 85;
                    const strokeDash = `${pct} ${100 - pct}`;
                    return (
                      <>
                        <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#ede9fe"
                            strokeWidth="3.8"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="3.8"
                            strokeDasharray={strokeDash}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="donut-center-content">
                          <div className="donut-pct-text">{pct}%</div>
                          <div className="donut-sub-text">สำเร็จแล้ว</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="workload-target-progress-box">
                  <div className="workload-progress-labels">
                    <span>ชั่วโมงที่ทำได้จริง</span>
                    <span><b>{totals.hours || 0}</b> ชม.</span>
                  </div>
                </div>
              </div>

              {/* KPI 1: ผลงานทั้งหมด */}
              <div className="ams-kpi-card kpi-border-purple">
                <div className="kpi-card-top">
                  <div className="kpi-icon-square kpi-icon-purple">
                    <BookMarked size={20} />
                  </div>
                  <span className="kpi-term-pill">ภาคเรียน 1/2567</span>
                </div>
                <div>
                  <div className="kpi-title-label">ผลงานทั้งหมด</div>
                  <div className="kpi-main-number">
                    {totals.count} <span className="kpi-unit-label">ชิ้น</span>
                  </div>
                </div>
              </div>


              {/* KPI 3: รอบการจ่ายเงินถัดไป */}
              <div className="ams-kpi-card kpi-border-green">
                <div className="kpi-card-top">
                  <div className="kpi-icon-square kpi-icon-green">
                    <Coins size={20} />
                  </div>
                  <span className="kpi-term-pill" style={{ color: "#059669", background: "#ecfdf5" }}>งวดถัดไป</span>
                </div>
                <div>
                  <div className="kpi-title-label">รอบการจ่ายเงินถัดไป</div>
                  <div className="kpi-date-value">25 พ.ย.</div>
                  <div className="kpi-status-subtext">
                    <CheckCircle2 size={13} />
                    <span>เอกสารครบถ้วน ({(totals.faculty + totals.uni).toLocaleString()} ฿)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Toolbar: Search + View Mode Switchers */}
            <div className="dashboard-toolbar">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="ค้นหาชื่อผลงาน, ผู้แต่ง, วารสาร, DOI หรือชื่ออาจารย์..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="view-mode-switchers">
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "card" ? "active" : ""}`}
                  onClick={() => setViewMode("card")}
                >
                  <LayoutGrid size={15} />
                  แบบการ์ด (Cards)
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  <List size={15} />
                  แบบตาราง (Table)
                </button>
              </div>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="category-filter-pills">
              {["ทั้งหมด", "วารสารวิชาการ", "การประชุมวิชาการ", "ทรัพย์สินทางปัญญา", "งานสร้างสรรค์"].map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill ${selectedCategoryFilter === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Entries Content */}
            {filteredEntries.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                <BookMarked size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 16, color: "#1e1b4b", marginBottom: 6 }}>
                  {searchTerm ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลผลงานที่ถูกบันทึก"}
                </h3>
                <p style={{ fontSize: 13, color: "#64748b" }}>
                  {searchTerm ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่" : "สามารถเริ่มบันทึกผลงานได้ที่เมนู 'คำนวณและประเมินภาระงาน'"}
                </p>
              </div>
            ) : viewMode === "card" ? (
              /* Large Square Cards Grid View Mode */
              <div className="entries-grid-cards">
                {filteredEntries.map(e => (
                  <div key={e.id} className="entry-card-square">
                    <div>
                      {/* Top Badges & Delete Action */}
                      <div className="card-top-badges">
                        <div className="card-badges-left">
                          <span className="entry-code-badge">{e.code || "เกณฑ์"}</span>
                          {renderDbBadge(e.db)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(e.id)}
                          title="ลบรายการผลงาน"
                          className="card-btn-delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Publication Title */}
                      <h3 className="card-publication-title" title={e.title || e.type}>
                        {e.title || e.type}
                      </h3>

                      {/* Meta Information List */}
                      <div className="card-meta-list">
                        {e.authors && (
                          <div className="card-meta-item">
                            <Users size={15} className="card-meta-icon" />
                            <span className="card-meta-text"><strong>ผู้แต่ง:</strong> {e.authors}</span>
                          </div>
                        )}

                        {e.journal && (
                          <div className="card-meta-item">
                            <BookMarked size={15} className="card-meta-icon" />
                            <span className="card-meta-text">
                              <strong>วารสาร/แหล่งตีพิมพ์:</strong> <span style={{ color: "#6d28d9", fontWeight: 600 }}>{e.journal}</span>
                              {e.volume && ` (Vol.${e.volume})`}
                              {e.issue && ` (No.${e.issue})`}
                            </span>
                          </div>
                        )}

                        {e.doi && (
                          <div className="card-meta-item">
                            <Globe size={15} className="card-meta-icon" />
                            <span className="card-meta-text">
                              <strong>DOI:</strong>{" "}
                              <a
                                href={e.doi.startsWith("http") ? e.doi : `https://doi.org/${e.doi}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#6d28d9", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                              >
                                {e.doi} <ExternalLink size={11} />
                              </a>
                            </span>
                          </div>
                        )}

                        {(e.publicationDate || e.date) && (
                          <div className="card-meta-item">
                            <Calendar size={15} className="card-meta-icon" />
                            <span className="card-meta-text">
                              <strong>วันที่เผยแพร่:</strong> {e.publicationDate || e.date}
                            </span>
                          </div>
                        )}

                        {e.abstract && (
                          <details className="card-abstract-details">
                            <summary>ดูบทคัดย่อ (Abstract)</summary>
                            <p>{e.abstract}</p>
                          </details>
                        )}
                      </div>
                    </div>

                    {/* Bottom Highlighted Metric KPI Box */}
                    <div className="card-bottom-metrics">
                      <div className="card-stat-block">
                        <span className="card-stat-lbl">ผู้ยื่น / สัดส่วน</span>
                        <span className="card-stat-val" style={{ fontSize: 13 }} title={e.authorName || e.author}>
                          {e.proportion}% ({e.author || "Author"})
                        </span>
                      </div>

                      <div className="card-stat-block">
                        <span className="card-stat-lbl">ภาระงานจริง</span>
                        <span className="card-stat-val">
                          {e.actualHours} <span style={{ fontSize: 11, fontWeight: 500 }}>ชม.</span>
                        </span>
                      </div>

                      <div className="card-stat-block">
                        <span className="card-stat-lbl">เงินสนับสนุน</span>
                        <span className="card-stat-val green">
                          {((e.faculty || 0) + (e.uni || 0)) > 0 ? `${((e.faculty || 0) + (e.uni || 0)).toLocaleString()} ฿` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Table View Mode */
              <div className="table-view-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่องานวิจัย / ผลงาน</th>
                      <th>ฐานข้อมูล</th>
                      <th>ผู้ยื่นขอประเมิน</th>
                      <th>สัดส่วน</th>
                      <th>ชั่วโมงจริง</th>
                      <th>งบสนับสนุน</th>
                      <th style={{ textAlign: "center" }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map(e => (
                      <tr key={e.id}>
                        <td>
                          <span className="entry-code-badge">{e.code || "เกณฑ์"}</span>
                        </td>
                        <td className="table-title-cell">
                          <div className="table-title-text">{e.title || e.type}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{e.journal || e.type}</div>
                        </td>
                        <td>{renderDbBadge(e.db)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{e.authorName || "-"}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{e.author}</div>
                        </td>
                        <td><b>{e.proportion}%</b></td>
                        <td>
                          <span style={{ fontWeight: 700, color: "#6C2BD9" }}>{e.actualHours} ชม.</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#059669" }}>
                            {((e.faculty || 0) + (e.uni || 0)) > 0 ? `${((e.faculty || 0) + (e.uni || 0)).toLocaleString()} ฿` : "-"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            className="btn-delete-card"
                            style={{ margin: "0 auto" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Scholar Dashboard Tab */}
        {tab === "scholar" && (
          <ScholarDashboard onImportToForm={handleImportFromScholar} />
        )}

        {/* Scholar Import Modal */}
        <ScholarImportModal
          isOpen={scholarModalOpen}
          onClose={() => setScholarModalOpen(false)}
          onSelectPaper={handleImportFromScholar}
        />

        {/* PDF Upload Modal */}
        <PdfUploadModal 
          isOpen={pdfModalOpen} 
          onClose={() => setPdfModalOpen(false)}
          onExtractComplete={handlePdfExtractComplete}
        />
      </main>
    </div>

    {/* Floating Toast Notification */}
    {toast && (
      <div className="toast-pill">
        <CheckCircle2 size={16} color="#4ade80" />
        {toast}
      </div>
    )}
  </div>
);
}

export default function App() {
  return (
    <AuthProvider>
      <AcademicWorkloadMain />
    </AuthProvider>
  );
}