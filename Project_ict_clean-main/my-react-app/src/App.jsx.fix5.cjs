// Fix script for App.jsx - handleImportFromScholar
const fs = require('fs');

const oldCode = `const handleImportFromScholar = (paperData, userObj) => {
    console.log("📥 ข้อมูลดิบที่รับมาจาก Modal:", paperData);

    // 1. ใช้ Parser หั่นชื่อและจัดฟอร์แมตผู้แต่ง
    const mappedAuthorList = parseImportedAuthors(paperData.authors_raw || paperData.authors);

    // 🌟 NEW: Equal split on import
    const numAuthors = mappedAuthorList.length;
    const initialSplit = numAuthors > 0 ? Math.floor(100 / numAuthors) : 0;
    const remainder = numAuthors > 0 ? 100 - (initialSplit * numAuthors) : 0;

    const authorsWithInitialSplit = mappedAuthorList.map((author, index) => ({
      ...author,
      proportion: index === 0 ? initialSplit + remainder : initialSplit
    });

    // 2. Map ข้อมูลลง State ของ Form ให้ครบทุกฟิลด์
    setForm(prev => ({
      ...prev,
      title: paperData.title || paperData.article_title || paperData.name || paperData.title_text || '',
      // จัดการวารสารและ DOI (Scopus มักจะส่งมาครบ)
      journal: paperData.journal || paperData.publication || '',
      doi: paperData.doi || paperData.article_doi || '',
      // จัดการ Volume / Issue
      volume: paperData.volume || '',
      issue: paperData.issue || '',
      // จัดการปีพิมพ์ (ถ้ามี) - รองรับ key หลายรูปแบบ
      publicationDate: paperData.publicationDate || paperData.publishDate || paperData.year || paperData.pub_year || paperData.date || '',
      // บทคัดย่อและคำสำคัญ
      abstract: paperData.abstract || paperData.description || '',
      keywords: Array.isArray(paperData.keywords)
        ? paperData.keywords.join(', ')  // 🌟 Handle Array from Scopus detail API
        : (paperData.keywords || ''),
      // โยนรายชื่อผู้แต่งที่ผ่านการหั่นแล้วลงตาราง
      authorList: authorsWithInitialSplit,
      // ตั้งค่า Corresponding Author เป็น First Author ให้ก่อนอัตโนมัติ (เพื่อลดภาระผู้ใช้)
      correspondingAuthor: authorsWithInitialSplit.length > 0 ? authorsWithInitialSplit[0].name : ''
    }));

    // เลื่อนหน้าจอกลับขึ้นไปด้านบนเพื่อให้ผู้ใช้เห็นว่าข้อมูลเปลี่ยนแล้ว
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };`;

const newCode = `const handleImportFromScholar = (paperData, userObj) => {
    console.log("📥 ข้อมูลดิบที่รับมาจาก Modal:", paperData);

    // 1. ตรวจสอบที่มาของข้อมูลให้ชัดเจนยิ่งขึ้น (ป้องกันค่า null / undefined สตริง)
    const isScopusImport = Boolean(
      paperData.eid && 
      paperData.eid !== 'null' && 
      paperData.eid !== 'undefined' && 
      paperData.eid.trim() !== ''
    ) || paperData.source === 'scopus';

    // 1. ใช้ Parser หั่นชื่อและจัดฟอร์แมตผู้แต่ง
    const authorRaw = paperData.authors_raw || paperData.authors || [];
    const mappedAuthorList = parseImportedAuthors(authorRaw, isScopusImport);

    // 🌟 NEW: Equal split on import
    const numAuthors = mappedAuthorList.length;
    const initialSplit = numAuthors > 0 ? Math.floor(100 / numAuthors) : 0;
    const remainder = numAuthors > 0 ? 100 - (initialSplit * numAuthors) : 0;

    const authorsWithInitialSplit = mappedAuthorList.map((author, index) => ({
      ...author,
      proportion: index === 0 ? initialSplit + remainder : initialSplit
    });

    // 3. ตั้งค่า Corresponding Author จากผู้แต่งที่มี isCorresponding = true
    const correspondingAuthorName = authorsWithInitialSplit.find(a => a.isCorresponding)?.name 
      || (authorsWithInitialSplit.length > 0 ? authorsWithInitialSplit[authorsWithInitialSplit.length - 1].name : '');

    // 2. Map ข้อมูลลง State ของ Form ให้ครบทุกฟิลด์
    setForm(prev => ({
      ...prev,
      title: paperData.title || paperData.article_title || paperData.name || paperData.title_text || '',
      // จัดการวารสารและ DOI (Scopus มักจะส่งมาครบ)
      journal: paperData.journal || paperData.publication || '',
      doi: paperData.doi || paperData.article_doi || '',
      // จัดการ Volume / Issue
      volume: paperData.volume || '',
      issue: paperData.issue || '',
      // จัดการปีพิมพ์ (ถ้ามี) - รองรับ key หลายรูปแบบ
      publicationDate: paperData.publicationDate || paperData.publishDate || paperData.year || paperData.pub_year || paperData.date || '',
      // บทคัดย่อและคำสำคัญ
      abstract: paperData.abstract || paperData.description || '',
      keywords: Array.isArray(paperData.keywords)
        ? paperData.keywords.join(', ')
        : (paperData.keywords || ''),
      // โยนรายชื่อผู้แต่งที่ผ่านการหั่นแล้วลงตาราง
      authorList: authorsWithInitialSplit,
      // ตั้งค่า Corresponding Author จากผู้แต่งที่มี isCorresponding = true
      correspondingAuthor: correspondingAuthorName
    }));

    // เลื่อนหน้าจอกลับขึ้นไปด้านบนเพื่อให้ผู้ใช้เห็นว่าข้อมูลเปลี่ยนแล้ว
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };`;

const fs = require('fs');
const content = fs.readFileSync('D:\\downloads\\Research-Management\\Project_ict_clean-main\\my-react-app\\src\\App.jsx', 'utf8');

if (content.includes(oldCode)) {
  const newContent = content.replace(oldCode, newCode);
  fs.writeFileSync('D:\\downloads\\Research-Management\\Project_ict_clean-main\\my-react-app\\src\\App.jsx', content, 'utf8');
  console.log('Successfully updated handleImportFromScholar');
} else {
  console.log('Old code not found!');
}