const axios = require('axios');

const getPaperDetailsByEid = async (eid) => {
  try {
    const url = `https://api.elsevier.com/content/abstract/eid/${eid}`;
    const response = await axios.get(url, {
      headers: {
        'X-ELS-APIKey': process.env.SCOPUS_API_KEY,
        'Accept': 'application/json'
      }
    });
    const data = response.data['abstracts-retrieval-response'];
    const coredata = data.coredata || {};
    
    // 🌟 Fix 1: Authors - try full authors list first, fallback to dc:creator (first author only)
    let authorData = data.authors?.author || coredata['dc:creator']?.author;
    
    // Handle case where Scopus returns single object instead of array
    if (authorData && !Array.isArray(authorData)) {
      authorData = [authorData];
    }
    
    const authors = authorData?.map(a => {
      const firstName = a['ce:given-name'] || '';
      const lastName = a['ce:surname'] || '';
      return `${firstName} ${lastName}`.trim();
    }).filter(name => name.length > 0) || [];
    
    // 🌟 Fix 2: Abstract - try multiple fallback fields with graceful fallback
    const abstract = coredata['dc:description'] 
      || coredata['prism:description'] 
      || coredata['description'] 
      || '';
    
    // 🌟 Fix 3: Keywords - check multiple possible locations with graceful fallback
    const keywords = data.authkeywords?.['author-keyword']?.map(k => k.$) 
      || coredata['subject-area']?.map(sa => sa['$']) 
      || [];
    
    const paperInfo = {
      title: coredata['dc:title'],
      doi: coredata['prism:doi'] || '',
      journal: coredata['prism:publicationName'] || '',
      publishDate: coredata['prism:coverDate'] || '',
      volume: coredata['prism:volume'] || '',
      issue: coredata['prism:issueIdentifier'] || '',
      abstract: abstract || '',
      authors: authors,
      keywords: keywords
    };
    return paperInfo;
  } catch (error) {
    console.error('Scopus API Error:', error.response?.data || error.message);
    throw new Error('ไม่สามารถดึงข้อมูลจาก Scopus ได้');
  }
};

const searchAuthorByName = async (name) => {
  try {
    // 🌟 ดักจับ: ถ้าผู้ใช้พิมพ์ตัวเลขล้วน (Author ID) ให้ข้ามการยิง API ค้นหาชื่อไปเลย
    if (/^\d+$/.test(name.trim())) {
      return [{
        name: `เข้าถึงข้อมูลด้วย Author ID: ${name.trim()}`,
        authorId: name.trim(),
        affiliation: 'คลิกเพื่อดึงข้อมูลผลงาน (Bypass Search)'
      }];
    }

    // โค้ดเดิมสำหรับยิง API ค้นหาชื่อ
    const response = await axios.get('https://api.elsevier.com/content/search/author', {
      params: { 
        query: `authlast(${name}) OR authfirst(${name})`, 
        view: 'STANDARD'
      },
      headers: {
        'X-ELS-APIKey': process.env.SCOPUS_API_KEY,
        'Accept': 'application/json'
      }
    });

    const entries = response.data['search-results']?.entry || [];
    return entries.map(entry => {
      const givenName = entry['preferred-name']?.['ce:given-name'] || '';
      const surname = entry['preferred-name']?.['ce:surname'] || '';
      const fullName = (givenName || surname) ? `${givenName} ${surname}`.trim() : (entry['dc:title'] || 'Unknown Author');
      const rawId = entry['dc:identifier'] || '';
      const authorId = rawId.replace('AUTHOR_ID:', '');
      const affiliation = entry['affiliation-current']?.['affiliation-name'] || 'ไม่ระบุสังกัด';
      return { name: fullName, authorId, affiliation };
    });

  } catch (error) {
    console.error("Scopus Author Search Error:", error.response?.data || error.message);
    throw new Error('ไม่สามารถค้นหาอาจารย์จาก Scopus ได้ (อาจติดสิทธิ์ Subscription)');
  }
};

const getAuthorPapers = async (authorId) => {
  try {
    const response = await axios.get('https://api.elsevier.com/content/search/scopus', {
      params: { 
        query: `AU-ID(${authorId})`,
        view: 'STANDARD',
        count: 25
      },
      headers: {
        'X-ELS-APIKey': process.env.SCOPUS_API_KEY,
        'Accept': 'application/json'
      }
    });
    const entries = response.data['search-results']?.entry || [];
    return entries.map(entry => ({
      eid: entry['eid'],
      title: entry['dc:title'],
      year: entry['prism:coverDate'] ? entry['prism:coverDate'].substring(0, 4) : 'N/A',
      journal: entry['prism:publicationName'] || '',
      citedBy: entry['citedby-count'] || 0
    }));
  } catch (error) {
    console.error("Scopus Author Papers Error:", error.response?.data || error.message);
    throw new Error('ไม่สามารถดึงรายการเปเปอร์ของอาจารย์ได้');
  }
};

module.exports = {
  getPaperDetailsByEid,
  searchAuthorByName,
  getAuthorPapers
};
