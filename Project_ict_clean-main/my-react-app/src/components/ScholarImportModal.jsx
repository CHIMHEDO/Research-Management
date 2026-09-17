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
  UserCheck
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
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // ดึงรายชื่ออาจารย์ทั้งหมด
  useEffect(() => {
    if (!isOpen) return;
    api.get('/users')
      .then(res => {
        setUsers(res.data);
        // Default เลือกอาจารย์ที่ล็อกอินอยู่ หรือคนแรก
        if (user && user.id) {
          const matched = res.data.find(u => u.id === user.id || u.email === user.email);
          setSelectedUserId(matched ? matched.id : res.data[0]?.id || null);
        } else if (res.data.length > 0) {
          setSelectedUserId(res.data[0].id);
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

  const handleChoose = (paper) => {
    if (onSelectPaper) {
      onSelectPaper(paper, currentUserObj);
    }
    onClose();
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
          
          {/* Top Controls: User Selector & Sync Button */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>
                อาจารย์ผู้จัดทำ:
              </span>
              <select
                className="form-control"
                style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name_th || u.name_en || u.full_name} ({u.department || 'ICT'})
                  </option>
                ))}
              </select>
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

          {/* Feedback Message */}
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
                        boxShadow: '0 2px 6px rgba(109, 40, 217, 0.3)',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Plus size={15} />
                      นำไปคำนวณ
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
      </div>
    </div>
  );
}
