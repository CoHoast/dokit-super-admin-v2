'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface OfferDetails {
  negotiationId: number;
  billId: number;
  providerName: string;
  patientName: string;
  dateOfService: string;
  originalAmount: number;
  offerAmount: number;
  offerPercentage: number;
  orgName: string;
  orgPhone: string;
  orgEmail: string;
  expiresAt: string;
  status: string;
  lineItems?: Array<{
    cptCode: string;
    description: string;
    billedAmount: number;
    offeredAmount: number;
  }>;
}

type ResponseStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'already_responded';

export default function ProviderResponsePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [status, setStatus] = useState<ResponseStatus>('loading');
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [error, setError] = useState<string>('');
  const [responseType, setResponseType] = useState<'accept' | 'counter' | 'reject' | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  // Fetch offer details
  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await fetch(`/api/respond/${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          if (data.code === 'EXPIRED') {
            setStatus('expired');
          } else if (data.code === 'ALREADY_RESPONDED') {
            setStatus('already_responded');
          } else {
            setError(data.error || 'Failed to load offer');
            setStatus('error');
          }
          return;
        }
        
        setOffer(data);
        setStatus('ready');
      } catch (err) {
        setError('Failed to connect to server');
        setStatus('error');
      }
    };
    
    fetchOffer();
  }, [token]);
  
  // Submit response
  const handleSubmit = async () => {
    if (!responseType) return;
    
    setStatus('submitting');
    
    try {
      const res = await fetch(`/api/respond/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseType,
          counterAmount: responseType === 'counter' ? parseFloat(counterAmount) : undefined,
          counterNotes: counterNotes || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to submit response');
        setStatus('ready');
        return;
      }
      
      setSubmitted(true);
      setStatus('success');
    } catch (err) {
      setError('Failed to submit response');
      setStatus('ready');
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Loading state
  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingSpinner} />
          <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 16 }}>Loading offer details...</p>
        </div>
      </div>
    );
  }
  
  // Expired state
  if (status === 'expired') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle('#fef3c7')}>
            <span style={{ fontSize: 32 }}>⏰</span>
          </div>
          <h1 style={styles.title}>Offer Expired</h1>
          <p style={styles.subtitle}>
            This offer has expired. Please contact the organization directly for an updated offer.
          </p>
        </div>
      </div>
    );
  }
  
  // Already responded state
  if (status === 'already_responded') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle('#dbeafe')}>
            <span style={{ fontSize: 32 }}>✓</span>
          </div>
          <h1 style={styles.title}>Already Responded</h1>
          <p style={styles.subtitle}>
            A response has already been submitted for this offer.
          </p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (status === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle('#fee2e2')}>
            <span style={{ fontSize: 32 }}>❌</span>
          </div>
          <h1 style={styles.title}>Error</h1>
          <p style={styles.subtitle}>{error}</p>
        </div>
      </div>
    );
  }
  
  // Success state
  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle(
            responseType === 'accept' ? '#dcfce7' : 
            responseType === 'counter' ? '#dbeafe' : '#fee2e2'
          )}>
            <span style={{ fontSize: 32 }}>
              {responseType === 'accept' ? '✓' : responseType === 'counter' ? '↔️' : '✕'}
            </span>
          </div>
          <h1 style={styles.title}>
            {responseType === 'accept' ? 'Offer Accepted!' : 
             responseType === 'counter' ? 'Counter Offer Submitted' : 'Offer Declined'}
          </h1>
          <p style={styles.subtitle}>
            {responseType === 'accept' 
              ? `Thank you for accepting the offer of ${formatCurrency(offer?.offerAmount || 0)}. Payment will be processed within the agreed terms.`
              : responseType === 'counter'
              ? `Your counter offer of ${formatCurrency(parseFloat(counterAmount))} has been submitted. The organization will review and respond shortly.`
              : 'The offer has been declined. Thank you for your response.'}
          </p>
          <div style={styles.contactBox}>
            <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>Questions?</p>
            <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
              Contact {offer?.orgName} at {offer?.orgPhone} or {offer?.orgEmail}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Ready state - show offer and response options
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Payment Offer</h1>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>from {offer?.orgName}</p>
        </div>
        
        {/* Offer Summary */}
        <div style={styles.offerBox}>
          <div style={styles.offerRow}>
            <div>
              <p style={styles.label}>Original Bill</p>
              <p style={styles.originalAmount}>{formatCurrency(offer?.originalAmount || 0)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, color: '#9ca3af' }}>→</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={styles.label}>Offer Amount</p>
              <p style={styles.offerAmount}>{formatCurrency(offer?.offerAmount || 0)}</p>
              <p style={styles.savings}>
                Save {formatCurrency((offer?.originalAmount || 0) - (offer?.offerAmount || 0))} 
                ({100 - (offer?.offerPercentage || 0)}% off)
              </p>
            </div>
          </div>
        </div>
        
        {/* Details */}
        <div style={styles.details}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Patient</span>
            <span style={styles.detailValue}>{offer?.patientName}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Date of Service</span>
            <span style={styles.detailValue}>{offer?.dateOfService ? formatDate(offer.dateOfService) : '-'}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Offer Valid Until</span>
            <span style={styles.detailValue}>{offer?.expiresAt ? formatDate(offer.expiresAt) : '30 days'}</span>
          </div>
        </div>
        
        {/* Response Options */}
        <div style={styles.responseSection}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#0f172a' }}>Your Response</h2>
          
          <div style={styles.buttonGroup}>
            <button
              onClick={() => setResponseType('accept')}
              style={{
                ...styles.responseButton,
                ...(responseType === 'accept' ? styles.acceptButtonActive : styles.acceptButton)
              }}
            >
              <span style={{ fontSize: 20, marginRight: 8 }}>✓</span>
              Accept Offer
            </button>
            
            <button
              onClick={() => setResponseType('counter')}
              style={{
                ...styles.responseButton,
                ...(responseType === 'counter' ? styles.counterButtonActive : styles.counterButton)
              }}
            >
              <span style={{ fontSize: 20, marginRight: 8 }}>↔️</span>
              Counter Offer
            </button>
            
            <button
              onClick={() => setResponseType('reject')}
              style={{
                ...styles.responseButton,
                ...(responseType === 'reject' ? styles.rejectButtonActive : styles.rejectButton)
              }}
            >
              <span style={{ fontSize: 20, marginRight: 8 }}>✕</span>
              Decline
            </button>
          </div>
          
          {/* Counter offer input */}
          {responseType === 'counter' && (
            <div style={styles.counterForm}>
              <label style={styles.inputLabel}>Your Counter Offer Amount</label>
              <div style={styles.currencyInput}>
                <span style={styles.currencySymbol}>$</span>
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={styles.input}
                />
              </div>
              
              <label style={{ ...styles.inputLabel, marginTop: 16 }}>Notes (optional)</label>
              <textarea
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Add any notes or justification for your counter offer..."
                style={styles.textarea}
                rows={3}
              />
            </div>
          )}
          
          {/* Submit button */}
          {responseType && (
            <button
              onClick={handleSubmit}
              disabled={responseType === 'counter' && !counterAmount}
              style={{
                ...styles.submitButton,
                opacity: (responseType === 'counter' && !counterAmount) ? 0.5 : 1,
                cursor: (responseType === 'counter' && !counterAmount) ? 'not-allowed' : 'pointer'
              }}
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Response'}
            </button>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}
        
        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
            Questions? Contact {offer?.orgName} at {offer?.orgPhone}
          </p>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '40px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    maxWidth: 500,
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 24px 0',
    textAlign: 'center' as const,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid #e5e7eb',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '40px auto',
  },
  iconCircle: (bg: string) => ({
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '40px auto 24px',
  }),
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center' as const,
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
    margin: '0 0 32px',
    padding: '0 24px',
    lineHeight: 1.5,
  },
  contactBox: {
    background: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    margin: '0 24px 24px',
    textAlign: 'center' as const,
  },
  offerBox: {
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    padding: 24,
    margin: '24px 24px 0',
    borderRadius: 12,
  },
  offerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: 0,
  },
  originalAmount: {
    fontSize: 24,
    fontWeight: 600,
    color: '#374151',
    margin: '4px 0 0',
    textDecoration: 'line-through',
    opacity: 0.7,
  },
  offerAmount: {
    fontSize: 32,
    fontWeight: 700,
    color: '#16a34a',
    margin: '4px 0 0',
  },
  savings: {
    fontSize: 14,
    color: '#16a34a',
    margin: '4px 0 0',
    fontWeight: 500,
  },
  details: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 500,
  },
  responseSection: {
    padding: 24,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
  },
  responseButton: {
    flex: 1,
    padding: '16px 12px',
    borderRadius: 10,
    border: '2px solid',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  acceptButton: {
    borderColor: '#d1fae5',
    background: '#f0fdf4',
    color: '#16a34a',
  },
  acceptButtonActive: {
    borderColor: '#16a34a',
    background: '#16a34a',
    color: 'white',
  },
  counterButton: {
    borderColor: '#dbeafe',
    background: '#eff6ff',
    color: '#2563eb',
  },
  counterButtonActive: {
    borderColor: '#2563eb',
    background: '#2563eb',
    color: 'white',
  },
  rejectButton: {
    borderColor: '#fee2e2',
    background: '#fef2f2',
    color: '#dc2626',
  },
  rejectButtonActive: {
    borderColor: '#dc2626',
    background: '#dc2626',
    color: 'white',
  },
  counterForm: {
    marginTop: 20,
    padding: 16,
    background: '#f9fafb',
    borderRadius: 10,
  },
  inputLabel: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 8,
  },
  currencyInput: {
    position: 'relative' as const,
  },
  currencySymbol: {
    position: 'absolute' as const,
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6b7280',
    fontSize: 16,
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 28px',
    fontSize: 18,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical' as const,
  },
  submitButton: {
    width: '100%',
    padding: '16px 24px',
    marginTop: 20,
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBox: {
    margin: '0 24px 24px',
    padding: 12,
    background: '#fee2e2',
    borderRadius: 8,
    color: '#991b1b',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  footer: {
    padding: 16,
    background: '#f9fafb',
    textAlign: 'center' as const,
  },
};
