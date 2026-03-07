'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { SendOfferModal } from '@/components/SendOfferModal';

interface LineItem {
  cpt_code: string;
  description: string;
  quantity: number;
  charge: number;
  medicare_rate?: number;
  fair_price?: number;
}

interface Bill {
  id: number;
  client_id: number;
  client_name?: string;
  member_id: string;
  member_name: string;
  provider_name: string;
  provider_npi: string;
  provider_tax_id?: string;
  provider_email?: string;
  provider_fax?: string;
  provider_address?: string;
  account_number: string;
  date_of_service: string;
  total_billed: number;
  medicare_rate?: number;
  fair_price: number;
  status: string;
  line_items?: LineItem[];
  notes?: string;
  received_at: string;
  analyzed_at?: string;
  settled_at?: string;
  created_at: string;
  updated_at: string;
}

interface Negotiation {
  id: number;
  bill_id: number;
  round: number;
  strategy: string;
  initial_offer?: number;
  current_offer?: number;
  counter_amount?: number;
  final_amount?: number;
  status: string;
  response_type: string;
  savings_amount?: number;
  savings_percent?: number;
  offer_sent_at?: string;
  offer_sent_via?: 'fax' | 'email';
  response_received_at?: string;
  settled_at?: string;
  auto_negotiated: boolean;
  notes?: string;
  created_at: string;
}

interface ProviderIntel {
  npi: string;
  name: string;
  avg_settlement_percent?: number;
  total_negotiations?: number;
  preferred_strategy?: string;
  notes?: string;
}

// Status progression for visual indicator
const STATUS_STEPS = [
  { key: 'received', label: 'Received', icon: '📥' },
  { key: 'analyzing', label: 'Analyzing', icon: 'search' },
  { key: 'ready_to_negotiate', label: 'Ready', icon: 'check' },
  { key: 'offer_sent', label: 'Offer Sent', icon: '📤' },
  { key: 'awaiting_response', label: 'Awaiting', icon: '⏳' },
  { key: 'settled', label: 'Settled', icon: '🤝' },
  { key: 'paid', label: 'Paid', icon: 'dollar' },
];

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
  
  const [bill, setBill] = useState<Bill | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [providerIntel, setProviderIntel] = useState<ProviderIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerStrategy, setOfferStrategy] = useState('cash_pay');
  const [responseType, setResponseType] = useState('accepted');
  const [counterAmount, setCounterAmount] = useState('');

  const fetchBill = useCallback(async () => {
    try {
      const res = await fetch(`/api/db/bill-negotiator/bills/${billId}`);
      if (!res.ok) throw new Error('Bill not found');
      const data = await res.json();
      
      // API returns { bill, negotiations, communications, providerIntel }
      const billData = data.bill || data;
      setBill(billData);
      
      // Also set negotiations if returned
      if (data.negotiations) {
        setNegotiations(data.negotiations);
      }
      
      // Calculate suggested offer if fair_price exists (only on initial load)
      if (billData.fair_price) {
        setOfferAmount(prev => prev || Math.round(billData.fair_price * 0.6).toString());
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
    }
  }, [billId]); // Removed offerAmount - was causing re-fetch on every keystroke

  const fetchNegotiations = useCallback(async () => {
    try {
      const res = await fetch(`/api/db/bill-negotiator/negotiations?bill_id=${billId}`);
      const data = await res.json();
      setNegotiations(data.negotiations || []);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    }
  }, [billId]);

  const fetchProviderIntel = useCallback(async () => {
    if (!bill?.provider_npi) return;
    try {
      const res = await fetch(`/api/bill-negotiator/providers?npi=${bill.provider_npi}`);
      const data = await res.json();
      if (data.provider) {
        setProviderIntel(data.provider);
      }
    } catch (error) {
      console.error('Error fetching provider intel:', error);
    }
  }, [bill?.provider_npi]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchBill();
      await fetchNegotiations();
      setLoading(false);
    };
    load();
  }, [fetchBill, fetchNegotiations]);

  useEffect(() => {
    if (bill?.provider_npi) {
      fetchProviderIntel();
    }
  }, [bill?.provider_npi, fetchProviderIntel]);

  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settled': 
      case 'paid': return { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' };
      case 'offer_sent': 
      case 'awaiting_response': return { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' };
      case 'counter_received': return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
      case 'ready_to_negotiate': return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
      case 'received':
      case 'analyzing': return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
      case 'failed':
      case 'cancelled': return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      default: return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      received: 'New Bill',
      analyzing: 'Analyzing',
      ready_to_negotiate: 'Ready to Negotiate',
      offer_sent: 'Offer Sent',
      awaiting_response: 'Awaiting Response',
      counter_received: 'Counter Received',
      settled: 'Settled',
      paid: 'Paid',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const getStatusIndex = (status: string) => {
    if (status === 'counter_received') return 4;
    const index = STATUS_STEPS.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  const analyzeBill = async () => {
    setActionLoading(true);
    try {
      // Calculate fair price via Medicare rates
      const cptCodes = bill?.line_items?.map(li => li.cpt_code) || ['99213']; // Default
      const ratesRes = await fetch('/api/bill-negotiator/medicare-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cptCodes, multiplier: 1.5 })
      });
      const ratesData = await ratesRes.json();
      
      // Update bill with fair price
      await fetch(`/api/db/bill-negotiator/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ready_to_negotiate',
          medicare_rate: ratesData.totalMedicareRate,
          fair_price: ratesData.totalFairPrice,
          analyzed_at: new Date().toISOString()
        })
      });
      
      await fetchBill();
    } catch (error) {
      console.error('Error analyzing bill:', error);
      alert('Failed to analyze bill');
    }
    setActionLoading(false);
  };

  const createOffer = async () => {
    if (!offerAmount) {
      alert('Please enter an offer amount');
      return;
    }
    
    setActionLoading(true);
    try {
      // Create negotiation
      const res = await fetch('/api/db/bill-negotiator/negotiations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_id: parseInt(billId),
          strategy: offerStrategy,
          offer_amount: parseFloat(offerAmount)
        })
      });
      
      if (!res.ok) throw new Error('Failed to create offer');
      
      const negData = await res.json();
      const negotiationId = negData.negotiation?.id;
      
      // Determine send method - continue with same method as previous communication
      // Check the last negotiation's method, or default to email if first offer
      let sendMethod: 'email' | 'fax' = 'email';
      let recipient = bill?.provider_email;
      
      // If there are previous negotiations, check how the last one was sent
      if (negotiations.length > 0) {
        const lastNeg = negotiations[0]; // Most recent
        if (lastNeg.offer_sent_via === 'fax' && bill?.provider_fax) {
          sendMethod = 'fax';
          recipient = bill.provider_fax;
        } else if (lastNeg.offer_sent_via === 'email' && bill?.provider_email) {
          sendMethod = 'email';
          recipient = bill.provider_email;
        }
      }
      
      // Fallback: if no recipient for preferred method, try the other
      if (!recipient) {
        if (sendMethod === 'email' && bill?.provider_fax) {
          sendMethod = 'fax';
          recipient = bill.provider_fax;
        } else if (sendMethod === 'fax' && bill?.provider_email) {
          sendMethod = 'email';
          recipient = bill.provider_email;
        }
      }
      
      if (recipient && negotiationId) {
        // Send the offer via email/fax
        console.log('Sending offer:', { billId, negotiationId, sendMethod, recipient, offerAmount });
        const sendRes = await fetch('/api/communication/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billId: parseInt(billId),
            negotiationId,
            method: sendMethod,
            recipient,
            offerAmount: parseFloat(offerAmount),
            letterType: negotiations.length === 0 ? 'initial_offer' : 'counter_offer'
          })
        });
        
        const sendData = await sendRes.json();
        if (sendData.success) {
          // Update negotiation with the method used
          await fetch(`/api/db/bill-negotiator/negotiations/${negotiationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offer_sent_via: sendMethod })
          });
          
          // Save the recipient to the bill for future offers
          const contactUpdate: Record<string, string> = {};
          if (sendMethod === 'email') {
            contactUpdate.providerEmail = recipient;
          } else {
            contactUpdate.providerFax = recipient;
          }
          await fetch(`/api/db/bill-negotiator/bills/${billId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactUpdate)
          });
          
          alert(`✅ Offer sent successfully via ${sendMethod} to ${recipient}`);
        } else {
          console.warn('Offer created but email failed:', sendData.error);
          alert(`⚠️ Offer created but sending failed: ${sendData.error || 'Unknown error'}. You can resend from the negotiation history.`);
        }
      } else {
        console.log('Missing recipient:', { provider_fax: bill?.provider_fax, provider_email: bill?.provider_email });
        alert(`⚠️ Offer created but no provider email/fax on file (fax: ${bill?.provider_fax || 'none'}, email: ${bill?.provider_email || 'none'}). Please add contact info and send manually.`);
      }
      
      setShowOfferModal(false);
      setOfferAmount('');
      await fetchBill();
      await fetchNegotiations();
    } catch (error) {
      console.error('Error creating offer:', error);
      alert('Failed to create offer');
    }
    setActionLoading(false);
  };

  const recordResponse = async () => {
    const activeNeg = negotiations.find(n => n.response_type === 'pending');
    if (!activeNeg) {
      alert('No pending negotiation found');
      return;
    }
    
    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = {
        response_type: responseType,
        response_received_at: new Date().toISOString()
      };
      
      if (responseType === 'accepted') {
        payload.final_amount = activeNeg.current_offer || activeNeg.initial_offer;
        payload.status = 'accepted';
      } else if (responseType === 'counter_received' && counterAmount) {
        payload.counter_amount = parseFloat(counterAmount);
      } else if (responseType === 'rejected') {
        payload.status = 'rejected';
      }
      
      await fetch(`/api/db/bill-negotiator/negotiations/${activeNeg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setShowResponseModal(false);
      setCounterAmount('');
      await fetchBill();
      await fetchNegotiations();
    } catch (error) {
      console.error('Error recording response:', error);
      alert('Failed to record response');
    }
    setActionLoading(false);
  };

  const markPaid = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/db/bill-negotiator/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' })
      });
      await fetchBill();
    } catch (error) {
      console.error('Error marking paid:', error);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748b' }}>Loading bill details...</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>😕</p>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Bill not found</h2>
        <Link href="/dashboard/bill-negotiator/bills" style={{ color: '#6366f1' }}>
          Back to Bills
        </Link>
      </div>
    );
  }

  const statusStyle = getStatusColor(bill.status);
  const potentialSavings = bill.total_billed - (bill.fair_price || 0);
  const savingsPercent = bill.fair_price ? ((potentialSavings / bill.total_billed) * 100).toFixed(0) : null;
  const activeNegotiation = negotiations.find(n => n.response_type === 'pending');
  const latestNegotiation = negotiations[0];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Link href="/dashboard/bill-negotiator" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bill Negotiator
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <Link href="/dashboard/bill-negotiator/bills" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bills
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#6366f1', fontWeight: 500, fontSize: '14px' }}>#{bill.id}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                {bill.member_name}
              </h1>
              <span style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: statusStyle.bg,
                color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`
              }}>
                {getStatusLabel(bill.status)}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              {bill.provider_name} • Account #{bill.account_number}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {bill.status === 'received' && (
              <button
                onClick={analyzeBill}
                disabled={actionLoading}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                {actionLoading ? 'Analyzing...' : 'Analyze Bill'}
              </button>
            )}
            
            {bill.status === 'ready_to_negotiate' && (
              <button
                onClick={() => setShowOfferModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
                Create Offer
              </button>
            )}
            
            {(bill.status === 'offer_sent' || bill.status === 'awaiting_response') && activeNegotiation && (
              <button
                onClick={() => setShowResponseModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                Record Response
              </button>
            )}
            
            {bill.status === 'counter_received' && (
              <button
                onClick={() => setShowOfferModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Counter Again
              </button>
            )}
            
            {bill.status === 'settled' && (
              <button
                onClick={markPaid}
                disabled={actionLoading}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
                {actionLoading ? 'Marking...' : 'Mark as Paid'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Progression Bar */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '20px', textTransform: 'uppercase' }}>Workflow Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Progress Line */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            right: '40px',
            height: '4px',
            background: '#e2e8f0',
            borderRadius: '2px',
            zIndex: 0
          }}>
            <div style={{
              height: '100%',
              width: `${(getStatusIndex(bill.status) / (STATUS_STEPS.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          {STATUS_STEPS.map((step, index) => {
            const currentIndex = getStatusIndex(bill.status);
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  background: isComplete ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' :
                              isCurrent ? 'white' : '#f1f5f9',
                  border: isCurrent ? '3px solid #6366f1' : 'none',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none',
                  color: isComplete ? 'white' : 'inherit'
                }}>
                  {isComplete ? '✓' : step.icon}
                </div>
                <span style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#6366f1' : isPending ? '#94a3b8' : '#0f172a'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Bill Summary Card */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Bill Summary</h2>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Amount Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 500 }}>Total Billed</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(bill.total_billed)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 500 }}>Medicare Rate</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#64748b' }}>{bill.medicare_rate ? formatCurrency(bill.medicare_rate) : '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 500 }}>Fair Price</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{bill.fair_price ? formatCurrency(bill.fair_price) : '-'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 500 }}>Potential Savings</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                    {savingsPercent ? `${savingsPercent}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date of Service</p>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>{formatDate(bill.date_of_service)}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Account Number</p>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>{bill.account_number}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Provider NPI</p>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>{bill.provider_npi || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Received</p>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>{formatDate(bill.received_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items (if available) */}
          {bill.line_items && bill.line_items.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Line Items</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>CPT Code</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Description</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Qty</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Charge</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fair Price</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.line_items.map((item, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 500, color: '#0f172a' }}>{item.cpt_code}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{item.description}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, color: '#0f172a' }}>{formatCurrency(item.charge)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 500, color: '#6366f1' }}>
                        {item.fair_price ? formatCurrency(item.fair_price) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Negotiation History */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Negotiation History</h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{negotiations.length} round{negotiations.length !== 1 ? 's' : ''}</span>
            </div>
            
            {negotiations.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '36px', marginBottom: '12px' }}>💬</p>
                <p style={{ color: '#64748b' }}>No negotiations yet</p>
                {bill.status === 'ready_to_negotiate' && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    style={{
                      marginTop: '16px',
                      padding: '10px 20px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Start Negotiation
                  </button>
                )}
              </div>
            ) : (
              <div style={{ padding: '16px 24px' }}>
                {negotiations.map((neg, i) => (
                  <div 
                    key={neg.id}
                    onClick={() => {
                      // If counter received, open send offer modal with counter context
                      if (neg.response_type === 'countered' || neg.response_type === 'counter_received') {
                        setShowOfferModal(true);
                      }
                    }}
                    style={{ 
                      padding: '16px',
                      background: i === 0 ? '#f8fafc' : 'white',
                      borderRadius: '10px',
                      marginBottom: i < negotiations.length - 1 ? '12px' : 0,
                      border: i === 0 ? '1px solid #e2e8f0' : 'none',
                      cursor: (neg.response_type === 'countered' || neg.response_type === 'counter_received') ? 'pointer' : 'default',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (neg.response_type === 'countered' || neg.response_type === 'counter_received') {
                        e.currentTarget.style.background = '#f1f5f9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = i === 0 ? '#f8fafc' : 'white';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          background: '#6366f1', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {neg.round}
                        </span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>Round {neg.round}</span>
                        {neg.auto_negotiated && (
                          <span style={{ 
                            padding: '2px 8px', 
                            background: '#ecfdf5', 
                            color: '#059669', 
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500
                          }}>
                            AUTO
                          </span>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: neg.response_type === 'accepted' ? '#dcfce7' : 
                                   neg.response_type === 'counter_received' ? '#fef3c7' :
                                   neg.response_type === 'rejected' ? '#fee2e2' : '#f1f5f9',
                        color: neg.response_type === 'accepted' ? '#16a34a' : 
                               neg.response_type === 'counter_received' ? '#d97706' :
                               neg.response_type === 'rejected' ? '#dc2626' : '#64748b'
                      }}>
                        {neg.response_type === 'pending' ? 'Awaiting Response' : 
                         neg.response_type === 'accepted' ? 'Accepted' :
                         neg.response_type === 'counter_received' ? 'Counter Received' : 'Rejected'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Our Offer</p>
                        <p style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(neg.current_offer || neg.initial_offer || 0)}</p>
                      </div>
                      {neg.counter_amount && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Their Counter</p>
                          <p style={{ fontWeight: 600, color: '#d97706' }}>{formatCurrency(neg.counter_amount)}</p>
                          {(neg.response_type === 'countered' || neg.response_type === 'counter_received') && (
                            <p style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px', fontWeight: 500 }}>
                              → Click to respond
                            </p>
                          )}
                        </div>
                      )}
                      {neg.final_amount && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Final Amount</p>
                          <p style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(neg.final_amount)}</p>
                        </div>
                      )}
                    </div>
                    
                    {neg.savings_amount && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#ecfdf5', borderRadius: '6px' }}>
                        <p style={{ fontSize: '13px', color: '#059669', fontWeight: 500 }}>
                          Saved {formatCurrency(neg.savings_amount)} ({neg.savings_percent?.toFixed(0)}%)
                        </p>
                      </div>
                    )}
                    
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
                      Strategy: {(neg.strategy || 'cash_pay').replace('_', ' ')} • {formatDate(neg.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Provider Intel Card */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Provider Intelligence</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>{bill.provider_name}</p>
              <p style={{ fontSize: '13px', color: '#64748b' }}>NPI: {bill.provider_npi || 'N/A'}</p>
            </div>
            
            {providerIntel ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Avg. Settlement</span>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>
                    {providerIntel.avg_settlement_percent?.toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Total Negotiations</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {providerIntel.total_negotiations}
                  </span>
                </div>
                {providerIntel.preferred_strategy && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Best Strategy</span>
                    <span style={{ fontWeight: 500, color: '#6366f1', textTransform: 'capitalize' }}>
                      {(providerIntel.preferred_strategy || 'unknown').replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                No historical data for this provider yet
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
                <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '14px' }}>Edit Bill Details</span>
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>📤 Send Offer Letter</span>
              </button>
              <button
                style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '14px' }}>View Communication History</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>Notes</h3>
            <textarea
              defaultValue={bill.notes || ''}
              placeholder="Add notes about this bill..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </div>

      {/* Create Offer Modal */}
      {showOfferModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>
              Create Settlement Offer
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Strategy
              </label>
              <select
                value={offerStrategy}
                onChange={(e) => setOfferStrategy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="cash_pay">Cash Pay Discount</option>
                <option value="medicare_percentage">% of Medicare</option>
                <option value="bundled_rate">Bundled Rate</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Offer Amount
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 28px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              {bill.fair_price && (
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                  Fair price: {formatCurrency(bill.fair_price)} • Suggested start: {formatCurrency(bill.fair_price * 0.6)}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowOfferModal(false)}
                style={{
                  padding: '12px 24px',
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
                onClick={createOffer}
                disabled={actionLoading || !offerAmount}
                style={{
                  padding: '12px 24px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: actionLoading || !offerAmount ? 'not-allowed' : 'pointer',
                  opacity: actionLoading || !offerAmount ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Offer Modal (Phase 2C) */}
      {showSendModal && bill && (
        <SendOfferModal
          bill={{
            id: bill.id,
            provider_name: bill.provider_name,
            provider_fax: undefined, // Add to bill interface if available
            provider_email: undefined, // Add to bill interface if available
            member_name: bill.member_name,
            total_billed: bill.total_billed,
            fair_price: bill.fair_price
          }}
          negotiationId={latestNegotiation?.id}
          onClose={() => setShowSendModal(false)}
          onSent={(result) => {
            setShowSendModal(false);
            fetchBill();
            fetchNegotiations();
            alert(`Offer sent successfully! Tracking ID: ${result.trackingId || 'N/A'}`);
          }}
        />
      )}

      {/* Record Response Modal */}
      {showResponseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>
              Record Provider Response
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>
                Response Type
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { value: 'accepted', label: 'Accepted', desc: 'Provider accepted our offer', color: '#16a34a' },
                  { value: 'counter_received', label: 'Counter Offer', desc: 'Provider sent a counter', color: '#d97706' },
                  { value: 'rejected', label: 'Rejected', desc: 'Provider declined to negotiate', color: '#dc2626' }
                ].map(opt => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px',
                      border: responseType === opt.value ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: responseType === opt.value ? `${opt.color}10` : 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="responseType"
                      value={opt.value}
                      checked={responseType === opt.value}
                      onChange={(e) => setResponseType(e.target.value)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <p style={{ fontWeight: 500, color: '#0f172a' }}>{opt.label}</p>
                      <p style={{ fontSize: '13px', color: '#64748b' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {responseType === 'counter_received' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Counter Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                  <input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 28px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResponseModal(false)}
                style={{
                  padding: '12px 24px',
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
                onClick={recordResponse}
                disabled={actionLoading || (responseType === 'counter_received' && !counterAmount)}
                style={{
                  padding: '12px 24px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Saving...' : 'Record Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
