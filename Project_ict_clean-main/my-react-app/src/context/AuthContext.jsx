
import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // พักไว้จนกว่าจะแก้ไมโคซอฟได้
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState("");

  // 1. ดักจับ Token จาก URL หรือ localStorage เมื่อเริ่มต้นระบบ
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    const errorFromUrl = urlParams.get("error");

    if (errorFromUrl) {
      setAuthError(
        errorFromUrl === "auth_failed"
          ? "การเข้าสู่ระบบผ่าน Microsoft ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
          : `ข้อผิดพลาด: ${errorFromUrl}`
      );
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthLoading(false);
      return;
    }

    const activeToken = tokenFromUrl || localStorage.getItem("auth_token");

    if (tokenFromUrl) {
      localStorage.setItem("auth_token", tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (activeToken && activeToken !== 'dev-mock-token') {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_email");
            setUser(null);
          }
        })
        .catch(err => {
          console.error("Auth verify error:", err);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_email");
          setUser(null);
        })
        .finally(() => {
          setAuthLoading(false);
        });
    } else {
      setUser(null);
      setAuthLoading(false);
    }
  }, []);

  // 2. ฟังก์ชันเริ่มล็อกอินผ่าน Microsoft OAuth
  const loginWithMicrosoft = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError("");
      const res = await fetch(`${API_URL}/auth/microsoft`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setAuthError("ไม่สามารถรับ URL สำหรับล็อกอินจากเซิร์ฟเวอร์ได้");
        setIsLoggingIn(false);
      }
    } catch (err) {
      console.error("Microsoft login error:", err);
      setAuthError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้");
      setIsLoggingIn(false);
    }
  };

  // 2.1 ฟังก์ชันล็อกอินด้วย Email & Password (เฉพาะ @up.ac.th)
  const loginWithEmail = async (email, password) => {
    try {
      setIsLoggingIn(true);
      setAuthError("");

      const cleanEmail = email.toLowerCase().trim();

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        if (data.token) localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_email", cleanEmail);
        setUser(data.user);
        const roleLabel = data.user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'อาจารย์';
        setToast(`ยินดีต้อนรับ ${roleLabel}: ${data.user.full_name || data.user.name_th || data.user.name_en}`);
        setIsLoggingIn(false);
        // รีเฟรชหน้าเว็บ 1 ครั้งเพื่อเคลียร์ state และโหลดข้อมูลใหม่หมดสำหรับผู้ใช้ที่เข้าสู่ระบบ
        setTimeout(() => {
          window.location.reload();
        }, 150);
        return true;
      } else {
        setAuthError(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setIsLoggingIn(false);
        return false;
      }
    } catch (err) {
      console.error("Login error:", err);
      setAuthError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsLoggingIn(false);
      return false;
    }
  };

  // 2.2 ฟังก์ชันสลับบัญชีอาจารย์ตามอีเมล (สำหรับทดสอบ)
  const switchUserByEmail = async (email) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const res = await fetch(`${API_URL}/auth/lookup-email/${encodeURIComponent(cleanEmail)}`);
      const data = await res.json();
      if (data.success && data.user) {
        if (data.token) localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_email", cleanEmail);
        setUser(data.user);
        setToast(`สลับบัญชีผู้ใช้เป็น: ${data.user.full_name || data.user.name_th || data.user.name_en}`);
        setTimeout(() => {
          window.location.reload();
        }, 150);
        return true;
      }
    } catch (err) {
      console.error("Switch user error:", err);
    }
    return false;
  };

  // 3. ฟังก์ชันออกจากระบบ
  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_email");
    setUser(null);
    setToast("ออกจากระบบเรียบร้อยแล้ว");
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // ซ่อน Toast อัตโนมัติหลัง 2.6 วินาที
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        isLoggingIn,
        authError,
        setAuthError,
        toast,
        setToast,
        loginWithMicrosoft,
        loginWithEmail,
        switchUserByEmail,
        logout,
        token: localStorage.getItem("auth_token"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
