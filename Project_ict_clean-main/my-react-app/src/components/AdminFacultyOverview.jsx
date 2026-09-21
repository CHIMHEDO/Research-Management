import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Clock, 
  Coins, 
  BookOpen, 
  Building,
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import api from '../api/client';

const DEPARTMENT_ORDER = [
  'ทั้งหมด',
  'Computer Graphics and Multimedia',
  'Digital Business',
  'Information Technology',
  'Geoinformatics',
  'Computer Science',
  'Data Science and Applications',
  'Computer Engineering',
  'Software Engineering'
];

export default function AdminFacultyOverview({ entries = [] }) {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedDept, setSelectedDept] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTeacherId, setExpandedTeacherId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ดึงรายชื่ออาจารย์ทั้งหมดจากระบบ
  useEffect(() => {
    async function loadFaculty() {
      try {
        const res = await api.get('/users');
        if (res.data) {
          setFacultyList(res.data);
        }
      } catch (err) {
        console.error('Failed to load faculty list:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFaculty();
  }, []);

  // แมปผลงานและคำนวณสถิติของอาจารย์แต่ละท่าน
  const facultyWithStats = useMemo(() => {
    return facultyList.map(teacher => {
      const teacherNameEn = (teacher.name_en || '').toLowerCase().trim();
      const teacherNameTh = (teacher.name_th || '').toLowerCase().trim();
      const teacherEmail = (teacher.email || '').toLowerCase().trim();

      // ค้นหาผลงานของอาจารย์ท่านนี้ใน entries
      const teacherEntries = entries.filter(e => {
        const authorName = (e.authorName || e.author_name || '').toLowerCase().trim();
        const authors = (e.authors || '').toLowerCase().trim();
        const submitterEmail = (e.submitter_email || '').toLowerCase().trim();

        const matchEmail = teacherEmail && submitterEmail === teacherEmail;
        const matchNameTh = teacherNameTh && (authorName.includes(teacherNameTh) || authors.includes(teacherNameTh));
        const matchNameEn = teacherNameEn && (authorName.includes(teacherNameEn) || authors.includes(teacherNameEn));

        return matchEmail || matchNameTh || matchNameEn;
      });

      const totalHours = teacherEntries.reduce((sum, e) => sum + (Number(e.actualHours || e.actual_hours) || 0), 0);
      const totalQuality = teacherEntries.reduce((sum, e) => sum + (Number(e.quality) || 0), 0);
      const totalFunding = teacherEntries.reduce((sum, e) => sum + (Number(e.faculty || 0) + Number(e.uni || 0)), 0);

      return {
        ...teacher,
        entriesCount: teacherEntries.length,
        totalHours: Number(totalHours.toFixed(1)),
        totalQuality: Number(totalQuality.toFixed(2)),
        totalFunding,
        entries: teacherEntries
      };
    });
  }, [facultyList, entries]);

  // กรองตามสาขาและคำค้นหา
  const filteredFaculty = useMemo(() => {
    return facultyWithStats.filter(teacher => {
      const matchDept = selectedDept === 'ทั้งหมด' || teacher.department === selectedDept;
      if (!matchDept) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = (teacher.name_th || '').toLowerCase().includes(q) || (teacher.name_en || '').toLowerCase().includes(q);
      const matchEmail = (teacher.email || '').toLowerCase().includes(q);
      const matchPos = (teacher.position || '').toLowerCase().includes(q);

      return matchName || matchEmail || matchPos;
    });
  }, [facultyWithStats, selectedDept, searchQuery]);

  // สถิติรวมทั้งคณะ
  const totalStats = useMemo(() => {
    const totalTeachers = facultyList.length;
    const teachersWithPapers = facultyWithStats.filter(f => f.entriesCount > 0).length;
    const totalHoursAll = facultyWithStats.reduce((sum, f) => sum + f.totalHours, 0);
    const totalFundingAll = facultyWithStats.reduce((sum, f) => sum + f.totalFunding, 0);

    return { totalTeachers, teachersWithPapers, totalHoursAll, totalFundingAll };
  }, [facultyList, facultyWithStats]);

  const toggleExpand = (id) => {
    setExpandedTeacherId(prev => prev === id ? null : id);
  };

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ background: '#7c3aed', padding: '10px', borderRadius: '12px', color: 'white', display: 'flex' }}>
            <Users size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
              ภาพรวมภาระงานอาจารย์ทั้งคณะ (Faculty Workload Overview)
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              ตรวจสอบและติดตามชั่วโมงภาระงานวิชาการ, คะแนนคุณภาพ และงบประมาณสนับสนุนของคณาจารย์ทั้ง 8 สาขาวิชา
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>อาจารย์ทั้งหมด</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>{totalStats.totalTeachers} ท่าน</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '500' }}>มีผลงานแล้ว {totalStats.teachersWithPapers} ท่าน</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>ชั่วโมงภาระงานรวมทั้งคณะ</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#7c3aed', marginTop: '6px' }}>{totalStats.totalHoursAll.toLocaleString()} ชม.</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>จากผลงานวิชาการที่บันทึกแล้ว</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>งบสนับสนุนรวมทั้งคณะ</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{totalStats.totalFundingAll.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>คณะ + มหาวิทยาลัย</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="ค้นหาชื่ออาจารย์, อีเมล หรือตำแหน่ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building size={18} color="#64748b" />
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: 'white', cursor: 'pointer', outline: 'none' }}
          >
            {DEPARTMENT_ORDER.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Faculty Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '14px 18px' }}>ชื่อ-นามสกุล / สาขาวิชา</th>
                <th style={{ padding: '14px 18px' }}>อีเมลมหาวิทยาลัย</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>จำนวนผลงาน</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>ชั่วโมงจริง</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>คะแนนคุณภาพ</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>งบสนับสนุน</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.map(teacher => {
                const isExpanded = expandedTeacherId === teacher.id;
                return (
                  <React.Fragment key={teacher.id || teacher.email}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', background: isExpanded ? '#faf5ff' : 'transparent' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>
                          {teacher.name_th || teacher.name_en || teacher.full_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {teacher.department || 'คณะ ICT'} • {teacher.position || 'อาจารย์'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{teacher.email}</span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '3px 10px', 
                          borderRadius: '20px', 
                          background: teacher.entriesCount > 0 ? '#ede9fe' : '#f1f5f9',
                          color: teacher.entriesCount > 0 ? '#6d28d9' : '#94a3b8',
                          fontWeight: '700',
                          fontSize: '13px'
                        }}>
                          {teacher.entriesCount} เรื่อง
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '700', color: '#7c3aed' }}>
                        {teacher.totalHours} ชม.
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                        {teacher.totalQuality}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                        {teacher.totalFunding > 0 ? `${teacher.totalFunding.toLocaleString()} ฿` : '-'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button 
                          type="button"
                          onClick={() => toggleExpand(teacher.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isExpanded ? '#7c3aed' : '#f1f5f9',
                            color: isExpanded ? 'white' : '#475569',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{isExpanded ? 'ซ่อน' : 'ดูผลงาน'}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>

                    {/* รายการผลงานแบบขยาย */}
                    {isExpanded && (
                      <tr style={{ background: '#faf5ff' }}>
                        <td colSpan={7} style={{ padding: '16px 24px', borderBottom: '2px solid #e9d5ff' }}>
                          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#5b21b6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <BookOpen size={16} />
                              <span>รายการผลงานวิชาการของ {teacher.name_th || teacher.name_en} ({teacher.entries.length} เรื่อง)</span>
                            </div>

                            {teacher.entries.length === 0 ? (
                              <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px 0', textAlign: 'center' }}>
                                ยังไม่มีการบันทึกผลงานวิชาการในระบบ
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {teacher.entries.map((entry, idx) => (
                                  <div key={entry.id || idx} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{entry.title || entry.type}</div>
                                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                        {entry.journal || entry.type} • ฐานข้อมูล: <b style={{ color: '#7c3aed' }}>{entry.db}</b> • สัดส่วน: <b>{entry.proportion}%</b> ({entry.author})
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <div style={{ fontWeight: '700', color: '#7c3aed', fontSize: '14px' }}>{entry.actualHours} ชม.</div>
                                      <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                                        {((entry.faculty || 0) + (entry.uni || 0)) > 0 ? `${((entry.faculty || 0) + (entry.uni || 0)).toLocaleString()} ฿` : '-'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
