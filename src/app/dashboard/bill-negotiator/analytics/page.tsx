'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ClientStats {
  client_id: number;
  client_name: string;
  total_bills: number;
  total_billed: number;
  total_savings: number;
  settled_count: number;
  pending_count: number;
  avg_settlement_percent: number;
}

interface OverallStats {
  total_clients: number;
  total_bills: number;
  total_billed: number;
  total_savings: number;
  total_settled: number;
  total_pending: number;
  avg_settlement_percent: number;
  bills_by_status: Record<string, number>;
  savings_trend: { month: string; savings: number }[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all clients first
      const clientsRes = await fetch('/api/db/clients');
      const clientsData = await clientsRes.json();
      const clients = clientsData.clients || [];

      // Fetch bills for each client
      const allStats: ClientStats[] = [];
      let overall: OverallStats = {
        total_clients: clients.length,
        total_bills: 0,
        total_billed: 0,
        total_savings: 0,
        total_settled: 0,
        total_pending: 0,
        avg_settlement_percent: 0,
        bills_by_status: {},
        savings_trend: []
      };

      for (const client of clients) {
        const billsRes = await fetch(`/api/db/bill-negotiator/bills?clientId=${client.id}&limit=500`);
        const billsData = await billsRes.json();
        const bills = billsData.bills || [];

        if (bills.length === 0) continue;

        const clientStat: ClientStats = {
          client_id: client.id,
          client_name: client.name,
          total_bills: bills.length,
          total_billed: 0,
          total_savings: 0,
          settled_count: 0,
          pending_count: 0,
          avg_settlement_percent: 0
        };

        bills.forEach((bill: { status: string; total_billed: number; fair_price?: number }) => {
          clientStat.total_billed += bill.total_billed || 0;
          
          // Count by status
          overall.bills_by_status[bill.status] = (overall.bills_by_status[bill.status] || 0) + 1;
          
          if (bill.status === 'settled' || bill.status === 'paid') {
            clientStat.settled_count++;
            const savings = bill.total_billed - (bill.fair_price || bill.total_billed);
            clientStat.total_savings += savings;
            overall.total_savings += savings;
            overall.total_settled++;
          } else if (['received', 'analyzing', 'ready_to_negotiate', 'offer_sent', 'awaiting_response', 'counter_received'].includes(bill.status)) {
            clientStat.pending_count++;
            overall.total_pending++;
          }
        });

        if (clientStat.settled_count > 0 && clientStat.total_billed > 0) {
          clientStat.avg_settlement_percent = ((clientStat.total_billed - clientStat.total_savings) / clientStat.total_billed) * 100;
        }

        overall.total_bills += clientStat.total_bills;
        overall.total_billed += clientStat.total_billed;

        if (clientStat.total_bills > 0) {
          allStats.push(clientStat);
        }
      }

      // Calculate overall average
      if (overall.total_settled > 0 && overall.total_billed > 0) {
        overall.avg_settlement_percent = ((overall.total_billed - overall.total_savings) / overall.total_billed) * 100;
      }

      // Sort by total bills descending
      allStats.sort((a, b) => b.total_bills - a.total_bills);

      setClientStats(allStats);
      setStats(overall);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748b' }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Cross-Client Analytics
          </h1>
          <p style={{ color: '#64748b' }}>Bill Negotiator performance across all clients</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#374151',
            cursor: 'pointer'
          }}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Overall Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white'
        }}>
          <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>Total Bills</p>
          <p style={{ fontSize: '32px', fontWeight: 700 }}>{stats?.total_bills || 0}</p>
          <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px' }}>{stats?.total_clients || 0} clients</p>
        </div>

        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Total Billed</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(stats?.total_billed || 0)}</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>{formatFullCurrency(stats?.total_billed || 0)}</p>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white'
        }}>
          <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>Total Savings</p>
          <p style={{ fontSize: '32px', fontWeight: 700 }}>{formatCurrency(stats?.total_savings || 0)}</p>
          <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px' }}>{stats?.total_settled || 0} settled</p>
        </div>

        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Pending</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>{stats?.total_pending || 0}</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>awaiting action</p>
        </div>

        <div style={{ 
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Avg. Settlement</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#6366f1' }}>
            {stats?.avg_settlement_percent ? `${stats.avg_settlement_percent.toFixed(0)}%` : '-'}
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>of original bill</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Client Comparison Table */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Client Comparison</h2>
          </div>
          
          {clientStats.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#64748b' }}>No bill data available</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Bills</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Billed</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Savings</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Settled</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {clientStats.map((client, i) => (
                  <tr key={client.client_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <Link href={`/dashboard/bill-negotiator?client=${client.client_id}`} style={{ 
                        fontWeight: 500, 
                        color: '#6366f1',
                        textDecoration: 'none'
                      }}>
                        {client.client_name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#0f172a' }}>{client.total_bills}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, color: '#0f172a' }}>
                      {formatCurrency(client.total_billed)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, color: '#16a34a' }}>
                      {formatCurrency(client.total_savings)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b' }}>
                      {client.settled_count}/{client.total_bills}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {client.avg_settlement_percent > 0 ? (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: client.avg_settlement_percent < 50 ? '#dcfce7' :
                                       client.avg_settlement_percent < 70 ? '#fef3c7' : '#fee2e2',
                          color: client.avg_settlement_percent < 50 ? '#16a34a' :
                                 client.avg_settlement_percent < 70 ? '#d97706' : '#dc2626'
                        }}>
                          {client.avg_settlement_percent.toFixed(0)}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bills by Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Bills by Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(stats?.bills_by_status || {})
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const total = stats?.total_bills || 1;
                  const percent = (count / total) * 100;
                  const colors: Record<string, string> = {
                    received: '#94a3b8',
                    analyzing: '#64748b',
                    ready_to_negotiate: '#8b5cf6',
                    offer_sent: '#3b82f6',
                    awaiting_response: '#f59e0b',
                    counter_received: '#f97316',
                    settled: '#22c55e',
                    paid: '#16a34a',
                    rejected: '#ef4444',
                    cancelled: '#dc2626'
                  };
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#374151', textTransform: 'capitalize' }}>
                          {status.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{count}</span>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: colors[status] || '#94a3b8',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/dashboard/bill-negotiator/bills" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'background 0.15s'
              }}>
                <span style={{ fontSize: '16px' }}>📋</span>
                <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '14px' }}>View All Bills</span>
              </Link>
              <Link href="/dashboard/bill-negotiator/bills?status=awaiting_response" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                textDecoration: 'none'
              }}>
                <span style={{ fontSize: '16px' }}>⏳</span>
                <span style={{ color: '#92400e', fontWeight: 500, fontSize: '14px' }}>Awaiting Response ({stats?.bills_by_status?.awaiting_response || 0})</span>
              </Link>
              <Link href="/dashboard/bill-negotiator/bills?status=counter_received" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#ffedd5',
                border: '1px solid #fed7aa',
                borderRadius: '10px',
                textDecoration: 'none'
              }}>
                <span style={{ fontSize: '16px' }}>💬</span>
                <span style={{ color: '#9a3412', fontWeight: 500, fontSize: '14px' }}>Counter Received ({stats?.bills_by_status?.counter_received || 0})</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
