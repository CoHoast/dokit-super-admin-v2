'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';
import { GradientStatCard } from '@/components/GradientStatCard';
import { DashboardHeader } from '@/components/DashboardHeader';

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
      case 'completed': return { bg: '#dcfce7', color: '#16a34a' };
      case 'processing': return { bg: '#fef3c7', color: '#d97706' };
      case 'failed': return { bg: '#fee2e2', color: '#dc2626' };
      case 'active': return { bg: '#dcfce7', color: '#16a34a' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  // Loading state
  if (!clients || clients.length === 0) {
    return (
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <DashboardHeader 
          userName="Admin" 
          userInitials="A"
          showSearch={false}
        />
        <div style={{ 
          background: 'white', 
          padding: '64px', 
          borderRadius: '20px', 
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: '#64748b' }}>Loading clients...</p>
        </div>
      </div>
    );
  }

  // Platform view (no client selected)
  if (!selectedClient) {
    const client = clients[0];
    
    return (
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <DashboardHeader 
          userName="Admin" 
          userInitials="A"
        />

        {/* Gradient Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <GradientStatCard
            label="Active Clients"
            value={clients.length}
            subtext="Organizations onboarded"
            variant="purple"
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            }
          />
          
          <GradientStatCard
            label="Active Workflows"
            value={client?.workflows?.length || 0}
            trend={{ value: 'Configuring', direction: 'neutral' }}
            variant="blue"
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/>
              </svg>
            }
          />
          
          <GradientStatCard
            label="Documents Processed"
            value="0"
            subtext="Ready to start"
            variant="green"
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
          />
        </div>

        {/* Client Card */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
            Clients
          </h2>
          
          <button
            onClick={() => selectClient(client)}
            style={{
              width: '100%',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '28px',
              cursor: 'pointer',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#8b5cf6';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(139, 92, 246, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Top gradient accent */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)' 
            }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '700',
                  boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
                  flexShrink: 0
                }}>
                  UR
                </div>
                
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
                    {client.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                    Healthcare cost sharing ministry
                  </p>
                  
                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '40px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Workflows
                      </p>
                      <p style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>
                        {client.workflows?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Document Types
                      </p>
                      <p style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                        {client.documentTypes?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Rules
                      </p>
                      <p style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                        {client.adjudicationRules?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                  Active
                </span>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                }}>
                  Configure
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Workflows Grid */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
            Workflows
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {client?.workflows?.map((workflow: any, index: number) => {
              const gradients = [
                { bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', accent: '#6366f1', iconBg: '#6366f1' },
                { bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', accent: '#8b5cf6', iconBg: '#8b5cf6' },
                { bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', accent: '#10b981', iconBg: '#10b981' },
                { bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', accent: '#06b6d4', iconBg: '#06b6d4' },
                { bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', accent: '#f59e0b', iconBg: '#f59e0b' },
                { bg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', accent: '#f43f5e', iconBg: '#f43f5e' },
              ];
              const gradient = gradients[index % gradients.length];
              
              return (
                <div 
                  key={workflow.id}
                  onClick={() => selectClient(client)}
                  style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = gradient.accent;
                    e.currentTarget.style.boxShadow = `0 8px 30px ${gradient.accent}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Left accent bar */}
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '4px', 
                    height: '100%', 
                    background: gradient.accent 
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: gradient.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px'
                    }}>
                      {getWorkflowIcon(workflow.type)}
                    </div>
                    
                    <span style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: '#fef3c7',
                      color: '#d97706',
                    }}>
                      Configuring
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
                    {workflow.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '20px' }}>
                    {workflow.description}
                  </p>
                  
                  <button
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      color: '#0f172a',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = gradient.accent;
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#0f172a';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    Configure Workflow
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Client-specific view (client selected)
  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb + Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={() => selectClient(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#64748b', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              padding: '6px 0',
              fontWeight: '500',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#6366f1'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            Platform
          </button>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#6366f1', fontWeight: '600', fontSize: '14px' }}>{selectedClient.name}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
              {selectedClient.name}
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              Configure workflows, document types, and adjudication rules
            </p>
          </div>
          
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            background: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
            Active
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <Link href="/dashboard/workflows" style={{ textDecoration: 'none' }}>
          <GradientStatCard
            label="Workflows"
            value={selectedClient.workflows?.length || 0}
            trend={{ value: 'Configuring', direction: 'neutral' }}
            variant="purple"
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/>
              </svg>
            }
          />
        </Link>
        
        <Link href="/dashboard/documents" style={{ textDecoration: 'none' }}>
          <GradientStatCard
            label="Document Types"
            value={selectedClient.documentTypes?.length || 0}
            subtext="Configured"
            variant="green"
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
          />
        </Link>
        
        <Link href="/dashboard/rules" style={{ textDecoration: 'none' }}>
          <GradientStatCard
            label="Adjudication Rules"
            value={selectedClient.adjudicationRules?.length || 0}
            subtext="Active"
            variant="blue"
            icon={
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            }
          />
        </Link>
        
        <GradientStatCard
          label="Documents Processed"
          value={selectedClient.documentsThisMonth || 0}
          subtext="This month"
          variant="cyan"
          icon={
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          }
        />
      </div>

      {/* Recent Workflow Runs */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Recent Activity</h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Last 10 runs</span>
        </div>
        
        <div style={{ 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid #e2e8f0',
          overflow: 'hidden' 
        }}>
          {runsLoading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: '#64748b' }}>Loading activity...</p>
            </div>
          ) : workflowRuns.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '8px' }}>No activity yet</p>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>Workflow runs will appear here</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workflow</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {workflowRuns.slice(0, 5).map((run) => {
                  const statusStyle = getStatusStyle(run.status);
                  return (
                    <tr 
                      key={run.id}
                      style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>{getWorkflowIcon(run.workflow_type)}</span>
                          <div>
                            <p style={{ fontWeight: '500', fontSize: '14px', color: '#0f172a', margin: 0 }}>
                              {run.workflow_type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Run #{run.id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          textTransform: 'capitalize'
                        }}>
                          {run.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                          {run.total_documents.toLocaleString()}
                        </span>
                        {run.failed_documents > 0 && (
                          <span style={{ fontSize: '11px', color: '#dc2626', marginLeft: '8px' }}>
                            ({run.failed_documents} failed)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
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

      {/* Quick Action Cards */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
          Configure Workflows
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <Link href="/dashboard/workflows/document-intake" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
              padding: '28px',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.3)';
            }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Document Intake & Classification
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                Configure FTP, document types, and extraction fields
              </p>
            </div>
          </Link>
          
          <Link href="/dashboard/workflows/claims-adjudication" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
              padding: '28px',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 8px 30px rgba(6, 182, 212, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(6, 182, 212, 0.3)';
            }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Claims Adjudication
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                Configure API settings and adjudication rules
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
