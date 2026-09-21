import React, { useState, useMemo } from 'react';
import { Search, Bell, HelpCircle, ShieldCheck, User, AlertTriangle, Clock, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPaperAlertSummary } from '../utils/validation';

export default function Header({ tab, setTab, entries = [] }) {
  const { user } = useAuth();
  const [notificationOpen, setNotificationOpen] = useState(false);

  // คำนวณการแจ้งเตือนทั้งหมด (Incomplete + Expiring Soon)
  const alertSummary = useMemo(() => {
    let totalIncomplete = 0;
    let totalExpiring = 0;
    let alertList = [];

    entries.forEach(entry => {
      const summary = getPaperAlertSummary(entry);
      if (summary.hasAlerts) {
        summary.alerts.forEach(alert => {
          if (alert.type === 'incomplete') totalIncomplete++;
          if (alert.type === 'expiring' || alert.type === 'expired') totalExpiring++;

          alertList.push({
            id: `${entry.id}-${alert.type}`,
            paperTitle: entry.title || entry.type,
            ...alert,
            entry
          });
        });
      }
    });

    return {
      totalIncomplete,
      totalExpiring,
      totalAlerts: alertList.length,
      alertList: alertList.slice(0, 10) // แสดง 10 อันดับแรก
    };
  }, [entries]);

  const isAdmin = user?.role === 'admin';

  return (
    <header className="ams-top-header" style={{ position: 'relative' }}>
      <div className="ams-header-inner">
        {/* Left System Title / Current User Welcome */}
        <div className="ams-header-title-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                background: isAdmin ? '#fef3c7' : '#ede9fe',
                color: isAdmin ? '#b45309' : '#6d28d9',
                border: isAdmin ? '1px solid #fde68a' : '1px solid #ddd6fe'
              }}>
                {isAdmin ? <ShieldCheck size={14} /> : <User size={14} />}
                {isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'อาจารย์ / ผู้ใช้งาน (User)'}
              </span>

              <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                {user.full_name || user.name_th || user.name_en || user.email}
              </span>
            </div>
          )}
        </div>

        {/* Right Header Actions: Notification Bell, Profile */}
        <div className="ams-header-right-actions" style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="ams-icon-btn" 
            title="การแจ้งเตือน (Notifications)"
            onClick={() => setNotificationOpen(!notificationOpen)}
            style={{ position: 'relative' }}
          >
            <Bell size={19} />
            {alertSummary.totalAlerts > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                fontWeight: '800',
                borderRadius: '10px',
                padding: '1px 5px',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {alertSummary.totalAlerts}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          {user && (
            <div className="ams-user-profile-circle" title={`${user.full_name || user.email} (${user.department || 'ICT'})`}>
              <div className="ams-avatar-img">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Dropdown Box */}
      {notificationOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '24px',
          width: '360px',
          background: 'white',
          borderRadius: '14px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          zIndex: 999,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={16} color="#7c3aed" />
              <span>การแจ้งเตือนระบบ ({alertSummary.totalAlerts})</span>
            </div>
            <button 
              type="button" 
              onClick={() => setNotificationOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {alertSummary.totalAlerts === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                🎉 เยี่ยมมาก! ไม่มีรายการแจ้งเตือนที่ต้องดำเนินการ
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {alertSummary.alertList.map(item => (
                  <div 
                    key={item.id} 
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      background: item.level === 'danger' ? '#fef2f2' : '#fffbeb'
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      {item.level === 'danger' ? (
                        <AlertTriangle size={16} color="#dc2626" />
                      ) : (
                        <Clock size={16} color="#d97706" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: item.level === 'danger' ? '#991b1b' : '#92400e' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', fontWeight: '500' }}>
                        {item.paperTitle}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
