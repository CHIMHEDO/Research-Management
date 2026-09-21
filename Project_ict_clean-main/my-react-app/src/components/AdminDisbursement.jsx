import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  FileCheck, 
  XCircle, 
  Edit3, 
  Building,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import api from '../api/client';

export default function AdminDisbursement({ entries = [], onUpdateEntry }) {
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, APPROVED, DISBURSED
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states for disbursement modal
  const [disbursedDate, setDisbursedDate] = useState(new Date().toISOString().slice(0, 10));
  const [disbursementStatus, setDisbursementStatus] = useState('DISBURSED');
  const [refNo, setRefNo] = useState('');
  const [disbursedAmount, setDisbursedAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // ผลงานที่มีงบประมาณสนับสนุน
  const fundedEntries = useMemo(() => {
    return entries.filter(e => {
      const totalFunding = (Number(e.faculty) || 0) + (Number(e.uni) || 0);
      return totalFunding > 0;
    }).map(e => ({
      ...e,
      totalFunding: (Number(e.faculty) || 0) + (Number(e.uni) || 0),
      currentStatus: e.disbursement_status || 'PENDING'
    }));
  }, [entries]);

  // สรุปยอดสถิติ
  const stats = useMemo(() => {
    const totalPotential = fundedEntries.reduce((sum, e) => sum + e.totalFunding, 0);
    const disbursed = fundedEntries.filter(e => e.currentStatus === 'DISBURSED');
    const totalDisbursed = disbursed.reduce((sum, e) => sum + (Number(e.disbursed_amount) || e.totalFunding), 0);
    const pending = fundedEntries.filter(e => e.currentStatus === 'PENDING' || !e.disbursement_status);
    const totalPending = pending.reduce((sum, e) => sum + e.totalFunding, 0);

    return {
      totalPotential,
      totalDisbursed,
      disbursedCount: disbursed.length,
      totalPending,
      pendingCount: pending.length
    };
  }, [fundedEntries]);

  // กรองข้อมูล
  const filteredEntries = useMemo(() => {
    return fundedEntries.filter(e => {
      if (filterStatus !== 'ALL' && e.currentStatus !== filterStatus) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (e.title || '').toLowerCase().includes(q);
      const matchAuthor = (e.authorName || '').toLowerCase().includes(q);
      const matchRef = (e.disbursement_ref_no || '').toLowerCase().includes(q);

      return matchTitle || matchAuthor || matchRef;
    });
  }, [fundedEntries, filterStatus, searchQuery]);

  const openRecordModal = (entry) => {
    setSelectedEntry(entry);
    setDisbursedDate(entry.disbursed_at || new Date().toISOString().slice(0, 10));
    setDisbursementStatus(entry.disbursement_status || 'DISBURSED');
    setRefNo(entry.disbursement_ref_no || '');
    setDisbursedAmount(entry.disbursed_amount || entry.totalFunding || '');
    setNote(entry.disbursement_note || '');
    setModalOpen(true);
  };

  const handleSaveDisbursement = async (e) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setSaving(true);
    try {
      const updatedData = {
        ...selectedEntry,
        disbursement_status: disbursementStatus,
        disbursed_at: disbursedDate,
        disbursed_amount: Number(disbursedAmount) || selectedEntry.totalFunding,
        disbursement_ref_no: refNo,
        disbursement_note: note
      };

      if (onUpdateEntry) {
        await onUpdateEntry(updatedData);
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Error saving disbursement:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ background: '#059669', padding: '10px', borderRadius: '12px', color: 'white', display: 'flex' }}>
            <Receipt size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
              ระบบบันทึกและติดตามการเบิกจ่ายเงินรางวัล (Disbursement Management)
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              บันทึกการอนุมัติ, วันที่โอนเงินจริง, และออกประวัติการจ่ายเงินสนับสนุนผลงานวิชาการของอาจารย์
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>ยอดเงินรางวัลที่ขอเบิกทั้งหมด</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>{stats.totalPotential.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>จำนวน {fundedEntries.length} ผลงาน</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>จ่ายเงินสำเร็จแล้ว (Disbursed)</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{stats.totalDisbursed.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>เบิกจ่ายแล้ว {stats.disbursedCount} เรื่อง</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>รอการตรวจสอบ / ดำเนินการ</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{stats.totalPending.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: '600' }}>คงค้าง {stats.pendingCount} เรื่อง</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="ค้นหาชื่อผลงาน, ชื่ออาจารย์, หรือเลขที่เอกสาร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'PENDING', label: '⏳ รอตรวจสอบ' },
            { key: 'APPROVED', label: '✅ อนุมัติแล้ว' },
            { key: 'DISBURSED', label: '💵 จ่ายเงินแล้ว' }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterStatus(f.key)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === f.key ? '#059669' : '#f1f5f9',
                color: filterStatus === f.key ? 'white' : '#475569',
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

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '14px 18px' }}>ชื่องานวิจัย / ผู้ยื่น</th>
                <th style={{ padding: '14px 18px' }}>ฐานข้อมูล / สัดส่วน</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>ยอดเงินคณะ</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>ยอดเงินมหาวิทยาลัย</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>รวมเงินรางวัล</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>สถานะการเบิกจ่าย</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>วันที่จ่ายจริง</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => {
                const isDisbursed = entry.currentStatus === 'DISBURSED';
                const isApproved = entry.currentStatus === 'APPROVED';

                return (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', maxWidth: '300px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.title || entry.type}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        ผู้ขอเบิก: <b>{entry.authorName || '-'}</b>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed' }}>{entry.db}</span>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{entry.author} ({entry.proportion}%)</div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>
                      {(Number(entry.faculty) || 0).toLocaleString()} ฿
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>
                      {(Number(entry.uni) || 0).toLocaleString()} ฿
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '15px' }}>
                      {entry.totalFunding.toLocaleString()} ฿
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: isDisbursed ? '#dcfce7' : isApproved ? '#e0e7ff' : '#fef3c7',
                        color: isDisbursed ? '#15803d' : isApproved ? '#4338ca' : '#b45309'
                      }}>
                        {isDisbursed ? '✓ จ่ายเงินแล้ว' : isApproved ? 'อนุมัติแล้ว' : '⏳ รอตรวจสอบ'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                      {entry.disbursed_at || '-'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openRecordModal(entry)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={13} />
                        <span>บันทึกการเบิก</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursement Record Modal */}
      {modalOpen && selectedEntry && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>
                  บันทึกการเบิกจ่ายเงินรางวัล
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDisbursement}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{selectedEntry.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  อาจารย์ผู้ขอเบิก: <b>{selectedEntry.authorName}</b> • ยอดเงินตามเกณฑ์: <b style={{ color: '#059669' }}>{selectedEntry.totalFunding.toLocaleString()} ฿</b>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    สถานะการเบิกจ่าย
                  </label>
                  <select
                    value={disbursementStatus}
                    onChange={(e) => setDisbursementStatus(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: 'white' }}
                  >
                    <option value="PENDING">⏳ รอการตรวจสอบ (Pending)</option>
                    <option value="APPROVED">✅ อนุมัติแล้ว (Approved)</option>
                    <option value="DISBURSED">💵 จ่ายเงินสำเร็จแล้ว (Disbursed)</option>
                    <option value="REJECTED">❌ ปฏิเสธการเบิก (Rejected)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      วันที่โอน / จ่ายเงินจริง
                    </label>
                    <input 
                      type="date"
                      value={disbursedDate}
                      onChange={(e) => setDisbursedDate(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      จำนวนเงินที่จ่ายจริง (บาท)
                    </label>
                    <input 
                      type="number"
                      value={disbursedAmount}
                      onChange={(e) => setDisbursedAmount(e.target.value)}
                      placeholder="เช่น 10000"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    เลขที่เอกสาร / รหัสอ้างอิงการโอนเงิน (Ref No.)
                  </label>
                  <input 
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="เช่น TR-2567-0042 หรือ เลขที่คำสั่ง"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="บันทึกข้อความถึงอาจารย์หรือเจ้าหน้าที่การเงิน..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#059669', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลการเบิกเงิน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
