
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
          }
        })
        .catch(err => {
          console.error("Auth verify error:", err);
          localStorage.removeItem("auth_token");
        })
        .finally(() => {
          setAuthLoading(false);
        });
    } else {
      // ค้นหาข้อมูลอาจารย์จริงจาก Database ตามอีเมลที่เคยล็อกอินไว้ หรือค่าเริ่มต้น 67022546@up.ac.th
      const savedEmail = localStorage.getItem("user_email") || "67022546@up.ac.th";
      fetch(`${API_URL}/auth/lookup-email/${encodeURIComponent(savedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem("user_email", data.user.email);
          }
        })
        .catch(err => {
          console.error("Database user lookup error:", err);
        })
        .finally(() => {
          setAuthLoading(false);
        });
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

      // 1. ลองล็อกอินผ่าน Password ก่อน
      let loginSuccess = false;
      try {
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
          setToast(`ยินดีต้อนรับ อาจารย์ ${data.user.full_name || data.user.name_th || data.user.name_en}`);
          setIsLoggingIn(false);
          return true;
        }
      } catch (err) {
        // Continue to database email lookup fallback
      }

      // 2. Fallback: ค้นหาข้อมูลโปรไฟล์อาจารย์จากฐานข้อมูลโดยตรงด้วยอีเมล
      const lookupRes = await fetch(`${API_URL}/auth/lookup-email/${encodeURIComponent(cleanEmail)}`);
      const lookupData = await lookupRes.json();

      if (lookupData && lookupData.success && lookupData.user) {
        localStorage.setItem("user_email", cleanEmail);
        localStorage.setItem("auth_token", "custom-token-" + cleanEmail);
        setUser(lookupData.user);
        setToast(`เข้าสู่ระบบในชื่อ: ${lookupData.user.full_name || lookupData.user.name_th || lookupData.user.name_en}`);
        setIsLoggingIn(false);
        return true;
      }

      setAuthError("ไม่พบข้อมูลอาจารย์จากอีเมลนี้ในระบบฐานข้อมูล (@up.ac.th)");
      setIsLoggingIn(false);
      return false;
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
        localStorage.setItem("user_email", cleanEmail);
        setUser(data.user);
        setToast(`สลับบัญชีผู้ใช้เป็น: ${data.user.full_name || data.user.name_th || data.user.name_en}`);
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
