import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  GraduationCap, 
  Search, 
  User, 
  Users, 
  Mail, 
  Save, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  BookOpen,
  Award,
  AlertCircle,
  Plus,
  Filter,
  X,
  BookMarked,
  Calendar,
  Coins,
  LayoutGrid,
  List
} from 'lucide-react';
import api from '../api/client';

const DEPARTMENT_ORDER = [
  'Computer Graphics and Multimedia',
  'Digital Business',
  'Information Technology',
  'Geoinformatics',
  'Computer Science',
  'Data Science and Applications',
  'Computer Engineering',
  'Software Engineering'
];

function parsePosition(position) {
  if (!position) return { specialRoles: [], academicRank: '' };
  const parts = position.split('/').map(p => p.trim());
  const specialKeywords = [
    'ประธานหลักสูตร', 'ประธาน', 'รองคณบดี', 'ผู้ช่วยคณบดี', 
    'รองอธิการบดี', 'คณบดี', 'ประธานคณะ'
  ];
  const specialRoles = parts.filter(p => specialKeywords.some(k => p.includes(k)));
  const academicRank = parts.find(p => !specialKeywords.some(k => p.includes(k))) || '';
  return { specialRoles, academicRank };
}

function PaperCard({ paper, currentUser, onConfirm, onReject, onImport }) {
  const formatAuthors = (authorsRaw) => {
    if (!authorsRaw) return '';
    return authorsRaw.split(',').map(n => n.trim()).filter(Boolean).join(', ');
  };

  const isConfirmed = paper.author_status === 'CONFIRMED';

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      borderLeft: `4px solid ${isConfirmed ? '#10b981' : '#f59e0b'}`
    }}>
      {/* ส่วนข้อมูลบทความ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          
          {/* ชื่อเรื่อง (Title) - สีเดิม เปลี่ยนสีม่วง+ขีดเส้นใต้ตอนเอาเมาส์ชี้ */}
          <h3 
            onClick={() => onImport(paper)}
            onMouseOver={(e) => {
              e.target.style.textDecoration = 'underline';
              e.target.style.color = '#4A148C'; // เปลี่ยนเป็นสีม่วงตอน Hover
            }}
            onMouseOut={(e) => {
              e.target.style.textDecoration = 'none';
              e.target.style.color = '#1e293b'; // กลับเป็นสีเดิมตอนเอาเมาส์ออก
            }}
            style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#1e293b', /* สีตั้งต้น (สีกรมเข้ม) */
              lineHeight: '1.4',
              cursor: 'pointer',
              transition: 'color 0.2s' /* ให้การเปลี่ยนสีดูนุ่มนวลขึ้น */
            }}
            title="คลิกเพื่อนำเข้าข้อมูลไปยังหน้าคำนวณภาระงาน"
          >
            {paper.title}
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> {paper.publish_year || 'N/A'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} /> {formatAuthors(paper.authors_raw)}
            </span>
            {paper.cited_by > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontWeight: '500' }}>
                <Award size={14} /> {paper.cited_by} citations
              </span>
            )}
          </div>

          {paper.journal && (
            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={14} color="#B08D38" /> 
              <span>{paper.journal} {paper.volume && `Vol.${paper.volume}`} {paper.issue && `No.${paper.issue}`}</span>
            </div>
          )}

          {paper.scholar_url && (
            <a 
              href={paper.scholar_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ fontSize: '13px', color: '#4A148C', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
            >
              <ExternalLink size={13} /> ดูที่ Google Scholar
            </a>
          )}
        </div>

        {/* ปุ่มนำไปคำนวณภาระงาน */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onImport(paper)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(109, 40, 217, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            title="นำผลงานนี้ไปกรอกในระบบคำนวณภาระงานทันที"
          >
            <Plus size={15} />
            นำไปคำนวณภาระงาน
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScholarDashboard({ onImportToForm }) {
  const [users, setUsers] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedProfId, setSelectedProfId] = useState(null);
  const [papers, setPapers] = useState([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [scholarIdInput, setScholarIdInput] = useState('');
  const [isSavingScholarId, setIsSavingScholarId] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scholarFeedback, setScholarFeedback] = useState('');
  const [scholarFeedbackType, setScholarFeedbackType] = useState('success');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const [isEditingScholarId, setIsEditingScholarId] = useState(false);

  const departments = useMemo(() => {
    const existingDepts = [...new Set(users.map(u => u.department).filter(Boolean))];
    return existingDepts.sort((a, b) => {
      const indexA = DEPARTMENT_ORDER.indexOf(a);
      const indexB = DEPARTMENT_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [users]);

  const professorsByDept = useMemo(() => {
    if (!selectedDept) return [];
    return users.filter(u => u.department === selectedDept);
  }, [users, selectedDept]);

  const currentUser = useMemo(() => {
    if (!selectedProfId) return null;
    return users.find(u => u.id === selectedProfId) || null;
  }, [users, selectedProfId]);

  const pendingCount = useMemo(() => 
    papers.filter(p => p.author_status === 'PENDING').length, [papers]);
  const confirmedCount = useMemo(() => 
    papers.filter(p => p.author_status === 'CONFIRMED').length, [papers]);
  const totalCitations = useMemo(() => 
    papers.reduce((sum, p) => sum + (Number(p.cited_by) || 0), 0), [papers]);

  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      if (filterStatus !== 'ALL' && paper.author_status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (paper.title || '').toLowerCase().includes(q);
        const authorsMatch = (paper.authors_raw || '').toLowerCase().includes(q);
        const yearMatch = String(paper.publish_year || '').includes(q);
        return titleMatch || authorsMatch || yearMatch;
      }
      return true;
    });
  }, [papers, filterStatus, searchQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Fetch users failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeDepartment = (dept) => {
    setSelectedDept(dept);
    setSelectedProfId(null);
    setScholarFeedback('');
  };

  const selectProfessor = (id) => {
    setSelectedProfId(id);
    handleUserChange(id); // ส่ง ID ไปตรงๆ เพื่อให้ฟังก์ชันทำงานได้ทันที
  };

  const clearSelection = () => {
    setSelectedProfId(null);
    setScholarFeedback('');
  };

  const handleUserChange = (id) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setScholarIdInput(user.scholar_id || '');
    }
    setScholarFeedback('');

    // 1. สั่งดึงข้อมูลเดิมจาก Database มาแสดงบนหน้าเว็บ "ทันที"
    fetchUserPapers(id);

    // 2. ถ้ามี Scholar ID ให้สั่งบอทไปดึงผลงานใหม่แบบ "เบื้องหลัง" (ไม่บล็อกหน้าจอ)
    if (user && user.scholar_id) {
      triggerScholarSync(id);
    }
  };

  const saveScholarId = async () => {
    if (!selectedProfId) return;
    setIsSavingScholarId(true);
    setScholarFeedback('');
    try {
      const res = await api.put(`/users/${selectedProfId}/scholar-id`, {
        scholarId: scholarIdInput
      });
      if (currentUser) {
        currentUser.scholar_id = res.data.user.scholar_id;
      }
      setScholarFeedback('✓ บันทึก Scholar ID สำเร็จ');
      setScholarFeedbackType('success');
      setTimeout(() => setScholarFeedback(''), 3000);
    } catch (error) {
      console.error(error);
      setScholarFeedback(error?.response?.data?.error || 'บันทึก Scholar ID ไม่สำเร็จ');
      setScholarFeedbackType('error');
    } finally {
      setIsSavingScholarId(false);
    }
  };

  const triggerScholarSync = async (targetId) => {
    // ป้องกันกรณีปุ่ม onClick ส่ง MouseEvent เข้ามาแทน ID
    const id = (typeof targetId === 'number' || typeof targetId === 'string') ? targetId : selectedProfId;
    if (!id) return;
    
    setIsSyncing(true);
    setScholarFeedback('🔄 กำลังดึงผลงานล่าสุดจาก Google Scholar แบบอัตโนมัติ...');
    setScholarFeedbackType('success'); // ใช้สีเขียวเพื่อแสดงสถานะกำลังโหลด
    
    try {
      const res = await api.post(`/sync-scholar/${id}`);
      const data = res.data.data;
      setScholarFeedback(`✓ ซิงก์อัตโนมัติสำเร็จ! (เพิ่มใหม่ ${data.created.length} รายการ, เชื่อมโยง Co-author ${data.linked.length} รายการ)`);
      setScholarFeedbackType('success');
      await fetchUserPapers(id); // ดึงข้อมูลที่เพิ่งซิงก์เสร็จมาแสดง
    } catch (error) {
      console.error(error);
      setScholarFeedback('❌ ซิงก์อัตโนมัติไม่สำเร็จ โปรดลองกดปุ่มซิงก์ใหม่อีกครั้ง');
      setScholarFeedbackType('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchUserPapers = async (targetId) => {
    const id = (typeof targetId === 'number' || typeof targetId === 'string') ? targetId : selectedProfId;
    if (!id) return;
    
    setIsLoadingPapers(true);
    try {
      const res = await api.get(`/users/${id}/papers`);
      setPapers(res.data);
    } catch (error) {
      console.error('Fetch papers failed:', error);
    } finally {
      setIsLoadingPapers(false);
    }
  };

  const handlePaperRejected = (paperId) => {
    setPapers(prev => prev.filter(p => p.paper_id !== paperId));
  };

  const handleConfirmPaper = async (paper, newContribution, isFirstAuthor, isCorresponding) => {
    try {
      await api.put(`(papers/${paper.paper_id}/confirm`, {
        userId: selectedProfId,
        contributionPercent: newContribution,
        isFirstAuthor,
        isCorresponding
      });
      setPapers(prev => prev.map(p => 
        p.paper_id === paper.paper_id 
          ? { ...p, contribution_percent: newContribution, is_first_author: isFirstAuthor, is_corresponding: isCorresponding, author_status: 'CONFIRMED' }
          : p
      ));
    } catch (error) {
      console.error('Confirm paper error:', error);
    }
  };

  const handleImportToForm = (paper) => {
    const formData = {
      title: paper.title || '',
      authors: paper.authors_raw || '',
      journal: paper.journal || '',
      doi: paper.doi || '',
      publicationDate: paper.publish_year ? `${paper.publish_year}-01-01` : '',
      volume: paper.volume || '',
      issue: paper.issue || '',
      abstract: paper.abstract || '',
      keywords: paper.keywords || '',
      authorName: currentUser?.name_th || currentUser?.name_en || '',
      correspondingAuthor: paper.corresponding_author || '',
      proportion: paper.contribution_percent || 100,
    };
    if (onImportToForm) {
      onImportToForm(formData);
    }
  };

  if (!selectedProfId) {
    return (
      <div className="scholar-list-layout">
        
        {/* คอลัมน์ซ้าย: แถบเมนูสาขาวิชา */}
        <div className="dept-sidebar-new">
          <ul className="dept-list-new">
            {departments.map((dept, index) => (
              <li
                key={index}
                onClick={() => changeDepartment(dept)}
                className={`dept-item-new ${selectedDept === dept ? 'active' : ''}`}
              >
                {dept}
                <span className="dept-count-new">
                  ({users.filter(u => u.department === dept).length})
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* คอลัมน์ขวา: รายชื่ออาจารย์ (Grid Cards) */}
        <div className="professor-grid-area-new">
          <h2 className="professor-grid-title-new">
            {selectedDept || 'กรุณาเลือกสาขาวิชา'}
          </h2>

          {!selectedDept ? (
            <div className="empty-state-new">
              <GraduationCap size={48} color="#94a3b8" />
              <p>กรุณาเลือกสาขาวิชาด้านซ้ายเพื่อดูรายชื่ออาจารย์</p>
            </div>
          ) : professorsByDept.length === 0 ? (
            <div className="empty-state-new">
              <p>ไม่มีข้อมูลอาจารย์ในสาขานี้</p>
            </div>
          ) : (
            <div className="professor-grid-new">
              {professorsByDept.map((prof) => {
                const parsed = parsePosition(prof.position);
                return (
                  <div
                    key={prof.id}
                    onClick={() => selectProfessor(prof.id)}
                    className="professor-card-new"
                  >
                    <div>
                      <h3 className="professor-name-new">
                        {prof.name_th || prof.name_en}
                      </h3>
                      <div className="professor-meta-new">
                        <p>ตำแหน่ง : {parsed.academicRank || prof.position || 'อาจารย์'}</p>
                        <p className="email">Email : {prof.email}</p>
                        {parsed.specialRoles.length > 0 && (
                          <div className="role-badges-new">
                            {parsed.specialRoles.map(role => (
                              <span key={role} className="role-badge-gold">
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {prof.scholar_id && (
                      <div className="scholar-id-footer-new">
                        <p className="scholar-id-text-new">
                          <span className="scholar-id-label-new">Scholar ID:</span> {prof.scholar_id}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* 1. ส่วนหัว: ปุ่มย้อนกลับ, ชื่ออาจารย์ และ Scholar ID (Compact UI) */}
      <div style={{ marginBottom: '32px' }}>
        <button 
          onClick={clearSelection} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', padding: 0 }}
        >
          <ChevronLeft size={16} /> ย้อนกลับไปหน้ารายชื่อ
        </button>
        <h4 style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '15px' }}>{selectedDept}</h4>
        
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ margin: 0, color: '#4A148C', fontSize: '28px', fontWeight: 'bold' }}>
            {currentUser?.name_th || currentUser?.name_en}
          </h2>

          {/* Compact Google Scholar ID Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FCFAEE', border: '1px solid #F0EAC5', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <GraduationCap size={16} color="#4A148C" />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4A148C' }}>Scholar ID:</span>

            {isEditingScholarId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="text" 
                  value={scholarIdInput} 
                  onChange={(e) => setScholarIdInput(e.target.value)}
                  placeholder="เช่น m8nS_k8AAAAJ"
                  style={{ padding: '2px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '160px', outline: 'none' }}
                  autoFocus
                />
                <button 
                  onClick={async () => {
                    await saveScholarId();
                    setIsEditingScholarId(false);
                  }}
                  disabled={isSavingScholarId}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="บันทึก"
                >
                  {isSavingScholarId ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                </button>
                <button 
                  onClick={() => {
                    setIsEditingScholarId(false);
                    setScholarIdInput(currentUser?.scholar_id || ''); // คืนค่าเดิมถ้ากดยกเลิก
                  }}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="ยกเลิก"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: currentUser?.scholar_id ? '#64748b' : '#94a3b8' }}>
                  {currentUser?.scholar_id || 'ยังไม่ระบุ'}
                </span>
                <button 
                  onClick={() => setIsEditingScholarId(true)}
                  style={{ background: 'transparent', border: 'none', color: '#B08D38', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="แก้ไข ID"
                >
                  <Edit3 size={14} />
                </button>
                
                {currentUser?.scholar_id && (
                  <button 
                    onClick={triggerScholarSync}
                    disabled={isSyncing}
                    style={{ background: '#4A148C', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: isSyncing ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px', opacity: isSyncing ? 0.7 : 1 }}
                  >
                    <RefreshCw size={12} className={isSyncing ? "spin" : ""} /> 
                    {isSyncing ? 'กำลังซิงก์...' : 'ซิงก์'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ข้อความแจ้งเตือน (สำเร็จ/ผิดพลาด) */}
        {scholarFeedback && (
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: scholarFeedbackType === 'error' ? '#ef4444' : '#166534', fontWeight: '500' }}>
            {scholarFeedback}
          </p>
        )}
      </div>

      {/* 2. กล่องสถิติ (Stats Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'ผลงานทั้งหมด', value: papers.length, icon: <BookOpen size={24} />, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'รอยืนยัน (% ภาระงาน)', value: pendingCount, icon: <Clock size={24} />, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'ยืนยันเรียบร้อยแล้ว', value: confirmedCount, icon: <CheckCircle2 size={24} />, color: '#10b981', bg: '#dcfce7' },
          { label: 'ยอดการอ้างอิงรวม', value: totalCitations, icon: <Award size={24} />, color: '#8b5cf6', bg: '#f3e8ff' }
        ].map((stat, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ background: stat.bg, color: stat.color, padding: '12px', borderRadius: '8px', display: 'flex' }}>
              {stat.icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{stat.value}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. แถบค้นหาและตัวกรอง (Toolbar) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', minWidth: '300px', flex: '1' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อผลงาน, ผู้ร่วมวิจัย..." 
            style={{ border: 'none', outline: 'none', width: '100%', marginLeft: '8px', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: `ทั้งหมด (${papers.length})` },
            { id: 'PENDING', label: `รอยืนยัน (${pendingCount})` },
            { id: 'CONFIRMED', label: `ยืนยันแล้ว (${confirmedCount})` }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                background: filterStatus === tab.id ? '#4A148C' : 'white',
                color: filterStatus === tab.id ? 'white' : '#64748b',
                border: `1px solid ${filterStatus === tab.id ? '#4A148C' : '#cbd5e1'}`,
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: filterStatus === tab.id ? 'bold' : 'normal',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. รายการผลงาน (Papers List) */}
      {isLoadingPapers ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <p>กำลังโหลดรายการผลงานวิชาการ...</p>
        </div>
      ) : filteredPapers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPapers.map(paper => (
            <PaperCard 
              key={paper.paper_id}
              paper={paper}
              currentUser={currentUser}
              onConfirm={handleConfirmPaper}
              onReject={handlePaperRejected}
              onImport={handleImportToForm}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>ไม่พบรายการผลงาน</h3>
          {searchQuery ? (
            <p style={{ color: '#64748b', margin: 0 }}>ไม่พบบทความที่ตรงกับคำค้นหา "{searchQuery}"</p>
          ) : filterStatus === 'PENDING' ? (
            <p style={{ color: '#64748b', margin: 0 }}>ยอดเยี่ยมมาก! ไม่มีผลงานค้างรอยืนยันในขณะนี้</p>
          ) : (
            <p style={{ color: '#64748b', margin: 0 }}>ยังไม่มีข้อมูลผลงานวิชาการในระบบ สามารถกดแก้ไข ID ด้านบนเพื่อดึงข้อมูล</p>
          )}
        </div>
      )}
    </div>
  );
}