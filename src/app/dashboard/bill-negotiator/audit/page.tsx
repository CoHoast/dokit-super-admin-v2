'use client';

// Phase 2E: Audit Log Page

import { useState, useEffect } from 'react';
import { useClient } from '@/context/ClientContext';
import Link from 'next/link';

interface AuditEntry {
  id: number;
  timestamp: string;
  event_type: string;
  entity_type: string;
  entity_id: number;
  action: string;
  user_name?: string;
  details: Record<string, any>;
}

export default function AuditLogPage() {
  const { selectedClient } = useClient();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const limit = 25;

  useEffect(() => {
    if (selectedClient) {
      fetchAuditLog();
    }
  }, [selectedClient, page, filter]);

  const fetchAuditLog = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      let url = `/api/reports/audit?clientId=${selectedClient.id}&limit=${limit}&offset=${page * limit}`;
      if (filter !== 'all') {
        url += `&entityType=${filter}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      'bill.created': '📄',
      'bill.updated': '✏️',
      'bill.analyzed': '🔍',
      'negotiation.created': '💬',
      'negotiation.offer_sent': '📤',
      'negotiation.response': '📥',
      'negotiation.settled': '🤝',
      'communication.sent': '📨',
      'communication.delivered': '✅',
      'rule.executed': '🤖',
      'settings.updated': '⚙️'
    };
    return icons[eventType] || '📋';
  };

  const getEntityLink = (entry: AuditEntry) => {
    if (entry.entity_type === 'bill' && entry.entity_id) {
      return `/dashboard/bill-negotiator/bills/${entry.entity_id}`;
    }
    return null;
  };

  if (!selectedClient) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>📜</p>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
          Select a Client
        </h2>
        <p style={{ color: '#64748b' }}>
          Please select a client from the dropdown to view audit log.
        </p>
      </div>
    );
  }

  const styles = {
    container: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
    header: { marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' },
    controls: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      alignItems: 'center'
    },
    select: {
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#fff'
    },
    card: {
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    },
    entry: {
      padding: '16px 24px',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px'
    },
    icon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      flexShrink: 0
    },
    content: { flex: '1' },
    action: { fontWeight: '500', color: '#0f172a', marginBottom: '4px' },
    meta: { fontSize: '13px', color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap' as const },
    details: {
      marginTop: '8px',
      padding: '8px 12px',
      background: '#f8fafc',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#64748b'
    },
    pagination: {
      padding: '16px 24px',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    pageBtn: (disabled: boolean) => ({
      padding: '8px 16px',
      background: disabled ? '#f8fafc' : '#fff',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#94a3b8' : '#374151'
    })
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Link href="/dashboard/bill-negotiator" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bill Negotiator
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#6366f1', fontWeight: '500', fontSize: '14px' }}>Audit Log</span>
        </div>
        <h1 style={styles.title}>📜 Audit Log</h1>
        <p style={{ color: '#64748b' }}>Track all actions and changes in the system.</p>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <select
          style={styles.select}
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(0); }}
        >
          <option value="all">All Events</option>
          <option value="bill">Bills</option>
          <option value="negotiation">Negotiations</option>
          <option value="communication">Communications</option>
          <option value="rule">Rules</option>
          <option value="settings">Settings</option>
        </select>
        <span style={{ color: '#64748b', fontSize: '14px' }}>
          {total} total entries
        </span>
      </div>

      {/* Log Entries */}
      <div style={styles.card}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>📭</p>
            <p style={{ color: '#64748b' }}>No audit entries found</p>
          </div>
        ) : (
          <>
            {entries.map(entry => (
              <div key={entry.id} style={styles.entry}>
                <div style={styles.icon}>
                  {getEventIcon(entry.event_type)}
                </div>
                <div style={styles.content}>
                  <div style={styles.action}>
                    {entry.action}
                    {getEntityLink(entry) && (
                      <Link href={getEntityLink(entry)!} style={{ color: '#6366f1', marginLeft: '8px' }}>
                        #{entry.entity_id}
                      </Link>
                    )}
                  </div>
                  <div style={styles.meta}>
                    <span>📅 {formatDate(entry.timestamp)}</span>
                    {entry.user_name && <span>👤 {entry.user_name}</span>}
                    <span style={{ textTransform: 'capitalize' }}>
                      🏷️ {entry.entity_type}
                    </span>
                  </div>
                  {Object.keys(entry.details).length > 0 && (
                    <div style={styles.details}>
                      {JSON.stringify(entry.details, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Pagination */}
            <div style={styles.pagination}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={styles.pageBtn(page === 0)}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  ← Previous
                </button>
                <button
                  style={styles.pageBtn((page + 1) * limit >= total)}
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
