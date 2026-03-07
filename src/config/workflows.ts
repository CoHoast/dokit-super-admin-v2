/**
 * DOKit Workflow Registry
 * 
 * Central configuration for all workflows.
 * Build once, deploy to many clients via toggles.
 */

export interface WorkflowConfigField {
  type: 'number' | 'string' | 'boolean' | 'enum' | 'email' | 'url';
  label: string;
  description?: string;
  default: any;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface WorkflowDefinition {
  key: string;
  name: string;
  description: string;
  shortDescription: string;
  icon: string;
  color: string;
  category: 'intake' | 'processing' | 'billing' | 'compliance';
  configSchema: Record<string, WorkflowConfigField>;
  defaultConfig: Record<string, any>;
  features: string[];
  requiredTier: 'starter' | 'professional' | 'enterprise';
}

export const WORKFLOWS: Record<string, WorkflowDefinition> = {
  'document-intake': {
    key: 'document-intake',
    name: 'Document Intake',
    description: 'AI-powered document processing and data extraction. Automatically classify, extract, and route incoming documents.',
    shortDescription: 'AI document processing',
    icon: 'DocumentTextIcon',
    color: '#6366f1',
    category: 'intake',
    features: [
      'Auto-classification',
      'Data extraction',
      'Smart routing',
      'OCR processing',
      'Template matching'
    ],
    requiredTier: 'starter',
    configSchema: {
      autoClassify: {
        type: 'boolean',
        label: 'Auto-Classify Documents',
        description: 'Automatically classify incoming documents by type',
        default: true
      },
      extractionConfidenceThreshold: {
        type: 'number',
        label: 'Extraction Confidence Threshold',
        description: 'Minimum confidence level for auto-extraction (0-100)',
        default: 85,
        min: 50,
        max: 100
      },
      notificationEmail: {
        type: 'email',
        label: 'Notification Email',
        description: 'Email for processing notifications',
        default: '',
        required: false
      },
      retentionDays: {
        type: 'number',
        label: 'Document Retention (Days)',
        description: 'Days to retain processed documents (0 = indefinite)',
        default: 90,
        min: 0,
        max: 365
      }
    },
    defaultConfig: {
      autoClassify: true,
      extractionConfidenceThreshold: 85,
      notificationEmail: '',
      retentionDays: 90
    }
  },

  'member-intake': {
    key: 'member-intake',
    name: 'Member Intake',
    description: 'Streamlined member enrollment and onboarding. Process applications, verify eligibility, and manage member data.',
    shortDescription: 'Member enrollment',
    icon: 'UserPlusIcon',
    color: '#8b5cf6',
    category: 'intake',
    features: [
      'Application processing',
      'Eligibility verification',
      'Document collection',
      'Auto-enrollment',
      'Welcome communications'
    ],
    requiredTier: 'starter',
    configSchema: {
      autoEnroll: {
        type: 'boolean',
        label: 'Auto-Enroll Approved Members',
        description: 'Automatically enroll members after approval',
        default: false
      },
      requireDocuments: {
        type: 'boolean',
        label: 'Require Supporting Documents',
        description: 'Require document upload before processing',
        default: true
      },
      welcomeEmailEnabled: {
        type: 'boolean',
        label: 'Send Welcome Email',
        description: 'Send welcome email upon enrollment',
        default: true
      },
      reviewThresholdDays: {
        type: 'number',
        label: 'Review Deadline (Days)',
        description: 'Days to complete application review',
        default: 5,
        min: 1,
        max: 30
      }
    },
    defaultConfig: {
      autoEnroll: false,
      requireDocuments: true,
      welcomeEmailEnabled: true,
      reviewThresholdDays: 5
    }
  },

  'claims-adjudication': {
    key: 'claims-adjudication',
    name: 'Claims Adjudication',
    description: 'AI-assisted claims processing and adjudication. Auto-adjudicate routine claims and flag complex cases for review.',
    shortDescription: 'Claims processing',
    icon: 'ClipboardDocumentCheckIcon',
    color: '#06b6d4',
    category: 'processing',
    features: [
      'Auto-adjudication',
      'Eligibility checking',
      'Duplicate detection',
      'Pricing rules',
      'Appeal management'
    ],
    requiredTier: 'professional',
    configSchema: {
      autoAdjudicateEnabled: {
        type: 'boolean',
        label: 'Enable Auto-Adjudication',
        description: 'Automatically adjudicate routine claims',
        default: true
      },
      autoAdjudicateThreshold: {
        type: 'number',
        label: 'Auto-Adjudicate Threshold ($)',
        description: 'Maximum amount for auto-adjudication',
        default: 500,
        min: 0,
        max: 10000
      },
      duplicateWindowDays: {
        type: 'number',
        label: 'Duplicate Check Window (Days)',
        description: 'Days to check for duplicate claims',
        default: 30,
        min: 7,
        max: 365
      },
      requirePreAuth: {
        type: 'boolean',
        label: 'Require Pre-Authorization',
        description: 'Require pre-auth for certain procedures',
        default: true
      }
    },
    defaultConfig: {
      autoAdjudicateEnabled: true,
      autoAdjudicateThreshold: 500,
      duplicateWindowDays: 30,
      requirePreAuth: true
    }
  },

  'bill-negotiator': {
    key: 'bill-negotiator',
    name: 'Bill Negotiator',
    description: 'AI-powered medical bill negotiation. Analyze bills, calculate fair prices, and automate provider negotiations to maximize savings.',
    shortDescription: 'Medical bill negotiation',
    icon: 'CurrencyDollarIcon',
    color: '#16a34a',
    category: 'billing',
    features: [
      'Fair price calculation',
      'Medicare rate lookup',
      'Auto-negotiation',
      'Provider intelligence',
      'Settlement tracking',
      'Savings analytics'
    ],
    requiredTier: 'professional',
    configSchema: {
      initialOfferPercent: {
        type: 'number',
        label: 'Initial Offer (%)',
        description: 'Starting offer as percentage of fair price',
        default: 60,
        min: 40,
        max: 80
      },
      maxOfferPercent: {
        type: 'number',
        label: 'Maximum Offer (%)',
        description: 'Maximum offer as percentage of fair price',
        default: 85,
        min: 60,
        max: 100
      },
      walkAwayPercent: {
        type: 'number',
        label: 'Walk-Away Threshold (%)',
        description: 'Walk away if settlement exceeds this % of billed',
        default: 70,
        min: 50,
        max: 90
      },
      autoNegotiateEnabled: {
        type: 'boolean',
        label: 'Enable Auto-Negotiation',
        description: 'Automatically negotiate bills under threshold',
        default: true
      },
      autoNegotiateThreshold: {
        type: 'number',
        label: 'Auto-Negotiate Threshold ($)',
        description: 'Auto-negotiate bills under this amount',
        default: 500,
        min: 0,
        max: 5000
      },
      preferredStrategy: {
        type: 'enum',
        label: 'Preferred Strategy',
        description: 'Default negotiation strategy',
        default: 'cash_pay',
        options: [
          { value: 'cash_pay', label: 'Cash Pay Discount' },
          { value: 'medicare_pct', label: '% of Medicare' },
          { value: 'bundled_rate', label: 'Bundled Rate' }
        ]
      },
      notificationEmail: {
        type: 'email',
        label: 'Notification Email',
        description: 'Email for negotiation alerts',
        default: '',
        required: false
      }
    },
    defaultConfig: {
      initialOfferPercent: 60,
      maxOfferPercent: 85,
      walkAwayPercent: 70,
      autoNegotiateEnabled: true,
      autoNegotiateThreshold: 500,
      preferredStrategy: 'cash_pay',
      notificationEmail: ''
    }
  },

  'provider-bills': {
    key: 'provider-bills',
    name: 'Provider Bills',
    description: 'Manage and process provider invoices. Track payments, reconcile accounts, and manage provider relationships.',
    shortDescription: 'Provider invoice management',
    icon: 'BuildingOffice2Icon',
    color: '#f59e0b',
    category: 'billing',
    features: [
      'Invoice processing',
      'Payment tracking',
      'Account reconciliation',
      'Provider portal',
      'Aging reports'
    ],
    requiredTier: 'starter',
    configSchema: {
      paymentTermsDays: {
        type: 'number',
        label: 'Payment Terms (Days)',
        description: 'Default payment terms for providers',
        default: 30,
        min: 15,
        max: 90
      },
      autoReconcile: {
        type: 'boolean',
        label: 'Auto-Reconcile Payments',
        description: 'Automatically reconcile matching payments',
        default: true
      },
      agingAlertDays: {
        type: 'number',
        label: 'Aging Alert (Days)',
        description: 'Alert when invoice exceeds this age',
        default: 45,
        min: 30,
        max: 120
      }
    },
    defaultConfig: {
      paymentTermsDays: 30,
      autoReconcile: true,
      agingAlertDays: 45
    }
  },

  'workers-comp': {
    key: 'workers-comp',
    name: 'Workers Comp',
    description: 'Workers compensation claims management. Handle injury reports, manage claims, and track return-to-work status.',
    shortDescription: 'Workers comp claims',
    icon: 'ShieldCheckIcon',
    color: '#dc2626',
    category: 'compliance',
    features: [
      'Injury reporting',
      'Claims management',
      'Return-to-work tracking',
      'OSHA compliance',
      'Medical management'
    ],
    requiredTier: 'enterprise',
    configSchema: {
      autoReportEnabled: {
        type: 'boolean',
        label: 'Auto-Generate Reports',
        description: 'Automatically generate required reports',
        default: true
      },
      oshaReportingEnabled: {
        type: 'boolean',
        label: 'OSHA Reporting',
        description: 'Enable OSHA compliance reporting',
        default: true
      },
      returnToWorkDays: {
        type: 'number',
        label: 'RTW Review Period (Days)',
        description: 'Days before return-to-work review',
        default: 7,
        min: 1,
        max: 30
      }
    },
    defaultConfig: {
      autoReportEnabled: true,
      oshaReportingEnabled: true,
      returnToWorkDays: 7
    }
  }
};

// Helper functions
export function getWorkflow(key: string): WorkflowDefinition | undefined {
  return WORKFLOWS[key];
}

export function getWorkflowsByCategory(category: WorkflowDefinition['category']): WorkflowDefinition[] {
  return Object.values(WORKFLOWS).filter(w => w.category === category);
}

export function getWorkflowsByTier(tier: WorkflowDefinition['requiredTier']): WorkflowDefinition[] {
  const tierOrder = { starter: 0, professional: 1, enterprise: 2 };
  return Object.values(WORKFLOWS).filter(w => tierOrder[w.requiredTier] <= tierOrder[tier]);
}

export function getAllWorkflows(): WorkflowDefinition[] {
  return Object.values(WORKFLOWS);
}

export const WORKFLOW_CATEGORIES = {
  intake: { name: 'Intake', description: 'Document and member intake workflows' },
  processing: { name: 'Processing', description: 'Claims and document processing' },
  billing: { name: 'Billing', description: 'Billing and payment workflows' },
  compliance: { name: 'Compliance', description: 'Compliance and reporting' }
};
