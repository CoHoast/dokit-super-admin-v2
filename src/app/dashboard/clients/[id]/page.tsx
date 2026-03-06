'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Client {
  id: number;
  name: string;
  slug: string;
  status: string;
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  billingPlan: string | null;
  monthlyPrice: number | null;
  billingEmail: string | null;
  billingStartDate: string | null;
  webhookUrl: string | null;
  s3InputPrefix: string | null;
  s3OutputPrefix: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Workflow {
  type: string;
  enabled: boolean;
  config: any;
}

interface Stats {
  totalDocuments: number;
  documentsToday: number;
  totalApplications: number;
  totalClaims: number;
}

const workflowLabels: Record<string, { name: string; description: string; icon: string }> = {
  'document-intake': {
    name: 'Document Intake',
    description: 'AI-powered document classification and data extraction',
    icon: '📄'
  },
  'member-intake': {
    name: 'Member Intake',
    description: 'Process new member/patient applications',
    icon: '👤'
  },
  'claims-adjudication': {
    name: 'Claims Adjudication',
    description: 'Automated claims review and decision support',
    icon: '💰'
  },
  'provider-bills': {
    name: 'Provider Bills',
    description: 'Provider bill processing and repricing',
    icon: '🧾'
  },
  'workers-comp': {
    name: 'Workers Comp FROI',
    description: 'First Report of Injury processing and EDI',
    icon: '🛡️'
  }
};

const allWorkflowTypes = Object.keys(workflowLabels);

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'workflows' | 'config'>('overview');
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/db/clients/${clientId}`);
      const data = await res.json();
      
      if (data.client) {
        setClient(data.client);
        setEditForm(data.client);
        
        // Merge fetched workflows with all possible workflows
        const fetchedWorkflows = data.workflows || [];
        const mergedWorkflows = allWorkflowTypes.map(type => {
          const existing = fetchedWorkflows.find((w: Workflow) => w.type === type);
          return existing || { type, enabled: false, config: {} };
        });
        setWorkflows(mergedWorkflows);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const res = await fetch(`/api/db/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        setSaveMessage('✓ Saved successfully');
        fetchClient();
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('✗ Failed to save');
      }
    } catch (error) {
      setSaveMessage('✗ Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWorkflow = async (workflowType: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/db/clients/${clientId}/workflows`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowType, enabled })
      });
      
      if (res.ok) {
        setWorkflows(prev => 
          prev.map(w => w.type === workflowType ? { ...w, enabled } : w)
        );
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e5e7eb', 
            borderTopColor: '#6366f1', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading client...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', color: '#1f2937', marginBottom: '16px' }}>Client Not Found</h1>
        <Link href="/dashboard/clients" style={{ color: '#6366f1' }}>← Back to Clients</Link>
      </div>
    );
  }

  const enabledWorkflowsCount = workflows.filter(w => w.enabled).length;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link 
          href="/dashboard/clients" 
          style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
        >
          ← Back to Clients
        </Link>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '20px',
            }}>
              {client.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>{client.name}</h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{client.slug}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              background: client.status === 'active' ? '#dcfce7' : '#fee2e2',
              color: client.status === 'active' ? '#166534' : '#991b1b',
              textTransform: 'capitalize',
            }}>
              {client.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Documents Today', value: stats?.documentsToday || 0, color: '#6366f1' },
          { label: 'Total Documents', value: stats?.totalDocuments || 0, color: '#8b5cf6' },
          { label: 'Applications', value: stats?.totalApplications || 0, color: '#06b6d4' },
          { label: 'Active Workflows', value: enabledWorkflowsCount, color: '#10b981' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'details', label: 'Edit Details' },
            { id: 'workflows', label: 'Workflows' },
            { id: 'config', label: 'Configuration' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === tab.id ? '#6366f1' : '#6b7280',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#1f2937' }}>Client Overview</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Information</h3>
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Name:</span> {client.contactName || '—'}</p>
                  <p style={{ marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Email:</span> {client.contactEmail || '—'}</p>
                  <p style={{ marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Phone:</span> {client.contactPhone || '—'}</p>
                  <p><span style={{ color: '#6b7280' }}>Address:</span> {client.addressLine1 ? `${client.addressLine1}, ${client.city || ''} ${client.state || ''} ${client.zipCode || ''}` : '—'}</p>
                </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing</h3>
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Plan:</span> {client.billingPlan || 'starter'}</p>
                  <p style={{ marginBottom: '8px' }}><span style={{ color: '#6b7280' }}>Monthly:</span> ${client.monthlyPrice || 0}</p>
                  <p><span style={{ color: '#6b7280' }}>Billing Email:</span> {client.billingEmail || '—'}</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Workflows</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {workflows.filter(w => w.enabled).map(w => (
                  <span key={w.type} style={{
                    padding: '6px 12px',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    {workflowLabels[w.type]?.icon} {workflowLabels[w.type]?.name}
                  </span>
                ))}
                {enabledWorkflowsCount === 0 && (
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>No workflows enabled</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Details Tab */}
        {activeTab === 'details' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>Edit Client Details</h2>
              {saveMessage && (
                <span style={{ color: saveMessage.includes('✓') ? '#16a34a' : '#dc2626', fontSize: '14px' }}>{saveMessage}</span>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Basic Info */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Client Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Status</label>
                <select
                  value={editForm.status || 'active'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Contact Info */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Contact Name</label>
                <input
                  type="text"
                  value={editForm.contactName || ''}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Contact Email</label>
                <input
                  type="email"
                  value={editForm.contactEmail || ''}
                  onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Contact Phone</label>
                <input
                  type="tel"
                  value={editForm.contactPhone || ''}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Address */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Address Line 1</label>
                <input
                  type="text"
                  value={editForm.addressLine1 || ''}
                  onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Address Line 2</label>
                <input
                  type="text"
                  value={editForm.addressLine2 || ''}
                  onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>City</label>
                <input
                  type="text"
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>State</label>
                <input
                  type="text"
                  value={editForm.state || ''}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>ZIP Code</label>
                <input
                  type="text"
                  value={editForm.zipCode || ''}
                  onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Billing */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Billing Plan</label>
                <select
                  value={editForm.billingPlan || 'starter'}
                  onChange={(e) => setEditForm({ ...editForm, billingPlan: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Monthly Price ($)</label>
                <input
                  type="number"
                  value={editForm.monthlyPrice || ''}
                  onChange={(e) => setEditForm({ ...editForm, monthlyPrice: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Billing Email</label>
                <input
                  type="email"
                  value={editForm.billingEmail || ''}
                  onChange={(e) => setEditForm({ ...editForm, billingEmail: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  background: saving ? '#9ca3af' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>Manage Workflows</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              Toggle workflows on or off for this client. Only enabled workflows will appear in their dashboard.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {workflows.map(workflow => {
                const label = workflowLabels[workflow.type];
                return (
                  <div
                    key={workflow.type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: workflow.enabled ? '#f0fdf4' : '#f9fafb',
                      border: workflow.enabled ? '1px solid #86efac' : '1px solid #e5e7eb',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '24px' }}>{label?.icon}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>{label?.name}</p>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>{label?.description}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleToggleWorkflow(workflow.type, !workflow.enabled)}
                      style={{
                        position: 'relative',
                        width: '52px',
                        height: '28px',
                        background: workflow.enabled ? '#22c55e' : '#d1d5db',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        left: workflow.enabled ? '26px' : '2px',
                        width: '24px',
                        height: '24px',
                        background: 'white',
                        borderRadius: '50%',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: '#1f2937' }}>Technical Configuration</h2>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>S3 Input Prefix</label>
                <input
                  type="text"
                  value={editForm.s3InputPrefix || ''}
                  onChange={(e) => setEditForm({ ...editForm, s3InputPrefix: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>S3 Output Prefix</label>
                <input
                  type="text"
                  value={editForm.s3OutputPrefix || ''}
                  onChange={(e) => setEditForm({ ...editForm, s3OutputPrefix: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Webhook URL</label>
                <input
                  type="url"
                  value={editForm.webhookUrl || ''}
                  onChange={(e) => setEditForm({ ...editForm, webhookUrl: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveDetails}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    background: saving ? '#9ca3af' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
