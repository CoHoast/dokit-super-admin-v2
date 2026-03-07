'use client';

// Phase 2D: Automation Settings Component

import { useState, useEffect } from 'react';

interface NegotiationSettings {
  autonomy_level: 'manual' | 'semi_autonomous' | 'fully_autonomous';
  default_initial_offer_percent: number;
  max_offer_percent: number;
  min_offer_percent: number;
  auto_accept_threshold: number;
  max_negotiation_rounds: number;
  counter_increment_percent: number;
  days_to_respond: number;
  days_before_followup: number;
  days_before_escalation: number;
  auto_send_method: 'fax' | 'email' | 'both' | 'none';
  require_fax_confirmation: boolean;
  notify_on_new_bill: boolean;
  notify_on_response: boolean;
  notify_on_settlement: boolean;
  notify_on_escalation: boolean;
  notification_emails: string[];
  // Response timing settings (to appear more human)
  response_delay_mode: 'instant' | 'quick' | 'natural' | 'deliberate' | 'custom';
  response_delay_min_minutes: number;
  response_delay_max_minutes: number;
  response_business_hours_only: boolean;
  response_weekdays_only: boolean;
}

interface AutomationSettingsProps {
  clientId: number;
  onSave?: (settings: NegotiationSettings) => void;
}

export function AutomationSettings({ clientId, onSave }: AutomationSettingsProps) {
  const [settings, setSettings] = useState<NegotiationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [clientId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/rules/settings/${clientId}`);
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`/api/rules/settings/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Settings saved successfully');
        onSave?.(data.settings);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NegotiationSettings>(
    key: K,
    value: NegotiationSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const addEmail = () => {
    if (!emailInput || !settings) return;
    if (settings.notification_emails.includes(emailInput)) return;
    updateSetting('notification_emails', [...settings.notification_emails, emailInput]);
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    if (!settings) return;
    updateSetting(
      'notification_emails',
      settings.notification_emails.filter(e => e !== email)
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        Loading settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>
        Failed to load settings: {error}
      </div>
    );
  }

  const styles = {
    container: {
      padding: '24px'
    },
    section: {
      marginBottom: '32px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    card: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px'
    },
    field: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    hint: {
      fontSize: '12px',
      color: '#64748b',
      marginTop: '4px'
    },
    input: {
      width: '100%',
      maxWidth: '200px',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      maxWidth: '300px',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#fff'
    },
    autonomyCard: (active: boolean) => ({
      padding: '16px',
      border: active ? '2px solid #8B5CF6' : '1px solid #e2e8f0',
      borderRadius: '10px',
      background: active ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : '#fff',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }),
    autonomyTitle: {
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '4px'
    },
    autonomyDesc: {
      fontSize: '13px',
      color: '#64748b'
    },
    toggle: (enabled: boolean) => ({
      width: '48px',
      height: '26px',
      borderRadius: '13px',
      background: enabled ? '#8B5CF6' : '#d1d5db',
      position: 'relative' as const,
      cursor: 'pointer',
      transition: 'background 0.2s'
    }),
    toggleKnob: (enabled: boolean) => ({
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute' as const,
      top: '2px',
      left: enabled ? '24px' : '2px',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }),
    row: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap' as const
    },
    emailTag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: '#f1f5f9',
      borderRadius: '6px',
      fontSize: '13px',
      marginRight: '8px',
      marginBottom: '8px'
    },
    removeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#94a3b8',
      fontSize: '16px',
      padding: '0'
    },
    error: {
      padding: '12px 16px',
      background: '#fef2f2',
      color: '#dc2626',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    success: {
      padding: '12px 16px',
      background: '#f0fdf4',
      color: '#16a34a',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    saveButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      {error && <div style={styles.error}>❌ {error}</div>}
      {success && <div style={styles.success}>✅ {success}</div>}

      {/* Autonomy Level */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🤖 Autonomy Level</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div
            style={styles.autonomyCard(settings.autonomy_level === 'manual')}
            onClick={() => updateSetting('autonomy_level', 'manual')}
          >
            <div style={styles.autonomyTitle}>🔒 Manual</div>
            <div style={styles.autonomyDesc}>
              Staff controls all actions. No automation.
            </div>
          </div>
          <div
            style={styles.autonomyCard(settings.autonomy_level === 'semi_autonomous')}
            onClick={() => updateSetting('autonomy_level', 'semi_autonomous')}
          >
            <div style={styles.autonomyTitle}>⚡ Semi-Autonomous</div>
            <div style={styles.autonomyDesc}>
              AI suggests actions, staff approves. Auto-analyze and notify.
            </div>
          </div>
          <div
            style={styles.autonomyCard(settings.autonomy_level === 'fully_autonomous')}
            onClick={() => updateSetting('autonomy_level', 'fully_autonomous')}
          >
            <div style={styles.autonomyTitle}>🚀 Fully Autonomous</div>
            <div style={styles.autonomyDesc}>
              AI handles negotiation within rules. Staff monitors.
            </div>
          </div>
        </div>
      </div>

      {/* Offer Settings */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💰 Offer Settings</h3>
        <div style={styles.card}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Initial Offer %</label>
              <input
                type="number"
                style={styles.input}
                value={settings.default_initial_offer_percent}
                onChange={e => updateSetting('default_initial_offer_percent', parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <div style={styles.hint}>Start offers at this % of billed amount</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Min Offer %</label>
              <input
                type="number"
                style={styles.input}
                value={settings.min_offer_percent}
                onChange={e => updateSetting('min_offer_percent', parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <div style={styles.hint}>Never offer less than this</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Max Offer %</label>
              <input
                type="number"
                style={styles.input}
                value={settings.max_offer_percent}
                onChange={e => updateSetting('max_offer_percent', parseInt(e.target.value))}
                min={1}
                max={100}
              />
              <div style={styles.hint}>Never offer more than this</div>
            </div>
          </div>
        </div>
      </div>

      {/* Counter Response Settings */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔄 Counter Response</h3>
        <div style={styles.card}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Auto-Accept Threshold %</label>
              <input
                type="number"
                style={styles.input}
                value={settings.auto_accept_threshold}
                onChange={e => updateSetting('auto_accept_threshold', parseInt(e.target.value))}
                min={0}
                max={50}
              />
              <div style={styles.hint}>Accept if counter is within X% of our offer</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Counter Increment %</label>
              <input
                type="number"
                style={styles.input}
                value={settings.counter_increment_percent}
                onChange={e => updateSetting('counter_increment_percent', parseInt(e.target.value))}
                min={1}
                max={50}
              />
              <div style={styles.hint}>Increase offer by this % each round</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Max Rounds</label>
              <input
                type="number"
                style={styles.input}
                value={settings.max_negotiation_rounds}
                onChange={e => updateSetting('max_negotiation_rounds', parseInt(e.target.value))}
                min={1}
                max={10}
              />
              <div style={styles.hint}>Give up after this many rounds</div>
            </div>
          </div>
        </div>
      </div>

      {/* Response Timing - Human-like delays */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🕐 Response Timing</h3>
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          💡 <strong>Pro tip:</strong> Instant responses signal "bot" to providers. Adding natural delays increases settlement rates by making negotiations feel human.
        </div>
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Response Delay Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '8px' }}>
              {[
                { value: 'instant', label: '⚡ Instant', desc: '< 1 min (testing only)', min: 0, max: 1 },
                { value: 'quick', label: '🏃 Quick', desc: '15-30 minutes', min: 15, max: 30 },
                { value: 'natural', label: '🧑 Natural', desc: '1-4 hours (random)', min: 60, max: 240 },
                { value: 'deliberate', label: '🤔 Deliberate', desc: '4-24 hours', min: 240, max: 1440 },
                { value: 'custom', label: '⚙️ Custom', desc: 'Set your own', min: null, max: null },
              ].map(({ value, label, desc, min, max }) => (
                <div
                  key={value}
                  onClick={() => {
                    // Update all values at once to avoid state race conditions
                    if (!settings) return;
                    const updates: Partial<NegotiationSettings> = {
                      response_delay_mode: value as any
                    };
                    if (min !== null) updates.response_delay_min_minutes = min;
                    if (max !== null) updates.response_delay_max_minutes = max;
                    setSettings({ ...settings, ...updates });
                  }}
                  style={{
                    padding: '14px 12px',
                    border: settings.response_delay_mode === value ? '2px solid #8B5CF6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: settings.response_delay_mode === value ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Custom timing inputs - only show if custom mode */}
          {settings.response_delay_mode === 'custom' && (
            <div style={{ ...styles.row, marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={styles.field}>
                <label style={styles.label}>Minimum Delay (minutes)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={settings.response_delay_min_minutes}
                  onChange={e => updateSetting('response_delay_min_minutes', parseInt(e.target.value) || 0)}
                  min={0}
                />
                <div style={styles.hint}>At least this long before responding</div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Maximum Delay (minutes)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={settings.response_delay_max_minutes}
                  onChange={e => updateSetting('response_delay_max_minutes', parseInt(e.target.value) || 0)}
                  min={0}
                />
                <div style={styles.hint}>No longer than this (randomized within range)</div>
              </div>
            </div>
          )}
          
          {/* Business hours and weekday toggles */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={styles.toggle(settings.response_business_hours_only)}
                  onClick={() => updateSetting('response_business_hours_only', !settings.response_business_hours_only)}
                >
                  <div style={styles.toggleKnob(settings.response_business_hours_only)} />
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>Business hours only</span>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Only send between 8am - 6pm provider's time zone</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={styles.toggle(settings.response_weekdays_only)}
                  onClick={() => updateSetting('response_weekdays_only', !settings.response_weekdays_only)}
                >
                  <div style={styles.toggleKnob(settings.response_weekdays_only)} />
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>Weekdays only</span>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>No responses on Saturday or Sunday</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timing */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⏱️ Deadlines & Follow-ups</h3>
        <div style={styles.card}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Response Deadline (days)</label>
              <input
                type="number"
                style={styles.input}
                value={settings.days_to_respond}
                onChange={e => updateSetting('days_to_respond', parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Follow-up After (days)</label>
              <input
                type="number"
                style={styles.input}
                value={settings.days_before_followup}
                onChange={e => updateSetting('days_before_followup', parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Escalate After (days)</label>
              <input
                type="number"
                style={styles.input}
                value={settings.days_before_escalation}
                onChange={e => updateSetting('days_before_escalation', parseInt(e.target.value))}
                min={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Send */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📤 Auto-Send</h3>
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Auto-Send Method</label>
            <select
              style={styles.select}
              value={settings.auto_send_method}
              onChange={e => updateSetting('auto_send_method', e.target.value as any)}
            >
              <option value="none">None - Manual send only</option>
              <option value="fax">Fax only</option>
              <option value="email">Email only</option>
              <option value="both">Both (prefer fax)</option>
            </select>
          </div>
          <div style={styles.field}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={styles.toggle(settings.require_fax_confirmation)}
                onClick={() => updateSetting('require_fax_confirmation', !settings.require_fax_confirmation)}
              >
                <div style={styles.toggleKnob(settings.require_fax_confirmation)} />
              </div>
              <label style={{ ...styles.label, marginBottom: 0 }}>
                Require fax delivery confirmation
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔔 Notifications</h3>
        <div style={styles.card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {[
              { key: 'notify_on_new_bill', label: 'New bill received' },
              { key: 'notify_on_response', label: 'Provider response' },
              { key: 'notify_on_settlement', label: 'Bill settled' },
              { key: 'notify_on_escalation', label: 'Escalation required' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={styles.toggle(settings[key as keyof NegotiationSettings] as boolean)}
                  onClick={() => updateSetting(key as keyof NegotiationSettings, !settings[key as keyof NegotiationSettings] as any)}
                >
                  <div style={styles.toggleKnob(settings[key as keyof NegotiationSettings] as boolean)} />
                </div>
                <span style={{ fontSize: '14px', color: '#374151' }}>{label}</span>
              </div>
            ))}
          </div>
          
          <div style={styles.field}>
            <label style={styles.label}>Notification Emails</label>
            <div style={{ marginBottom: '12px' }}>
              {settings.notification_emails.map(email => (
                <span key={email} style={styles.emailTag}>
                  {email}
                  <button style={styles.removeBtn} onClick={() => removeEmail(email)}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                style={{ ...styles.input, maxWidth: '300px' }}
                placeholder="Add email address"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmail()}
              />
              <button
                onClick={addEmail}
                style={{
                  padding: '10px 16px',
                  background: '#f1f5f9',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          style={styles.saveButton}
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
