'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { DEMO_MODE } from '@/lib/sirkl-api';

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
  response_delay_mode: 'instant' | 'quick' | 'natural' | 'deliberate' | 'custom';
  response_delay_min_minutes: number;
  response_delay_max_minutes: number;
  response_business_hours_only: boolean;
  response_weekdays_only: boolean;
}

const DEFAULT_SETTINGS: NegotiationSettings = {
  autonomy_level: 'semi_autonomous',
  default_initial_offer_percent: 45,
  max_offer_percent: 70,
  min_offer_percent: 30,
  auto_accept_threshold: 10,
  max_negotiation_rounds: 3,
  counter_increment_percent: 10,
  days_to_respond: 14,
  days_before_followup: 5,
  days_before_escalation: 21,
  auto_send_method: 'fax',
  require_fax_confirmation: true,
  notify_on_new_bill: true,
  notify_on_response: true,
  notify_on_settlement: true,
  notify_on_escalation: true,
  notification_emails: ['admin@solidarity.health'],
  response_delay_mode: 'natural',
  response_delay_min_minutes: 60,
  response_delay_max_minutes: 240,
  response_business_hours_only: true,
  response_weekdays_only: true,
};

export default function SettingsPage() {
  const { isDark, colors } = useTheme();
  const [settings, setSettings] = useState<NegotiationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [activeSection, setActiveSection] = useState<string>('autonomy');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const updateSetting = <K extends keyof NegotiationSettings>(key: K, value: NegotiationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
    setSaving(false);
    
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const addEmail = () => {
    if (!emailInput || settings.notification_emails.includes(emailInput)) return;
    updateSetting('notification_emails', [...settings.notification_emails, emailInput]);
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    updateSetting('notification_emails', settings.notification_emails.filter(e => e !== email));
  };

  const autonomyLevels = [
    {
      key: 'manual' as const,
      icon: '🔒',
      title: 'Manual',
      subtitle: 'Full Human Control',
      description: 'AI analyzes bills and calculates fair prices, but humans trigger every action. Best for organizations new to AI-assisted negotiation.',
      features: [
        'AI extracts bill data automatically',
        'Fair price calculation with Medicare rates',
        'Human reviews and approves each offer',
        'All communications require manual send',
      ],
      recommended: false,
    },
    {
      key: 'semi_autonomous' as const,
      icon: '⚡',
      title: 'Semi-Autonomous',
      subtitle: 'AI Recommends, Human Approves',
      description: 'AI handles analysis and prepares actions, but waits for human approval before sending. Perfect balance of efficiency and control.',
      features: [
        'Everything in Manual, plus:',
        'AI drafts offers automatically',
        'One-click approval workflow',
        'Counter-offers queued for review',
        'Escalation alerts for edge cases',
      ],
      recommended: true,
    },
    {
      key: 'fully_autonomous' as const,
      icon: '🚀',
      title: 'Fully Autonomous',
      subtitle: 'AI Executes Within Rules',
      description: 'AI handles the entire negotiation flow within your configured guardrails. Humans monitor dashboards and handle escalations only.',
      features: [
        'Everything in Semi-Auto, plus:',
        'Auto-send initial offers',
        'Auto-accept within threshold',
        'Auto-counter with increment rules',
        'Human only for escalations',
      ],
      recommended: false,
    },
  ];

  const responseDelayOptions = [
    { value: 'instant', label: '⚡ Instant', desc: '< 1 min (testing)', min: 0, max: 1 },
    { value: 'quick', label: '🏃 Quick', desc: '15-30 min', min: 15, max: 30 },
    { value: 'natural', label: '🧑 Natural', desc: '1-4 hours', min: 60, max: 240 },
    { value: 'deliberate', label: '🤔 Deliberate', desc: '4-24 hours', min: 240, max: 1440 },
    { value: 'custom', label: '⚙️ Custom', desc: 'Set your own', min: null, max: null },
  ];

  const sections = [
    { key: 'autonomy', label: 'Autonomy Level', icon: '🤖' },
    { key: 'offers', label: 'Offer Settings', icon: '💰' },
    { key: 'counters', label: 'Counter Response', icon: '🔄' },
    { key: 'timing', label: 'Response Timing', icon: '🕐' },
    { key: 'deadlines', label: 'Deadlines', icon: '⏱️' },
    { key: 'delivery', label: 'Delivery Method', icon: '📤' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  // Toggle component
  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <div
      onClick={onChange}
      style={{
        width: '48px',
        height: '26px',
        borderRadius: '13px',
        backgroundColor: enabled ? colors.accent : (isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db'),
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        position: 'absolute',
        top: '2px',
        left: enabled ? '24px' : '2px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  // Input styles
  const inputStyle = {
    width: '100%',
    maxWidth: '180px',
    padding: '10px 14px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    maxWidth: '240px',
    cursor: 'pointer',
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: `2px solid ${colors.border}`,
            borderTopColor: colors.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: colors.textMuted }}>Loading settings...</span>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Automation Settings
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Configure how the Bill Negotiator handles automation
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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 24px',
            background: colors.gradient,
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {saving ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Settings
            </>
          )}
        </motion.button>
      </div>

      {/* Save Message */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '14px 20px',
              marginBottom: '24px',
              borderRadius: '10px',
              backgroundColor: saveMessage.type === 'success' 
                ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
              color: saveMessage.type === 'success'
                ? (isDark ? '#4ade80' : '#16a34a')
                : (isDark ? '#f87171' : '#dc2626'),
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {saveMessage.type === 'success' ? '✓' : '✕'} {saveMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {sections.map(section => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeSection === section.key ? colors.accent : colors.surface,
              color: activeSection === section.key ? '#fff' : colors.textMuted,
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <span>{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* AUTONOMY LEVEL - The Killer Feature */}
        {activeSection === 'autonomy' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Info Banner */}
            <div style={{
              padding: '16px 20px',
              marginBottom: '20px',
              borderRadius: '12px',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(102, 34, 246, 0.1) 100%)'
                : 'linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%)',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <div>
                  <p style={{ fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
                    Choose Your Comfort Level
                  </p>
                  <p style={{ fontSize: '14px', color: colors.textMuted }}>
                    Start with Manual or Semi-Autonomous while learning the system. You can increase automation as you gain confidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Autonomy Cards */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {autonomyLevels.map((level, i) => {
                const isActive = settings.autonomy_level === level.key;
                return (
                  <motion.div
                    key={level.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => updateSetting('autonomy_level', level.key)}
                    style={{
                      position: 'relative',
                      padding: '24px',
                      borderRadius: '16px',
                      border: isActive ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                      backgroundColor: isActive 
                        ? (isDark ? 'rgba(102, 34, 246, 0.1)' : '#f5f3ff')
                        : colors.surface,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Recommended Badge */}
                    {level.recommended && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '20px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: colors.accent,
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Recommended
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '20px' }}>
                      {/* Icon */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        backgroundColor: isActive ? colors.accent : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        flexShrink: 0,
                      }}>
                        {level.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text }}>
                            {level.title}
                          </h3>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                            color: colors.textMuted,
                          }}>
                            {level.subtitle}
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '16px', lineHeight: 1.5 }}>
                          {level.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {level.features.map((feature, fi) => (
                            <span key={fi} style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                              color: colors.textMuted,
                            }}>
                              {feature.startsWith('Everything') ? '↑ ' : '✓ '}{feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Radio indicator */}
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: `2px solid ${isActive ? colors.accent : colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isActive && (
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
          </motion.div>
        )}

        {/* OFFER SETTINGS */}
        {activeSection === 'offers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
              💰 Offer Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Initial Offer %
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.default_initial_offer_percent}
                  onChange={e => updateSetting('default_initial_offer_percent', parseInt(e.target.value) || 0)}
                  min={1}
                  max={100}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Start offers at this % of billed amount
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Minimum Offer %
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.min_offer_percent}
                  onChange={e => updateSetting('min_offer_percent', parseInt(e.target.value) || 0)}
                  min={1}
                  max={100}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Never offer less than this
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Maximum Offer %
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.max_offer_percent}
                  onChange={e => updateSetting('max_offer_percent', parseInt(e.target.value) || 0)}
                  min={1}
                  max={100}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Never offer more than this
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* COUNTER RESPONSE */}
        {activeSection === 'counters' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
              🔄 Counter Response Settings
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Auto-Accept Threshold %
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.auto_accept_threshold}
                  onChange={e => updateSetting('auto_accept_threshold', parseInt(e.target.value) || 0)}
                  min={0}
                  max={50}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Accept if counter is within X% of our offer
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Counter Increment %
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.counter_increment_percent}
                  onChange={e => updateSetting('counter_increment_percent', parseInt(e.target.value) || 0)}
                  min={1}
                  max={50}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Increase offer by this % each round
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Max Negotiation Rounds
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.max_negotiation_rounds}
                  onChange={e => updateSetting('max_negotiation_rounds', parseInt(e.target.value) || 0)}
                  min={1}
                  max={10}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Escalate after this many rounds
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* RESPONSE TIMING */}
        {activeSection === 'timing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Pro Tip */}
            <div style={{
              padding: '16px 20px',
              marginBottom: '20px',
              borderRadius: '12px',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)'
                : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fcd34d'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <div>
                  <p style={{ fontWeight: '600', color: isDark ? '#fbbf24' : '#92400e', marginBottom: '4px' }}>
                    Pro Tip: Human-like Timing
                  </p>
                  <p style={{ fontSize: '14px', color: isDark ? '#fcd34d' : '#b45309' }}>
                    Instant responses signal &quot;bot&quot; to providers. Adding natural delays increases settlement rates by making negotiations feel human.
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              padding: '24px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
                🕐 Response Delay Mode
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {responseDelayOptions.map(option => {
                  const isActive = settings.response_delay_mode === option.value;
                  return (
                    <div
                      key={option.value}
                      onClick={() => {
                        const updates: Partial<NegotiationSettings> = {
                          response_delay_mode: option.value as NegotiationSettings['response_delay_mode'],
                        };
                        if (option.min !== null) updates.response_delay_min_minutes = option.min;
                        if (option.max !== null) updates.response_delay_max_minutes = option.max;
                        setSettings(prev => ({ ...prev, ...updates }));
                      }}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: isActive ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        backgroundColor: isActive ? (isDark ? 'rgba(102, 34, 246, 0.1)' : '#f5f3ff') : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.textMuted }}>
                        {option.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom timing inputs */}
              {settings.response_delay_mode === 'custom' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '24px',
                  padding: '20px',
                  backgroundColor: colors.bg,
                  borderRadius: '12px',
                  marginBottom: '24px',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                      Minimum Delay (minutes)
                    </label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={settings.response_delay_min_minutes}
                      onChange={e => updateSetting('response_delay_min_minutes', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                      Maximum Delay (minutes)
                    </label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={settings.response_delay_max_minutes}
                      onChange={e => updateSetting('response_delay_max_minutes', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>
              )}

              {/* Business hours toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle 
                    enabled={settings.response_business_hours_only}
                    onChange={() => updateSetting('response_business_hours_only', !settings.response_business_hours_only)}
                  />
                  <div>
                    <span style={{ fontSize: '14px', color: colors.text, fontWeight: '500' }}>Business hours only</span>
                    <p style={{ fontSize: '12px', color: colors.textMuted }}>Only send between 8am - 6pm provider&apos;s time zone</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle 
                    enabled={settings.response_weekdays_only}
                    onChange={() => updateSetting('response_weekdays_only', !settings.response_weekdays_only)}
                  />
                  <div>
                    <span style={{ fontSize: '14px', color: colors.text, fontWeight: '500' }}>Weekdays only</span>
                    <p style={{ fontSize: '12px', color: colors.textMuted }}>No responses on Saturday or Sunday</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* DEADLINES */}
        {activeSection === 'deadlines' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
              ⏱️ Deadlines & Follow-ups
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Response Deadline (days)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.days_to_respond}
                  onChange={e => updateSetting('days_to_respond', parseInt(e.target.value) || 0)}
                  min={1}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Expected provider response time
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Follow-up After (days)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.days_before_followup}
                  onChange={e => updateSetting('days_before_followup', parseInt(e.target.value) || 0)}
                  min={1}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Send reminder if no response
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                  Escalate After (days)
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={settings.days_before_escalation}
                  onChange={e => updateSetting('days_before_escalation', parseInt(e.target.value) || 0)}
                  min={1}
                />
                <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                  Flag for human review
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* DELIVERY METHOD */}
        {activeSection === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
              📤 Delivery Method
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                Auto-Send Method
              </label>
              <select
                style={selectStyle}
                value={settings.auto_send_method}
                onChange={e => updateSetting('auto_send_method', e.target.value as NegotiationSettings['auto_send_method'])}
              >
                <option value="none">None - Manual send only</option>
                <option value="fax">Fax only</option>
                <option value="email">Email only</option>
                <option value="both">Both (prefer fax)</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Toggle 
                enabled={settings.require_fax_confirmation}
                onChange={() => updateSetting('require_fax_confirmation', !settings.require_fax_confirmation)}
              />
              <div>
                <span style={{ fontSize: '14px', color: colors.text, fontWeight: '500' }}>Require fax delivery confirmation</span>
                <p style={{ fontSize: '12px', color: colors.textMuted }}>Wait for successful transmission before marking as sent</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {activeSection === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
              🔔 Notifications
            </h3>
            
            {/* Notification toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { key: 'notify_on_new_bill', label: 'New bill received', desc: 'When a new bill enters the system' },
                { key: 'notify_on_response', label: 'Provider response', desc: 'When a provider replies or counters' },
                { key: 'notify_on_settlement', label: 'Bill settled', desc: 'When negotiation completes' },
                { key: 'notify_on_escalation', label: 'Escalation required', desc: 'When human review is needed' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle 
                    enabled={settings[key as keyof NegotiationSettings] as boolean}
                    onChange={() => updateSetting(key as keyof NegotiationSettings, !settings[key as keyof NegotiationSettings] as never)}
                  />
                  <div>
                    <span style={{ fontSize: '14px', color: colors.text, fontWeight: '500' }}>{label}</span>
                    <p style={{ fontSize: '12px', color: colors.textMuted }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Email addresses */}
            <div style={{ paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '12px' }}>
                Notification Emails
              </label>
              <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {settings.notification_emails.map(email => (
                  <span key={email} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    backgroundColor: colors.bg,
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: colors.text,
                  }}>
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.textMuted,
                        fontSize: '16px',
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  style={{ ...inputStyle, maxWidth: '300px' }}
                  placeholder="Add email address"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEmail()}
                />
                <button
                  onClick={addEmail}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Links */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
            Advanced Configuration
          </h3>
          <p style={{ fontSize: '13px', color: colors.textMuted }}>
            Configure negotiation rules, pipeline stages, and more.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/dashboard/settings/rules" style={{
            padding: '10px 16px',
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.text,
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            Negotiation Rules →
          </Link>
          <Link href="/dashboard/settings/pipeline" style={{
            padding: '10px 16px',
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.text,
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
          }}>
            Pipeline Settings →
          </Link>
        </div>
      </div>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}
