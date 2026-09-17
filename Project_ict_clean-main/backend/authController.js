
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');
const { JWT_SECRET } = require('./authMiddleware');
require('dotenv').config();

// 1. สร้าง URL สำหรับ Redirect ไปหน้าล็อกอินของ Microsoft
exports.getMicrosoftAuthUrl = (req, res) => {
  const tenant = process.env.AZURE_TENANT_ID || 'common';
  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback');
  const scope = encodeURIComponent('openid profile email User.Read');
  const responseType = 'code';

  const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&scope=${scope}&response_mode=query`;

  res.json({ url: authUrl });
};

// 2. รับ Callback จาก Microsoft พร้อม auth code และออก JWT Token
exports.handleMicrosoftCallback = async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/?error=no_code_provided`);
  }

  try {
    const tenant = process.env.AZURE_TENANT_ID || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

    // ขอ Access Token จาก Microsoft ด้วย Authorization Code
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback',
      grant_type: 'authorization_code',
    });

    const tokenResponse = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResponse.data.access_token;

    // ดึงข้อมูล Profile จาก Microsoft Graph API (/me)
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { id: azureId, displayName, mail, userPrincipalName } = userResponse.data;
    const email = mail || userPrincipalName;

    // ตรวจสอบผู้ใช้ในตาราง users หรือสร้างใหม่
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? OR azure_id = ?', [email, azureId]);

    let user;
    if (existingUsers.length > 0) {
      user = existingUsers[0];
      await db.query(
        'UPDATE users SET azure_id = ?, full_name = ? WHERE id = ?',
        [azureId, displayName || user.full_name, user.id]
      );
    } else {
      const [insertResult] = await db.query(
        'INSERT INTO users (azure_id, email, full_name, role) VALUES (?, ?, ?, ?)',
        [azureId, email, displayName || email, 'user']
      );
      user = {
        id: insertResult.insertId,
        azure_id: azureId,
        email: email,
        full_name: displayName || email,
        role: 'user',
        program_id: null,
      };
    }

    // สร้าง JWT Token ของระบบ
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        program_id: user.program_id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect กลับไป Frontend พร้อม Token
    res.redirect(`${frontendUrl}/?token=${token}`);
  } catch (error) {
    console.error('Error during Microsoft OAuth callback:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/?error=auth_failed`);
  }
};

// 3. ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
exports.getCurrentUserProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.program_id, p.name AS program_name
       FROM users u
       LEFT JOIN programs p ON u.program_id = p.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. ดูรายชื่อผู้ใช้ทั้งหมด (สำหรับ Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.program_id, p.name AS program_name, u.created_at
       FROM users u
       LEFT JOIN programs p ON u.program_id = p.id
       ORDER BY u.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. อัปเดตสิทธิ์ Role ของผู้ใช้ (สำหรับ Admin)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, program_id } = req.body;

    const validRoles = ['user', 'admin', 'executive', 'chair'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
    }

    await db.query(
      'UPDATE users SET role = ?, program_id = ? WHERE id = ?',
      [role, program_id || null, id]
    );

    res.json({ success: true, message: 'อัปเดตสิทธิ์เรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. ดึงรายชื่อหลักสูตรทั้งหมด
exports.getPrograms = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM programs ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. ล็อกอินด้วย Email + Password (เฉพาะ @up.ac.th เท่านั้น)
exports.loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    // ตรวจสอบ domain อีเมล
    if (!email.toLowerCase().endsWith('@up.ac.th')) {
      return res.status(403).json({ success: false, message: 'อนุญาตเฉพาะอีเมลของมหาวิทยาลัยพะเยา (@up.ac.th) เท่านั้น' });
    }

    // ค้นหาผู้ใช้จากฐานข้อมูล
    const [users] = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.program_id, u.password_hash, p.name AS program_name
       FROM users u
       LEFT JOIN programs p ON u.program_id = p.id
       WHERE u.email = ?`,
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
    }

    const user = users[0];

    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // ออก JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        program_id: user.program_id,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        program_id: user.program_id,
        program_name: user.program_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
};

// 8. สร้างผู้ใช้ใหม่พร้อมรหัสผ่าน (เฉพาะ Admin เท่านั้น)
exports.registerUser = async (req, res) => {
  try {
    const { email, full_name, password, role, program_id } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อ, รหัสผ่าน)' });
    }

    if (!email.toLowerCase().endsWith('@up.ac.th')) {
      return res.status(403).json({ success: false, message: 'อนุญาตเฉพาะอีเมล @up.ac.th เท่านั้น' });
    }

    // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้มีในระบบแล้ว' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      'INSERT INTO users (email, full_name, role, program_id, password_hash) VALUES (?, ?, ?, ?, ?)',
      [email.toLowerCase(), full_name, role || 'user', program_id || null, password_hash]
    );

    res.status(201).json({
      success: true,
      message: 'สร้างผู้ใช้เรียบร้อยแล้ว',
      userId: result.insertId,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
};
