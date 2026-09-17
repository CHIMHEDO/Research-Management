import React, { useState } from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ไอคอน Microsoft Logo 4 สีทางการ
export function MicrosoftIcon() {
  return (
    <svg className="ms-logo-icon" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const { loginWithMicrosoft, loginWithEmail, isLoggingIn, authError, setAuthError, toast } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  // ตรวจสอบความถูกต้องของอีเมล @up.ac.th
  const trimmedEmail = email.trim().toLowerCase();
  const isUpDomain = trimmedEmail.endsWith('@up.ac.th');
  const hasTypedEmail = trimmedEmail.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!trimmedEmail) {
      setLocalError('กรุณากรอกอีเมลของมหาวิทยาลัย');
      return;
    }

    if (!trimmedEmail.endsWith('@up.ac.th')) {
      setLocalError('อนุญาตเฉพาะอีเมลมหาวิทยาลัยพะเยาที่ลงท้ายด้วย @up.ac.th เท่านั้น');
      return;
    }

    if (!password) {
      setLocalError('กรุณากรอกรหัสผ่าน');
      return;
    }

    await loginWithEmail(trimmedEmail, password);
  };

  const displayedError = localError || authError;

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        <div className="login-header-icon">
          <GraduationCap size={30} />
        </div>

        <span className="login-badge">
          <Sparkles size={13} />
          ระบบประเมินภาระงานวิชาการ (UP)
        </span>

        <h1 className="login-title">เข้าสู่ระบบ</h1>
        <p className="login-description">
          กรุณากรอกอีเมลมหาวิทยาลัยพะเยา (<b>@up.ac.th</b>) และรหัสผ่านเพื่อเข้าใช้งาน
        </p>

        {displayedError && (
          <div className="login-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{displayedError}</div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-label">
              อีเมลมหาวิทยาลัย (@up.ac.th)
            </label>
            <div className="login-input-wrapper">
              <Mail size={18} className="login-input-icon" />
              <input
                type="email"
                className="login-input"
                placeholder="เช่น username@up.ac.th"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (localError) setLocalError('');
                  if (authError && setAuthError) setAuthError('');
                }}
                disabled={isLoggingIn}
                autoFocus
                required
              />
            </div>
            {hasTypedEmail && (
              <span className={`domain-hint ${isUpDomain ? 'domain-hint-valid' : 'domain-hint-invalid'}`}>
                {isUpDomain ? '✓ รูปแบบอีเมลถูกต้อง (@up.ac.th)' : '⚠️ ต้องเป็นอีเมลที่ลงท้ายด้วย @up.ac.th'}
              </span>
            )}
          </div>

          <div className="login-input-group">
            <label className="login-label">
              รหัสผ่าน (Password)
            </label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input-password"
                placeholder="กรอกรหัสผ่านของคุณ"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError('');
                  if (authError && setAuthError) setAuthError('');
                }}
                disabled={isLoggingIn}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn-login-primary"
          >
            <LogIn size={18} />
            {isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>หรือ</span>
        </div>

        {/* Microsoft SSO Button */}
        <button 
          type="button"
          onClick={loginWithMicrosoft} 
          disabled={isLoggingIn}
          className="btn-microsoft"
        >
          <MicrosoftIcon />
          <span>เข้าสู่ระบบด้วย Microsoft 365</span>
        </button>

        <div className="login-footer-note">
          <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          ระบบปลอดภัย เฉพาะบุคลากรและนิสิต มหาวิทยาลัยพะเยา (@up.ac.th)
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-pill">
          <CheckCircle2 size={16} color="#4ade80" />
          {toast}
        </div>
      )}
    </div>
  );
}
