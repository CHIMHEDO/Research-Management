const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_project_ict_2026";

// 1. ตรวจสอบว่ามี Token และถูกต้องหรือไม่
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Extracts token after "Bearer"

  // Dev mode bypass for dev-mock-token (handles both raw and Bearer prefix)
  if (authHeader === 'dev-mock-token' || token === 'dev-mock-token') {
    req.user = { id: 1, role: 'admin' };
    return next();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "กรุณาเข้าสู่ระบบ (Unauthorized)" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Token หมดอายุหรือไม่ถูกต้อง" });
    }
    req.user = user;
    next();
  });
}

// 2. ตรวจสอบสิทธิ์ Role
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "คุณไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้ (Forbidden)"
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET,
};
