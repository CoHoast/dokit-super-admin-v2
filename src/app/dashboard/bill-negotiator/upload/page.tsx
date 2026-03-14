'use client';

import { useState } from 'react';
import { useTheme } from '../ThemeProvider';
import Link from 'next/link';

export default function UploadBillsPage() {
  const { isDark, colors } = useTheme();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: string; status: 'uploading' | 'processing' | 'complete' | 'error' }[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    // Simulate file upload
    const newFiles = [
      { name: 'medical_bill_march_2024.pdf', size: '2.4 MB', status: 'complete' as const },
      { name: 'lab_results_invoice.pdf', size: '1.1 MB', status: 'processing' as const },
    ];
    setFiles([...files, ...newFiles]);
  };

  const simulateUpload = () => {
    const newFile = { name: `bill_${Date.now()}.pdf`, size: '1.8 MB', status: 'uploading' as const };
    setFiles([...files, newFile]);
    
    setTimeout(() => {
      setFiles(prev => prev.map(f => f.name === newFile.name ? { ...f, status: 'processing' } : f));
    }, 1500);
    
    setTimeout(() => {
      setFiles(prev => prev.map(f => f.name === newFile.name ? { ...f, status: 'complete' } : f));
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return (
          <div style={{ width: '20px', height: '20px', border: `2px solid ${colors.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        );
      case 'processing':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'complete':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#4ade80' : '#16a34a'} strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
          Upload Bills
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Upload medical bills for processing and negotiation
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={simulateUpload}
        style={{
          backgroundColor: colors.surface,
          borderRadius: '16px',
          border: `2px dashed ${dragActive ? colors.accent : colors.border}`,
          padding: '60px 40px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '32px',
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          backgroundColor: isDark ? colors.accentLight : '#f1f5f9',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
          Drag & drop files here
        </p>
        <p style={{ color: colors.textMuted, marginBottom: '16px' }}>
          or click to browse
        </p>
        <p style={{ fontSize: '13px', color: colors.textMuted }}>
          Supports PDF, JPG, PNG • Max 25MB per file
        </p>
      </div>

      {/* Upload Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { icon: '📧', label: 'Email Forward', desc: 'Send bills to upload@sirkl.ai' },
          { icon: '📁', label: 'FTP Upload', desc: 'Bulk upload via secure FTP' },
          { icon: '🔗', label: 'Provider Portal', desc: 'Connect to provider systems' },
        ].map((option) => (
          <div key={option.label} style={{
            backgroundColor: colors.surface,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            padding: '20px',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: '24px', marginBottom: '12px', display: 'block' }}>{option.icon}</span>
            <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>{option.label}</p>
            <p style={{ fontSize: '13px', color: colors.textMuted }}>{option.desc}</p>
          </div>
        ))}
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Uploaded Files</h2>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>{files.length} files</span>
          </div>

          {files.map((file, i) => (
            <div
              key={file.name}
              style={{
                padding: '16px 20px',
                borderBottom: i < files.length - 1 ? `1px solid ${colors.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{file.name}</p>
                  <p style={{ fontSize: '13px', color: colors.textMuted }}>{file.size}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '13px',
                  color: file.status === 'complete' ? (isDark ? '#4ade80' : '#16a34a') : colors.textMuted,
                  textTransform: 'capitalize',
                }}>
                  {file.status}
                </span>
                {getStatusIcon(file.status)}
              </div>
            </div>
          ))}

          {files.some(f => f.status === 'complete') && (
            <div style={{
              padding: '16px 20px',
              backgroundColor: colors.bg,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button style={{
                padding: '10px 20px',
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}>
                Clear Completed
              </button>
              <Link href="/dashboard/bills" style={{
                padding: '10px 20px',
                background: colors.gradient,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
              }}>
                View Bills →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Uploads */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>
          Recent Uploads
        </h2>
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}>
          {[
            { name: 'batch_upload_mar10.zip', count: 12, date: 'Mar 10, 2024', status: 'Processed' },
            { name: 'cleveland_medical_bills.pdf', count: 1, date: 'Mar 9, 2024', status: 'Processed' },
            { name: 'march_statements.pdf', count: 3, date: 'Mar 8, 2024', status: 'Processed' },
          ].map((upload, i) => (
            <div
              key={upload.name}
              style={{
                padding: '16px 20px',
                borderBottom: i < 2 ? `1px solid ${colors.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#4ade80' : '#16a34a'} strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{upload.name}</p>
                  <p style={{ fontSize: '13px', color: colors.textMuted }}>{upload.count} bill{upload.count > 1 ? 's' : ''} • {upload.date}</p>
                </div>
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                color: isDark ? '#4ade80' : '#16a34a',
              }}>
                {upload.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
