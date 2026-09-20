# 📧 เอกสารระบบแจ้งเตือนสัดส่วนผลงานวิจัยทางอีเมลอัตโนมัติ (Research Proportion Email Notification Feature)

เอกสารฉบับนี้จัดทำขึ้นเพื่อบันทึกโครงสร้าง สถาปัตยกรรมโค้ด ตรรกะการทำงาน และจุดที่ต้องแก้ไข/ปรับแต่ง สำหรับ **"ระบบแจ้งเตือนสัดส่วนผลงานวิจัยทางอีเมลอัตโนมัติ (Real-time Co-Author Notification)"**

---

## 1. ภาพรวมการทำงาน (Feature Overview)

เมื่อมีผู้ใช้งานหรืออาจารย์บันทึกผลงานวิจัยใหม่ลงในระบบ (ผ่าน Form, AI PDF Extract, หรือ Google Scholar/Scopus) หรือกดยืนยันสัดส่วนผลงาน:
1. ระบบจะดึงรายชื่อผู้แต่งทุกคนในผลงานวิจัยนั้นมาวิเคราะห์
2. ระบบจะนำชื่อ-นามสกุลไปค้นหาในฐานข้อมูลอย่างละเอียด (Strict High-Precision Matching)
3. สำหรับทุกท่านที่พบชื่อในฐานข้อมูล ระบบจะส่งอีเมลแจ้งเตือนพร้อม **ตารางสรุปสัดส่วนภาระงาน (%)** แบบ Real-time ทันที
4. ผู้บันทึก (Submitter) จะได้รับอีเมลสำเนาการบันทึกผลงานด้วยเช่นกัน
5. หากชื่อใดไม่พบในฐานข้อมูล ระบบจะบล็อกการส่งเพื่อความปลอดภัย ไม่ส่งผิดคนแน่นอน

---

## 2. แผนผังไฟล์และตำแหน่งโค้ดที่เกี่ยวข้อง (Code Architecture)

```
C:\Research-Management-main\
├── CO_AUTHOR_NOTIFICATION_FEATURE.md               <-- เอกสารคู่มือฉบับนี้
├── WORKLOAD_DASHBOARD_PLAN.md                     <-- แผนงานโดยรวม
└── Project_ict_clean-main\
    ├── backend\
    │   ├── .env                                  <-- การตั้งค่า SMTP Email Credentials
    │   ├── db.js                                 <-- ฐานข้อมูลอาจารย์ ICT UP (181 ท่าน) & Supabase Connection
    │   ├── emailService.js                       <-- ฟังก์ชันค้นหาชื่อ, Strict Matcher, HTML Template, Nodemailer
    │   └── server.js                             <-- API Endpoints ที่สั่ง Trigger การส่งเมล
    └── my-react-app\
        └── src\
            ├── App.jsx                           <-- ฟอร์มกรอกผู้แต่ง, Validation Rules, Smart Split Presets
            └── components\
                └── ScholarDashboard.jsx          <-- หน้าจอยืนยันผลงาน Scopus / Google Scholar
```

---

## 3. รายละเอียดโค้ดและจุดสำคัญในแต่ละไฟล์

### 📁 3.1 `backend/emailService.js` (หัวใจหลักของระบบอีเมล)
* **`sanitizePersonName(rawName)`**: ตัดคำนำหน้าทางวิชาการและยศออกทั้งหมด
  * *ภาษาไทย*: ศ.ดร., รศ.ดร., ผศ.ดร., ดร., อาจารย์, ผศ., รศ., ศ., อ., นาย, นาง, นางสาว
  * *ภาษาอังกฤษ*: Prof. Dr., Assoc. Prof. Dr., Asst. Prof. Dr., Dr., Mr., Mrs., Ms.
* **`isStrictNameMatch(searchName, targetName)`**: ตรวจสอบความถูกต้องของชื่อ-นามสกุล
  * รองรับ `First Last === First Last`
  * รองรับการสลับ `Last, First === First Last`
  * รองรับชื่อย่อ Scopus เช่น `Chaikaew, N.` หรือ `N. Chaikaew`
  * ป้องกัน Loose Substring Matching เพื่อไม่ให้ส่งผิดคน
* **`findAuthorEmailByName(authorName)`**: ค้นหาอีเมลจาก Supabase `users` ก่อน หากไม่พบจะค้นหาจาก `UP_ICT_FACULTY` (181 ท่าน)
* **`sendCoAuthorConfirmationEmail(...)`**: สร้าง Responsive HTML Email สไตล์ Modern มีแบนเนอร์ ICT UP และตารางแจกแจงสัดส่วน
* **`triggerCoAuthorNotificationWorkflow(...)`**: ฟังก์ชันควบคุมลำดับการส่งอีเมลไปยังผู้แต่งทุกคนพร้อมกัน

### 📁 3.2 `backend/server.js` (จุดเชื่อมต่อ API Triggers)
* **`POST /api/entries`** (บันทึกผลงานใหม่ / ปรับแต่งข้อมูล):
  * ตรวจสอบ `authorList` หรือแยกสตริงจาก `authors`
  * สั่งเรียก `triggerCoAuthorNotificationWorkflow(...)` แบบ Async Background
* **`POST /api/save`** (บันทึกผลงานที่สกัดจาก PDF AI ลงตาราง `research_papers`):
  * สั่งส่งอีเมลแจ้งเตือนผู้แต่งทุกคนที่พบในฐานข้อมูล
* **`PUT /api/papers/:paperId/confirm`** (กดยืนยันสัดส่วนผลงานใน Scholar Dashboard):
  * อัปเดตสัดส่วนของผู้ใช้ และส่งอีเมลแจ้งเตือนไปยังผู้ร่วมวิจัยท่านอื่นทันที

### 📁 3.3 `backend/.env` (การตั้งค่า SMTP Server)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM=your_email@gmail.com
FRONTEND_URL=http://localhost:5173
```
*(รองรับทั้ง Gmail SMTP Port 465 และ Microsoft 365 / Outlook SMTP Port 587)*

### 📁 3.4 `my-react-app/src/App.jsx` (หน้าบ้าน & กฎการคำนวณ)
* **กฎสัดส่วนผู้แต่ง (Proportion Validation Rules)**:
  1. ผลรวมสัดส่วนทุกคน = 100% พอดี
  2. ลำดับสัดส่วน: `First author >= Corresponding author >= Co author`
  3. ถ้ามีผู้แต่งมากกว่า 1 คน ➔ `First author < 100%` และทุกคนต้องมีสัดส่วน `> 0%`
  4. ทุกคนมีช่องระบุ บทบาท (Role), สัดส่วน (%), สถาบัน (Affiliation)
* **ปุ่ม Smart Split Presets**:
  * ⚡ *แบ่งเท่ากันทุกคน (Equal Split)*
  * 👑 *จัดสัดส่วนตามลำดับ (Leader Heavy)*

---

## 4. คู่มือการแก้ไขและปรับแต่งในอนาคต (Maintenance & How-To)

### 🛠️ ก. ต้องการเปลี่ยนดีไซน์หรือข้อความในอีเมล
1. เปิดไฟล์ `Project_ict_clean-main/backend/emailService.js`
2. ไปที่ฟังก์ชัน `sendCoAuthorConfirmationEmail`
3. แก้ไขตัวแปร `htmlContent` (สามารถเปลี่ยนสี โลโก้ ข้อความ หรือลิงก์ปุ่มกด)

### 🛠️ ข. ต้องการเปลี่ยนบัญชีอีเมลสำหรับส่ง (SMTP)
1. เปิดไฟล์ `Project_ict_clean-main/backend/.env`
2. แก้ไขค่า `SMTP_USER` และ `SMTP_PASS` (หากใช้ Gmail ให้ใช้รหัส App Password 16 หลัก)
3. บันทึกไฟล์ nodemon จะรีสตาร์ตเซิร์ฟเวอร์ให้อัตโนมัติ

### 🛠️ ข. ต้องการเพิ่ม/แก้ไขรายชื่ออาจารย์ในฐานข้อมูล
* **กรณีแก้ไขชั่วคราว/โค้ด**: แก้ไขในอาร์เรย์ `UP_ICT_FACULTY` ในไฟล์ `Project_ict_clean-main/backend/db.js`
* **กรณีแก้ไขถาวร**: เพิ่มหรืออัปเดตข้อมูลในตาราง `users` บน **Supabase Dashboard** (ระบบจะดึงข้อมูลสดจาก Supabase เป็นอันดับแรกเสมอ)

---

## 5. บันทึกประวัติการพัฒนา (Changelog)
* **2026-09-21**: 
  - เพิ่มระบบ Strict Multi-tier Name to Email Matcher
  - เพิ่มระบบ Auto-Sanitization ตัดคำนำหน้าทางวิชาการอัตโนมัติ
  - ผูก Real-time Notification เข้ากับ `POST /api/entries`, `POST /api/save`, และ `PUT /api/papers/:paperId/confirm`
  - ทดสอบการส่งจริงสำเร็จผ่าน Gmail SMTP ไปยังอีเมล `@up.ac.th`
