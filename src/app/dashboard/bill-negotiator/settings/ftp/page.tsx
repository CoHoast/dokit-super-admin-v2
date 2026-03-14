'use client';

import { useState } from 'react';
import { useTheme } from '../../ThemeProvider';

const ftpConnections = [
  { id: 1, name: 'Cleveland Medical FTP', host: 'ftp.clevelandmed.com', path: '/bills/outbound', status: 'connected', lastSync: '5 min ago', billsToday: 12 },
  { id: 2, name: 'Regional Hospital SFTP', host: 'sftp.regionalhospital.org', path: '/exports/claims', status: 'connected', lastSync: '15 min ago', billsToday: 8 },
  { id: 3, name: 'Metro Health Network', host: 'files.metrohealth.net', path: '/billing/new', status: 'error', lastSync: '2 hours ago', billsToday: 0 },
  { id: 4, name: 'Premier Imaging FTP', host: 'ftp.premierimaging.com', path: '/statements', status: 'connected', lastSync: '30 min ago', billsToday: 3 },
];

export default function ProviderFTPPage() {
  const { isDark, colors } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);

  const handleTestConnection = (id: number) => {
    setTestingConnection(id);
    setTimeout(() => setTestingConnection(null), 2000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Provider FTP
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Configure FTP/SFTP connections for automated bill retrieval
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
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
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Connection
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Active Connections', value: ftpConnections.filter(c => c.status === 'connected').length, color: isDark ? '#4ade80' : '#16a34a' },
          { label: 'Bills Today', value: ftpConnections.reduce((acc, c) => acc + c.billsToday, 0), color: colors.accent },
          { label: 'Errors', value: ftpConnections.filter(c => c.status === 'error').length, color: colors.danger },
          { label: 'Total Connections', value: ftpConnections.length, color: colors.textMuted },
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

      {/* Connections List */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>FTP Connections</h2>
        </div>

        {ftpConnections.map((conn, i) => (
          <div
            key={conn.id}
            style={{
              padding: '20px 24px',
              borderBottom: i < ftpConnections.length - 1 ? `1px solid ${colors.border}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: conn.status === 'connected' 
                  ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                  : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={conn.status === 'connected' ? (isDark ? '#4ade80' : '#16a34a') : colors.danger} strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>{conn.name}</p>
                <p style={{ fontSize: '13px', color: colors.textMuted }}>{conn.host}{conn.path}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: conn.status === 'connected' 
                      ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                      : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                    color: conn.status === 'connected' ? (isDark ? '#4ade80' : '#16a34a') : colors.danger,
                    textTransform: 'capitalize',
                  }}>
                    {conn.status}
                  </span>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>Last sync: {conn.lastSync}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>{conn.billsToday}</p>
                <p style={{ fontSize: '12px', color: colors.textMuted }}>bills today</p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleTestConnection(conn.id)}
                  disabled={testingConnection === conn.id}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    color: colors.text,
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    opacity: testingConnection === conn.id ? 0.7 : 1,
                  }}
                >
                  {testingConnection === conn.id ? 'Testing...' : 'Test'}
                </button>
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  color: colors.text,
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Settings */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
        marginTop: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
          Sync Schedule
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
              Check Frequency
            </label>
            <select style={{
              width: '100%',
              padding: '12px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: '14px',
            }}>
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
              <option>Every 4 hours</option>
              <option>Daily</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
              Retry on Failure
            </label>
            <select style={{
              width: '100%',
              padding: '12px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: '14px',
            }}>
              <option>3 attempts</option>
              <option>5 attempts</option>
              <option>10 attempts</option>
              <option>Unlimited</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
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
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Add FTP Connection</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Connection Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Main Hospital FTP"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Protocol
                  </label>
                  <select style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                  }}>
                    <option>SFTP</option>
                    <option>FTP</option>
                    <option>FTPS</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Port
                  </label>
                  <input
                    type="number"
                    defaultValue="22"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Host
                </label>
                <input
                  type="text"
                  placeholder="ftp.provider.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
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
                  Test & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
