'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClient } from '@/context/ClientContext';

interface LineItem {
  cpt_code: string;
  description: string;
  quantity: number;
  charge: number;
  confidence?: number;
}

interface ExtractedField {
  value: string | number;
  confidence: number;
}

export default function NewBillPage() {
  const router = useRouter();
  const { selectedClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  
  const [formData, setFormData] = useState({
    member_id: '',
    member_name: '',
    provider_name: '',
    provider_npi: '',
    provider_phone: '',
    provider_fax: '',
    provider_email: '',
    provider_address: '',
    account_number: '',
    date_of_service: '',
    total_billed: '',
    notes: ''
  });
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { cpt_code: '', description: '', quantity: 1, charge: 0 }
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
    
    // Auto-calculate total
    const total = updated.reduce((sum, item) => sum + (item.charge * item.quantity), 0);
    setFormData(prev => ({ ...prev, total_billed: total.toString() }));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { cpt_code: '', description: '', quantity: 1, charge: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const updated = lineItems.filter((_, i) => i !== index);
      setLineItems(updated);
      
      const total = updated.reduce((sum, item) => sum + (item.charge * item.quantity), 0);
      setFormData(prev => ({ ...prev, total_billed: total.toString() }));
    }
  };

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  // Handle file select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Process uploaded file
  const processFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    if (!validTypes.includes(file.type)) {
      setExtractionError('Please upload a JPEG, PNG, or PDF file');
      return;
    }
    
    setUploadedFile(file);
    setExtracting(true);
    setExtractionError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/bill-negotiator/extract', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Extraction failed');
      }
      
      // Populate form with extracted data
      populateFromExtraction(result.data);
      
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract data from file');
    } finally {
      setExtracting(false);
    }
  };

  // Populate form from extracted data
  const populateFromExtraction = (data: any) => {
    const newConfidences: Record<string, number> = {};
    
    // Helper to safely get value
    const getValue = (obj: any, field: string): string => {
      const val = obj?.[field];
      if (!val) return '';
      if (typeof val === 'object' && 'value' in val) {
        if (val.confidence) newConfidences[field] = val.confidence;
        return String(val.value || '');
      }
      return String(val || '');
    };
    
    const getNumValue = (obj: any, field: string): number => {
      const val = obj?.[field];
      if (!val) return 0;
      if (typeof val === 'object' && 'value' in val) {
        if (val.confidence) newConfidences[field] = val.confidence;
        return Number(val.value) || 0;
      }
      return Number(val) || 0;
    };
    
    // Populate member info
    const memberName = getValue(data.member, 'name');
    const memberId = getValue(data.member, 'id');
    const accountNumber = getValue(data.member, 'account_number');
    
    // Populate provider info  
    const providerName = getValue(data.provider, 'name');
    const providerNpi = getValue(data.provider, 'npi');
    const providerPhone = getValue(data.provider, 'phone');
    const providerFax = getValue(data.provider, 'fax');
    const providerEmail = getValue(data.provider, 'email');
    const providerAddress = getValue(data.provider, 'address');
    
    // Populate service info
    const dateOfService = getValue(data.service, 'date_of_service');
    
    // Populate billing
    const totalBilled = getNumValue(data.billing, 'total_billed');
    
    setFormData({
      member_name: memberName,
      member_id: memberId,
      account_number: accountNumber,
      provider_name: providerName,
      provider_npi: providerNpi,
      provider_phone: providerPhone,
      provider_fax: providerFax,
      provider_email: providerEmail,
      provider_address: providerAddress,
      date_of_service: dateOfService ? formatDateForInput(dateOfService) : '',
      total_billed: totalBilled ? String(totalBilled) : '',
      notes: data.extraction_notes || ''
    });
    
    // Populate line items
    if (data.line_items && data.line_items.length > 0) {
      const extractedLines: LineItem[] = data.line_items.map((item: any) => ({
        cpt_code: getValue(item, 'cpt_code'),
        description: getValue(item, 'description'),
        quantity: getNumValue(item, 'quantity') || 1,
        charge: getNumValue(item, 'charge'),
        confidence: item.cpt_code?.confidence || item.confidence
      }));
      setLineItems(extractedLines);
    }
    
    setConfidenceScores(newConfidences);
  };

  // Format date string to YYYY-MM-DD for input
  const formatDateForInput = (dateStr: string): string => {
    try {
      // Try parsing various formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // Try MM/DD/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (e) {
      console.error('Date parse error:', e);
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      alert('Please select a client first');
      return;
    }
    
    console.log('Selected client:', selectedClient);
    console.log('Client ID:', selectedClient.id);
    
    if (!formData.member_name || !formData.provider_name || !formData.total_billed) {
      alert('Please fill in required fields: Member Name, Provider Name, and Total Billed');
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        clientId: selectedClient.id,
        memberId: formData.member_id || `M-${Date.now()}`,
        memberName: formData.member_name,
        providerName: formData.provider_name,
        providerNpi: formData.provider_npi,
        providerPhone: formData.provider_phone,
        providerFax: formData.provider_fax,
        providerEmail: formData.provider_email,
        providerAddress: formData.provider_address,
        accountNumber: formData.account_number || `ACC-${Date.now()}`,
        dateOfService: formData.date_of_service || new Date().toISOString().split('T')[0],
        totalBilled: parseFloat(formData.total_billed),
        lineItems: lineItems.filter(li => li.cpt_code || li.description),
        notes: formData.notes,
        status: 'received',
        source: uploadedFile ? 'ai_extraction' : 'manual'
      };
      
      const res = await fetch('/api/db/bill-negotiator/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create bill');
      }
      
      const data = await res.json();
      const billId = data.bill?.id || data.id;
      console.log('Created bill:', data);
      router.push(`/dashboard/bill-negotiator/bills/${billId}`);
    } catch (error) {
      console.error('Error creating bill:', error);
      alert(error instanceof Error ? error.message : 'Failed to create bill');
    }
    
    setLoading(false);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return '#22c55e';
    if (confidence >= 70) return '#eab308';
    return '#ef4444';
  };

  const ConfidenceBadge = ({ field }: { field: string }) => {
    const confidence = confidenceScores[field];
    if (!confidence) return null;
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        background: `${getConfidenceColor(confidence)}15`,
        color: getConfidenceColor(confidence),
        marginLeft: '8px'
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {confidence}%
      </span>
    );
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Link href="/dashboard/bill-negotiator" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bill Negotiator
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <Link href="/dashboard/bill-negotiator/bills" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
            Bills
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#6366f1', fontWeight: 500, fontSize: '14px' }}>New</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Add New Bill
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Upload a bill for AI extraction or enter details manually
        </p>
      </div>

      {!selectedClient && (
        <div style={{
          padding: '16px 20px',
          background: '#fef3c7',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="20" height="20" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span style={{ color: '#92400e', fontWeight: 500 }}>Please select a client from the dropdown before adding a bill.</span>
        </div>
      )}

      {/* AI Upload Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', 
        borderRadius: '16px', 
        border: '2px dashed #a78bfa',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            background: dragOver ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
            transition: 'background 0.2s'
          }}
        >
          {extracting ? (
            <>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#5b21b6', marginBottom: '8px' }}>
                AI Extracting Data...
              </p>
              <p style={{ fontSize: '14px', color: '#7c3aed' }}>
                Analyzing {uploadedFile?.name}
              </p>
            </>
          ) : uploadedFile && !extractionError ? (
            <>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                Extracted Successfully
              </p>
              <p style={{ fontSize: '14px', color: '#15803d', marginBottom: '16px' }}>
                {uploadedFile.name} — Review the data below
              </p>
              <button
                type="button"
                onClick={() => { setUploadedFile(null); setConfidenceScores({}); }}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Upload Different File
              </button>
            </>
          ) : (
            <>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 600, color: '#5b21b6', marginBottom: '8px' }}>
                Drop a bill here or click to upload
              </p>
              <p style={{ fontSize: '14px', color: '#7c3aed', marginBottom: '16px' }}>
                AI will automatically extract all data from your bill
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="bill-upload"
              />
              <label
                htmlFor="bill-upload"
                style={{
                  display: 'inline-flex',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4"/>
                </svg>
                Select File
              </label>
              <p style={{ fontSize: '12px', color: '#8b5cf6', marginTop: '12px' }}>
                Supports: JPEG, PNG, PDF (up to 10MB)
              </p>
            </>
          )}
          
          {extractionError && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              {extractionError}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px',
        color: '#94a3b8',
        fontSize: '14px'
      }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}/>
        <span>or enter manually</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}/>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Member & Provider Section */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Member & Provider Information</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Member Name <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
                  <ConfidenceBadge field="name" />
                </label>
                <input
                  type="text"
                  name="member_name"
                  value={formData.member_name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Member ID
                  <ConfidenceBadge field="id" />
                </label>
                <input
                  type="text"
                  name="member_id"
                  value={formData.member_id}
                  onChange={handleChange}
                  placeholder="M-12345"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Provider Name <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
                  <ConfidenceBadge field="provider_name" />
                </label>
                <input
                  type="text"
                  name="provider_name"
                  value={formData.provider_name}
                  onChange={handleChange}
                  placeholder="ABC Medical Center"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Provider NPI
                  <ConfidenceBadge field="npi" />
                </label>
                <input
                  type="text"
                  name="provider_npi"
                  value={formData.provider_npi}
                  onChange={handleChange}
                  placeholder="1234567890"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Provider Phone
                  <ConfidenceBadge field="phone" />
                </label>
                <input
                  type="text"
                  name="provider_phone"
                  value={formData.provider_phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Provider Fax
                  <ConfidenceBadge field="fax" />
                </label>
                <input
                  type="text"
                  name="provider_fax"
                  value={formData.provider_fax}
                  onChange={handleChange}
                  placeholder="(555) 123-4568"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Provider Email
                  <ConfidenceBadge field="email" />
                </label>
                <input
                  type="email"
                  name="provider_email"
                  value={formData.provider_email}
                  onChange={handleChange}
                  placeholder="billing@provider.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Provider Address
                  <ConfidenceBadge field="address" />
                </label>
                <input
                  type="text"
                  name="provider_address"
                  value={formData.provider_address}
                  onChange={handleChange}
                  placeholder="123 Medical Dr, Suite 100, City, ST 12345"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bill Details Section */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Bill Details</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Account Number
                  <ConfidenceBadge field="account_number" />
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  placeholder="ACC-12345"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Date of Service
                  <ConfidenceBadge field="date_of_service" />
                </label>
                <input
                  type="date"
                  name="date_of_service"
                  value={formData.date_of_service}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Total Billed <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>
                  <ConfidenceBadge field="total_billed" />
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                  <input
                    type="number"
                    name="total_billed"
                    value={formData.total_billed}
                    onChange={handleChange}
                    placeholder="0"
                    required
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
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4"/>
              </svg>
              Add Line
            </button>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 120px 40px', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>CPT Code</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Description</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Qty</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Charge</span>
              <span></span>
            </div>
            {lineItems.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 120px 40px', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={item.cpt_code}
                  onChange={(e) => handleLineItemChange(index, 'cpt_code', e.target.value)}
                  placeholder="99213"
                  style={{
                    padding: '10px',
                    border: `1px solid ${item.confidence && item.confidence >= 90 ? '#22c55e' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: item.confidence ? `${getConfidenceColor(item.confidence)}08` : 'white'
                  }}
                />
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                  placeholder="Office visit"
                  style={{
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  min="1"
                  style={{
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="number"
                  value={item.charge || ''}
                  onChange={(e) => handleLineItemChange(index, 'charge', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  style={{
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  style={{
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: lineItems.length === 1 ? '#f8fafc' : '#fee2e2',
                    cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke={lineItems.length === 1 ? '#94a3b8' : '#dc2626'} strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            ))}
            
            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '14px', color: '#64748b', marginRight: '16px' }}>Total:</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  {formatCurrency(formData.total_billed)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Notes</h2>
          </div>
          <div style={{ padding: '24px' }}>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes about this bill..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Link
            href="/dashboard/bill-negotiator/bills"
            style={{
              padding: '14px 28px',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              background: 'white',
              color: '#374151',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !selectedClient}
            style={{
              padding: '14px 28px',
              background: loading || !selectedClient ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading || !selectedClient ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
                Create Bill
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
