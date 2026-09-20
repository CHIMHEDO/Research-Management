const fs = require('fs');
const content = fs.readFileSync('src/components/ScholarImportModal.jsx', 'utf8');

const newGoogleTab = `{/* ═══ GOOGLE SCHOLAR TAB ═══ */}
            {scopusTab === 'google' && (
              <>
                {/* ส่วนหัว: เลือกอาจารย์ และ ปุ่มซิงก์ข้อมูล */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>
                      อาจารย์ผู้จัดทำ:
                    </span>
                    <select
                      className="form-control"
                      style={{ 
                        fontSize: '13px', 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1',
                        width: '100%',
                        backgroundColor: '#fff',
                        outline: 'none'
                      }}
                      value={selectedUserId || ''}
                      onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name_th || u.name_en || u.full_name} ({u.department || 'ICT'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: syncing ? 'not-allowed' : 'pointer',
                      opacity: syncing ? 0.7 : 1,
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                    {syncing ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูล Scholar'}
                  </button>
                </div>

                {feedback.text && (
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      background: feedback.type === 'error' ? '#fef2f2' : feedback.type === 'info' ? '#f5f3ff' : '#f0fdf4',
                      color: feedback.type === 'error' ? '#b91c1c' : feedback.type === 'info' ? '#6d28d9' : '#15803d',
                      border: \`1px solid \${feedback.type === 'error' ? '#fecaca' : feedback.type === 'info' ? '#ddd6fe' : '#bbf7d0'}\`
                    }}
                  >
                    {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{feedback.text}</span>
                  </div>
                )}

                {/* Papers List */}
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: '#7c3aed' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>กำลังโหลดรายการผลงาน Google Scholar...</p>
                  </div>
                ) : filteredPapers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <GraduationCap size={40} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>
                      {searchQuery ? 'ไม่พบผลงานที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลผลงาน Google Scholar ของอาจารย์ท่านนี้'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      {searchQuery ? 'ลองพิมพ์ค้นหาด้วยคำอื่น' : 'สามารถกดปุ่ม "ซิงก์ข้อมูล Scholar" ด้านบนเพื่อดึงผลงานอัตโนมัติ'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '-4px' }}>
                      พบทั้งหมด {filteredPapers.length} รายการ (คลิก "นำไปคำนวณ" เพื่อกรอกข้อมูลลงฟอร์ม)
                    </div>
                    {filteredPapers.map((paper) => (
                      <div
                        key={paper.paper_id}
                        style={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#c084fc';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.08)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                            {paper.title}
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Users size={13} /> {paper.authors_raw}
                            </span>
                            {paper.cited_by > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#7c3aed', fontWeight: '600' }}>
                                <Award size={13} /> {paper.cited_by} citations
                              </span>
                            )}
                          </div>
                          {paper.journal && (
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <BookOpen size={12} color="#b45309" />
                              <span>{paper.journal} {paper.volume && \`Vol.\${paper.volume}\`}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleChoose(paper)}
                            disabled={fetchingDetail}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: fetchingDetail ? '#94a3f8' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: fetchingDetail ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 6px rgba(109, 40, 217, 0.3)',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                              opacity: fetchingDetail ? 0.7 : 1
                            }}
                            onMouseOver={(e) => { if (!fetchingDetail) e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                          >
                            {fetchingDetail ? (
                              <>
                                <RefreshCw size={15} className="spin" />
                                กำลังดึงข้อมูล...
                              </>
                            ) : (
                              <>
                                <Plus size={15} />
                                นำไปคำนวณ
                              </>
                            )}
                          </button>

                          {paper.scholar_url && (
                            <a
                              href={paper.scholar_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '11px', color: '#7c3aed', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <ExternalLink size={11} /> ดูใน Scholar
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
      )} `;

const content = fs.readFileSync('src/components/ScholarImportModal.jsx', 'utf8');
const startIndex = content.indexOf('{/* ═══ GOOGLE SCHOLAR TAB ═══ */}');
const endIndex = content.lastIndexOf('      )} ') + '      )} '.length;

const newContent = content.substring(0, startIndex) + newGoogleTab + content.substring(endIndex);
fs.writeFileSync('src/components/ScholarImportModal.jsx', newContent);
console.log('Google Scholar tab replaced successfully');