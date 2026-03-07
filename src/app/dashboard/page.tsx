'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';

interface WorkflowRun {
  id: number;
  client_id: number;
  workflow_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_documents: number;
  successful_documents: number;
  failed_documents: number;
  document_breakdown: Record<string, number>;
  mco_delivery_status: string | null;
  mco_delivered_at: string | null;
  duration_seconds: number;
  client_name: string;
}

// Design tokens - Enterprise Navy Theme
const colors = {
  primary: '#1e3a5f',
  primaryLight: '#2d4a6f',
  accent: '#2563eb',
  accentLight: '#3b82f6',
  background: '#ffffff',
  surface: '#f8fafc',
  surfaceHover: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  success: '#16a34a',
  successBg: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fffbeb',
  error: '#dc2626',
  errorBg: '#fef2f2',
};

export default function DashboardPage() {
  const { selectedClient, clients, selectClient } = useClient();
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      setRunsLoading(true);
      fetch(`/api/db/workflow-runs?clientId=${selectedClient.id}&limit=10`)
        .then(res => res.json())
        .then(data => {
          setWorkflowRuns(data.runs || []);
          setRunsLoading(false);
        })
        .catch(() => setRunsLoading(false));
    }
  }, [selectedClient]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getWorkflowIcon = (type: string) => {
    const icons: Record<string, string> = {
      'document-intake': '📄',
      'claims-adjudication': '⚖️',
      'member-intake': '👤',
      'provider-bills': '💵',
      'workers-comp': '🏗️',
      'bill-negotiator': '💰'
    };
    return icons[type] || '📋';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'active': 
        return { bg: colors.successBg, color: colors.success, border: '#bbf7d0' };
      case 'processing': 
        return { bg: colors.warningBg, color: colors.warning, border: '#fde68a' };
      case 'failed': 
        return { bg: colors.errorBg, color: colors.error, border: '#fecaca' };
      default: 
        return { bg: colors.surface, color: colors.textMuted, border: colors.border };
    }
  };

  // Loading state
  if (!clients || clients.length === 0) {
    return (
      <div style={{ 
        padding: '48px 32px', 
        maxWidth: '1100px', 
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ fontSize: '15px', color: colors.textMuted }}>Loading...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  // Platform view (no client selected)
  if (!selectedClient) {
    const client = clients[0];
    
    return (
      <div style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: colors.text, 
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '15px', color: colors.textMuted }}>
            Manage your clients and workflows
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '24px', 
          marginBottom: '40px' 
        }}>
          {/* Stat Card */}
          <div style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <p style={{ 
              fontSize: '13px', 
              color: colors.textMuted, 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Active Clients
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '600', 
              color: colors.text,
              letterSpacing: '-0.02em'
            }}>
              {clients.length}
            </p>
          </div>
          
          <div style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <p style={{ 
              fontSize: '13px', 
              color: colors.textMuted, 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Total Workflows
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '600', 
              color: colors.text,
              letterSpacing: '-0.02em'
            }}>
              {client?.workflows?.length || 0}
            </p>
          </div>
          
          <div style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '24px'
          }}>
            <p style={{ 
              fontSize: '13px', 
              color: colors.textMuted, 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Documents Processed
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '600', 
              color: colors.text,
              letterSpacing: '-0.02em'
            }}>
              0
            </p>
          </div>
        </div>

        {/* Client Section */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: colors.text 
            }}>
              Clients
            </h2>
          </div>
          
          <div
            onClick={() => selectClient(client)}
            style={{
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '10px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.accent;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  UR
                </div>
                
                <div>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: colors.text, 
                    marginBottom: '4px' 
                  }}>
                    {client.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '16px' }}>
                    Healthcare cost sharing ministry
                  </p>
                  
                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '32px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>Workflows</p>
                      <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>
                        {client.workflows?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>Document Types</p>
                      <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>
                        {client.documentTypes?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>Rules</p>
                      <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>
                        {client.adjudicationRules?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: colors.successBg,
                  color: colors.success,
                  border: `1px solid #bbf7d0`
                }}>
                  Active
                </span>
                
                <button style={{
                  padding: '8px 16px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  Configure
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workflows Grid */}
        <div>
          <h2 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: colors.text,
            marginBottom: '16px'
          }}>
            Available Workflows
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {client?.workflows?.map((workflow: any) => (
              <div 
                key={workflow.id}
                onClick={() => selectClient(client)}
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '10px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accent}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: colors.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    {getWorkflowIcon(workflow.type)}
                  </div>
                  
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    background: colors.warningBg,
                    color: colors.warning,
                  }}>
                    Configuring
                  </span>
                </div>
                
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: colors.text, 
                  marginBottom: '6px' 
                }}>
                  {workflow.name}
                </h3>
                <p style={{ 
                  fontSize: '13px', 
                  color: colors.textMuted, 
                  lineHeight: '1.5',
                  marginBottom: '16px'
                }}>
                  {workflow.description}
                </p>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: colors.accent,
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  Configure
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Client-specific view (client selected)
  return (
    <div style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={() => selectClient(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: colors.textMuted, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              padding: 0,
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = colors.accent}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            All Clients
          </button>
          <span style={{ color: colors.border }}>/</span>
          <span style={{ color: colors.text, fontWeight: '500', fontSize: '13px' }}>
            {selectedClient.name}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: colors.text,
              marginBottom: '6px',
              letterSpacing: '-0.02em'
            }}>
              {selectedClient.name}
            </h1>
            <p style={{ fontSize: '14px', color: colors.textMuted }}>
              Configure workflows and manage settings
            </p>
          </div>
          
          <span style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            background: colors.successBg,
            color: colors.success,
            border: `1px solid #bbf7d0`
          }}>
            Active
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px', 
        marginBottom: '40px' 
      }}>
        <Link href="/dashboard/workflows" style={{ textDecoration: 'none' }}>
          <div style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'border-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accent}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
          >
            <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '6px', fontWeight: '500' }}>
              Workflows
            </p>
            <p style={{ fontSize: '28px', fontWeight: '600', color: colors.text, letterSpacing: '-0.02em' }}>
              {selectedClient.workflows?.length || 0}
            </p>
          </div>
        </Link>
        
        <Link href="/dashboard/documents" style={{ textDecoration: 'none' }}>
          <div style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'border-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accent}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
          >
            <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '6px', fontWeight: '500' }}>
              Document Types
            </p>
            <p style={{ fontSize: '28px', fontWeight: '600', color: colors.text, letterSpacing: '-0.02em' }}>
              {selectedClient.documentTypes?.length || 0}
            </p>
          </div>
        </Link>
        
        <Link href="/dashboard/rules" style={{ textDecoration: 'none' }}>
          <div style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'border-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accent}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
          >
            <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '6px', fontWeight: '500' }}>
              Adjudication Rules
            </p>
            <p style={{ fontSize: '28px', fontWeight: '600', color: colors.text, letterSpacing: '-0.02em' }}>
              {selectedClient.adjudicationRules?.length || 0}
            </p>
          </div>
        </Link>
        
        <div style={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          padding: '20px'
        }}>
          <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '6px', fontWeight: '500' }}>
            Documents This Month
          </p>
          <p style={{ fontSize: '28px', fontWeight: '600', color: colors.text, letterSpacing: '-0.02em' }}>
            {selectedClient.documentsThisMonth || 0}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: colors.text,
          marginBottom: '16px'
        }}>
          Recent Activity
        </h2>
        
        <div style={{ 
          background: colors.background, 
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          overflow: 'hidden' 
        }}>
          {runsLoading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>Loading activity...</p>
            </div>
          ) : workflowRuns.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '4px' }}>No activity yet</p>
              <p style={{ color: colors.textMuted, fontSize: '13px', opacity: 0.7 }}>
                Workflow runs will appear here
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: colors.textMuted }}>Workflow</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: colors.textMuted }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: colors.textMuted }}>Documents</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: colors.textMuted }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {workflowRuns.slice(0, 5).map((run) => {
                  const statusStyle = getStatusStyle(run.status);
                  return (
                    <tr 
                      key={run.id}
                      style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>{getWorkflowIcon(run.workflow_type)}</span>
                          <span style={{ fontSize: '14px', color: colors.text, fontWeight: '500' }}>
                            {run.workflow_type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          textTransform: 'capitalize'
                        }}>
                          {run.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: colors.text }}>
                        {run.total_documents.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', color: colors.textMuted }}>
                        {formatTimeAgo(run.started_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: colors.text,
          marginBottom: '16px'
        }}>
          Quick Actions
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <Link href="/dashboard/workflows/document-intake" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: colors.primary,
              padding: '24px',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>
                Document Intake
              </h3>
              <p style={{ fontSize: '13px', opacity: 0.85, lineHeight: '1.4' }}>
                Configure document types and extraction
              </p>
            </div>
          </Link>
          
          <Link href="/dashboard/workflows/claims-adjudication" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: colors.background,
              border: `1px solid ${colors.border}`,
              padding: '24px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'border-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = colors.accent}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = colors.border}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: colors.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <svg width="20" height="20" fill="none" stroke={colors.primary} strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                Claims Adjudication
              </h3>
              <p style={{ fontSize: '13px', color: colors.textMuted, lineHeight: '1.4' }}>
                Configure adjudication rules and API
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
