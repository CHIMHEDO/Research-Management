import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Search,
  RefreshCw,
  X,
  BookOpen,
  Calendar,
  Users,
  Award,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  GitBranch,
  Sparkles,
  Loader2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AcademicSyncLoadingModal from './AcademicSyncLoadingModal';

export default function ScholarImportModal({ isOpen, onClose, onSelectPaper }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Scopus state
  const [scopusTab, setScopusTab] = useState('google'); // 'google' | 'scopus'
  const [authorsList, setAuthorsList] = useState([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [scopusPapers, setScopusPapers] = useState([]);
  const [scopusLoading, setScopusLoading] = useState(false);
  const [scopusFetchingDetail, setScopusFetchingDetail] = useState(false);
  const [selectedScopusPaper, setSelectedScopusPaper] = useState(null);

  const isAdmin = user?.role === 'admin';

  // ดึงรายชื่ออาจารย์ทั้งหมดและล็อคให้เป็นผู้ใช้ที่ล็อกอินอยู่เท่านั้น (ยกเว้น admin)
  useEffect(() => {
    if (!isOpen) return;
    api.get('/users')
      .then(res => {
        const rawUsers = res.data || [];
        const isUserAdmin = user?.role === 'admin';

        if (!isUserAdmin && user) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const userNameTh = (user.name_th || '').trim();
          const userNameEn = (user.name_en || '').trim();
          const userFullName = (user.full_name || '').trim();

          const myUser = rawUsers.find(u =>
            (user.id && u.id === user.id) ||
            (userEmail && u.email && u.email.toLowerCase().trim() === userEmail) ||
            (userNameTh && u.name_th && u.name_th.includes(userNameTh)) ||
            (userNameEn && u.name_en && u.name_en.includes(userNameEn)) ||
            (userFullName && u.full_name && u.full_name.includes(userFullName))
          );

          const effectiveUser = myUser || {
            id: user.id || 1,
            name_th: user.name_th || user.full_name || '',
            name_en: user.name_en || '',
            full_name: user.full_name || user.name_th || user.name_en || '',
            email: user.email || '',
            department: user.department || 'ICT',
            scopus_id: user.scopus_id || null,
            scholar_id: user.scholar_id || null
          };

          setUsers([effectiveUser]);
          setAuthorsList([effectiveUser]);
          setSelectedUserId(effectiveUser.id);
          setSelectedAuthorId(String(effectiveUser.id));
        } else {
          setUsers(rawUsers);
          setAuthorsList(rawUsers);
          if (user) {
            const matched = rawUsers.find(u => u.id === user.id || u.email === user.email);
            const targetId = matched ? matched.id : (user.id || rawUsers[0]?.id || null);
            setSelectedUserId(targetId);
            setSelectedAuthorId(targetId ? String(targetId) : '');
          }
        }
      })
      .catch(err => console.error('Fetch users error:', err));
  }, [isOpen, user]);

  // ดึงผลงานของอาจารย์ที่เลือก
  const fetchPapers = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/users/${userId}/papers`);
      setPapers(res.data || []);
    } catch (err) {
      console.error('Fetch user papers error:', err);
      setFeedback({ text: 'ไม่สามารถดึงข้อมูลผลงานได้', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId && isOpen) {
      fetchPapers(selectedUserId);
      setFeedback({ text: '', type: '' });
    }
  }, [selectedUserId, isOpen, fetchPapers]);

  // ซิงก์ผลงานล่าสุดจาก Google Scholar
  const handleSync = async () => {
    if (!selectedUserId) return;
    setSyncing(true);
    setFeedback({ text: '🔄 กำลังดึงข้อมูลล่าสุดจาก Google Scholar...', type: 'info' });
    try {
      const res = await api.post(`/sync-scholar/${selectedUserId}`);
      const data = res.data.data;
      setFeedback({
        text: `✓ ซิงก์ข้อมูลสำเร็จ (เพิ่มใหม่ ${data?.created?.length || 0} รายการ)`,
        type: 'success'
      });
      await fetchPapers(selectedUserId);
    } catch (err) {
      console.error('Sync scholar error:', err);
      setFeedback({ text: 'ซิงก์ข้อมูลไม่สำเร็จ โปรดลองใหม่อีกครั้ง', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // กรองผลงานตามคำค้นหา
  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return papers;
    const q = searchQuery.toLowerCase().trim();
    return papers.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.authors_raw && p.authors_raw.toLowerCase().includes(q)) ||
      (p.publish_year && String(p.publish_year).includes(q)) ||
      (p.journal && p.journal.toLowerCase().includes(q))
    );
  }, [papers, searchQuery]);

  const currentUserObj = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const [activeLoadingPaperId, setActiveLoadingPaperId] = useState(null);

  const handleChoose = async (paper) => {
    console.log('[ScholarImportModal] Selected paper directly:', paper);
    if (onSelectPaper) {
      if (paper.scholar_url) {
        setFetchingDetail(true);
        setActiveLoadingPaperId(paper.paper_id || paper.id || paper.title);
        try {
          const res = await api.post('/scholar/paper-detail', {
            detailUrl: paper.scholar_url
          });
          const detail = res.data;
          // Smart merge: only override paper fields with non-empty detail values
          // Pass raw merged paper - normalization happens in handleImportFromScholar
          const mergedPaper = {
            ...paper,
            ...detail,
            title: detail.title || paper.title || '',
            authors_raw: detail.authors || paper.authors_raw || '',
            journal: detail.journal || paper.journal || '',
            doi: detail.doi || paper.doi || '',
            abstract: detail.abstract || paper.abstract || '',
            volume: detail.volume || paper.volume || '',
            issue: detail.issue || paper.issue || '',
            publicationDate: detail.publication_date || paper.publicationDate || paper.publish_year || '',
            keywords: detail.keywords || paper.keywords || '',
          };
          onSelectPaper(mergedPaper, currentUserObj);
        } catch (err) {
          console.error('Failed to fetch paper detail:', err);
          onSelectPaper(paper, currentUserObj);
        } finally {
          setFetchingDetail(false);
          setActiveLoadingPaperId(null);
        }
      } else {
        onSelectPaper(paper, currentUserObj);
      }
    }
    onClose();
  };

  const handleSelectScopusPaper = async (paper) => {
    console.log('[ScholarImportModal] Selected Scopus paper directly:', paper);
    setScopusFetchingDetail(true);
    setSelectedScopusPaper(paper);
    try {
      const res = await api.get(`/scopus/paper/${paper.eid}`);
      const detail = res.data;
      // Pass raw merged paper - normalization happens in handleImportFromScholar
      const mergedPaper = {
        ...paper,
        ...detail,
        title: paper.title || detail.title,
        authors_raw: detail.authors?.join(', ') || paper.authors || '',
        publish_year: paper.year || detail.publishDate?.substring(0, 4) || null,
        journal: detail.journal || '',
        abstract: detail.abstract || '',
        doi: detail.doi || '',
        keywords: detail.keywords || [],
        scholar_url: `https://www.scopus.com/abstract/uri/eid/${paper.eid}`
      };
      onSelectPaper(mergedPaper, currentUserObj);
      onClose();
    } catch (err) {
      console.error('Fetch paper detail error:', err);
      setFeedback({ text: 'ดึงข้อมูลเปเปอร์ไม่สำเร็จ', type: 'error' });
    } finally {
      setScopusFetchingDetail(false);
    }
  };

  // ฟังก์ชันช่วยจัดกลุ่มและเรนเดอร์ Dropdown (รองรับทั้ง Scholar และ Scopus)
  const renderGroupedSelect = (list, selectedId, onChange, isNumericId = false, isScopus = false) => {
    const grouped = (list || []).reduce((acc, item) => {
      const groupKey = isScopus
        ? (item.affiliation || 'อื่นๆ / ไม่ระบุสังกัด')
        : (item.department || item.branch || item.major || 'อื่นๆ / ไม่ระบุสาขา');

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {});

    return (
      <select
        value={selectedId || ''}
        onChange={(e) => onChange(isNumericId ? Number(e.target.value) : e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          outline: 'none',
          fontSize: '14px',
          backgroundColor: '#fff'
        }}
      >
        <option value="">{isScopus ? '-- เลือกอาจารย์จาก Scopus --' : '-- เลือกอาจารย์ / บุคลากร --'}</option>
        {Object.entries(grouped).map(([groupName, items]) => (
          <optgroup key={groupName} label={`📂 ${groupName}`}>
            {items.map((item) => {
              const itemId = isScopus ? item.authorId : item.id;
              const itemName = isScopus ? item.name : (item.name_th || item.name_en || item.full_name);

              return (
                <option key={itemId} value={itemId}>
                  {'  '}{itemName}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
    );
  };

  // ฟังก์ชันดึงข้อมูล Scopus papers โดยใช้ scopus_id ของอาจารย์ที่เลือก
  const fetchScopusPapers = useCallback(async () => {
    if (!selectedAuthorId) return;
    const author = authorsList.find(a => a.id.toString() === selectedAuthorId.toString());
    if (!author?.scopus_id) return;
    setScopusLoading(true);
    try {
      const res = await api.get(`/scopus/author-papers/${author.scopus_id}`);
      setScopusPapers(res.data.papers || res.data);
    } catch (err) {
      console.error('Scopus fetch error:', err);
      setScopusPapers([]);
    } finally {
      setScopusLoading(false);
    }
  }, [selectedAuthorId, authorsList]);

  // Auto-fetch Scopus papers เมื่อเลือกอาจารย์
  useEffect(() => {
    if (!selectedAuthorId) {
      setScopusPapers([]);
      return;
    }
    const author = authorsList.find(a => a.id.toString() === selectedAuthorId.toString());
    if (!author?.scopus_id) {
      setScopusPapers([]);
      return;
    }
    fetchScopusPapers();
  }, [selectedAuthorId, authorsList, fetchScopusPapers]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container scholar-import-modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '840px', width: '95%' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #f3e8ff 100%)' }}>
          <div className="modal-title" style={{ color: '#4c1d95', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#7c3aed', padding: '8px', borderRadius: '10px', color: 'white', display: 'flex' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>เลือกผลงานจาก Google Scholar</div>
              <div style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 'normal' }}>
                ดึงข้อมูลผลงานวิจัยมาใส่ในระบบคำนวณภาระงานอัตโนมัติ
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>

          {/* Tab Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => { setScopusTab('google'); setFeedback({ text: '', type: '' }); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: scopusTab !== 'scopus' ? '#7c3aed' : '#e2e8f0',
                color: scopusTab !== 'scopus' ? 'white' : '#64748b',
                fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <GraduationCap size={14} /> Google Scholar
            </button>
            <button
              type="button"
              onClick={() => { setScopusTab('scopus'); setFeedback({ text: '', type: '' }); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: scopusTab !== 'google' ? '#7c3aed' : '#e2e8f0',
                color: scopusTab !== 'google' ? 'white' : '#64748b',
                fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Sparkles size={14} /> Scopus
            </button>
          </div>

{/* ═══ SCOPUS TAB ═══ */}
            {scopusTab === 'scopus' && (
              <div style={{ marginTop: '16px' }}>
                
                {/* โซนค้นหาและปุ่ม Refresh */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  background: '#f9fafb', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ width: '100%' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '6px' }}>
                      อาจารย์ผู้จัดทำ (Scopus)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        {isAdmin ? (
                          renderGroupedSelect(authorsList, selectedAuthorId, setSelectedAuthorId, true, false)
                        ) : (
                          <div style={{
                            padding: '10px 14px',
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <UserCheck size={16} color="#7c3aed" />
                            <span>{currentUserObj?.name_th || currentUserObj?.name_en || currentUserObj?.full_name || user?.full_name || user?.name_th || user?.name_en || user?.email}</span>
                            <span style={{ fontSize: '11px', fontWeight: 'normal', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '6px' }}>
                              {currentUserObj?.department || user?.department || 'ICT'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        type="button"
                        onClick={fetchScopusPapers}
                        disabled={scopusLoading || !selectedAuthorId}
                        style={{ 
                          padding: '10px', 
                          backgroundColor: scopusLoading || !selectedAuthorId ? '#f3f4f6' : '#f5f3ff', 
                          color: scopusLoading || !selectedAuthorId ? '#9ca3af' : '#7c3aed', 
                          borderRadius: '8px', 
                          border: scopusLoading || !selectedAuthorId ? '1px solid #e5e7eb' : '1px solid #ddd6fe', 
                          fontWeight: '600', 
                          fontSize: '14px',
                          cursor: scopusLoading || !selectedAuthorId ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '44px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          opacity: scopusLoading || !selectedAuthorId ? 0.7 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <RefreshCw size={18} className={scopusLoading ? 'spin' : ''} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ข้อความสรุปจำนวน */}
                {scopusPapers && scopusPapers.length > 0 && (
                  <p style={{ fontSize: '14px', color: '#4b5563', fontWeight: '500', marginBottom: '12px' }}>
                    พบทั้งหมด <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>{scopusPapers.length}</span> รายการ 
                    <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '12px', marginLeft: '6px' }}>(คลิก "นำไปคำนวณ" เพื่อกรอกข้อมูลลงฟอร์ม)</span>
                  </p>
                )}

                {/* ลิสต์รายการผลงานแบบ Card */}
                <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {scopusPapers && scopusPapers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {scopusPapers.map((paper, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            padding: '16px', 
                            backgroundColor: '#ffffff', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', lineHeight: '1.4', margin: '0 0 8px 0' }}>
                              {paper.title}
                            </h4>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#6b7280', alignItems: 'center' }}>
                              <span style={{ backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '6px', fontWeight: '500', color: '#374151' }}>
                                🗓️ {paper.publish_year || paper.year || 'N/A'}
                              </span>
                              <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📖 {paper.journal || paper.source || 'ไม่มีข้อมูลวารสาร'}
                              </span>
                              {paper.citedBy > 0 && (
                                <span style={{ color: '#7c3aed', fontWeight: '500' }}>
                                  🔗 {paper.citedBy} citations
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                              type="button"
                              onClick={() => handleSelectScopusPaper(paper)}
                              style={{ 
                                padding: '8px 16px', 
                                backgroundColor: '#f5f3ff', 
                                color: '#6d28d9', 
                                borderRadius: '8px', 
                                border: '1px solid #ddd6fe', 
                                fontSize: '13px', 
                                fontWeight: '600', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              + นำไปคำนวณ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* กรณีซิงก์แล้วแต่ไม่พบข้อมูล หรือยังไม่ได้ซิงก์ */
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px', 
                      border: '2px dashed #e5e7eb', 
                      borderRadius: '12px', 
                      backgroundColor: '#f9fafb',
                      marginTop: '10px'
                    }}>
                      {selectedAuthorId ? (
                        <p style={{ color: '#6b7280', fontWeight: '500', margin: '0 0 4px 0' }}>ไม่พบผลงาน Scopus สำหรับอาจารย์ท่านนี้</p>
                      ) : (
                        <p style={{ color: '#6b7280', fontWeight: '500', margin: '0 0 4px 0' }}>ยังไม่มีข้อมูลผลงาน Scopus</p>
                      )}
                      <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
                        {selectedAuthorId 
                          ? 'ลองกดปุ่ม Refresh หรือเลือกอาจารย์ท่านอื่น'
                          : 'กรุณาเลือกอาจารย์และกดปุ่ม Refresh ด้านบน'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* ═══ GOOGLE SCHOLAR TAB ═══ */}
          {scopusTab === 'google' ? <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>
                อาจารย์ผู้จัดทำ:
              </span>
              {isAdmin ? (
                <select
                  className="form-control"
                  style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }}
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name_th || u.name_en || u.full_name} ({u.department || 'ICT'})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: '6px 14px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%'
                }}>
                  <UserCheck size={16} color="#7c3aed" />
                  <span>{currentUserObj?.name_th || currentUserObj?.name_en || currentUserObj?.full_name || user?.full_name || user?.name_th || user?.name_en || user?.email}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'normal', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '6px' }}>
                    {currentUserObj?.department || user?.department || 'ICT'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)'
              }}
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              {syncing ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูล Scholar'}
            </button>
          </div>

          {feedback.text && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                background: feedback.type === 'error' ? '#fef2f2' : feedback.type === 'info' ? '#f5f3ff' : '#f0fdf4',
                color: feedback.type === 'error' ? '#b91c1c' : feedback.type === 'info' ? '#6d28d9' : '#15803d',
                border: `1px solid ${feedback.type === 'error' ? '#fecaca' : feedback.type === 'info' ? '#ddd6fe' : '#bbf7d0'}`
              }}
            >
              {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผลงาน, ผู้แต่ง, ปีที่พิมพ์..."
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', marginLeft: '8px', fontSize: '13px' }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Papers List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: '#7c3aed' }} />
              <p style={{ margin: 0, fontSize: '14px' }}>กำลังโหลดรายการผลงาน Google Scholar...</p>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <GraduationCap size={40} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>
                {searchQuery ? 'ไม่พบผลงานที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลผลงาน Google Scholar ของอาจารย์ท่านนี้'}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {searchQuery ? 'ลองพิมพ์ค้นหาด้วยคำอื่น' : 'สามารถกดปุ่ม "ซิงก์ข้อมูล Scholar" ด้านบนเพื่อดึงผลงานอัตโนมัติ'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '-4px' }}>
                พบทั้งหมด {filteredPapers.length} รายการ (คลิก "นำไปคำนวณ" เพื่อกรอกข้อมูลลงฟอร์ม)
              </div>
              {filteredPapers.map((paper) => (
                <div
                  key={paper.paper_id}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#c084fc';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.08)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 
                      style={{ 
                        margin: '0 0 6px 0', 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: '#1e293b', 
                        lineHeight: 1.4 
                      }}
                    >
                      {paper.title}
                    </h4>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      {paper.publish_year && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> {paper.publish_year}
                        </span>
                      )}
                      {paper.authors_raw && (
                        <span 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            maxWidth: '320px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} 
                          title={paper.authors_raw}
                        >
                          <Users size={13} /> {paper.authors_raw}
                        </span>
                      )}
                      {paper.cited_by > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7c3aed', fontWeight: '600' }}>
                          <Award size={13} /> {paper.cited_by} citations
                        </span>
                      )}
                    </div>

                    {paper.journal && (
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} color="#b45309" />
                        <span>{paper.journal} {paper.volume && `Vol.${paper.volume}`}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleChoose(paper)}
                      disabled={fetchingDetail}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: activeLoadingPaperId === (paper.paper_id || paper.id || paper.title) ? '#94a3f8' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: fetchingDetail ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(109, 40, 217, 0.3)',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        opacity: fetchingDetail ? 0.7 : 1
                      }}
                      onMouseOver={(e) => { if (!fetchingDetail) e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      {activeLoadingPaperId === (paper.paper_id || paper.id || paper.title) ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          กำลังดึงข้อมูล...
                        </>
                      ) : (
                        <>
                          <Plus size={15} />
                          นำไปคำนวณ
                        </>
                      )}
                    </button>

                    {paper.scholar_url && (
                      <a
                        href={paper.scholar_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '11px', color: '#7c3aed', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <ExternalLink size={11} /> ดูใน Scholar
                      </a>
                    )}
                  </div> 
                </div>
              ))}
            </div>
          )}
        </div>
      : null} 

        </div> 
      </div> 

      {/* 🚀 Academic Database Live Loading Modal */}
      <AcademicSyncLoadingModal
        isOpen={syncing || scopusLoading || fetchingDetail || scopusFetchingDetail}
        source={
          scopusLoading ? 'scopus' :
          syncing ? 'scholar' :
          (fetchingDetail || scopusFetchingDetail) ? 'detail' : 'scholar'
        }
        customTitle={scopusLoading ? 'กำลังซิงค์ข้อมูลผู้ใช้' : 'กำลังดึงข้อมูล'}
      />
    </div> 
  );
}