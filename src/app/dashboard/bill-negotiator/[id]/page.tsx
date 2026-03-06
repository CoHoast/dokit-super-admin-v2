'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Bill {
  id: number;
  client_id: number;
  client_name: string;
  member_id: string;
  member_name: string;
  member_dob: string;
  provider_name: string;
  provider_npi: string;
  provider_fax: string;
  provider_email: string;
  account_number: string;
  date_of_service: string;
  total_billed: number;
  total_medicare_rate: number;
  fair_price: number;
  status: string;
  line_items: any[];
  diagnosis_codes: string[];
  document_url: string;
  received_at: string;
}

interface Negotiation {
  id: number;
  strategy: string;
  initial_offer: number;
  max_acceptable: number;
  offer_sent_at: string;
  response_type: string;
  counter_amount: number;
  final_amount: number;
  savings_amount: number;
  savings_percent: number;
  settled_at: string;
}

interface FairPriceResult {
  lineItems: Array<{
    cptCode: string;
    description: string;
    billedAmount: number;
    medicareRate: number;
    fairPrice: number;
    percentOfMedicare: number;
  }>;
  summary: {
    totalBilled: number;
    totalFairPrice: number;
    totalPotentialSavings: number;
    potentialSavingsPercent: number;
    initialOffer: number;
    maxOffer: number;
  };
}

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [fairPriceCalc, setFairPriceCalc] = useState<FairPriceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);

  useEffect(() => {
    fetchBill();
  }, [id]);

  const fetchBill = async () => {
    try {
      const res = await fetch(`/api/db/bill-negotiator/bills/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBill(data.bill);
        setNegotiations(data.negotiations || []);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
    }
    setLoading(false);
  };

  const calculateFairPrice = async () => {
    if (!bill?.line_items?.length) {
      alert('No line items to calculate');
      return;
    }

    setCalculating(true);
    try {
      const res = await fetch('/api/bill-negotiator/calculate-fair-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: bill.line_items.map((item: any) => ({
            cptCode: item.cptCode || item.code,
            description: item.description,
            units: item.units || 1,
            billedAmount: item.billedAmount || item.amount
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFairPriceCalc(data);
        
        // Update bill with fair price
        await fetch(`/api/db/bill-negotiator/bills/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fairPrice: data.summary.totalFairPrice,
            totalMedicareRate: data.summary.totalMedicareRate,
            status: 'ready_to_negotiate'
          })
        });
        
        fetchBill();
      }
    } catch (error) {
      console.error('Error calculating fair price:', error);
    }
    setCalculating(false);
  };

  const sendOffer = async () => {
    if (!bill?.fair_price) {
      alert('Calculate fair price first');
      return;
    }

    setSendingOffer(true);
    try {
      const res = await fetch('/api/db/bill-negotiator/negotiations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          clientId: bill.client_id,
          strategy: 'cash_pay',
          initialOffer: bill.fair_price,
          maxAcceptable: bill.fair_price * 1.33, // 200% of Medicare
          walkAwayMax: bill.fair_price * 1.67,   // 250% of Medicare
          sendVia: 'fax'
        })
      });

      if (res.ok) {
        fetchBill();
        alert('Offer created successfully');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
    }
    setSendingOffer(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Loading bill details...</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>Bill not found</p>
        <Link href="/dashboard/bill-negotiator" style={{ color: '#6366f1' }}>
          Back to Bill Negotiator
        </Link>
      </div>
    );
  }

  const latestNegotiation = negotiations[0];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link 
          href="/dashboard/bill-negotiator"
          style={{ 
            color: '#64748b', 
            textDecoration: 'none', 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '12px'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7"/>
          </svg>
          Back to Bills
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Bill #{bill.id}
            </h1>
            <p style={{ color: '#64748b' }}>
              {bill.member_name} • {bill.provider_name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {bill.status === 'received' && (
              <button
                onClick={calculateFairPrice}
                disabled={calculating}
                style={{
                  padding: '10px 20px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: calculating ? 0.7 : 1
                }}
              >
                {calculating ? 'Calculating...' : 'Calculate Fair Price'}
              </button>
            )}
            {(bill.status === 'ready_to_negotiate' || bill.fair_price) && !latestNegotiation && (
              <button
                onClick={sendOffer}
                disabled={sendingOffer}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: sendingOffer ? 0.7 : 1
                }}
              >
                {sendingOffer ? 'Creating...' : 'Create Offer'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Summary Card */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>
              Bill Summary
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Total Billed</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(bill.total_billed)}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Fair Price (150% Medicare)</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(bill.fair_price)}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Potential Savings</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>
                  {formatCurrency(bill.total_billed - (bill.fair_price || 0))}
                  <span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '8px' }}>
                    ({bill.fair_price ? ((1 - bill.fair_price / bill.total_billed) * 100).toFixed(0) : 0}%)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Line Items</h2>
            </div>
            {bill.line_items?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>CPT Code</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Description</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Billed</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Medicare</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fair Price</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.line_items.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 500 }}>{item.cptCode || item.code}</td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>{item.description}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.billedAmount || item.amount)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: '#64748b' }}>{formatCurrency(item.medicareRate || 0)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', color: '#16a34a', fontWeight: 500 }}>{formatCurrency(item.fairPrice || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                No line items extracted yet
              </div>
            )}
          </div>

          {/* Negotiation History */}
          {negotiations.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Negotiation History</h2>
              </div>
              <div style={{ padding: '20px 24px' }}>
                {negotiations.map((neg) => (
                  <div key={neg.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 500 }}>Offer: {formatCurrency(neg.initial_offer)}</span>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: neg.response_type === 'accepted' ? '#dcfce7' : neg.response_type === 'countered' ? '#fef3c7' : '#f1f5f9',
                        color: neg.response_type === 'accepted' ? '#16a34a' : neg.response_type === 'countered' ? '#d97706' : '#64748b'
                      }}>
                        {neg.response_type?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    {neg.counter_amount && (
                      <p style={{ color: '#64748b', fontSize: '14px' }}>
                        Counter: {formatCurrency(neg.counter_amount)}
                      </p>
                    )}
                    {neg.final_amount && (
                      <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '14px' }}>
                        Settled: {formatCurrency(neg.final_amount)} (Saved {formatCurrency(neg.savings_amount)} / {neg.savings_percent?.toFixed(0)}%)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Card */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </h3>
            <div style={{ 
              padding: '12px 16px', 
              background: bill.status === 'settled' ? '#dcfce7' : '#fef3c7',
              borderRadius: '8px',
              color: bill.status === 'settled' ? '#16a34a' : '#d97706',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              {bill.status?.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>

          {/* Member Info */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Member
            </h3>
            <p style={{ fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>{bill.member_name || 'Unknown'}</p>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>ID: {bill.member_id || '—'}</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>DOB: {formatDate(bill.member_dob)}</p>
          </div>

          {/* Provider Info */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Provider
            </h3>
            <p style={{ fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>{bill.provider_name || 'Unknown'}</p>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>NPI: {bill.provider_npi || '—'}</p>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Fax: {bill.provider_fax || '—'}</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Account: {bill.account_number || '—'}</p>
          </div>

          {/* Service Details */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Service Details
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              Date: {formatDate(bill.date_of_service)}
            </p>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              Received: {formatDate(bill.received_at)}
            </p>
            {bill.diagnosis_codes?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Diagnosis Codes:</p>
                {bill.diagnosis_codes.map((code: string, i: number) => (
                  <span key={i} style={{ 
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginRight: '4px',
                    marginBottom: '4px'
                  }}>
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
