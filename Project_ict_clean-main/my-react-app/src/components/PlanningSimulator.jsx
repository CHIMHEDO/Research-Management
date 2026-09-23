import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Layers, 
  Coins, 
  CalendarDays, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';

const AUTHOR_OPTIONS = ["First author", "Corresponding author", "Co author"];
const DB_OPTIONS = ["ไม่มีฐานข้อมูล", "TCI กลุ่ม 2", "TCI กลุ่ม 1", "Scopus Q1", "Scopus Q2", "Scopus Q3", "Scopus Q4"];

const TYPE_GROUPS = [
  {
    label: "การประชุมวิชาการ",
    types: [
      "การประชุมวิชาการระดับชาติ",
      "การประชุมวิชาการระดับนานาชาติ"
    ]
  },
  { label: "วารสารวิชาการ", types: ["วารสารระดับชาติ", "วารสารระดับนานาชาติ"] },
  { label: "ทรัพย์สินทางปัญญา", types: ["จดทะเบียนทรัพย์สินทางปัญญาอื่นๆ", "จดทะเบียนอนุสิทธิบัตร", "จดทะเบียนสิทธิบัตร"] },
  {
    label: "งานสร้างสรรค์",
    types: [
      "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ",
      "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ",
    ],
  },
];

const LOOKUP_TABLE = [
  { type: "การประชุมวิชาการระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.4", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "การประชุมวิชาการระดับนานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.5", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 2", code: "2.1.6", hours: 80, quality: 0.6, faculty: 2500, uni: 0 },
  { type: "วารสารระดับชาติ", db: "TCI กลุ่ม 1", code: "2.1.7", hours: 120, quality: 0.8, faculty: 2500, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.1.7", hours: 120, quality: 0.8, faculty: 10000, uni: 0 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q1", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 40000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q2", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 30000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q3", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 20000 },
  { type: "วารสารระดับนานาชาติ", db: "Scopus Q4", code: "2.1.8", hours: 150, quality: 1, faculty: 10000, facultyNote: "ไม่เกิน 10,000 บาท (จ่ายตามจริง)", uni: 10000 },
  { type: "จดทะเบียนทรัพย์สินทางปัญญาอื่นๆ", db: "ไม่มีฐานข้อมูล", code: "2.1.9", hours: 150, quality: 0, faculty: 0, uni: 1000 },
  { type: "จดทะเบียนอนุสิทธิบัตร", db: "ไม่มีฐานข้อมูล", code: "2.1.10", hours: 150, quality: 0.4, faculty: 0, uni: 3000 },
  { type: "จดทะเบียนสิทธิบัตร", db: "ไม่มีฐานข้อมูล", code: "2.1.11", hours: 300, quality: 1, faculty: 0, uni: 5000 },
  { type: "งานสร้างสรรค์ที่มีการเผยแพร่สู่สาธารณะ (สื่ออิเล็กทรอนิกส์ online)", db: "ไม่มีฐานข้อมูล", code: "2.2.1", hours: 20, quality: 0.2, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับสถาบัน", db: "ไม่มีฐานข้อมูล", code: "2.2.2", hours: 40, quality: 0.4, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับชาติ", db: "ไม่มีฐานข้อมูล", code: "2.2.3", hours: 80, quality: 0.6, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับความร่วมมือระหว่างประเทศ", db: "ไม่มีฐานข้อมูล", code: "2.2.4", hours: 120, quality: 0.8, faculty: 0, uni: 0 },
  { type: "งานสร้างสรรค์ที่ได้รับการเผยแพร่ในระดับภูมิภาคอาเซียน/นานาชาติ", db: "ไม่มีฐานข้อมูล", code: "2.2.5", hours: 150, quality: 1, faculty: 0, uni: 0 },
];

function calculateFacultyFunding(type, author, baseFaculty) {
  if (type === "การประชุมวิชาการระดับชาติ") {
    if (author === "First author") return 1000;
    if (author === "Corresponding author") return 500;
    return 0;
  }
  if (type === "การประชุมวิชาการระดับนานาชาติ") {
    if (author === "First author" || author === "Corresponding author") return 9000;
    if (author === "Co author") return 2500;
    return 0;
  }
  return baseFaculty;
}

function computeDateInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const beYear = y + 543;
  const month = d.getMonth();

  const juneStart = new Date(y, 5, 15);
  const acadGregorian = d >= juneStart ? y : y - 1;
  
  const julyStart = new Date(y, 6, 1);
  const fiscalEndGregorian = d >= julyStart ? y + 1 : y;

  const startBeYear = month >= 6 ? beYear : beYear - 1;
  const endBeYear = startBeYear + 1;
  const shortStartBe = String(startBeYear).slice(-2);
  const shortEndBe = String(endBeYear).slice(-2);

  return {
    beLabel: `ปี พ.ศ. ${beYear}`,
    acadLabel: `ปีการศึกษา ${acadGregorian + 543}`,
    fiscalLabel: `ปีงบประมาณ ${fiscalEndGregorian + 543}`,
    workloadLabel: `กรกฎาคม ${shortStartBe} - มิถุนายน ${shortEndBe}`,
    workloadFullLabel: `กรกฎาคม ${startBeYear} - มิถุนายน ${endBeYear}`,
    workloadCycleKey: `${startBeYear}-${endBeYear}`,
    workloadStartYear: startBeYear,
    workloadEndYear: endBeYear,
  };
}

export default function PlanningSimulator({ onApplyToForm }) {
  // 5 parameters for planning as specified
  const defaultPlanningState = {
    author: AUTHOR_OPTIONS[0],
    type: TYPE_GROUPS[1].types[1], // วารสารระดับนานาชาติ
    db: "Scopus Q1",
    proportion: 100,
    publicationDate: new Date().toISOString().split('T')[0],
  };

  const [planForm, setPlanForm] = useState(defaultPlanningState);

  // Real-time calculation computation
  const calculation = useMemo(() => {
    const lookup = LOOKUP_TABLE.find(r => r.type === planForm.type && r.db === planForm.db) || {
      hours: 0,
      quality: 0,
      code: "-",
      faculty: 0,
      uni: 0
    };

    const actualHours = Math.round(((Number(planForm.proportion) || 0) * lookup.hours) / 100 * 100) / 100;
    const faculty = calculateFacultyFunding(planForm.type, planForm.author, lookup.faculty);
    const dateInfo = computeDateInfo(planForm.publicationDate);

    return {
      ...lookup,
      actualHours,
      faculty,
      dateInfo,
    };
  }, [planForm]);

  const handleReset = () => {
    setPlanForm(defaultPlanningState);
  };

  const handleApply = () => {
    if (onApplyToForm) {
      onApplyToForm({
        author: planForm.author,
        type: planForm.type,
        db: planForm.db,
        proportion: planForm.proportion,
        publicationDate: planForm.publicationDate,
        date: planForm.publicationDate,
      });
    }
  };

  return (
    <div className="planning-simulator-container">
      {/* Top Banner Header */}
      <div className="dashboard-top-banner" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ 
              background: "linear-gradient(135deg, #7c3aed, #a855f7)", 
              color: "#fff", 
              padding: "6px 10px", 
              borderRadius: 8, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Target size={20} />
            </span>
            <h2 className="dashboard-intro-title" style={{ margin: 0 }}>
              เครื่องมือวางแผนและจำลองภาระงาน (Workload Simulator)
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "#64748b" }}>
            กรอก 5 ข้อมูลหลักเพื่อจำลองคำนวณชั่วโมงภาระงาน เงินสนับสนุน และปีภาระงานล่วงหน้าแบบ Real-time โดยไม่ต้องกรอกรายละเอียดเปเปอร์
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="preset-btn"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", height: "fit-content" }}
          title="รีเซ็ตค่าเริ่มต้น"
        >
          <RotateCcw size={14} />
          <span>รีเซ็ตค่า</span>
        </button>
      </div>

      {/* 2-Column Grid Layout: Input Controls + Hero Live Result */}
      <div className="form-grid-layout">
        {/* Left Column: 5 Planning Controls */}
        <div className="card" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
            <Sparkles size={18} color="#7c3aed" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
              พารามิเตอร์จำลองการประเมิน (5 ข้อมูลหลัก)
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* 1. ตำแหน่งผู้ประพันธ์ (ของผู้ยื่น) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                1. ตำแหน่งผู้ประพันธ์ (ของผู้ยื่น) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="form-control"
                value={planForm.author}
                onChange={e => setPlanForm({ ...planForm, author: e.target.value })}
              >
                {AUTHOR_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* 2. ประเภทผลงานวิชาการ */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                2. ประเภทผลงานวิชาการ <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="form-control"
                value={planForm.type}
                onChange={e => setPlanForm({ ...planForm, type: e.target.value })}
              >
                {TYPE_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 3. ฐานข้อมูล / การรับรอง */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                3. ฐานข้อมูล / การรับรอง <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className="form-control"
                value={planForm.db}
                onChange={e => setPlanForm({ ...planForm, db: e.target.value })}
              >
                {DB_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* 4. สัดส่วนการมีส่วนร่วม (%) */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                  4. สัดส่วนการมีส่วนร่วม (%) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <span className="badge-value">
                  {planForm.proportion !== "" ? `${planForm.proportion}%` : "0%"}
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={planForm.proportion}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "") {
                    setPlanForm({ ...planForm, proportion: "" });
                  } else {
                    const num = Number(val);
                    if (num >= 0 && num <= 100) {
                      setPlanForm({ ...planForm, proportion: num });
                    }
                  }
                }}
                placeholder="กรอกตัวเลข 0 - 100"
                className="form-control"
              />
              {/* Preset Buttons */}
              <div className="preset-buttons" style={{ marginTop: 8 }}>
                {[100, 50, 33.3, 25].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, proportion: pct })}
                    className={`preset-btn ${planForm.proportion === pct ? "active" : ""}`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Publication Date (วันที่ตีพิมพ์ / เผยแพร่) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                5. Publication Date (วันที่คาดว่าจะตีพิมพ์ / เผยแพร่) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={planForm.publicationDate || ""}
                onChange={e => setPlanForm({ ...planForm, publicationDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: 22, padding: "12px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Info size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              <strong>เคล็ดลับ:</strong> คุณสามารถปรับเปลี่ยนสัดส่วนการมีส่วนร่วมหรือฐานข้อมูล เพื่อดูความคุ้มค่าของชั่วโมงภาระงานและเงินรางวัลสนับสนุนเปรียบเทียบกันได้ทันที
            </p>
          </div>
        </div>

        {/* Right Column: Hero Live Result Card */}
        <div className="preview-card-purple">
          <div className="purple-card-header">
            <div className="purple-card-title">
              <Layers size={18} />
              <span>สรุปผลการจำลองภาระงาน</span>
            </div>
            <span className="purple-live-badge">Live Simulator</span>
          </div>

          {/* Big Hero Number Box */}
          <div className="purple-hero-stat">
            <div className="hero-stat-label">ชั่วโมงภาระงานที่จะได้รับ</div>
            <div className="hero-stat-number">
              {calculation.actualHours}
              <span className="hero-stat-unit">ชม.</span>
            </div>
            <div className="hero-stat-formula">
              = {calculation.hours} ชม.ฐาน × {planForm.proportion || 0}% สัดส่วน
            </div>
          </div>

          {/* Criteria Metrics Block */}
          <div className="purple-metrics-grid">
            <div className="purple-metric-item">
              <div className="purple-metric-label">รหัสเกณฑ์</div>
              <div className="purple-metric-val">{calculation.code}</div>
            </div>
            <div className="purple-metric-item">
              <div className="purple-metric-label">ชั่วโมงฐาน</div>
              <div className="purple-metric-val">{calculation.hours} ชม.</div>
            </div>
            <div className="purple-metric-item">
              <div className="purple-metric-label">ค่าน้ำหนัก (Q)</div>
              <div className="purple-metric-val">{calculation.quality}</div>
            </div>
          </div>

          {/* Finance & Budget Support Box */}
          <div className="purple-finance-box">
            <div className="purple-finance-row">
              <span className="purple-finance-name">
                <Coins size={14} color="#fde047" /> เงินสนับสนุนคณะ
              </span>
              <span className="purple-finance-amount">
                {calculation.faculty > 0 ? `${calculation.faculty.toLocaleString()} ฿` : "-"}
              </span>
            </div>
            {calculation.facultyNote && (
              <div style={{ fontSize: 11, color: "#fef08a", marginTop: -4 }}>
                * {calculation.facultyNote}
              </div>
            )}
            <div className="purple-finance-row">
              <span className="purple-finance-name">
                <Coins size={14} color="#86efac" /> เงินสนับสนุนมหาวิทยาลัย
              </span>
              <span className="purple-finance-amount">
                {calculation.uni > 0 ? `${calculation.uni.toLocaleString()} ฿` : "-"}
              </span>
            </div>
          </div>

          {/* Fiscal & Academic Calendar Tags */}
          {calculation.dateInfo && (
            <div className="purple-calendar-tags">
              <span className="purple-calendar-chip">
                <CalendarDays size={11} style={{ marginRight: 4, display: "inline" }} />
                {calculation.dateInfo.workloadLabel || `ปีภาระงาน ${calculation.dateInfo.acadLabel?.replace('ปีการศึกษา ', '') || ''}`}
              </span>
              <span className="purple-calendar-chip">{calculation.dateInfo.beLabel}</span>
              <span className="purple-calendar-chip">{calculation.dateInfo.acadLabel}</span>
              <span className="purple-calendar-chip">{calculation.dateInfo.fiscalLabel}</span>
            </div>
          )}

          {/* Forward to full entry form (Sticky Card) */}
          {onApplyToForm && (
            <button
              type="button"
              onClick={handleApply}
              className="btn-purple-save"
              style={{ marginTop: "14px" }}
            >
              <span>นำข้อมูลนี้ไปกรอกบันทึกจริง</span>
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
