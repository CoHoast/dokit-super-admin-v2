'use client';

// Phase 2D: Bill Negotiator Automation Settings Page

import { useClient } from '@/context/ClientContext';
import Link from 'next/link';
import { AutomationSettings } from '@/components/AutomationSettings';

export default function BillNegotiatorSettingsPage() {
  const { selectedClient } = useClient();

  if (!selectedClient) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</p>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
            Select a Client First
          </h2>
          <p style={{ color: '#b45309' }}>
            Please select a client from the dropdown above to configure automation settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Link href="/dashboard/bill-negotiator" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bill Negotiator
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#6366f1', fontWeight: 500, fontSize: '14px' }}>Settings</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>
            Automation Settings
          </h1>
          <span style={{
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#7c3aed'
          }}>
            {selectedClient.name}
          </span>
        </div>
        <p style={{ color: '#64748b', marginTop: '8px' }}>
          Configure how the Bill Negotiator handles automation for this client.
        </p>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <div>
          <p style={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
            Autonomy Levels Explained
          </p>
          <p style={{ fontSize: '14px', color: '#1e3a8a' }}>
            <strong>Manual:</strong> Staff controls all actions manually.<br/>
            <strong>Semi-Autonomous:</strong> AI analyzes and suggests, staff approves.<br/>
            <strong>Fully Autonomous:</strong> AI handles negotiation within configured rules.
          </p>
        </div>
      </div>

      {/* Settings Card */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
            🤖 Negotiation Automation
          </h2>
          <span style={{
            padding: '4px 10px',
            background: '#f1f5f9',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            Client ID: {selectedClient.id}
          </span>
        </div>
        
        <AutomationSettings clientId={typeof selectedClient.id === 'string' ? parseInt(selectedClient.id) : selectedClient.id} />
      </div>

      {/* Custom Rules Link */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
              Custom Rules
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Create advanced automation rules with custom conditions and actions.
            </p>
          </div>
          <Link href={`/dashboard/bill-negotiator/settings/rules`} style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#374151',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Manage Rules →
          </Link>
        </div>
      </div>
    </div>
  );
}
