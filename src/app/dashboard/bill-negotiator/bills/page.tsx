'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchBills,
  sendOffer,
  acceptCounter,
  escalateBill,
  DEMO_MODE,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  type Bill,
} from '@/lib/sirkl-api';

export default function BillsPage() {
  const { isDark, colors } = useTheme();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadBillsAsync = async () => {
      setLoading(true);
      try {
        const data = await fetchBills({ 
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery || undefined,
        });
        setBills(data.bills);
      } catch (error) {
        console.error('Failed to load bills:', error);
      }
      setLoading(false);
    };
    loadBillsAsync();
  }, [statusFilter, searchQuery]);

  const refreshBills = async () => {
    const data = await fetchBills({ 
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    });
    setBills(data.bills);
  };

  const handleSendOffer = async (billId: number, amount: number) => {
    setActionLoading(true);
    try {
      const result = await sendOffer(billId, amount);
      if (result.success) {
        setActionMessage({ type: 'success', text: result.message });
        refreshBills();
        setTimeout(() => setSelectedBill(null), 1500);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to send offer' });
    }
    setActionLoading(false);
  };

  const handleAcceptCounter = async (billId: number) => {
    setActionLoading(true);
    try {
      const result = await acceptCounter(billId);
      if (result.success) {
        setActionMessage({ type: 'success', text: result.message });
        refreshBills();
        setTimeout(() => setSelectedBill(null), 1500);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to accept counter' });
    }
    setActionLoading(false);
  };

  const handleEscalate = async (billId: number) => {
    setActionLoading(true);
    try {
      const result = await escalateBill(billId, 'Manual escalation');
      if (result.success) {
        setActionMessage({ type: 'success', text: result.message });
        refreshBills();
        setTimeout(() => setSelectedBill(null), 1500);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to escalate' });
    }
    setActionLoading(false);
  };

  const statusCounts = {
    all: bills.length,
    received: bills.filter(b => b.status === 'received').length,
    analyzing: bills.filter(b => b.status === 'analyzing').length,
    offer_sent: bills.filter(b => ['offer_sent', 'awaiting_response'].includes(b.status)).length,
    counter_received: bills.filter(b => b.status === 'counter_received').length,
    settled: bills.filter(b => ['settled', 'paid'].includes(b.status)).length,
  };

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'received', label: 'New' },
    { key: 'analyzing', label: 'Analyzing' },
    { key: 'offer_sent', label: 'Offer Sent' },
    { key: 'counter_received', label: 'Counter' },
    { key: 'settled', label: 'Settled' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Bills
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Manage and track all medical bills
            {DEMO_MODE && (
              <span style={{
                marginLeft: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                color: isDark ? '#fbbf24' : '#92400e',
              }}>
                DEMO DATA
              </span>
            )}
          </p>
        </div>
        <Link href="/dashboard/upload" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: colors.gradient,
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600',
          textDecoration: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Bill
        </Link>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '16px 20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          {/* Search */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            backgroundColor: colors.bg,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by bill ID, provider, or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: colors.text,
                fontSize: '14px',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statusTabs.map((tab) => {
            const count = statusCounts[tab.key as keyof typeof statusCounts] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: statusFilter === tab.key ? colors.accent : 'transparent',
                  color: statusFilter === tab.key ? '#fff' : colors.textMuted,
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Bills Table */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 100px',
          padding: '12px 20px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
        }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Bill ID</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Provider / Member</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Billed</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Fair Price</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Savings</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>Status</span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: `2px solid ${colors.border}`,
              borderTopColor: colors.accent,
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: colors.textMuted, fontSize: '14px' }}>Loading bills...</p>
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
          </div>
        ) : bills.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: colors.textMuted }}>No bills found</p>
          </div>
        ) : (
          <AnimatePresence>
            {bills.map((bill, i) => {
              const statusStyle = getStatusColor(bill.status, isDark);
              const savings = bill.savings_amount || (bill.fair_price ? bill.total_billed - bill.fair_price : null);
              const savingsPercent = bill.savings_percent || (savings && bill.total_billed ? Math.round((savings / bill.total_billed) * 100) : null);
              
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedBill(bill)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 100px',
                    padding: '16px 20px',
                    borderBottom: i < bills.length - 1 ? `1px solid ${colors.border}` : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: colors.accent }}>BILL-{bill.id}</p>
                    <p style={{ fontSize: '12px', color: colors.textMuted }}>{formatDate(bill.received_at)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{bill.provider_name}</p>
                    <p style={{ fontSize: '13px', color: colors.textMuted }}>{bill.member_name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{formatCurrency(bill.total_billed)}</p>
                  </div>
                  <div>
                    {bill.fair_price ? (
                      <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>
                        {formatCurrency(bill.fair_price)}
                      </p>
                    ) : (
                      <p style={{ fontSize: '14px', color: colors.textMuted }}>—</p>
                    )}
                  </div>
                  <div>
                    {savings ? (
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#4ade80' : '#16a34a' }}>
                          {formatCurrency(savings)}
                        </p>
                        {savingsPercent && (
                          <p style={{ fontSize: '12px', color: isDark ? '#4ade80' : '#16a34a' }}>
                            {savingsPercent}% saved
                          </p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: colors.textMuted }}>—</p>
                    )}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '12px',
                    fontWeight: '500',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                    textAlign: 'center',
                  }}>
                    {getStatusLabel(bill.status)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Bill Detail Modal */}
      <AnimatePresence>
        {selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedBill(null); setActionMessage(null); }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '16px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '85vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Bill Details</h2>
                  <p style={{ fontSize: '14px', color: colors.accent }}>BILL-{selectedBill.id}</p>
                </div>
                <button
                  onClick={() => { setSelectedBill(null); setActionMessage(null); }}
                  style={{
                    padding: '8px',
                    backgroundColor: colors.bg,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: colors.textMuted,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px' }}>
                {/* Action Message */}
                {actionMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '12px 16px',
                      marginBottom: '20px',
                      borderRadius: '8px',
                      backgroundColor: actionMessage.type === 'success' 
                        ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                        : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'),
                      color: actionMessage.type === 'success'
                        ? (isDark ? '#4ade80' : '#16a34a')
                        : (isDark ? '#f87171' : '#dc2626'),
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    {actionMessage.text}
                  </motion.div>
                )}

                {/* Status Badge */}
                <div style={{ marginBottom: '24px' }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    fontWeight: '500',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    backgroundColor: getStatusColor(selectedBill.status, isDark).bg,
                    color: getStatusColor(selectedBill.status, isDark).color,
                  }}>
                    {getStatusLabel(selectedBill.status)}
                  </span>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Provider</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>{selectedBill.provider_name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Service Date</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>
                      {selectedBill.service_date ? formatDate(selectedBill.service_date) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Member</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>{selectedBill.member_name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>Received</p>
                    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text }}>
                      {formatDateTime(selectedBill.received_at)}
                    </p>
                  </div>
                  {selectedBill.cpt_codes && selectedBill.cpt_codes.length > 0 && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>CPT Codes</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedBill.cpt_codes.map((code) => (
                          <span key={code} style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: colors.text,
                          }}>
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Amounts */}
                <div style={{
                  backgroundColor: colors.bg,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: colors.textMuted }}>Billed Amount</span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                      {formatCurrency(selectedBill.total_billed)}
                    </span>
                  </div>
                  {selectedBill.fair_price && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: colors.textMuted }}>Fair Price (Calculated)</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                        {formatCurrency(selectedBill.fair_price)}
                      </span>
                    </div>
                  )}
                  {selectedBill.current_offer && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: colors.textMuted }}>Current Offer</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: colors.accent }}>
                        {formatCurrency(selectedBill.current_offer)}
                      </span>
                    </div>
                  )}
                  {selectedBill.savings_amount && (
                    <div style={{ 
                      borderTop: `1px solid ${colors.border}`, 
                      paddingTop: '12px', 
                      display: 'flex', 
                      justifyContent: 'space-between' 
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#4ade80' : '#16a34a' }}>
                        Total Savings ({selectedBill.savings_percent}%)
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: isDark ? '#4ade80' : '#16a34a' }}>
                        {formatCurrency(selectedBill.savings_amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions based on status */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Analyzing - wait for fair price */}
                  {selectedBill.status === 'analyzing' && (
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#dbeafe',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        border: `2px solid ${colors.blue}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <span style={{ fontSize: '14px', color: colors.blue }}>
                        AI is analyzing bill and calculating fair price...
                      </span>
                    </div>
                  )}

                  {/* Ready to negotiate - send offer */}
                  {(selectedBill.status === 'received' || selectedBill.status === 'ready_to_negotiate') && selectedBill.fair_price && (
                    <button
                      onClick={() => handleSendOffer(selectedBill.id, selectedBill.fair_price!)}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: colors.gradient,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: actionLoading ? 'wait' : 'pointer',
                        opacity: actionLoading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Send Offer ({formatCurrency(selectedBill.fair_price)})
                    </button>
                  )}

                  {/* Counter received - accept or counter */}
                  {selectedBill.status === 'counter_received' && (
                    <>
                      <button
                        onClick={() => handleAcceptCounter(selectedBill.id)}
                        disabled={actionLoading}
                        style={{
                          flex: 1,
                          padding: '14px',
                          background: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
                          border: `1px solid ${isDark ? '#4ade80' : '#16a34a'}`,
                          borderRadius: '8px',
                          color: isDark ? '#4ade80' : '#16a34a',
                          fontWeight: '600',
                          cursor: actionLoading ? 'wait' : 'pointer',
                        }}
                      >
                        Accept Counter
                      </button>
                      <button
                        onClick={() => selectedBill.fair_price && handleSendOffer(selectedBill.id, selectedBill.fair_price)}
                        disabled={actionLoading || !selectedBill.fair_price}
                        style={{
                          flex: 1,
                          padding: '14px',
                          background: colors.gradient,
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: actionLoading ? 'wait' : 'pointer',
                        }}
                      >
                        Send Counter
                      </button>
                    </>
                  )}

                  {/* Escalate button */}
                  {!['settled', 'paid', 'failed'].includes(selectedBill.status) && (
                    <button
                      onClick={() => handleEscalate(selectedBill.id)}
                      disabled={actionLoading}
                      style={{
                        padding: '14px 20px',
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        fontWeight: '500',
                        cursor: actionLoading ? 'wait' : 'pointer',
                      }}
                    >
                      Escalate
                    </button>
                  )}

                  {/* Settled - show result */}
                  {['settled', 'paid'].includes(selectedBill.status) && (
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#dcfce7',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#4ade80' : '#16a34a' }}>
                        ✓ Bill settled successfully
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
