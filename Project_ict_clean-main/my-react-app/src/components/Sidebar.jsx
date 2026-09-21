import React from 'react';
import { 
  Plus,
  LayoutDashboard, 
  BookMarked, 
  Target,
  DollarSign, 
  Settings, 
  LogOut,
  GraduationCap,
  Users,
  FileText,
  Sparkles,
  ShieldCheck,
  Layers,
  Receipt,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ tab, setTab, entriesCount }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="app-sidebar">
      {/* Brand & Logo */}
      <div className="sidebar-brand-ams">
        <div className="sidebar-logo-square">
          <GraduationCap size={24} color="#ffffff" />
        </div>
        <div className="sidebar-brand-text-ams">
          <span className="ams-brand-title">UP ICT</span>
          <span className="ams-brand-subtitle">ระบบบริหารจัดการวิชาการ</span>
        </div>
      </div>

      {/* Navigation Menu List */}
      <nav className="sidebar-nav-ams">
        {/* Regular User Sections */}
        <div className="sidebar-section-title" style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', padding: '10px 16px 4px 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          เมนูหลัก
        </div>

        <button
          type="button"
          onClick={() => setTab('dashboard')}
          className={`sidebar-menu-btn ${tab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>แดชบอร์ด</span>
          {entriesCount > 0 && (
            <span className="sidebar-pill-count">{entriesCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('form')}
          className={`sidebar-menu-btn ${tab === 'form' ? 'active' : ''}`}
        >
          <BookMarked size={18} />
          <span>ผลงานวิชาการ (คำนวณ)</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('planning')}
          className={`sidebar-menu-btn ${tab === 'planning' ? 'active' : ''}`}
        >
          <Target size={18} />
          <span>วางแผนภาระงาน</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('disbursements')}
          className={`sidebar-menu-btn ${tab === 'disbursements' ? 'active' : ''}`}
        >
          <DollarSign size={18} />
          <span>ติดตามการจ่ายเงิน</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('scholar')}
          className={`sidebar-menu-btn ${tab === 'scholar' ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>ผลงานวิจัย & Google Scholar</span>
        </button>

        {/* Admin Console Sections (Only for Admin) */}
        {isAdmin && (
          <>
            <div className="sidebar-section-divider" style={{ margin: '14px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }} />
            
            <div className="sidebar-section-title" style={{ fontSize: '11px', fontWeight: '800', color: '#000000', padding: '4px 16px 6px 16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#000000" />
              <span style={{ color: '#000000' }}>ผู้ดูแลระบบ (Admin)</span>
            </div>

            <button
              type="button"
              onClick={() => setTab('admin-faculty')}
              className={`sidebar-menu-btn ${tab === 'admin-faculty' ? 'active' : ''}`}
              style={{ color: tab === 'admin-faculty' ? '#ffffff' : '#000000', fontWeight: '600' }}
            >
              <Users size={18} color={tab === 'admin-faculty' ? '#ffffff' : '#000000'} />
              <span>ภาพรวมอาจารย์ทั้งคณะ</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('admin-duplicates')}
              className={`sidebar-menu-btn ${tab === 'admin-duplicates' ? 'active' : ''}`}
              style={{ color: tab === 'admin-duplicates' ? '#ffffff' : '#000000', fontWeight: '600' }}
            >
              <Layers size={18} color={tab === 'admin-duplicates' ? '#ffffff' : '#000000'} />
              <span>ตรวจผลงานซ้ำ & ผู้ร่วม</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('admin-disbursements')}
              className={`sidebar-menu-btn ${tab === 'admin-disbursements' ? 'active' : ''}`}
              style={{ color: tab === 'admin-disbursements' ? '#ffffff' : '#000000', fontWeight: '600' }}
            >
              <Receipt size={18} color={tab === 'admin-disbursements' ? '#ffffff' : '#000000'} />
              <span>บันทึกการเบิกเงินรางวัล</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('admin-audit')}
              className={`sidebar-menu-btn ${tab === 'admin-audit' ? 'active' : ''}`}
              style={{ color: tab === 'admin-audit' ? '#ffffff' : '#000000', fontWeight: '600' }}
            >
              <History size={18} color={tab === 'admin-audit' ? '#ffffff' : '#000000'} />
              <span>ประวัติการแก้ไข (Logs)</span>
            </button>
          </>
        )}
      </nav>

      {/* Bottom Settings & Logout */}
      <div className="sidebar-bottom-menu">
        <button 
          type="button"
          onClick={logout} 
          className="sidebar-footer-btn logout"
          title="ออกจากระบบ"
        >
          <LogOut size={17} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
