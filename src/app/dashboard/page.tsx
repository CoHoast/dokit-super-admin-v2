'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';

// Design tokens matching client dashboard
const colors = {
  // Text
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Backgrounds
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  
  // Primary purple
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  
  // Accent colors (more muted/professional)
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
  
  // Borders
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
};

export default function DashboardPage() {
  const { selectedClient, clients } = useClient();
  const [copiedEmail, setCopiedEmail] = useState(false);

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
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  const client = selectedClient || clients[0];
  const clientSlug = client?.name?.toLowerCase().replace(/\s+/g, '-') || 'client';

  // Mock data
  const stats = {
    totalDocuments: 2847,
    processedToday: 47,
    avgProcessing: 8.3,
    aiAccuracy: 99.2,
  };

  const processingStatus = {
    completed: 2784,
    pendingReview: 12,
    processing: 3,
    failed: 48,
  };
  const totalDocs = Object.values(processingStatus).reduce((a, b) => a + b, 0);
  const successRate = ((processingStatus.completed / totalDocs) * 100).toFixed(1);

  const documentTypes = [
    { type: 'CMS-1500', count: 1842, color: colors.purple },
    { type: 'UB-04', count: 623, color: colors.amber },
    { type: 'EOB', count: 284, color: colors.cyan },
    { type: 'Other', count: 98, color: colors.gray },
  ];
  const maxDocCount = Math.max(...documentTypes.map(d => d.count));

  const recentDocuments = [
    { name: 'CMS-1500_Johnson_Sarah.pdf', type: 'CMS-1500', subtype: 'Professional Claim', time: '2 min ago', status: 'Completed', confidence: 98, iconColor: colors.purpleLight, iconStroke: colors.purple },
    { name: 'UB04_Memorial_Hospital_03072026.pdf', type: 'UB-04', subtype: 'Institutional Claim', time: '5 min ago', status: 'Completed', confidence: 96, iconColor: colors.amberLight, iconStroke: colors.amber },
    { name: 'EOB_BlueCross_Batch_247.pdf', type: 'EOB', subtype: 'Explanation of Benefits', time: '8 min ago', status: 'Review', confidence: 87, iconColor: colors.cyanLight, iconStroke: colors.cyan },
    { name: 'CMS-1500_Williams_Michael.pdf', type: 'CMS-1500', subtype: 'Professional Claim', time: '12 min ago', status: 'Completed', confidence: 99, iconColor: colors.purpleLight, iconStroke: colors.purple },
    { name: 'Invoice_Unclear_Scan.pdf', type: 'Unknown', subtype: 'Unknown Type', time: '15 min ago', status: 'Failed', confidence: null, iconColor: colors.roseLight, iconStroke: colors.rose },
  ];

  const copyEmail = () => {
    navigator.clipboard.writeText(`intake-${clientSlug}@dokit.ai`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary }}>
          Welcome back, {client?.name?.split(' ')[0] || 'Admin'}
        </p>
      </div>

      {/* Email Intake Card with Gradient Background */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.05) 50%, rgba(59, 130, 246, 0.05) 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative gradient orb */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-40px',
          right: '100px',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: colors.purple,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: colors.purple, marginBottom: '4px' }}>
                Your Intake Email
              </p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>
                intake-{clientSlug}@dokit.ai
              </p>
              <p style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '4px' }}>
                Forward documents here for automatic AI processing
              </p>
            </div>
          </div>
          
          <button 
            onClick={copyEmail}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'white',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              color: colors.text,
              transition: 'all 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            {copiedEmail ? 'Copied!' : 'Copy Email'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        {/* Total Documents */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
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
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              background: colors.greenLight,
              color: colors.green
            }}>
              +12%
            </span>
          </div>
          <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Total Documents</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px' }}>
            {stats.totalDocuments.toLocaleString()}
          </p>
        </div>

        {/* Processed Today */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: colors.greenLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.green} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              background: colors.greenLight,
              color: colors.green
            }}>
              Live
            </span>
          </div>
          <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Processed Today</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px' }}>
            {stats.processedToday}
          </p>
        </div>

        {/* Avg Processing */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
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
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              background: colors.greenLight,
              color: colors.green
            }}>
              -23%
            </span>
          </div>
          <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Avg Processing</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px' }}>
            {stats.avgProcessing}<span style={{ fontSize: '16px', fontWeight: '500', color: colors.textMuted }}>s</span>
          </p>
        </div>

        {/* AI Accuracy */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: colors.roseLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.rose} strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>AI Accuracy</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px' }}>
            {stats.aiAccuracy}<span style={{ fontSize: '16px', fontWeight: '500', color: colors.textMuted }}>%</span>
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        
        {/* Recent Documents */}
        <div style={{
          background: colors.cardBg,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '18px 20px', 
            borderBottom: `1px solid ${colors.borderLight}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>
                Recent Documents
              </h2>
              <p style={{ fontSize: '13px', color: colors.textMuted }}>
                Latest processed documents
              </p>
            </div>
            <Link href="/dashboard/documents" style={{
              fontSize: '13px',
              fontWeight: '500',
              color: colors.purple,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          
          <div>
            {recentDocuments.map((doc, index) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                'Completed': { bg: colors.greenLight, text: colors.green },
                'Review': { bg: colors.amberLight, text: colors.amber },
                'Failed': { bg: colors.roseLight, text: colors.rose },
              };
              const statusStyle = statusColors[doc.status] || statusColors['Failed'];
              
              return (
                <div 
                  key={index}
                  style={{
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    borderBottom: index < recentDocuments.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.borderLight}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Document Type Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: doc.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={doc.iconStroke} strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  
                  {/* Document Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: colors.text,
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {doc.name}
                    </p>
                    <p style={{ fontSize: '12px', color: colors.textMuted }}>
                      {doc.subtype} • {doc.time}
                    </p>
                  </div>
                  
                  {/* Status & Confidence */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: statusStyle.bg,
                      color: statusStyle.text
                    }}>
                      {doc.status}
                    </span>
                    {doc.confidence !== null ? (
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: doc.confidence >= 95 ? colors.green : doc.confidence >= 85 ? colors.amber : colors.rose,
                        minWidth: '36px',
                        textAlign: 'right'
                      }}>
                        {doc.confidence}%
                      </span>
                    ) : (
                      <span style={{ fontSize: '13px', color: colors.textMuted, minWidth: '36px', textAlign: 'right' }}>
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Processing Status */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>
              Processing Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.green }} />
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>Completed</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{processingStatus.completed.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.amber }} />
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>Pending Review</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{processingStatus.pendingReview}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.cyan }} />
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>Processing</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{processingStatus.processing}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.rose }} />
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>Failed</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{processingStatus.failed}</span>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                Success Rate
              </h3>
              <span style={{ fontSize: '14px', fontWeight: '700', color: colors.green }}>
                {successRate}%
              </span>
            </div>
            <div style={{ 
              height: '8px', 
              borderRadius: '4px', 
              background: colors.borderLight,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${successRate}%`,
                background: colors.green,
                borderRadius: '4px'
              }} />
            </div>
          </div>

          {/* Document Types */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>
              Document Types
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {documentTypes.map((doc, index) => (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: colors.textSecondary }}>{doc.type}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{doc.count.toLocaleString()}</span>
                  </div>
                  <div style={{ 
                    height: '6px', 
                    borderRadius: '3px', 
                    background: colors.borderLight,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(doc.count / maxDocCount) * 100}%`,
                      background: doc.color,
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '14px' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/dashboard/documents/upload" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: colors.text,
                fontSize: '13px',
                fontWeight: '500',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.borderLight}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                Upload Documents
              </Link>
              <Link href="/dashboard/queue" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: colors.text,
                fontSize: '13px',
                fontWeight: '500',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.borderLight}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                Review Queue ({processingStatus.pendingReview})
              </Link>
              <Link href="/dashboard/reports" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: colors.text,
                fontSize: '13px',
                fontWeight: '500',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.borderLight}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.cyan} strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export Report
              </Link>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
