'use client';

import { useState, useEffect } from 'react';

interface ClientStats {
  totalDocuments: number;
  documentsToday: number;
  documentsThisWeek: number;
  documentsThisMonth: number;
  totalApplications: number;
  totalClaims: number;
  activeWorkflows: number;
}

interface Client {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'pending';
  contactEmail: string | null;
  webhookUrl: string | null;
  s3InputPrefix: string | null;
  s3OutputPrefix: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stats: ClientStats;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newClient, setNewClient] = useState({ name: '', slug: '', contactEmail: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/db/clients');
      const data = await res.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.slug) {
      setError('Name and slug are required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch('/api/db/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to create client');
        setSaving(false);
        return;
      }
      
      setShowAddModal(false);
      setNewClient({ name: '', slug: '', contactEmail: '', notes: '' });
      fetchClients();
    } catch (err) {
      setError('Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#dcfce7', text: '#166534' };
      case 'inactive': return { bg: '#fee2e2', text: '#991b1b' };
      case 'pending': return { bg: '#fef3c7', text: '#92400e' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const totalStats = {
    clients: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    documentsToday: clients.reduce((sum, c) => sum + c.stats.documentsToday, 0),
    totalDocuments: clients.reduce((sum, c) => sum + c.stats.totalDocuments, 0),
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e5e7eb', 
            borderTopColor: '#00d4ff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading clients...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0a0f1a', marginBottom: '8px' }}>Clients</h1>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Manage client accounts and monitor their usage</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #00d4ff 0%, #00b8e6 100%)',
            color: '#0a0f1a',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          Add Client
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Clients', value: totalStats.clients, color: '#0a0f1a' },
          { label: 'Active', value: totalStats.active, color: '#16a34a' },
          { label: 'Documents Today', value: totalStats.documentsToday, color: '#00d4ff' },
          { label: 'Total Documents', value: totalStats.totalDocuments.toLocaleString(), color: '#7c3aed' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      {/* Clients Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workflows</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This Month</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  {searchQuery ? 'No clients match your search' : 'No clients yet. Add your first client to get started.'}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const statusColor = getStatusColor(client.status);
                return (
                  <tr key={client.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #0a0f1a 0%, #1a2332 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#00d4ff',
                          fontWeight: 700,
                          fontSize: '14px',
                        }}>
                          {client.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#0a0f1a', marginBottom: '2px' }}>{client.name}</p>
                          <p style={{ fontSize: '13px', color: '#6b7280' }}>{client.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: statusColor.bg,
                        color: statusColor.text,
                        textTransform: 'capitalize',
                      }}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 500, color: '#0a0f1a' }}>{client.stats.activeWorkflows}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500, color: '#0a0f1a' }}>{client.stats.documentsToday}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500, color: '#0a0f1a' }}>{client.stats.documentsThisMonth}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500, color: '#0a0f1a' }}>{client.stats.totalDocuments.toLocaleString()}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <a 
                        href={`/dashboard/clients/${client.id}`}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#6366f1',
                          cursor: 'pointer',
                          textDecoration: 'none',
                        }}
                      >
                        Manage
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            margin: '20px',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#0a0f1a' }}>Add New Client</h2>
            
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#dc2626', fontSize: '14px' }}>
                {error}
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Client Name *</label>
              <input
                type="text"
                placeholder="Optalis Healthcare"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Slug (URL-friendly) *</label>
              <input
                type="text"
                placeholder="optalis-healthcare"
                value={newClient.slug}
                onChange={(e) => setNewClient({ ...newClient, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Contact Email</label>
              <input
                type="email"
                placeholder="admin@client.com"
                value={newClient.contactEmail}
                onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Notes</label>
              <textarea
                placeholder="Internal notes about this client..."
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAddModal(false); setError(''); setNewClient({ name: '', slug: '', contactEmail: '', notes: '' }); }}
                style={{
                  padding: '12px 20px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddClient}
                disabled={saving}
                style={{
                  padding: '12px 20px',
                  background: saving ? '#9ca3af' : 'linear-gradient(135deg, #00d4ff 0%, #00b8e6 100%)',
                  color: '#0a0f1a',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Client Modal */}
      {showViewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowViewModal(null)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            margin: '20px',
            maxHeight: '90vh',
            overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0a0f1a', marginBottom: '4px' }}>{showViewModal.name}</h2>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>{showViewModal.slug}</p>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                background: getStatusColor(showViewModal.status).bg,
                color: getStatusColor(showViewModal.status).text,
                textTransform: 'capitalize',
              }}>
                {showViewModal.status}
              </span>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#0a0f1a' }}>{showViewModal.stats.documentsToday}</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Today</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#0a0f1a' }}>{showViewModal.stats.documentsThisMonth}</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>This Month</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#0a0f1a' }}>{showViewModal.stats.totalDocuments.toLocaleString()}</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>Total</p>
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Configuration</h3>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Contact Email</p>
                  <p style={{ fontSize: '14px', color: '#0a0f1a' }}>{showViewModal.contactEmail || '—'}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>S3 Input Path</p>
                  <p style={{ fontSize: '14px', color: '#0a0f1a', fontFamily: 'monospace' }}>{showViewModal.s3InputPrefix || '—'}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>S3 Output Path</p>
                  <p style={{ fontSize: '14px', color: '#0a0f1a', fontFamily: 'monospace' }}>{showViewModal.s3OutputPrefix || '—'}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Webhook URL</p>
                  <p style={{ fontSize: '14px', color: '#0a0f1a', fontFamily: 'monospace', wordBreak: 'break-all' }}>{showViewModal.webhookUrl || '—'}</p>
                </div>
                {showViewModal.notes && (
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Notes</p>
                    <p style={{ fontSize: '14px', color: '#0a0f1a' }}>{showViewModal.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '24px' }}>
              <p>Created: {new Date(showViewModal.createdAt).toLocaleDateString()}</p>
              <p>Last Updated: {new Date(showViewModal.updatedAt).toLocaleDateString()}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowViewModal(null)}
                style={{
                  padding: '12px 24px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
