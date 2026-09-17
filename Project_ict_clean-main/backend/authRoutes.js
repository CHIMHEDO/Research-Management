const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { authenticateToken, authorizeRoles } = require('./authMiddleware');

// 1. ขอ URL สำหรับไปยังหน้า Login ของ Microsoft (คงไว้เผื่อใช้ในอนาคต)
router.get('/microsoft', authController.getMicrosoftAuthUrl);

// 2. Callback URL ที่ Microsoft Redirect กลับมาพร้อม auth code
router.get('/microsoft/callback', authController.handleMicrosoftCallback);

// 3. ล็อกอินด้วย Email + Password (เฉพาะ @up.ac.th)
router.post('/login', authController.loginWithEmail);

// 4. สร้างผู้ใช้ใหม่ (เฉพาะ Admin)
router.post('/register', authenticateToken, authorizeRoles('admin'), authController.registerUser);

// 5. ดึงข้อมูล Profile ของผู้ใช้ปัจจุบัน
router.get('/me', authenticateToken, authController.getCurrentUserProfile);

// 6. ดูรายชื่อ User ทั้งหมด (เฉพาะ Admin)
router.get('/users', authenticateToken, authorizeRoles('admin'), authController.getAllUsers);

// 7. อัปเดต Role และ Program ของ User (เฉพาะ Admin)
router.put('/users/:id/role', authenticateToken, authorizeRoles('admin'), authController.updateUserRole);

// 8. ดึงรายชื่อหลักสูตรทั้งหมด
router.get('/programs', authController.getPrograms);

module.exports = router;
