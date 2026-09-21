import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Search, 
  Users, 
  Layers, 
  ShieldAlert, 
  Pencil, 
  FileText,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { checkPaperCompleteness } from '../utils/validation';

// ฟังก์ชันคำนวณความคล้ายกันของข้อความแบบง่าย (Dice's Coefficient บน Bigram)
function stringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0;

  const firstBigrams = new Map();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substr(i, 2);
    const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;
    firstBigrams.set(bigram, count);
  }

  let intersectionSize = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substr(i, 2);
    const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (s1.length + s2.length - 2);
}

export default function AdminDuplicateCheck({ entries = [], onEditEntry }) {
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, DUPLICATES, CONFLICTS, INCOMPLETE
  const [searchQuery, setSearchQuery] = useState('');

  // 1. วิเคราะห์และจัดกลุ่มผลงานที่ซ้ำซ้อน (Duplicate Groups)
  const duplicateGroups = useMemo(() => {
    const groups = [];
    const visited = new Set();

    for (let i = 0; i < entries.length; i++) {
      if (visited.has(entries[i].id)) continue;

      const current = entries[i];
      const cluster = [current];

      for (let j = i + 1; j < entries.length; j++) {
        if (visited.has(entries[j].id)) continue;
        const candidate = entries[j];

        // ตรวจสอบความซ้ำด้วย DOI หรือความคล้ายของชื่อเรื่อง >= 85%
        const matchDoi = current.doi && candidate.doi && current.doi.trim().toLowerCase() === candidate.doi.trim().toLowerCase();
        const simTitle = stringSimilarity(current.title, candidate.title);
        const matchTitle = simTitle >= 0.85;

        if (matchDoi || matchTitle) {
          cluster.push({
            ...candidate,
            matchReason: matchDoi ? `ตรงกันด้วยเลข DOI: ${current.doi}` : `ชื่อเรื่องตรงกัน ${Math.round(simTitle * 100)}%`
          });
          visited.add(candidate.id);
        }
      }

      if (cluster.length > 1) {
        visited.add(current.id);
        
        // ตรวจสอบสัดส่วนผลรวมผู้แต่ง
        const totalProportionClaimed = cluster.reduce((sum, item) => sum + (Number(item.proportion) || 0), 0);
        const hasConflict = totalProportionClaimed > 100;

        groups.push({
          groupId: `group-${current.id}`,
          primaryTitle: current.title,
          cluster,
          totalProportion: totalProportionClaimed,
          hasConflict
        });
      }
    }

    return groups;
  }, [entries]);

  // 2. วิเคราะห์ผลงานที่ไม่สมบูรณ์ (Incomplete Papers)
  const incompletePapers = useMemo(() => {
    return entries.map(entry => {
      const completeness = checkPaperCompleteness(entry);
      return {
        ...entry,
        completeness
      };
    }).filter(entry => entry.completeness.isIncomplete);
  }, [entries]);

  // ตัวนับสถิติ
  const duplicatePaperCount = duplicateGroups.reduce((sum, g) => sum + g.cluster.length, 0);
  const conflictCount = duplicateGroups.filter(g => g.hasConflict).length;

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ background: '#e11d48', padding: '10px', borderRadius: '12px', color: 'white', display: 'flex' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
              ระบบตรวจสอบผลงานซ้ำซ้อน & สัดส่วนผู้ร่วมงาน (Duplicate & Co-author Validation)
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              ตรวจสอบผลงานที่มีชื่อเรื่องหรือ DOI ตรงกันข้ามอาจารย์ พร้อมคำนวณสัดส่วนผู้แต่งรวมไม่ให้เกิน 100%
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div 
          onClick={() => setFilterMode('DUPLICATES')}
          style={{ 
            background: 'white', 
            padding: '18px 20px', 
            borderRadius: '14px', 
            border: filterMode === 'DUPLICATES' ? '2px solid #e11d48' : '1px solid #e2e8f0', 
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)' 
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>กลุ่มผลงานที่ซ้ำซ้อน</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#e11d48', marginTop: '6px' }}>{duplicateGroups.length} กลุ่ม</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>รวม {duplicatePaperCount} รายการที่ทับซ้อน</div>
        </div>

        <div 
          onClick={() => setFilterMode('CONFLICTS')}
          style={{ 
            background: 'white', 
            padding: '18px 20px', 
            borderRadius: '14px', 
            border: filterMode === 'CONFLICTS' ? '2px solid #f59e0b' : '1px solid #e2e8f0', 
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)' 
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>สัดส่วนผู้ร่วมงานขัดแย้ง (&gt;100%)</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>{conflictCount} เรื่อง</div>
          <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: '600' }}>ต้องปรับปรุงสัดส่วนให้พอดี 100%</div>
        </div>

        <div 
          onClick={() => setFilterMode('INCOMPLETE')}
          style={{ 
            background: 'white', 
            padding: '18px 20px', 
            borderRadius: '14px', 
            border: filterMode === 'INCOMPLETE' ? '2px solid #d97706' : '1px solid #e2e8f0', 
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)' 
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>ผลงานที่ข้อมูลไม่สมบูรณ์</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{incompletePapers.length} รายการ</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>ขาด DOI / วันที่ / วารสาร</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setFilterMode('ALL')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: filterMode === 'ALL' ? '#7c3aed' : '#f1f5f9',
            color: filterMode === 'ALL' ? 'white' : '#475569',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          แสดงทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('DUPLICATES')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: filterMode === 'DUPLICATES' ? '#e11d48' : '#f1f5f9',
            color: filterMode === 'DUPLICATES' ? 'white' : '#475569',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          ผลงานซ้ำซ้อน ({duplicateGroups.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('INCOMPLETE')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: filterMode === 'INCOMPLETE' ? '#d97706' : '#f1f5f9',
            color: filterMode === 'INCOMPLETE' ? 'white' : '#475569',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          ข้อมูลไม่สมบูรณ์ ({incompletePapers.length})
        </button>
      </div>

      {/* Group List */}
      {(filterMode === 'ALL' || filterMode === 'DUPLICATES' || filterMode === 'CONFLICTS') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#e11d48" />
            <span>รายการผลงานที่ตรวจพบว่าซ้ำซ้อน ({duplicateGroups.length} กลุ่ม)</span>
          </h2>

          {duplicateGroups.length === 0 ? (
            <div style={{ background: 'white', padding: '32px', borderRadius: '12px', textAlign: 'center', color: '#10b981', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: '700', fontSize: '15px' }}>ไม่พบผลงานที่ซ้ำซ้อนในระบบ</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>ผลงานทั้งหมดมีข้อมูลเป็นเอกเทศและสัดส่วนถูกต้อง</div>
            </div>
          ) : (
            duplicateGroups.map((group, gIdx) => (
              <div key={group.groupId} style={{ background: 'white', borderRadius: '14px', border: group.hasConflict ? '2px solid #fca5a5' : '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b' }}>
                      กลุ่มที่ {gIdx + 1}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '8px 0 4px 0' }}>
                      {group.primaryTitle}
                    </h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>ผลรวมสัดส่วนที่อาจารย์ยื่น:</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: group.hasConflict ? '#dc2626' : '#059669' }}>
                      {group.totalProportion}% {group.hasConflict && '⚠️ เกิน 100%!'}
                    </div>
                  </div>
                </div>

                {/* Submissions inside group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                  {group.cluster.map((paper, pIdx) => (
                    <div key={paper.id || pIdx} style={{ background: 'white', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>
                          👤 {paper.authorName || paper.author_name || 'ไม่ระบุชื่อ'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          สถานะ: <b>{paper.author}</b> • สัดส่วน: <b style={{ color: '#7c3aed' }}>{paper.proportion}%</b>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          วันที่บันทึก: {paper.publicationDate || paper.date || '-'}
                        </div>
                        {paper.doi && (
                          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', fontFamily: 'monospace' }}>
                            DOI: {paper.doi}
                          </div>
                        )}
                      </div>

                      {onEditEntry && (
                        <button
                          type="button"
                          onClick={() => onEditEntry(paper)}
                          style={{
                            marginTop: '10px',
                            padding: '6px 10px',
                            background: '#ede9fe',
                            color: '#6d28d9',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Pencil size={13} />
                          <span>ปรับแก้สัดส่วน</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Incomplete Papers List */}
      {(filterMode === 'ALL' || filterMode === 'INCOMPLETE') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#d97706" />
            <span>รายการผลงานที่ข้อมูลไม่สมบูรณ์ ({incompletePapers.length} รายการ)</span>
          </h2>

          {incompletePapers.length === 0 ? (
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#10b981', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={28} style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontWeight: '700' }}>ผลงานทั้งหมดมีข้อมูลสมบูรณ์ครบถ้วน</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incompletePapers.map((paper) => (
                <div key={paper.id} style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{paper.title || paper.type}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      ผู้ยื่น: <b>{paper.authorName || '-'}</b> • ฐานข้อมูล: <b>{paper.db}</b>
                    </div>
                    <div style={{ fontSize: '12px', color: '#c2410c', marginTop: '6px', fontWeight: '600' }}>
                      ⚠️ สิ่งที่ยังขาด: {paper.completeness.missingFields.join(' • ')}
                    </div>
                  </div>

                  {onEditEntry && (
                    <button
                      type="button"
                      onClick={() => onEditEntry(paper)}
                      style={{
                        padding: '8px 14px',
                        background: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Pencil size={14} />
                      <span>กรอกข้อมูลเพิ่ม</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
