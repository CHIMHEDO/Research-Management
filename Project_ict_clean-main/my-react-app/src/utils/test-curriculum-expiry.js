// test-curriculum-expiry.js
import { getCurriculumExpiryStatus } from './curriculumExpiry.js';

function isUserEntry(entry, user) {
  if (!user) return false;
  const userName = (user.full_name || user.name_th || user.name_en || '').toLowerCase().trim();
  const userEmail = (user.email || '').toLowerCase().trim();

  if (!userName && !userEmail) return true;

  const authorName = (entry.authorName || '').toLowerCase().trim();
  const authors = (entry.authors || '').toLowerCase().trim();
  const corresponding = (entry.correspondingAuthor || '').toLowerCase().trim();

  if (authorName && userName && (authorName.includes(userName) || userName.includes(authorName))) return true;
  if (authors && userName && authors.includes(userName)) return true;
  if (corresponding && userName && corresponding.includes(userName)) return true;
  
  if (Array.isArray(entry.authorList)) {
    const found = entry.authorList.some(a => {
      const aName = (a.name || '').toLowerCase().trim();
      return aName && userName && (aName.includes(userName) || userName.includes(aName));
    });
    if (found) return true;
  }

  // หากไม่มีการระบุชื่อผู้แต่ง ให้ถือเป็นของผู้ใช้ปัจจุบันในระบบ
  if (!authorName && !authors) return true;

  return false;
}

console.log('====================================================');
console.log('🧪 เริ่มการทดสอบระบบแจ้งเตือนรอบหลักสูตร 5 ปี (Notification Test Suite)');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: ตรวจสอบการคำนวณวันหมดอายุและสถานะแจ้งเตือน (เกณฑ์ 5 ปี ตัดรอบ 30 มิ.ย.)
// -------------------------------------------------------------
console.log('--- หมวดที่ 1: การคำนวณวันหมดอายุตามรอบภาระงาน (ตัดรอบ 30 มิ.ย.) ---');

// อ้างอิงวันที่ปัจจุบันสมมุติเป็น 19 ก.ย. 2569 (2026-09-19)
const mockCurrentDate = new Date('2026-09-19T00:00:00');

// Test 1.1: ผลงานใหม่ (ตีพิมพ์ 1 ม.ค. 2026 -> ปี พ.ศ. 2569)
// รอบ: ก.ค. 68 - มิ.ย. 69 -> หมดอายุ 30 มิ.ย. 73 (2030)
{
  const status = getCurriculumExpiryStatus('2026-01-01', mockCurrentDate);
  assert(
    status.status === 'VALID' && status.isExpiring === false && status.isExpired === false,
    'ผลงานใหม่ปี 2026 ต้องมีสถานะ VALID (ใช้ได้ในหลักสูตร ไม่ติดเตือน)',
    `Got: ${status.status}, Expiry: ${status.expiryDateFormatted}`
  );
  assert(status.expiryDateFormatted === '30 มิ.ย. 2573', 'วันหมดอายุของผลงาน ม.ค. 2026 ต้องเป็น 30 มิ.ย. 2573');
}

// Test 1.2: ผลงานเตือนระยะ 1 ปี (ตีพิมพ์ ม.ค. 2023 -> รอบ ก.ค. 65 - มิ.ย. 66 -> หมดอายุ 30 มิ.ย. 2570 / 2027)
// ณ 19 ก.ย. 2026 -> เหลือเวลาถึง 30 มิ.ย. 2027 ประมาณ 284 วัน (<= 365 วัน) -> ONE_YEAR
{
  const status = getCurriculumExpiryStatus('2023-01-15', mockCurrentDate);
  assert(
    status.status === 'ONE_YEAR' && status.isExpiring === true,
    'ผลงานที่เหลือเวลาไม่เกิน 1 ปี ต้องขึ้นสถานะ ONE_YEAR (เตือนล่วงหน้า 1 ปี)',
    `Got: ${status.status}, diffDays: ${status.diffDays}`
  );
}

// Test 1.3: ผลงานเตือนระยะ 6 เดือน (จำลองวันที่ตรวจเป็น 15 ม.ค. 2027 กับผลงานที่หมดอายุ 30 มิ.ย. 2027)
{
  const mockJan2027 = new Date('2027-01-15T00:00:00');
  const status = getCurriculumExpiryStatus('2023-01-15', mockJan2027);
  assert(
    status.status === 'SIX_MONTHS' && status.isExpiring === true,
    'ผลงานที่เหลือเวลาไม่เกิน 6 เดือน ต้องขึ้นสถานะ SIX_MONTHS (เตือนล่วงหน้า 6 เดือน)',
    `Got: ${status.status}, diffDays: ${status.diffDays}`
  );
}

// Test 1.4: ผลงานเตือนระยะ 3 เดือน (จำลองวันที่ตรวจเป็น 15 เม.ย. 2027 กับผลงานที่หมดอายุ 30 มิ.ย. 2027)
{
  const mockApr2027 = new Date('2027-04-15T00:00:00');
  const status = getCurriculumExpiryStatus('2023-01-15', mockApr2027);
  assert(
    status.status === 'THREE_MONTHS' && status.isExpiring === true,
    'ผลงานที่เหลือเวลาไม่เกิน 3 เดือน ต้องขึ้นสถานะ THREE_MONTHS (เตือนล่วงหน้า 3 เดือน)',
    `Got: ${status.status}, diffDays: ${status.diffDays}`
  );
}

// Test 1.5: ผลงานเตือนระยะวิกฤต 1 เดือน (จำลองวันที่ตรวจเป็น 5 มิ.ย. 2027 กับผลงานที่หมดอายุ 30 มิ.ย. 2027)
{
  const mockJun2027 = new Date('2027-06-05T00:00:00');
  const status = getCurriculumExpiryStatus('2023-01-15', mockJun2027);
  assert(
    status.status === 'ONE_MONTH' && status.isExpiring === true && status.urgency === 4,
    'ผลงานที่เหลือเวลาไม่เกิน 1 เดือน ต้องขึ้นสถานะ ONE_MONTH พร้อมระดับความเร่งด่วนสูงสุด (urgency: 4)',
    `Got: ${status.status}, diffDays: ${status.diffDays}`
  );
}

// Test 1.6: ผลงานหมดอายุแล้ว (ตีพิมพ์ 2018 -> หมดอายุ 30 มิ.ย. 2566 / 2023)
{
  const status = getCurriculumExpiryStatus('2018-05-20', mockCurrentDate);
  assert(
    status.status === 'EXPIRED' && status.isExpired === true && status.isValid === false,
    'ผลงานที่เกิน 5 ปีแล้ว ต้องขึ้นสถานะ EXPIRED (ไม่สามารถใช้ในหลักสูตรล่าสุดได้)',
    `Got: ${status.status}`
  );
}

// Test 1.7: ค่า Edge cases: วันที่ว่าง หรือ รูปแบบไม่ถูกต้อง
{
  const emptyRes = getCurriculumExpiryStatus('');
  const invalidRes = getCurriculumExpiryStatus('invalid-date-string');
  assert(emptyRes.status === 'UNKNOWN', 'วันที่ว่างต้องได้สถานะ UNKNOWN');
  assert(invalidRes.status === 'INVALID_DATE', 'วันที่ไม่ถูกต้องต้องได้สถานะ INVALID_DATE');
}

// -------------------------------------------------------------
// TEST SUITE 2: ตรวจสอบระบบกรองผู้แต่งและการนับรวมแจ้งเตือน (Author Matching & Notification Badge Counting)
// -------------------------------------------------------------
console.log('\n--- หมวดที่ 2: การจับคู่ชื่อผู้ใช้ (Author Matching) และการนับ Badge ---');

const testUser = {
  id: 1,
  email: 'sakesun.th@up.ac.th',
  full_name: 'Sakesun Thongtip',
  name_en: 'Sakesun Thongtip',
  name_th: 'เสกสรรค์ ทองทิพย์'
};

// Test 2.1: ตรวจจับผู้แต่งเมื่อชื่อเป็นภาษาอังกฤษ
{
  const entry = {
    title: 'AI in Healthcare',
    authorName: 'Sakesun Thongtip',
    publicationDate: '2023-01-10'
  };
  assert(isUserEntry(entry, testUser) === true, 'ผู้แต่งระบุชื่อภาษาอังกฤษตรงกับผู้ใช้ ต้องผ่าน (true)');
}

// Test 2.2: ตรวจจับผู้แต่งเมื่อชื่ออยู่ใน authorList
{
  const entry = {
    title: 'Deep Learning System',
    authorList: [
      { name: 'John Doe', role: 'First Author' },
      { name: 'Sakesun Thongtip', role: 'Corresponding Author' }
    ],
    publicationDate: '2023-01-10'
  };
  assert(isUserEntry(entry, testUser) === true, 'ชื่อผู้ใช้อยู่ใน authorList (Co-author/Corresponding) ต้องผ่าน (true)');
}

// Test 2.3: ผู้แต่งเป็นผู้อื่น (ไม่ตรงกับ testUser)
{
  const entry = {
    title: 'Blockchain Security',
    authorName: 'Somchai Prasert',
    authors: 'Somchai Prasert, Anan Suksan',
    authorList: [{ name: 'Somchai Prasert' }, { name: 'Anan Suksan' }],
    publicationDate: '2023-01-10'
  };
  assert(isUserEntry(entry, testUser) === false, 'ผลงานของผู้อื่น ต้องไม่ถูกนับเป็นของผู้ใช้ (false)');
}

// Test 2.4: คำนวณยอดรวม Notification Badge
{
  const mockEntries = [
    // ผลงาน 1: ของ testUser - ตีพิมพ์ 2023 (เหลือ 1 ปี -> แจ้งเตือน +1)
    { id: '1', authorName: 'Sakesun Thongtip', publicationDate: '2023-01-15' },
    // ผลงาน 2: ของ testUser - ตีพิมพ์ 2019 (หมดอายุแล้ว -> แจ้งเตือน +1)
    { id: '2', authorName: 'Sakesun Thongtip', publicationDate: '2019-01-15' },
    // ผลงาน 3: ของ testUser - ตีพิมพ์ 2026 (ยังใหม่อยู่ -> ไม่แจ้งเตือน 0)
    { id: '3', authorName: 'Sakesun Thongtip', publicationDate: '2026-05-15' },
    // ผลงาน 4: ของผู้อื่น - ตีพิมพ์ 2023 (ของคนอื่น -> ไม่นับ 0)
    { id: '4', authorName: 'Somchai Prasert', authors: 'Somchai Prasert', publicationDate: '2023-01-15' }
  ];

  // กรองเฉพาะผลงานของ user
  const userEntries = mockEntries.filter(e => isUserEntry(e, testUser));
  let totalAlerts = 0;
  let expiringCount = 0;
  let expiredCount = 0;
  let validCount = 0;

  userEntries.forEach(e => {
    const status = getCurriculumExpiryStatus(e.publicationDate, mockCurrentDate);
    if (status.isExpired) {
      expiredCount++;
      totalAlerts++;
    } else if (status.isExpiring) {
      expiringCount++;
      totalAlerts++;
    } else if (status.isValid) {
      validCount++;
    }
  });

  assert(userEntries.length === 3, 'กรองผลงานของอาจารย์ Sakesun ต้องได้ 3 รายการ');
  assert(expiringCount === 1, 'จำนวนผลงานใกล้ครบ 5 ปี ต้องได้ 1 รายการ');
  assert(expiredCount === 1, 'จำนวนผลงานหมดอายุ 5 ปี ต้องได้ 1 รายการ');
  assert(validCount === 1, 'จำนวนผลงานที่ใช้ได้ในหลักสูตร ต้องได้ 1 รายการ');
  assert(totalAlerts === 2, 'ยอดตัวเลข Badge รวมบนกระดิ่งต้องเท่ากับ 2 (expiring + expired)');
}

console.log('\n====================================================');
console.log(`📊 สรุปผลการทดสอบ: ผ่าน ${passedTests} / ${totalTests} ข้อ`);
if (passedTests === totalTests) {
  console.log('🎉 ระบบคำนวณและแจ้งเตือนรอบหลักสูตร 5 ปีทำงานถูกต้องสมบูรณ์ 100%');
} else {
  console.log('⚠️ มีบางกรณีที่ผลลัพธ์ไม่ตรงตามที่คาดหวัง');
}
console.log('====================================================');
