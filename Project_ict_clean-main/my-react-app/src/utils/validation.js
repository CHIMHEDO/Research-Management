// frontend/src/utils/validation.js
import { getCurriculumExpiryStatus } from "./curriculumExpiry";

/**
 * ตรวจสอบความครบถ้วนของข้อมูลผลงานวิชาการ (Incomplete Check)
 */
export function checkPaperCompleteness(paper) {
  const missing = [];

  // 1. ตรวจสอบชื่อบทความ
  if (!paper.title || paper.title.trim().length < 3) {
    missing.push("ชื่องานวิจัย / ผลงาน");
  }

  // 2. ตรวจสอบวันที่เผยแพร่
  const pubDate = paper.publicationDate || paper.publication_date || paper.date;
  if (!pubDate) {
    missing.push("วันที่เผยแพร่ / ปีที่พิมพ์");
  }

  // 3. ตรวจสอบวารสาร / แหล่งเผยแพร่
  const isJournalOrConf = (paper.type || "").includes("วารสาร") || (paper.type || "").includes("ประชุม");
  if (isJournalOrConf && !paper.journal) {
    missing.push("ชื่อวารสาร / แหล่งเผยแพร่");
  }

  // 4. ตรวจสอบ DOI (หากเป็นฐานข้อมูล Scopus / TCI)
  const isIndexed = (paper.db && paper.db !== "ไม่มีฐานข้อมูล");
  if (isIndexed && !paper.doi) {
    missing.push("เลข DOI");
  }

  // 5. ตรวจสอบสัดส่วนผู้แต่ง
  const authorList = paper.authorList || [];
  if (authorList.length > 0) {
    const totalProportion = authorList.reduce((sum, a) => sum + (Number(a.proportion) || 0), 0);
    if (Math.abs(totalProportion - 100) > 0.5) {
      missing.push(`สัดส่วนผู้แต่งรวมไม่เท่ากับ 100% (รวมได้ ${totalProportion}%)`);
    }
    const hasZeroOrEmpty = authorList.some(a => a.proportion === "" || a.proportion === null || Number(a.proportion) <= 0);
    if (authorList.length > 1 && hasZeroOrEmpty) {
      missing.push("มีผู้แต่งที่ไม่ได้ระบุสัดส่วนหรือสัดส่วนเป็น 0%");
    }
  } else if (!paper.proportion || Number(paper.proportion) <= 0) {
    missing.push("สัดส่วนการมีส่วนร่วม (%)");
  }

  const isIncomplete = missing.length > 0;

  return {
    isIncomplete,
    missingCount: missing.length,
    missingFields: missing,
    badgeText: isIncomplete ? `ข้อมูลไม่ครบ (${missing.length})` : "ข้อมูลสมบูรณ์",
    badgeColor: isIncomplete ? "warning" : "success"
  };
}

/**
 * รวมสถานะการแจ้งเตือนทั้งหมดของผลงาน (Expiry + Incomplete + Disbursement)
 */
export function getPaperAlertSummary(paper) {
  const pubDate = paper.publicationDate || paper.publication_date || paper.date;
  const expiry = getCurriculumExpiryStatus(pubDate);
  const completeness = checkPaperCompleteness(paper);

  const alerts = [];

  if (completeness.isIncomplete) {
    alerts.push({
      type: "incomplete",
      level: "warning",
      title: "ข้อมูลผลงานไม่ครบถ้วน",
      description: `ขาด: ${completeness.missingFields.join(", ")}`
    });
  }

  if (expiry.isExpired) {
    alerts.push({
      type: "expired",
      level: "danger",
      title: "ไม่สามารถใช้ได้ในหลักสูตร",
      description: "ผลงานมีอายุเกินรอบ 5 ปี ไม่สามารถนำไปใช้ในรอบหลักสูตรปัจจุบันได้"
    });
  } else if (expiry.isExpiring) {
    alerts.push({
      type: "expiring",
      level: expiry.urgency >= 3 ? "danger" : "warning",
      title: `ผลงานใกล้ครบกำหนด 5 ปี (${expiry.badgeText})`,
      description: `สิ้นสุดการใช้ในหลักสูตรวันที่ ${expiry.expiryDateFormatted}`
    });
  }

  return {
    expiry,
    completeness,
    alerts,
    hasAlerts: alerts.length > 0,
    hasUrgentAlert: alerts.some(a => a.level === "danger")
  };
}
