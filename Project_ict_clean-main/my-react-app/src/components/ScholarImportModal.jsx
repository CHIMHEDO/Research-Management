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
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

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
  const [scopusTab, setScopusTab] = useState('scopus-search'); // 'google' | 'scopus-search' | 'scopus-papers'
  const [scopusAuthorName, setScopusAuthorName] = useState('');
  const [scopusAuthors, setScopusAuthors] = useState([]);
  const [scopusPapers, setScopusPapers] = useState([]);
  const [scopusLoading, setScopusLoading] = useState(false);
  const [scopusFetchingDetail, setScopusFetchingDetail] = useState(false);
  const [selectedScopusPaper, setSelectedScopusPaper] = useState(null);

  // ดึงรายชื่ออาจารย์ทั้งหมดและล็อคให้เป็นผู้ใช้ที่ล็อกอินอยู่เท่านั้น
  useEffect(() => {
    if (!isOpen) return;
    api.get('/users')
      .then(res => {
        setUsers(res.data);
        if (user) {
          const matched = res.data.find(u => u.id === user.id || u.email === user.email);
          setSelectedUserId(matched ? matched.id : (user.id || res.data[0]?.id || null));
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

  const handleChoose = async (paper) => {
    if (onSelectPaper) {
      if (paper.scholar_url) {
        setFetchingDetail(true);
        try {
          const res = await api.post('/scholar/paper-detail', {
            detailUrl: paper.scholar_url
          });
          const detail = res.data;
          // Smart merge: only override paper fields with non-empty detail values
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
        }
      } else {
        onSelectPaper(paper, currentUserObj);
      }
    }
    onClose();
  };

  // === SCOPUS LOGIC ===
  const handleSearchAuthor = async (e) => {
    if (e) e.preventDefault();
    if (!scopusAuthorName.trim()) return;
    setScopusLoading(true);
    setScopusTab('scopus-search');
    try {
      const res = await api.get(`/scopus/authors/${encodeURIComponent(scopusAuthorName.trim())}`);
      setScopusAuthors(res.data);
      setScopusPapers([]);
      setSelectedScopusPaper(null);
      setScopusTab(res.data.length > 0 ? 'scopus-papers' : 'scopus-search');
    } catch (err) {
      console.error('Search author error:', err);
      setFeedback({ text: 'ค้นหาอาจารย์ไม่สำเร็จ', type: 'error' });
    } finally {
      setScopusLoading(false);
    }
  };

  const handleSelectAuthor = async (authorId) => {
    setScopusLoading(true);
    try {
      const res = await api.get(`/scopus/author-papers/${authorId}`);
      setScopusPapers(res.data);
      setScopusTab('scopus-papers');
      setSelectedScopusPaper(null);
    } catch (err) {
      console.error('Fetch author papers error:', err);
      setFeedback({ text: 'ไม่สามารถดึงรายการเปเปอร์ได้', type: 'error' });
    } finally {
      setScopusLoading(false);
    }
  };

  const handleSelectScopusPaper = async (paper) => {
    setScopusFetchingDetail(true);
    setSelectedScopusPaper(paper);
    try {
      const res = await api.get(`/scopus/paper/${paper.eid}`);
      const detail = res.data;
      const mergedPaper = {
        ...paper,
        ...detail,
        title: paper.title || detail.title,
        authors_raw: detail.authors?.join(', ') || paper.authors || '',
        publish_year: paper.year || detail.publishDate?.substring(0, 4) || null,
        journal: detail.journal || '',
        abstract: detail.abstract || '',
        doi: detail.doi || '',
        keywords: detail.keywords || [],  // 🌟 ADD: Include keywords from Scopus detail API
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
              onClick={() => { setScopusTab('scopus-search'); setFeedback({ text: '', type: '' }); }}
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
          {scopusTab !== 'google' && (
            <div>
              {/* Author Search */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={scopusAuthorName}
                  onChange={(e) => setScopusAuthorName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAuthor(e)}
                  placeholder="พิมพ์ชื่ออาจารย์ (เช่น John Smith)..."
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearchAuthor}
                  disabled={scopusLoading || !scopusAuthorName.trim()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: '#7c3aed', color: 'white', border: 'none',
                    padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: '600', cursor: scopusLoading ? 'not-allowed' : 'pointer',
                    opacity: scopusLoading ? 0.7 : 1, whiteSpace: 'nowrap'
                  }}
                >
                  {scopusLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                  ค้นหา
                </button>
              </div>

              {/* Author List */}
              {scopusAuthors.length > 0 && scopusTab === 'scopus-search' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
                    พบอาจารย์ {scopusAuthors.length} ท่าน:
                  </div>
                  {scopusAuthors.map((a, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleSelectAuthor(a.authorId)}
                      style={{
                        background: 'none', border: 'none', padding: '10px 14px',
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        borderRadius: '8px', marginBottom: '6px',
                        background: 'white', border: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontFamily: 'inherit'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#c084fc'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{a.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{a.affiliation}</div>
                      </div>
                      <ArrowRight size={16} color="#7c3aed" />
                    </button>
                  ))}
                </div>
              )}

              {/* Paper List */}
              {scopusPapers.length > 0 && scopusTab === 'scopus-papers' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      รายการเปเปอร์ของอาจารย์ (คลิกเลือกเพื่อดูรายละเอียด):
                    </div>
                    <button
                      type="button"
                      onClick={() => setScopusTab('scopus-search')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: 'none', border: '1px solid #cbd5e1', color: '#475569',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      <ArrowLeft size={12} /> กลับไปค้นหา
                    </button>
                  </div>
                  {scopusPapers.map((paper, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleSelectScopusPaper(paper)}
                      style={{
                        background: 'none', border: 'none', padding: '10px 14px',
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        borderRadius: '8px', marginBottom: '6px', transition: 'all 0.15s ease',
                        background: selectedScopusPaper?.eid === paper.eid ? '#f5f3ff' : 'white',
                        border: `1px solid ${selectedScopusPaper?.eid === paper.eid ? '#c084fc' : '#e2e8f0'}`,
                        fontFamily: 'inherit'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', lineHeight: '1.4' }}>{paper.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {paper.year} • {paper.journal} • {paper.citedBy > 0 ? `${paper.citedBy} citations` : ''}
                          </div>
                        </div>
                        {scopusFetchingDetail && selectedScopusPaper?.eid === paper.eid && (
                          <Loader2 size={16} className="spin" color="#7c3aed" />
                        )}
                        {!scopusFetchingDetail && <Plus size={16} color="#7c3aed" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Loading */}
              {scopusLoading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Loader2 size={24} className="spin" color="#7c3aed" />
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>กำลังดึงข้อมูล...</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ GOOGLE SCHOLAR TAB ═══ */}
          {scopusTab === 'google' ? <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>
                อาจารย์ผู้จัดทำ:
              </span>
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
                gap: '8px'
              }}>
                <UserCheck size={16} color="#7c3aed" />
                <span>{currentUserObj?.name_th || currentUserObj?.name_en || currentUserObj?.full_name || user?.full_name || user?.name_th || user?.name_en || user?.email}</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '6px' }}>
                  {currentUserObj?.department || user?.department || 'ICT'}
                </span>
              </div>
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
                        background: fetchingDetail ? '#94a3f8' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
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
                      {fetchingDetail ? (
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
    </div> 
  );
}