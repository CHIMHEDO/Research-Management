import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ tab, setTab, entriesCount }) {
  const { user } = useAuth();

  return (
    <header className="ams-top-header">
      <div className="ams-header-inner">
        {/* Left System Title */}
        <div className="ams-header-title-area">
        </div>

        {/* Right Header Actions: Search, Bell, Help, Avatar */}
        <div className="ams-header-right-actions">
          <button type="button" className="ams-icon-btn" title="ค้นหา">
            <Search size={19} />
          </button>
          
          <button type="button" className="ams-icon-btn" title="การแจ้งเตือน">
            <Bell size={19} />
            <span className="bell-badge-dot" />
          </button>

          <button type="button" className="ams-icon-btn" title="ช่วยเหลือ">
            <HelpCircle size={19} />
          </button>

          {/* User Profile Avatar matching photo badge */}
          {user && (
            <div className="ams-user-profile-circle" title={user.full_name || user.email}>
              <div className="ams-avatar-img">
                {user.full_name ? user.full_name.charAt(0) : "U"}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

