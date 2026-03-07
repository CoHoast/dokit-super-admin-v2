'use client';

// Phase 2E: Savings Reports Page

import { useState, useEffect } from 'react';
import { useClient } from '@/context/ClientContext';
import Link from 'next/link';

interface SavingsReport {
  period: { start: string; end: string };
  summary: {
    total_bills: number;
    total_billed: number;
    total_settled: number;
    total_savings: number;
    savings_percent: number;
    avg_settlement_percent: number;
    auto_negotiated_count: number;
    auto_negotiated_percent: number;
  };
  by_status: { status: string; count: number; total_billed: number }[];
  by_provider: {
    provider_name: string;
    bill_count: number;
    total_billed: number;
    total_settled: number;
    savings: number;
    avg_settlement_percent: number;
  }[];
  by_month: { month: string; bills: number; billed: number; settled: number; savings: number }[];
  top_savings: {
    bill_id: number;
    provider_name: string;
    member_name: string;
    billed: number;
    settled: number;
    savings: number;
    savings_percent: number;
  }[];
}

export default function ReportsPage() {
  const { selectedClient } = useClient();
  const [report, setReport] = useState<SavingsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('90'); // days
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      fetchReport();
    }
  }, [selectedClient, dateRange]);

  const fetchReport = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `/api/reports/savings?clientId=${selectedClient.id}&startDate=${startDate}`
      );
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedClient) return;
    
    setExporting(true);
    try {
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          dateRange: { start: startDate, end: new Date().toISOString() }
        })
      });
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bills-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!selectedClient) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>📊</p>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
          Select a Client
        </h2>
        <p style={{ color: '#64748b' }}>
          Please select a client from the dropdown to view reports.
        </p>
      </div>
    );
  }

  const styles = {
    container: { padding: '32px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '32px' },
    title: { fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' },
    subtitle: { color: '#64748b' },
    controls: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    select: {
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#fff'
    },
    exportBtn: {
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
    statCard: {
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px'
    },
    statLabel: { fontSize: '13px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' as const, fontWeight: '500' },
    statValue: { fontSize: '32px', fontWeight: '700', color: '#0f172a' },
    statSubtext: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
    savingsCard: {
      background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
      borderRadius: '16px',
      border: '1px solid #86efac',
      padding: '24px'
    },
    card: {
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      marginBottom: '24px'
    },
    cardHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    cardTitle: { fontSize: '16px', fontWeight: '600', color: '#0f172a' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: {
      padding: '12px 20px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: '600',
      color: '#64748b',
      background: '#f8fafc',
      textTransform: 'uppercase' as const
    },
    td: { padding: '14px 20px', borderTop: '1px solid #f1f5f9' },
    badge: (type: string) => ({
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      background: type === 'savings' ? '#dcfce7' : '#f1f5f9',
      color: type === 'savings' ? '#16a34a' : '#64748b'
    })
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        Loading report...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Link href="/dashboard/bill-negotiator" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bill Negotiator
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#6366f1', fontWeight: '500', fontSize: '14px' }}>Reports</span>
        </div>
        <h1 style={styles.title}>📊 Savings Report</h1>
        <p style={styles.subtitle}>Track your negotiation performance and savings.</p>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            style={styles.select}
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            {report?.period.start && new Date(report.period.start).toLocaleDateString()} - {new Date().toLocaleDateString()}
          </span>
        </div>
        <button style={styles.exportBtn} onClick={handleExport} disabled={exporting}>
          {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
        </button>
      </div>

      {report && (
        <>
          {/* Summary Stats */}
          <div style={styles.grid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Bills</div>
              <div style={styles.statValue}>{report.summary.total_bills}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Billed</div>
              <div style={styles.statValue}>{formatCurrency(report.summary.total_billed)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Settled</div>
              <div style={styles.statValue}>{formatCurrency(report.summary.total_settled)}</div>
              <div style={styles.statSubtext}>
                {report.summary.avg_settlement_percent.toFixed(0)}% of billed
              </div>
            </div>
            <div style={styles.savingsCard}>
              <div style={{ ...styles.statLabel, color: '#166534' }}>Total Savings</div>
              <div style={{ ...styles.statValue, color: '#16a34a' }}>
                {formatCurrency(report.summary.total_savings)}
              </div>
              <div style={{ ...styles.statSubtext, color: '#166534' }}>
                {report.summary.savings_percent.toFixed(1)}% saved
              </div>
            </div>
          </div>

          {/* Automation Stats */}
          <div style={{ ...styles.card, marginBottom: '24px' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>🤖 Auto-Negotiated</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
                  {report.summary.auto_negotiated_count}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Automation Rate</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                  {report.summary.auto_negotiated_percent.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Top Providers */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>🏥 Top Providers</h3>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Provider</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Bills</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_provider.slice(0, 5).map((p, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '500' }}>{p.provider_name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {p.avg_settlement_percent.toFixed(0)}% avg settlement
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>{p.bill_count}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.badge('savings')}>
                          {formatCurrency(p.savings)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Savings */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>🏆 Top Savings</h3>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Bill</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Billed</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {report.top_savings.map((s, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        <Link href={`/dashboard/bill-negotiator/bills/${s.bill_id}`} style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}>
                          #{s.bill_id}
                        </Link>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{s.member_name}</div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#64748b' }}>
                        {formatCurrency(s.billed)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span style={styles.badge('savings')}>
                          {formatCurrency(s.savings)} ({s.savings_percent}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Breakdown */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>📋 Status Breakdown</h3>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {report.by_status.map((s, i) => (
                <div key={i} style={{ minWidth: '120px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{s.count}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>
                    {s.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
