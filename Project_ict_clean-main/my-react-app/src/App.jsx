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
  BarChart3,
  Mail,
  AlertTriangle
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ScholarDashboard from "./components/ScholarDashboard";
import ScholarImportModal from "./components/ScholarImportModal";
import { parseImportedAuthors, titleSimilarity, validateAuthorProportions, findAuthorRowForUser } from "./utils/authors";
import { normalizeImportedPaper, mergeMissingPaperFields, needsDoiEnrichment } from "./utils/paperNormalizer";
import { AUTHOR_ROLE, AUTHOR_OPTIONS as SHARED_AUTHOR_OPTIONS, isFirstRole, isCorrespondingRole, isCoAuthorRole } from "./constants/authorRoles";
import PdfUploadModal from "./components/PdfUploadModal";
import PlanningSimulator from "./components/PlanningSimulator";
import AdminFacultyOverview from "./components/AdminFacultyOverview";
import AdminDuplicateCheck from "./components/AdminDuplicateCheck";
import AdminDisbursement from "./components/AdminDisbursement";
import AdminAuditLogs from "./components/AdminAuditLogs";
import UserDisbursementView from "./components/UserDisbursementView";
import { getPaperAlertSummary } from "./utils/validation";
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
  { type: "จดทะเบียนทรัพย์สินทางปัญญาอื่นๆ", db: "ไม่มีฐานข้อมูล", code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
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
  { label: "ทรัพย์สินทางปัญญา", types: ["จดทะเบียนทรัพย์สินทางปัญญาอื่นๆ", "จดทะเบียนอนุสิทธิบัตร", "จดทะเบียนสิทธิบัตร"] },
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
const AUTHOR_OPTIONS = [...SHARED_AUTHOR_OPTIONS];
const DB_OPTIONS = ["ไม่มีฐานข้อมูล", "TCI กลุ่ม 2", "TCI กลุ่ม 1", "Scopus Q1", "Scopus Q2", "Scopus Q3", "Scopus Q4"];

const emptyForm = { 
  title: "", 
  authorList: [
    { id: Date.now(), role: "First author", name: "", proportion: 100, affiliation: "", isCorresponding: false }
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
  type: null, 
  db: DB_OPTIONS[0], 
  proportion: 100, 
  date: "" 
};

function AcademicWorkloadMain() {
  const { user, authLoading, token, toast, setToast } = useAuth();

  const [tab, setTabState] = useState(() => {
    return sessionStorage.getItem("active_tab") || "form";
  });

  const setTab = (newTab) => {
    sessionStorage.setItem("active_tab", newTab);
    setTabState(newTab);
  };

  // จัดการการเปลี่ยน Tab / เมนู Sidebar พร้อมป้องกัน Error กรณีอยู่ระหว่างปรับแต่งผลงานแล้วไม่กดบันทึก
  const handleTabChange = (newTab) => {
    // กรณีป้องกันการ error ถ้าหากผู้ใช้ กดปรับแต่ง ผลงานจากหน้าแดชบอร์ดแล้วเมื่อถูกส่งมาหน้าผลงานวิชาการ(คำนวณ)
    // แต่ผู้ใช้ไม่กดบันทึกแล้วกดไปยัง sidebar อื่นทันทีโดยที่ยังไม่ได้กดบันทึกผลงาน ให้รีเฟรช 1 ครั้งเพื่อกันการ error
    if (tab === "form" && form.id && newTab !== "form") {
      sessionStorage.setItem("active_tab", newTab);
      window.location.reload();
      return;
    }
    setTab(newTab);
  };

  const [form, setForm] = useState(emptyForm);
  const [entries, setEntries] = useState([]);
const [pdfModalOpen, setPdfModalOpen] = useState(false);
const [scholarModalOpen, setScholarModalOpen] = useState(false);
const [staffList, setStaffList] = useState([]);

  // สถานะผลการคำนวณจาก Backend
  const [previewData, setPreviewData] = useState(null);

  // Data Viewing & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ทั้งหมด");
  const [viewMode, setViewMode] = useState("card"); // "card" or "table"

  // Real-time Author Proportion & Hierarchy Validation
  const authorValidation = useMemo(() => {
    return validateAuthorProportions(form.authorList || []);
  }, [form.authorList]);

  // สถานะยืนยันผลงานซ้ำซ้อน
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  // ตรวจจับผลงานที่ซ้ำซ้อนในฐานข้อมูล (Duplicate Detection)
  const duplicateWarning = useMemo(() => {
    const cleanTitle = (form.title || '').trim();
    const cleanDoi = (form.doi || '').trim().toLowerCase();

    if (!cleanTitle && !cleanDoi) return null;

    const matchedEntry = entries.find(item => {
      if (form.id && item.id === form.id) return false;

      const itemDoi = (item.doi || '').trim().toLowerCase();
      if (cleanDoi && itemDoi && cleanDoi === itemDoi) {
        return true;
      }

      const itemTitle = (item.title || '').trim();
      if (cleanTitle && itemTitle) {
        if (cleanTitle.toLowerCase() === itemTitle.toLowerCase()) return true;
        if (cleanTitle.length >= 8 && itemTitle.length >= 8 && titleSimilarity(cleanTitle, itemTitle) >= 0.82) {
          return true;
        }
      }
      return false;
    });

    if (!matchedEntry) return null;

    const isDoiMatch = cleanDoi && (matchedEntry.doi || '').trim().toLowerCase() === cleanDoi;
    return {
      isDuplicate: true,
      matchedEntry,
      reason: isDoiMatch 
        ? `เลข DOI ตรงกับผลงานในระบบ: ${matchedEntry.doi}` 
        : `ชื่อเรื่องตรงกันหรือคล้ายคลึงกับผลงานในระบบ: "${matchedEntry.title}"`
    };
  }, [form.title, form.doi, form.id, entries]);

  // รีเซ็ตสถานะการยืนยันเมื่อชื่อผลงานหรือ DOI เปลี่ยน
  useEffect(() => {
    setDuplicateConfirmed(false);
  }, [form.title, form.doi]);

  // ฟังก์ชันจัดการ authorList
  const handleAddAuthor = () => {
    setForm(prev => {
      const currentList = prev.authorList || [];
      const hasCorresponding = currentList.some(a => a.role === "Corresponding author");
      const defaultRole = currentList.length === 0 
        ? "First author" 
        : (!hasCorresponding ? "Corresponding author" : "Co author");

      let updatedList = [...currentList];
      // ถ้าเดิมมีผู้แต่ง 1 คน (100%) แล้วกดเพิ่มผู้แต่งคนที่ 2 ให้ปรับสัดส่วนอัตโนมัติเพื่อให้ไม่เป็น 100%
      if (updatedList.length === 1 && Number(updatedList[0].proportion) === 100) {
        updatedList[0] = { ...updatedList[0], proportion: 60 };
      }

      return {
        ...prev,
        authorList: [
          ...updatedList,
          { 
            id: Date.now() + Math.random(), 
            role: defaultRole, 
            name: "", 
            affiliation: "", 
            proportion: (updatedList.length === 1) ? 40 : "", 
            isCorresponding: defaultRole === "Corresponding author" 
          }
        ]
      };
    });
  };

  const handleRemoveAuthor = (indexToRemove) => {
    setForm(prev => {
      const remainingList = (prev.authorList || []).filter((_, index) => index !== indexToRemove);
      const corr = remainingList.find(a => a.role === 'Corresponding author' || a.isCorresponding);
      
      // ถ้าลบเหลือคนเดียว ให้ปรับสัดส่วนกลับเป็น 100%
      let finalizedList = remainingList;
      if (finalizedList.length === 1) {
        finalizedList = [{ ...finalizedList[0], proportion: 100 }];
      }

      return {
        ...prev,
        authorList: finalizedList,
        correspondingAuthor: corr ? corr.name : ""
      };
    });
  };

  const handleChangeAuthor = (index, field, value) => {
    setForm(prev => {
      const newList = [...(prev.authorList || [])];
      
      if (field === 'proportion') {
        if (value === "") {
          newList[index].proportion = ""; // Allow empty state during typing
        } else {
          let num = Number(value);
          if (isNaN(num)) num = 0;
          if (num < 0) num = 0;
          if (num > 100) num = 100;

          newList[index].proportion = num;
        }
      } else if (field === 'role') {
        newList[index].role = value;
        newList[index].isCorresponding = (value === 'Corresponding author');
      } else {
        newList[index][field] = value;
      }

      const corr = newList.find(a => a.role === 'Corresponding author' || a.isCorresponding);

      return { 
        ...prev, 
        authorList: newList,
        correspondingAuthor: corr ? corr.name : prev.correspondingAuthor
      };
    });
  };

  // 2. ⚡ Preset: หารเท่ากันทุกคน (Equal Split) -> 100% / N
  const handleEqualSplit = () => {
    const count = form.authorList?.length || 0;
    if (count === 0) return;

    if (count === 1) {
      setForm(prev => ({
        ...prev,
        authorList: (prev.authorList || []).map(a => ({ ...a, proportion: 100 }))
      }));
      return;
    }

    const base = Math.floor((100 / count) * 10) / 10;
    const remainder = Number((100 - (base * count)).toFixed(1));
    
    setForm(prev => ({
      ...prev,
      authorList: (prev.authorList || []).map((author, idx) => ({
        ...author,
        proportion: idx === 0 ? Number((base + remainder).toFixed(1)) : base
      }))
    }));
  };

  // 3. ฟังก์ชันตรวจสอบความถูกต้องของฟอร์ม (ประเภท, Title, และผู้แต่ง)
  const validateAuthorsForm = () => {
    if (!form.type) {
      if (setToast) setToast("⚠️ กรุณากดเลือกกลุ่มประเภทผลงานวิชาการ (ด้านบนสุด)");
      alert("กรุณากดเลือกกลุ่มประเภทผลงานวิชาการ (ด้านบนสุด)");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    if (!form.title || !form.title.trim()) {
      if (setToast) setToast("⚠️ กรุณากรอกชื่อเรื่อง / ชื่อบทความ (Title)");
      alert("กรุณากรอกชื่อเรื่อง / ชื่อบทความ (Title)");
      return false;
    }

    const authorList = form.authorList || [];

    if (authorList.length === 0) {
      if (setToast) setToast("⚠️ กรุณาเพิ่มผู้แต่งอย่างน้อย 1 คน");
      alert("กรุณาเพิ่มผู้แต่งอย่างน้อย 1 คน");
      return false;
    }

    // 1. Check for empty proportion values
    if (authorValidation.hasEmpty) {
      if (setToast) setToast("⚠️ กรุณากรอกสัดส่วนการมีส่วนร่วม (%) ให้ครบทุกคน");
      alert("กรุณากรอกสัดส่วนการมีส่วนร่วม (%) ให้ครบทุกคน");
      return false;
    }

    // 2. Check total percentage sum (100%)
    if (!authorValidation.isTotal100) {
      const msg = `ผลรวมสัดส่วนต้องเท่ากับ 100% พอดี (ปัจจุบันรวมได้ ${authorValidation.totalSum.toFixed(1)}%)`;
      if (setToast) setToast(`⚠️ ${msg}`);
      alert(msg);
      return false;
    }

    // 3. กฎลำดับขั้นและสัดส่วน First author >= Corresponding author >= Co author
    if (!authorValidation.isHierarchyValid && authorValidation.hierarchyErrors.length > 0) {
      const msg = `สัดส่วนไม่เป็นไปตามเกณฑ์ First author ≥ Corresponding author ≥ Co author:\n- ${authorValidation.hierarchyErrors.join("\n- ")}`;
      if (setToast) setToast("⚠️ สัดส่วนไม่เป็นไปตามเกณฑ์ First ≥ Corresponding ≥ Co author");
      alert(msg);
      return false;
    }

    return true;
  };

const handleImportFromScholar = async (paperData, userObj) => {
  try {
    // 1. Normalize imported paper data (single source of truth)
    let paper = normalizeImportedPaper(paperData);

    // 2. DOI Enrichment (backend) - only for missing fields
    if (paper.doi && needsDoiEnrichment(paper)) {
      try {
        console.log('[Import] Enriching via DOI:', paper.doi);
        const response = await fetch(`${API_URL}/papers/enrich-by-doi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doi: paper.doi })
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            paper = mergeMissingPaperFields(paper, result.data);
            console.log('[Import] DOI enrichment successful, source:', result.data.metadata_source);
          }
        }
      } catch (enrichErr) {
        console.warn('[Import] DOI enrichment failed:', enrichErr.message);
        // Continue with original data - don't block form
      }
    }

    // 3. Parse authors with shared constants - respect explicit corresponding, fallback to last author
    const parsedAuthors = parseImportedAuthors(paper.authors, {
      isScopusImport: paper.source === 'scopus',
      correspondingName: paperData.corresponding_author
    });

    // 4. Determine author roles with proper precedence:
    // - If source explicitly specifies corresponding author(s), use that
    // - Single author: First & Corresponding author
    // - Multiple authors, no explicit corresponding: last author = Corresponding
    const hasExplicitCorresponding = parsedAuthors.some(
      (author) =>
        author.isCorresponding === true ||
        author.role === AUTHOR_ROLE.CORRESPONDING ||
        author.role === AUTHOR_ROLE.FIRST_AND_CORRESPONDING
    );

    const authorCount = parsedAuthors.length;
    const equalProportion = authorCount > 0 ? Math.floor((100 / authorCount) * 100) / 100 : 0;

    const authorList = parsedAuthors.map((author, index) => {
      const isFirst = index === 0;
      const isLast = index === authorCount - 1;

      let authorType;
      let isCorresponding = false;

      if (authorCount === 1) {
        authorType = AUTHOR_ROLE.FIRST_AND_CORRESPONDING;
        isCorresponding = true;
      } else if (hasExplicitCorresponding) {
        // Keep original role from source
        authorType = author.role || (isFirst ? AUTHOR_ROLE.FIRST : AUTHOR_ROLE.CO_AUTHOR);
        isCorresponding = author.isCorresponding === true || author.role === AUTHOR_ROLE.CORRESPONDING;
      } else {
        // Fallback: last author = Corresponding
        if (isFirst) {
          authorType = AUTHOR_ROLE.FIRST;
        } else if (isLast) {
          authorType = AUTHOR_ROLE.CORRESPONDING;
          isCorresponding = true;
        } else {
          authorType = AUTHOR_ROLE.CO_AUTHOR;
        }
      }

      const proportion = isLast && authorCount > 1
        ? Number((100 - equalProportion * (authorCount - 1)).toFixed(2))
        : equalProportion;

      return {
        ...author,
        authorType,
        role: authorType,
        isCorresponding,
        proportion
      };
    });

    const lastAuthor = authorList.at(-1);

    // 5. Update form with all normalized + enriched data
    setForm(prev => ({
      ...prev,
      title: paper.title,
      journal: paper.journal,
      doi: paper.doi,
      publicationDate: paper.publicationDate,
      volume: paper.volume,
      issue: paper.issue,
      abstract: paper.abstract,
      keywords: Array.isArray(paper.keywords) ? paper.keywords.join(', ') : (paper.keywords || ''),
      source: paper.source || '',
      authorList,
      correspondingAuthor: lastAuthor?.name || ''
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error('[Import] Failed to import paper:', error);
    // Fallback: still open form with whatever data we have
    setForm(prev => ({
      ...prev,
      title: paperData.title || '',
      journal: paperData.journal || '',
      doi: paperData.doi || '',
      authorList: parseImportedAuthors(paperData.authors_raw || paperData.authors || '')
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

  // Handler for PDF extraction completion  // Handler for PDF extraction completion
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
        let role = 'Co author';
        if (author.is_first_author) {
          role = 'First author';
        } else if (isCorresponding) {
          role = 'Corresponding author';
        }
        // Enrich affiliation: use AI-provided first, then try staff matching
        const affiliation = author.affiliation || enrichAuthorWithAffiliation(staffList, author.name);
        return {
          id: Date.now() + i,
          role: role,
          name: author.name || '',
          affiliation: affiliation,
          proportion: "",
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
    setForm(prev => {
      const currentAuthorList = prev.authorList && prev.authorList.length > 0
        ? prev.authorList
        : [{ id: Date.now(), role: plannedData.author || "First author", name: user?.full_name || "", proportion: plannedData.proportion ?? 100, affiliation: "", isCorresponding: plannedData.author === "Corresponding author" }];
      
      const updatedAuthorList = currentAuthorList.map((a, idx) => {
        if (idx === 0) {
          return {
            ...a,
            role: plannedData.author || a.role,
            proportion: plannedData.proportion !== undefined ? plannedData.proportion : a.proportion,
            isCorresponding: (plannedData.author === "Corresponding author")
          };
        }
        return a;
      });

      return {
        ...prev,
        author: plannedData.author,
        type: plannedData.type,
        db: plannedData.db,
        proportion: plannedData.proportion,
        publicationDate: plannedData.publicationDate,
        date: plannedData.publicationDate,
        authorList: updatedAuthorList
      };
    });
    setTab('form');
    if (setToast) {
      setToast("นำเข้าพารามิเตอร์จากการวางแผนมายังฟอร์มเรียบร้อยแล้ว");
    }
  };

function calculateFacultyFunding(type, author, baseFaculty) {
  const isFirst = isFirstRole(author) || author === "First author" || author === "First Author";
  const isCorr = isCorrespondingRole(author) || author === "Corresponding author" || author === "Corresponding Author";
  const isCo = isCoAuthorRole(author) || author === "Co author" || author === "Co Author" || author === "Co-author";

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

function computeClientCalculation(formState, currentUser = null, currentStaffList = []) {
  if (!formState.type) {
    return {
      code: "-",
      hours: 0,
      quality: 0,
      faculty: 0,
      facultyNote: "กรุณากดเลือกกลุ่มประเภทผลงานวิชาการ",
      uni: 0,
      actualHours: 0,
      effectiveRole: formState.author || "First author",
      userProportion: 0,
      dateInfo: null,
      matchedAuthorName: "",
      isUserMatched: false,
      matchIndex: 0
    };
  }

  const lookup = LOOKUP_TABLE.find(r => r.type === formState.type && r.db === formState.db) 
    || LOOKUP_TABLE.find(r => r.type === formState.type)
    || {
      code: "2.1.8",
      hours: 150,
      quality: 1,
      faculty: 10000,
      facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)",
      uni: 40000
    };

  const matchedAuthor = findAuthorRowForUser(formState.authorList, currentUser, formState.authorName, currentStaffList);

  const userProportion = Number(matchedAuthor?.proportion ?? formState.proportion ?? 0);
  const actualHours = Math.round((userProportion * lookup.hours) / 100 * 100) / 100;
  const effectiveRole = matchedAuthor?.role || formState.author || "First author";
  const faculty = calculateFacultyFunding(formState.type, effectiveRole, lookup.faculty);
  const dateInfo = computeClientDateInfo(formState.publicationDate || formState.date);

  return {
    ...lookup,
    actualHours,
    faculty,
    dateInfo,
    effectiveRole,
    userProportion,
    matchedAuthorName: matchedAuthor?.name || formState.authorName || "",
    isUserMatched: matchedAuthor?.isUserMatched ?? false,
    matchIndex: matchedAuthor?.matchIndex ?? 0
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
      const localCalc = computeClientCalculation(form, user, staffList);
      setPreviewData(localCalc);

      try {
        const res = await fetch(`${API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            userId: user?.id,
            userEmail: user?.email,
            userFullName: user?.name_th || user?.name_en || user?.full_name || "",
            name_th: user?.name_th || "",
            name_en: user?.name_en || ""
          })
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
  }, [form, user, staffList]);

  // กำหนดชื่ออาจารย์อัตโนมัติตาม user ที่เข้าสู่ระบบ
  useEffect(() => {
    const loggedInName = user?.name_th || user?.name_en || user?.full_name || "";
    if (loggedInName) {
      setForm(prev => {
        const needsNameInFirstRow = prev.authorList && prev.authorList.length === 1 && !prev.authorList[0].name;
        return {
          ...prev,
          authorName: prev.authorName || loggedInName,
          authorList: needsNameInFirstRow
            ? [{ ...prev.authorList[0], name: loggedInName, affiliation: prev.authorList[0].affiliation || "มหาวิทยาลัยพะเยา" }]
            : prev.authorList
        };
      });
    }
  }, [user]);

  // ดึงรายชื่ออาจารย์สำหรับ Auto-Mapping Affiliation (แค่ครั้งเดียว)
  useEffect(() => {
    fetch(`${API_URL}/users/staff`)
      .then(res => res.json())
      .then(data => setStaffList(data || []))
      .catch(err => console.error("[Staff List Error]:", err));
  }, []);

  // 🔧 Utility: Normalize ชื่อสำหรับแมตช์ (lowercase, trim, strip punctuation)
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/[.,]/g, '').replace(/\s+/g, ' ');
  };

  // 🔧 Utility: แมตช์ชื่อผู้แต่งกับฐานข้อมูลอาจารย์ เพื่อเติม Affiliation อัตโนมัติ
  const enrichAuthorWithAffiliation = (staffList, authorName) => {
    if (!authorName || !staffList || staffList.length === 0) return '';
    const cleanName = normalizeName(authorName);

    const matchedStaff = staffList.find(staff => {
      const nameEn = normalizeName(staff.name_en);
      const nameTh = normalizeName(staff.name_th);
      const fullName = normalizeName(staff.full_name);
      return cleanName === nameEn || cleanName === nameTh || cleanName === fullName ||
             nameEn.includes(cleanName) || nameTh.includes(cleanName) || fullName.includes(cleanName);
    });

    if (matchedStaff && matchedStaff.department) {
      const emailDomain = matchedStaff.email?.split('@')[1] || '';
      if (emailDomain && emailDomain !== 'up.ac.th') {
        return `${matchedStaff.department}, ${emailDomain.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
      }
      return `${matchedStaff.department}, University of Phayao`;
    }

    return '';
  };

  // 🔧 Helper: ดึงอีเมลของ First author และ Corresponding author สำหรับผลงานที่มีผู้แต่งมากกว่า 1 คน
  const getPaperContactEmails = (entry, staffList = []) => {
    if (!entry) return null;

    const authorList = Array.isArray(entry.author_list) && entry.author_list.length > 0
      ? entry.author_list
      : Array.isArray(entry.authorList) && entry.authorList.length > 0
        ? entry.authorList
        : [];

    let isMulti = false;
    if (authorList.length > 1) {
      isMulti = true;
    } else if (authorList.length === 1) {
      isMulti = false;
    } else if (entry.authors) {
      const splitNames = entry.authors.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      isMulti = splitNames.length > 1;
    }

    // หากไม่ใช่งานวิจัยหลายคน (1 คน) ไม่ต้องแสดง
    if (!isMulti) return null;

    let firstAuthorName = "";
    let corrAuthorName = "";

    if (authorList.length > 0) {
      const first = authorList.find(a => isFirstRole(a.role)) || authorList[0];
      const corr = authorList.find(a => isCorrespondingRole(a.role) && a !== first);
      firstAuthorName = first?.name || "";
      corrAuthorName = corr?.name || entry.correspondingAuthor || "";
    } else if (entry.authors) {
      const names = entry.authors.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      firstAuthorName = names[0] || entry.authorName || "";
      corrAuthorName = entry.correspondingAuthor || "";
    } else {
      firstAuthorName = entry.authorName || "";
      corrAuthorName = entry.correspondingAuthor || "";
    }

    const findEmail = (name) => {
      if (!name || !staffList || staffList.length === 0) return null;
      const clean = normalizeName(name);
      if (!clean) return null;

      const matched = staffList.find(s => {
        const en = normalizeName(s.name_en);
        const th = normalizeName(s.name_th);
        const full = normalizeName(s.full_name);
        return clean === en || clean === th || clean === full ||
               (en && (en.includes(clean) || clean.includes(en))) ||
               (th && (th.includes(clean) || clean.includes(th))) ||
               (full && (full.includes(clean) || clean.includes(full)));
      });
      return matched?.email || null;
    };

    const firstEmail = findEmail(firstAuthorName);
    const corrEmail = corrAuthorName ? findEmail(corrAuthorName) : null;

    const contacts = [];
    if (firstEmail) {
      contacts.push({ role: 'First author', name: firstAuthorName, email: firstEmail });
    }
    if (corrEmail && corrEmail !== firstEmail) {
      contacts.push({ role: 'Corresponding author', name: corrAuthorName, email: corrEmail });
    }

    if (contacts.length === 0 && entry.submitter_email) {
      contacts.push({ role: 'ผู้บันทึกผลงาน', name: firstAuthorName || corrAuthorName || 'ผู้จัดทำ', email: entry.submitter_email });
    }

    return {
      isMulti,
      contacts,
      firstAuthorName,
      corrAuthorName,
      fallbackEmail: contacts.length === 0 ? (entry.submitter_email || null) : null
    };
  };

  // 🤝 Helper: ตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์กดยืนยันสัดส่วนผลงานนี้หรือไม่
  const canUserConfirmPaper = (entry, currentUser = user, currentStaffList = staffList) => {
    if (!entry || !currentUser) return false;
    if (entry.confirmation_status !== 'PENDING') return false;

    const userEmails = [currentUser.email].filter(Boolean).map(e => e.toLowerCase().trim());
    const userNames = [
      currentUser.name_th,
      currentUser.name_en,
      currentUser.full_name,
      currentUser.name
    ].filter(Boolean).map(n => normalizeName(n)).filter(Boolean);

    if (currentUser.email && currentStaffList && currentStaffList.length > 0) {
      const matchedStaff = currentStaffList.find(s => s.email && s.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
      if (matchedStaff) {
        if (matchedStaff.name_th) userNames.push(normalizeName(matchedStaff.name_th));
        if (matchedStaff.name_en) userNames.push(normalizeName(matchedStaff.name_en));
        if (matchedStaff.full_name) userNames.push(normalizeName(matchedStaff.full_name));
      }
    }

    // 1. ตรวจสอบว่าเคยยืนยันในฉบับล่าสุดนี้แล้วหรือยัง
    const confirmedByList = (entry.confirmed_by || []).map(c => normalizeName(String(c))).filter(Boolean);
    const isAlreadyConfirmed = confirmedByList.some(c => {
      if (!c || c === 'submitter') return false;
      const emailMatch = userEmails.some(em => em && (c === normalizeName(em) || c.includes(normalizeName(em))));
      if (emailMatch) return true;
      const nameMatch = userNames.some(un => un && un.length >= 3 && (c === un || (c.length >= 4 && un.includes(c)) || (un.length >= 4 && c.includes(un))));
      return nameMatch;
    });

    if (isAlreadyConfirmed) return false;

    // 2. ตรวจสอบว่าผู้ใช้นี้เป็นหนึ่งในผู้แต่งหรือผู้สร้างผลงานนี้ (รวมถึงคนสร้างการ์ดเดิม หากคนอื่นเข้ามาแก้ไข)
    const isCreator = Boolean(entry.user_id && String(entry.user_id) === String(currentUser.id));
    const isSubmitterEmail = Boolean(entry.submitter_email && userEmails.includes(entry.submitter_email.toLowerCase().trim()));

    let isAuthor = isCreator || isSubmitterEmail;

    if (!isAuthor && Array.isArray(entry.author_list) && entry.author_list.length > 0) {
      isAuthor = entry.author_list.some(a => {
        const aName = normalizeName(a.name || '');
        if (!aName) return false;
        return userNames.some(un => aName.includes(un) || un.includes(aName));
      });
    }

    if (!isAuthor && entry.authors) {
      const rawAuthors = normalizeName(entry.authors);
      isAuthor = userNames.some(un => rawAuthors.includes(un));
    }

    if (!isAuthor && entry.authorName) {
      const aName = normalizeName(entry.authorName);
      isAuthor = userNames.some(un => aName.includes(un) || un.includes(aName));
    }

    return isAuthor;
  };

  // ฟังก์ชันบันทึกข้อมูลไปยัง Backend
  const handleSave = async () => {
    // 🌟 Validate authors form before saving
    if (!validateAuthorsForm()) return;

    // ⚠️ ตรวจสอบกรณีตรวจพบผลงานซ้ำซ้อนในระบบ แต่ยังไม่ได้กดยืนยัน
    if (duplicateWarning && duplicateWarning.isDuplicate && !duplicateConfirmed) {
      setToast("⚠️ ตรวจพบผลงานที่อาจซ้ำซ้อนในระบบ กรุณาตรวจสอบและกดยืนยันในการ์ดสรุปภาระงานก่อนบันทึก");
      return;
    }

    const activePreview = previewData || computeClientCalculation(form, user, staffList);
    const entryId = form.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Prepare author strings
    const authorsStr = (form.authorList || []).map(a => a.name).filter(Boolean).join(", ");
    const affiliationsStr = (form.authorList || []).map(a => a.affiliation).filter(Boolean).join(", ");
    const corrAuthorObj = (form.authorList || []).find(a => a.role === "Corresponding author" || a.isCorresponding);
    const corrAuthorName = corrAuthorObj ? corrAuthorObj.name : (form.correspondingAuthor || "");
    const userMatchedAuthor = findAuthorRowForUser(form.authorList, user, form.authorName, staffList);
    const resolvedAuthorName = userMatchedAuthor?.name || user?.name_th || user?.full_name || user?.name_en || form.authorName || (form.authorList && form.authorList[0]?.name) || "";

    const payload = {
      ...form,
      id: entryId,
      userId: user?.id || null,
      userEmail: user?.email || null,
      editorId: user?.id || null,
      editorEmail: user?.email || null,
      editorName: user?.name_th || user?.name_en || user?.full_name || user?.email || "",
      userName: user?.name_th || user?.name_en || user?.full_name || "",
      userFullName: user?.name_th || user?.name_en || user?.full_name || "",
      userRole: user?.role || 'user',
      role: user?.role || 'user',
      authorName: resolvedAuthorName,
      author: activePreview.effectiveRole || form.author,
      proportion: activePreview.userProportion ?? form.proportion ?? 100,
      authors: authorsStr || form.authors || resolvedAuthorName,
      affiliations: affiliationsStr || form.affiliations,
      correspondingAuthor: corrAuthorName || form.correspondingAuthor,
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
        const hasMultipleAuthors = (form.authorList || []).length > 1;
        setToast(hasMultipleAuthors 
          ? "บันทึกผลงานแล้ว และส่งอีเมลแจ้งเตือนผู้ร่วมงานเพื่อยืนยันสัดส่วน (รอการยืนยัน 7 วัน)" 
          : "บันทึกผลงานเรียบร้อยแล้ว");
        setForm({ ...emptyForm, authorName: user?.full_name || "" });
        setTab("dashboard");
        return;
      }
    } catch (err) {
      console.error("Save error, fallback to local entries update:", err);
    }

    // Fallback update local state if backend API is not responding
    const isSingle = (form.authorList || []).length <= 1;
    const fallbackEntry = {
      ...payload,
      confirmation_status: isSingle ? "CONFIRMED" : "PENDING",
      confirmation_days_remaining: 7,
      is_workload_counted: isSingle,
      confirmed_by: [user?.name_th || user?.name_en || user?.full_name || user?.email || "submitter"],
      author_list: form.authorList || []
    };
    setEntries(prev => {
      const filtered = prev.filter(item => item.id !== entryId);
      return [fallbackEntry, ...filtered];
    });
    setToast(isSingle ? "บันทึกผลงานเรียบร้อยแล้ว" : "บันทึกผลงานแล้ว (รอผู้ร่วมงานยืนยันสัดส่วน 7 วัน)");
    setForm({ ...emptyForm, authorName: user?.full_name || "" });
    setTab("dashboard");
  };

  // ฟังก์ชันอัปเดตข้อมูลผลงาน / บันทึกการเบิกจ่ายเงินรางวัล (Admin Disbursement)
  const handleSaveUpdatedEntry = async (updatedEntry) => {
    try {
      const res = await api.post("/entries", updatedEntry);
      if (res.data && res.data.success) {
        setEntries(res.data.data);
        setToast("บันทึกข้อมูลการเบิกจ่ายเงินรางวัลเรียบร้อยแล้ว");
        return;
      }
    } catch (err) {
      console.error("Save updated entry error, fallback to local:", err);
    }

    // Fallback update local state
    setEntries(prev => prev.map(item => item.id === updatedEntry.id ? { ...item, ...updatedEntry } : item));
    setToast("บันทึกข้อมูลการเบิกจ่ายเงินรางวัลเรียบร้อยแล้ว");
  };

  // ฟังก์ชันปรับแต่ง/แก้ไขข้อมูลผลงาน
  const handleEdit = (entry) => {
    let resolvedAuthorList = [];
    if (Array.isArray(entry.author_list) && entry.author_list.length > 0) {
      resolvedAuthorList = entry.author_list.map((a, idx) => ({
        id: a.id || Date.now() + idx,
        name: a.name || "",
        role: a.role || (idx === 0 ? "First author" : "Co author"),
        proportion: a.proportion !== undefined ? a.proportion : (idx === 0 ? (entry.proportion || 100) : 0),
        affiliation: a.affiliation || entry.affiliations || "",
        isCorresponding: a.role === "Corresponding author" || a.isCorresponding || false
      }));
    } else if (Array.isArray(entry.authorList) && entry.authorList.length > 0) {
      resolvedAuthorList = entry.authorList;
    } else if (entry.authors) {
      const names = entry.authors.split(/[,;]/).map(n => n.trim()).filter(Boolean);
      resolvedAuthorList = names.map((name, idx) => {
        const isCorr = entry.correspondingAuthor && entry.correspondingAuthor.toLowerCase().includes(name.toLowerCase());
        const isFirst = idx === 0;
        return {
          id: Date.now() + idx,
          name,
          role: isFirst ? (entry.author || "First author") : (isCorr ? "Corresponding author" : "Co author"),
          proportion: isFirst ? (entry.proportion || 100) : 0,
          affiliation: entry.affiliations || "",
          isCorresponding: !!isCorr
        };
      });
    }

    if (resolvedAuthorList.length === 0) {
      resolvedAuthorList = [
        {
          id: Date.now(),
          role: entry.author || AUTHOR_OPTIONS[0],
          name: entry.authorName || user?.full_name || "",
          proportion: entry.proportion !== undefined ? entry.proportion : 100,
          affiliation: entry.affiliations || "",
          isCorresponding: entry.author === "Corresponding author"
        }
      ];
    }

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
      authorList: resolvedAuthorList
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

  // 🤝 ฟังก์ชันกดยืนยันสัดส่วนผู้ร่วมงาน (Confirm Proportion)
  const handleConfirmProportion = async (entryId) => {
    try {
      const res = await fetch(`${API_URL}/entries/${entryId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: user?.id || null,
          userName: user?.name_th || user?.name_en || user?.full_name || "",
          userEmail: user?.email || ""
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.data) setEntries(data.data);
        if (setToast) setToast(data.message || "ยืนยันสัดส่วนเรียบร้อยแล้ว");
      } else {
        alert(data.message || "ไม่สามารถยืนยันสัดส่วนได้");
      }
    } catch (err) {
      console.error("Confirm proportion error:", err);
      if (setToast) setToast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  // 👤 กรองเฉพาะผลงานของผู้ใช้ปัจจุบัน (ถ้าเป็น Admin จะเห็นทุกรายการในหน้าแดชบอร์ด/คอนโซล)
  const userEntries = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return entries;

    const userEmail = (user.email || '').toLowerCase().trim();
    const userNameEn = (user.name_en || '').toLowerCase().trim();
    const userNameTh = (user.name_th || '').toLowerCase().trim();
    const userFullName = (user.full_name || '').toLowerCase().trim();
    const userId = user.id ? String(user.id) : '';

    return entries.filter(e => {
      // 1. ตรวจสอบจาก user_id / userId ที่บันทึก
      if (userId && (String(e.user_id) === userId || String(e.userId) === userId)) {
        return true;
      }

      // 2. ตรวจสอบจาก email ผู้บันทึก
      const submitterEmail = (e.submitter_email || '').toLowerCase().trim();
      if (userEmail && submitterEmail && submitterEmail === userEmail) {
        return true;
      }

      // 3. ตรวจสอบจากชื่อผู้ยื่น (authorName)
      const authorName = (e.authorName || e.author_name || '').toLowerCase().trim();
      if (userNameTh && authorName && (authorName.includes(userNameTh) || userNameTh.includes(authorName))) return true;
      if (userNameEn && authorName && (authorName.includes(userNameEn) || userNameEn.includes(authorName))) return true;
      if (userFullName && authorName && (authorName.includes(userFullName) || userFullName.includes(authorName))) return true;

      // 4. ตรวจสอบว่ามีชื่อใน authors list หรือไม่
      const authors = (e.authors || '').toLowerCase().trim();
      if (userNameTh && authors && authors.includes(userNameTh)) return true;
      if (userNameEn && authors && authors.includes(userNameEn)) return true;
      if (userFullName && authors && authors.includes(userFullName)) return true;

      return false;
    });
  }, [entries, user]);

  // ข้อมูลรอบปีภาระงานปัจจุบัน (เช่น กรกฎาคม 69 - มิถุนายน 70)
  const currentCycleInfo = useMemo(() => getWorkloadCycleInfo(new Date()), []);
  const [selectedCycleFilter, setSelectedCycleFilter] = useState("CURRENT"); // 'CURRENT' | cycleKey | 'ALL'

  // รวมรายการรอบปีภาระงานทั้งหมดที่มีในข้อมูลของผู้ใช้
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

    userEntries.forEach(entry => {
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
  }, [userEntries, currentCycleInfo]);

  const activeCycleKey = selectedCycleFilter === "CURRENT" ? (currentCycleInfo?.cycleKey || "") : selectedCycleFilter;
  const activeCycleObj = availableCycles.find(c => c.key === activeCycleKey);
  const activeCycleLabel = selectedCycleFilter === "ALL" 
    ? "ทุกรอบปี" 
    : (activeCycleObj ? activeCycleObj.label : (currentCycleInfo?.label || ""));

  // กรองรายการตามรอบปีภาระงาน (เพื่อคำนวณชั่วโมงสะสม & สถิติ)
  const cycleFilteredEntries = useMemo(() => {
    if (selectedCycleFilter === "ALL") return userEntries;
    const targetKey = activeCycleKey;
    return userEntries.filter(e => {
      const pDate = e.publicationDate || e.date;
      const cycleKey = e.dateInfo?.workloadCycleKey || (pDate ? getWorkloadCycleInfo(pDate)?.cycleKey : null);
      // หากยังไม่ได้ระบุวันที่หรือยังไม่มีรอบปี ให้แสดงในรอบปัจจุบันเสมอ เพื่อไม่ให้ข้อมูลที่เพิ่งบันทึกถูกซ่อน
      if (!cycleKey) return true;
      return cycleKey === targetKey;
    });
  }, [userEntries, selectedCycleFilter, activeCycleKey]);

  // สรุปยอดตามรอบปีภาระงาน (นับเฉพาะผลงานที่ยืนยันแล้ว หรือผ่านไป 7 วัน Auto-Lock)
  const totals = useMemo(() => {
    let hours = 0, faculty = 0, uni = 0;
    let countedCount = 0;

    cycleFilteredEntries.forEach(e => {
      // 🔒 ตรวจสอบว่าผลงานได้รับการยืนยันหรือผ่าน 7 วันหรือไม่
      const isCounted = e.is_workload_counted !== false;
      if (isCounted) {
        hours += e.actualHours || 0;
        faculty += e.faculty || 0;
        uni += e.uni || 0;
        countedCount += 1;
      }
    });

    return {
      hours: Math.round(hours * 100) / 100,
      faculty,
      uni,
      count: countedCount,
      allCount: userEntries.length,
      pendingCount: cycleFilteredEntries.length - countedCount
    };
  }, [cycleFilteredEntries, userEntries.length]);

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
        getEntryCategory(item.type) === selectedCategoryFilter;

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
    if (!form.type) return null;
    for (const g of TYPE_GROUPS) {
      if (g.types.includes(form.type)) return g.label;
    }
    return null;
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
      <Sidebar tab={tab} setTab={handleTabChange} entriesCount={userEntries.length} />

      {/* Main Content Area */}
      <div className="app-content-wrapper">
        <Header tab={tab} setTab={handleTabChange} entries={userEntries} />

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
                      <span> ดึงข้อมูล</span>
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
                      <span> สกัดข้อมูลจาก PDF ด้วย AI</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Category Selector Tiles */}
                <div className="form-group">
                  <label className="form-label">
                    เลือกกลุ่มประเภทผลงานวิชาการ <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="category-tiles-grid">
                    {TYPE_GROUPS.map(g => (
                      <div
                        key={g.label}
                        className={`category-tile ${activeMainCategory === g.label ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, type: g.types[0] }))}
                        style={{ cursor: "pointer" }}
                      >
                        <span className="category-tile-title">{g.label}</span>
                        <span style={{ fontSize: 11, color: "#8b94a5" }}>{g.types.length} ประเภทย่อย</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-type Selection */}
                <div className="form-group">
                  <label className="form-label">
                    ประเภทผลงานย่อย <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={form.type || ""}
                    onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                    disabled={!activeMainCategory}
                  >
                    {!activeMainCategory ? (
                      <option value="">-- กรุณากดเลือกกลุ่มประเภทผลงานวิชาการด้านบนก่อน --</option>
                    ) : (
                      TYPE_GROUPS.find(g => g.label === activeMainCategory)?.types.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))
                    )}
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

{/* Authors & Affiliations (ผู้แต่งและหน่วยงาน) */}
<div className="form-group">
  {/* Header Row with Title, Helpers & Total Percentage + Hierarchy Badges */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
    <div>
      <label className="form-label" style={{ margin: 0 }}>
        Authors & Affiliations (ผู้แต่งและหน่วยงาน) <span style={{ color: "#ef4444" }}>*</span>
      </label>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
        เกณฑ์สัดส่วน: First author ≥ Corresponding author ≥ Co author (ผลรวม 100%)
      </div>
    </div>

    {/* Real-time Status Badges */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* 1. Hierarchy Rule Status Badge */}
      {!authorValidation.hasEmpty && (form.authorList || []).length > 1 && (
        <span style={{
          fontSize: '12px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontWeight: '600',
          backgroundColor: authorValidation.isHierarchyValid ? '#dcfce7' : '#fee2e2',
          color: authorValidation.isHierarchyValid ? '#15803d' : '#b91c1c',
          border: `1px solid ${authorValidation.isHierarchyValid ? '#bbf7d0' : '#fecaca'}`
        }}>
          {authorValidation.isHierarchyValid ? "ลำดับสัดส่วนถูกต้อง ✓" : "⚠️ ผิดเกณฑ์ First ≥ Corresponding ≥ Co author"}
        </span>
      )}

      {/* 2. Total Percentage Status Badge */}
      <span style={{
        fontSize: '12px',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: '600',
        backgroundColor: authorValidation.hasEmpty ? '#f3f4f6' : authorValidation.isTotal100 ? '#dcfce7' : '#fee2e2',
        color: authorValidation.hasEmpty ? '#6b7280' : authorValidation.isTotal100 ? '#15803d' : '#b91c1c',
        border: `1px solid ${authorValidation.hasEmpty ? '#e5e7eb' : authorValidation.isTotal100 ? '#bbf7d0' : '#fecaca'}`
      }}>
        {authorValidation.hasEmpty 
          ? "กรอก % ให้ครบทุกช่อง" 
          : `รวมทั้งหมด: ${authorValidation.totalSum.toFixed(1)}% ${authorValidation.isTotal100 ? "✓" : "(ต้องครบ 100%)"}`}
      </span>
    </div>
  </div>

  {/* Real-Time Alert Notification Box for Rule Violations */}
  {(!authorValidation.isHierarchyValid || (!authorValidation.isTotal100 && !authorValidation.hasEmpty)) && !authorValidation.hasEmpty && (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '10px 14px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      marginBottom: '12px',
      fontSize: '12.5px',
      color: '#991b1b',
      lineHeight: 1.45
    }}>
      <span style={{ fontSize: '16px', lineHeight: 1 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '700', marginBottom: '2px' }}>
          แจ้งเตือนสัดส่วนไม่ถูกต้อง (Real-time Alert):
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {!authorValidation.isTotal100 && (
            <li>รวมทั้งหมดได้ <b>{authorValidation.totalSum.toFixed(1)}%</b> (สัดส่วนต้องรวมกันได้ 100% พอดี)</li>
          )}
          {authorValidation.hierarchyErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </div>
    </div>
  )}

  {/* Author Entry List */}
  {(() => {
    const matchedUserAuthor = findAuthorRowForUser(form.authorList, user, form.authorName, staffList);
    return (form.authorList || []).map((author, index) => {
      const isCurrentUserRow = Boolean(matchedUserAuthor && matchedUserAuthor.matchIndex === index && matchedUserAuthor.isUserMatched);
      const isMultiAuthor = (form.authorList || []).length > 1;
      const currentRole = author.role || (index === 0 ? "First author" : "Co author");

      const firstAuthor = form.authorList.find(a => isFirstRole(a.role));
      const corrAuthors = form.authorList.filter(a => isCorrespondingRole(a.role) && a !== firstAuthor);

      let maxAllowed = 100;
      if (isFirstRole(currentRole)) {
        maxAllowed = isMultiAuthor ? (100 - (form.authorList.length - 1)) : 100;
      } else if (isCorrespondingRole(currentRole)) {
        if (firstAuthor && firstAuthor.proportion !== "" && firstAuthor.proportion !== undefined) {
          maxAllowed = Math.min(100, Number(firstAuthor.proportion));
        }
      } else if (isCoAuthorRole(currentRole)) {
        if (corrAuthors.length > 0) {
          const minCorrProp = Math.min(...corrAuthors.map(c => Number(c.proportion || 100)));
          maxAllowed = Math.min(100, minCorrProp);
        } else if (firstAuthor && firstAuthor.proportion !== "" && firstAuthor.proportion !== undefined) {
          maxAllowed = Math.min(100, Number(firstAuthor.proportion));
        }
      }

      return (
        <div 
          key={author.id || index} 
          style={{ 
            position: 'relative',
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '10px', 
            marginBottom: '14px',
            marginTop: isCurrentUserRow ? '14px' : '0',
            padding: isCurrentUserRow ? '12px 12px 10px 12px' : '0',
            borderRadius: isCurrentUserRow ? '10px' : '0',
            backgroundColor: isCurrentUserRow ? '#faf5ff' : 'transparent',
            border: isCurrentUserRow ? '1.5px solid #ddd6fe' : 'none'
          }}
        >
          {isCurrentUserRow && (
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 9px',
              borderRadius: '12px',
              boxShadow: '0 2px 5px rgba(109, 40, 217, 0.22)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 2,
              pointerEvents: 'none'
            }}>
              <span>👤</span> ข้อมูลของคุณ (นำไปคำนวณภาระงาน)
            </div>
          )}

          {/* Role Selector Dropdown */}
          <div style={{ width: '185px' }}>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', color: '#6b7480' }}>
              บทบาทผู้แต่ง
            </label>
            <select
              className="form-control"
              style={{
                fontWeight: '600',
                fontSize: '13px',
                backgroundColor: '#f9fafb'
              }}
              value={author.role || (index === 0 ? "First author" : "Co author")}
              onChange={(e) => handleChangeAuthor(index, 'role', e.target.value)}
            >
              <option value="First author">First author</option>
              <option value="Corresponding author">Corresponding author</option>
              <option value="Co author">Co author</option>
            </select>
          </div>

          {/* Author Name Input */}
          <div style={{ flex: 1.2 }}>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', color: '#6b7480' }}>ชื่อ-นามสกุล</label>
            <input
              type="text"
              className="form-control"
              placeholder="ชื่อ-นามสกุล (เช่น Somchai J.)"
              value={author.name || ''}
              onChange={(e) => handleChangeAuthor(index, 'name', e.target.value)}
              required
              style={isCurrentUserRow ? { borderColor: '#a78bfa', backgroundColor: '#ffffff', color: '#5b21b6', fontWeight: '700' } : {}}
            />
          </div>

          {/* Author Proportion Input with Dynamic Max */}
          <div style={{ width: '130px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '12px', color: '#6b7480' }}>สัดส่วน (%)</label>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                (≤ {maxAllowed}%)
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={maxAllowed}
              className="form-control"
              placeholder={`0 - ${maxAllowed}`}
              value={author.proportion ?? ''}
              onChange={e => handleChangeAuthor(index, 'proportion', e.target.value)}
              required
              style={isCurrentUserRow ? { borderColor: '#a78bfa', fontWeight: '700', color: '#6d28d9' } : {}}
            />
          </div>

          {/* Institution / Affiliation Input */}
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', color: '#6b7480' }}>สถาบัน</label>
            <input
              type="text"
              className="form-control"
              placeholder="สถาบัน (เช่น University of Phayao)"
              value={author.affiliation || ''}
              onChange={(e) => handleChangeAuthor(index, 'affiliation', e.target.value)}
              required
            />
          </div>

          {/* Delete Row Button */}
          <div style={{ width: '30px', textAlign: 'center', marginTop: isCurrentUserRow ? '24px' : '28px' }}>
            {form.authorList.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveAuthor(index)}
                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
                title="ลบผู้แต่ง"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      );
    });
  })()}

  {/* Footer Action Bar: Add Author + Preset Controls */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
    <button
      type="button"
      onClick={handleAddAuthor}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        background: '#f9fafb',
        color: '#374151',
        fontSize: '13px',
        cursor: 'pointer',
        fontWeight: '600'
      }}
    >
      + Add Author
    </button>

    <button
      type="button"
      onClick={handleEqualSplit}
      style={{
        padding: '8px 14px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        color: '#475569',
        fontSize: '12px',
        cursor: 'pointer',
        fontWeight: '500'
      }}
      title="แบ่งสัดส่วนเท่ากันทุกคน (100% / จำนวนผู้แต่ง)"
    >
      ⚡ แบ่งเท่ากันทุกคน (Equal Split)
    </button>
  </div>
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

              {/* Main Submit Button at the bottom of the form */}
              <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-form-bottom-save"
                >
                  <Plus size={20} />
                  <span>{form.id ? "บันทึกการแก้ไขผลงาน" : "บันทึกผลงานลงระบบ"}</span>
                </button>
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
                      {(() => {
                        const matched = findAuthorRowForUser(form.authorList, user, form.authorName, staffList);
                        const userProportion = Number(matched?.proportion ?? previewData.userProportion ?? form.proportion ?? 0);
                        const roleName = matched?.role || previewData.effectiveRole || form.author || "First author";
                        const nameLabel = matched?.name ? ` • ${matched.name}` : (user?.name_th || user?.name_en || form.authorName ? ` • ${form.authorName || user?.name_th || user?.name_en}` : "");
                        return (
                          <> = {previewData.hours} ชม.ฐาน × {userProportion}% สัดส่วน ({roleName}{nameLabel})</>
                        );
                      })()}
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

                  {/* Duplicate Detection Alert Box at bottom of Purple Preview Card */}
                  {duplicateWarning && duplicateWarning.isDuplicate && (
                    <div style={{
                      marginTop: "16px",
                      padding: "14px 16px",
                      borderRadius: "14px",
                      background: duplicateConfirmed 
                        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.3) 100%)" 
                        : "linear-gradient(135deg, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.35) 100%)",
                      border: duplicateConfirmed ? "1.5px solid #34d399" : "1.5px solid #fbbf24",
                      color: "#ffffff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      animation: "fadeIn 0.3s ease"
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <AlertTriangle size={20} color={duplicateConfirmed ? "#34d399" : "#fde047"} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: duplicateConfirmed ? "#6ee7b7" : "#fef08a", marginBottom: "4px" }}>
                            {duplicateConfirmed ? "✓ ยืนยันผลงานแล้ว (พร้อมบันทึก)" : "⚠️ ตรวจพบผลงานซ้ำในระบบ"}
                          </div>
                          <div style={{ fontSize: "11px", lineHeight: "1.5", color: "#f3e8ff", marginBottom: "8px" }}>
                            {duplicateWarning.reason}
                            <div style={{ marginTop: "4px", color: "#fef08a", fontSize: "11px" }}>
                              • ผู้ยื่นเดิม: <b>{duplicateWarning.matchedEntry.authorName || duplicateWarning.matchedEntry.author || "ไม่ระบุ"}</b>
                            </div>
                          </div>
                          
                          <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            color: duplicateConfirmed ? "#a7f3d0" : "#ffffff",
                            cursor: "pointer",
                            background: "rgba(0, 0, 0, 0.25)",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            userSelect: "none"
                          }}>
                            <input
                              type="checkbox"
                              checked={duplicateConfirmed}
                              onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                              style={{ width: "16px", height: "16px", accentColor: "#10b981", cursor: "pointer" }}
                            />
                            <span>ยืนยันว่าไม่ใช่ผลงานซ้ำซ้อน / ต้องการบันทึก</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <div className="kpi-title-label">ผลงานที่นับเป็นภาระงานแล้ว</div>
                  <div className="kpi-main-number">
                    {totals.count} <span className="kpi-unit-label">ชิ้น</span>
                  </div>
                  {totals.pendingCount > 0 && (
                    <div style={{ fontSize: "11px", color: "#b45309", fontWeight: "600", marginTop: "4px" }}>
                      ⏳ รอผู้ร่วมงานยืนยัน {totals.pendingCount} ชิ้น (นับหลัง 7 วัน)
                    </div>
                  )}
                  {selectedCycleFilter !== "ALL" && userEntries.length > totals.count && totals.pendingCount === 0 && (
                    <div className="kpi-sub-total-note">
                      รวมทั้งหมด {userEntries.length} ชิ้น (ทุกรอบปี)
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

                          {/* Smart Incomplete & Expiry & Disbursement Badges */}
                          {(() => {
                            const summary = getPaperAlertSummary(e);
                            return (
                              <div style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px" }}>
                                {summary.completeness.isIncomplete && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }} title={`สิ่งที่ยังขาด: ${summary.completeness.missingFields.join(", ")}`}>
                                    ⚠️ ไม่ครบ ({summary.completeness.missingCount})
                                  </span>
                                )}
                                {summary.expiry.isExpired && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}>
                                    ⏳ ไม่สามารถใช้ได้ในหลักสูตร
                                  </span>
                                )}
                                {summary.expiry.isExpiring && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#fff7ed", color: "#c2410c", border: "1px solid #ffedd5" }}>
                                    ⏳ {summary.expiry.badgeText}
                                  </span>
                                )}
                                {e.disbursement_status === "DISBURSED" && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
                                    💵 เบิกแล้ว
                                  </span>
                                )}
                                {/* 🤝 Co-Author Confirmation Badges */}
                                {e.confirmation_status === "CONFIRMED" && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }} title="ผู้แต่งทุกคนยืนยันสัดส่วนครบถ้วนแล้ว">
                                    ✓ สัดส่วนได้รับการยืนยันแล้ว
                                  </span>
                                )}
                                {e.confirmation_status === "AUTO_CONFIRMED" && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }} title="ครบ 7 วันตามเกณฑ์ โดยไม่มีการคัดค้าน ระบบอนุมัติสัดส่วนอัตโนมัติ">
                                    ✓ ยืนยันอัตโนมัติ (ครบ 7 วัน)
                                  </span>
                                )}
                                {e.confirmation_status === "PENDING" && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }} title={`รอผู้ร่วมงานยืนยันสัดส่วน (หากไม่มีการแก้ไข จะอนุมัติอัตโนมัติในอีก ${e.confirmation_days_remaining || 7} วัน)`}>
                                    ⏳ รอผู้ร่วมงานยืนยัน ({e.confirmation_days_remaining} วัน)
                                  </span>
                                )}
                                {e.workload_frozen && (
                                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1" }} title={e.freeze_notice || "ผลงานได้รับการยืนยันสมบูรณ์/พ้นกำหนด 7 วันแล้ว การแก้ไขโดยสมาชิกทั่วไปไม่มีผลต่อชั่วโมงภาระงานและเงินรางวัลสะสม (คงค่าอนุมัติเดิม)"}>
                                    🔒 ภาระงานล็อคตามยอดอนุมัติเดิม
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            {/* ปุ่มกดยืนยันสัดส่วนสำหรับผู้ร่วมงาน และคนสร้างการ์ด (กรณีผู้อื่นเข้ามาแก้ไข) */}
                            {canUserConfirmPaper(e) && (
                              <button
                                type="button"
                                onClick={() => handleConfirmProportion(e.id)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  color: "#ffffff",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.25)"
                                }}
                                title="กดยืนยันสัดส่วนผู้แต่งของคุณสำหรับผลงานนี้"
                              >
                                <CheckCircle2 size={13} />
                                <span>ยืนยันสัดส่วน</span>
                              </button>
                            )}

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

                        {/* Proportion Feedback Notice (Only for Multi-Author Papers) */}
                        {(() => {
                          const contactInfo = getPaperContactEmails(e, staffList);
                          if (!contactInfo || !contactInfo.isMulti) return null;

                          const hasContacts = contactInfo.contacts.length > 0;
                          const fallbackTxt = contactInfo.fallbackEmail || (contactInfo.firstAuthorName ? `ผู้แต่ง (${contactInfo.firstAuthorName})` : "ผู้แต่งผลงาน");

                          return (
                            <div className="card-proportion-notice" style={{
                              marginTop: "12px",
                              padding: "8px 12px",
                              backgroundColor: "#f8fafc",
                              border: "1px dashed #cbd5e1",
                              borderRadius: "8px",
                              fontSize: "12px",
                              color: "#475569",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              lineHeight: 1.45
                            }}>
                              <Mail size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: "2px" }} />
                              <div>
                                <span>หากท่านไม่พึงพอใจในสัดส่วนนี้ โปรดติดต่อ: </span>
                                {hasContacts ? (
                                  contactInfo.contacts.map((c, idx) => (
                                    <span key={idx}>
                                      {idx > 0 && " หรือ "}
                                      <a
                                        href={`mailto:${c.email}?subject=ขอปรึกษาเรื่องสัดส่วนผลงาน: ${encodeURIComponent(e.title || '')}`}
                                        style={{ color: "#4f46e5", fontWeight: "600", textDecoration: "underline" }}
                                        title={`ส่งอีเมลถึง ${c.name} (${c.role})`}
                                      >
                                        {c.email}
                                      </a>
                                      <span style={{ color: "#64748b", fontSize: "11px" }}> ({c.role})</span>
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: "#4f46e5", fontWeight: "600" }}>{fallbackTxt}</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bottom Highlighted Metric KPI Box */}
                    {(() => {
                      const rawList = (Array.isArray(e.author_list) && e.author_list.length > 0)
                        ? e.author_list
                        : (Array.isArray(e.authorList) && e.authorList.length > 0 ? e.authorList : []);

                      let resolvedAuthors = rawList;
                      if (resolvedAuthors.length === 0) {
                        if (e.authors) {
                          const names = e.authors.split(',').map(s => s.trim()).filter(Boolean);
                          resolvedAuthors = names.map((name, idx) => ({
                            name,
                            role: idx === 0 ? (e.author || "First author") : "Co author",
                            proportion: idx === 0 ? (e.proportion || 100) : 0
                          }));
                        } else {
                          resolvedAuthors = [{
                            name: e.authorName || user?.name_th || user?.full_name || "ผู้จัดทำ",
                            role: e.author || "First author",
                            proportion: e.proportion !== undefined ? e.proportion : 100
                          }];
                        }
                      }

                      const matchedUserRow = findAuthorRowForUser(resolvedAuthors, user, e.authorName, staffList);

                      return (
                        <div className="card-bottom-metrics">
                          {/* Left: Author List & Proportion of All Authors in a Clean Table */}
                          <div className="card-authors-proportions-block" style={{ textAlign: "left" }}>
                            <div className="card-stat-lbl" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                              <Users size={15} color="#6d28d9" />
                              <span>ตารางผู้แต่งและสัดส่วนทุกคน ({resolvedAuthors.length} ท่าน)</span>
                            </div>

                            <div style={{
                              overflowX: "auto",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                            }}>
                              <table style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "12px",
                                textAlign: "left"
                              }}>
                                <thead>
                                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                                    <th style={{ padding: "5px 8px", width: "35px", fontWeight: 700 }}>#</th>
                                    <th style={{ padding: "5px 8px", fontWeight: 700 }}>ชื่อผู้แต่ง</th>
                                    <th style={{ padding: "5px 8px", fontWeight: 700 }}>บทบาท</th>
                                    <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, width: "95px" }}>สัดส่วน (%)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {resolvedAuthors.map((authorItem, idx) => {
                                    const isUserRow = Boolean(
                                      matchedUserRow && 
                                      matchedUserRow.matchIndex === idx && 
                                      matchedUserRow.isUserMatched
                                    );

                                    return (
                                      <tr
                                        key={idx}
                                        style={{
                                          borderBottom: idx < resolvedAuthors.length - 1 ? "1px solid #f1f5f9" : "none",
                                          backgroundColor: isUserRow ? "#faf5ff" : (idx % 2 === 0 ? "#ffffff" : "#fcfcfd")
                                        }}
                                      >
                                        <td style={{ padding: "5px 8px", color: "#94a3b8", fontWeight: 600 }}>
                                          {idx + 1}
                                        </td>
                                        <td style={{ padding: "5px 8px" }}>
                                          <span style={{ fontWeight: isUserRow ? 700 : 600, color: isUserRow ? "#581c87" : "#1e293b" }}>
                                            {authorItem.name || "ผู้แต่ง"}
                                          </span>
                                          {isUserRow && (
                                            <span style={{
                                              marginLeft: "6px",
                                              fontSize: "9px",
                                              fontWeight: 700,
                                              backgroundColor: "#7c3aed",
                                              color: "#ffffff",
                                              padding: "1px 6px",
                                              borderRadius: "8px",
                                              display: "inline-flex",
                                              alignItems: "center"
                                            }}>
                                              👤 คุณ
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ padding: "5px 8px" }}>
                                          <span style={{
                                            fontSize: "10.5px",
                                            fontWeight: 600,
                                            padding: "2px 6px",
                                            borderRadius: "5px",
                                            backgroundColor: authorItem.role === "First author" ? "#fef3c7" : (authorItem.role === "Corresponding author" ? "#ecfdf5" : "#f1f5f9"),
                                            color: authorItem.role === "First author" ? "#b45309" : (authorItem.role === "Corresponding author" ? "#047857" : "#475569"),
                                            border: authorItem.role === "First author" ? "1px solid #fde68a" : (authorItem.role === "Corresponding author" ? "1px solid #a7f3d0" : "1px solid #e2e8f0")
                                          }}>
                                            {authorItem.role || "Co author"}
                                          </span>
                                        </td>
                                        <td style={{ padding: "5px 8px", textAlign: "right" }}>
                                          <span style={{
                                            fontWeight: 800,
                                            fontSize: "12px",
                                            color: "#6d28d9",
                                            backgroundColor: isUserRow ? "#ede9fe" : "#f8fafc",
                                            padding: "2px 6px",
                                            borderRadius: "5px",
                                            border: isUserRow ? "1px solid #c4b5fd" : "1px solid #e2e8f0"
                                          }}>
                                            {authorItem.proportion !== undefined && authorItem.proportion !== "" ? authorItem.proportion : 0}%
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Right: Actual Workload Hours of Current User */}
                          <div className="card-stat-block" style={{ textAlign: "center" }}>
                            <span className="card-stat-lbl">ภาระงานจริงของคุณ</span>
                            <span className="card-stat-val" style={{ fontSize: "20px" }}>
                              {e.actualHours} <span style={{ fontSize: "13px", fontWeight: "600" }}>ชม.</span>
                            </span>
                            <span style={{ fontSize: "11px", color: "#6d28d9", fontWeight: "700", marginTop: "2px" }}>
                              เกณฑ์ {e.code || "-"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
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
                          {(() => {
                            const contactInfo = getPaperContactEmails(e, staffList);
                            if (!contactInfo || !contactInfo.isMulti) return null;
                            const hasContacts = contactInfo.contacts.length > 0;
                            return (
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Mail size={12} color="#6366f1" />
                                <span>ไม่พึงพอใจสัดส่วนโปรดติดต่อ: </span>
                                {hasContacts ? (
                                  contactInfo.contacts.map((c, idx) => (
                                    <span key={idx}>
                                      {idx > 0 && ", "}
                                      <a href={`mailto:${c.email}`} style={{ color: "#4f46e5", textDecoration: "underline" }}>
                                        {c.email}
                                      </a>
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: "#4f46e5" }}>{contactInfo.fallbackEmail || "ผู้จัดทำ"}</span>
                                )}
                              </div>
                            );
                          })()}
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
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "6px", alignItems: "center" }}>
                            {canUserConfirmPaper(e) && (
                              <button
                                type="button"
                                onClick={() => handleConfirmProportion(e.id)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "#10b981",
                                  color: "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer"
                                }}
                                title="กดยืนยันสัดส่วนผู้แต่ง"
                              >
                                <CheckCircle2 size={12} />
                                <span>ยืนยันสัดส่วน</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEdit(e)}
                              className="btn-edit-table"
                              title="ปรับแต่งข้อมูลผลงาน"
                              style={{ margin: 0 }}
                            >
                              <Pencil size={13} />
                              <span>ปรับแต่ง</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* User Disbursements Tab */}
        {tab === "disbursements" && (
          <UserDisbursementView entries={entries} />
        )}

        {/* Admin Console Tabs */}
        {tab === "admin-faculty" && (
          <AdminFacultyOverview entries={entries} />
        )}

        {tab === "admin-duplicates" && (
          <AdminDuplicateCheck entries={entries} onEditEntry={handleEdit} />
        )}

        {tab === "admin-disbursements" && (
          <AdminDisbursement entries={entries} onUpdateEntry={handleSaveUpdatedEntry} />
        )}

        {tab === "admin-audit" && (
          <AdminAuditLogs entries={entries} />
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