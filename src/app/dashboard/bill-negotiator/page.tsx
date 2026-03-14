'use client';

import { useTheme } from './ThemeProvider';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
  fetchAnalytics, 
  fetchBills, 
  fetchAlerts,
  DEMO_MODE,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  type Bill,
  type Analytics,
  type Alert,
} from '@/lib/sirkl-api';

// Dynamic import for Recharts (avoid SSR issues)
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

export default function DashboardPage() {
  const { isDark, colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const loadDataAsync = async () => {
      setLoading(true);
      try {
        const [analyticsData, billsData, alertsData] = await Promise.all([
          fetchAnalytics(period),
          fetchBills({ limit: 6 }),
          fetchAlerts(),
        ]);
        setAnalytics(analyticsData);
        setBills(billsData.bills);
        setAlerts(alertsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setLoading(false);
    };
    loadDataAsync();
  }, [period]);

  const stats = analytics ? [
    {
      label: 'Total Savings',
      value: analytics.overview.totalSavings,
      prefix: '$',
      suffix: '',
      change: `${analytics.overview.avgSavingsPercent}% avg rate`,
      trend: 'up',
      sparkline: analytics.savingsTrend?.map(s => s.savings / 1000) || [35, 45, 38, 52, 48, 61, 58]
    },
    {
      label: 'Bills Processed',
      value: analytics.overview.totalBills,
      prefix: '',
      suffix: '',
      change: `${analytics.overview.settledBills} settled`,
      trend: 'up',
      sparkline: [12, 18, 15, 22, 19, 28, 24]
    },
    {
      label: 'Acceptance Rate',
      value: parseFloat(analytics.negotiations.acceptanceRate),
      prefix: '',
      suffix: '%',
      change: `${analytics.negotiations.accepted}/${analytics.negotiations.total}`,
      trend: 'up',
      sparkline: [48, 51, 49, 53, 50, 54, 52]
    },
    {
      label: 'Pending Review',
      value: analytics.overview.pendingBills,
      prefix: '',
      suffix: '',
      change: `${analytics.overview.newBills} new today`,
      trend: analytics.overview.pendingBills > 10 ? 'alert' : 'neutral',
      sparkline: [8, 15, 12, 18, 14, 10, 12]
    },
  ] : [];

  const pipelineData = analytics ? [
    { name: 'Settled', value: analytics.statusBreakdown.find(s => s.status === 'settled')?.count || 0, color: isDark ? '#4ade80' : '#16a34a' },
    { name: 'Negotiating', value: analytics.statusBreakdown.find(s => ['counter_received', 'awaiting_response', 'offer_sent'].includes(s.status))?.count || 0, color: colors.accent },
    { name: 'Processing', value: analytics.statusBreakdown.find(s => ['analyzing', 'ready_to_negotiate'].includes(s.status))?.count || 0, color: colors.blue },
    { name: 'Received', value: analytics.statusBreakdown.find(s => s.status === 'received')?.count || 0, color: colors.textMuted },
  ] : [];

  // Sparkline component
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');

    return (
      <svg width="80" height="32" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ height: '120px', backgroundColor: colors.surface, borderRadius: '16px', marginBottom: '32px' }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: '140px', backgroundColor: colors.surface, borderRadius: '14px' }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div style={{ height: '300px', backgroundColor: colors.surface, borderRadius: '14px' }} className="animate-pulse" />
          <div style={{ height: '300px', backgroundColor: colors.surface, borderRadius: '14px' }} className="animate-pulse" />
        </div>
        <style jsx>{`
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Demo Mode Banner */}
      {DEMO_MODE && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '10px 16px',
            marginBottom: '20px',
            borderRadius: '10px',
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fcd34d'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: isDark ? '#fbbf24' : '#f59e0b',
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Demo
          </span>
          <span style={{ fontSize: '13px', color: isDark ? '#fbbf24' : '#92400e' }}>
            Using sample data. Connect to live API for real-time updates.
          </span>
        </motion.div>
      )}

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          marginBottom: '32px',
          padding: '28px 32px',
          borderRadius: '16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(102, 34, 246, 0.1) 0%, rgba(56, 34, 246, 0.05) 50%, transparent 100%)'
            : 'linear-gradient(135deg, rgba(102, 34, 246, 0.08) 0%, rgba(56, 34, 246, 0.03) 50%, transparent 100%)',
          border: `1px solid ${isDark ? 'rgba(102, 34, 246, 0.2)' : 'rgba(102, 34, 246, 0.1)'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '4px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.text, marginBottom: '8px' }}>
              Bill Negotiator
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: colors.textMuted, fontSize: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: colors.accent,
                  borderRadius: '50%',
                  boxShadow: `0 0 8px ${colors.accent}`,
                  animation: 'pulse 2s infinite',
                }} />
                {analytics?.overview.pendingBills || 0} bills processing
              </span>
              <span>•</span>
              <span style={{ color: isDark ? '#4ade80' : '#16a34a' }}>
                {formatCurrency(analytics?.overview.totalSavings || 0)} saved
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface,
                color: colors.text,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
            <Link href="/dashboard/upload" style={{
              padding: '12px 24px',
              background: colors.gradient,
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(102, 34, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Bill
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards with Sparklines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              position: 'relative',
              backgroundColor: colors.surface,
              borderRadius: '14px',
              border: `1px solid ${colors.border}`,
              padding: '20px 20px 16px',
              overflow: 'hidden',
              transition: 'all 0.2s',
            }}
          >
            {/* Accent bar */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              background: stat.trend === 'alert' ? colors.danger : colors.gradient,
              borderRadius: '14px 0 0 14px',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: colors.text,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginBottom: '6px',
                }}>
                  <CountUp
                    end={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.suffix === '%' ? 1 : 0}
                    separator=","
                    duration={2}
                  />
                </p>
                <p style={{ fontSize: '13px', color: colors.textMuted }}>{stat.label}</p>
              </div>
              <Sparkline
                data={stat.sparkline}
                color={stat.trend === 'alert' ? colors.danger : (isDark ? '#4ade80' : '#16a34a')}
              />
            </div>

            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: stat.trend === 'alert'
                ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')
                : (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7'),
            }}>
              {stat.trend === 'up' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#4ade80' : '#16a34a'} strokeWidth="2.5">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              )}
              {stat.trend === 'alert' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: stat.trend === 'alert' ? colors.danger : (isDark ? '#4ade80' : '#16a34a'),
              }}>
                {stat.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Savings Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '14px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Savings Trend</h3>
            <span style={{ fontSize: '13px', color: colors.textMuted }}>Last 6 months</span>
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.savingsTrend || []}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#4ade80' : '#16a34a'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isDark ? '#4ade80' : '#16a34a'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                  labelStyle={{ color: colors.text }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Savings']}
                />
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke={isDark ? '#4ade80' : '#16a34a'}
                  strokeWidth={2}
                  fill="url(#savingsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pipeline Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '14px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Pipeline Status
          </h3>
          <div style={{ height: '160px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>
                {analytics?.overview.totalBills || 0}
              </p>
              <p style={{ fontSize: '12px', color: colors.textMuted }}>Total</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
            {pipelineData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: item.color }} />
                <span style={{ fontSize: '12px', color: colors.textMuted }}>{item.name}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Bills + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '14px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Recent Bills</h3>
            <Link href="/dashboard/bills" style={{
              fontSize: '13px',
              color: colors.accent,
              textDecoration: 'none',
              fontWeight: '500',
            }}>
              View all →
            </Link>
          </div>
          <AnimatePresence>
            {bills.map((bill, i) => {
              const statusStyle = getStatusColor(bill.status, isDark);
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < bills.length - 1 ? `1px solid ${colors.border}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.textMuted,
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{bill.provider_name}</p>
                      <p style={{ fontSize: '13px', color: colors.textMuted }}>{bill.member_name}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                        {formatCurrency(bill.total_billed)}
                      </p>
                      {bill.current_offer && (
                        <p style={{ fontSize: '13px', color: isDark ? '#4ade80' : '#16a34a' }}>
                          → {formatCurrency(bill.current_offer)}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                    }}>
                      {getStatusLabel(bill.status)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '14px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Alerts</h3>
            <span style={{
              width: '24px',
              height: '24px',
              backgroundColor: colors.danger,
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {alerts.length}
            </span>
          </div>
          <AnimatePresence>
            {alerts.map((alert, i) => {
              const alertColors = {
                warning: { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706', icon: '⚠️' },
                success: { bg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7', color: isDark ? '#4ade80' : '#16a34a', icon: '✓' },
                error: { bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', color: colors.danger, icon: '!' },
                info: { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe', color: isDark ? '#60a5fa' : '#2563eb', icon: 'i' },
              };
              const style = alertColors[alert.type as keyof typeof alertColors] || alertColors.info;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < alerts.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: style.bg,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '2px' }}>
                        {alert.title}
                      </p>
                      <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>
                        {alert.message}
                      </p>
                      <Link href={alert.billId ? `/dashboard/bills/${alert.billId}` : '/dashboard/review'} style={{
                        fontSize: '13px',
                        color: colors.accent,
                        textDecoration: 'none',
                        fontWeight: '500',
                      }}>
                        View Details →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
