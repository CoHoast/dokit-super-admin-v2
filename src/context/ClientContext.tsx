'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Workflow {
  id: string;
  name: string;
  type: 'document-intake' | 'claims-adjudication' | 'member-intake' | 'provider-bills' | 'workers-comp';
  status: 'active' | 'paused' | 'configuring';
  description: string;
  ftpHost?: string;
  ftpPath?: string;
  ftpUsername?: string;
  outputApiEndpoint?: string;
  outputApiKey?: string;
  documentsProcessed?: number;
  lastRun?: string;
}

export interface DocumentType {
  id: string;
  name: string;
  code: string;
  description: string;
  extractionFields: string[];
}

export interface AdjudicationRule {
  id: string;
  name: string;
  description: string;
  action: 'approve' | 'deny' | 'review';
  priority: number;
  conditions: string;
  active: boolean;
}

export interface EnabledWorkflow {
  type: string;
  enabled: boolean;
  config?: any;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'onboarding' | 'paused' | 'inactive';
  documentsThisMonth: number;
  workflows: Workflow[];
  enabledWorkflows: EnabledWorkflow[];
  documentTypes?: DocumentType[];
  adjudicationRules?: AdjudicationRule[];
}

// Default workflows template for clients
const defaultWorkflows: Workflow[] = [
  {
    id: 'wf-doc-intake',
    name: 'Document Intake & Classification',
    type: 'document-intake',
    status: 'configuring',
    description: 'AI-powered document classification and data extraction',
    documentsProcessed: 0,
    lastRun: 'Never',
  },
  {
    id: 'wf-claims',
    name: 'Claims Adjudication',
    type: 'claims-adjudication',
    status: 'configuring',
    description: 'AI-powered claims processing and decisioning',
    documentsProcessed: 0,
    lastRun: 'Never',
  },
  {
    id: 'wf-member',
    name: 'Member Intake',
    type: 'member-intake',
    status: 'configuring',
    description: 'Application processing and eligibility determination',
    documentsProcessed: 0,
    lastRun: 'Never',
  },
  {
    id: 'wf-provider',
    name: 'Provider Bill Processing',
    type: 'provider-bills',
    status: 'configuring',
    description: 'Bill extraction, repricing, and error detection',
    documentsProcessed: 0,
    lastRun: 'Never',
  },
  {
    id: 'wf-wc',
    name: 'Workers Comp FROI/SROI',
    type: 'workers-comp',
    status: 'configuring',
    description: 'Injury report processing and EDI formatting',
    documentsProcessed: 0,
    lastRun: 'Never',
  },
];

interface ClientContextType {
  selectedClient: Client | null;
  selectClient: (client: Client | null) => void;
  clients: Client[];
  isLoading: boolean;
  refreshClients: () => Promise<void>;
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  updateWorkflow: (clientId: string, workflowId: string, updates: Partial<Workflow>) => void;
  updateRule: (clientId: string, ruleId: string, updates: Partial<AdjudicationRule>) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch clients from database
  const fetchClients = async () => {
    try {
      const res = await fetch('/api/db/clients');
      const data = await res.json();
      
      if (data.clients) {
        // Transform database clients to match our Client interface
        const transformedClients: Client[] = data.clients.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          slug: c.slug,
          status: c.status || 'active',
          documentsThisMonth: c.stats?.documentsThisMonth || 0,
          workflows: defaultWorkflows.map(w => ({
            ...w,
            id: `${c.slug}-${w.id}`,
          })),
          enabledWorkflows: [], // Will be fetched when client is selected
        }));
        
        setClients(transformedClients);
        return transformedClients;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const fetchedClients = await fetchClients();
      
      // Check localStorage for previously selected client
      try {
        const savedClientId = localStorage.getItem('mco-selected-client');
        if (savedClientId && fetchedClients.length > 0) {
          const client = fetchedClients.find(c => c.id === savedClientId);
          if (client) {
            setSelectedClient(client);
          } else {
            localStorage.removeItem('mco-selected-client');
          }
        }
      } catch (e) {
        console.error('Error loading saved client:', e);
        localStorage.removeItem('mco-selected-client');
      }
      
      setIsLoading(false);
    };
    
    init();
  }, []);

  const refreshClients = async () => {
    await fetchClients();
  };

  const selectClient = async (client: Client | null) => {
    if (client) {
      // Fetch enabled workflows for this client
      try {
        const res = await fetch(`/api/db/clients/${client.id}/workflows`);
        const data = await res.json();
        const clientWithWorkflows = {
          ...client,
          enabledWorkflows: data.workflows || [],
        };
        setSelectedClient(clientWithWorkflows);
        localStorage.setItem('mco-selected-client', client.id);
      } catch (err) {
        console.error('Failed to fetch client workflows:', err);
        setSelectedClient(client);
        localStorage.setItem('mco-selected-client', client.id);
      }
    } else {
      setSelectedClient(null);
      localStorage.removeItem('mco-selected-client');
    }
  };

  const updateClient = (clientId: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, ...updates } : c
    ));
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const updateWorkflow = (clientId: string, workflowId: string, updates: Partial<Workflow>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        workflows: c.workflows.map(w => 
          w.id === workflowId ? { ...w, ...updates } : w
        ),
      };
    }));
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => {
        if (!prev) return null;
        return {
          ...prev,
          workflows: prev.workflows.map(w =>
            w.id === workflowId ? { ...w, ...updates } : w
          ),
        };
      });
    }
  };

  const updateRule = (clientId: string, ruleId: string, updates: Partial<AdjudicationRule>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        adjudicationRules: c.adjudicationRules?.map(r =>
          r.id === ruleId ? { ...r, ...updates } : r
        ),
      };
    }));
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => {
        if (!prev) return null;
        return {
          ...prev,
          adjudicationRules: prev.adjudicationRules?.map(r =>
            r.id === ruleId ? { ...r, ...updates } : r
          ),
        };
      });
    }
  };

  return (
    <ClientContext.Provider value={{ 
      selectedClient, 
      selectClient, 
      clients, 
      isLoading,
      refreshClients,
      updateClient,
      updateWorkflow,
      updateRule,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
