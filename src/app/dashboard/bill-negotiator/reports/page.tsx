'use client';

import { useState } from 'react';
import { useTheme } from '../ThemeProvider';
import { motion } from 'framer-motion';
import { DEMO_MODE } from '@/lib/sirkl-api';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: string[];
  formats: string[];
}

const reportTypes: ReportConfig[] = [
  {
    id: 'savings-summary',
    name: 'Savings Summary',
    description: 'Total savings, bills processed, and average savings rate',
    icon: '💰',
    fields: ['Period', 'Total Billed', 'Total Saved', 'Savings Rate', 'Bills Count'],
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'provider-performance',
    name: 'Provider Performance',
    description: 'Detailed breakdown by provider with settlement rates',
    icon: '🏥',
    fields: ['Provider', 'Bills', 'Avg Savings', 'Response Time', 'Acceptance Rate'],
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'bill-detail',
    name: 'Bill Detail Export',
    description: 'Full export of all bills with line-item details',
    icon: '📄',
    fields: ['Bill ID', 'Provider', 'Member', 'Billed', 'Settled', 'Status', 'Dates'],
    formats: ['CSV', 'Excel'],
  },
  {
    id: 'negotiation-log',
    name: 'Negotiation Activity Log',
    description: 'Timeline of all negotiation actions and communications',
    icon: '📋',
    fields: ['Timestamp', 'Bill', 'Action', 'Details', 'User'],
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'monthly-executive',
    name: 'Monthly Executive Summary',
    description: 'High-level overview for leadership with key metrics',
    icon: '📊',
    fields: ['Metrics', 'Trends', 'Top Providers', 'Projections'],
    formats: ['PDF'],
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit Trail',
    description: 'Complete audit log for regulatory compliance',
    icon: '🔒',
    fields: ['Timestamp', 'Action', 'User', 'IP', 'Changes'],
    formats: ['PDF', 'CSV'],
  },
];

const recentExports = [
  { id: 1, name: 'Savings Summary - March 2026', type: 'savings-summary', format: 'PDF', date: '2026-03-13', size: '245 KB', status: 'ready' },
  { id: 2, name: 'Provider Performance Q1', type: 'provider-performance', format: 'Excel', date: '2026-03-12', size: '1.2 MB', status: 'ready' },
  { id: 3, name: 'Bill Detail Export', type: 'bill-detail', format: 'CSV', date: '2026-03-10', size: '3.4 MB', status: 'ready' },
  { id: 4, name: 'February Executive Summary', type: 'monthly-executive', format: 'PDF', date: '2026-03-01', size: '890 KB', status: 'ready' },
];

const scheduledReports = [
  { id: 1, name: 'Weekly Savings Summary', frequency: 'Every Monday', nextRun: '2026-03-18', recipients: 2 },
  { id: 2, name: 'Monthly Executive Report', frequency: '1st of month', nextRun: '2026-04-01', recipients: 5 },
];

export default function ReportsPage() {
  const { isDark, colors } = useTheme();
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [dateRange, setDateRange] = useState({ start: '2026-03-01', end: '2026-03-31' });
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [generating, setGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!selectedReport) return;
    setGenerating(true);
    
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setGenerating(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Reports
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Generate and export reports
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
                DEMO
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            padding: '16px 20px',
            marginBottom: '24px',
            borderRadius: '12px',
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
            border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#86efac'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>✅</span>
          <div>
            <p style={{ fontWeight: '600', color: isDark ? '#4ade80' : '#16a34a' }}>Report Generated!</p>
            <p style={{ fontSize: '13px', color: isDark ? '#86efac' : '#15803d' }}>Your report is ready for download.</p>
          </div>
          <button style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            backgroundColor: isDark ? '#4ade80' : '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: 'pointer',
          }}>
            Download
          </button>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Report Types */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '16px' }}>
            Available Reports
          </h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {reportTypes.map((report, i) => {
              const isSelected = selectedReport?.id === report.id;
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    setSelectedReport(report);
                    setSelectedFormat(report.formats[0]);
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: isSelected ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    backgroundColor: isSelected ? (isDark ? 'rgba(102, 34, 246, 0.1)' : '#f5f3ff') : colors.surface,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? colors.accent : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0,
                    }}>
                      {report.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
                        {report.name}
                      </h3>
                      <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '12px' }}>
                        {report.description}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {report.formats.map(format => (
                          <span key={format} style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                            color: colors.textMuted,
                          }}>
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: colors.accent,
                        }} />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Configuration Panel */}
        <div>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            padding: '24px',
            position: 'sticky',
            top: '24px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
              Generate Report
            </h2>

            {!selectedReport ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
                <p>Select a report type to configure</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>{selectedReport.icon}</span>
                    <span style={{ fontWeight: '600', color: colors.text }}>{selectedReport.name}</span>
                  </div>
                </div>

                {/* Date Range */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Date Range
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.bg,
                        color: colors.text,
                        fontSize: '14px',
                      }}
                    />
                    <span style={{ alignSelf: 'center', color: colors.textMuted }}>to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.bg,
                        color: colors.text,
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                {/* Format */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Format
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedReport.formats.map(format => (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: selectedFormat === format ? colors.accent : colors.bg,
                          color: selectedFormat === format ? '#fff' : colors.text,
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fields Preview */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Included Fields
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedReport.fields.map(field => (
                      <span key={field} style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                        color: colors.textMuted,
                      }}>
                        ✓ {field}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.gradient,
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: generating ? 'wait' : 'pointer',
                    opacity: generating ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {generating ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Generate Report
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Recent Exports */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            marginTop: '24px',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>Recent Exports</h3>
            </div>
            {recentExports.map((exp, i) => (
              <div
                key={exp.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: i < recentExports.length - 1 ? `1px solid ${colors.border}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: colors.text }}>{exp.name}</p>
                  <p style={{ fontSize: '12px', color: colors.textMuted }}>{exp.date} • {exp.size}</p>
                </div>
                <button style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}>
                  ↓
                </button>
              </div>
            ))}
          </div>

          {/* Scheduled Reports */}
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            marginTop: '24px',
            overflow: 'hidden',
          }}>
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>Scheduled Reports</h3>
              <button style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.textMuted,
                fontSize: '12px',
                cursor: 'pointer',
              }}>
                + Add
              </button>
            </div>
            {scheduledReports.map((report, i) => (
              <div
                key={report.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: i < scheduledReports.length - 1 ? `1px solid ${colors.border}` : 'none',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: '500', color: colors.text, marginBottom: '4px' }}>{report.name}</p>
                <p style={{ fontSize: '12px', color: colors.textMuted }}>
                  {report.frequency} • Next: {report.nextRun} • {report.recipients} recipients
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}
