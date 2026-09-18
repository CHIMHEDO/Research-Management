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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ tab, setTab, entriesCount }) {
  const { user, logout } = useAuth();

  return (
    <aside className="app-sidebar">
      {/* Brand & Logo matching screenshot: AMS University / UP */}
      <div className="sidebar-brand-ams">
        <div className="sidebar-logo-square">
          <GraduationCap size={24} color="#ffffff" />
        </div>
        <div className="sidebar-brand-text-ams">
          <span className="ams-brand-title">UP</span>
          <span className="ams-brand-subtitle">ระบบบริหารจัดการวิชาการ</span>
        </div>
      </div>

      {/* Navigation Menu List */}
      <nav className="sidebar-nav-ams">
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
          onClick={() => setTab('dashboard')}
          className="sidebar-menu-btn"
        >
          <DollarSign size={18} />
          <span>ติดตามการจ่ายเงิน</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('settings')}
          className="sidebar-menu-btn disabled-btn"
        >
          <Settings size={18} />
          <span>การจัดการระบบ</span>
        </button>

        {/* Research System Menu Items */}
        <div className="sidebar-section-divider" />
        <button
          type="button"
          onClick={() => setTab('scholar')}
          className={`sidebar-menu-btn ${tab === 'scholar' ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>ผลงานวิจัย & Google Scholar</span>
        </button>
      </nav>

      {/* Bottom Settings & Logout */}
      <div className="sidebar-bottom-menu">
        <button 
          type="button" 
          className="sidebar-footer-btn"
        >
          <Settings size={17} />
          <span>ตั้งค่า</span>
        </button>

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

