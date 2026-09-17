const cron = require('node-cron');
const { syncAllUsersScholarData } = require('./scholarService');
require('dotenv').config();

let cronTask = null;
let cronStatus = {
    enabled: false,
    schedule: '0 0 * * 0',
    lastRunAt: null,
    lastResult: null,
    isRunning: false
};

function initScholarCron() {
    const isEnabled = (process.env.SCHOLAR_CRON_ENABLED ?? 'true').toLowerCase() === 'true';
    const schedule = process.env.SCHOLAR_CRON_SCHEDULE || '0 0 * * 0';

    cronStatus.enabled = isEnabled;
    cronStatus.schedule = schedule;

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
}

function getCronStatus() {
    return { ...cronStatus };
}

module.exports = {
    initScholarCron,
    stopScholarCron,
    getCronStatus
};
