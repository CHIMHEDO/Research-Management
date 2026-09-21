import React, { useMemo } from 'react';
import { 
  DollarSign, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertCircle,
  FileCheck,
  FileText,
  Building,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserDisbursementView({ entries = [] }) {
  const { user } = useAuth();

  // กรองเฉพาะผลงานของผู้ใช้ปัจจุบันที่มีงบประมาณ
  const userFundedEntries = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userNameEn = (user?.name_en || '').toLowerCase().trim();
    const userNameTh = (user?.name_th || '').toLowerCase().trim();

    return entries.filter(e => {
      const authorName = (e.authorName || e.author_name || '').toLowerCase().trim();
      const authors = (e.authors || '').toLowerCase().trim();
      const submitterEmail = (e.submitter_email || '').toLowerCase().trim();

      const matchEmail = userEmail && submitterEmail === userEmail;
      const matchNameTh = userNameTh && (authorName.includes(userNameTh) || authors.includes(userNameTh));
      const matchNameEn = userNameEn && (authorName.includes(userNameEn) || authors.includes(userNameEn));

      const isMyPaper = matchEmail || matchNameTh || matchNameEn || !submitterEmail; // fallback
      const totalFunding = (Number(e.faculty) || 0) + (Number(e.uni) || 0);

      return isMyPaper && totalFunding > 0;
    }).map(e => ({
      ...e,
      totalFunding: (Number(e.faculty) || 0) + (Number(e.uni) || 0),
      currentStatus: e.disbursement_status || 'PENDING'
    }));
  }, [entries, user]);

  // สรุปยอด
  const stats = useMemo(() => {
    const totalPotential = userFundedEntries.reduce((sum, e) => sum + e.totalFunding, 0);
    const disbursed = userFundedEntries.filter(e => e.currentStatus === 'DISBURSED');
    const totalDisbursed = disbursed.reduce((sum, e) => sum + (Number(e.disbursed_amount) || e.totalFunding), 0);
    const pending = userFundedEntries.filter(e => e.currentStatus === 'PENDING' || !e.disbursement_status);
    const totalPending = pending.reduce((sum, e) => sum + e.totalFunding, 0);

    return { totalPotential, totalDisbursed, totalPending };
  }, [userFundedEntries]);

  return (
    <div className="user-disbursement-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ background: '#059669', padding: '10px', borderRadius: '12px', color: 'white', display: 'flex' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
              ติดตามสถานะและวันที่เบิกจ่ายเงินรางวัล (My Disbursement Status)
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              ตรวจสอบรายการเงินรางวัลสนับสนุนผลงานวิชาการของท่าน วันที่โอนเงินจริง และเลขที่เอกสารอ้างอิง
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>เงินรางวัลที่ได้รับสิทธิ์ทั้งหมด</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>{stats.totalPotential.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>จากผลงานวิชาการ {userFundedEntries.length} เรื่อง</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>เงินรางวัลที่ได้รับโอนแล้ว (จ่ายแล้ว)</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{stats.totalDisbursed.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>เข้าบัญชีเรียบร้อย</div>
        </div>

        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>อยู่ระหว่างดำเนินการ / รอเบิก</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{stats.totalPending.toLocaleString()} ฿</div>
          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: '600' }}>รอบเบิกจ่ายของคณะ</div>
        </div>
      </div>

      {/* List */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>
          รายการผลงานที่ได้รับสิทธิ์เงินรางวัลของฉัน ({userFundedEntries.length} รายการ)
        </div>

        {userFundedEntries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
            <div>ยังไม่มีผลงานวิชาการที่เข้าเกณฑ์ได้รับเงินสนับสนุนในระบบ</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '14px 18px' }}>ชื่องานวิจัย / วารสาร</th>
                  <th style={{ padding: '14px 18px' }}>ฐานข้อมูล / สัดส่วน</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>เงินรางวัลตามเกณฑ์</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }}>สถานะการเบิกจ่าย</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }}>วันที่โอนจริง</th>
                  <th style={{ padding: '14px 18px' }}>เลขที่เอกสาร / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {userFundedEntries.map(entry => {
                  const isDisbursed = entry.currentStatus === 'DISBURSED';
                  const isApproved = entry.currentStatus === 'APPROVED';

                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', maxWidth: '320px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>
                          {entry.title || entry.type}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {entry.journal || entry.type} • {entry.publicationDate || entry.date || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed' }}>{entry.db}</span>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>สัดส่วน {entry.proportion}% ({entry.author})</div>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '800', color: '#059669' }}>
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
                          {isDisbursed ? '✓ โอนเงินสำเร็จ' : isApproved ? 'อนุมัติแล้ว' : '⏳ กำลังตรวจสอบ'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: '600', color: isDisbursed ? '#059669' : '#64748b' }}>
                        {entry.disbursed_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Calendar size={14} />
                            <span>{entry.disbursed_at}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#475569' }}>
                        {entry.disbursement_ref_no ? (
                          <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {entry.disbursement_ref_no}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                        {entry.disbursement_note && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {entry.disbursement_note}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
