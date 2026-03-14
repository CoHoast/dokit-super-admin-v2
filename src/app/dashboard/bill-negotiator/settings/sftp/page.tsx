'use client';

import { useState } from 'react';
import { useTheme } from '../../ThemeProvider';

const sftpLogs = [
  { id: 1, timestamp: '2024-03-12 14:32:05', type: 'upload', file: 'settlement_batch_1234.csv', status: 'success', size: '245 KB', records: 24 },
  { id: 2, timestamp: '2024-03-12 14:30:12', type: 'upload', file: 'claims_export_20240312.xml', status: 'success', size: '1.2 MB', records: 156 },
  { id: 3, timestamp: '2024-03-12 12:15:33', type: 'download', file: 'era_response_batch_89.csv', status: 'success', size: '89 KB', records: 12 },
  { id: 4, timestamp: '2024-03-12 10:45:01', type: 'upload', file: 'negotiation_offers_0312.pdf', status: 'failed', size: '2.1 MB', records: 45, error: 'Connection timeout' },
  { id: 5, timestamp: '2024-03-12 08:00:00', type: 'upload', file: 'daily_batch_20240312.csv', status: 'success', size: '456 KB', records: 67 },
  { id: 6, timestamp: '2024-03-11 16:45:22', type: 'download', file: 'provider_response_445.csv', status: 'success', size: '34 KB', records: 8 },
  { id: 7, timestamp: '2024-03-11 14:30:00', type: 'upload', file: 'settlement_batch_1233.csv', status: 'success', size: '189 KB', records: 19 },
  { id: 8, timestamp: '2024-03-11 12:00:05', type: 'upload', file: 'claims_export_20240311.xml', status: 'success', size: '980 KB', records: 134 },
];

export default function MCOSFTPLogPage() {
  const { isDark, colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'upload' | 'download'>('all');
  const [selectedLog, setSelectedLog] = useState<typeof sftpLogs[0] | null>(null);

  const filteredLogs = filter === 'all' ? sftpLogs : sftpLogs.filter(l => l.type === filter);

  const stats = {
    today: sftpLogs.filter(l => l.timestamp.startsWith('2024-03-12')).length,
    success: sftpLogs.filter(l => l.status === 'success').length,
    failed: sftpLogs.filter(l => l.status === 'failed').length,
    totalRecords: sftpLogs.reduce((acc, l) => acc + l.records, 0),
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            MCO SFTP Log
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Monitor file transfers with the MCO system
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Refresh
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: colors.gradient,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Logs
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Transfers Today', value: stats.today, color: colors.text },
          { label: 'Successful', value: stats.success, color: isDark ? '#4ade80' : '#16a34a' },
          { label: 'Failed', value: stats.failed, color: colors.danger },
          { label: 'Records Synced', value: stats.totalRecords, color: colors.accent },
        ].map((stat) => (
          <div key={stat.label} style={{
            backgroundColor: colors.surface,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            padding: '20px',
          }}>
            <p style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>{stat.value}</p>
            <p style={{ fontSize: '14px', color: colors.textMuted }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Connection Status */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#4ade80' : '#16a34a'} strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>MCO SFTP Connection</p>
            <p style={{ fontSize: '14px', color: colors.textMuted }}>sftp.mco-system.com:22 • Connected</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>Last sync: 2 minutes ago</span>
          <span style={{
            padding: '6px 14px',
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '500',
            color: isDark ? '#4ade80' : '#16a34a',
          }}>
            Online
          </span>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        {/* Filters */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Transfer Log</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'upload', 'download'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: filter === f ? colors.accent : 'transparent',
                  color: filter === f ? '#fff' : colors.textMuted,
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 100px 100px 100px 100px',
          padding: '12px 20px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
        }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Timestamp</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>File</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Type</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Size</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Records</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Status</span>
        </div>

        {/* Table Body */}
        {filteredLogs.map((log, i) => (
          <div
            key={log.id}
            onClick={() => setSelectedLog(log)}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 100px 100px 100px 100px',
              padding: '14px 20px',
              borderBottom: i < filteredLogs.length - 1 ? `1px solid ${colors.border}` : 'none',
              cursor: 'pointer',
              alignItems: 'center',
            }}
          >
            <p style={{ fontSize: '13px', color: colors.textMuted, fontFamily: 'monospace' }}>
              {log.timestamp}
            </p>
            <p style={{ fontSize: '14px', color: colors.text, fontWeight: '500' }}>
              {log.file}
            </p>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: colors.textMuted,
            }}>
              {log.type === 'upload' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 11 12 6 7 11" />
                  <line x1="12" y1="6" x2="12" y2="18" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="7 13 12 18 17 13" />
                  <line x1="12" y1="18" x2="12" y2="6" />
                </svg>
              )}
              {log.type}
            </span>
            <p style={{ fontSize: '13px', color: colors.textMuted }}>{log.size}</p>
            <p style={{ fontSize: '13px', color: colors.text }}>{log.records}</p>
            <span style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: '500',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: log.status === 'success' 
                ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
              color: log.status === 'success' 
                ? (isDark ? '#4ade80' : '#16a34a')
                : colors.danger,
              textTransform: 'capitalize',
            }}>
              {log.status}
            </span>
          </div>
        ))}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Transfer Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '8px',
                  backgroundColor: colors.bg,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: colors.textMuted,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: selectedLog.status === 'success' 
                    ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                    : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                  color: selectedLog.status === 'success' 
                    ? (isDark ? '#4ade80' : '#16a34a')
                    : colors.danger,
                  textTransform: 'capitalize',
                }}>
                  {selectedLog.status}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>File Name</p>
                  <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text, fontFamily: 'monospace' }}>{selectedLog.file}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Timestamp</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>{selectedLog.timestamp}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Type</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text, textTransform: 'capitalize' }}>{selectedLog.type}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>File Size</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>{selectedLog.size}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Records</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>{selectedLog.records}</p>
                  </div>
                </div>

                {selectedLog.error && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca'}`,
                  }}>
                    <p style={{ fontSize: '13px', color: colors.danger, marginBottom: '4px' }}>Error</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: colors.danger }}>{selectedLog.error}</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {selectedLog.status === 'failed' && (
                  <button style={{
                    flex: 1,
                    padding: '12px',
                    background: colors.gradient,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}>
                    Retry Transfer
                  </button>
                )}
                <button style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  fontWeight: '500',
                  cursor: 'pointer',
                }}>
                  Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
