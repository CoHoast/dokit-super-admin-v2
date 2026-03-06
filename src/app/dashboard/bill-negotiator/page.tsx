'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';

interface Bill {
  id: number;
  member_name: string;
  provider_name: string;
  total_billed: number;
  fair_price: number;
  status: string;
  received_at: string;
  negotiation_status?: string;
  savings_amount?: number;
  savings_percent?: number;
}

interface Stats {
  summary: {
    totalBills: number;
    totalBilledAmount: number;
    totalPaid: number;
    totalSavings: number;
    savingsPercent: number;
  };
  billsByStatus: Record<string, number>;
  negotiations: {
    total: number;
    accepted: number;
    pending: number;
    avgSavingsPercent: number;
    avgDaysToSettle: number;
  };
}

export default function BillNegotiatorPage() {
  const { selectedClient } = useClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [selectedClient, filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientParam = selectedClient ? `clientId=${selectedClient.id}` : '';
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      
      const [billsRes, statsRes] = await Promise.all([
        fetch(`/api/db/bill-negotiator/bills?${clientParam}${statusParam}&limit=20`),
        fetch(`/api/db/bill-negotiator/stats?${clientParam}`)
      ]);

      if (billsRes.ok) {
        const data = await billsRes.json();
        setBills(data.bills || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      received: { bg: '#f1f5f9', color: '#64748b' },
      analyzing: { bg: '#dbeafe', color: '#2563eb' },
      ready_to_negotiate: { bg: '#fef3c7', color: '#d97706' },
      offer_sent: { bg: '#e0e7ff', color: '#4f46e5' },
      awaiting_response: { bg: '#fef3c7', color: '#d97706' },
      counter_received: { bg: '#fce7f3', color: '#db2777' },
      settled: { bg: '#dcfce7', color: '#16a34a' },
      paid: { bg: '#d1fae5', color: '#059669' },
      failed: { bg: '#fee2e2', color: '#dc2626' }
    };
    const style = styles[status] || styles.received;
    return (
      <span style={{ 
        padding: '4px 10px', 
        borderRadius: '6px', 
        fontSize: '12px', 
        fontWeight: 600,
        background: style.bg,
        color: style.color
      }}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Bill Negotiator
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            AI-powered medical bill negotiation and cost reduction
          </p>
        </div>
        <Link
          href="/dashboard/bill-negotiator/new"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          New Bill
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="#4f46e5" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Bills</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>{stats.summary.totalBills}</p>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Billed</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(stats.summary.totalBilledAmount)}</p>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Savings</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(stats.summary.totalSavings)}</p>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Avg. Savings</p>
            <p style={{ fontSize: '32px', fontWeight: 700, color: '#7c3aed' }}>{stats.negotiations.avgSavingsPercent}%</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['all', 'received', 'offer_sent', 'counter_received', 'settled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: filter === status ? '#0f172a' : '#f1f5f9',
              color: filter === status ? 'white' : '#64748b',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {status === 'all' ? 'All Bills' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {stats?.billsByStatus[status] && ` (${stats.billsByStatus[status]})`}
          </button>
        ))}
      </div>

      {/* Bills Table */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Member</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Provider</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Billed</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Fair Price</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Savings</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Received</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                  Loading bills...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                  <p style={{ color: '#64748b', marginBottom: '16px' }}>No bills found</p>
                  <Link
                    href="/dashboard/bill-negotiator/new"
                    style={{
                      padding: '10px 20px',
                      background: '#6366f1',
                      color: 'white',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    Add First Bill
                  </Link>
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr 
                  key={bill.id} 
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => window.location.href = `/dashboard/bill-negotiator/${bill.id}`}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <p style={{ fontWeight: 500, color: '#0f172a' }}>{bill.member_name || 'Unknown'}</p>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <p style={{ color: '#64748b' }}>{bill.provider_name || 'Unknown'}</p>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(bill.total_billed || 0)}</p>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <p style={{ color: '#16a34a', fontWeight: 500 }}>{formatCurrency(bill.fair_price || 0)}</p>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    {getStatusBadge(bill.status)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {bill.savings_amount ? (
                      <p style={{ fontWeight: 600, color: '#16a34a' }}>
                        {formatCurrency(bill.savings_amount)} ({bill.savings_percent?.toFixed(0)}%)
                      </p>
                    ) : (
                      <p style={{ color: '#94a3b8' }}>—</p>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <p style={{ color: '#64748b', fontSize: '13px' }}>{formatDate(bill.received_at)}</p>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <Link
                      href={`/dashboard/bill-negotiator/${bill.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '6px 12px',
                        background: '#f1f5f9',
                        color: '#64748b',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        textDecoration: 'none'
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
