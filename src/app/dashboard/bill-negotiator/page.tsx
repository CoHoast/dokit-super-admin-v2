'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';
import { GradientStatCard } from '@/components/GradientStatCard';
import { DashboardHeader } from '@/components/DashboardHeader';
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
      
      const analyticsRes = await fetch(`/api/db/bill-negotiator/analytics?period=${period}${clientParam}`);
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

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
      case 'paid': return { bg: '#d1fae5', color: '#059669' };
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
      case 'awaiting_response': return 'Awaiting';
      case 'counter_received': return 'Counter';
      case 'settled': return 'Settled';
      case 'paid': return 'Paid';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid #e2e8f0', 
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b' }}>Loading Bill Negotiator...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header with Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            💰 Bill Negotiator
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            AI-powered medical bill negotiation {selectedClient ? (
              <span style={{ 
                marginLeft: '8px',
                padding: '4px 12px', 
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', 
                borderRadius: '6px',
                fontWeight: '500',
                color: '#7c3aed'
              }}>
                {selectedClient.name}
              </span>
            ) : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              color: '#0f172a',
              cursor: 'pointer',
              background: '#fff'
            }}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <Link
            href="/dashboard/bill-negotiator/reports"
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#6366f1',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '2px solid #6366f1',
              transition: 'all 0.2s ease'
            }}
          >
            📊 Reports
          </Link>
          <Link
            href="/dashboard/bill-negotiator/bills"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
            }}
          >
            View All Bills →
          </Link>
        </div>
      </div>

      {/* Gradient Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <GradientStatCard
          label="Total Bills"
          value={analytics?.overview.totalBills || 0}
          subtext={`${analytics?.overview.newBills || 0} new, ${analytics?.overview.pendingBills || 0} pending`}
          variant="blue"
          icon={
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          }
        />
        
        <GradientStatCard
          label="Total Savings"
          value={formatCurrency(analytics?.overview.totalSavings || 0)}
          trend={{
            value: `${analytics?.overview.avgSavingsPercent || 0}% avg`,
            direction: 'up'
          }}
          variant="green"
          icon={
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        
        <GradientStatCard
          label="Acceptance Rate"
          value={`${analytics?.negotiations.acceptanceRate || 0}%`}
          subtext={`${analytics?.negotiations.accepted || 0} of ${analytics?.negotiations.total || 0} accepted`}
          variant="purple"
          icon={
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        
        <GradientStatCard
          label="Automation Rate"
          value={`${analytics?.automation.automationRate || 0}%`}
          subtext="Bills auto-processed"
          variant="cyan"
          icon={
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <Link
          href="/dashboard/bill-negotiator/bills/new"
          style={{
            padding: '20px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>New Bill</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Add manually</div>
          </div>
        </Link>
        
        <Link
          href="/dashboard/bill-negotiator/settings"
          style={{
            padding: '20px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#8b5cf6';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>Automation</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Configure rules</div>
          </div>
        </Link>
        
        <Link
          href="/dashboard/bill-negotiator/audit"
          style={{
            padding: '20px',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#06b6d4';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>Audit Log</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>View activity</div>
          </div>
        </Link>

        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '2px' }}>
              {analytics?.overview.pendingBills || 0} Pending
            </div>
            <div style={{ fontSize: '13px', color: '#b45309' }}>Needs attention</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        {/* Recent Bills */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Recent Bills</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Latest bill activity</p>
            </div>
            <Link href="/dashboard/bill-negotiator/bills" style={{ fontSize: '14px', color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}>
              View all →
            </Link>
          </div>
          
          {recentBills.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>No bills yet</p>
              <Link
                href="/dashboard/bill-negotiator/bills/new"
                style={{
                  display: 'inline-flex',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Add First Bill
              </Link>
            </div>
          ) : (
            <div>
              {recentBills.slice(0, 6).map((bill) => {
                const statusStyle = getStatusColor(bill.status);
                return (
                  <Link
                    key={bill.id}
                    href={`/dashboard/bill-negotiator/bills/${bill.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 24px',
                      borderBottom: '1px solid #f8fafc',
                      textDecoration: 'none',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '500', color: '#0f172a', marginBottom: '4px' }}>{bill.member_name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{bill.provider_name}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '16px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(bill.total_billed)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(bill.received_at)}</div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: statusStyle.bg,
                      color: statusStyle.color
                    }}>
                      {getStatusLabel(bill.status)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column - Status Breakdown & Top Providers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Breakdown */}
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '20px' }}>
              📊 Status Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analytics?.statusBreakdown?.slice(0, 5).map((item) => {
                const statusStyle = getStatusColor(item.status);
                const percentage = analytics.overview.totalBills > 0 
                  ? Math.round((item.count / analytics.overview.totalBills) * 100) 
                  : 0;
                return (
                  <div key={item.status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>{getStatusLabel(item.status)}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{item.count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: statusStyle.color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Providers */}
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '20px' }}>
              🏥 Top Providers
            </h3>
            {analytics?.topProviders?.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No provider data yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analytics?.topProviders?.slice(0, 5).map((provider, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#64748b'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {provider.provider_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{provider.bill_count} bills</div>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: '#dcfce7',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#16a34a'
                    }}>
                      {provider.avg_savings_percent}% saved
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intake Sources Section */}
      {selectedClient && (
        <div style={{ marginTop: '32px' }}>
          <IntakeSourcesManager clientId={Number(selectedClient.id)} workflowKey="bill-negotiator" workflowName="Bill Negotiator" />
        </div>
      )}
    </div>
  );
}
