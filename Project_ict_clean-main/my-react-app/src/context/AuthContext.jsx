
import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = "http://localhost:5000/api";

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

    if (activeToken) {
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
      // Dev mode: auto-create mock user for testing without Microsoft login
      if (process.env.NODE_ENV === 'development') {
        const mockUser = {
          id: 1,
          email: 'dev@up.ac.th',
          full_name: 'Developer Test',
          name_en: 'Dev User',
          name_th: 'นักพัฒนา ทดสอบ',
          department: 'Information Technology',
          position: 'อาจารย์',
          scholar_id: null,
          role: 'admin'
        };
        setUser(mockUser);
        localStorage.setItem('auth_token', 'dev-mock-token');
      }
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

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.message || "การเข้าสู่ระบบไม่สำเร็จ");
        setIsLoggingIn(false);
        return false;
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      if (data.user) {
        setUser(data.user);
      }
      setToast("เข้าสู่ระบบเรียบร้อยแล้ว");
      setIsLoggingIn(false);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      setAuthError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setIsLoggingIn(false);
      return false;
    }
  };

  // 3. ฟังก์ชันออกจากระบบ
  const logout = () => {
    localStorage.removeItem("auth_token");
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
