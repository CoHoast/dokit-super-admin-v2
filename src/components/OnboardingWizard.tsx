'use client';

// Phase 2E: Onboarding Wizard Component

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  completed: boolean;
  required: boolean;
}

interface OnboardingProgress {
  client_id: number;
  completed_steps: string[];
  current_step: string;
  is_complete: boolean;
}

interface OnboardingWizardProps {
  clientId: number;
  onComplete?: () => void;
  compact?: boolean;
}

export function OnboardingWizard({ clientId, onComplete, compact = false }: OnboardingWizardProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    fetchProgress();
  }, [clientId]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/onboarding?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setProgress(data.progress);
        setSteps(data.steps);
        
        // Find current step index
        const idx = data.steps.findIndex((s: OnboardingStep) => s.id === data.progress.current_step);
        setCurrentStepIndex(idx >= 0 ? idx : 0);
      }
    } catch (error) {
      console.error('Error fetching onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeStep = async (stepId: string) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, stepId })
      });
      const data = await res.json();
      if (data.success) {
        setProgress(data.progress);
        fetchProgress();
        
        if (data.progress.is_complete) {
          onComplete?.();
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const getStepLink = (step: OnboardingStep) => {
    switch (step.id) {
      case 'settings':
        return '/dashboard/bill-negotiator/settings';
      case 'intake':
        return '/dashboard/bill-negotiator';
      case 'first_bill':
        return '/dashboard/bill-negotiator/bills/new';
      case 'notifications':
        return '/dashboard/bill-negotiator/settings';
      default:
        return null;
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#64748b' }}>Loading...</div>;
  }

  if (!progress || progress.is_complete) {
    if (compact) return null;
    return (
      <div style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        borderRadius: '12px',
        border: '1px solid #86efac',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</p>
        <h3 style={{ color: '#166534', fontWeight: '600', marginBottom: '4px' }}>
          Onboarding Complete!
        </h3>
        <p style={{ color: '#15803d', fontSize: '14px' }}>
          You're all set to start negotiating bills.
        </p>
      </div>
    );
  }

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  const styles = {
    container: {
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid #e2e8f0',
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    progressBar: {
      height: '8px',
      background: '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #8B5CF6 0%, #7c3aed 100%)',
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    },
    progressText: {
      fontSize: '13px',
      color: '#64748b',
      marginTop: '8px'
    },
    stepList: {
      padding: compact ? '12px 16px' : '16px 24px'
    },
    step: (active: boolean, completed: boolean) => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: compact ? '12px 0' : '16px 0',
      borderBottom: '1px solid #f1f5f9',
      opacity: completed ? 0.6 : 1
    }),
    stepIcon: (completed: boolean) => ({
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      flexShrink: 0,
      background: completed ? '#dcfce7' : '#f1f5f9',
      color: completed ? '#16a34a' : '#64748b'
    }),
    stepContent: { flex: '1' },
    stepTitle: {
      fontWeight: '500',
      color: '#0f172a',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    stepDesc: {
      fontSize: '13px',
      color: '#64748b'
    },
    stepAction: {
      padding: '6px 12px',
      background: '#8B5CF6',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      marginTop: '8px'
    },
    required: {
      padding: '2px 6px',
      background: '#fef3c7',
      color: '#92400e',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          🚀 Getting Started
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
        </div>
        <div style={styles.progressText}>
          {completedCount} of {steps.length} steps complete
        </div>
      </div>

      <div style={styles.stepList}>
        {steps.map((step, index) => (
          <div key={step.id} style={styles.step(index === currentStepIndex, step.completed)}>
            <div style={styles.stepIcon(step.completed)}>
              {step.completed ? '✓' : index + 1}
            </div>
            <div style={styles.stepContent}>
              <div style={styles.stepTitle}>
                {step.title}
                {step.required && <span style={styles.required}>Required</span>}
              </div>
              <div style={styles.stepDesc}>{step.description}</div>
              
              {!step.completed && index === currentStepIndex && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  {getStepLink(step) ? (
                    <Link href={getStepLink(step)!} style={{ textDecoration: 'none' }}>
                      <button style={styles.stepAction}>
                        {step.action === 'view' ? 'View' : step.action === 'configure' ? 'Configure' : 'Start'} →
                      </button>
                    </Link>
                  ) : null}
                  <button
                    onClick={() => completeStep(step.id)}
                    style={{
                      ...styles.stepAction,
                      background: '#f1f5f9',
                      color: '#64748b'
                    }}
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
