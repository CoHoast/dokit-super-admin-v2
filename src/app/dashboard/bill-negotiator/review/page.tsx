'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  fetchBills,
  acceptCounter,
  sendOffer,
  escalateBill,
  DEMO_MODE,
  formatCurrency,
  type Bill,
} from '@/lib/sirkl-api';

interface ReviewItem extends Bill {
  reviewReason: 'counter' | 'high_value' | 'overdue' | 'low_confidence';
  priority: 'urgent' | 'high' | 'medium';
  waitingTime: string;
}

export default function ReviewPage() {
  const { isDark, colors } = useTheme();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'counter' | 'high_value' | 'overdue'>('all');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadReviewItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReviewItems = async () => {
    setLoading(true);
    try {
      // Fetch bills that need review
      const [counters, allBills] = await Promise.all([
        fetchBills({ status: 'counter_received' }),
        fetchBills({ limit: 50 }),
      ]);

      const reviewItems: ReviewItem[] = [];

      // Add counters
      counters.bills.forEach(bill => {
        reviewItems.push({
          ...bill,
          reviewReason: 'counter',
          priority: 'urgent',
          waitingTime: getWaitingTime(bill.updated_at),
        });
      });

      // Add high value bills (over $5000) that aren't settled
      allBills.bills
        .filter(b => b.total_billed > 5000 && !['settled', 'paid'].includes(b.status) && b.status !== 'counter_received')
        .forEach(bill => {
          reviewItems.push({
            ...bill,
            reviewReason: 'high_value',
            priority: 'high',
            waitingTime: getWaitingTime(bill.received_at),
          });
        });

      // Add overdue bills (offer sent > 3 days ago)
      allBills.bills
        .filter(b => b.status === 'awaiting_response' || b.status === 'offer_sent')
        .filter(b => {
          const daysSince = (Date.now() - new Date(b.updated_at).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 3;
        })
        .forEach(bill => {
          if (!reviewItems.find(r => r.id === bill.id)) {
            reviewItems.push({
              ...bill,
              reviewReason: 'overdue',
              priority: 'medium',
              waitingTime: getWaitingTime(bill.updated_at),
            });
          }
        });

      // Sort by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2 };
      reviewItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setItems(reviewItems);
    } catch (err) {
      console.error('Failed to load review items:', err);
    }
    setLoading(false);
  };

  const getWaitingTime = (dateString: string): string => {
    const hours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleAccept = async (item: ReviewItem) => {
    setActionLoading(true);
    try {
      const result = await acceptCounter(item.id);
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Counter accepted successfully' });
        setItems(items.filter(i => i.id !== item.id));
        setTimeout(() => setSelectedItem(null), 1000);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to accept counter' });
    }
    setActionLoading(false);
  };

  const handleSendCounter = async (item: ReviewItem) => {
    if (!item.fair_price) return;
    setActionLoading(true);
    try {
      const result = await sendOffer(item.id, item.fair_price);
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Counter offer sent' });
        loadReviewItems();
        setTimeout(() => setSelectedItem(null), 1000);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to send counter' });
    }
    setActionLoading(false);
  };

  const handleEscalate = async (item: ReviewItem) => {
    setActionLoading(true);
    try {
      const result = await escalateBill(item.id, 'Manual escalation from review queue');
      if (result.success) {
        setActionMessage({ type: 'success', text: 'Bill escalated for manual review' });
        setItems(items.filter(i => i.id !== item.id));
        setTimeout(() => setSelectedItem(null), 1000);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to escalate' });
    }
    setActionLoading(false);
  };

  const handleFollowUp = async (item: ReviewItem) => {
    setActionLoading(true);
    try {
      // Re-send the offer
      if (item.current_offer) {
        const result = await sendOffer(item.id, item.current_offer);
        if (result.success) {
          setActionMessage({ type: 'success', text: 'Follow-up sent' });
          loadReviewItems();
          setTimeout(() => setSelectedItem(null), 1000);
        }
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to send follow-up' });
    }
    setActionLoading(false);
  };

  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(i => i.reviewReason === activeFilter);

  const reasonConfig = {
    counter: { 
      label: 'Counter Received', 
      icon: '↩️',
      color: isDark ? '#fbbf24' : '#d97706',
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
    },
    high_value: { 
      label: 'High Value', 
      icon: '💰',
      color: colors.accent,
      bg: isDark ? 'rgba(102, 34, 246, 0.15)' : '#f3e8ff',
    },
    overdue: { 
      label: 'Response Overdue', 
      icon: '⏰',
      color: isDark ? '#f87171' : '#dc2626',
      bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    },
    low_confidence: { 
      label: 'Needs Verification', 
      icon: '🔍',
      color: colors.blue,
      bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe',
    },
  };

  const priorityColors = {
    urgent: { bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', color: isDark ? '#f87171' : '#dc2626' },
    high: { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706' },
    medium: { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe', color: isDark ? '#60a5fa' : '#2563eb' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
            Review Queue
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '14px' }}>
            Bills requiring human attention
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
                DEMO
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: items.length > 0 ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7'),
            color: items.length > 0 ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#4ade80' : '#16a34a'),
          }}>
            {items.length} items need attention
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {[
          { key: 'all', label: 'All', count: items.length },
          { key: 'counter', label: 'Counters', count: items.filter(i => i.reviewReason === 'counter').length },
          { key: 'high_value', label: 'High Value', count: items.filter(i => i.reviewReason === 'high_value').length },
          { key: 'overdue', label: 'Overdue', count: items.filter(i => i.reviewReason === 'overdue').length },
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key as 'all' | 'counter' | 'high_value' | 'overdue')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeFilter === filter.key ? colors.accent : colors.surface,
              color: activeFilter === filter.key ? '#fff' : colors.textMuted,
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {filter.label}
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: activeFilter === filter.key ? 'rgba(255,255,255,0.2)' : colors.bg,
            }}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `2px solid ${colors.border}`,
            borderTopColor: colors.accent,
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: colors.textMuted }}>Loading review queue...</p>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '24px',
          }}>
            ✓
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
            All caught up!
          </h3>
          <p style={{ color: colors.textMuted }}>
            No bills need your attention right now.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <AnimatePresence>
            {filteredItems.map((item, i) => {
              const reason = reasonConfig[item.reviewReason];
              const priority = priorityColors[item.priority];
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.accent;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      {/* Tags Row */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: reason.bg,
                          color: reason.color,
                        }}>
                          {reason.icon} {reason.label}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: priority.bg,
                          color: priority.color,
                          textTransform: 'capitalize',
                        }}>
                          {item.priority}
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                          color: colors.textMuted,
                        }}>
                          {item.waitingTime}
                        </span>
                      </div>

                      {/* Bill Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.textMuted,
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '2px' }}>
                            {item.provider_name}
                          </p>
                          <p style={{ fontSize: '14px', color: colors.textMuted }}>
                            {item.member_name} • BILL-{item.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Amounts */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
                        {formatCurrency(item.total_billed)}
                      </p>
                      {item.current_offer && (
                        <p style={{ fontSize: '14px', color: colors.accent }}>
                          Offer: {formatCurrency(item.current_offer)}
                        </p>
                      )}
                      {item.fair_price && (
                        <p style={{ fontSize: '13px', color: isDark ? '#4ade80' : '#16a34a' }}>
                          Fair: {formatCurrency(item.fair_price)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginTop: '16px', 
                    paddingTop: '16px', 
                    borderTop: `1px solid ${colors.border}` 
                  }}>
                    {item.reviewReason === 'counter' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAccept(item); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                            color: isDark ? '#4ade80' : '#16a34a',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                          }}
                        >
                          Accept Counter
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendCounter(item); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: colors.gradient,
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                          }}
                        >
                          Send Counter
                        </button>
                      </>
                    )}
                    {item.reviewReason === 'overdue' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFollowUp(item); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          background: colors.gradient,
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        Send Follow-Up
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEscalate(item); }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        background: 'transparent',
                        color: colors.textMuted,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Escalate
                    </button>
                    <Link
                      href={`/dashboard/bills?id=${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                        background: 'transparent',
                        color: colors.textMuted,
                        fontSize: '13px',
                        fontWeight: '500',
                        textDecoration: 'none',
                      }}
                    >
                      View Details
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedItem(null); setActionMessage(null); }}
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
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '16px',
                width: '100%',
                maxWidth: '500px',
                padding: '24px',
              }}
            >
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

              <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text, marginBottom: '20px' }}>
                Quick Action
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '4px' }}>Bill</p>
                <p style={{ fontSize: '16px', fontWeight: '500', color: colors.text }}>
                  {selectedItem.provider_name} - BILL-{selectedItem.id}
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: colors.bg,
                borderRadius: '10px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textMuted }}>Billed</span>
                  <span style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(selectedItem.total_billed)}</span>
                </div>
                {selectedItem.fair_price && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: colors.textMuted }}>Fair Price</span>
                    <span style={{ fontWeight: '600', color: isDark ? '#4ade80' : '#16a34a' }}>{formatCurrency(selectedItem.fair_price)}</span>
                  </div>
                )}
                {selectedItem.current_offer && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textMuted }}>Current Offer</span>
                    <span style={{ fontWeight: '600', color: colors.accent }}>{formatCurrency(selectedItem.current_offer)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {selectedItem.reviewReason === 'counter' && (
                  <>
                    <button
                      onClick={() => handleAccept(selectedItem)}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
                        color: isDark ? '#4ade80' : '#16a34a',
                        fontWeight: '600',
                        cursor: actionLoading ? 'wait' : 'pointer',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleSendCounter(selectedItem)}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: colors.gradient,
                        color: '#fff',
                        fontWeight: '600',
                        cursor: actionLoading ? 'wait' : 'pointer',
                      }}
                    >
                      Counter
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setSelectedItem(null); setActionMessage(null); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.text,
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
