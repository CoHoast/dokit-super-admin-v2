'use client';

import React, { useState, useEffect } from 'react';
import { useClient } from '@/context/ClientContext';
import { WORKFLOWS, WORKFLOW_CATEGORIES, WorkflowDefinition } from '@/config/workflows';

interface WorkflowWithStatus extends WorkflowDefinition {
  enabled: boolean;
  enabledAt?: string;
  enabledBy?: string;
  config: Record<string, any>;
  hasCustomConfig: boolean;
}

interface ClientWorkflowData {
  client: { id: number; name: string; tier: string };
  workflows: WorkflowWithStatus[];
  summary: { total: number; enabled: number; disabled: number };
}

export default function WorkflowsPage() {
  const { selectedClient } = useClient();
  const [data, setData] = useState<ClientWorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [configEdits, setConfigEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedClient) {
      fetchWorkflows();
    } else {
      setLoading(false);
    }
  }, [selectedClient]);

  const fetchWorkflows = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/db/workflows/client/${selectedClient.id}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
    setLoading(false);
  };

  const toggleWorkflow = async (workflowKey: string, enabled: boolean) => {
    if (!selectedClient) return;
    
    setSaving(workflowKey);
    try {
      const res = await fetch(`/api/db/workflows/client/${selectedClient.id}/${workflowKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, actor: 'super_admin' })
      });
      
      if (res.ok) {
        await fetchWorkflows();
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
    setSaving(null);
  };

  const saveConfig = async (workflowKey: string) => {
    if (!selectedClient || !configEdits[workflowKey]) return;
    
    setSaving(workflowKey);
    try {
      const res = await fetch(`/api/db/workflows/client/${selectedClient.id}/${workflowKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configEdits[workflowKey], actor: 'super_admin' })
      });
      
      if (res.ok) {
        setConfigEdits(prev => {
          const next = { ...prev };
          delete next[workflowKey];
          return next;
        });
        await fetchWorkflows();
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
    setSaving(null);
  };

  const updateConfigField = (workflowKey: string, field: string, value: any) => {
    setConfigEdits(prev => ({
      ...prev,
      [workflowKey]: {
        ...(prev[workflowKey] || data?.workflows.find(w => w.key === workflowKey)?.config || {}),
        [field]: value
      }
    }));
  };

  const getWorkflowIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      DocumentTextIcon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      ),
      UserPlusIcon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>
      ),
      ClipboardDocumentCheckIcon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      ),
      CurrencyDollarIcon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      BuildingOffice2Icon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      ),
      ShieldCheckIcon: (
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      )
    };
    return icons[iconName] || icons.DocumentTextIcon;
  };

  const getTierBadge = (tier: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      starter: { bg: '#f1f5f9', color: '#64748b' },
      professional: { bg: '#dbeafe', color: '#2563eb' },
      enterprise: { bg: '#f5f3ff', color: '#7c3aed' }
    };
    const style = styles[tier] || styles.starter;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        background: style.bg,
        color: style.color
      }}>
        {tier}
      </span>
    );
  };

  if (!selectedClient) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</p>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Select a Client
        </h2>
        <p style={{ color: '#64748b' }}>
          Choose a client from the dropdown to manage their workflows.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>Loading workflows...</p>
      </div>
    );
  }

  const workflowsByCategory = Object.entries(WORKFLOW_CATEGORIES).map(([key, cat]) => ({
    ...cat,
    key,
    workflows: data?.workflows.filter(w => w.category === key) || []
  }));

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Workflow Management
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Enable and configure workflows for {selectedClient.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Total Workflows</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{data?.summary.total || 0}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Enabled</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a' }}>{data?.summary.enabled || 0}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Disabled</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#64748b' }}>{data?.summary.disabled || 0}</p>
        </div>
      </div>

      {/* Workflows by Category */}
      {workflowsByCategory.map(category => (
        <div key={category.key} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            {category.name}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {category.workflows.map(workflow => {
              const isExpanded = expandedWorkflow === workflow.key;
              const currentConfig = configEdits[workflow.key] || workflow.config;
              const hasEdits = !!configEdits[workflow.key];
              
              return (
                <div
                  key={workflow.key}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: workflow.enabled ? `2px solid ${workflow.color}40` : '1px solid #e2e8f0',
                    overflow: 'hidden'
                  }}
                >
                  {/* Workflow Header */}
                  <div style={{ 
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: `${workflow.color}15`,
                        color: workflow.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getWorkflowIcon(workflow.icon)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            {workflow.name}
                          </h3>
                          {getTierBadge(workflow.requiredTier)}
                          {workflow.enabled && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#dcfce7',
                              color: '#16a34a'
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>
                          {workflow.shortDescription}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Configure Button */}
                      <button
                        onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.key)}
                        style={{
                          padding: '8px 16px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Configure
                      </button>
                      
                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleWorkflow(workflow.key, !workflow.enabled)}
                        disabled={saving === workflow.key}
                        style={{
                          width: 56,
                          height: 30,
                          borderRadius: 15,
                          border: 'none',
                          background: workflow.enabled ? workflow.color : '#e2e8f0',
                          cursor: saving === workflow.key ? 'not-allowed' : 'pointer',
                          position: 'relative',
                          transition: 'background 0.2s',
                          opacity: saving === workflow.key ? 0.7 : 1
                        }}
                      >
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          position: 'absolute',
                          top: 3,
                          left: workflow.enabled ? 29 : 3,
                          transition: 'left 0.2s'
                        }} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Config Panel */}
                  {isExpanded && (
                    <div style={{
                      padding: '20px',
                      borderTop: '1px solid #e2e8f0',
                      background: '#f8fafc'
                    }}>
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                          Description
                        </h4>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>{workflow.description}</p>
                      </div>
                      
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                          Features
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {workflow.features.map(feature => (
                            <span
                              key={feature}
                              style={{
                                padding: '4px 12px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: '#64748b'
                              }}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                          Configuration
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                          {Object.entries(workflow.configSchema).map(([fieldKey, field]) => (
                            <div key={fieldKey}>
                              <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#374151',
                                marginBottom: '6px'
                              }}>
                                {field.label}
                              </label>
                              
                              {field.type === 'boolean' ? (
                                <button
                                  onClick={() => updateConfigField(workflow.key, fieldKey, !currentConfig[fieldKey])}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: currentConfig[fieldKey] ? '#dcfce7' : '#f1f5f9',
                                    border: '1px solid',
                                    borderColor: currentConfig[fieldKey] ? '#86efac' : '#e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {currentConfig[fieldKey] ? '✓ Enabled' : '○ Disabled'}
                                </button>
                              ) : field.type === 'enum' ? (
                                <select
                                  value={currentConfig[fieldKey] || field.default}
                                  onChange={(e) => updateConfigField(workflow.key, fieldKey, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    background: 'white'
                                  }}
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                                  value={currentConfig[fieldKey] ?? field.default}
                                  onChange={(e) => updateConfigField(
                                    workflow.key,
                                    fieldKey,
                                    field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                  )}
                                  min={field.min}
                                  max={field.max}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                              )}
                              
                              {field.description && (
                                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                  {field.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {hasEdits && (
                          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setConfigEdits(prev => {
                                  const next = { ...prev };
                                  delete next[workflow.key];
                                  return next;
                                });
                              }}
                              style={{
                                padding: '10px 20px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: 'white',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveConfig(workflow.key)}
                              disabled={saving === workflow.key}
                              style={{
                                padding: '10px 20px',
                                background: workflow.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: saving === workflow.key ? 'not-allowed' : 'pointer',
                                opacity: saving === workflow.key ? 0.7 : 1
                              }}
                            >
                              {saving === workflow.key ? 'Saving...' : 'Save Configuration'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
