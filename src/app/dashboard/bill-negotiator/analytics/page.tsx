'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import CountUp from 'react-countup';
import { DEMO_MODE, formatCurrency } from '@/lib/sirkl-api';

// Dynamic imports for Recharts
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

// Mock data
const savingsTrendData = [
  { month: 'Aug', savings: 38000, bills: 45, target: 35000 },
  { month: 'Sep', savings: 42000, bills: 52, target: 40000 },
  { month: 'Oct', savings: 51000, bills: 61, target: 45000 },
  { month: 'Nov', savings: 58000, bills: 68, target: 50000 },
  { month: 'Dec', savings: 52000, bills: 58, target: 55000 },
  { month: 'Jan', savings: 68000, bills: 72, target: 60000 },
  { month: 'Feb', savings: 78000, bills: 84, target: 65000 },
  { month: 'Mar', savings: 85000, bills: 91, target: 70000 },
];

const statusBreakdownData = [
  { name: 'Settled', value: 89, color: '#4ade80' },
  { name: 'Negotiating', value: 24, color: '#a78bfa' },
  { name: 'Processing', value: 28, color: '#60a5fa' },
  { name: 'Received', value: 15, color: '#94a3b8' },
];

const providerPerformanceData = [
  { provider: 'Cleveland Medical', bills: 24, savings: 58, avgDays: 3.2 },
  { provider: 'Regional Hospital', bills: 18, savings: 52, avgDays: 4.1 },
  { provider: 'City Health Partners', bills: 15, savings: 61, avgDays: 2.8 },
  { provider: 'Metro Surgery', bills: 12, savings: 48, avgDays: 5.2 },
  { provider: 'Lakeside Imaging', bills: 9, savings: 55, avgDays: 3.5 },
  { provider: 'Heart & Vascular', bills: 8, savings: 45, avgDays: 6.1 },
];

const responseTimeData = [
  { range: '< 1 day', count: 12, percent: 15 },
  { range: '1-2 days', count: 28, percent: 35 },
  { range: '3-5 days', count: 24, percent: 30 },
  { range: '5-7 days', count: 10, percent: 12 },
  { range: '7+ days', count: 6, percent: 8 },
];

const savingsByTypeData = [
  { type: 'Hospital', savings: 245000, bills: 42 },
  { type: 'Imaging', savings: 89000, bills: 38 },
  { type: 'Surgery', savings: 156000, bills: 24 },
  { type: 'Lab', savings: 34000, bills: 52 },
  { type: 'Specialist', savings: 67000, bills: 28 },
];

const weeklyTrendData = [
  { week: 'W1', newBills: 18, settled: 12, savings: 24000 },
  { week: 'W2', newBills: 22, settled: 19, savings: 31000 },
  { week: 'W3', newBills: 15, settled: 21, savings: 28000 },
  { week: 'W4', newBills: 25, settled: 18, savings: 35000 },
];

export default function AnalyticsPage() {
  const { isDark, colors } = useTheme();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  const kpis = [
    { 
      label: 'Total Savings', 
      value: 468780, 
      prefix: '$', 
      change: '+18.3%', 
      trend: 'up',
      subtext: 'vs last period',
      icon: '💰',
    },
    { 
      label: 'Bills Processed', 
      value: 156, 
      prefix: '', 
      change: '+24', 
      trend: 'up',
      subtext: 'this period',
      icon: '📄',
    },
    { 
      label: 'Avg Savings Rate', 
      value: 52.4, 
      prefix: '', 
      suffix: '%',
      change: '+3.2%', 
      trend: 'up',
      subtext: 'per bill',
      icon: '📈',
    },
    { 
      label: 'Avg Days to Settle', 
      value: 4.2, 
      prefix: '', 
      suffix: ' days',
      change: '-0.8', 
      trend: 'down',
      subtext: 'faster than target',
      icon: '⚡',
    },
    { 
      label: 'Acceptance Rate', 
      value: 66.4, 
      prefix: '', 
      suffix: '%',
      change: '+5.1%', 
      trend: 'up',
      subtext: 'first offer accepted',
      icon: '✅',
    },
    { 
      label: 'Auto-Processed', 
      value: 78, 
      prefix: '', 
      suffix: '%',
      change: '+12%', 
      trend: 'up',
      subtext: 'no human needed',
      icon: '🤖',
    },
  ];

  const chartColors = {
    primary: colors.accent,
    success: isDark ? '#4ade80' : '#16a34a',
    blue: isDark ? '#60a5fa' : '#2563eb',
    purple: isDark ? '#a78bfa' : '#7c3aed',
    amber: isDark ? '#fbbf24' : '#d97706',
    gray: isDark ? '#94a3b8' : '#64748b',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${colors.border}`,
            borderTopColor: colors.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: colors.textMuted }}>Loading analytics...</span>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Analytics
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Track savings, performance, and trends
            {DEMO_MODE && (
              <span style={{
                marginLeft: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                color: isDark ? '#fbbf24' : '#92400e',
              }}>
                DEMO DATA
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['week', 'month', 'quarter', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: period === p ? colors.accent : colors.surface,
                color: period === p ? '#fff' : colors.textMuted,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '14px',
              border: `1px solid ${colors.border}`,
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{kpi.icon}</span>
              <span style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: kpi.trend === 'up' 
                  ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                  : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe'),
                color: kpi.trend === 'up' ? chartColors.success : chartColors.blue,
              }}>
                {kpi.change}
              </span>
            </div>
            <p style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: colors.text,
              marginBottom: '4px',
            }}>
              <CountUp
                end={kpi.value}
                prefix={kpi.prefix}
                suffix={kpi.suffix || ''}
                decimals={kpi.suffix === '%' || kpi.suffix === ' days' ? 1 : 0}
                separator=","
                duration={1.5}
              />
            </p>
            <p style={{ fontSize: '12px', color: colors.textMuted }}>{kpi.label}</p>
            <p style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>{kpi.subtext}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Savings Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Savings Trend</h3>
              <p style={{ fontSize: '13px', color: colors.textMuted }}>Monthly savings vs target</p>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: chartColors.success }} />
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Actual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '3px', backgroundColor: chartColors.purple }} />
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Target</span>
              </div>
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsTrendData}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.success} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                />
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke={chartColors.success}
                  strokeWidth={2}
                  fill="url(#savingsGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke={chartColors.purple}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Bill Status Breakdown
          </h3>
          <div style={{ height: '200px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusBreakdownData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text }}>156</p>
              <p style={{ fontSize: '12px', color: colors.textMuted }}>Total</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '20px' }}>
            {statusBreakdownData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: item.color }} />
                <span style={{ fontSize: '13px', color: colors.textMuted }}>{item.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text, marginLeft: 'auto' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Provider Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Top Providers by Savings Rate
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providerPerformanceData} layout="vertical">
                <XAxis type="number" stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} domain={[0, 70]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="provider" stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value}%`, 'Savings Rate']}
                />
                <Bar dataKey="savings" fill={chartColors.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Response Time Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Provider Response Time
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimeData}>
                <XAxis dataKey="range" stroke={colors.textMuted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value} bills`, 'Count']}
                />
                <Bar dataKey="count" fill={chartColors.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Third Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Savings by Provider Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Savings by Provider Type
          </h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsByTypeData}>
                <XAxis dataKey="type" stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Savings']}
                />
                <Bar dataKey="savings" fill={chartColors.purple} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
            Weekly Activity
          </h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData}>
                <XAxis dataKey="week" stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="newBills" name="New Bills" fill={chartColors.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="settled" name="Settled" fill={chartColors.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Quick Stats Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        style={{
          backgroundColor: colors.surface,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          marginTop: '24px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
            Provider Performance Details
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Provider</th>
                <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Bills</th>
                <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Savings Rate</th>
                <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Avg Days</th>
                <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {providerPerformanceData.map((provider) => (
                <tr key={provider.provider} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: colors.text }}>{provider.provider}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', color: colors.text }}>{provider.bills}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      backgroundColor: provider.savings >= 55 
                        ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                        : provider.savings >= 50
                        ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7')
                        : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                      color: provider.savings >= 55 
                        ? chartColors.success
                        : provider.savings >= 50
                        ? chartColors.amber
                        : (isDark ? '#f87171' : '#dc2626'),
                    }}>
                      {provider.savings}%
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', color: colors.text }}>{provider.avgDays} days</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                      color: chartColors.success,
                    }}>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
