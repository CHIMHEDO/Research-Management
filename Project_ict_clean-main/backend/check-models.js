require('dotenv').config();

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.log("❌ ไม่พบ GEMINI_API_KEY ในไฟล์ .env");

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.models) {
            console.log("✅ รายชื่อโมเดลที่คุณนำไปตั้งค่าได้:");
            data.models.forEach(m => {
                if(m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("❌ พบข้อผิดพลาดจาก Google:", data);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}
checkModels();