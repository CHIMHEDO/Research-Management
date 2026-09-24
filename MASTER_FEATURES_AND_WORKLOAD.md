สำหรับบันทึกเป้าหมายที่ทำไปแล้ว
# 📚 เอกสารรวมระบบและฟีเจอร์ทั้งหมด (Master Project & Feature Documentation)


> **ศูนย์รวมเอกสารข้อมูลระบบ สถาปัตยกรรม แผนงาน และจุดแก้ไขโค้ดแยกตามฟีเจอร์**  
> เอกสารฉบับนี้รวบรวมเนื้อหาจาก `workload.md`, `CO_AUTHOR_NOTIFICATION_FEATURE.md`, และ `WORKLOAD_DASHBOARD_PLAN.md` เข้าด้วยกันเป็นฉบับสมบูรณ์ เพื่อให้สะดวกในการค้นหาและแก้ไขโค้ดตามแต่ละส่วนได้อย่างแม่นยำ

👥 ตำแหน่งผู้ประพันธ์ในระบบ                                                            

                                                                                            
   ลำดับ │ ตำแหน่ง (Role)       │ ความหมายและหน้าที่             │ เกณฑ์สัดส่วน (%)
  ─────┼────────────────────┼─────────────────────────────┼──────────────────────────────   
    1  │ First author       │ ผู้ประพันธ์อันดับแรก              │ ต้องมีสัดส่วนมากที่สุด หรือเท่ากับ
       │                    │ (ผู้แต่งหลัก)เป็นผู้ดำเนินการวิจัยหลักแ │ Corresponding autho 
       │                    │ ละเขียนร่างบทความ             │
    2  │ Corresponding      │ ผู้ประพันธ์บรรณกิจ               │ สัดส่วนต้องไม่มากกว่า Firs 
       │ author             │ (ผู้รับผิดชอบบทความ)เป็นผู้ติดต่อสื่อส │ author และไม่น้อยกว่า Co author
       │                    │ ารกับสำนักพิมพ์/กองบรรณาธิการ     │
    3  │ Co author          │ ผู้ประพันธ์ร่วมผู้มีส่วนร่วมในการทำวิจัย │ สัดส่วนต้องไม่มากกว               ว่า
       │                    │ ให้คำปรึกษา หรือร่วมวิเคราะห์ข้อมูล  │ Corresponding และ Firs 
       │                    │                             │ author
    4  │ First &            │ ผู้ประพันธ์อันดับแรกและบรรณกิจทำทั้งส │ ครองสัดส่วนเต็มหรือสูง             งสุด
       │ Corresponding      │ องหน้าที่ (ใช้กรณีทำวิจัยคนเดียวเดี่ยว │
       │ author             │ 100% หรือควบทั้ง 2 บทบาท)      │

---

## 📑 สารบัญด่วนตามฟีเจอร์ (Quick Feature Navigation)

1. [แผนผังภาพรวมโครงสร้างไฟล์ (Project Directory Architecture)](#1-แผนผังภาพรวมโครงสร้างไฟล์-project-directory-architecture)
2. [ฟีเจอร์ 1: ระบบ Authentication, Role & User Context](#ฟเจอร-1-ระบบ-authentication-role--user-context)
3. [ฟีเจอร์ 2: ระบบคำนวณและประเมินภาระงาน (Workload Calculation & Simulator)](#ฟเจอร-2-ระบบคำนวณและประเมนภาระงาน-workload-calculation--simulator)
4. [ฟีเจอร์ 3: ระบบแจ้งเตือนสัดส่วนผลงานทางอีเมลอัตโนมัติ (Email Notification)](#ฟเจอร-3-ระบบแจงเตอนสดสวนผลงานทางอเมลอตโนมต-email-notification)
5. [ฟีเจอร์ 4: ระบบยืนยันสัดส่วนผู้ร่วมงาน & กฎอนุมัติ 7 วัน (Co-Author Confirmation)](#ฟเจอร-4-ระบบยนยนสดสวนผรวมงาน--กฎอนมต-7-วน-co-author-confirmation)
6. [ฟีเจอร์ 5: ระบบแจ้งเตือนข้อมูลไม่ครบ & หมดอายุความ 5 ปี (Alerts & Warnings)](#ฟเจอร-5-ระบบแจงเตอนขอมลไมครบ--หมดอายความ-5-ป-alerts--warnings)
7. [ฟีเจอร์ 6: ระบบนำเข้าผลงานภายนอก (Google Scholar, Scopus, AI PDF Extract)](#ฟเจอร-6-ระบบนำเขาผลงานภายนอก-google-scholar-scopus-ai-pdf-extract)
8. [ฟีเจอร์ 7: ระบบฝั่งผู้ดูแลระบบ (Admin Console & Governance)](#ฟเจอร-7-ระบบฝงผดแลระบบ-admin-console--governance)
9. [ฟีเจอร์ 8: โครงสร้างฐานข้อมูล (Database Schema)](#ฟเจอร-8-โครงสรางฐานขอมล-database-schema)
10. [ฟีเจอร์ 9: สถานะการดำเนินงาน & แผนงาน (Roadmap & Checklists)](#ฟเจอร-9-สถานะการดำเนนงาน--แผนงาน-roadmap--checklists)

---

## 1. แผนผังภาพรวมโครงสร้างไฟล์ (Project Directory Architecture)

```text
C:\Research-Management-main\
├── MASTER_FEATURES_AND_WORKLOAD.md     <-- 🌟 ศูนย์รวมเอกสารฉบับนี้ (Master Doc)
└── Project_ict_clean-main\
    ├── backend\                        <-- 🖥️ Backend Server (Node.js/Express)
    │   ├── .env                        <-- ตั้งค่า SMTP, Port, Supabase, JWT Secret
    │   ├── server.js                   <-- รวม REST API Endpoints หลัก
    │   ├── db.js                       <-- เชื่อมต่อ Supabase & ข้อมูลอาจารย์ UP_ICT_FACULTY (181 ท่าน)
    │   ├── authController.js           <-- ตรรกะ Login, Register, Profile, Token Verification
    │   ├── authMiddleware.js           <-- ตรวจสอบสิทธิ์ (JWT, requireAdmin)
    │   ├── authRoutes.js               <-- Endpoint ฝั่ง Authentication
    │   ├── emailService.js             <-- ระบบส่งอีเมล, Strict Name Matcher, HTML Template
    │   ├── cronService.js              <-- Background Job (เช่น Auto-Confirm 7 วัน)
    │   ├── scholarService.js           <-- ดึงข้อมูลจาก Google Scholar API
    │   ├── scopusService.js            <-- ดึงข้อมูลจาก Scopus API
    │   └── llmService.js               <-- สกัดข้อมูลผลงานจาก PDF ด้วย AI / OCR
    └── my-react-app\                   <-- 💻 Frontend (React + Vite + TailwindCSS)
        └── src\
            ├── App.jsx                 <-- หน้า Dashboard, ฟอร์มบันทึกภาระงาน, ตารางผลงาน
            ├── main.jsx                <-- Entry Point ของ React
            ├── api\
            │   └── client.js           <-- Axios API Instance & Interceptors
            ├── context\
            │   └── AuthContext.jsx     <-- เก็บ State การ Login, User Profile, Role, Token
            ├── components\
            │   ├── LoginPage.jsx              <-- หน้าเข้าสู่ระบบ (Email @up.ac.th + Password)
            │   ├── Sidebar.jsx                <-- เมนูนำทาง (Dynamic ตาม Role User/Admin)
            │   ├── Header.jsx                 <-- ส่วนหัวแสดงโปรไฟล์และสวิตช์มุมมอง
            │   ├── PlanningSimulator.jsx      <-- เครื่องมือจำลองคำนวณภาระงานล่วงหน้า
            │   ├── ScholarImportModal.jsx     <-- Modal ดึงผลงานจาก Google Scholar
            │   ├── PdfUploadModal.jsx         <-- Modal อัปโหลด PDF ให้ AI วิเคราะห์
            │   ├── ScholarDashboard.jsx       <-- แดชบอร์ดตรวจสอบผลงาน Scholar / Scopus
            │   ├── UserDisbursementView.jsx   <-- หน้าดูสถานะและประวัติการเบิกจ่ายเงินรางวัล
            │   ├── AdminFacultyOverview.jsx   <-- [Admin] ภาพรวมอาจารย์ทั้งคณะและ 8 สาขา
            │   ├── AdminDuplicateCheck.jsx    <-- [Admin] ตรวจจับผลงานซ้ำซ้อน
            │   ├── AdminDisbursement.jsx      <-- [Admin] อนุมัติและบันทึกการจ่ายเงินรางวัล
            │   └── AdminAuditLogs.jsx         <-- [Admin] ตรวจสอบประวัติการแก้ไขข้อมูล
            ├── constants\
            │   └── authorRoles.js      <-- กำหนด Role ผู้แต่ง (First, Co, Corresponding)
            └── utils\
                ├── authors.js          <-- จัดการ Parse สัดส่วนผู้แต่งและ Format รายชื่อ
                ├── validation.js       <-- กฎตรวจสอบความถูกต้องของฟอร์ม
                ├── paperNormalizer.js  <-- ปรับโครงสร้างข้อมูลผลงานวิจัยให้เป็นมาตรฐาน
                └── curriculumExpiry.js <-- คำนวณวันหมดอายุความผลงาน 5 ปี
```

---

## ฟีเจอร์ 1: ระบบ Authentication, Role & User Context

### 🎯 หน้าที่ของฟีเจอร์
- ตรวจสอบการเข้าสู่ระบบผ่าน Email (`@up.ac.th`) และ Password
- จำแนกสิทธิ์ผู้ใช้งาน (`role: 'user'` หรือ `'admin'`) แบบอัตโนมัติ
- ดึงข้อมูลอาจารย์ที่ล็อกอิน (ชื่อ-นามสกุล, สังกัดสาขาวิชา, Scholar ID, Scopus ID) มาใส่ในฟอร์มและโมดอลอัตโนมัติ (ยกเลิก Hardcoded User)

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **Login UI & State** | `my-react-app/src/components/LoginPage.jsx` | ฟอร์มรับ Email/Password, จัดการแสดง Error |
| **Auth State Context** | `my-react-app/src/context/AuthContext.jsx` | `login()`, `logout()`, `user`, `role`, จัดเก็บ Token |
| **Sidebar Navigation** | `my-react-app/src/components/Sidebar.jsx` | ซ่อน/แสดงเมนู Admin ตาม `user.role === 'admin'` |
| **Auth API Endpoints** | `backend/authRoutes.js` | `POST /api/auth/login`, `GET /api/auth/me` |
| **Auth Controller** | `backend/authController.js` | ค้นหาชื่อในตาราง `users` / `UP_ICT_FACULTY` และสร้าง JWT |
| **Auth Middleware** | `backend/authMiddleware.js` | `verifyToken`, `requireAdmin` ป้องกัน Route หลังบ้าน |

---

## ฟีเจอร์ 2: ระบบคำนวณและประเมินภาระงาน (Workload Calculation & Simulator)

### 🎯 หน้าที่ของฟีเจอร์
- คำนวณชั่วโมงภาระงานและคะแนนคุณภาพตามเกณฑ์ของคณะ ICT มหาวิทยาลัยพะเยา
- ตรวจสอบกฎสัดส่วนผู้แต่ง (Author Proportion Validation):
  1. ผลรวมสัดส่วนทุกคน = 100%
  2. ลำดับสัดส่วน: `First author >= Corresponding author >= Co author`
  3. หากมีผู้แต่ง > 1 คน ➔ `First author < 100%` และทุกคนต้องมีสัดส่วน `> 0%`
- ปุ่มลัด **Smart Split Presets**:
  - ⚡ *แบ่งเท่ากันทุกคน (Equal Split)*
  - 👑 *จัดสัดส่วนตามลำดับความสำคัญ (Leader Heavy)*
- **Planning Simulator**: เครื่องมือจำลองคำนวณภาระงานและเงินรางวัลล่วงหน้าก่อนตีพิมพ์จริง

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **หน้าคำนวณหลัก & ฟอร์ม** | `my-react-app/src/App.jsx` | การคำนวณคะแนน, State ของตาราง, ฟิลด์ `authorList` |
| **กฎสัดส่วน & Helper** | `my-react-app/src/utils/authors.js` | `validateProportions()`, `applySmartSplit()` |
| **เครื่องมือ Simulator** | `my-react-app/src/components/PlanningSimulator.jsx` | คำนวณจำลองตามประเภทวารสาร (Scopus Q1-Q4, TCI 1-2) |
| **บันทึกรายการภาระงาน** | `backend/server.js` | `POST /api/entries`, `PUT /api/entries/:id` |

---

## ฟีเจอร์ 3: ระบบแจ้งเตือนสัดส่วนผลงานทางอีเมลอัตโนมัติ (Email Notification)

### 🎯 หน้าที่ของฟีเจอร์
- เมื่อมีการบันทึกผลงานใหม่ หรือกดยืนยันสัดส่วน:
  1. ดึงรายชื่อผู้แต่งทุกคนมาวิเคราะห์
  2. ตัดคำนำหน้าทางวิชาการอัตโนมัติ (Sanitization เช่น ศ.ดร., ผศ., Prof. Dr.)
  3. ค้นหาอีเมลผู้ร่วมวิจัยด้วยระบบ **Strict High-Precision Matching** (ทั้ง `First Last`, `Last, First`, ชื่อย่อ Scopus)
  4. ส่งอีเมล Responsive HTML พร้อม **ตารางแจกแจงสัดส่วน (%)** และปุ่มยืนยันผลงาน
  5. บันทึก/ส่งสำเนาให้ผู้บันทึก (Submitter)

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **Email Engine & Template** | `backend/emailService.js` | `sanitizePersonName()`, `isStrictNameMatch()`, `findAuthorEmailByName()`, `sendCoAuthorConfirmationEmail()`, `triggerCoAuthorNotificationWorkflow()` |
| **API Email Trigger** | `backend/server.js` | เรียก workflow ใน `POST /api/entries`, `POST /api/save`, `PUT /api/papers/:paperId/confirm` |
| **การตั้งค่า SMTP Server** | `backend/.env` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FRONTEND_URL` |
| **ฐานข้อมูลอาจารย์ 181 ท่าน** | `backend/db.js` | อาร์เรย์ `UP_ICT_FACULTY` (Fallback หากไม่พบใน Supabase `users`) |

#### 🛠️ วิธีการบำรุงรักษาอีเมล:
- **เปลี่ยนข้อความหรือดีไซน์อีเมล**: แก้ไขตัวแปร `htmlContent` ใน `sendCoAuthorConfirmationEmail()` ที่ [emailService.js](file:///C:/Research-Management-main/Project_ict_clean-main/backend/emailService.js)
- **เปลี่ยนอีเมลส่ง (Gmail / M365)**: แก้ไข `SMTP_USER` และ `SMTP_PASS` ใน [.env](file:///C:/Research-Management-main/Project_ict_clean-main/backend/.env)

---

## ฟีเจอร์ 4: ระบบยืนยันสัดส่วนผู้ร่วมงาน & กฎอนุมัติ 7 วัน (Co-Author Confirmation)

### 🎯 หน้าที่ของฟีเจอร์
- **บันทึกผลงาน (Submit & Status `PENDING`)**: กำหนดเส้นตาย 7 วัน (`deadline = now + 7 days`) และส่งอีเมลแจ้งเตือนผู้ร่วมวิจัยทุกคน
- **แจ้งเตือนผู้ร่วมงาน (BR-01)**: ส่งอีเมล Responsive HTML พร้อมตารางสัดส่วนและปุ่มกดยืนยันไปยังผู้ร่วมวิจัยทุกคนที่มีชื่อในบทความ
- **ปุ่มกดยืนยันสัดส่วน**: แสดงปุ่ม "ยืนยันสัดส่วน" บนการ์ดผลงานและตาราง (สำหรับสมาชิกทุกคนที่ยังไม่ได้ยืนยันในฉบับล่าสุด)
- **กล่องติดต่อผู้แต่งหลัก**: แสดงข้อความ *"หากท่านไม่พึงพอใจในสัดส่วนนี้ โปรดติดต่อ: [อีเมล First/Corresponding Author]"* (แสดงเฉพาะงานที่มีผู้แต่ง > 1 คน)
- **กฎบันทึกสัดส่วนอัตโนมัติ 7 วัน (BR-02 - 7-Day Auto-Lock)**: หากอาจารย์ไม่แก้ไขหรือไม่ดำเนินการใดๆ ภายใน **7 วัน** นับจากวันที่ส่งอีเมล ระบบจะ **บันทึกสัดส่วนโดยอัตโนมัติ** และเปลี่ยนสถานะเป็น `AUTO_CONFIRMED`
- **เงื่อนไขผลงานสมบูรณ์ (BR-03)**: ผลงานวิชาการถือว่า **สมบูรณ์ (`CONFIRMED` / `AUTO_CONFIRMED`)** เมื่อสมาชิก **ทุกคน** ยืนยันครบถ้วน และ **ไม่มีการแก้ไข** ในช่วง 7 วันล่าสุด
- **การรีเซ็ตสถานะเมื่อมีการแก้ไขสัดส่วน (BR-04)**: เมื่ออาจารย์คนใดคนหนึ่ง (ไม่ว่าจะเป็นผู้สร้างการ์ดหรือผู้ร่วมงาน) **แก้ไขผลงาน/สัดส่วน** ระบบจะ **รีเซ็ตสถานะการยืนยัน** ของสมาชิกคนอื่นๆ ในผลงานนั้นกลับเป็น `PENDING` ทันที
- **การยืนยันรอบใหม่หลังรีเซ็ต (BR-05)**: หลังรีเซ็ต สมาชิกทุกคนต้อง **ยืนยันใหม่** จึงจะถือว่าผลงานสมบูรณ์
- **การรีเซ็ตเวลานับ 7 วันใหม่ (BR-06)**: นับ 7 วัน **ใหม่ (`deadline = now + 7 days`)** ทุกครั้งที่มีการแก้ไขสัดส่วน พร้อมส่งอีเมลแจ้งเตือนรอบใหม่
- **กฎล็อคภาระงานและเงินรางวัลสะสมหลังอนุมัติ (BR-07 - Workload & Reward Freeze Rule)**: เมื่อสมาชิกทุกคนกดยืนยันครบถ้วน (`CONFIRMED`) หรือพ้นกำหนด 7 วัน (`AUTO_CONFIRMED`) แล้ว สมาชิกยังคงสามารถกดแก้ไขผลงานได้ตามปกติ **แต่การแก้ไขของสมาชิกทั่วไปจะไม่มีผลเปลี่ยนแปลงชั่วโมงภาระงานสะสม (`actual_hours`) และเงินรางวัล (`faculty`, `uni`)** โดยระบบจะล็อคยอดเดิมที่ได้รับอนุมัติไว้ (`workload_frozen: true`) **ยกเว้นผู้ดูแลระบบ (Admin) เท่านั้นที่แก้ไขแล้วจะมีผลเปลี่ยนแปลงชั่วโมงภาระงานและเงินรางวัลสะสม**
- **การนับภาระงานสะสม (Workload Gate)**: งานที่สถานะ `PENDING` **จะไม่ถูกนับรวม**ในชั่วโมงภาระงานสะสมจนกว่าจะยืนยันครบถ้วนหรือครบกำหนด Auto-Lock

### 📌 กฎทางธุรกิจ (Business Rules: BR-01 – BR-07)
| รหัสกฎ | รายละเอียดเงื่อนไข |
| :--- | :--- |
| **BR-01** | ระบบต้องส่งอีเมลแจ้งเตือนอาจารย์เมื่อมีผลงานวิชาการรอการยืนยัน (ทั้งตอนบันทึกครั้งแรกและตอนแก้ไข) พร้อมตารางแจกแจงสัดส่วน |
| **BR-02** | หากอาจารย์ไม่แก้ไขหรือไม่ดำเนินการใดๆ ภายใน **7 วัน** นับจากวันที่ส่งอีเมล ระบบต้อง **บันทึกสัดส่วนโดยอัตโนมัติ (`AUTO_CONFIRMED`)** |
| **BR-03** | ผลงานวิชาการถือว่า **สมบูรณ์** เมื่อสมาชิก **ทุกคน** ยืนยันครบถ้วน และ **ไม่มีการแก้ไข** ในช่วง 7 วันล่าสุด |
| **BR-04** | เมื่ออาจารย์คนใดคนหนึ่ง **แก้ไขสัดส่วน** ระบบต้อง **รีเซ็ตสถานะการยืนยัน** ของสมาชิกคนอื่นๆ ในผลงานนั้นทันที |
| **BR-05** | หลังรีเซ็ต สมาชิกทุกคนต้อง **ยืนยันใหม่** จึงจะถือว่าผลงานสมบูรณ์ |
| **BR-06** | นับ 7 วัน **ใหม่** ทุกครั้งที่มีการแก้ไข (`deadline = now + 7 days`, `last_modified_at = now`) |
| **BR-07** | เมื่อสมาชิกทุกคนยืนยันครบถ้วน หรือผ่านไป 7 วันแล้ว สมาชิกแก้ไขผลงานได้แต่ **ไม่มีผลต่อชั่วโมงภาระงานสะสมและเงินรางวัล** (ล็อคยอดอนุมัติเดิม) **ยกเว้นผู้ดูแลระบบ (Admin) แก้ไขจึงจะมีผลคำนวณใหม่** |

### 🔍 Edge Cases และเงื่อนไขการแก้ไขซ้ำที่ระบบรองรับ
1. **มีสมาชิกคนใดคนหนึ่งในกลุ่มแก้ไขผลงาน (Multi-editor Loop)** ➔ ไม่ว่าจะเป็นคนสร้างการ์ดเดิม หรือผู้ร่วมงานคนอื่นเข้ามาแก้ไข ระบบจะเก็บชื่อผู้แก้ไขล่าสุดไว้เป็นผู้ยืนยัน รีเซ็ตสมาชิกคนอื่นกลับเป็น `PENDING`, เริ่มนับ 7 วันใหม่ และส่งปุ่มยืนยันพร้อมอีเมลแจ้งเตือนไปให้สมาชิกทุกคนในงานวิชาการนั้นกดยืนยันใหม่ (หากคนสร้างการ์ดถูกเพื่อนแก้ไข ก็จะมีปุ่มกดยืนยันแสดงขึ้นมาให้คนสร้างกดยืนยันด้วยเช่นกัน)
2. **หากมีคนกดแก้ไขซ้ำอีกกี่ครั้งก็ตาม (Iterative Revisions)** ➔ ระบบจะรีเซ็ตสถานะและนับ 7 วันใหม่อีกครั้ง (`deadline = now + 7 days`) และส่งปุ่มยืนยันรอบใหม่ให้สมาชิกทุกคนกดยืนยันฉบับล่าสุดเสมอ
3. **การแก้ไขผลงานหลังจากยืนยันครบหรือพ้น 7 วัน (Frozen Workload Protection)** ➔ หากอาจารย์ทั่วไปแก้ไขข้อมูลผลงานหลังจากยืนยันครบแล้ว ระบบจะอนุญาตให้บันทึกข้อมูลรายละเอียดได้ แต่ยอดชั่วโมงภาระงานสะสม (`actual_hours`) และเงินรางวัลคณะ/มหาลัย (`faculty`, `uni`) จะถูก Freeze คงตามยอดเดิมที่เคยได้รับอนุมัติ และแสดงป้าย Badge `🔒 ภาระงานล็อคตามยอดอนุมัติเดิม` บนการ์ดผลงาน เว้นแต่ Admin จะเป็นผู้แก้ไข
4. **สมาชิกบางคนออกจากผลงานระหว่างกระบวนการ** ➔ ระบบตรวจสอบและนับยอดการยืนยันจากรายชื่อผู้ร่วมงานปัจจุบัน (`author_list` ล่าสุด) หากลบเหลือคนเดียวจะปรับเป็น 100% และสถานะ `CONFIRMED` ทันที

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **ปุ่มยืนยัน, Badge & UI การ์ดผลงาน** | `my-react-app/src/App.jsx` | Badge `CONFIRMED`/`AUTO_CONFIRMED`, ปุ่ม `[✓ ยืนยันสัดส่วน]` (ตรวจสอบผ่าน `canUserConfirmPaper`), ป้าย `🔒 ภาระงานล็อคตามยอดอนุมัติเดิม` |
| **การกรองชั่วโมงภาระงาน (Workload Gate)** | `my-react-app/src/App.jsx` | คำนวณ KPI เฉพาะงานที่ `confirmation_status` เป็น `CONFIRMED` หรือ `AUTO_CONFIRMED` |
| **API บันทึก/แก้ไข & ตรรกะ Freeze Workload** | `backend/server.js` | `POST /api/entries` (จับคู่ `editorId`/`editorEmail`, รีเซ็ต `confirmed_by`, ล็อค `locked_hours`/`locked_faculty`/`locked_uni` หากไม่ใช่ Admin) |
| **API ยืนยันสัดส่วน** | `backend/server.js` | `POST /api/entries/:id/confirm` (บันทึกรายชื่อผู้กดยืนยัน และตรวจสอบความครบถ้วนตาม BR-03/BR-05) |
| **Background Auto-Lock Job** | `backend/cronService.js` | `checkAndAutoConfirmExpiredEntries()` รันตรวจทุกชั่วโมง เพื่อปรับงานที่พ้น 7 วันเป็น `AUTO_CONFIRMED` (BR-02) |

---

## ฟีเจอร์ 5: ระบบแจ้งเตือนข้อมูลไม่ครบ & หมดอายุความ 5 ปี (Alerts & Warnings)

### 🎯 หน้าที่ของฟีเจอร์
- **Incomplete Alert (แจ้งเตือนข้อมูลไม่ครบ)**: แจ้งเตือน Badge สีเหลือง/แดง หากผลงานขาดข้อมูลสำคัญ (เช่น ขาด DOI, วันที่ตีพิมพ์, หรือสัดส่วนรวมไม่ครบ 100%)
- **Curriculum Expiry Warning (เตือนผลงานใกล้หมดอายุ 5 ปี)**: ตรวจสอบวันที่ตีพิมพ์ตามเกณฑ์การประเมินรอบหลักสูตร 5 ปี เพื่อให้อาจารย์เตรียมยื่นผลงานใหม่

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **ตรรกะคำนวณวันหมดอายุ 5 ปี** | `my-react-app/src/utils/curriculumExpiry.js` | `checkPaperExpiry()`, `getExpiryStatus()` |
| **การแสดงผล Badge บนการ์ด** | `my-react-app/src/App.jsx` | แสดง Incomplete Warning Pill และ Expiry Tag |

---

## ฟีเจอร์ 6: ระบบนำเข้าผลงานภายนอก (Google Scholar, Scopus, AI PDF Extract)

### 🎯 หน้าที่ของฟีเจอร์
- **Google Scholar Import**: ค้นหาและดึงรายการผลงานวิจัยของอาจารย์ตามชื่อหรือ Scholar ID
- **Scopus Import**: ค้นหาข้อมูลผลงานและ Quartile จากฐานข้อมูล Scopus
- **AI PDF Extraction**: อัปโหลดไฟล์ PDF ผลงานวิจัย จากนั้น AI (LLM) จะสกัดชื่อเรื่อง, ผู้แต่ง, DOI, วารสาร, และวันที่ตีพิมพ์ให้อัตโนมัติ
- **Academic Database Live Loading Screen (หน้าจอโหลดสดระหว่างดึงข้อมูล)**: หน้าจอ Loading Screen แบบ Glassmorphism Card มินิมอล แสดงตัวเลขเปอร์เซ็นต์ขนาดใหญ่ชัดเจน (Percentage-focused) พร้อมแอนิเมชัน Glowing Pulse Radar และแถบความคืบหน้าแบบ Gradient Bar ไม่แสดงข้อความขั้นตอนให้รกตา เพื่อประสบการณ์ใช้งานที่เรียบง่ายและทันสมัย

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **หน้าจอ Loading ระหว่างดึงข้อมูลวิชาการ** | `my-react-app/src/components/AcademicSyncLoadingModal.jsx` | โมดอล Loading Overlay แสดงสถานะเชื่อมต่อ Scholar/Scopus แบบเรียลไทม์ |
| **Modal นำเข้า Scholar & Scopus** | `my-react-app/src/components/ScholarImportModal.jsx` | ดึงและเลือกผลงานจาก Google Scholar & Scopus พร้อมแสดง Loading Modal |
| **Scholar Dashboard** | `my-react-app/src/components/ScholarDashboard.jsx` | แดชบอร์ดผลงานวิชาการ แสดง Loading Modal ระหว่างกดซิงก์ |
| **Modal อัปโหลด PDF AI** | `my-react-app/src/components/PdfUploadModal.jsx` | Drag & Drop PDF, แสดงผลการสกัดข้อมูล |
| **Scholar Scraper API** | `backend/scholarService.js` | ดึงข้อมูล Scholar Profile และ Publications |
| **Scopus API Service** | `backend/scopusService.js` | เชื่อมต่อ Scopus Search API |
| **AI LLM Extraction Engine** | `backend/llmService.js` | ประมวลผลเอกสาร PDF ด้วย LLM Prompt |
| **API Endpoints บันทึกผลงาน** | `backend/server.js` | `POST /api/save`, `POST /api/extract-pdf`, `GET /api/scholar/papers` |

---

## ฟีเจอร์ 7: ระบบฝั่งผู้ดูแลระบบ (Admin Console & Governance)

### 🎯 หน้าที่ของฟีเจอร์
- **1. ภาพรวมบุคลากรทั้งคณะ (Faculty Overview)**: สรุปชั่วโมงภาระงานและคะแนนของอาจารย์ทุกคน แยกตาม 8 สาขาวิชา
- **2. ระบบตรวจจับผลงานซ้ำซ้อน (Duplicate Detection)**: เปรียบเทียบ Title (Fuzzy Matching) และ DOI ข้ามอาจารย์เพื่อป้องกันการยื่นผลงานซ้ำ
- **3. จัดการและบันทึกการเบิกจ่ายเงินรางวัล (Disbursement Manager)**: บันทึกเลขที่เอกสาร, วันที่โอนเงิน, แนบหลักฐาน และเปลี่ยนสถานะเป็น `เบิกจ่ายสำเร็จ`
- **4. บันทึกประวัติการแก้ไข (Audit Trail Logs)**: บันทึกประวัติการเปลี่ยนแปลงข้อมูลในระบบ (ใครแก้ไข, เวลาใด, ค่าเก่า/ค่าใหม่)

### 📂 ไฟล์และจุดที่ต้องแก้ไข/ตรวจสอบ
| หน้าที่ | ไฟล์โค้ดที่เกี่ยวข้อง | ฟังก์ชัน / จุดสำคัญ |
| :--- | :--- | :--- |
| **Faculty Overview UI** | `my-react-app/src/components/AdminFacultyOverview.jsx` | สรุปภาระงาน 8 สาขา, กรองตามปีการศึกษา |
| **Duplicate Detection UI** | `my-react-app/src/components/AdminDuplicateCheck.jsx` | ตารางตรวจจับงานที่ Title หรือ DOI ตรงกัน |
| **Disbursement Admin UI** | `my-react-app/src/components/AdminDisbursement.jsx` | อนุมัติการเบิกเงิน, ลงบันทึกการจ่าย |
| **User Disbursement UI** | `my-react-app/src/components/UserDisbursementView.jsx` | มุมมองอาจารย์ดูสถานะเงินรางวัลของตนเอง |
| **Audit Trail Logs UI** | `my-react-app/src/components/AdminAuditLogs.jsx` | ดูตารางประวัติกิจกรรมย้อนหลัง |
| **Admin Backend Endpoints** | `backend/server.js` | `GET /api/admin/faculty-stats`, `GET /api/admin/duplicates`, `POST /api/admin/disbursements`, `GET /api/admin/audit-logs` |

---

## ฟีเจอร์ 8: โครงสร้างฐานข้อมูล (Database Schema)

### 1. ตาราง `users` (ข้อมูลผู้ใช้งานและสิทธิ์)
- `id` (UUID / Integer, Primary Key)
- `email` (String, Unique) — อีเมล `@up.ac.th`
- `password_hash` (String) — รหัสผ่านเข้ารหัส
- `full_name_th` / `full_name_en` (String) — ชื่อ-นามสกุลจริง
- `role` (`'user' | 'admin' | 'executive' | 'chair'`) — ระดับสิทธิ์
- `department` (String) — สังกัดสาขาวิชา (1 ใน 8 สาขาของคณะ ICT)
- `scholar_id` / `scopus_id` (String) — รหัสโปรไฟล์งานวิจัย
- `is_active` (Boolean)

### 2. ตาราง `research_papers` / `workload_entries` (ผลงานวิจัยและภาระงาน)
- `id` (UUID / Integer, Primary Key)
- `user_id` (Foreign Key -> `users.id`) — ผู้ยื่นคำขอ
- `title` (Text) — ชื่อบทความวิจัย
- `journal_name` (Text) — ชื่อวารสาร / การประชุมวิชาการ
- `doi` (String) — รหัส DOI
- `publication_date` (Date) — วันที่เผยแพร่
- `tier` (`'Scopus Q1'` - `'Q4'`, `'TCI 1'` - `'2'`, etc.)
- `calculated_workload` (Float) — ชั่วโมงภาระงานที่คำนวณได้
- `calculated_points` (Float) — คะแนนคุณภาพ
- `author_list` (JSONB) — รายชื่อผู้แต่งทุกคน พร้อมบทบาท (`role`), สัดส่วน (`%`), อีเมล, สถานะยืนยัน (`confirmed`)
- `confirmation_status` (`'PENDING' | 'CONFIRMED' | 'AUTO_CONFIRMED' | 'REJECTED'`)
- `confirmation_deadline` (Timestamp) — กำหนดเวลา 7 วัน
- `disbursement_status` (`'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED'`)
- `disbursed_amount` (Float), `disbursed_at` (Date), `disbursement_ref_no` (String)
- `is_incomplete` (Boolean), `missing_fields` (JSON Array)

### 3. ตาราง `audit_logs` (ประวัติการแก้ไข)
- `id`, `user_id`, `action`, `target_type`, `target_id`, `old_values` (JSONB), `new_values` (JSONB), `created_at`

### 4. ตาราง `disbursements` (รายการเบิกจ่ายเงินรางวัล)
- `id`, `paper_id`, `user_id`, `amount`, `status`, `paid_date`, `receipt_url`, `note`, `created_at`

---

## ฟีเจอร์ 9: สถานะการดำเนินงาน & แผนงาน (Roadmap & Checklists)

### ✅ รายการที่พัฒนาเสร็จสมบูรณ์แล้ว:
- [x] **Auth & Profile Context**: ล็อกอินผ่านอีเมล ดึงชื่อ-นามสกุลจริงและสาขาวิชาอัตโนมัติจากฐานข้อมูล
- [x] **Dynamic Role Navigation**: แยกมุมมองผู้ใช้ทั่วไป (`User`) และผู้ดูแลระบบ (`Admin`) ชัดเจน
- [x] **Smart Proportion Validation & Real-time Alerts**: กฎคำนวณสัดส่วน 100%, กฎลำดับขั้น `First author ≥ Corresponding author ≥ Co author`, แจ้งเตือนแบบ Real-time (Badge + กล่องแจ้งเตือน Alert Box) ทันทีขณะกรอกข้อมูล พร้อมปุ่ม Smart Split Presets
- [x] **Cross-Language User Author Matching & Precision Workload Calculation**: ระบบจับคู่อาจารย์เจ้าของไอดี (User) กับรายชื่อผู้แต่งในบทความแบบข้ามภาษา (ทั้งไทย-อังกฤษ เช่น "ณัฐพล หาญสมุทร" ↔ "Nattapon Harnsamut") เพื่อดึงสัดส่วน (%) และบทบาทจริง (First, Corresponding, Co author) มาคำนวณชั่วโมงภาระงานและเงินสนับสนุนคณะได้อย่างถูกต้องแม่นยำ 100% พร้อมแสดงผลใน Live Preview Card
- [x] **Real-time Email Notification**: แจ้งเตือนสัดส่วนผู้แต่งผ่าน Nodemailer + Strict High-Precision Name Matching
- [x] **Co-Author Confirmation Flow**: สถานะ `PENDING`, กล่องติดต่อผู้แต่งหลัก, กฎล็อคอัตโนมัติ 7 วัน
- [x] **Workload Accumulation Guard**: ชั่วโมงภาระงานสะสมจะไม่นับจนกว่าผลงานจะได้รับการยืนยัน
- [x] **Planning Simulator**: เครื่องมือจำลองคำนวณชั่วโมงภาระงานและเงินรางวัลล่วงหน้า
- [x] **Admin Modules**: หน้ารวมบุคลากรทั้งคณะ, ตรวจจับงานซ้ำ, บันทึกการเบิกจ่าย, ดู Audit Trail Logs

### 📌 เป้าหมายและการต่อขยายในอนาคต (Backlog / Future Enhancements):
- [ ] เชื่อมต่อระบบ Single Sign-On (UP SSO / Microsoft 365 OAuth) ของมหาวิทยาลัยพะเยา
- [ ] ส่งออกรายงานสรุปภาระงานเป็นเอกสาร PDF / Excel ตามแบบฟอร์ม ก.พอ. ของคณะ
- [ ] แจ้งเตือนผ่าน LINE Notify เมื่อมีผลงานวิจัยได้รับการอนุมัติการเบิกจ่ายเงินรางวัล

---------------------------------------------------------------------

### ✅ เป้าหมายล่าสุดที่ดำเนินการเสร็จสิ้น:
- [x] **คำนวณภาระงานตามบทบาทและสัดส่วนของอาจารย์เจ้าของไอดี (User Matcher)**:
  - เชื่อมโยงข้อมูลผู้ใช้งานที่ล็อกอิน (`user.name_th`, `user.name_en`, `user.full_name`, `user.email`) เข้ากับฐานข้อมูลบุคลากร 181 ท่าน (`UP_ICT_FACULTY` / `staffList`)
  - ค้นหาแถวผู้แต่งของเจ้าของไอดีใน `authorList` แบบข้ามภาษา (เช่น "ณัฐพล หาญสมุทร" ↔ "Nattapon Harnsamut" / "Harnsamut, N.")
  - นำสัดส่วน (%) และบทบาทจริงของผู้ใช้ (เช่น `Co author`, `40%`) มาคำนวณชั่วโมงภาระงานและเงินสนับสนุนคณะในส่วน **"สรุปผลคำนวณภาระงานที่คุณจะได้รับ" (Live Preview)** อย่างถูกต้อง 100% ทั้งฝั่ง Frontend และ Backend พร้อมติด Badge ไฮไลต์แถวข้อมูลของผู้ใช้ในตารางผู้แต่งชัดเจน

--------------------------------------------------------------------------

- [x] **ปรับค่าเริ่มต้นกลุ่มประเภทผลงานวิชาการเป็น null (Unselected Default)**:
  - กำหนดค่าเริ่มต้นของกลุ่มประเภทผลงาน (`form.type`) เป็น `null` เพื่อไม่ให้ระบบเลือกประเภทให้อัตโนมัติจนกว่าผู้ใช้จะกดเลือกกลุ่มผลงานด้วยตนเอง
  - อัปเดตกล่องเลือกประเภทผลงานย่อย (Sub-type dropdown) ให้ขึ้นคำแนะนำและ Disabled ไว้จนกว่าจะเลือกกลุ่มผลงานหลัก
  - รองรับการประมวลผลกรณี `type === null` ในระบบคำนวณ (`computeClientCalculation`, `/api/calculate`) และระบบตรวจสอบฟอร์มก่อนบันทึก (`validateAuthorsForm`) เรียบร้อยสมบูรณ์

---------------------------------------------------------------------------------

- [x] **จำกัดการแสดงผลกล่องอาจารย์ผู้จัดทำในโมดอล "ดึงข้อมูล" ตามสิทธิ์ (User/Admin Scoped Data Import)**:
  - หน้าผลงานวิชาการ (คำนวณ) ➔ หัวข้อ "ดึงข้อมูล" (Google Scholar & Scopus):
    - **กรณีอาจารย์ทั่วไป (`user.role !== 'admin'`)**: กล่องอาจารย์ผู้จัดทำจะแสดงเฉพาะชื่อและสังกัดของเจ้าของไอดีที่เข้าสู่ระบบเท่านั้น (ในรูปแบบ Read-only Profile Badge พร้อมไอคอน `UserCheck`) และแสดงเฉพาะรายการผลงานของเจ้าของไอดีคนเดียว เพื่อป้องกันการเข้าถึงหรือดึงผลงานของอาจารย์ท่านอื่น
    - **กรณีผู้ดูแลระบบ (`user.role === 'admin'`)**: ยังคงแสดง Dropdown ให้เลือกอาจารย์ทุกท่านในคณะได้ครบถ้วนตามปกติ เพื่อให้ Admin สามารถช่วยดึงผลงานวิจัยแทนอาจารย์ท่านอื่นได้สะดวก

---------------------------------------------------------------------------------

- [x] **ย้ายปุ่ม "บันทึกผลงานลงระบบ" ไปอยู่ด้านล่างสุดของฟอร์มกรอกข้อมูล (Bottom Form Save Action)**:
  - ย้ายปุ่ม **"บันทึกผลงานลงระบบ" / "บันทึกการแก้ไขผลงาน"** จากการ์ดคำนวณฝั่งขวา (Sticky Card) มาไว้ด้านล่างสุดของแบบฟอร์มกรอกข้อมูล (ต่อจากช่องเลือกฐานข้อมูล/การรับรอง) ใน [`App.jsx`](file:///C:/Research-Management-main/Project_ict_clean-main/my-react-app/src/App.jsx#L1808)
  - ปรับดีไซน์ปุ่มเป็น Full-width Gradient Purple Button (`.btn-form-bottom-save`) ชัดเจน สวยงาม พร้อมไอคอน `Plus`
  - ตรรกะการทำงานของปุ่มทั้งหมดคงเดิม 100% (ตรวจสอบฟอร์ม, บันทึกลง Supabase/Backend API, แจ้งเตือน Toast, และนำทางกลับสู่หน้า Dashboard อัตโนมัติ)

---------------------------------------------------------------------------------

- [x] **กล่องแจ้งเตือนตรวจพบผลงานซ้ำซ้อนในระบบและการกดยืนยัน (Real-time Duplicate Alert & Confirmation Box)**:
  - เพิ่มระบบตรวจจับผลงานซ้ำซ้อนแบบ Real-time โดยเปรียบเทียบเลข DOI หรือชื่อบทความ (Title Match / Fuzzy Similarity ≥ 82%) กับผลงานที่มีอยู่ในฐานข้อมูล
  - **การแสดงผล**: หากตรวจพบผลงานซ้ำ กล่องแจ้งเตือนสีส้ม-ทอง (`⚠️ ตรวจพบผลงานซ้ำในระบบ`) จะปรากฏขึ้นที่ **ส่วนล่างสุดของการ์ดสรุปคำนวณภาระงานสีม่วง (Live Preview Card)** ใน [`App.jsx`](file:///C:/Research-Management-main/Project_ict_clean-main/my-react-app/src/App.jsx#L1965) พร้อมระบุเหตุผลและชื่อผู้ยื่นเดิม
  - **การยืนยันซ้ำ**: มี Checkbox *"ยืนยันว่าไม่ใช่ผลงานซ้ำซ้อน / ต้องการบันทึก"* ให้ผู้ใช้กดยืนยัน 1 ครั้งก่อนบันทึกได้ หากยังไม่กดยืนยัน ระบบจะไม่อนุญาตให้กดบันทึกเพื่อป้องกันการบันทึกงานซ้ำโดยไม่ตั้งใจ
  - **กรณีไม่ซ้ำ**: กล่องแจ้งเตือนจะไม่แสดงผลเลยตามเงื่อนไขที่กำหนด

---------------------------------------------------------------------------------

- [x] **หน้าแดชบอร์ดแบบการ์ด: ขยายเต็มหน้า (1 การ์ดต่อบรรทัด) และแสดงชื่อ/สัดส่วนของผู้แต่งทุกคน (Full-Width Card & All Authors Proportion Display)**:
  - **ปรับเลย์เอาต์การ์ด**: ปรับ `.entries-grid-cards` ใน [`App.css`](file:///C:/Research-Management-main/Project_ict_clean-main/my-react-app/src/App.css#L948) จากเดิม 2 การ์ดต่อแถว เป็น **1 การ์ดต่อ 1 บรรทัด (Full-width 1 Column Grid)** กว้างเต็มหน้าจอ อ่านง่าย สบายตา
  - **แสดงชื่อและสัดส่วนของผู้แต่งทุกคน**:
    - ในกล่องด้านล่างของการ์ด ([`App.jsx`](file:///C:/Research-Management-main/Project_ict_clean-main/my-react-app/src/App.jsx#L2474)) ปรับจากการแสดงเฉพาะชื่อผู้ยื่น ให้แสดงเป็น **รายการผู้แต่งทุกคนพร้อมระบุบทบาทและสัดส่วน (%) ของแต่ละคนครบถ้วน** (เช่น `1. ผศ.ดร.ณัฐพล หาญสมุทร (First author) 50%`)
    - เพิ่ม Badge ไฮไลต์สีม่วงพร้อมป้าย `"คุณ"` บนชื่อของเจ้าของไอดีที่ล็อกอินอยู่ เพื่อให้เห็นสัดส่วนของตนเองได้ชัดเจนทันที
    - แสดงกล่องสรุป **"ภาระงานจริงของคุณ"** (ชั่วโมงจริงและรหัสเกณฑ์) ควบคู่กันอย่างสวยงามและสมดุล

---------------------------------------------------------------------------------

- [x] **ป้องกัน Error กรณีปรับแต่งผลงานแล้วกดเปลี่ยนเมนู Sidebar โดยไม่บันทึก (Auto-Refresh on Unsaved Edit Navigation)**:
  - เพิ่มฟังก์ชัน `handleTabChange` ใน [`App.jsx`](file:///C:/Research-Management-main/Project_ict_clean-main/my-react-app/src/App.jsx#L128) เชื่อมต่อกับเมนูนำทางของ `Sidebar` และ `Header`
  - **เงื่อนไขการทำงาน**: หากผู้ใช้อยู่ในโหมดปรับแต่งผลงานจากแดชบอร์ด (`form.id` มีค่า) แล้วกดย้ายไปยังเมนู Sidebar อื่นโดยที่ยังไม่ได้กดบันทึกผลงาน ระบบจะทำการบันทึก Tab ปลายทางลง `sessionStorage` และสั่งรีเฟรชหน้าเว็บ 1 ครั้ง (`window.location.reload()`) อัตโนมัติ เพื่อล้าง State เดิมและป้องกันข้อผิดพลาดในการแสดงผลได้อย่างสมบูรณ์ 100%

---------------------------------------------------------------------------------

- [x] **อัปเกรดฟีเจอร์ 4: วงรอบการแก้ไขหลายคน (Multi-editor Loop) และกฎล็อคภาระงานสะสม/เงินรางวัล (Frozen Workload Rule)**:
  - **วงรอบการยืนยันหลายคน (Multi-editor Loop & Dynamic Re-confirmation)**:
    - ปรับปรุง `POST /api/entries` ใน [`backend/server.js`](file:///C:/Research-Management-main/Project_ict_clean-main/backend/server.js) ให้ระบุตัวตนของผู้แก้ไขจริง (`currentEditorEmail`, `currentEditorName`, `currentEditorId`)
    - เมื่อผู้ร่วมงานคนใดคนหนึ่ง (ไม่ใช่คนสร้าง) หรือคนสร้างการ์ดเดิมเข้ามาแก้ไขผลงาน ระบบจะบันทึกเฉพาะตัวตนของผู้แก้ไขล่าสุดลงใน `confirmed_by` และรีเซ็ตการยืนยันของสมาชิกท่านอื่นกลับเป็นรอการยืนยัน พร้อมเริ่มนับกำหนดเวลา 7 วันใหม่ (`deadline = now + 7 days`) และส่งอีเมลแจ้งเตือนพร้อมตารางสัดส่วนและปุ่มกดยืนยันให้สมาชิกคนอื่นทุกคน (ทำให้คนสร้างการ์ดเดิมจะปรากฏปุ่ม `[✓ ยืนยันสัดส่วน]` ขึ้นมาให้กดยืนยันทันทีหากมีเพื่อนร่วมงานมาแก้ไข)
    - ปรับปรุงฟังก์ชัน `canUserConfirmPaper` ใน [`my-react-app/src/App.jsx`](file:///C:/Research-Management-main/Project_ict_clean-main/my-react-app/src/App.jsx) ตรวจสอบการเป็นสมาชิกและสิทธิ์การกดยืนยันอย่างแม่นยำ
  - **กฎการล็อคภาระงานสะสมและเงินรางวัล (Frozen Workload Protection)**:
    - เมื่อผลงานได้รับการยืนยันครบถ้วน (`CONFIRMED`) หรือพ้นกำหนด 7 วัน (`AUTO_CONFIRMED`) สมาชิกทั่วไปยังสามารถกดเข้าไปแก้ไขรายละเอียดของผลงานได้ แต่การแก้ไขนั้น **จะไม่มีผลเปลี่ยนแปลงชั่วโมงภาระงานสะสม (`actual_hours`) และเงินรางวัล (`faculty`, `uni`)** โดยระบบจะ Freeze คงตามยอดเดิมที่เคยได้รับอนุมัติ และแสดงป้าย Badge `🔒 ภาระงานล็อคตามยอดอนุมัติเดิม`
    - หากเป็นผู้ใช้งานระดับ **Admin** เป็นผู้แก้ไข ระบบจะอนุญาตให้คำนวณและอัปเดตยอดชั่วโมงภาระงานและเงินรางวัลสะสมใหม่ได้ทันที

---------------------------------------------------------------------------------


