'use client';

// Phase 2C: Send Offer Modal Component

import { useState, useEffect } from 'react';

interface Bill {
  id: number;
  provider_name: string;
  provider_fax?: string;
  provider_email?: string;
  member_name: string;
  total_billed: number;
  fair_price?: number;
}

interface SendOfferModalProps {
  bill: Bill;
  negotiationId?: number;
  onClose: () => void;
  onSent: (result: any) => void;
}

export function SendOfferModal({ bill, negotiationId, onClose, onSent }: SendOfferModalProps) {
  const [method, setMethod] = useState<'fax' | 'email'>('fax');
  const [recipient, setRecipient] = useState('');
  const [offerAmount, setOfferAmount] = useState(0);
  const [offerPercentage, setOfferPercentage] = useState(50);
  const [letterType, setLetterType] = useState('initial_offer');
  const [ccEmails, setCcEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  // Calculate offer amount from percentage
  useEffect(() => {
    const amount = (bill.total_billed * offerPercentage) / 100;
    setOfferAmount(Math.round(amount * 100) / 100);
  }, [offerPercentage, bill.total_billed]);
  
  // Set default recipient based on method
  useEffect(() => {
    if (method === 'fax' && bill.provider_fax) {
      setRecipient(bill.provider_fax);
    } else if (method === 'email' && bill.provider_email) {
      setRecipient(bill.provider_email);
    }
  }, [method, bill]);
  
  const loadPreview = async () => {
    try {
      const response = await fetch('/api/communication/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          negotiationId,
          offerAmount,
          letterType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setPreviewHtml(data.html);
        setShowPreview(true);
      } else {
        setError(data.error || 'Failed to generate preview');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const handleSend = async () => {
    if (!recipient) {
      setError('Recipient is required');
      return;
    }
    
    setSending(true);
    setError('');
    
    try {
      const response = await fetch('/api/communication/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          negotiationId,
          method,
          recipient,
          offerAmount,
          letterType,
          ccEmails: ccEmails ? ccEmails.split(',').map(e => e.trim()) : undefined,
          customMessage: customMessage || undefined
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Save the recipient to the bill for future offers
        const contactUpdate: Record<string, string> = {};
        if (method === 'email') {
          contactUpdate.providerEmail = recipient;
        } else {
          contactUpdate.providerFax = recipient;
        }
        await fetch(`/api/db/bill-negotiator/bills/${bill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactUpdate)
        });
        
        onSent(data);
      } else {
        setError(data.error || 'Failed to send offer');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      width: '100%',
      maxWidth: showPreview ? '900px' : '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280'
    },
    body: {
      padding: '24px',
      display: 'flex',
      gap: '24px'
    },
    form: {
      flex: showPreview ? '0 0 350px' : '1'
    },
    preview: {
      flex: '1',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'auto',
      maxHeight: '500px'
    },
    field: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: '#fff'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      minHeight: '80px',
      resize: 'vertical' as const
    },
    methodTabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '20px'
    },
    methodTab: (active: boolean) => ({
      flex: '1',
      padding: '12px',
      border: active ? '2px solid #8B5CF6' : '1px solid #d1d5db',
      borderRadius: '8px',
      background: active ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : '#fff',
      cursor: 'pointer',
      textAlign: 'center' as const,
      fontSize: '14px',
      fontWeight: active ? '600' : '400',
      color: active ? '#7c3aed' : '#6b7280'
    }),
    offerBox: {
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    },
    offerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '12px',
      fontSize: '14px'
    },
    offerLabel: {
      color: '#6b7280'
    },
    offerValue: {
      fontWeight: '600',
      color: '#1f2937'
    },
    slider: {
      width: '100%',
      marginTop: '12px'
    },
    sliderLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: '#9ca3af',
      marginBottom: '4px'
    },
    error: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    footer: {
      padding: '20px 24px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    },
    button: (primary: boolean) => ({
      padding: '10px 20px',
      borderRadius: '8px',
      border: primary ? 'none' : '1px solid #d1d5db',
      background: primary ? 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%)' : '#fff',
      color: primary ? '#fff' : '#374151',
      fontWeight: '500',
      fontSize: '14px',
      cursor: 'pointer',
      opacity: sending ? 0.7 : 1
    }),
    icon: {
      marginRight: '8px'
    }
  };
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>📤 Send Offer Letter</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.body}>
          <div style={styles.form}>
            {/* Bill Summary */}
            <div style={{ ...styles.field, backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>{bill.provider_name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Patient: {bill.member_name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Original Bill: {formatCurrency(bill.total_billed)}</div>
            </div>
            
            {/* Send Method */}
            <div style={styles.methodTabs}>
              <div
                style={styles.methodTab(method === 'fax')}
                onClick={() => setMethod('fax')}
              >
                📠 Fax
              </div>
              <div
                style={styles.methodTab(method === 'email')}
                onClick={() => setMethod('email')}
              >
                ✉️ Email
              </div>
            </div>
            
            {/* Recipient */}
            <div style={styles.field}>
              <label style={styles.label}>
                {method === 'fax' ? 'Fax Number' : 'Email Address'}
              </label>
              <input
                type={method === 'fax' ? 'tel' : 'email'}
                style={styles.input}
                placeholder={method === 'fax' ? '(555) 123-4567' : 'billing@provider.com'}
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
              />
            </div>
            
            {/* CC Emails (for email only) */}
            {method === 'email' && (
              <div style={styles.field}>
                <label style={styles.label}>CC (comma-separated)</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="supervisor@provider.com, ar@provider.com"
                  value={ccEmails}
                  onChange={e => setCcEmails(e.target.value)}
                />
              </div>
            )}
            
            {/* Letter Type */}
            <div style={styles.field}>
              <label style={styles.label}>Letter Type</label>
              <select
                style={styles.select}
                value={letterType}
                onChange={e => setLetterType(e.target.value)}
              >
                <option value="initial_offer">Initial Offer</option>
                <option value="counter_offer">Counter Offer Response</option>
                <option value="final_offer">Final Offer</option>
              </select>
            </div>
            
            {/* Offer Amount */}
            <div style={styles.offerBox}>
              <div style={styles.offerRow}>
                <span style={styles.offerLabel}>Original Bill</span>
                <span style={styles.offerValue}>{formatCurrency(bill.total_billed)}</span>
              </div>
              {bill.fair_price && (
                <div style={styles.offerRow}>
                  <span style={styles.offerLabel}>Fair Price (150% Medicare)</span>
                  <span style={styles.offerValue}>{formatCurrency(bill.fair_price)}</span>
                </div>
              )}
              <div style={{ ...styles.offerRow, paddingTop: '12px', borderTop: '1px dashed #c4b5fd' }}>
                <span style={{ ...styles.offerLabel, fontWeight: '600', color: '#7c3aed' }}>Your Offer</span>
                <span style={{ ...styles.offerValue, fontSize: '18px', color: '#7c3aed' }}>
                  {formatCurrency(offerAmount)} ({offerPercentage}%)
                </span>
              </div>
              
              <div style={styles.sliderLabel}>
                <span>30%</span>
                <span>50%</span>
                <span>70%</span>
                <span>100%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={offerPercentage}
                onChange={e => setOfferPercentage(parseInt(e.target.value))}
                style={styles.slider}
              />
            </div>
            
            {/* Custom Message */}
            <div style={styles.field}>
              <label style={styles.label}>Custom Note (optional)</label>
              <textarea
                style={styles.textarea}
                placeholder="Add a personal note to the offer letter..."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
              />
            </div>
            
            {error && <div style={styles.error}>❌ {error}</div>}
          </div>
          
          {/* Preview Panel */}
          {showPreview && (
            <div style={styles.preview}>
              <iframe
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Offer Letter Preview"
              />
            </div>
          )}
        </div>
        
        <div style={styles.footer}>
          <button
            style={styles.button(false)}
            onClick={loadPreview}
          >
            👁️ Preview
          </button>
          <button
            style={styles.button(false)}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={styles.button(true)}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? '⏳ Sending...' : `📤 Send via ${method === 'fax' ? 'Fax' : 'Email'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
