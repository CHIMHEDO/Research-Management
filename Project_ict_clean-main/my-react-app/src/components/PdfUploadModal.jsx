import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight,
  Brain,
  Database,
  Zap,
  Eye,
  Download
} from 'lucide-react';
import api from '../api/client';

const STEPS = [
  { id: 'upload', label: 'อัปโหลดไฟล์', icon: FileText },
  { id: 'grobid', label: 'GROBID สกัด XML', icon: Database },
  { id: 'gemini', label: 'Gemini AI วิเคราะห์', icon: Brain },
  { id: 'complete', label: 'เสร็จสิ้น', icon: CheckCircle2 }
];

export default function PdfUploadModal({ isOpen, onClose, onExtractComplete }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setMetadata(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        setError('กรุณาเลือกไฟล์ PDF เท่านั้น');
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('กรุณาเลือกไฟล์ PDF เท่านั้น');
        e.target.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleExtract = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์ PDF ก่อน');
      return;
    }

    setError(null);
    setStep('grobid');
    setProgress(10);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // Step 1: Upload & GROBID
      setProgress(30);
      const res = await api.post('/extract', formData, {
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 30) / progressEvent.total);
          setProgress(30 + percentCompleted);
        }
      });

      // Step 2: Gemini processing (already done in backend)
      setStep('gemini');
      setProgress(80);

      // Small delay to show Gemini step
      await new Promise(resolve => setTimeout(resolve, 500));

      const extracted = res.data.metadata || res.data;
      setMetadata(extracted);
      setStep('complete');
      setProgress(100);

      // Wait a bit then call completion callback
      setTimeout(() => {
        if (onExtractComplete) {
          onExtractComplete(extracted);
        }
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Extraction error:', err);
      setError(err.response?.data?.error || 'สกัดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setStep('upload');
      setProgress(0);
    }
  };

  const getStepIndex = (stepId) => STEPS.findIndex(s => s.id === stepId);
  const currentStepIndex = getStepIndex(step);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-container ${dragActive ? 'drag-active' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            <FileText size={20} /> สกัดข้อมูลจาก PDF ด้วย AI
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Progress Steps */}
          <div className="progress-steps">
            {STEPS.map((s, idx) => (
              <div key={s.id} className={`step ${idx < currentStepIndex ? 'completed' : idx === currentStepIndex ? 'active' : ''}`}>
                <div className="step-icon">
                  {idx < currentStepIndex ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
                </div>
                <span className="step-label">{s.label}</span>
                {idx < STEPS.length - 1 && (
                  <div className={`step-connector ${idx < currentStepIndex ? 'completed' : ''}`} />
                )}
              </div>
            ))}
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="upload-zone">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="file-input"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="upload-label">
                <div className="upload-icon">
                  <FileText size={48} color="#6C2BD9" />
                </div>
                <p className="upload-text">ลากไฟล์ PDF มาวางที่นี่</p>
                <p className="upload-subtext">หรือคลิกเพื่อเลือกไฟล์ (รองรับได้สูงสุด 50MB)</p>
                <button type="button" className="btn-browse" onClick={triggerFileSelect}>
                  เลือกไฟล์
                </button>
              </label>
              {file && (
                <div className="selected-file">
                  <FileText size={20} color="#6C2BD9" />
                  <span>{file.name}</span>
                  <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button type="button" className="btn-remove-file" onClick={() => setFile(null)}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <button 
                className={`btn-extract ${file ? '' : 'disabled'}`}
                onClick={handleExtract}
                disabled={!file}
              >
                <Zap size={18} /> เริ่มสกัดข้อมูล
              </button>
            </div>
          )}

          {step === 'grobid' && (
            <div className="processing-step">
              <div className="processing-animation">
                <Database size={48} color="#3B82F6" className="pulse" />
              </div>
              <h3>กำลังส่งไฟล์ให้ GROBID ประมวลผล...</h3>
              <p className="processing-desc">ระบบกำลังแปลง PDF เป็น XML TEI และสกัดข้อมูลเมตาพื้นฐาน</p>
            </div>
          )}

          {step === 'gemini' && (
            <div className="processing-step">
              <div className="processing-animation">
                <Brain size={48} color="#F59E0B" className="pulse" />
              </div>
              <h3>Gemini AI กำลังวิเคราะห์และขัดเกลาข้อมูล...</h3>
              <p className="processing-desc">ระบบกำลังตรวจสอบชื่อบทความ ผู้แต่ง DOI วารสาร และระบุบทบาทผู้แต่ง (First Author / Corresponding Author)</p>
            </div>
          )}

          {step === 'complete' && metadata && (
            <div className="result-preview">
              <div className="result-header">
                <CheckCircle2 size={24} color="#22C55E" />
                <h3>สกัดข้อมูลสำเร็จ!</h3>
              </div>
              <div className="metadata-preview">
                <div className="preview-field">
                  <label>ชื่อบทความ</label>
                  <span>{metadata.title || metadata.article_title || '-'}</span>
                </div>
                <div className="preview-field">
                  <label>ผู้แต่ง</label>
                  <span>
                    {(metadata.authors || []).map((a, i) => (
                      <span key={i} className="author-tag">
                        {a.name} {a.is_first_author && <span className="role-tag first">First</span>}
                        {a.is_corresponding && <span className="role-tag corresponding">Corr.</span>}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="preview-field">
                  <label>วารสาร</label>
                  <span>{metadata.journal || '-'}</span>
                </div>
                <div className="preview-field">
                  <label>ปีที่ตีพิมพ์</label>
                  <span>{metadata.publish_date || metadata.publication_date || '-'}</span>
                </div>
                <div className="preview-field">
                  <label>DOI</label>
                  <span>{metadata.doi || '-'}</span>
                </div>
                <div className="preview-field">
                  <label>Volume / Issue</label>
                  <span>{metadata.volume || '-'} / {metadata.issue || '-'}</span>
                </div>
                {metadata.abstract && (
                  <div className="preview-field full-width">
                    <label>บทคัดย่อ</label>
                    <span className="abstract-text">{metadata.abstract.substring(0, 200)}...</span>
                  </div>
                )}
                {metadata.keywords && (
                  <div className="preview-field full-width">
                    <label>คำสำคัญ</label>
                    <span>{metadata.keywords}</span>
                  </div>
                )}
              </div>
              <div className="result-actions">
                <button className="btn-view-full" onClick={() => alert(JSON.stringify(metadata, null, 2))}>
                  <Eye size={16} /> ดูข้อมูลทั้งหมด (JSON)
                </button>
                <button className="btn-download-json" onClick={() => downloadJSON(metadata)}>
                  <Download size={16} /> ดาวน์โหลด JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `extracted-metadata-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}