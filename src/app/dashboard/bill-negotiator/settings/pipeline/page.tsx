'use client';

import { useState } from 'react';
import { useTheme } from '../../ThemeProvider';

export default function PipelineSettingsPage() {
  const { isDark, colors } = useTheme();
  const [autoProcess, setAutoProcess] = useState(true);
  const [autoNegotiate, setAutoNegotiate] = useState(true);
  const [threshold, setThreshold] = useState('500');

  const stages = [
    { id: 'intake', name: 'Bill Intake', enabled: true, autoTime: '< 1 hour', actions: ['OCR Extraction', 'Data Validation', 'Duplicate Check'] },
    { id: 'processing', name: 'Processing', enabled: true, autoTime: '< 4 hours', actions: ['Medicare Rate Lookup', 'Fair Price Calculation', 'Provider Match'] },
    { id: 'negotiation', name: 'Negotiation', enabled: true, autoTime: '24-72 hours', actions: ['Offer Letter Generation', 'Provider Contact', 'Response Tracking'] },
    { id: 'settlement', name: 'Settlement', enabled: true, autoTime: '< 24 hours', actions: ['Agreement Confirmation', 'Payment Processing', 'Member Notification'] },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
          Pipeline Settings
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Configure bill processing automation and workflow
        </p>
      </div>

      {/* Automation Settings */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
          Automation
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Auto Process Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>Auto-Process Bills</p>
              <p style={{ fontSize: '13px', color: colors.textMuted }}>Automatically extract and validate bill data</p>
            </div>
            <button
              onClick={() => setAutoProcess(!autoProcess)}
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: autoProcess ? colors.accent : colors.border,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                position: 'absolute',
                top: '3px',
                left: autoProcess ? '27px' : '3px',
                transition: 'all 0.2s',
              }} />
            </button>
          </div>

          {/* Auto Negotiate Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>Auto-Negotiate</p>
              <p style={{ fontSize: '13px', color: colors.textMuted }}>Automatically send negotiation offers to providers</p>
            </div>
            <button
              onClick={() => setAutoNegotiate(!autoNegotiate)}
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: autoNegotiate ? colors.accent : colors.border,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                position: 'absolute',
                top: '3px',
                left: autoNegotiate ? '27px' : '3px',
                transition: 'all 0.2s',
              }} />
            </button>
          </div>

          {/* Threshold */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>Review Threshold</p>
              <p style={{ fontSize: '13px', color: colors.textMuted }}>Bills above this amount require manual review</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: colors.text }}>$</span>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                style={{
                  width: '100px',
                  padding: '8px 12px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  color: colors.text,
                  fontSize: '14px',
                  textAlign: 'right',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Pipeline Stages</h2>
        </div>

        {stages.map((stage, i) => (
          <div
            key={stage.id}
            style={{
              padding: '24px',
              borderBottom: i < stages.length - 1 ? `1px solid ${colors.border}` : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: isDark ? colors.accentLight : '#f1f5f9',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.accent,
                  fontWeight: '700',
                }}>
                  {i + 1}
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>{stage.name}</p>
                  <p style={{ fontSize: '13px', color: colors.textMuted }}>Target: {stage.autoTime}</p>
                </div>
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                color: isDark ? '#4ade80' : '#16a34a',
              }}>
                Active
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '56px' }}>
              {stage.actions.map((action) => (
                <span key={action} style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  backgroundColor: colors.bg,
                  borderRadius: '6px',
                  color: colors.textMuted,
                }}>
                  {action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SLA Settings */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
        marginTop: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
          SLA Configuration
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'Initial Response', value: '24 hours' },
            { label: 'Negotiation Window', value: '7 days' },
            { label: 'Settlement Target', value: '14 days' },
          ].map((sla) => (
            <div key={sla.label} style={{
              padding: '16px',
              backgroundColor: colors.bg,
              borderRadius: '10px',
            }}>
              <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>{sla.label}</p>
              <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>{sla.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button style={{
          padding: '12px 24px',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          color: colors.text,
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
        }}>
          Reset to Defaults
        </button>
        <button style={{
          padding: '12px 24px',
          background: colors.gradient,
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
        }}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
