'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';

// Premium design tokens - Omeya Sale inspired
const colors = {
  // Primary navy (the wow factor)
  navy: '#1a1f36',
  navyLight: '#252a42',
  
  // Backgrounds
  pageBg: '#f8f9fc',
  cardBg: '#ffffff',
  
  // Purple accent
  purple: '#7c3aed',
  purpleLight: '#a78bfa',
  purpleBg: '#f3f0ff',
  
  // Text
  text: '#1a1f36',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Accent colors
  green: '#10b981',
  greenLight: '#d1fae5',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  blue: '#3b82f6',
  blueLight: '#dbeafe',
  rose: '#f43f5e',
  roseLight: '#ffe4e6',
  cyan: '#06b6d4',
  
  // Borders
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
};

// Area chart component with gradient
const AreaChart = ({ data, height = 200 }: { data: number[], height?: number }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const padding = 0;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: `${height}px` }}>
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.purple} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colors.purple} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors.purpleLight} />
          <stop offset="100%" stopColor={colors.purple} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#areaGradient)" />
      <polyline 
        points={points} 
        fill="none" 
        stroke="url(#lineGradient)" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Mini sparkline
const Sparkline = ({ data, color = colors.purple }: { data: number[], color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - 2 - ((value - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '60px', height: '24px' }}>
      <polyline 
        points={points} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Bar chart component
const BarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const max = Math.max(...data.map(d => d.value));
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
      {data.map((item, index) => (
        <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '100%',
            height: `${(item.value / max) * 60}px`,
            background: item.color,
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.5s ease-out'
          }} />
          <span style={{ fontSize: '10px', color: colors.textMuted }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { selectedClient, clients, selectClient } = useClient();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Loading state
  if (!clients || clients.length === 0) {
    return (
      <div style={{ 
        padding: '48px 32px', 
        background: colors.pageBg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.purple,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ fontSize: '15px', color: colors.textMuted }}>Loading...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  const client = selectedClient || clients[0];
  const greeting = currentTime.getHours() < 12 ? 'Good morning' : currentTime.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  // Mock data - this would come from API
  const chartData = [45, 52, 38, 65, 48, 72, 56, 78, 62, 85, 74, 92, 88, 95, 82, 98, 105, 92, 115, 108, 125, 118, 132, 128];
  const weeklyData = [
    { label: 'Mon', value: 45, color: colors.purple },
    { label: 'Tue', value: 62, color: colors.purple },
    { label: 'Wed', value: 38, color: colors.purple },
    { label: 'Thu', value: 78, color: colors.purple },
    { label: 'Fri', value: 55, color: colors.purple },
    { label: 'Sat', value: 25, color: `${colors.purple}60` },
    { label: 'Sun', value: 15, color: `${colors.purple}60` },
  ];

  const stats = {
    totalProcessed: 12456,
    savingsGenerated: 284750,
    avgProcessingTime: 4.2,
    accuracyRate: 99.4,
    todayProcessed: 127,
    pendingReview: 23,
  };

  const recentActivity = [
    { type: 'completed', doc: 'CMS-1500_Johnson.pdf', time: '2 min ago', confidence: 98 },
    { type: 'completed', doc: 'UB04_Memorial.pdf', time: '5 min ago', confidence: 96 },
    { type: 'review', doc: 'EOB_BlueCross.pdf', time: '8 min ago', confidence: 87 },
    { type: 'completed', doc: 'Invoice_Scan.pdf', time: '12 min ago', confidence: 94 },
  ];

  return (
    <div style={{ 
      padding: '32px',
      minHeight: '100vh',
      background: colors.pageBg
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Hero Section with Navy Background */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
          borderRadius: '20px',
          padding: '32px 40px',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${colors.purple}20 0%, transparent 70%)`,
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            right: '200px',
            width: '120px',
            height: '120px',
            background: `radial-gradient(circle, ${colors.purpleLight}15 0%, transparent 70%)`,
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  color: '#ffffff',
                  marginBottom: '8px',
                  letterSpacing: '-0.5px'
                }}>
                  {greeting}, Admin
                </h1>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                  Here's what's happening with {client?.name || 'your documents'} today.
                </p>
                
                {/* Key stats in hero */}
                <div style={{ display: 'flex', gap: '48px' }}>
                  <div>
                    <p style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', letterSpacing: '-1px' }}>
                      ${(stats.savingsGenerated).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      Total Savings Generated
                    </p>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  <div>
                    <p style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', letterSpacing: '-1px' }}>
                      {stats.totalProcessed.toLocaleString()}
                    </p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      Documents Processed
                    </p>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  <div>
                    <p style={{ fontSize: '36px', fontWeight: '700', color: '#ffffff', letterSpacing: '-1px' }}>
                      {stats.accuracyRate}%
                    </p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      AI Accuracy Rate
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Live indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px 16px',
                borderRadius: '20px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: colors.green,
                  boxShadow: `0 0 8px ${colors.green}`,
                  animation: 'pulse 2s infinite'
                }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
                  Live
                </span>
                <style jsx>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                `}</style>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '20px', 
          marginBottom: '28px' 
        }}>
          {/* Processed Today */}
          <div 
            style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: hoveredCard === 'today' ? 'translateY(-4px)' : 'none',
              boxShadow: hoveredCard === 'today' ? '0 8px 25px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredCard('today')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: colors.purpleBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <Sparkline data={[12, 19, 15, 25, 22, 30, 28]} color={colors.purple} />
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
              {stats.todayProcessed}
            </p>
            <p style={{ fontSize: '13px', color: colors.textMuted }}>
              Processed Today
            </p>
          </div>

          {/* Pending Review */}
          <div 
            style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: hoveredCard === 'pending' ? 'translateY(-4px)' : 'none',
              boxShadow: hoveredCard === 'pending' ? '0 8px 25px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredCard('pending')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: colors.amberLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                background: colors.amberLight,
                color: colors.amber
              }}>
                Action needed
              </span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
              {stats.pendingReview}
            </p>
            <p style={{ fontSize: '13px', color: colors.textMuted }}>
              Pending Review
            </p>
          </div>

          {/* Avg Processing Time */}
          <div 
            style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: hoveredCard === 'time' ? 'translateY(-4px)' : 'none',
              boxShadow: hoveredCard === 'time' ? '0 8px 25px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredCard('time')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: colors.greenLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.green} strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                background: colors.greenLight,
                color: colors.green
              }}>
                -18%
              </span>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
              {stats.avgProcessingTime}<span style={{ fontSize: '18px', fontWeight: '500', color: colors.textMuted }}>s</span>
            </p>
            <p style={{ fontSize: '13px', color: colors.textMuted }}>
              Avg Processing Time
            </p>
          </div>

          {/* Success Rate */}
          <div 
            style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: hoveredCard === 'success' ? 'translateY(-4px)' : 'none',
              boxShadow: hoveredCard === 'success' ? '0 8px 25px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredCard('success')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: colors.blueLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '700', color: colors.text, letterSpacing: '-1px', marginBottom: '4px' }}>
              98.7<span style={{ fontSize: '18px', fontWeight: '500', color: colors.textMuted }}>%</span>
            </p>
            <p style={{ fontSize: '13px', color: colors.textMuted }}>
              Success Rate
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          
          {/* Processing Trends Chart */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
                  Processing Trends
                </h2>
                <p style={{ fontSize: '13px', color: colors.textMuted }}>
                  Documents processed over time
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['7D', '30D', '90D'].map((period, i) => (
                  <button 
                    key={period}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: i === 1 ? colors.navy : 'transparent',
                      color: i === 1 ? '#fff' : colors.textSecondary,
                      transition: 'all 0.15s'
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            <AreaChart data={chartData} height={220} />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.borderLight}`
            }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '3px', borderRadius: '2px', background: colors.purple }} />
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>This period</span>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                <span style={{ fontWeight: '600', color: colors.green }}>↑ 24%</span> vs last period
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Weekly Overview */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
                This Week
              </h3>
              <BarChart data={weeklyData} />
            </div>

            {/* Live Activity */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              flex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>
                  Live Activity
                </h3>
                <Link href="/dashboard/documents" style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.purple,
                  textDecoration: 'none'
                }}>
                  View all →
                </Link>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivity.map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: colors.pageBg,
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.type === 'completed' ? colors.green : colors.amber,
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '13px', 
                        fontWeight: '500', 
                        color: colors.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.doc}
                      </p>
                      <p style={{ fontSize: '11px', color: colors.textMuted }}>
                        {item.time}
                      </p>
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: item.confidence >= 95 ? colors.green : item.confidence >= 85 ? colors.amber : colors.rose
                    }}>
                      {item.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { icon: '📄', title: 'Upload Documents', desc: 'Drag and drop or browse files', link: '/dashboard/documents/upload' },
              { icon: '⚙️', title: 'Configure Workflows', desc: 'Set up extraction rules', link: '/dashboard/workflows' },
              { icon: '📊', title: 'View Reports', desc: 'Analytics and exports', link: '/dashboard/reports' },
            ].map((action, i) => (
              <Link key={i} href={action.link} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: colors.cardBg,
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: `1px solid ${colors.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.purple;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,58,237,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
                >
                  <span style={{ fontSize: '28px' }}>{action.icon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>
                      {action.title}
                    </p>
                    <p style={{ fontSize: '12px', color: colors.textMuted }}>
                      {action.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
