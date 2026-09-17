const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_PRIMARY = "gemini-2.5-flash";
const MODEL_FALLBACK = "gemini-2.0-flash";

async function callModelWithFallback(prompt, responseSchema = null) {
    const models = [MODEL_PRIMARY, MODEL_FALLBACK];
    
    for (let i = 0; i < models.length; i++) {
        const modelName = models[i];
        try {
            const generationConfig = { 
                responseMimeType: "application/json" 
            };
            
            if (responseSchema) {
                generationConfig.responseSchema = responseSchema;
            }
            
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: generationConfig
            });
            
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            if (i > 0) {
                console.log(`[LLM Fallback] Using fallback model: ${modelName}`);
            }
            
            return responseText;
            
        } catch (error) {
            const isLastModel = i === models.length - 1;
            const isNotFound = error.message.includes('404') || error.message.includes('not found');
            
            console.warn(`[LLM Warning] Model "${modelName}" failed: ${error.message}`);
            
            if (isLastModel || !isNotFound) {
                throw error;
            }
        }
    }
}

async function refineMetadataWithLLM(xmlData, grobidData) {
    if (!xmlData || typeof xmlData !== 'string') {
        return grobidData;
    }

    // Define JSON Schema for Structured Output
    const responseSchema = {
        type: "OBJECT",
        properties: {
            article_title: { type: "STRING" },
            publish_date: { type: "STRING" },
            doi: { type: "STRING" },
            journal: { type: "STRING" },
            publication_level: { type: "STRING" },
            authors: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        affiliation: { type: "STRING" },
                        is_first_author: { type: "BOOLEAN" },
                        is_co_first_author: { type: "BOOLEAN" },
                        is_corresponding: { type: "BOOLEAN" },
                        is_co_corresponding: { type: "BOOLEAN" }
                    },
                    required: ["name", "affiliation", "is_first_author", "is_co_first_author", "is_corresponding", "is_co_corresponding"]
                }
            },
            volume: { type: "STRING" },
            issue: { type: "STRING" },
            pages: { type: "STRING" },
            keywords: { type: "STRING" },
            abstract: { type: "STRING" },
            study_design: { type: "STRING" },
            participants: {
                type: "OBJECT",
                properties: {
                    description: { type: "STRING" },
                    sample_size: { type: "STRING" }
                },
                required: ["description", "sample_size"]
            },
            author_contribution: { type: "STRING" }
        },
        required: ["article_title", "publish_date", "authors", "study_design", "participants"]
    };

    try {
        // ใช้ cleaned_xml ที่เล็กลงมาก (แค่ teiHeader) จึงไม่ต้อง truncate มาก
        const MAX_LENGTH = 8000;
        const textToSend = xmlData.length > MAX_LENGTH
            ? xmlData.substring(0, MAX_LENGTH) + '\n\n[...truncated...]'
            : xmlData;

        const prompt = `
คุณคือผู้เชี่ยวชาญด้านการสกัดข้อมูลจาก XML ของงานวิจัย (โดยเฉพาะสำนักพิมพ์ MDPI)
จงอ่านข้อมูล XML ด้านล่าง (เฉพาะ <teiHeader> ที่กรองสะอาดแล้ว) และสกัดข้อมูลออกมาให้ถูกต้องที่สุด โดยมีกฎเหล็กดังนี้:

1. "article_title": ชื่อบทความหลัก (Main Title) - ต้องหาเจอเด็ดขาด ห้ามตอบ null
   ลำดับความสำคัญในการค้นหา (Priority Order):
   1) MDPI: <title type="main"> ภายใน <titleStmt> ของ <fileDesc>
   2) TEI มาตรฐานทั่วไป: <title level="a"> ภายใน <analytic> ของ <biblStruct> ใน <sourceDesc>
   3) สำรอง: <title> แรกที่พบใน <titleStmt> ที่ไม่ใช่ subtitle/type="subtype"
   - ห้ามเอาคำว่า "Academic Editors" "Check for updates" "Received:" "Published:" "Published online:" มาตอบ

2. "authors": สกัดเฉพาะผู้เขียนบทความหลัก (Main Authors) จาก <analytic><author> เท่านั้น
    - **ห้ามนำ "Academic Editors" มาใส่เด็ดขาด**: Pedro A. Jiménez Gómez, Marina Robas Mora = Editors ไม่ใช่ Authors
    - **ห้ามนำ "Guest Editors", "Reviewers", "Editors" หรือบุคลากรที่ไม่ใช่ผู้เขียนบทความ มาใส่ในรายชื่อผู้แต่งเด็ดขาด**
    - **ต้องสกัดเฉพาะจาก <analytic><author> ที่อยู่ใน <biblStruct> ของ <sourceDesc> เท่านั้น** (ห้ามดึงจาก profileDesc, keywords, front matter, หรือ body text)
    - ต้องสกัดเฉพาะผู้แต่งที่อยู่ใน <analytic><author> และอยู่ใต้ชื่อเรื่องบทความเท่านั้น
    - ต้องเริ่มนับตั้งแต่ Pablo Pacheco เป็นคนแรก (ตัวอย่าง antibiotics-15-00822)
    - รวบรวมชื่อ-นามสกุลให้ครบถ้วนคนละคน (เช่น "Nguyen Thi Thanh Binh" ห้ามแยก)
    - ต้องครบทุกคน (ตัวอย่าง antibiotics-15-00822 มี 11 คน)

--- ตัวอย่างลบ (Negative Example): MDPI Layout Trap - Academic Editors ไม่ใช่ Authors ---

PDF หน้าแรก คอลัมน์ขวา (Right Column) แสดง:
Academic Editors: Jimmy T. Efird, Carey Mather

XML ใน <profileDesc><keywords scheme="MDPI"> มี:
<keywords scheme="MDPI">Academic Editors: Jimmy T. Efird, Carey Mather</keywords>

XML ใน <analytic><author> (ผู้แต่งจริง):
<author><persName><forename>Uratcha</forename><surname>Sadjapong</surname></persName>...</author>
<author><persName><forename>...</forename><surname>...</surname></persName>...</author>

❌ ผลลัพธ์ที่ผิด (AI ถูกหลอก layout):
{
  "authors": [
    { "name": "Jimmy T. Efird", ... },      ← Academic Editor (ผิด)
    { "name": "Carey Mather", ... },        ← Academic Editor (ผิด)
    { "name": "Uratcha Sadjapong", ... }    ← Author จริง (ถูก)
  ]
}

✅ ผลลัพธ์ที่ถูกต้อง (ข้าม Editors ไป เฉพาะ <analytic><author>):
{
  "authors": [
    { "name": "Uratcha Sadjapong", "is_first_author": true, ... },
    { "name": "Author 2 Name", "is_first_author": false, ... },
    ...
  ]
}

กฎเหล็ก: หากเจอคำว่า "Academic Editors", "Guest Editors", "Handling Editors", "Reviewers", "Editorial Board" ใน keywords/profileDesc/หน้าแรก PDF ให้ข้ามไปเลย - ไม่ใช่ผู้แต่งเด็ดขาด

3. "affiliation": 
   - **ต้องรวมข้อมูลจากทุกแท็กย่อย** ในบล็อก <affiliation> ให้ครบ: <orgName>, <address>, <settlement>, <postCode>, <country>, <addrLine>
   - นำมาต่อกันเป็นข้อความเดียว คั่นด้วย comma (,) 
   - ห้ามหยุดพิมพ์กลางคัน / ห้ามตัดทอนท้ายข้อความ (ต้องมีประเทศ, รหัสไปรษณีย์, เมือง)
   - ตัวอย่างที่ถูกต้อง: "Dirección General de Caza, Pesca, Acuicultura, Tauromaquia y Medio Natural Junta de Extremadura, 06800 Mérida, Spain"
   - ถ้ามีหลายสังกัด (คั่นด้วย ;) ให้รวมหมด

4. "publish_date": ค้นหาวันที่ตีพิมพ์ (รูปแบบ YYYY-MM-DD) จาก <publicationStmt><date when="...">
   - ถ้ามีแค่ปี ให้ใช้รูปแบบ YYYY

5. "author_contribution": ค้นหา CRediT statement หรือการมีส่วนร่วม หากไม่มีให้ตอบ null

6. "study_design": สกัดประเภทวิธีวิจัย (Study Design) ตามที่ปรากฏในเอกสาร
   - ตัวอย่าง: "Cross-sectional study", "Randomized controlled trial", "Cohort study", "Case-control study", "Systematic review", "Meta-analysis", "Qualitative study"
   - หากไม่พบข้อมูลชัดเจน ให้ใช้ ""

7. "participants": สกัดข้อมูลกลุ่มตัวอย่าง (Participants) จากส่วน Methods, Participants, Subjects หรือ Study Population
   - description: บรรยายกลุ่มตัวอย่าง (เช่น "Community-dwelling individuals aged 18 years or older", "Patients with type 2 diabetes aged 40-75 years")
   - sample_size: ขนาดตัวอย่างตามที่รายงานในเอกสาร (เช่น "327", "N=327", "150 per group", "30 mice")
   - หากไม่พบข้อมูล ให้ใช้ ""

--- ตัวอย่างที่ 1: MDPI Standard (1 Author) ---

ตัวอย่าง XML:
<teiHeader>
  <fileDesc>
    <titleStmt>
      <title type="main">Ethics Before Algorithms: A Framework for AI-Driven Corporate Transparency</title>
      <title type="subtype">Article</title>
    </titleStmt>
    <sourceDesc>
      <biblStruct>
        <analytic>
          <title level="a">Ethics Before Algorithms: A Framework for AI-Driven Corporate Transparency</title>
        </analytic>
      </biblStruct>
    </sourceDesc>
  </fileDesc>
  <profileDesc>
    <textClass>
      <keywords scheme="MDPI">Academic Editors: Won Sang Lee, Yonghan Ju</keywords>
    </textClass>
  </profileDesc>
</teiHeader>
<author>
  <persName>
    <forename>Nguyen Thi</forename>
    <surname>Thanh Binh</surname>
  </persName>
  <affiliation>
    <orgName>Department of Accounting, Chaoyang University of Technology</orgName>
  </affiliation>
</author>

ผลลัพธ์ที่ถูกต้อง:
{
  "article_title": "Ethics Before Algorithms: A Framework for AI-Driven Corporate Transparency",
  "publish_date": "2026-08-24",
  "authors": [
    { "name": "Nguyen Thi Thanh Binh", "affiliation": "Department of Accounting, Chaoyang University of Technology", "is_first_author": true, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false }
  ],
  "study_design": "",
  "participants": { "description": "", "sample_size": "" },
  "author_contribution": null
}

--- ตัวอย่างที่ 2: MDPI Multiple Authors (11 Authors) with Academic Editors ---

ตัวอย่าง XML (ส่วน analytic):
<analytic>
  <author>
    <persName><forename>Pablo</forename><surname>Pacheco</surname></persName>
    <affiliation><orgName>Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura</orgName><address><postCode>10003</postCode><settlement>Caceres</settlement><country>Spain</country></address></affiliation>
  </author>
  <author>
    <persName><forename>Lucía</forename><surname>Sánchez</surname></persName>
    <affiliation><orgName>Innovación en Gestión y Conservación de Ingulados S.L.</orgName><address><postCode>10004</postCode><settlement>Caceres</settlement><country>Spain</country></address></affiliation>
  </author>
  <author>
    <persName><forename>José Luis</forename><surname>Píriz</surname></persName>
    <affiliation><orgName>Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura</orgName><address><postCode>10003</postCode><settlement>Caceres</settlement><country>Spain</country></address>; <orgName>Universidad Internacional de Valencia (VIU)</orgName><address><postCode>46002</postCode><settlement>Valencia</settlement><country>Spain</country></address></affiliation>
  </author>
  <!-- ... 8 more authors ... -->
  <author>
    <persName><forename>Alejandro</forename><surname>Gallardo-Soler</surname></persName>
    <affiliation><orgName>Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura</orgName><address><postCode>10003</postCode><settlement>Caceres</settlement><country>Spain</country></address></affiliation>
  </author>
</analytic>
<!-- Academic Editors อยู่ใน profileDesc/keywords (ต้องตัดทิ้ง) -->
<profileDesc>
  <textClass>
    <keywords scheme="MDPI">Academic Editors: Pedro A. Jiménez Gómez, Marina Robas Mora</keywords>
  </textClass>
</profileDesc>

ผลลัพธ์ที่ถูกต้อง:
{
  "article_title": "Identification of mcr-13 in the Endangered Lynx pardinus, and mcr-1 in Sus scrofa, Expands the Diversity of Plasmid-Mediated Colistin Resistance Determinants of Escherichia coli from Wildlife",
  "publish_date": "2026-08-24",
  "authors": [
    { "name": "Pablo Pacheco", "affiliation": "Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura, 10003 Caceres, Spain", "is_first_author": true, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "Lucía Sánchez", "affiliation": "Innovación en Gestión y Conservación de Ingulados S.L., 10004 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "José Luis Píriz", "affiliation": "Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura, 10003 Caceres, Spain; Universidad Internacional de Valencia (VIU), 46002 Valencia, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "María Gil-Molino", "affiliation": "Unidad de Patología Infecciosa, Departamento de Sanidad Animal, Hospital Clínico Veterinario, Universidad de Extremadura, 10003 Caceres, Spain; Instituto de Biotecnología Ganadera y Cinegética (INBIO G+C), Universidad de Extremadura, 10003 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "Joaquín Rey", "affiliation": "Unidad de Patología Infecciosa, Departamento de Sanidad Animal, Hospital Clínico Veterinario, Universidad de Extremadura, 10003 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "Pedro Fernández-Llario", "affiliation": "Innovación en Gestión y Conservación de Ingulados S.L., 10004 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "María Jesús Palacios", "affiliation": "Dirección General de Caza, Pesca, Acuicultura, Tauromaquia y Medio Natural Junta de Extremadura, 06800 Mérida, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "Jorge Peña", "affiliation": "Dirección General de Caza, Pesca, Acuicultura, Tauromaquia y Medio Natural Junta de Extremadura, 06800 Mérida, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "María Isabel Igeño", "affiliation": "Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura, 10003 Caceres, Spain; Instituto de Productos Cárnicos (IPROCAR), Universidad de Extremadura, 10003 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "Alberto Quesada", "affiliation": "Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura, 10003 Caceres, Spain; Instituto de Biotecnología Ganadera y Cinegética (INBIO G+C), Universidad de Extremadura, 10003 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false },
    { "name": "Alejandro Gallardo-Soler", "affiliation": "Departamento de Bioquímica y Biología Molecular y Genética, Facultad de Veterinaria, Universidad de Extremadura, 10003 Caceres, Spain", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false }
  ],
  "study_design": "",
  "participants": { "description": "", "sample_size": "" },
  "author_contribution": null
}

--- จบตัวอย่าง ---

ข้อมูล TEI-XML (Cleaned):
${textToSend}

จงคืนค่าคำตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
    "article_title": "ชื่อบทความ",
    "publish_date": "YYYY-MM-DD หรือ null",
    "doi": "",
    "journal": "",
    "publication_level": "",
    "authors": [
        { "name": "ชื่อ-นามสกุล", "affiliation": "สังกัด", "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false }
    ],
    "volume": "",
    "issue": "",
    "pages": "",
    "keywords": "",
    "abstract": "",
    "study_design": "",
    "participants": { "description": "", "sample_size": "" },
    "author_contribution": "ข้อความ หรือ null"
}
        `;

        const responseText = await callModelWithFallback(prompt, responseSchema);
        
        console.log('\n[LLM Raw Response]:', responseText, '\n');
        
        return JSON.parse(responseText);

    } catch (error) {
        console.error('[LLM Error]: เกิดข้อผิดพลาดในการดึงข้อมูลจาก Gemini', error.message);
        return grobidData;
    }
}

/**
 * STAGE 2: Author Role Identification
 * Analyzes full TEI XML (teiHeader + body + back) to identify author roles:
 * - First Author (first in list, unless equal contribution noted)
 * - Co-first Author (equal contribution markers)
 * - Corresponding Author (*, †, ✉, "corresponding author" text)
 * - Co-corresponding Author (multiple corresponding authors)
 * - Author Order (position in author list)
 */
async function identifyAuthorRoles(xmlData, grobidAuthors) {
    if (!xmlData || typeof xmlData !== 'string') {
        console.warn('[Author Roles] No XML data provided, using position-based fallback');
        return applyPositionBasedRoles(grobidAuthors);
    }

    if (!grobidAuthors || !Array.isArray(grobidAuthors) || grobidAuthors.length === 0) {
        console.warn('[Author Roles] No authors provided');
        return [];
    }

    try {
        // Use larger context for full XML (body + back sections can be large)
        const MAX_LENGTH = 15000;
        const textToSend = xmlData.length > MAX_LENGTH 
            ? xmlData.substring(0, MAX_LENGTH) + '\n\n[...truncated...]'
            : xmlData;

        // Prepare author list for reference
        const authorListForPrompt = grobidAuthors.map((a, i) => 
            `${i + 1}. ${a.name} (Affiliation: ${a.affiliation || 'N/A'})${a._grobid_role_hints ? ` [GROBID hints: ${JSON.stringify(a._grobid_role_hints)}]` : ''}`
        ).join('\n');

        const prompt = `
คุณคือนักวิเคราะห์งานวิจัยเชี่ยวชาญด้านการระบุบทบาทผู้แต่ง (Author Role Identification)
จงอ่าน TEI-XML 全文 (รวม <teiHeader>, <text><body>, และ <text><back>) และระบุบทบาทของผู้แต่งแต่ละคน

ผู้แต่งจาก GROBID (เรียงตามลำดับในบทความ):
${authorListForPrompt}

กฎการระบุบทบาท (เข้มงวด - ต้องปฏิบัติตามทุกข้อ):

1. FIRST AUTHOR (ผู้แต่งคนแรก):
   - คนที่ 1 ในรายชื่อ = First Author เสมอ
   - เว้นแต่พบข้อความชี้ให้เห็นว่าเป็น "equal contribution", "co-first author", "contributed equally", "joint first authors", "these authors contributed equally" ใกล้เคียงชื่อคนที่ 2+ -> บุคคลเหล่านั้นเป็น Co-first Author (is_co_first_author: true)
   - หากมี Co-first Author หลายคน ให้ตั้งค่า is_first_author: true ให้คนที่ 1 และ is_co_first_author: true ให้คนอื่นที่เกี่ยวข้อง

2. CORRESPONDING AUTHOR (ผู้รับผิดชอบการติดต่อ): ให้ตรวจสอบอย่างละเอียด หากเข้าเงื่อนไขใดเงื่อนไขหนึ่งต่อไปนี้ ให้ตั้งค่า is_corresponding: true
   - มีเครื่องหมาย * (asterisk) หรือ ✉ (envelope) อยู่ติดกับชื่อ/หมายเลขสังกัดของผู้แต่ง
   - มีข้อความระบุชัดเจน เช่น "Correspondence:", "Corresponding author:", หรืออีเมล (เช่น "Correspondence: sakesun.th@up.ac.th") ให้นำอีเมลนั้นไปเทียบกับชื่อผู้แต่ง หากตรงกับใครให้คนนั้นเป็น Corresponding Author
   - ใน XML: <persName corresp="yes"> หรือ author[@corresp="yes"] หรือ footnote ใน <back> ที่มี * / ✉ / †
   - อาจมีมากกว่า 1 คน (Co-corresponding Authors)
   - ⚠️ สำคัญ: เครื่องหมาย * หลังชื่อหมายถึง Corresponding Author (ผู้ประสานงาน) ไม่ใช่ First Author และไม่เกี่ยวกับลำดับผู้แต่ง

3. CO-FIRST AUTHOR (ผู้แต่งคนแรกร่วม):
   - พบข้อความ: "These authors contributed equally", "Joint first authors", "Equal contribution", "Contributed equally", "Co-first author", "Shared first authorship" 
   - ระบุชื่อผู้แต่งที่เกี่ยวข้อง (มักเป็นคนที่ 1 และคนที่ 2, หรือคนที่ระบุใน footnote)

4. CO-CORRESPONDING AUTHOR (ผู้รับผิดชอบการติดต่อร่วม):
   - เมื่อมี Corresponding Author มากกว่า 1 คน
   - หรือพบข้อความ "Co-corresponding authors:", "Corresponding authors: A and B", "Both authors contributed equally as corresponding authors"
   - ทุกคนที่ถูกระบุว่าเป็น corresponding author ในกรณีที่มีมากกว่า 1 คน -> is_co_corresponding: true

5. AUTHOR ORDER:
   - บันทึกลำดับที่ปรากฏในบทความ (1, 2, 3, ...) ตามลำดับใน GROBID authors list

หลักฐานที่ต้องหาใน XML:
- <text><body>: author names with superscript symbols (*, †, ✉) ใน running text
- <text><back><div type="footnotes">: footnotes with markers mapping to author names
- <teiHeader> author[@corresp="yes"] attributes
- CRediT / Author Contribution statements in <back>

คืนค่า JSON เท่านั้น ตามโครงสร้างนี้ (ห้ามมีข้อความเพิ่มเติม):
{
  "authors": [
    {
      "name": "ชื่อ-นามสกุล",
      "author_order": 1,
      "is_first_author": true/false,
      "is_co_first_author": true/false,
      "is_corresponding": true/false,
      "is_co_corresponding": true/false,
      "affiliation": "สังกัด"
    }
  ],
  "extraction_notes": "บันทึกหลักฐานที่พบ (เช่น พบ * ใกล้ชื่อ Maria, ข้อความ equal contribution ระหว่างคนที่ 1-2, พบ ✉ ใน footnote marker 1)"
}

--- ตัวอย่างที่ 1: Standard Single Corresponding Author ---
ผู้แต่ง: John A. Smith (คนที่ 1), Maria B. Lee (คนที่ 2), David C. Wong (คนที่ 3)
XML มี: <persName corresp="yes">Maria B. Lee</persName> และ footnote * "Corresponding author: Maria B. Lee"
ผลลัพธ์:
{
  "authors": [
    {"name": "John A. Smith", "author_order": 1, "is_first_author": true, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."},
    {"name": "Maria B. Lee", "author_order": 2, "is_first_author": false, "is_co_first_author": false, "is_corresponding": true, "is_co_corresponding": false, "affiliation": "..."},
    {"name": "David C. Wong", "author_order": 3, "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."}
  ],
  "extraction_notes": "พบ corresp=\"yes\" และ footnote * ระบุ Corresponding author: Maria B. Lee"
}

--- ตัวอย่างที่ 2: Co-first Authors (Equal Contribution) ---
ผู้แต่ง: John A. Smith (คนที่ 1), Maria B. Lee (คนที่ 2), David C. Wong (คนที่ 3)
XML มี: footnote * "These authors contributed equally" ใกล้ชื่อ John และ Maria, และ footnote ✉ "Corresponding author: David C. Wong"
ผลลัพธ์:
{
  "authors": [
    {"name": "John A. Smith", "author_order": 1, "is_first_author": true, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."},
    {"name": "Maria B. Lee", "author_order": 2, "is_first_author": false, "is_co_first_author": true, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."},
    {"name": "David C. Wong", "author_order": 3, "is_first_author": false, "is_co_first_author": false, "is_corresponding": true, "is_co_corresponding": false, "affiliation": "..."}
  ],
  "extraction_notes": "พบข้อความ 'These authors contributed equally' ใน footnote * ระหว่างคนที่ 1-2 (Co-first authors). พบ ✉ ใกล้ชื่อ David C. Wong (Corresponding author)"
}

--- ตัวอย่างที่ 3: Co-corresponding Authors ---
ผู้แต่ง: John A. Smith (คนที่ 1), Maria B. Lee (คนที่ 2), David C. Wong (คนที่ 3)
XML มี: <persName corresp="yes">John A. Smith</persName>, <persName corresp="yes">Maria B. Lee</persName>, footnote * "Corresponding authors: John A. Smith and Maria B. Lee"
ผลลัพธ์:
{
  "authors": [
    {"name": "John A. Smith", "author_order": 1, "is_first_author": true, "is_co_first_author": false, "is_corresponding": true, "is_co_corresponding": true, "affiliation": "..."},
    {"name": "Maria B. Lee", "author_order": 2, "is_first_author": false, "is_co_first_author": false, "is_corresponding": true, "is_co_corresponding": true, "affiliation": "..."},
    {"name": "David C. Wong", "author_order": 3, "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."}
  ],
  "extraction_notes": "พบ corresp=\"yes\" บนคนที่ 1 และคนที่ 2, footnote * ระบุ 'Corresponding authors: John A. Smith and Maria B. Lee' -> Co-corresponding authors"
}

--- ตัวอย่างที่ 4: No Symbols (Fallback to Position) ---
ผู้แต่ง: John A. Smith, Maria B. Lee, David C. Wong
XML ไม่มีสัญลักษณ์หรือข้อความพิเศษใดๆ
ผลลัพธ์:
{
  "authors": [
    {"name": "John A. Smith", "author_order": 1, "is_first_author": true, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."},
    {"name": "Maria B. Lee", "author_order": 2, "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."},
    {"name": "David C. Wong", "author_order": 3, "is_first_author": false, "is_co_first_author": false, "is_corresponding": false, "is_co_corresponding": false, "affiliation": "..."}
  ],
  "extraction_notes": "ไม่พบสัญลักษณ์หรือข้อความระบุบทบาท ใช้ position-based fallback"
}

--- ตัวอย่างลบ (Negative Example): เครื่องหมาย * ไม่ใช่ First Author Marker ---

สถานการณ์: บทความ MDPI มีผู้แต่ง 4 คน พร้อมหมายเลข Affiliation และเครื่องหมาย *
XML ใน <text><body>:
<p>Uratcha Sadjapong<sup>1</sup>, Nattapon Harnsamut<sup>2</sup>, Patipat Vongruang<sup>3</sup>, Sakesun Thongtip<sup>4*</sup></p>

XML ใน <text><back><div type="footnotes">:
<fn><label>*</label><p>Correspondence: sakesun.th@up.ac.th</p></fn>
<fn><label>1</label><p>Department of X, University A</p></fn>
<fn><label>2</label><p>Department of Y, University B</p></fn>
<fn><label>3</label><p>Department of Z, University C</p></fn>
<fn><label>4</label><p>Department of W, University D</p></fn>

❌ ผลลัพธ์ที่ผิด (AI ผูก * กับ First Author):
{
  "authors": [
    {"name": "Uratcha Sadjapong", "author_order": 1, "is_first_author": true, "is_corresponding": false, ...},
    {"name": "Nattapon Harnsamut", "author_order": 2, "is_first_author": false, "is_corresponding": false, ...},
    {"name": "Patipat Vongruang", "author_order": 3, "is_first_author": false, "is_corresponding": false, ...},
    {"name": "Sakesun Thongtip", "author_order": 4, "is_first_author": false, "is_corresponding": false, ...}
  ]
}

✅ ผลลัพธ์ที่ถูกต้อง (อ่าน footnote * → Correspondence email → match กับ Sakesun):
(หมายเหตุ: ลำดับ author_order ยังคงเรียงตามเดิม ห้ามสลับตำแหน่ง)
{
  "authors": [
    {"name": "Uratcha Sadjapong", "author_order": 1, "is_first_author": true, "is_corresponding": false, ...},
    {"name": "Nattapon Harnsamut", "author_order": 2, "is_first_author": false, "is_corresponding": false, ...},
    {"name": "Patipat Vongruang", "author_order": 3, "is_first_author": false, "is_corresponding": false, ...},
    {"name": "Sakesun Thongtip", "author_order": 4, "is_first_author": false, "is_corresponding": true, ...}
  ]
}

กฎเหล็ก: เครื่องหมาย * / ✉ / † ในชื่อผู้แต่ง = Corresponding Author เท่านั้น ไม่ได้หมายถึง First Author, Equal Contribution, หรือ Affiliation marker

--- จบตัวอย่าง ---

ข้อมูล TEI-XML (Cleaned, รวม body และ back):
${textToSend}

จงคืนค่าคำตอบเป็น JSON เท่านั้น ตามโครงสร้างข้างต้น ห้ามมีข้อความเพิ่มเติม markdown หรือ explanation
        `;

        const responseText = await callModelWithFallback(prompt);
        
        console.log('\n[Author Roles Raw Response]:', responseText, '\n');
        
        const result = JSON.parse(responseText);
        
        // Validate and merge with grobid authors to preserve affiliation
        return mergeAndValidateRoles(result.authors, grobidAuthors);

    } catch (error) {
        console.error('[Author Roles Error]:', error.message);
        // Fallback to position-based roles
        return applyPositionBasedRoles(grobidAuthors);
    }
}

/**
 * Fallback: Apply position-based roles when AI extraction fails
 */
function applyPositionBasedRoles(grobidAuthors) {
    return grobidAuthors.map((author, index) => ({
        name: author.name,
        author_order: index + 1,
        is_first_author: index === 0,
        is_co_first_author: false,
        is_corresponding: false,
        is_co_corresponding: false,
        affiliation: author.affiliation || ''
    }));
}

/**
 * Merge AI results with GROBID data to preserve affiliations and handle name matching
 */
function mergeAndValidateRoles(aiAuthors, grobidAuthors) {
    if (!aiAuthors || !Array.isArray(aiAuthors)) {
        console.warn('[Author Roles] Invalid AI response, using fallback');
        return applyPositionBasedRoles(grobidAuthors);
    }

    const merged = aiAuthors.map((aiAuthor, index) => {
        // Try to match with grobid author by name (fuzzy match)
        const grobidMatch = grobidAuthors.find(g => 
            namesMatch(g.name, aiAuthor.name)
        );
        
        return {
            name: aiAuthor.name || (grobidMatch?.name || `Author ${index + 1}`),
            author_order: aiAuthor.author_order ?? (index + 1),
            is_first_author: !!aiAuthor.is_first_author,
            is_co_first_author: !!aiAuthor.is_co_first_author,
            is_corresponding: !!aiAuthor.is_corresponding,
            is_co_corresponding: !!aiAuthor.is_co_corresponding,
            affiliation: aiAuthor.affiliation || grobidMatch?.affiliation || ''
        };
    });

    // Ensure author_order is sequential
    merged.sort((a, b) => a.author_order - b.author_order);
    merged.forEach((a, i) => { a.author_order = i + 1; });

    return merged;
}

/**
 * Simple name matching (case-insensitive, handles initials)
 */
function namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = name1.toLowerCase().replace(/[.\s]+/g, ' ');
    const n2 = name2.toLowerCase().replace(/[.\s]+/g, ' ');
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

module.exports = {
    refineMetadataWithLLM,
    identifyAuthorRoles
};