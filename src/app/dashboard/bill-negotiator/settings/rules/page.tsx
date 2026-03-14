'use client';

import { useState } from 'react';
import { useTheme } from '../../ThemeProvider';

const defaultRules = [
  { id: 1, name: 'Medicare + 20%', type: 'percentage', value: 120, description: 'Pay 120% of Medicare rates', priority: 1, enabled: true },
  { id: 2, name: 'Medicare + 40% (Hospitals)', type: 'percentage', value: 140, description: 'Higher rate for hospital facilities', priority: 2, enabled: true, condition: 'Hospital' },
  { id: 3, name: 'Cash Pay Discount', type: 'percentage', value: 50, description: '50% of billed for cash payment', priority: 3, enabled: true },
  { id: 4, name: 'Max Cap $10K', type: 'cap', value: 10000, description: 'Maximum payment cap per bill', priority: 4, enabled: true },
];

export default function NegotiationRulesPage() {
  const { isDark, colors } = useTheme();
  const [rules, setRules] = useState(defaultRules);
  const [showAddModal, setShowAddModal] = useState(false);
  const [, setEditingRule] = useState<typeof rules[0] | null>(null);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Negotiation Rules
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Configure pricing rules and negotiation strategies
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: colors.gradient,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Rule
        </button>
      </div>

      {/* Default Strategy */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
          Default Strategy
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
              Base Rate Method
            </label>
            <select style={{
              width: '100%',
              padding: '12px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: '14px',
            }}>
              <option>Medicare Allowable</option>
              <option>Medicaid Rate</option>
              <option>Fair Health Data</option>
              <option>Custom Schedule</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
              Default Multiplier
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                defaultValue="120"
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                  fontSize: '14px',
                }}
              />
              <span style={{ color: colors.textMuted }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Active Rules</h2>
          <span style={{ fontSize: '13px', color: colors.textMuted }}>
            Rules are applied in priority order
          </span>
        </div>

        {rules.map((rule, i) => (
          <div
            key={rule.id}
            style={{
              padding: '20px 24px',
              borderBottom: i < rules.length - 1 ? `1px solid ${colors.border}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: rule.enabled ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: isDark ? colors.accentLight : '#f1f5f9',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.accent,
                fontWeight: '600',
                fontSize: '14px',
              }}>
                {rule.priority}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>{rule.name}</p>
                  {rule.condition && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: colors.bg,
                      borderRadius: '4px',
                      color: colors.textMuted,
                    }}>
                      {rule.condition}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: colors.textMuted }}>{rule.description}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{
                fontSize: '15px',
                fontWeight: '600',
                color: rule.type === 'cap' ? colors.accent : (isDark ? '#4ade80' : '#16a34a'),
              }}>
                {rule.type === 'cap' ? `$${rule.value.toLocaleString()}` : `${rule.value}%`}
              </span>
              
              <button
                onClick={() => setEditingRule(rule)}
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.textMuted,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              <button
                onClick={() => toggleRule(rule.id)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: rule.enabled ? colors.accent : colors.border,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: '3px',
                  left: rule.enabled ? '23px' : '3px',
                  transition: 'all 0.2s',
                }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Provider-Specific Rules */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
        marginTop: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>Provider-Specific Rates</h2>
          <button style={{
            padding: '8px 16px',
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            color: colors.text,
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}>
            + Add Provider
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'Cleveland Medical Center', rate: 'Medicare + 15%', contracts: 3 },
            { name: 'University Hospital', rate: 'Medicare + 25%', contracts: 2 },
            { name: 'Regional Health Network', rate: 'Custom Schedule', contracts: 5 },
          ].map((provider) => (
            <div
              key={provider.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: colors.bg,
                borderRadius: '10px',
              }}
            >
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{provider.name}</p>
                <p style={{ fontSize: '13px', color: colors.textMuted }}>{provider.contracts} active contracts</p>
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: '500',
                padding: '6px 12px',
                backgroundColor: colors.surface,
                borderRadius: '6px',
                color: colors.accent,
              }}>
                {provider.rate}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
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
          Cancel
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

      {/* Add Rule Modal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Add New Rule</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Medicare + 30%"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Rule Type
                  </label>
                  <select style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                  }}>
                    <option>Percentage of Medicare</option>
                    <option>Fixed Amount</option>
                    <option>Maximum Cap</option>
                    <option>Discount from Billed</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                    Value
                  </label>
                  <input
                    type="number"
                    placeholder="120"
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      color: colors.text,
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: colors.gradient,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
