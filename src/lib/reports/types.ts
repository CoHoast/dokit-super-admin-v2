// Phase 2E: Reports & Analytics Types

export interface SavingsReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_bills: number;
    total_billed: number;
    total_settled: number;
    total_savings: number;
    savings_percent: number;
    avg_settlement_percent: number;
    auto_negotiated_count: number;
    auto_negotiated_percent: number;
  };
  by_status: {
    status: string;
    count: number;
    total_billed: number;
  }[];
  by_provider: {
    provider_name: string;
    provider_npi: string;
    bill_count: number;
    total_billed: number;
    total_settled: number;
    savings: number;
    avg_settlement_percent: number;
  }[];
  by_month: {
    month: string;
    bills: number;
    billed: number;
    settled: number;
    savings: number;
  }[];
  top_savings: {
    bill_id: number;
    provider_name: string;
    member_name: string;
    billed: number;
    settled: number;
    savings: number;
    savings_percent: number;
  }[];
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  event_type: string;
  entity_type: 'bill' | 'negotiation' | 'communication' | 'rule' | 'settings';
  entity_id: number;
  client_id: number;
  user_id?: string;
  user_name?: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  include_line_items: boolean;
  include_negotiations: boolean;
  include_communications: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  status_filter?: string[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  completed: boolean;
  required: boolean;
}

export interface OnboardingProgress {
  client_id: number;
  completed_steps: string[];
  current_step: string;
  started_at: string;
  completed_at?: string;
  is_complete: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Bill Negotiator',
    description: 'Learn how the Bill Negotiator helps you save money on medical bills.',
    action: 'view',
    completed: false,
    required: true
  },
  {
    id: 'settings',
    title: 'Configure Automation Settings',
    description: 'Set your autonomy level and negotiation preferences.',
    action: 'configure',
    completed: false,
    required: true
  },
  {
    id: 'intake',
    title: 'Set Up Intake Sources',
    description: 'Configure how bills will be received (upload, email, API, etc.).',
    action: 'configure',
    completed: false,
    required: false
  },
  {
    id: 'first_bill',
    title: 'Process Your First Bill',
    description: 'Upload or create a test bill to see the workflow in action.',
    action: 'create',
    completed: false,
    required: true
  },
  {
    id: 'team',
    title: 'Invite Team Members',
    description: 'Add team members who will help manage bill negotiations.',
    action: 'invite',
    completed: false,
    required: false
  },
  {
    id: 'notifications',
    title: 'Configure Notifications',
    description: 'Set up email notifications for important events.',
    action: 'configure',
    completed: false,
    required: false
  }
];
