import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  FileText
} from 'lucide-react';

export default function AcademicSyncLoadingModal({
  isOpen = false,
  source = 'scholar', // 'scholar' | 'scopus' | 'detail' | 'pdf'
  customTitle = ''
}) {
  const [progress, setProgress] = useState(15);

  const sourceConfig = {
    scholar: {
      primaryColor: '#7c3aed',
      secondaryColor: '#4f46e5',
      icon: GraduationCap,
      accentGlow: 'rgba(124, 58, 237, 0.25)'
    },
    scopus: {
      primaryColor: '#ea580c',
      secondaryColor: '#c2410c',
      icon: Sparkles,
      accentGlow: 'rgba(234, 88, 12, 0.25)'
    },
    detail: {
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      icon: BookOpen,
      accentGlow: 'rgba(37, 99, 235, 0.25)'
    },
    pdf: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      icon: FileText,
      accentGlow: 'rgba(5, 150, 105, 0.25)'
    }
  };

  const currentConfig = sourceConfig[source] || sourceConfig.scholar;
  const IconComponent = currentConfig.icon;

  useEffect(() => {
    if (!isOpen) {
      setProgress(15);
      return;
    }

    setProgress(20);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        if (prev < 50) return prev + Math.floor(Math.random() * 12 + 8);
        if (prev < 75) return prev + Math.floor(Math.random() * 8 + 5);
        return prev + Math.floor(Math.random() * 4 + 2);
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8), 0 0 40px ${currentConfig.accentGlow}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Shimmering Top Accent Bar */}
        <div
          style={{
            height: '5px',
            width: '100%',
            background: `linear-gradient(90deg, ${currentConfig.primaryColor} 0%, ${currentConfig.secondaryColor} 50%, #38bdf8 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmerBar 2s linear infinite'
          }}
        />

        <div style={{ padding: '36px 28px 32px 28px', textAlign: 'center' }}>
          {/* Animated Glowing Icon */}
          <div
            style={{
              position: 'relative',
              width: '76px',
              height: '76px',
              margin: '0 auto 18px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Outer Pulsing Wave Ring */}
            <div
              style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: `2px solid ${currentConfig.primaryColor}`,
                opacity: 0.35,
                animation: 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
              }}
            />
            {/* Inner Spinning Ring */}
            <div
              style={{
                position: 'absolute',
                inset: '0px',
                borderRadius: '50%',
                border: `3px dashed ${currentConfig.primaryColor}`,
                animation: 'spin 8s linear infinite',
                opacity: 0.65
              }}
            />
            {/* Icon Container */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${currentConfig.primaryColor} 0%, ${currentConfig.secondaryColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: `0 8px 24px ${currentConfig.accentGlow}`
              }}
            >
              <IconComponent size={30} />
            </div>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 16px 0',
              lineHeight: 1.3
            }}
          >
            {customTitle || (source === 'scopus' ? 'กำลังซิงค์ข้อมูลผู้ใช้' : 'กำลังดึงข้อมูล')}
          </h3>

          {/* Big Percentage Number */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: '900',
              color: currentConfig.primaryColor,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginBottom: '18px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {progress}%
          </div>

          {/* Smooth Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              backgroundColor: '#f1f5f9',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              padding: '2px'
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${currentConfig.primaryColor} 0%, ${currentConfig.secondaryColor} 100%)`,
                borderRadius: '999px',
                transition: 'width 0.35s ease-out',
                boxShadow: `0 0 12px ${currentConfig.accentGlow}`
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmerBar {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 0.15; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
