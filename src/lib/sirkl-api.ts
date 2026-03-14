// API Client for DOKit Super Admin Backend
// Backend URL: https://dokit-super-admin-v2-production.up.railway.app

// Use same-origin since frontend and backend are in the same app
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Demo mode - uses mock data when true (no API key required)
// Set to false to use real backend API
// TODO: Set to false once all endpoints are wired up
export const DEMO_MODE = true;

export interface Bill {
  id: number;
  member_name: string;
  provider_name: string;
  provider_npi?: string;
  provider_fax?: string;
  total_billed: number;
  fair_price: number | null;
  current_offer: number | null;
  status: 'received' | 'analyzing' | 'ready_to_negotiate' | 'offer_sent' | 'awaiting_response' | 'counter_received' | 'settled' | 'paid' | 'failed';
  negotiation_status?: string;
  savings_amount?: number;
  savings_percent?: number;
  received_at: string;
  updated_at: string;
  service_date?: string;
  account_number?: string;
  cpt_codes?: string[];
  icd_codes?: string[];
}

export interface Analytics {
  overview: {
    totalBills: number;
    settledBills: number;
    pendingBills: number;
    newBills: number;
    totalBilled: number;
    totalSavings: number;
    avgSavingsPercent: string;
    avgDaysToSettle: string;
  };
  negotiations: {
    total: number;
    accepted: number;
    countered: number;
    rejected: number;
    pending: number;
    acceptanceRate: string;
  };
  automation: {
    automationRate: string;
  };
  statusBreakdown: Array<{ status: string; count: number; total_billed: number }>;
  topProviders: Array<{ provider_name: string; bill_count: number; avg_savings_percent: number }>;
  savingsTrend: Array<{ month: string; savings: number }>;
}

export interface PipelineStats {
  received: number;
  processing: number;
  negotiating: number;
  settled: number;
  total: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'success' | 'error' | 'info';
  title: string;
  message: string;
  billId?: number;
  createdAt: string;
}

// Mock data for demo mode
const MOCK_ANALYTICS: Analytics = {
  overview: {
    totalBills: 156,
    settledBills: 89,
    pendingBills: 12,
    newBills: 8,
    totalBilled: 892450,
    totalSavings: 468780,
    avgSavingsPercent: '52.5',
    avgDaysToSettle: '4.2',
  },
  negotiations: {
    total: 134,
    accepted: 89,
    countered: 23,
    rejected: 8,
    pending: 14,
    acceptanceRate: '66.4',
  },
  automation: {
    automationRate: '78',
  },
  statusBreakdown: [
    { status: 'settled', count: 89, total_billed: 412000 },
    { status: 'negotiating', count: 12, total_billed: 145000 },
    { status: 'processing', count: 28, total_billed: 198000 },
    { status: 'received', count: 27, total_billed: 137450 },
  ],
  topProviders: [
    { provider_name: 'Cleveland Medical Center', bill_count: 24, avg_savings_percent: 58 },
    { provider_name: 'Regional Hospital', bill_count: 18, avg_savings_percent: 51 },
    { provider_name: 'City Health Partners', bill_count: 15, avg_savings_percent: 54 },
    { provider_name: 'Metro Surgery Center', bill_count: 12, avg_savings_percent: 49 },
    { provider_name: 'Lakeside Imaging', bill_count: 9, avg_savings_percent: 62 },
  ],
  savingsTrend: [
    { month: 'Oct', savings: 42000 },
    { month: 'Nov', savings: 58000 },
    { month: 'Dec', savings: 51000 },
    { month: 'Jan', savings: 68000 },
    { month: 'Feb', savings: 72000 },
    { month: 'Mar', savings: 78000 },
  ],
};

const MOCK_BILLS: Bill[] = [
  {
    id: 1234,
    member_name: 'John Goldberg',
    provider_name: 'Cleveland Medical Center',
    total_billed: 4250,
    fair_price: 1890,
    current_offer: 1890,
    status: 'settled',
    savings_amount: 2360,
    savings_percent: 55.5,
    received_at: '2026-03-10T14:30:00Z',
    updated_at: '2026-03-12T09:15:00Z',
    service_date: '2026-03-05',
    cpt_codes: ['99284', '71046'],
  },
  {
    id: 1233,
    member_name: 'Sarah Weiss',
    provider_name: 'Regional Hospital',
    total_billed: 2800,
    fair_price: 1240,
    current_offer: 1400,
    status: 'counter_received',
    received_at: '2026-03-11T10:00:00Z',
    updated_at: '2026-03-13T15:30:00Z',
    service_date: '2026-03-08',
    cpt_codes: ['72148'],
  },
  {
    id: 1232,
    member_name: 'David Cohen',
    provider_name: 'City Health Partners',
    total_billed: 890,
    fair_price: 445,
    current_offer: 445,
    status: 'settled',
    savings_amount: 445,
    savings_percent: 50,
    received_at: '2026-03-10T08:20:00Z',
    updated_at: '2026-03-11T11:45:00Z',
    service_date: '2026-03-07',
    cpt_codes: ['80053', '85025'],
  },
  {
    id: 1231,
    member_name: 'Rachel Levy',
    provider_name: 'Metro Surgery Center',
    total_billed: 12500,
    fair_price: null,
    current_offer: null,
    status: 'analyzing',
    received_at: '2026-03-13T16:00:00Z',
    updated_at: '2026-03-13T16:00:00Z',
    service_date: '2026-03-12',
    cpt_codes: ['27447'],
  },
  {
    id: 1230,
    member_name: 'Michael Stern',
    provider_name: 'Lakeside Imaging',
    total_billed: 1650,
    fair_price: 720,
    current_offer: 720,
    status: 'offer_sent',
    received_at: '2026-03-12T13:00:00Z',
    updated_at: '2026-03-13T09:00:00Z',
    service_date: '2026-03-10',
    cpt_codes: ['70553'],
  },
  {
    id: 1229,
    member_name: 'Rebecca Klein',
    provider_name: 'Cleveland Medical Center',
    total_billed: 3200,
    fair_price: 1420,
    current_offer: 1420,
    status: 'awaiting_response',
    received_at: '2026-03-09T11:30:00Z',
    updated_at: '2026-03-11T14:00:00Z',
    service_date: '2026-03-06',
    cpt_codes: ['99285', '36415'],
  },
  {
    id: 1228,
    member_name: 'Benjamin Rosen',
    provider_name: 'Heart & Vascular Center',
    total_billed: 8900,
    fair_price: 3890,
    current_offer: 4200,
    status: 'counter_received',
    received_at: '2026-03-08T09:00:00Z',
    updated_at: '2026-03-12T16:45:00Z',
    service_date: '2026-03-04',
    cpt_codes: ['93306', '93320'],
  },
  {
    id: 1227,
    member_name: 'Hannah Shapiro',
    provider_name: 'Regional Hospital',
    total_billed: 5600,
    fair_price: 2450,
    current_offer: 2450,
    status: 'settled',
    savings_amount: 3150,
    savings_percent: 56.2,
    received_at: '2026-03-07T14:15:00Z',
    updated_at: '2026-03-10T10:30:00Z',
    service_date: '2026-03-03',
    cpt_codes: ['43239'],
  },
];

const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-1',
    type: 'warning',
    title: 'Counter Received',
    message: 'BILL-1228 — Provider countered at $4,200 (target: $3,890)',
    billId: 1228,
    createdAt: '2026-03-13T16:45:00Z',
  },
  {
    id: 'alert-2',
    type: 'success',
    title: 'Settlement Received',
    message: 'BILL-1234 settled at $1,890 — $2,360 saved (55.5%)',
    billId: 1234,
    createdAt: '2026-03-12T09:15:00Z',
  },
  {
    id: 'alert-3',
    type: 'error',
    title: 'Response Overdue',
    message: 'BILL-1229 — No provider response in 5 days',
    billId: 1229,
    createdAt: '2026-03-13T08:00:00Z',
  },
  {
    id: 'alert-4',
    type: 'info',
    title: 'High-Value Bill',
    message: 'BILL-1231 ($12,500) requires manual review',
    billId: 1231,
    createdAt: '2026-03-13T16:00:00Z',
  },
];

// API Functions
export async function fetchAnalytics(period: string = 'month', clientId?: string): Promise<Analytics> {
  if (DEMO_MODE) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_ANALYTICS;
  }

  const params = new URLSearchParams({ period });
  if (clientId) params.set('clientId', clientId);

  const res = await fetch(`${API_BASE}/api/db/bill-negotiator/analytics?${params}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchBills(options: { 
  limit?: number; 
  offset?: number;
  status?: string;
  search?: string;
  clientId?: string;
} = {}): Promise<{ bills: Bill[]; total: number }> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filtered = [...MOCK_BILLS];
    
    if (options.status && options.status !== 'all') {
      filtered = filtered.filter(b => b.status === options.status);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(b => 
        b.member_name.toLowerCase().includes(q) ||
        b.provider_name.toLowerCase().includes(q) ||
        b.id.toString().includes(q)
      );
    }
    
    return { bills: filtered, total: filtered.length };
  }

  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.status) params.set('status', options.status);
  if (options.clientId) params.set('clientId', options.clientId);

  const res = await fetch(`${API_BASE}/api/db/bill-negotiator/bills?${params}`);
  if (!res.ok) throw new Error('Failed to fetch bills');
  return res.json();
}

export async function fetchBill(id: number): Promise<Bill | null> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_BILLS.find(b => b.id === id) || null;
  }

  const res = await fetch(`${API_BASE}/api/db/bill-negotiator/bills/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAlerts(): Promise<Alert[]> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_ALERTS;
  }

  // Real API would fetch alerts
  const res = await fetch(`${API_BASE}/api/db/bill-negotiator/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchPipelineStats(): Promise<PipelineStats> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      received: 27,
      processing: 28,
      negotiating: 12,
      settled: 89,
      total: 156,
    };
  }

  const res = await fetch(`${API_BASE}/api/db/bill-negotiator/pipeline`);
  if (!res.ok) throw new Error('Failed to fetch pipeline stats');
  return res.json();
}

// Actions
export async function sendOffer(billId: number, amount: number): Promise<{ success: boolean; message: string }> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: `Offer of $${amount.toLocaleString()} sent for bill ${billId}` };
  }

  const res = await fetch(`${API_BASE}/api/bill-negotiator/send-offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ billId, amount }),
  });
  return res.json();
}

export async function acceptCounter(billId: number): Promise<{ success: boolean; message: string }> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: `Counter accepted for bill ${billId}` };
  }

  const res = await fetch(`${API_BASE}/api/bill-negotiator/accept-counter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ billId }),
  });
  return res.json();
}

export async function escalateBill(billId: number, reason: string): Promise<{ success: boolean; message: string }> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: `Bill ${billId} escalated for manual review` };
  }

  const res = await fetch(`${API_BASE}/api/bill-negotiator/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ billId, reason }),
  });
  return res.json();
}

// Status helpers
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Received',
    analyzing: 'Analyzing',
    ready_to_negotiate: 'Ready',
    offer_sent: 'Offer Sent',
    awaiting_response: 'Awaiting',
    counter_received: 'Counter',
    settled: 'Settled',
    paid: 'Paid',
    failed: 'Failed',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string, isDark: boolean): { bg: string; color: string } {
  const colors: Record<string, { dark: { bg: string; color: string }; light: { bg: string; color: string } }> = {
    settled: { dark: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }, light: { bg: '#dcfce7', color: '#16a34a' } },
    paid: { dark: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }, light: { bg: '#dcfce7', color: '#16a34a' } },
    offer_sent: { dark: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }, light: { bg: '#dbeafe', color: '#2563eb' } },
    awaiting_response: { dark: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }, light: { bg: '#dbeafe', color: '#2563eb' } },
    counter_received: { dark: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }, light: { bg: '#fef3c7', color: '#d97706' } },
    negotiating: { dark: { bg: 'rgba(102, 34, 246, 0.15)', color: '#a78bfa' }, light: { bg: '#f3e8ff', color: '#7c3aed' } },
    analyzing: { dark: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' }, light: { bg: '#f1f5f9', color: '#64748b' } },
    processing: { dark: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' }, light: { bg: '#f1f5f9', color: '#64748b' } },
    received: { dark: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' }, light: { bg: '#f1f5f9', color: '#64748b' } },
    failed: { dark: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }, light: { bg: '#fef2f2', color: '#dc2626' } },
  };
  return colors[status]?.[isDark ? 'dark' : 'light'] || colors.received[isDark ? 'dark' : 'light'];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
