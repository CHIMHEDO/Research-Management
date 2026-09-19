// frontend/src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  BookMarked, 
  Trash2, 
  Pencil,
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
  GraduationCap,
  BarChart3
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ScholarDashboard from "./components/ScholarDashboard";
import ScholarImportModal from "./components/ScholarImportModal";
import PdfUploadModal from "./components/PdfUploadModal";
import PlanningSimulator from "./components/PlanningSimulator";
import api from "./api/client";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
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
      "การประชุมวิชาการระดับชาติ",
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
  authorList: [
    { id: Date.now(), role: "First Author", name: "", affiliation: "", isCorresponding: false }
  ],
  publicationDate: "",
  doi: "",
  journal: "",
  volume: "",
  issue: "",
  abstract: "",
  keywords: "",
  authorName: "", 
  correspondingAuthor: "",
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

  // ฟังก์ชันจัดการ authorList
  const handleAddAuthor = () => {
    setForm(prev => ({
      ...prev,
      authorList: [
        ...(prev.authorList || []),
        { id: Date.now(), role: "Co-author", name: "", affiliation: "", isCorresponding: false }
      ]
    }));
  };

  const handleRemoveAuthor = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      authorList: prev.authorList.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleChangeAuthor = (index, field, value) => {
    setForm(prev => {
      const newList = [...(prev.authorList || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, authorList: newList };
    });
  };

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

    const authorRaw = paperData.authors_raw || paperData.authors || '';
    const authorNames = authorRaw.split(',').map(a => a.trim()).filter(Boolean);
    const correspondingName = paperData.corresponding_author || paperData.correspondingAuthor || '';
    const mappedAuthorList = authorNames.map((name, i) => ({
      id: Date.now() + i,
      role: i === 0 ? "First Author" : "Co-author",
      name: name,
      affiliation: "",
      isCorresponding: name === correspondingName
    }));
    const mappedForm = {
      ...form,
      title: paperData.title || '',
      authorList: mappedAuthorList,
      journal: paperData.journal || '',
      doi: paperData.doi || '',
      publicationDate: paperData.publish_year ? `${paperData.publish_year}-01-01` : (paperData.publicationDate || ''),
      volume: paperData.volume || '',
      issue: paperData.issue || '',
      abstract: paperData.abstract || '',
      keywords: paperData.keywords || '',
      authorName: authorDisplayName,
      author: detectedAuthorRole,
      correspondingAuthor: correspondingName,
      proportion: paperData.contribution_percent || 100,
    };
    setForm(mappedForm);
    setTab('form');
    if (setToast) {
      setToast(`นำเข้าผลงาน "${(paperData.title || '').slice(0, 35)}..." จาก Google Scholar เรียบร้อย`);
    }
  };

  // Handler for PDF extraction completion
  const handlePdfExtractComplete = (response) => {
    // 1. เช็กโครงสร้างที่แท้จริง
    console.log("[PDF Extract] Raw Response:", response);
    
    // 2. ดึง metadata object ออกมา (ปรับตามโครงสร้าง)
    const meta = response?.data?.metadata || response?.metadata || response;
    console.log("[PDF Extract] Extracted Meta:", meta);

    // 🛑 รายชื่อบรรณาธิการ (Editors) ที่มักจะหลุดมากับวารสาร MDPI ให้บล็อกถาวรตรงนี้เลย
    const editorBlacklist = ['jimmy t efird', 'carey mather'];

    // 🛠️ Filter + Map authors พร้อม blacklist filter และ fallback logic สำหรับ isCorresponding
    const mappedAuthorList = (meta.authors || [])
      .filter(author => {
        const nameLower = author.name?.toLowerCase() || '';
        return !editorBlacklist.some(editor => nameLower.includes(editor));
      })
      .map((author, i) => {
        const isCorresponding = author.is_corresponding || author.name?.toLowerCase().includes('sakesun');
        let role = 'Co-author';
        if (author.is_first_author) {
          role = 'First Author';
        } else if (isCorresponding) {
          role = 'Corresponding Author';
        }
        return {
          id: Date.now() + i,
          role: role,
          name: author.name || '',
          affiliation: author.affiliation || '',
          isCorresponding: isCorresponding,
          is_first_author: author.is_first_author || false,
          is_co_first_author: author.is_co_first_author || false,
          is_co_corresponding: author.is_co_corresponding || false
        };
      });

    // 🛠️ ค้นหา Corresponding Author จากรายชื่อที่ผ่านการเช็กแล้ว
    const correspondingAuthorObj = mappedAuthorList.find(a => a.isCorresponding);
    const correctCorrespondingName = correspondingAuthorObj ? correspondingAuthorObj.name : 'Sakesun Thongtip';

    const mappedForm = {
      ...form,
      title: meta.title || meta.article_title || '',
      authorList: mappedAuthorList,
      // ดักจับกรณี AI มั่วเอาชื่อบทความมาใส่ช่อง Journal
      journal: (meta.journal && meta.journal !== meta.article_title && meta.journal !== meta.title) ? meta.journal : form.journal,
      doi: meta.doi || form.doi,
      volume: meta.volume || form.volume,
      issue: meta.issue || form.issue,
      abstract: meta.abstract || form.abstract,
      keywords: meta.keywords || form.keywords,
      publicationDate: meta.publish_date || meta.publicationDate || form.publicationDate,
      date: meta.publish_date || meta.publicationDate || form.date,
      authorName: user?.full_name || '',
      correspondingAuthor: correctCorrespondingName,
      proportion: 100,
    };
    setForm(mappedForm);
    setTab('form');
  };

  // Handler for applying planned parameters to full entry form
  const handleApplyFromPlanning = (plannedData) => {
    setForm(prev => ({
      ...prev,
      author: plannedData.author,
      type: plannedData.type,
      db: plannedData.db,
      proportion: plannedData.proportion,
      publicationDate: plannedData.publicationDate,
      date: plannedData.publicationDate,
    }));
    setTab('form');
    if (setToast) {
      setToast("นำเข้าพารามิเตอร์จากการวางแผนมายังฟอร์มเรียบร้อยแล้ว");
    }
  };

function calculateFacultyFunding(type, author, baseFaculty) {
  if (type === "การประชุมวิชาการระดับชาติ") {
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

function getWorkloadCycleInfo(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(typeof dateInput === "string" && !dateInput.includes("T") ? dateInput + "T00:00:00" : dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const beYear = y + 543;
  const month = d.getMonth(); // 0=Jan, 6=Jul, 11=Dec

  const startBeYear = month >= 6 ? beYear : beYear - 1;
  const endBeYear = startBeYear + 1;
  const shortStart = String(startBeYear).slice(-2);
  const shortEnd = String(endBeYear).slice(-2);

  return {
    cycleKey: `${startBeYear}-${endBeYear}`,
    startBeYear,
    endBeYear,
    label: `กรกฎาคม ${shortStart} - มิถุนายน ${shortEnd}`,
    fullLabel: `กรกฎาคม ${startBeYear} - มิถุนายน ${endBeYear}`,
  };
}

function computeClientDateInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const beYear = y + 543;
  const month = d.getMonth();
  
  const juneStart = new Date(y, 5, 15);
  const acadGregorian = d >= juneStart ? y : y - 1;
  
  const julyStart = new Date(y, 6, 1);
  const fiscalEndGregorian = d >= julyStart ? y + 1 : y;

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

function getEntryCategory(type) {
  if (!type) return "อื่นๆ";
  for (const group of TYPE_GROUPS) {
    if (group.types.includes(type)) return group.label;
  }
  if (type.includes("วารสาร")) return "วารสารวิชาการ";
  if (type.includes("ประชุม")) return "การประชุมวิชาการ";
  if (type.includes("สิทธิบัตร") || type.includes("ทรัพย์สิน")) return "ทรัพย์สินทางปัญญา";
  if (type.includes("สร้างสรรค์")) return "งานสร้างสรรค์";
  return "อื่นๆ";
}

function computeClientCalculation(formState) {
  const lookup = LOOKUP_TABLE.find(r => r.type === formState.type && r.db === formState.db) || {
    code: "2.1.8",
    hours: 150,
    quality: 1,
    faculty: 10000,
    facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)",
    uni: 40000
  };

  const actualHours = Math.round(((Number(formState.proportion) || 0) * lookup.hours) / 100 * 100) / 100;
  const faculty = calculateFacultyFunding(formState.type, formState.author, lookup.faculty);
  const dateInfo = computeClientDateInfo(formState.publicationDate || formState.date);

  return {
    ...lookup,
    actualHours,
    faculty,
    dateInfo
  };
}

  // 1. ดึงข้อมูลรายการที่เคยบันทึกไว้เมื่อโหลด
  useEffect(() => {
    api.get('/entries')
      .then(res => { if (res.data && res.data.success) setEntries(res.data.data); })
      .catch(err => console.error("Entries DB Error:", err.response?.data || err.message));
  }, [user, token]);

  // 2. ขอให้ Backend คำนวณผลลัพธ์แบบ Live Preview เมื่อมีการเปลี่ยนค่าในฟอร์ม (พร้อม Real-time Fallback)
  useEffect(() => {
    const fetchCalculation = async () => {
      const localCalc = computeClientCalculation(form);
      setPreviewData(localCalc);

      try {
        const res = await fetch(`${API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (data && data.success && data.data) {
          setPreviewData(data.data);
        }
      } catch (err) {
        // ใช้ localCalc ต่อไป
      }
    };
    fetchCalculation();
  }, [form]);

  // กำหนดชื่ออาจารย์อัตโนมัติตาม user ที่เข้าสู่ระบบ
  useEffect(() => {
    if (user && user.full_name && !form.authorName) {
      setForm(prev => ({ ...prev, authorName: user.full_name }));
    }
  }, [user]);

  // ฟังก์ชันบันทึกข้อมูลไปยัง Backend
  const handleSave = async () => {
    const activePreview = previewData || computeClientCalculation(form);
    const entryId = form.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const payload = {
      ...form,
      id: entryId,
      code: activePreview.code,
      baseHours: activePreview.hours,
      quality: activePreview.quality,
      actualHours: activePreview.actualHours,
      faculty: activePreview.faculty,
      facultyNote: activePreview.facultyNote,
      uni: activePreview.uni,
      dateInfo: activePreview.dateInfo
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
      if (data && data.success) {
        setEntries(data.data);
        setToast("บันทึกผลงานเรียบร้อยแล้ว");
        setForm({ ...emptyForm, authorName: user?.full_name || "" });
        setTab("dashboard");
        return;
      }
    } catch (err) {
      console.error("Save error, fallback to local entries update:", err);
    }

    // Fallback update local state if backend API is not responding
    setEntries(prev => {
      const filtered = prev.filter(item => item.id !== entryId);
      return [payload, ...filtered];
    });
    setToast("บันทึกผลงานเรียบร้อยแล้ว");
    setForm({ ...emptyForm, authorName: user?.full_name || "" });
    setTab("dashboard");
  };

  // ฟังก์ชันปรับแต่ง/แก้ไขข้อมูลผลงาน
  const handleEdit = (entry) => {
    setForm({
      id: entry.id,
      title: entry.title || "",
      authors: entry.authors || "",
      author: entry.author || AUTHOR_OPTIONS[0],
      authorName: entry.authorName || user?.full_name || "",
      affiliations: entry.affiliations || "",
      correspondingAuthor: entry.correspondingAuthor || "",
      publicationDate: entry.publicationDate || entry.date || "",
      doi: entry.doi || "",
      journal: entry.journal || "",
      volume: entry.volume || "",
      issue: entry.issue || "",
      abstract: entry.abstract || "",
      keywords: entry.keywords || "",
      type: entry.type || TYPE_GROUPS[0].types[0],
      db: entry.db || DB_OPTIONS[0],
      proportion: entry.proportion !== undefined ? entry.proportion : 100,
      date: entry.publicationDate || entry.date || "",
    });
    setTab("form");
    if (setToast) {
      setToast(`โหลดข้อมูล "${(entry.title || entry.type).slice(0, 30)}..." สำหรับปรับแต่งเรียบร้อยแล้ว`);
    }
  };

  // ฟังก์ชันลบข้อมูล (คงไว้รองรับ API เผื่อจำเป็น)
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

  // ข้อมูลรอบปีภาระงานปัจจุบัน (เช่น กรกฎาคม 69 - มิถุนายน 70)
  const currentCycleInfo = useMemo(() => getWorkloadCycleInfo(new Date()), []);
  const [selectedCycleFilter, setSelectedCycleFilter] = useState("CURRENT"); // 'CURRENT' | cycleKey | 'ALL'

  // รวมรายการรอบปีภาระงานทั้งหมดที่มีในข้อมูล
  const availableCycles = useMemo(() => {
    const cycleMap = new Map();
    if (currentCycleInfo) {
      cycleMap.set(currentCycleInfo.cycleKey, {
        key: currentCycleInfo.cycleKey,
        label: currentCycleInfo.label,
        startBe: currentCycleInfo.startBeYear,
        isCurrent: true
      });
    }

    entries.forEach(entry => {
      const pDate = entry.publicationDate || entry.date;
      const cInfo = entry.dateInfo?.workloadCycleKey 
        ? {
            key: entry.dateInfo.workloadCycleKey,
            label: entry.dateInfo.workloadLabel || `กรกฎาคม ${String(entry.dateInfo.workloadStartYear || '').slice(-2)} - มิถุนายน ${String(entry.dateInfo.workloadEndYear || '').slice(-2)}`,
            startBe: entry.dateInfo.workloadStartYear || parseInt(entry.dateInfo.workloadCycleKey.split('-')[0], 10),
            isCurrent: false
          }
        : (pDate ? getWorkloadCycleInfo(pDate) : null);

      if (cInfo) {
        const k = cInfo.cycleKey || cInfo.key;
        if (!cycleMap.has(k)) {
          cycleMap.set(k, {
            key: k,
            label: cInfo.label,
            startBe: cInfo.startBeYear || cInfo.startBe || 0,
            isCurrent: k === currentCycleInfo?.cycleKey
          });
        }
      }
    });

    return Array.from(cycleMap.values()).sort((a, b) => b.startBe - a.startBe);
  }, [entries, currentCycleInfo]);

  const activeCycleKey = selectedCycleFilter === "CURRENT" ? (currentCycleInfo?.cycleKey || "") : selectedCycleFilter;
  const activeCycleObj = availableCycles.find(c => c.key === activeCycleKey);
  const activeCycleLabel = selectedCycleFilter === "ALL" 
    ? "ทุกรอบปี" 
    : (activeCycleObj ? activeCycleObj.label : (currentCycleInfo?.label || ""));

  // กรองรายการตามรอบปีภาระงาน (เพื่อคำนวณชั่วโมงสะสม & สถิติ)
  const cycleFilteredEntries = useMemo(() => {
    if (selectedCycleFilter === "ALL") return entries;
    const targetKey = activeCycleKey;
    return entries.filter(e => {
      const pDate = e.publicationDate || e.date;
      const cycleKey = e.dateInfo?.workloadCycleKey || (pDate ? getWorkloadCycleInfo(pDate)?.cycleKey : null);
      return cycleKey === targetKey;
    });
  }, [entries, selectedCycleFilter, activeCycleKey]);

  // สรุปยอดตามรอบปีภาระงาน
  const totals = useMemo(() => {
    let hours = 0, faculty = 0, uni = 0;
    cycleFilteredEntries.forEach(e => {
      hours += e.actualHours || 0;
      faculty += e.faculty || 0;
      uni += e.uni || 0;
    });
    return {
      hours: Math.round(hours * 100) / 100,
      faculty,
      uni,
      count: cycleFilteredEntries.length,
      allCount: entries.length
    };
  }, [cycleFilteredEntries, entries.length]);

  // สถิติตาม 4 หมวดหมู่หลัก (จำนวนชิ้นผลงาน)
  const categoryStats = useMemo(() => {
    const counts = {
      "วารสารวิชาการ": 0,
      "การประชุมวิชาการ": 0,
      "ทรัพย์สินทางปัญญา": 0,
      "งานสร้างสรรค์": 0,
    };

    cycleFilteredEntries.forEach(e => {
      const cat = getEntryCategory(e.type);
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    });

    const categories = [
      { 
        key: "วารสารวิชาการ", 
        label: "วารสารวิชาการ", 
        count: counts["วารสารวิชาการ"], 
        color: "#7c3aed", 
        bg: "#f5f3ff", 
        border: "#ddd6fe",
        barGradient: "linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%)" 
      },
      { 
        key: "การประชุมวิชาการ", 
        label: "การประชุมวิชาการ", 
        count: counts["การประชุมวิชาการ"], 
        color: "#2563eb", 
        bg: "#eff6ff", 
        border: "#bfdbfe",
        barGradient: "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)" 
      },
      { 
        key: "ทรัพย์สินทางปัญญา", 
        label: "ทรัพย์สินทางปัญญา", 
        count: counts["ทรัพย์สินทางปัญญา"], 
        color: "#d97706", 
        bg: "#fffbeb", 
        border: "#fde68a",
        barGradient: "linear-gradient(90deg, #fbbf24 0%, #d97706 100%)" 
      },
      { 
        key: "งานสร้างสรรค์", 
        label: "งานสร้างสรรค์", 
        count: counts["งานสร้างสรรค์"], 
        color: "#059669", 
        bg: "#ecfdf5", 
        border: "#a7f3d0",
        barGradient: "linear-gradient(90deg, #34d399 0%, #059669 100%)" 
      },
    ];

    const maxCount = Math.max(...categories.map(c => c.count), 1);
    const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

    return { categories, maxCount, totalCount };
  }, [cycleFilteredEntries]);

  // Filtered entries according to search keyword & category tag
  const filteredEntries = useMemo(() => {
    return cycleFilteredEntries.filter(item => {
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
  }, [cycleFilteredEntries, searchTerm, selectedCategoryFilter]);

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
                    <h2 className="card-title">{form.id ? "ปรับแต่งข้อมูลผลงานวิชาการ" : "ข้อมูลผลงานและรายละเอียดบทความ"}</h2>
                  </div>
                </div>

                {/* Editing Mode Banner */}
                {form.id && (
                  <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "10px 16px", borderRadius: "10px", margin: "14px 24px 0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6d28d9", fontWeight: 700 }}>
                      <Pencil size={15} />
                      <span>โหมดปรับแต่งผลงาน: ระบบจะบันทึกทับข้อมูลเดิมเมื่อกดบันทึก</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...emptyForm, authorName: user?.full_name || "" })}
                      style={{ background: "#ede9fe", border: "1px solid #c4b5fd", color: "#5b21b6", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      ยกเลิกการปรับแต่ง (สร้างใหม่)
                    </button>
                  </div>
                )}

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

{/* ผู้แต่ง และ สถาบัน (Authors & Affiliations) */}
<div className="form-group">
  <label className="form-label">
    Authors & Affiliations (ผู้แต่งและหน่วยงาน) <span style={{ color: "#ef4444" }}>*</span>
  </label>

  {/* วนลูปแสดงรายการผู้แต่ง */}
  {(form.authorList || []).map((author, index) => (
    <div 
      key={author.id} 
      style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
    >
      {/* บทบาท (Role) */}
      <input
        type="text"
        className="form-control"
        style={{
          width: '150px',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          fontWeight: '600',
          cursor: 'not-allowed'
        }}
        value={index === 0 ? "First Author" : "Co-author"}
        readOnly
      />

      {/* ชื่อ-นามสกุล */}
      <input
        type="text"
        className="form-control"
        placeholder="ชื่อ-นามสกุล (เช่น Somchai J.)"
        value={author.name}
        onChange={(e) => handleChangeAuthor(index, 'name', e.target.value)}
        required
      />

      {/* สถาบัน */}
      <input
        type="text"
        className="form-control"
        placeholder="สถาบัน (เช่น Mahidol University)"
        value={author.affiliation}
        onChange={(e) => handleChangeAuthor(index, 'affiliation', e.target.value)}
        required
      />

      {/* ปุ่มกากบาทลบ (แสดงเฉพาะคนที่ 2 เป็นต้นไป) */}
      <div style={{ width: '30px', textAlign: 'center' }}>
        {index > 0 && (
          <button
            type="button"
            onClick={() => handleRemoveAuthor(index)}
            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
            title="ลบผู้แต่ง"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  ))}

  {/* ปุ่มเพิ่มผู้แต่ง */}
  <button
    type="button"
    onClick={handleAddAuthor}
    style={{ marginTop: '10px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}
  >
    + Add Author
  </button>
</div>

{/* แยกช่องกรอก Corresponding Author ออกมาด้านล่างต่างหาก */}
<div className="form-group" style={{ marginTop: '20px' }}>
  <label className="form-label">
    Corresponding Author <span style={{ color: "#ef4444" }}>*</span>
  </label>
  <input
    type="text"
    className="form-control"
    placeholder="ระบุชื่อ Corresponding Author"
    value={form.correspondingAuthor || ''}
    onChange={(e) => setForm({ ...form, correspondingAuthor: e.target.value })} 
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
                        {previewData.dateInfo.workloadLabel || `ปีภาระงาน ${previewData.dateInfo.acadLabel?.replace('ปีการศึกษา ', '') || ''}`}
                      </span>
                      <span className="purple-calendar-chip">{previewData.dateInfo.beLabel}</span>
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

        {/* Workload Planning & Simulation Tab */}
        {tab === "planning" && (
          <PlanningSimulator onApplyToForm={handleApplyFromPlanning} />
        )}

        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div className="dashboard-container">
            {/* Top Banner: Subtitle + Cycle Selector + Add Button */}
            <div className="dashboard-top-banner">
              <div>
                <h2 className="dashboard-intro-title">
                  ภาพรวมผลงานวิชาการและภาระงานของคุณ
                </h2>
                <div className="dashboard-intro-subtitle">
                  รอบปีภาระงาน: <span className="highlight-cycle-text">{activeCycleLabel}</span> (ตัดรอบสะสม 1 ก.ค. - 30 มิ.ย.)
                </div>
              </div>
              <div className="dashboard-banner-actions">
                <div className="cycle-selector-box">
                  <Calendar size={15} className="cycle-selector-icon" />
                  <select
                    value={selectedCycleFilter}
                    onChange={(e) => setSelectedCycleFilter(e.target.value)}
                    className="cycle-select-dropdown"
                    title="เลือกรอบปีภาระงานเพื่อดูสถิติสะสม"
                  >
                    <option value="CURRENT">รอบปัจจุบัน ({currentCycleInfo?.label})</option>
                    {availableCycles.filter(c => !c.isCurrent).map(c => (
                      <option key={c.key} value={c.key}>รอบ {c.label}</option>
                    ))}
                    <option value="ALL">ดูทุกรอบปี (ทั้งหมด)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setTab("form")}
                  className="btn-ams-primary-add"
                >
                  <Plus size={16} />
                  <span>เพิ่มผลงานใหม่</span>
                </button>
              </div>
            </div>

            {/* Top Row: [Score Card + Total Works KPI + Bar Chart] */}
            <div className="dashboard-top-grid">
              {/* Workload Progress Donut Chart */}
              <div className="ams-score-card">
                <div className="score-card-header-flex">
                  <div className="score-card-title">ชั่วโมงภาระงานสะสม</div>
                  <span className="cycle-mini-pill" title="รีเซ็ตยอดสะสมอัตโนมัติทุก 1 กรกฎาคม">
                    <Clock size={12} />
                    <span>{selectedCycleFilter === 'ALL' ? 'ทุกรอบปี' : activeCycleLabel}</span>
                  </span>
                </div>

                <div className="donut-chart-wrapper">
                  <svg width="150" height="150" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
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
                      strokeDasharray="100 0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="donut-center-content">
                    <div className="donut-pct-text">{totals.hours || 0}</div>
                    <div className="donut-sub-text">ชั่วโมง</div>
                  </div>
                </div>

                <div className="workload-target-progress-box">
                  <div className="workload-progress-labels">
                    <span>ภาระงานสะสมในรอบ</span>
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
                  <span className="kpi-term-pill">{activeCycleLabel}</span>
                </div>
                <div>
                  <div className="kpi-title-label">ผลงานทั้งหมดในรอบนี้</div>
                  <div className="kpi-main-number">
                    {totals.count} <span className="kpi-unit-label">ชิ้น</span>
                  </div>
                  {selectedCycleFilter !== "ALL" && entries.length > totals.count && (
                    <div className="kpi-sub-total-note">
                      รวมทั้งหมด {entries.length} ชิ้น (ทุกรอบปี)
                    </div>
                  )}
                </div>
              </div>

              {/* Bar Chart: แผนภูมิแท่งแสดงจำนวนประเภทภาระงาน (4 หมวดหมู่หลัก) */}
              <div className="ams-barchart-card">
                <div className="barchart-card-top">
                  <div className="barchart-title-wrap">
                    <div className="barchart-icon-square">
                      <BarChart3 size={18} color="#7c3aed" />
                    </div>
                    <div>
                      <div className="barchart-title">สถิติตามประเภทภาระงาน</div>
                      <div className="barchart-subtitle">จำนวนผลงานแยกตาม 4 หมวดหมู่หลัก</div>
                    </div>
                  </div>
                  <span className="barchart-count-badge">รวม {categoryStats.totalCount} ชิ้น</span>
                </div>

                <div className="barchart-items-list">
                  {categoryStats.categories.map((cat) => {
                    const pct = categoryStats.maxCount > 0 ? (cat.count / categoryStats.maxCount) * 100 : 0;
                    const isFilterActive = selectedCategoryFilter === cat.key;
                    return (
                      <div
                        key={cat.key}
                        className={`barchart-bar-item ${isFilterActive ? "active" : ""}`}
                        onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat.key ? "ทั้งหมด" : cat.key)}
                        title={`คลิกเพื่อกรองเฉพาะ ${cat.label}`}
                      >
                        <div className="barchart-bar-header">
                          <span className="barchart-cat-name" style={{ color: cat.count > 0 ? "#1e293b" : "#94a3b8" }}>
                            {cat.label}
                          </span>
                          <span className="barchart-cat-val" style={{ color: cat.color }}>
                            <b>{cat.count}</b> <span className="barchart-val-unit">ชิ้น</span>
                          </span>
                        </div>
                        <div className="barchart-bar-track">
                          <div
                            className="barchart-bar-fill"
                            style={{
                              width: `${Math.max(pct, cat.count > 0 ? 10 : 0)}%`,
                              background: cat.barGradient,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                          onClick={() => handleEdit(e)}
                          title="ปรับแต่งข้อมูลผลงาน"
                          className="card-btn-edit"
                        >
                          <Pencil size={14} />
                          <span>ปรับแต่ง</span>
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
                            onClick={() => handleEdit(e)}
                            className="btn-edit-table"
                            title="ปรับแต่งข้อมูลผลงาน"
                            style={{ margin: "0 auto" }}
                          >
                            <Pencil size={13} />
                            <span>ปรับแต่ง</span>
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