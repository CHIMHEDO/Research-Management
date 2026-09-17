const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'workload_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ข้อมูลบุคลากรตั้งต้น คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา (8 สาขาวิชา)
const UP_ICT_FACULTY = [
  // 1. Computer Graphics and Multimedia
  { email: 'rachen.su@up.ac.th', name_en: 'Rachen Sookmuang', name_th: 'ราเชนทร์ สุขม่วง', department: 'Computer Graphics and Multimedia', position: 'ประธานหลักสูตร / อาจารย์', scholar_id: null },
  { email: 'ratanapat.su@up.ac.th', name_en: 'Ratanapat Suchat', name_th: 'รตนพรรษ สุชาติ', department: 'Computer Graphics and Multimedia', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'w0vNVh8AAAAJ' },
  { email: 'nakharet.ch@up.ac.th', name_en: 'nakharet chaikaew', name_th: 'นคเรศ ชัยแก้ว', department: 'Computer Graphics and Multimedia', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'hSZaKRAAAAAJ' },
  { email: 'suleeporn.ka@up.ac.th', name_en: 'Suleeporn Kamchompoo', name_th: 'ศุลีพร คำชมภู', department: 'Computer Graphics and Multimedia', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'NZ3ZSWoAAAAJ' },
  { email: 'pakawad.bu@up.ac.th', name_en: 'Pakawad Butsri', name_th: 'ภควัส บุตรศรี', department: 'Computer Graphics and Multimedia', position: 'อาจารย์', scholar_id: null },
  { email: 'wisoot.ka@up.ac.th', name_en: 'wisoot kaenmueang', name_th: 'วิสูตร แก่นเมือง', department: 'Computer Graphics and Multimedia', position: 'อาจารย์', scholar_id: 'UImKTowAAAAJ' },
  { email: 'apiwat.pu@up.ac.th', name_en: 'apiwat puntatong', name_th: 'อภิวัฒน์ ปันทะธง', department: 'Computer Graphics and Multimedia', position: 'อาจารย์', scholar_id: 'X2VbOl8AAAAJ' },
  { email: 'thapanapong.sa@up.ac.th', name_en: 'Thapanapong Sararat', name_th: 'ฐาปนพงศ์ สารรัตน์', department: 'Computer Graphics and Multimedia', position: 'อาจารย์', scholar_id: 'BFmk2WkAAAAJ' },
  { email: 'wanvajee.kh@up.ac.th', name_en: 'Wanvajee Krutnoi', name_th: 'วรรณวจี ครุธน้อย', department: 'Computer Graphics and Multimedia', position: 'ผู้ช่วยสอน', scholar_id: null },

  // 2. Digital Business
  { email: 'supan.to@up.ac.th', name_en: 'supan tongphet', name_th: 'สุพรรณ์ ทองเพชร', department: 'Digital Business', position: 'ประธานหลักสูตร / อาจารย์', scholar_id: 'j8NfztMAAAAJ' },
  { email: 'thitirath.ch@up.ac.th', name_en: 'Thitirath Cheowsuwan', name_th: 'ฐิติรัตน์ เชี่ยวสุวรรณ', department: 'Digital Business', position: 'รองศาสตราจารย์ / รองอธิการบดี', scholar_id: null },
  { email: 'kaewarin.ja@up.ac.th', name_en: 'kaewarin jandum', name_th: 'เกวรินทร์ จันทร์ดำ', department: 'Digital Business', position: 'อาจารย์ / รองคณบดี', scholar_id: 'upsWdfgAAAAJ' },
  { email: 'napa.ra@up.ac.th', name_en: 'Napa Rachata', name_th: 'นภา ราชตา', department: 'Digital Business', position: 'ผู้ช่วยศาสตราจารย์ / รองคณบดี', scholar_id: 'EwzRbK4AAAAJ' },
  { email: 'krittika.ka@up.ac.th', name_en: 'krittika kantawong', name_th: 'กฤติกา กันทวงค์', department: 'Digital Business', position: 'ผู้ช่วยศาสตราจารย์ / ผู้ช่วยคณบดี', scholar_id: 'bKG2lWkAAAAJ' },
  { email: 'pratya.nu@up.ac.th', name_en: 'Pratya Nuankaew', name_th: 'ปรัชญา นวนแก้ว', department: 'Digital Business', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: '5nYO_-cAAAAJ' },
  { email: 'thanapon.th@up.ac.th', name_en: 'Thanapon Thiradathanaphatdecha', name_th: 'ธนภณ ถิรดาธนภัทรเดชา', department: 'Digital Business', position: 'อาจารย์', scholar_id: null },
  { email: 'surinthip.sa@up.ac.th', name_en: 'Surinthip Sakphuowadol', name_th: 'สุรินทร์ทิพ ศักดิ์ภูวดล', department: 'Digital Business', position: 'อาจารย์', scholar_id: null },
  { email: 'sudarat.ar@up.ac.th', name_en: 'Sudarat Aht-harn', name_th: 'สุดารัตน์ อาจหาญ', department: 'Digital Business', position: 'อาจารย์', scholar_id: null },
  { email: 'pipatpong.sa@up.ac.th', name_en: 'Pipatpong Sae-phu', name_th: 'พิพัฒน์พงษ์ แซ่พู่', department: 'Digital Business', position: 'อาจารย์', scholar_id: null },

  // 3. Information Technology
  { email: 'sathien.hu@up.ac.th', name_en: 'SATHIEN HUNTA', name_th: 'เสถียร หันตา', department: 'Information Technology', position: 'ประธานหลักสูตร / อาจารย์', scholar_id: 'OtIA5PEAAAAJ' },
  { email: 'rattanawadee.pa@up.ac.th', name_en: 'Rattanawadee Panthong', name_th: 'รัตนาวดี พานทอง', department: 'Information Technology', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'szUHb4wAAAAJ' },
  { email: 'sakkayaphop.pr@up.ac.th', name_en: 'Sakkayaphop Pravesjit', name_th: 'ศกยภพ ประเวทจิตร์', department: 'Information Technology', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'mKETtsEAAAAJ' },
  { email: 'thidapath.an@up.ac.th', name_en: 'Thidapath Anucharn', name_th: 'ธิดาภัทร อนุชาญ', department: 'Information Technology', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'Cn5DYBUAAAAJ' },
  { email: 'yeunyong.ka@up.ac.th', name_en: 'Yeunyong Kantanet', name_th: 'ยืนยง กันทะเนตร', department: 'Information Technology', position: 'อาจารย์', scholar_id: 'kOv6vpUAAAAJ' },
  { email: 'sanchai.ye@up.ac.th', name_en: 'Sanchai Yeewiyom', name_th: 'สัณห์ชัย หยีวิยม', department: 'Information Technology', position: 'อาจารย์', scholar_id: 'PJ9aDnEAAAAJ' },
  { email: 'nattapong.ka@up.ac.th', name_en: 'Natdanai Kamkhad', name_th: 'ณัฐดนัย คำขาด', department: 'Information Technology', position: 'อาจารย์', scholar_id: 'qTB5DqsAAAAJ' },
  { email: 'rattasak.pe@up.ac.th', name_en: 'Rattasak Pengchata', name_th: 'รัตน์ธศักดิ์ เพ็งชะตา', department: 'Information Technology', position: 'อาจารย์', scholar_id: 'e_0l4DYAAAAJ' },
  { email: 'thaksaorn.jo@up.ac.th', name_en: 'Thaksaorn Jommanop', name_th: 'ทักษอร จอมมานพ', department: 'Information Technology', position: 'อาจารย์', scholar_id: null },

  // 4. Geoinformatics
  { email: 'jiraporn.ko@up.ac.th', name_en: 'Jiraporn Kulsoontornrat', name_th: 'จิราพร กุลสุนทรรัตน์', department: 'Geoinformatics', position: 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร', scholar_id: 'gsy7MH0AAAAJ' },
  { email: 'nakarin.ch@up.ac.th', name_en: 'Nakarin Chaikaew', name_th: 'นครินทร์ ชัยแก้ว', department: 'Geoinformatics', position: 'ผู้ช่วยศาสตราจารย์ / รองคณบดี', scholar_id: 'KfBBb-UAAAAJ' },
  { email: 'boonsiri.su@up.ac.th', name_en: 'Boonsiri Suksombat', name_th: 'บุญศิริ สุขพร้อมสรรพ์', department: 'Geoinformatics', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: null },
  { email: 'niti.ia@up.ac.th', name_en: 'Niti Iamchuen', name_th: 'นิติ เอี่ยมชื่น', department: 'Geoinformatics', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'Hnbe6VkAAAAJ' },
  { email: 'wipop.pa@up.ac.th', name_en: 'wipop paengwangthong', name_th: 'วิภพ แพงวังทอง', department: 'Geoinformatics', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: '3UtScF0AAAAJ' },
  { email: 'phaisarn.je@up.ac.th', name_en: 'Phaisarn Jeefoo', name_th: 'ไพศาล จี้ฟู', department: 'Geoinformatics', position: 'รองศาสตราจารย์', scholar_id: 'BRJXF00AAAAJ' },
  { email: 'sawarin.le@up.ac.th', name_en: 'Sawarin Roekyusuk', name_th: 'สวรินทร์ ฤกษ์อยู่สุข', department: 'Geoinformatics', position: 'อาจารย์', scholar_id: null },
  { email: 'chutpong.pa@up.ac.th', name_en: 'Chatchaphong Phachanaphan', name_th: 'ชัชพงศ์ ภาชนะพรรณ์', department: 'Geoinformatics', position: 'อาจารย์', scholar_id: null },

  // 5. Computer Science
  { email: 'wongpanya.nu@up.ac.th', name_en: 'Wongpanya Nuankaew, Ph.D.', name_th: 'วงษ์ปัญญา นวนแก้ว', department: 'Computer Science', position: 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร', scholar_id: 'pWRnha8AAAAJ' },
  { email: 'surangkana.ra@up.ac.th', name_en: 'Surangkana Rawungyot,Ph.D.', name_th: 'สุรางคนา ระวังยศ', department: 'Computer Science', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'ONrwXPcAAAAJ' },
  { email: 'worrakit.sa@up.ac.th', name_en: 'worrakit sanpote', name_th: 'วรกฤต แสนโภชน์', department: 'Computer Science', position: 'อาจารย์', scholar_id: 'd5XfUKoAAAAJ' },
  { email: 'thanawat.sa@up.ac.th', name_en: 'Thanawat Sae-eab', name_th: 'ธนวัฒน์ แซ่เอียบ', department: 'Computer Science', position: 'อาจารย์', scholar_id: null },
  { email: 'kiattikul.so@up.ac.th', name_en: 'Kiattikul Suksomsathan', name_th: 'เกียรติกุล สุขสมสถาน', department: 'Computer Science', position: 'อาจารย์', scholar_id: null },
  { email: 'thammarat.th@up.ac.th', name_en: 'Thammarat Thamma', name_th: 'ธรรมรัตน์ ธรรมา', department: 'Computer Science', position: 'อาจารย์', scholar_id: '-M6OQm4AAAAJ' },
  { email: 'paweena.un@up.ac.th', name_en: 'Paweena Unlee', name_th: 'ปวีณา อุ่นลี', department: 'Computer Science', position: 'อาจารย์', scholar_id: null },
  { email: 'sarit.pr@up.ac.th', name_en: 'Sarit Promthep', name_th: 'ศริทธิ์ พร้อมเทพ', department: 'Computer Science', position: 'อาจารย์', scholar_id: null },
  { email: 'sakpan.da@up.ac.th', name_en: 'Sakpan Dangmanee', name_th: 'ศักดิ์พันธุ์ แดงมณี', department: 'Computer Science', position: 'อาจารย์', scholar_id: 'AeOY2nYAAAAJ' },

  // 6. Data Science and Applications
  { email: 'noppadon.yo@up.ac.th', name_en: 'Noppadon Yosboonruang', name_th: 'นพดล ยศบุญเรือง', department: 'Data Science and Applications', position: 'ผู้ช่วยศาสตราจารย์ / ประธานหลักสูตร', scholar_id: '2K_AJKUAAAAJ' },
  { email: 'kanokwatt.sh@up.ac.th', name_en: 'KANOKWATT SHIANGJEN', name_th: 'กนกวรรธน์ เซี่ยงเจ็น', department: 'Data Science and Applications', position: 'อาจารย์', scholar_id: 'w2LATP4AAAAJ' },
  { email: 'sulawan.yo@up.ac.th', name_en: 'Sulawan Yotthanoo', name_th: 'สุลาวัลย์ ยศธนู', department: 'Data Science and Applications', position: 'อาจารย์', scholar_id: 'oK0RgRcAAAAJ' },
  { email: 'kemmawadee.pr@up.ac.th', name_en: 'Kemmawadee Preedalikit', name_th: 'เขมวดี ปรีดาลิขิต', department: 'Data Science and Applications', position: 'อาจารย์', scholar_id: 'CnkxqpgAAAAJ' },
  { email: 'piyada.ph@up.ac.th', name_en: 'Piyada Phrueksawatnon', name_th: 'ปิยดา พฤกสวัสดิ์นนท์', department: 'Data Science and Applications', position: 'อาจารย์', scholar_id: 'vGckr9gAAAAJ' },
  { email: 'satsayamon.su@up.ac.th', name_en: 'satsayamon suksaengrakcharoen', name_th: 'ศัสยมน สุขแสงรักษ์เจริญ', department: 'Data Science and Applications', position: 'อาจารย์', scholar_id: 'YgHiTT0AAAAJ' },
  { email: 'ruttana.ri@up.ac.th', name_en: 'Rattana Prommai', name_th: 'รัตนา พรมใหม่', department: 'Data Science and Applications', position: 'อาจารย์', scholar_id: 'dorztZoAAAAJ' },

  // 7. Computer Engineering
  { email: 'apiwat.wi@up.ac.th', name_en: 'Apiwat Wittayarat', name_th: 'อภิวัฒน์ วิทยารัฐ', department: 'Computer Engineering', position: 'ประธานหลักสูตร / อาจารย์', scholar_id: null },
  { email: 'pornthep.ro@up.ac.th', name_en: 'Pornthep Rojanavasu', name_th: 'พรเทพ โรจนวสุ', department: 'Computer Engineering', position: 'ผู้ช่วยศาสตราจารย์ / คณบดี', scholar_id: 'pGxD1nkAAAAJ' },
  { email: 'jirabhorn.ch@up.ac.th', name_en: 'jirabhorn chaiwongsai', name_th: 'จิราพร ไชยวงศ์สาย', department: 'Computer Engineering', position: 'ผู้ช่วยศาสตราจารย์ / รองคณบดี', scholar_id: 'uSFP9soAAAAJ' },
  { email: 'bowonsak.sr@up.ac.th', name_en: 'Bowonsak Srisungsitthisanti', name_th: 'บวรศักดิ์ ศรีสังสิทธิสันติ', department: 'Computer Engineering', position: 'ผู้ช่วยศาสตราจารย์ / ผู้ช่วยคณบดี', scholar_id: 'AOHQFg8AAAAJ' },
  { email: 'sakorn.me@up.ac.th', name_en: 'Sakorn Mekruksavanich', name_th: 'สาคร เมฆรักษาวนิช', department: 'Computer Engineering', position: 'รองศาสตราจารย์', scholar_id: 'BElkl-MAAAAJ' },
  { email: 'thana.ud@up.ac.th', name_en: 'Thana Udomsripaiboon', name_th: 'ธนา อุดมศรีไพบูลย์', department: 'Computer Engineering', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'HAAwwFIAAAAJ' },
  { email: 'wattanapong.su@up.ac.th', name_en: 'Wattanapong Suttapak', name_th: 'วัฒนพงศ์ สุทธภักดิ์', department: 'Computer Engineering', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: 'A0mVNt4AAAAJ' },
  { email: 'torsak.so@up.ac.th', name_en: 'Torsak Soontornphand', name_th: 'ต่อศักดิ์ สุนทรพันธุ์', department: 'Computer Engineering', position: 'อาจารย์', scholar_id: 'KDU_DD8AAAAJ' },
  { email: 'narongchai.mo@up.ac.th', name_en: 'Phuwissorn Phumsaranakhom', name_th: 'ภูวิศสรณ์ ภูมิสรณคมณ์', department: 'Computer Engineering', position: 'อาจารย์', scholar_id: null },
  { email: 'narasak.bo@up.ac.th', name_en: 'narasak boonthep', name_th: 'นราศักดิ์ บุญเทพ', department: 'Computer Engineering', position: 'อาจารย์', scholar_id: 'XmdKPOMAAAAJ' },
  { email: 'khomkris.ma@up.ac.th', name_en: 'Khomkris Mathiang', name_th: 'คมกริช มาเที่ยง', department: 'Computer Engineering', position: 'อาจารย์', scholar_id: 'wnvJ3JcAAAAJ' },
  { email: 'adisaya.ch@up.ac.th', name_en: 'Adisaya Charoenphol', name_th: 'อดิศยา เจริญผล', department: 'Computer Engineering', position: 'อาจารย์', scholar_id: 'iG8Tp28AAAAJ' },

  // 8. Software Engineering
  { email: 'nattapon.ha@up.ac.th', name_en: 'Nattapon Harnsamut', name_th: 'ณัฐพล หาญสมุทร', department: 'Software Engineering', position: 'ประธานหลักสูตร / อาจารย์', scholar_id: '0wUVQkYAAAAJ' },
  { email: 'davit.sa@up.ac.th', name_en: 'davit sanpote', name_th: 'ดวิษ แสนโภชน์', department: 'Software Engineering', position: 'ผู้ช่วยศาสตราจารย์', scholar_id: '5YhyT8AAAAAJ' },
  { email: 'apiwat.bu@up.ac.th', name_en: 'Apiwat Budwong', name_th: 'อภิวัฒน์ บุตรวงค์', department: 'Software Engineering', position: 'อาจารย์', scholar_id: 'P_PFNCAAAAAJ' },
  { email: 'sujittra.sa@up.ac.th', name_en: 'Sujittra Inmanee', name_th: 'สุจิตตรา อินมะณี', department: 'Software Engineering', position: 'อาจารย์', scholar_id: null },
  { email: 'chaow.po@up.ac.th', name_en: 'Chaow Pokaew', name_th: 'เชาวน์ ปอแก้ว', department: 'Software Engineering', position: 'อาจารย์', scholar_id: null },
  { email: 'chontipan.pl@up.ac.th', name_en: 'Chontipan Plengwitthaya', name_th: 'ชลติพันธ์ เปล่งวิทยา', department: 'Software Engineering', position: 'อาจารย์', scholar_id: null },
  { email: 'mathaya.ra@up.ac.th', name_en: 'Mathaya Ratchakhom', name_th: 'เมธยา ราชคมน์', department: 'Software Engineering', position: 'อาจารย์', scholar_id: null }
];

async function initDatabase() {
  try {
    const conn = await pool.getConnection();

    // 1. ตาราง users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        azure_id VARCHAR(255) NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255) NULL,
        name_en VARCHAR(255) NULL,
        name_th VARCHAR(255) NULL,
        department VARCHAR(255) NULL,
        position VARCHAR(255) NULL,
        scholar_id VARCHAR(100) NULL,
        scopus_id VARCHAR(100) NULL,
        password_hash VARCHAR(255) NULL,
        role VARCHAR(50) DEFAULT 'user',
        program_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migration users: เพิ่มคอลัมน์ใหม่หากยังไม่มี
    const userColumns = [
      { name: 'name_en', type: 'VARCHAR(255) NULL' },
      { name: 'name_th', type: 'VARCHAR(255) NULL' },
      { name: 'department', type: 'VARCHAR(255) NULL' },
      { name: 'position', type: 'VARCHAR(255) NULL' },
      { name: 'scholar_id', type: 'VARCHAR(100) NULL' },
      { name: 'scopus_id', type: 'VARCHAR(100) NULL' },
      { name: 'password_hash', type: 'VARCHAR(255) NULL' }
    ];
    for (const col of userColumns) {
      try {
        await conn.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
      } catch (err) {
        // ละเว้นถ้ามีแล้ว
      }
    }

    // 2. ตาราง programs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        degree VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. ตาราง entries (ภาระงานที่คำนวณและบันทึก)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id VARCHAR(100) PRIMARY KEY,
        user_id INT NULL,
        title TEXT NULL,
        authors TEXT NULL,
        author VARCHAR(255) NULL,
        author_name VARCHAR(255) NULL,
        affiliations TEXT NULL,
        corresponding_author VARCHAR(255) NULL,
        publication_date VARCHAR(100) NULL,
        doi VARCHAR(255) NULL,
        journal VARCHAR(255) NULL,
        volume VARCHAR(100) NULL,
        issue VARCHAR(100) NULL,
        abstract TEXT NULL,
        keywords TEXT NULL,
        type VARCHAR(255) NOT NULL,
        db VARCHAR(255) NULL,
        proportion DECIMAL(5,2) DEFAULT 100,
        date VARCHAR(100) NULL,
        code VARCHAR(50) NULL,
        base_hours DECIMAL(10,2) DEFAULT 0,
        quality DECIMAL(10,2) DEFAULT 0,
        actual_hours DECIMAL(10,2) DEFAULT 0,
        faculty DECIMAL(10,2) DEFAULT 0,
        faculty_note TEXT NULL,
        uni DECIMAL(10,2) DEFAULT 0,
        date_info JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. ตาราง papers (ผลงานวิจัยที่ซิงก์จาก Google Scholar หรือนำเข้า)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS papers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        publish_year INT NULL,
        authors_raw TEXT NULL,
        cited_by INT DEFAULT 0,
        scholar_url TEXT NULL,
        source VARCHAR(50) DEFAULT 'scholar',
        status ENUM('DRAFT_AUTO', 'PENDING_CO_AUTHOR', 'COMPLETED') DEFAULT 'DRAFT_AUTO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. ตาราง paper_authors (Co-author & Contribution allocation)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS paper_authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paper_id INT NOT NULL,
        user_id INT NOT NULL,
        contribution_percent DECIMAL(5,2) DEFAULT 0.00,
        is_first_author TINYINT(1) DEFAULT 0,
        is_co_first_author TINYINT(1) DEFAULT 0,
        is_corresponding TINYINT(1) DEFAULT 0,
        is_co_corresponding TINYINT(1) DEFAULT 0,
        author_order INT NULL,
        status ENUM('PENDING', 'CONFIRMED') DEFAULT 'PENDING',
        confirmed_at TIMESTAMP NULL,
        UNIQUE KEY uq_paper_user (paper_id, user_id),
        INDEX idx_paper_authors_roles (is_first_author, is_corresponding, is_co_first_author, is_co_corresponding),
        INDEX idx_paper_authors_order (paper_id, author_order),
        FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. ตาราง paper_blacklists (ผลงานที่อาจารย์กดปฏิเสธ ไม่ใช่ของฉัน)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS paper_blacklists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        scholar_title VARCHAR(500) NOT NULL,
        rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_title (user_id, scholar_title(255)),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. ตาราง research_papers (เก็บผลการสกัดจาก PDF ผ่าน GROBID + Gemini AI)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS research_papers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_title TEXT,
        publish_date DATE NULL,
        authors JSON NULL,
        author_contribution TEXT NULL,
        file_name VARCHAR(255) NULL,
        bucket_name VARCHAR(255) NULL,
        doi VARCHAR(255) NULL,
        journal VARCHAR(255) NULL,
        publication_level VARCHAR(255) NULL,
        volume VARCHAR(100) NULL,
        issue VARCHAR(100) NULL,
        pages VARCHAR(100) NULL,
        abstract TEXT NULL,
        keywords TEXT NULL,
        study_design TEXT NULL,
        participants JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed ข้อมูลอาจารย์ UP ICT ถ้ายังไม่มี
    for (const f of UP_ICT_FACULTY) {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [f.email]);
      if (existing.length === 0) {
        await conn.query(`
          INSERT INTO users (email, full_name, name_en, name_th, department, position, scholar_id, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'user')
        `, [
          f.email,
          f.name_th || f.name_en,
          f.name_en,
          f.name_th,
          f.department,
          f.position,
          f.scholar_id
        ]);
      } else {
        // อัปเดตข้อมูล scholar_id, department, position ให้เป็นปัจจุบัน
        await conn.query(`
          UPDATE users 
          SET name_en = COALESCE(name_en, ?),
              name_th = COALESCE(name_th, ?),
              department = COALESCE(department, ?),
              position = COALESCE(position, ?),
              scholar_id = COALESCE(scholar_id, ?),
              full_name = COALESCE(full_name, ?)
          WHERE id = ?
        `, [
          f.name_en,
          f.name_th,
          f.department,
          f.position,
          f.scholar_id,
          f.name_th || f.name_en,
          existing[0].id
        ]);
      }
    }
    console.log(`✅ ข้อมูลบุคลากรคณะ ICT มหาวิทยาลัยพะเยา (${UP_ICT_FACULTY.length} ท่าน) พร้อมใช้งาน`);

    conn.release();
    console.log('✅ ตรวจสอบและเตรียมโครงสร้างตาราง MySQL Database สำเร็จ');
  } catch (err) {
    console.error('⚠️ ข้อผิดพลาดในการตรวจสอบตารางฐานข้อมูล:', err.message);
  }
}

pool.getConnection()
  .then(conn => {
    console.log('✅ เชื่อมต่อ MySQL Database สำเร็จ!');
    conn.release();
    initDatabase();
  })
  .catch(err => {
    console.error('❌ ไม่สามารถเชื่อมต่อ MySQL ได้:', err.message);
    console.error('💡 ตรวจสอบไฟล์ .env หรือเปิด MySQL Container ผ่าน docker compose up -d');
  });

module.exports = pool;
