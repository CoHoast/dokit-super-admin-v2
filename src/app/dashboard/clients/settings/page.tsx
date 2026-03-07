'use client';

import { useState, useEffect } from 'react';
import { useClient } from '@/context/ClientContext';
import { colors } from '@/lib/design-tokens';

export default function ClientSettingsPage() {
  const { selectedClient } = useClient();
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emailReports: true,
    autoProcessing: true,
    webhookUrl: '',
    s3InputPrefix: '',
    s3OutputPrefix: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!selectedClient) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
          Client Settings
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '32px' }}>
          Please select a client from the sidebar to view their settings.
        </p>
        
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: colors.purpleLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" fill="none" stroke={colors.purple} strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
            </svg>
          </div>
          <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text, marginBottom: '4px' }}>
            No Client Selected
          </p>
          <p style={{ fontSize: '13px', color: colors.textMuted }}>
            Select a client from the dropdown in the sidebar
          </p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
          Client Settings
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary }}>
          Configure settings for {selectedClient.name}
        </p>
      </div>

      {/* General Settings */}
      <div style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.borderLight}` }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>
            General Settings
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Toggle Settings */}
            {[
              { key: 'notificationsEnabled', label: 'Email Notifications', desc: 'Receive email alerts for important events' },
              { key: 'emailReports', label: 'Weekly Reports', desc: 'Receive weekly summary reports via email' },
              { key: 'autoProcessing', label: 'Auto Processing', desc: 'Automatically process incoming documents' },
            ].map((setting) => (
              <div key={setting.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '2px' }}>
                    {setting.label}
                  </p>
                  <p style={{ fontSize: '13px', color: colors.textMuted }}>
                    {setting.desc}
                  </p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, [setting.key]: !s[setting.key as keyof typeof s] }))}
                  style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    background: settings[setting.key as keyof typeof settings] ? colors.purple : colors.border,
                    position: 'relative',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: settings[setting.key as keyof typeof settings] ? '23px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Settings */}
      <div style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.borderLight}` }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>
            Integration Settings
          </h2>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                Webhook URL
              </label>
              <input
                type="text"
                value={settings.webhookUrl}
                onChange={(e) => setSettings(s => ({ ...s, webhookUrl: e.target.value }))}
                placeholder="https://your-server.com/webhook"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  fontSize: '14px',
                  color: colors.text,
                  outline: 'none'
                }}
              />
              <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px' }}>
                We'll send POST requests to this URL when documents are processed
              </p>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                S3 Input Prefix
              </label>
              <input
                type="text"
                value={settings.s3InputPrefix}
                onChange={(e) => setSettings(s => ({ ...s, s3InputPrefix: e.target.value }))}
                placeholder="clients/your-client/input/"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  fontSize: '14px',
                  color: colors.text,
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: colors.text, marginBottom: '8px' }}>
                S3 Output Prefix
              </label>
              <input
                type="text"
                value={settings.s3OutputPrefix}
                onChange={(e) => setSettings(s => ({ ...s, s3OutputPrefix: e.target.value }))}
                placeholder="clients/your-client/output/"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  fontSize: '14px',
                  color: colors.text,
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {saved && (
          <span style={{ 
            padding: '10px 20px', 
            color: colors.green, 
            fontSize: '14px', 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            background: colors.text,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
