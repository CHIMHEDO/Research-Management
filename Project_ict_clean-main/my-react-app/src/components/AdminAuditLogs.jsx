import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  ShieldCheck, 
  FileText, 
  Trash2, 
  Edit3, 
  PlusCircle, 
  DollarSign, 
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function AdminAuditLogs({ entries = [] }) {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    // โหลด Audit Logs จาก localStorage หรือสร้าง initial logs อิงจาก entries
    const savedLogs = localStorage.getItem('ams_audit_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
        return;
      } catch (e) {
        console.error('Audit logs parse error:', e);
      }
    }

    // สร้าง initial mock audit logs จากรายการผลงานที่มีอยู่
    const initialLogs = entries.slice(0, 15).map((e, idx) => ({
      id: `log-${e.id || idx}`,
      action: e.disbursement_status === 'DISBURSED' ? 'DISBURSEMENT_RECORDED' : 'PAPER_SAVED',
      actionLabel: e.disbursement_status === 'DISBURSED' ? 'บันทึกการเบิกจ่ายเงินรางวัล' : 'บันทึกผลงานวิชาการใหม่',
      actorName: e.authorName || 'เจ้าหน้าที่ระบบ',
      actorRole: 'admin',
      targetTitle: e.title || e.type,
      targetId: e.id,
      timestamp: e.created_at || new Date(Date.now() - idx * 86400000 * 2).toISOString(),
      details: `ฐานข้อมูล: ${e.db || '-'} • สัดส่วน: ${e.proportion || 100}% • ชั่วโมงจริง: ${e.actualHours || e.actual_hours || 0} ชม.`
    }));

    setLogs(initialLogs);
    localStorage.setItem('ams_audit_logs', JSON.stringify(initialLogs));
  }, [entries]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        (log.actorName || '').toLowerCase().includes(q) ||
        (log.targetTitle || '').toLowerCase().includes(q) ||
        (log.actionLabel || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q)
      );
    });
  }, [logs, filterAction, searchQuery]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'PAPER_SAVED':
      case 'CREATE':
        return { color: '#0284c7', bg: '#e0f2fe', label: 'สร้างผลงาน' };
      case 'PAPER_UPDATED':
      case 'UPDATE':
        return { color: '#7c3aed', bg: '#ede9fe', label: 'แก้ไขข้อมูล' };
      case 'PAPER_DELETED':
      case 'DELETE':
        return { color: '#dc2626', bg: '#fee2e2', label: 'ลบผลงาน' };
      case 'DISBURSEMENT_RECORDED':
        return { color: '#059669', bg: '#dcfce7', label: 'บันทึกการเงิน' };
      default:
        return { color: '#475569', bg: '#f1f5f9', label: action };
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติ Audit Logs ทั้งหมด?')) {
      setLogs([]);
      localStorage.removeItem('ams_audit_logs');
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#475569', padding: '10px', borderRadius: '12px', color: 'white', display: 'flex' }}>
              <History size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                ประวัติการแก้ไขและบันทึกข้อมูล (Audit Trail Logs)
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                ตรวจสอบประวัติทุกกิจกรรมในระบบ: ใครเป็นผู้แก้ไข, วันเวลาที่ดำเนินการ และรายละเอียดการเปลี่ยนแปลง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearLogs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} />
            <span>ล้างประวัติ Log</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="ค้นหาชื่อผู้ดำเนินการ, ชื่องานวิจัย หรือรายละเอียดการแก้ไข..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'PAPER_SAVED', label: 'บันทึกผลงาน' },
            { key: 'DISBURSEMENT_RECORDED', label: 'บันทึกการเงิน' }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterAction(f.key)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterAction === f.key ? '#475569' : '#f1f5f9',
                color: filterAction === f.key ? 'white' : '#475569',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '14px 18px', width: '160px' }}>วันเวลาที่ดำเนินการ</th>
                <th style={{ padding: '14px 18px', width: '140px' }}>ประเภทการกระทำ</th>
                <th style={{ padding: '14px 18px', width: '180px' }}>ผู้ดำเนินการ</th>
                <th style={{ padding: '14px 18px' }}>ผลงาน / รายละเอียดที่เปลี่ยนแปลง</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    ไม่พบรายการประวัติการแก้ไขข้อมูลตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const badge = getActionBadge(log.action);
                  const dateFormatted = new Date(log.timestamp).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#94a3b8" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          background: badge.bg,
                          color: badge.color
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{log.actorName}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{log.targetTitle}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{log.details}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
