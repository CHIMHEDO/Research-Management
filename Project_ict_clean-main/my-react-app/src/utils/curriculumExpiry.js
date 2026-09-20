// frontend/src/utils/curriculumExpiry.js

/**
 * คำนวณวันหมดอายุ 5 ปีตามรอบหลักสูตร (แบบ A: อิงรอบภาระงาน ก.ค. ปี N - มิ.ย. ปี N+1)
 * และคำนวณสถานะแจ้งเตือน 4 ระดับ (1 ปี, 6 เดือน, 3 เดือน, 1 เดือน) + หมดอายุ
 */
export function getCurriculumExpiryStatus(dateStr, customNow = null) {
  if (!dateStr) {
    return {
      status: "UNKNOWN",
      statusKey: "unknown",
      statusLabel: "ไม่ระบุวันที่",
      badgeText: "ไม่ระบุวันที่",
      badgeColor: "gray",
      urgency: 0,
      isExpiring: false,
      isExpired: false,
      isValid: false,
      diffDays: 0,
      expiryDateFormatted: "-",
      cycleLabel: "-"
    };
  }

  const d = new Date(dateStr + (dateStr.length <= 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) {
    return {
      status: "INVALID_DATE",
      statusKey: "unknown",
      statusLabel: "วันที่ไม่ถูกต้อง",
      badgeText: "วันที่ไม่ถูกต้อง",
      badgeColor: "gray",
      urgency: 0,
      isExpiring: false,
      isExpired: false,
      isValid: false,
      diffDays: 0,
      expiryDateFormatted: "-",
      cycleLabel: "-"
    };
  }

  const now = customNow ? new Date(customNow) : new Date();
  const y = d.getFullYear();
  const beYear = y + 543;
  const month = d.getMonth(); // 0 = Jan, 6 = Jul, 11 = Dec

  // รอบปีภาระงาน: กรกฎาคม (ปี N) - มิถุนายน (ปี N+1)
  const startBeYear = month >= 6 ? beYear : beYear - 1;
  const endBeYear = startBeYear + 1;
  const startGregorianYear = startBeYear - 543;

  const shortStartBe = String(startBeYear).slice(-2);
  const shortEndBe = String(endBeYear).slice(-2);
  const cycleLabel = `กรกฎาคม ${shortStartBe} - มิถุนายน ${shortEndBe}`;
  const cycleFullLabel = `กรกฎาคม ${startBeYear} - มิถุนายน ${endBeYear}`;

  // วันสิ้นสุด 5 ปีของรอบหลักสูตร: 30 มิถุนายน ของปีที่ (startBeYear + 5)
  const expiryEndBeYear = startBeYear + 5;
  const expiryGregorianYear = startGregorianYear + 5;
  const expiryDate = new Date(expiryGregorianYear, 5, 30, 23, 59, 59, 999);
  const expiryDateFormatted = `30 มิ.ย. ${expiryEndBeYear}`;

  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const approxMonths = Math.ceil(diffDays / 30.4375);

  if (diffDays <= 0) {
    return {
      status: "EXPIRED",
      statusKey: "expired",
      statusLabel: "ไม่สามารถใช้ในหลักสูตรล่าสุดได้",
      badgeText: "ไม่สามารถใช้ในหลักสูตรล่าสุดได้",
      badgeColor: "expired", // gray/slate
      urgency: 0,
      isExpiring: false,
      isExpired: true,
      isValid: false,
      diffDays,
      approxMonths: 0,
      expiryDate,
      expiryDateFormatted,
      expiryEndBeYear,
      cycleLabel,
      cycleFullLabel,
      startBeYear,
      endBeYear
    };
  }

  if (approxMonths <= 1 || diffDays <= 31) {
    return {
      status: "ONE_MONTH",
      statusKey: "1_month",
      statusLabel: "เตือนระยะวิกฤต: เหลือเวลาอีก 1 เดือนสุดท้าย",
      badgeText: "เหลืออีก 1 เดือน",
      badgeColor: "danger", // red
      urgency: 4,
      isExpiring: true,
      isExpired: false,
      isValid: true,
      diffDays,
      approxMonths: 1,
      expiryDate,
      expiryDateFormatted,
      expiryEndBeYear,
      cycleLabel,
      cycleFullLabel,
      startBeYear,
      endBeYear
    };
  }

  if (approxMonths <= 3 || diffDays <= 93) {
    return {
      status: "THREE_MONTHS",
      statusKey: "3_months",
      statusLabel: "เตือนล่วงหน้า: เหลือเวลาอีก 3 เดือน",
      badgeText: "เหลืออีก 3 เดือน",
      badgeColor: "rose", // orange-red
      urgency: 3,
      isExpiring: true,
      isExpired: false,
      isValid: true,
      diffDays,
      approxMonths: 3,
      expiryDate,
      expiryDateFormatted,
      expiryEndBeYear,
      cycleLabel,
      cycleFullLabel,
      startBeYear,
      endBeYear
    };
  }

  if (approxMonths <= 6 || diffDays <= 183) {
    return {
      status: "SIX_MONTHS",
      statusKey: "6_months",
      statusLabel: "เตือนล่วงหน้า: เหลือเวลาอีก 6 เดือน",
      badgeText: "เหลืออีก 6 เดือน",
      badgeColor: "warning", // amber/orange
      urgency: 2,
      isExpiring: true,
      isExpired: false,
      isValid: true,
      diffDays,
      approxMonths: 6,
      expiryDate,
      expiryDateFormatted,
      expiryEndBeYear,
      cycleLabel,
      cycleFullLabel,
      startBeYear,
      endBeYear
    };
  }

  if (approxMonths <= 12 || diffDays <= 365) {
    return {
      status: "ONE_YEAR",
      statusKey: "1_year",
      statusLabel: "เตือนล่วงหน้า: เหลือเวลาอีก 1 ปี",
      badgeText: "เหลืออีก 1 ปี",
      badgeColor: "info-yellow", // yellow
      urgency: 1,
      isExpiring: true,
      isExpired: false,
      isValid: true,
      diffDays,
      approxMonths: 12,
      expiryDate,
      expiryDateFormatted,
      expiryEndBeYear,
      cycleLabel,
      cycleFullLabel,
      startBeYear,
      endBeYear
    };
  }

  return {
    status: "VALID",
    statusKey: "valid",
    statusLabel: "ยังอยู่ในเกณฑ์หลักสูตร (มีอายุไม่เกิน 5 ปี)",
    badgeText: "ใช้ได้ในหลักสูตร",
    badgeColor: "success", // green
    urgency: 0,
    isExpiring: false,
    isExpired: false,
    isValid: true,
    diffDays,
    approxMonths,
    expiryDate,
    expiryDateFormatted,
    expiryEndBeYear,
    cycleLabel,
    cycleFullLabel,
    startBeYear,
    endBeYear
  };
}
