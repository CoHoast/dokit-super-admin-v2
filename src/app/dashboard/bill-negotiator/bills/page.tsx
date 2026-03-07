'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClient } from '@/context/ClientContext';
import BulkUploadModal from '@/components/BulkUploadModal';

interface Bill {
  id: number;
  client_id: number;
  client_name?: string;
  member_id: string;
  member_name: string;
  provider_name: string;
  provider_npi: string;
  account_number: string;
  date_of_service: string;
  total_billed: number;
  fair_price: number;
  status: string;
  received_at: string;
  negotiation_id?: number;
  negotiation_status?: string;
  final_amount?: number;
  savings_amount?: number;
  savings_percent?: number;
}

export default function BillsListPage() {
  const { selectedClient } = useClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchBills();
  }, [selectedClient, statusFilter, page]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      let url = `/api/db/bill-negotiator/bills?limit=${limit}&offset=${page * limit}`;
      if (selectedClient) url += `&clientId=${selectedClient.id}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setBills(data.bills || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settled': 
      case 'paid': return { bg: '#dcfce7', color: '#16a34a' };
      case 'offer_sent': 
      case 'awaiting_response': return { bg: '#dbeafe', color: '#2563eb' };
      case 'counter_received': return { bg: '#fef3c7', color: '#d97706' };
      case 'ready_to_negotiate': return { bg: '#f5f3ff', color: '#7c3aed' };
      case 'received':
      case 'analyzing': return { bg: '#f1f5f9', color: '#64748b' };
      case 'failed':
      case 'cancelled': return { bg: '#fee2e2', color: '#dc2626' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'received': return 'New';
      case 'analyzing': return 'Analyzing';
      case 'ready_to_negotiate': return 'Ready';
      case 'offer_sent': return 'Offer Sent';
      case 'awaiting_response': return 'Awaiting';
      case 'counter_received': return 'Counter';
      case 'settled': return 'Settled';
      case 'paid': return 'Paid';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const statuses = [
    { value: 'all', label: 'All Bills' },
    { value: 'received', label: 'New' },
    { value: 'analyzing', label: 'Analyzing' },
    { value: 'ready_to_negotiate', label: 'Ready' },
    { value: 'offer_sent', label: 'Offer Sent' },
    { value: 'counter_received', label: 'Counter Received' },
    { value: 'settled', label: 'Settled' },
    { value: 'paid', label: 'Paid' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Link href="/dashboard/bill-negotiator" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
              Bill Negotiator
            </Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ color: '#6366f1', fontWeight: 500, fontSize: '14px' }}>Bills</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            All Bills
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            {total} total bills {selectedClient ? `for ${selectedClient.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedClient && (
            <button
              onClick={() => setShowBulkUpload(true)}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#6366f1',
                borderRadius: '10px',
                border: '2px solid #6366f1',
                fontWeight: 600,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Bulk Upload
            </button>
          )}
          <Link
            href="/dashboard/bill-negotiator/bills/new"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4"/>
            </svg>
            Add Bill
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button
            key={s.value}
            onClick={() => { setStatusFilter(s.value); setPage(0); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: statusFilter === s.value ? '2px solid #6366f1' : '1px solid #e2e8f0',
              background: statusFilter === s.value ? '#eef2ff' : 'white',
              color: statusFilter === s.value ? '#6366f1' : '#64748b',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Bills Table */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#64748b' }}>Loading bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No bills found</p>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              {statusFilter !== 'all' ? 'Try a different filter or ' : ''}Get started by adding your first bill.
            </p>
            <Link
              href="/dashboard/bill-negotiator/bills/new"
              style={{
                display: 'inline-flex',
                padding: '12px 24px',
                background: '#6366f1',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Add First Bill
            </Link>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Member / Provider</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Date of Service</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Billed</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Fair Price</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Savings</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Received</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  const statusStyle = getStatusColor(bill.status);
                  const potentialSavings = bill.total_billed && bill.fair_price 
                    ? bill.total_billed - bill.fair_price 
                    : null;
                  
                  return (
                    <tr 
                      key={bill.id}
                      style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => window.location.href = `/dashboard/bill-negotiator/bills/${bill.id}`}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <p style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>{bill.member_name || 'Unknown'}</p>
                          <p style={{ fontSize: '13px', color: '#64748b' }}>{bill.provider_name || 'Unknown Provider'}</p>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                        {formatDate(bill.date_of_service)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                        {formatCurrency(bill.total_billed || 0)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#6366f1', fontSize: '14px', fontWeight: 500 }}>
                        {bill.fair_price ? formatCurrency(bill.fair_price) : '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {bill.savings_amount ? (
                          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '14px' }}>
                            {formatCurrency(bill.savings_amount)} ({bill.savings_percent?.toFixed(0)}%)
                          </span>
                        ) : potentialSavings && potentialSavings > 0 ? (
                          <span style={{ color: '#64748b', fontSize: '13px' }}>
                            ~{formatCurrency(potentialSavings)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {getStatusLabel(bill.status)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
                        {formatDate(bill.received_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {total > limit && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: page === 0 ? '#94a3b8' : '#0f172a',
                      cursor: page === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * limit >= total}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: (page + 1) * limit >= total ? '#94a3b8' : '#0f172a',
                      cursor: (page + 1) * limit >= total ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUpload && selectedClient && (
        <BulkUploadModal
          clientId={typeof selectedClient.id === 'string' ? parseInt(selectedClient.id) : selectedClient.id}
          workflowKey="bill-negotiator"
          workflowName="Bill Negotiator"
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            fetchBills();
          }}
        />
      )}
    </div>
  );
}
