'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';
import IntakeSourcesManager from '@/components/IntakeSourcesManager';

interface Analytics {
  overview: {
    totalBills: number;
    settledBills: number;
    pendingBills: number;
    newBills: number;
    totalBilled: number;
    totalSavings: number;
    avgSavingsPercent: string;
    avgDaysToSettle: string;
  };
  negotiations: {
    total: number;
    accepted: number;
    countered: number;
    rejected: number;
    pending: number;
    acceptanceRate: string;
  };
  automation: {
    automationRate: string;
  };
  statusBreakdown: Array<{ status: string; count: number; total_billed: number }>;
  topProviders: Array<{ provider_name: string; bill_count: number; avg_savings_percent: number }>;
}

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

export default function BillNegotiatorPage() {
  const { selectedClient } = useClient();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchData();
  }, [selectedClient, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientParam = selectedClient ? `&clientId=${selectedClient.id}` : '';
      
      // Fetch analytics
      const analyticsRes = await fetch(`/api/db/bill-negotiator/analytics?period=${period}${clientParam}`);
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Fetch recent bills
      const billsRes = await fetch(`/api/db/bill-negotiator/bills?limit=10${clientParam}`);
      const billsData = await billsRes.json();
      setRecentBills(billsData.bills || []);

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
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settled': return { bg: '#dcfce7', color: '#16a34a' };
      case 'offer_sent': 
      case 'awaiting_response': return { bg: '#dbeafe', color: '#2563eb' };
      case 'counter_received': return { bg: '#fef3c7', color: '#d97706' };
      case 'received':
      case 'analyzing': return { bg: '#f1f5f9', color: '#64748b' };
      case 'failed': return { bg: '#fee2e2', color: '#dc2626' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'received': return 'New';
      case 'analyzing': return 'Analyzing';
      case 'ready_to_negotiate': return 'Ready';
      case 'offer_sent': return 'Offer Sent';
      case 'awaiting_response': return 'Awaiting Response';
      case 'counter_received': return 'Counter Received';
      case 'settled': return 'Settled';
      case 'paid': return 'Paid';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748b' }}>Loading Bill Negotiator...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Bill Negotiator
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            AI-powered medical bill negotiation {selectedClient ? `for ${selectedClient.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <Link
            href="/dashboard/bill-negotiator/bills"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            View All Bills
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Total Bills */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" stroke="#4f46e5" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Bills</span>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>{analytics?.overview.totalBills || 0}</p>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            {analytics?.overview.newBills || 0} new, {analytics?.overview.pendingBills || 0} pending
          </p>
        </div>

        {/* Total Savings */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Total Savings</span>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(analytics?.overview.totalSavings || 0)}</p>
          <p style={{ fontSize: '13px', color: '#16a34a', marginTop: '8px' }}>
            {analytics?.overview.avgSavingsPercent || 0}% avg savings
          </p>
        </div>

        {/* Acceptance Rate */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Acceptance Rate</span>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>{analytics?.negotiations.acceptanceRate || 0}%</p>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            {analytics?.negotiations.accepted || 0} of {analytics?.negotiations.total || 0} accepted
          </p>
        </div>

        {/* Avg Days to Settle */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Avg. Settlement Time</span>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a' }}>{analytics?.overview.avgDaysToSettle || 0}</p>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>days to settle</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Bills */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Recent Bills</h2>
            <Link href="/dashboard/bill-negotiator/bills" style={{ fontSize: '14px', color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div>
            {recentBills.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '12px' }}>📋</p>
                <p style={{ color: '#64748b' }}>No bills yet</p>
                <Link 
                  href="/dashboard/bill-negotiator/bills/new"
                  style={{ 
                    display: 'inline-block',
                    marginTop: '16px',
                    padding: '10px 20px',
                    background: '#6366f1',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '14px'
                  }}
                >
                  Add First Bill
                </Link>
              </div>
            ) : (
              recentBills.map((bill, index) => {
                const statusStyle = getStatusColor(bill.status);
                return (
                  <Link
                    key={bill.id}
                    href={`/dashboard/bill-negotiator/bills/${bill.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderBottom: index < recentBills.length - 1 ? '1px solid #f1f5f9' : 'none',
                      textDecoration: 'none',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>{bill.member_name || 'Unknown Member'}</p>
                        <p style={{ fontSize: '13px', color: '#64748b' }}>{bill.provider_name || 'Unknown Provider'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{formatCurrency(bill.total_billed || 0)}</p>
                        {bill.savings_amount && (
                          <p style={{ fontSize: '12px', color: '#16a34a' }}>-{formatCurrency(bill.savings_amount)} saved</p>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {getStatusLabel(bill.status)}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Negotiation Status */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Negotiation Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Pending Response', count: analytics?.negotiations.pending || 0, color: '#3b82f6' },
                { label: 'Accepted', count: analytics?.negotiations.accepted || 0, color: '#16a34a' },
                { label: 'Countered', count: analytics?.negotiations.countered || 0, color: '#d97706' },
                { label: 'Rejected', count: analytics?.negotiations.rejected || 0, color: '#dc2626' },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.count}</span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: item.color, 
                        borderRadius: '3px',
                        width: `${analytics?.negotiations.total ? (item.count / analytics.negotiations.total) * 100 : 0}%`
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automation Rate */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Automation Rate</h3>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '48px', fontWeight: 700, color: '#6366f1' }}>
                {analytics?.automation.automationRate || 0}%
              </p>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                of negotiations handled automatically
              </p>
            </div>
          </div>

          {/* Top Providers */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Top Providers</h3>
            {analytics?.topProviders && analytics.topProviders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analytics.topProviders.slice(0, 5).map((provider, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {provider.provider_name}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginLeft: '12px' }}>
                      {provider.bill_count} bills
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>No provider data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Intake Sources Configuration */}
      {selectedClient && (
        <div style={{ marginTop: '32px' }}>
          <IntakeSourcesManager 
            clientId={typeof selectedClient.id === 'string' ? parseInt(selectedClient.id) : selectedClient.id}
            workflowKey="bill-negotiator"
            workflowName="Bill Negotiator"
          />
        </div>
      )}
    </div>
  );
}
