const cron = require('node-cron');
const { syncAllUsersScholarData } = require('./scholarService');
const { supabase } = require('./db');
require('dotenv').config();

let cronTask = null;
let autoLockTask = null;
let cronStatus = {
    enabled: false,
    schedule: '0 0 * * 0',
    lastRunAt: null,
    lastResult: null,
    isRunning: false
};

/**
 * BR-02: ตรวจสอบและอัปเดตสถานะผลงานที่พ้นกำหนด 7 วันเป็น AUTO_CONFIRMED โดยอัตโนมัติ
 */
async function checkAndAutoConfirmExpiredEntries() {
    try {
        console.log('[Auto-Lock Cron] 🔍 เริ่มตรวจสอบผลงานที่ครบกำหนด 7 วัน...');
        const { data: entries, error } = await supabase
            .from('entries')
            .select('*');

        if (error) {
            console.error('[Auto-Lock Cron Error]:', error.message);
            return { updatedCount: 0, error: error.message };
        }

        if (!entries || entries.length === 0) {
            return { updatedCount: 0 };
        }

        const now = new Date();
        let updatedCount = 0;

        for (const entry of entries) {
            let parsedDateInfo = {};
            if (typeof entry.date_info === 'string') {
                try { parsedDateInfo = JSON.parse(entry.date_info); } catch { parsedDateInfo = {}; }
            } else if (entry.date_info && typeof entry.date_info === 'object') {
                parsedDateInfo = entry.date_info;
            }

            const confirmation = parsedDateInfo.confirmation;
            if (!confirmation) continue;

            const currentStatus = confirmation.status || 'PENDING';
            if (currentStatus === 'PENDING') {
                const createdAt = entry.created_at ? new Date(entry.created_at) : now;
                const deadline = confirmation.deadline ? new Date(confirmation.deadline) : new Date(createdAt.getTime() + 7 * 86400000);

                // หากเกินกำหนด 7 วัน และยังไม่ยืนยันครบ ให้ปรับเป็น AUTO_CONFIRMED (BR-02)
                if (now.getTime() >= deadline.getTime()) {
                    parsedDateInfo.confirmation = {
                        ...confirmation,
                        status: 'AUTO_CONFIRMED',
                        auto_confirmed_at: now.toISOString(),
                        note: 'อนุมัติสัดส่วนอัตโนมัติตามกฎ 7 วัน (BR-02)'
                    };

                    const { error: updateErr } = await supabase
                        .from('entries')
                        .update({ date_info: JSON.stringify(parsedDateInfo) })
                        .eq('id', entry.id);

                    if (!updateErr) {
                        updatedCount++;
                        console.log(`[Auto-Lock Cron] ✅ อัปเดตผลงาน ID ${entry.id} ("${entry.title}") เป็น AUTO_CONFIRMED เรียบร้อย`);
                    } else {
                        console.error(`[Auto-Lock Cron Error] ไม่สามารถอัปเดต ID ${entry.id}:`, updateErr.message);
                    }
                }
            }
        }

        console.log(`[Auto-Lock Cron] 🏁 ตรวจสอบเสร็จสิ้น: อัปเดตเป็น AUTO_CONFIRMED ทั้งหมด ${updatedCount} รายการ`);
        return { updatedCount };
    } catch (err) {
        console.error('[Auto-Lock Cron Exception]:', err.message);
        return { updatedCount: 0, error: err.message };
    }
}

function initScholarCron() {
    const isEnabled = (process.env.SCHOLAR_CRON_ENABLED ?? 'true').toLowerCase() === 'true';
    const schedule = process.env.SCHOLAR_CRON_SCHEDULE || '0 0 * * 0';

    cronStatus.enabled = isEnabled;
    cronStatus.schedule = schedule;

    // รัน Auto-Lock Job ทุกๆ 1 ชั่วโมง
    if (!autoLockTask) {
        autoLockTask = cron.schedule('0 * * * *', async () => {
            await checkAndAutoConfirmExpiredEntries();
        });
        // เรียกตรวจรอบแรกทันทีเมื่อเริ่มต้นระบบ
        checkAndAutoConfirmExpiredEntries().catch(e => console.error('[Initial Auto-Lock Check Error]:', e.message));
        console.log('[Cron Service] ระบบ 7-Day Auto-Lock Cron Job เริ่มต้นทำงานเรียบร้อย (ตรวจทุก 1 ชั่วโมง)');
    }

    if (!isEnabled) {
        console.log('[Cron Service] ระบบ Auto-fetch Cron Job ถูกปิดใช้งาน (SCHOLAR_CRON_ENABLED=false)');
        return;
    }

    if (!cron.validate(schedule)) {
        console.error(`[Cron Service Error] รูปแบบเวลา Cron ไม่ถูกต้อง: "${schedule}" กรุณาตรวจสอบใน .env`);
        return;
    }

    if (cronTask) {
        cronTask.stop();
    }

    console.log(`[Cron Service] เริ่มต้นระบบ Auto-fetch Cron Job เรียบร้อย (ตั้งเวลา: "${schedule}")`);

    cronTask = cron.schedule(schedule, async () => {
        if (cronStatus.isRunning) {
            console.log('[Cron Service] รอบการดึงข้อมูลก่อนหน้ายังทำงานไม่เสร็จ กำลังข้ามรอบนี้...');
            return;
        }

        console.log(`[Cron Service] เริ่มต้นรอบการดึงข้อมูล Google Scholar อัตโนมัติประจำรอบ (${new Date().toISOString()})...`);
        cronStatus.isRunning = true;
        cronStatus.lastRunAt = new Date().toISOString();

        try {
            const result = await syncAllUsersScholarData();
            cronStatus.lastResult = {
                success: true,
                createdCount: result.createdCount,
                linkedCount: result.linkedCount,
                errors: result.errors
            };
            console.log(`[Cron Service] อัปเดตข้อมูลอัตโนมัติสำเร็จ: สร้างใหม่ ${result.createdCount} รายการ, เชื่อมโยง Co-author ${result.linkedCount} รายการ`);
        } catch (err) {
            console.error('[Cron Service Error] เกิดข้อผิดพลาดระหว่างรัน Auto-fetch Cron:', err.message);
            cronStatus.lastResult = {
                success: false,
                error: err.message
            };
        } finally {
            cronStatus.isRunning = false;
        }
    });
}

function stopScholarCron() {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        cronStatus.enabled = false;
        console.log('[Cron Service] หยุดการทำงานของ Cron Job เรียบร้อย');
    }
    if (autoLockTask) {
        autoLockTask.stop();
        autoLockTask = null;
    }
}

function getCronStatus() {
    return { ...cronStatus };
}

module.exports = {
    initScholarCron,
    stopScholarCron,
    getCronStatus,
    checkAndAutoConfirmExpiredEntries
};

