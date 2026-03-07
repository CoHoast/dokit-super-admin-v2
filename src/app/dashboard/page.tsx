'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';

const colors = {
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  green: '#10b981',
  greenLight: '#d1fae5',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  rose: '#f43f5e',
  roseLight: '#ffe4e6',
  cyan: '#06b6d4',
  cyanLight: '#cffafe',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
};

interface ClientStats {
  totalProcessed?: number;
  processedToday?: number;
  processedThisWeek?: number;
  processedThisMonth?: number;
  totalBilled?: number;
  totalRepriced?: number;
  totalSavings?: number;
  savingsPercent?: number;
  statusCounts?: Record<string, number>;
  batchStats?: Record<string, number>;
  custom?: Record<string, any>;
}

// Custom Client Dashboard - Shows their synced stats
function CustomClientDashboard({ client, stats, onSync, syncing }: { 
  client: any; 
  stats: ClientStats; 
  onSync: () => void;
  syncing: boolean;
}) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const lastSync = client.lastStatsSync 
    ? new Date(client.lastStatsSync).toLocaleString() 
    : 'Never';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: colors.text }}>
              {client.name}
            </h1>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: colors.purpleLight,
              color: colors.purple,
            }}>
              Custom Dashboard
            </span>
          </div>
          <p style={{ fontSize: '14px', color: colors.textSecondary }}>
            {stats.custom?.product === 'claims-repricing' ? 'Claims Intake & Repricing' : 'Custom Product'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: client.connectionStatus === 'connected' ? colors.green : colors.amber 
            }} />
            {client.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: syncing ? colors.grayLight : colors.purpleLight,
              color: syncing ? colors.textMuted : colors.purple,
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: syncing ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Main Stats - Claims Repricing Focus */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '24px',
        border: '1px solid rgba(139, 92, 246, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative orb */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 60%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.purple }}>
              {stats.custom?.organization || client.name} Overview
            </span>
            <span style={{ fontSize: '11px', color: colors.textMuted }}>
              Last synced: {lastSync}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
            <div>
              <p style={{ fontSize: '36px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
                {stats.totalProcessed?.toLocaleString() || 0}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Total Claims</p>
            </div>
            <div>
              <p style={{ fontSize: '36px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
                {formatCurrency(stats.totalBilled || 0)}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Total Billed</p>
            </div>
            <div>
              <p style={{ fontSize: '36px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
                {formatCurrency(stats.totalRepriced || 0)}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Repriced To</p>
            </div>
            <div>
              <p style={{ fontSize: '36px', fontWeight: '700', color: colors.green, letterSpacing: '-1px', marginBottom: '4px' }}>
                {formatCurrency(stats.totalSavings || 0)}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                Total Savings ({stats.savingsPercent?.toFixed(1) || 0}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Today */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: colors.cyanLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.cyan} strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>Today</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>
            {stats.processedToday || 0}
          </p>
        </div>

        {/* This Week */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: colors.purpleLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>This Week</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>
            {stats.processedThisWeek || 0}
          </p>
        </div>

        {/* This Month */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: colors.amberLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>This Month</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>
            {stats.processedThisMonth || 0}
          </p>
        </div>

        {/* Savings Rate */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: colors.greenLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.green} strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>Savings Rate</span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.green }}>
            {stats.savingsPercent?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Status Breakdown & Batches */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Claim Status */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${colors.border}`
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Claim Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(stats.statusCounts || {}).map(([status, count]) => {
              const total = Object.values(stats.statusCounts || {}).reduce((a, b) => a + b, 0);
              const percent = total > 0 ? (count / total) * 100 : 0;
              const statusColors: Record<string, string> = {
                pending: colors.amber,
                repriced: colors.purple,
                batched: colors.cyan,
                submitted: colors.green,
              };
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: colors.textSecondary, textTransform: 'capitalize' }}>{status}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', background: colors.grayLight, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${percent}%`, 
                      background: statusColors[status] || colors.gray,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Batch Status */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${colors.border}`
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Batch Status
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ 
              padding: '20px', 
              background: colors.amberLight, 
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '32px', fontWeight: '700', color: colors.amber, marginBottom: '4px' }}>
                {stats.batchStats?.ready || 0}
              </p>
              <p style={{ fontSize: '12px', color: colors.amber }}>Ready</p>
            </div>
            <div style={{ 
              padding: '20px', 
              background: colors.greenLight, 
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '32px', fontWeight: '700', color: colors.green, marginBottom: '4px' }}>
                {stats.batchStats?.submitted || 0}
              </p>
              <p style={{ fontSize: '12px', color: colors.green }}>Submitted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{
        background: colors.cardBg,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.border}`
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={client.customDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open Dashboard
          </a>
          <Link
            href={`/dashboard/clients/${client.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: colors.grayLight,
              color: colors.text,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Client Settings
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}

// Standard Platform Dashboard (original)
function PlatformDashboard({ client, clients }: { client: any; clients: any[] }) {
  // Mock data for platform overview
  const platformStats = {
    totalClients: clients.length,
    activeClients: clients.filter((c: any) => c.status === 'active').length,
    totalDocuments: 48392,
    processedThisMonth: 8456,
    totalSavings: clients.reduce((sum: number, c: any) => sum + (c.stats?.totalSavings || 0), 0),
    avgAccuracy: 98.7,
  };

  const stats = {
    totalDocuments: client.stats?.totalDocuments || 2847,
    processedToday: client.stats?.documentsToday || 47,
    avgProcessing: 8.3,
    aiAccuracy: 99.2,
  };

  const chartData = [42, 48, 51, 47, 55, 58, 52, 61, 65, 58, 72, 68, 75, 82, 78, 85, 88, 92, 87, 95, 102, 98, 108, 112, 105, 118, 125, 132, 128, 138];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: colors.textSecondary }}>
            Welcome back, Admin
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.green }} />
          Last synced: Just now
        </div>
      </div>

      {/* Platform Overview */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.04) 50%, rgba(59, 130, 246, 0.04) 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(139, 92, 246, 0.1)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: colors.purple, marginBottom: '16px' }}>
            Platform Overview
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                {platformStats.totalClients}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Active Clients</p>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                {platformStats.totalDocuments.toLocaleString()}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Total Documents</p>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                ${platformStats.totalSavings > 0 ? (platformStats.totalSavings / 1000).toFixed(0) + 'K' : '0'}
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Total Savings</p>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px', marginBottom: '4px' }}>
                {platformStats.avgAccuracy}%
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary }}>Avg Accuracy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: colors.grayLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.gray} strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              background: colors.greenLight, 
              color: colors.green, 
              borderRadius: '4px',
              fontWeight: 500 
            }}>+12%</span>
          </div>
          <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Total Documents</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>{stats.totalDocuments.toLocaleString()}</p>
        </div>

        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: colors.greenLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.green} strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              background: colors.greenLight, 
              color: colors.green, 
              borderRadius: '4px',
              fontWeight: 500 
            }}>Live</span>
          </div>
          <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Processed Today</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>{stats.processedToday}</p>
        </div>

        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: colors.purpleLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              background: colors.roseLight, 
              color: colors.rose, 
              borderRadius: '4px',
              fontWeight: 500 
            }}>-23%</span>
          </div>
          <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Avg Processing</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>{stats.avgProcessing}<span style={{ fontSize: '14px', color: colors.textMuted }}>s</span></p>
        </div>
      </div>

      {/* Chart placeholder */}
      <div style={{
        background: colors.cardBg,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.border}`,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>Processing Volume</h3>
            <p style={{ fontSize: '12px', color: colors.textMuted }}>Documents processed over time</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['7D', '30D', '90D'].map(period => (
              <button
                key={period}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: period === '30D' ? colors.purple : 'transparent',
                  color: period === '30D' ? 'white' : colors.textMuted,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
          {chartData.map((value, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(value / Math.max(...chartData)) * 100}%`,
                background: `linear-gradient(to top, ${colors.purple}20, ${colors.purple}05)`,
                borderRadius: '2px 2px 0 0',
                minHeight: '4px'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Page
export default function DashboardPage() {
  const { selectedClient, clients, refreshClients } = useClient();
  const [clientStats, setClientStats] = useState<ClientStats>({});
  const [syncing, setSyncing] = useState(false);

  const client = selectedClient || (clients && clients.length > 0 ? clients[0] : null);

  // Use stats from client object (already synced), or fetch fresh
  useEffect(() => {
    if (client && client.dashboardType === 'custom') {
      // Use existing stats from client object first
      if (client.stats && Object.keys(client.stats).length > 0) {
        // The stats object from API has nested structure, extract it
        const stats = client.stats;
        setClientStats({
          totalProcessed: stats.totalProcessed || stats.totalDocuments || 0,
          processedToday: stats.processedToday || stats.documentsToday || 0,
          processedThisWeek: stats.processedThisWeek || 0,
          processedThisMonth: stats.processedThisMonth || stats.documentsThisMonth || 0,
          totalBilled: stats.totalBilled || 0,
          totalRepriced: stats.totalRepriced || 0,
          totalSavings: stats.totalSavings || 0,
          savingsPercent: stats.savingsPercent || 0,
          statusCounts: stats.statusCounts || {},
          batchStats: stats.batchStats || {},
          custom: stats.custom || {},
        });
      }
    }
  }, [client?.id, client?.stats]);

  const handleSync = async () => {
    if (!client) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/sync-stats`, { method: 'POST' });
      const data = await res.json();
      if (data.stats) {
        setClientStats(data.stats);
        // Refresh clients to get updated stats in sidebar
        refreshClients();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
    setSyncing(false);
  };

  // Loading state
  if (!clients || clients.length === 0) {
    return (
      <div style={{ 
        padding: '48px 32px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: `2px solid ${colors.border}`,
            borderTopColor: colors.purple,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '14px', color: colors.textMuted }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  // Show custom dashboard for custom clients
  if (client && client.dashboardType === 'custom') {
    return (
      <CustomClientDashboard 
        client={client} 
        stats={clientStats} 
        onSync={handleSync}
        syncing={syncing}
      />
    );
  }

  // Show standard platform dashboard
  return <PlatformDashboard client={client} clients={clients} />;
}
