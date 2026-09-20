const nodemailer = require('nodemailer');
const { supabase, UP_ICT_FACULTY } = require('./db');
require('dotenv').config();

// สร้าง Transporter สำหรับส่งอีเมล
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || user.includes('your-email')) {
    // โหมดทดสอบ / จำลอง (เมื่อยังไม่ได้ตั้งค่า credentials จริงใน .env)
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
}

// ลบคำนำหน้าทางวิชาการและตำแหน่งออก เพื่อให้เหลือเฉพาะ ชื่อ-นามสกุล แท้จริง
function sanitizePersonName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let name = rawName.trim();

  // คำนำหน้าภาษาไทย
  const thPrefixes = [
    /^(ศาสตราจารย์\s*ดร\.|ศ\.\s*ดร\.)/i,
    /^(รองศาสตราจารย์\s*ดร\.|รศ\.\s*ดร\.)/i,
    /^(ผู้ช่วยศาสตราจารย์\s*ดร\.|ผศ\.\s*ดร\.)/i,
    /^(ศาสตราจารย์|ศ\.)/i,
    /^(รองศาสตราจารย์|รศ\.)/i,
    /^(ผู้ช่วยศาสตราจารย์|ผศ\.)/i,
    /^(อาจารย์\s*ดร\.|อ\.\s*ดร\.)/i,
    /^(อาจารย์|อ\.)/i,
    /^(ดร\.|ดร)/i,
    /^(นาย|นางสาว|นาง)/i
  ];

  // คำนำหน้าภาษาอังกฤษ
  const enPrefixes = [
    /^(assoc\.\s*prof\.\s*dr\.|assoc\.\s*prof\.|asst\.\s*prof\.\s*dr\.|asst\.\s*prof\.)/i,
    /^(prof\.\s*dr\.|prof\.)/i,
    /^(dr\.|dr\b)/i,
    /^(mr\.|mrs\.|ms\.)/i,
    /^(lecturer|instructor|teacher)/i
  ];

  for (const regex of [...thPrefixes, ...enPrefixes]) {
    name = name.replace(regex, '');
  }

  // ทำความสะอาดอักขระพิเศษ เว้นวรรคคู่ เครื่องหมายจุด/จุลภาค
  return name.replace(/['"`,]/g, ' ')
             .replace(/\./g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
             .toLowerCase();
}

/**
 * ฟังก์ชันตรวจสอบความแม่นยำของการแมตช์ชื่อผู้แต่ง (Strict Multi-tier Matcher)
 * คืนค่า: true หากตรงกันอย่างแม่นยำสูง
 */
function isStrictNameMatch(searchCleanName, targetCleanName) {
  if (!searchCleanName || !targetCleanName) return false;
  if (searchCleanName === targetCleanName) return true;

  const searchTokens = searchCleanName.split(' ').filter(t => t.length > 0);
  const targetTokens = targetCleanName.split(' ').filter(t => t.length > 0);

  if (searchTokens.length === 0 || targetTokens.length === 0) return false;

  // 1. ถ้ามีทั้งชื่อและนามสกุล (2 tokens ขึ้นไป)
  if (searchTokens.length >= 2 && targetTokens.length >= 2) {
    const sFirst = searchTokens[0];
    const sLast = searchTokens[searchTokens.length - 1];
    const tFirst = targetTokens[0];
    const tLast = targetTokens[targetTokens.length - 1];

    // รูปแบบ: First Last === First Last
    if (sFirst === tFirst && sLast === tLast) return true;

    // รูปแบบสลับ: Last First === First Last (เช่น "Prajongsil Natathawut" vs "Natathawut Prajongsil")
    if (sFirst === tLast && sLast === tFirst) return true;

    // รูปแบบชื่อย่อ: "N. Prajongsil" vs "Natathawut Prajongsil"
    if (sFirst.length === 1 && sLast === tLast && tFirst.startsWith(sFirst)) return true;
    if (tFirst.length === 1 && sLast === tLast && sFirst.startsWith(tFirst)) return true;

    // รูปแบบชื่อย่อแบบ Scopus: "Prajongsil, N." vs "Natathawut Prajongsil"
    if (sLast.length === 1 && sFirst === tLast && tFirst.startsWith(sLast)) return true;
    if (tLast.length === 1 && sFirst === tFirst && sLast.startsWith(tLast)) return true;
  }

  // 2. ถ้าค้นหาแบบคำเดียว (ต้องยาวอย่างน้อย 4 ตัวอักษร และตรงแบบ Exact Word)
  if (searchTokens.length === 1 && targetTokens.length >= 1) {
    const single = searchTokens[0];
    if (single.length >= 4 && targetTokens.includes(single)) {
      return true;
    }
  }

  return false;
}

/**
 * ค้นหาอีเมลของอาจารย์/ผู้แต่ง จากชื่อ (ภาษาไทย / อังกฤษ / ชื่อย่อ) แบบแม่นยำสูง
 */
async function findAuthorEmailByName(authorName) {
  if (!authorName) return null;
  const cleanSearch = sanitizePersonName(authorName);
  if (!cleanSearch || cleanSearch.length < 2) return null;

  // 1. ค้นหาในตาราง users บน Supabase ก่อน
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, name_en, name_th, department');

    if (!error && users && users.length > 0) {
      for (const u of users) {
        if (!u.email) continue;
        const cleanEn = sanitizePersonName(u.name_en);
        const cleanTh = sanitizePersonName(u.name_th);
        const cleanFull = sanitizePersonName(u.full_name);

        if (isStrictNameMatch(cleanSearch, cleanEn) ||
            isStrictNameMatch(cleanSearch, cleanTh) ||
            isStrictNameMatch(cleanSearch, cleanFull)) {
          console.log(`[Email Matcher] 🎯 แมตช์สำเร็จ (Supabase User): "${authorName}" ➔ ${u.email} (${u.name_th || u.name_en || u.full_name})`);
          return { email: u.email, name: u.name_th || u.name_en || u.full_name, department: u.department, userId: u.id };
        }
      }
    }
  } catch (err) {
    console.error('[Email Matcher DB Error]:', err.message);
  }

  // 2. ค้นหาในข้อมูลอาจารย์คณะ ICT ทั้งหมด (UP_ICT_FACULTY 181 ท่าน)
  for (const f of UP_ICT_FACULTY) {
    if (!f.email) continue;
    const cleanEn = sanitizePersonName(f.name_en);
    const cleanTh = sanitizePersonName(f.name_th);

    if (isStrictNameMatch(cleanSearch, cleanEn) || isStrictNameMatch(cleanSearch, cleanTh)) {
      console.log(`[Email Matcher] 🎯 แมตช์สำเร็จ (ICT Faculty DB): "${authorName}" ➔ ${f.email} (${f.name_th || f.name_en})`);
      return { email: f.email, name: f.name_th || f.name_en, department: f.department, userId: null };
    }
  }

  console.warn(`[Email Matcher] ⚠️ ไม่พบอีเมลที่ตรงกับชื่อ: "${authorName}" อย่างแม่นยำ (ข้ามการส่งเพื่อความปลอดภัย ไม่ส่งผิดคน)`);
  return null;
}

/**
 * ส่งอีเมลแจ้งเตือนผู้แต่งทุกคนที่ร่วมในผลงานวิจัย
 */
async function sendCoAuthorConfirmationEmail({ toEmail, recipientName, submitterName, paperTitle, submitterProportion, authorList, frontendUrl }) {
  const transporter = createTransporter();
  const siteUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const configuredFrom = process.env.SMTP_FROM && !process.env.SMTP_FROM.includes('your-email') ? process.env.SMTP_FROM : null;
  const fromEmail = configuredFrom || process.env.SMTP_USER || 'no-reply@up.ac.th';

  // ตารางสรุปรายชื่อผู้แต่งและสัดส่วนทั้งหมด
  let authorsTableHtml = '';
  if (Array.isArray(authorList) && authorList.length > 0) {
    authorsTableHtml = `
      <div style="margin: 18px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px;">
          👥 สัดส่วนผู้ร่วมจัดทำผลงานทั้งหมด:
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; text-align: left;">
              <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">บทบาท</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">ชื่อ-นามสกุล</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">สัดส่วน (%)</th>
            </tr>
          </thead>
          <tbody>
            ${authorList.map((a, idx) => `
              <tr style="border-bottom: 1px solid #f1f5f9; ${a.name && recipientName && a.name.toLowerCase().includes(recipientName.toLowerCase()) ? 'background: #fdf4ff; font-weight: 600;' : ''}">
                <td style="padding: 8px 12px; color: #6b21a8;">${a.role || (idx === 0 ? 'First author' : 'Co author')}</td>
                <td style="padding: 8px 12px;">${a.name || '-'}</td>
                <td style="padding: 8px 12px; text-align: center; color: #0f172a; font-weight: 700;">${a.proportion ?? '-'}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 26px 24px; text-align: center; }
        .header h2 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 26px 24px; line-height: 1.6; }
        .info-box { background: #f8fafc; border-left: 4px solid #7c3aed; padding: 14px 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e2e8f0; border-left-width: 4px; }
        .btn-container { text-align: center; margin: 26px 0 16px 0; }
        .btn { display: inline-block; background: #7c3aed; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3); }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>ระบบบริหารจัดการภาระงานทางวิชาการ (AMS)</h2>
          <p>คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา</p>
        </div>
        <div class="content">
          <p>เรียน <strong>อาจารย์ ${recipientName || 'ผู้ร่วมจัดทำผลงาน'}</strong>,</p>
          <p>ระบบขอแจ้งข้อมูลการบันทึกและจัดสรรสัดส่วนภาระงานสำหรับผลงานวิจัย โดยอาจารย์ <strong>${submitterName || 'ผู้บันทึกผลงาน'}</strong>:</p>
          
          <div class="info-box">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
              📄 ชื่อบทความ / ผลงานวิชาการ:
            </div>
            <div style="font-size: 13px; color: #334155; margin-bottom: 6px;">
              ${paperTitle || 'ไม่มีชื่อบทความ'}
            </div>
          </div>

          ${authorsTableHtml}

          <p style="font-size: 13px; color: #475569;">ขอความอนุเคราะห์ท่านเข้าสู่ระบบเพื่อตรวจสอบและยืนยันความถูกต้องของสัดส่วนภาระงาน สำหรับนำไปใช้ประเมินภาระงานทางวิชาการต่อไป</p>

          <div class="btn-container">
            <a href="https://research-management-9vlg-git-main-kcalpath.vercel.app/" class="btn" target="_blank">เข้าสู่ระบบเพื่อตรวจสอบสัดส่วนภาระงาน</a>
          </div>
        </div>
        <div class="footer">
          อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ AMS ICT UP กรุณาอย่าตอบกลับอีเมลนี้<br>
          © คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [MOCK EMAIL TRIGGERED - SMTP NOT CONFIGURED]`);
    console.log(`➡️ ถึง: ${toEmail} (${recipientName})`);
    console.log(`📄 บทความ: ${paperTitle}`);
    console.log(`👤 ผู้ยืนยัน: ${submitterName}`);
    console.log(`🔗 ลิงก์: ${siteUrl}`);
    console.log(`======================================================\n`);
    return { success: true, mocked: true, recipient: toEmail };
  }

  try {
    const info = await transporter.sendMail({
      from: `"ระบบภาระงานวิจัย ICT UP" <${fromEmail}>`,
      to: toEmail,
      subject: `[แจ้งเตือน] สรุปสัดส่วนผลงานวิจัย: ${paperTitle}`,
      html: htmlContent
    });
    console.log(`✅ ส่งอีเมลสำเร็จไปยัง ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId, recipient: toEmail };
  } catch (error) {
    console.error(`❌ ส่งอีเมลล้มเหลวไปยัง ${toEmail}:`, error.message);
    return { success: false, error: error.message, recipient: toEmail };
  }
}

/**
 * ค้นหาผู้แต่งทุกคนในบทความ และยิงอีเมลแจ้งเตือนอัตโนมัติไปยังทุกคนที่ร่วมในผลงานวิจัย
 */
async function triggerCoAuthorNotificationWorkflow({ paperId, submitterUserId, submitterName, submitterProportion, paperTitle, authorsRaw, authorList }) {
  const notifications = [];
  const notifiedEmails = new Set();

  // 1. ตรวจสอบผู้แต่งทุกคนใน authorList
  if (Array.isArray(authorList) && authorList.length > 0) {
    for (const author of authorList) {
      if (!author.name) continue;

      // ค้นหาอีเมลของผู้แต่งแต่ละคน
      const matched = await findAuthorEmailByName(author.name);
      if (matched && matched.email && !notifiedEmails.has(matched.email)) {
        notifiedEmails.add(matched.email);
        notifications.push({
          email: matched.email,
          name: matched.name || author.name,
          role: author.role || 'Co author'
        });
      } else if (!matched) {
        console.warn(`[Email Workflow] ⚠️ ไม่พบอีเมลในฐานข้อมูลสำหรับผู้แต่ง: "${author.name}"`);
      }
    }
  }

  // 2. ตรวจสอบว่าผู้ยื่น (Submitter) ได้รับสำเนาแจ้งเตือนด้วยหรือไม่
  if (submitterUserId) {
    try {
      const { data: submitterUser } = await supabase
        .from('users')
        .select('email, full_name, name_th, name_en')
        .eq('id', submitterUserId)
        .limit(1);

      if (submitterUser && submitterUser.length > 0 && submitterUser[0].email) {
        const sEmail = submitterUser[0].email;
        if (!notifiedEmails.has(sEmail)) {
          notifiedEmails.add(sEmail);
          notifications.push({
            email: sEmail,
            name: submitterUser[0].name_th || submitterUser[0].name_en || submitterUser[0].full_name || submitterName,
            role: 'First author'
          });
        }
      }
    } catch (sErr) {
      console.error('[Submitter Email Lookup Error]:', sErr.message);
    }
  }

  // 3. ถ้ามี paperId ในระบบ papers / paper_authors
  if (paperId && !isNaN(parseInt(paperId, 10))) {
    try {
      const { data: paperAuthors } = await supabase
        .from('paper_authors')
        .select(`
          user_id,
          status,
          users (
            id,
            email,
            full_name,
            name_en,
            name_th
          )
        `)
        .eq('paper_id', parseInt(paperId, 10));

      if (paperAuthors && paperAuthors.length > 0) {
        for (const pa of paperAuthors) {
          const user = pa.users;
          if (user && user.email && !notifiedEmails.has(user.email)) {
            notifiedEmails.add(user.email);
            notifications.push({
              email: user.email,
              name: user.name_th || user.name_en || user.full_name,
              role: 'Co author'
            });
          }
        }
      }
    } catch (err) {
      console.error('[Trigger Notification DB Error]:', err.message);
    }
  }

  // 3. ส่งอีเมลแจ้งเตือนทุกคนที่ร่วมในงานวิจัย
  const sendResults = [];
  for (const recipient of notifications) {
    const res = await sendCoAuthorConfirmationEmail({
      toEmail: recipient.email,
      recipientName: recipient.name,
      submitterName: submitterName || 'ผู้บันทึกผลงาน',
      paperTitle: paperTitle || 'ผลงานวิจัย',
      submitterProportion: submitterProportion,
      authorList: authorList
    });
    sendResults.push(res);
  }

  return {
    totalRecipients: notifications.length,
    recipients: notifications,
    results: sendResults
  };
}

module.exports = {
  findAuthorEmailByName,
  sendCoAuthorConfirmationEmail,
  triggerCoAuthorNotificationWorkflow
};
