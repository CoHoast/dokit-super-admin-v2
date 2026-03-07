// Phase 2C: PDF Generator for Offer Letters
// Uses @react-pdf/renderer for server-side PDF generation

import { OfferLetterData, OfferLetterTemplate, DEFAULT_TEMPLATES } from './types';

// Template variable replacement - uses single braces {variableName}
function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;
  
  // Simple variable replacement: {variableName}
  const simpleVarRegex = /\{(\w+)\}/g;
  result = result.replace(simpleVarRegex, (match, varName) => {
    const value = data[varName];
    if (value === undefined || value === null) return match; // Keep original if not found
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  });
  
  return result;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Format date
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Generate HTML for PDF (react-pdf will convert this)
export function generateOfferLetterHTML(
  data: OfferLetterData,
  template?: OfferLetterTemplate
): string {
  const selectedTemplate = template || DEFAULT_TEMPLATES.find(t => t.type === 'initial_offer' && t.isDefault)!;
  
  // Prepare template data with formatted values
  const templateData = {
    ...data,
    originalAmount: formatCurrency(data.originalAmount),
    fairMarketValue: formatCurrency(data.fairMarketValue),
    offerAmount: formatCurrency(data.offerAmount),
    letterDate: formatDate(data.letterDate),
    dateOfService: formatDate(data.dateOfService),
    validUntil: formatDate(data.validUntil),
    responseDeadline: formatDate(data.responseDeadline),
    lineItems: data.lineItems.map(item => ({
      ...item,
      billedAmount: formatCurrency(item.billedAmount),
      medicareRate: formatCurrency(item.medicareRate),
      offeredAmount: formatCurrency(item.offeredAmount)
    }))
  };
  
  const letterBody = replaceVariables(selectedTemplate.bodyTemplate, templateData);
  const subject = replaceVariables(selectedTemplate.subject, templateData);
  
  // Generate professional HTML layout
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 0.75in 1in;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #8B5CF6;
    }
    .logo-section {
      flex: 1;
    }
    .org-name {
      font-size: 18pt;
      font-weight: bold;
      color: #4F46E5;
      margin-bottom: 8px;
    }
    .org-details {
      font-size: 9pt;
      color: #666;
      line-height: 1.4;
    }
    .date-section {
      text-align: right;
      font-size: 10pt;
      color: #666;
    }
    .recipient-block {
      margin-bottom: 30px;
    }
    .recipient-block p {
      margin: 0;
      line-height: 1.4;
    }
    .reference-box {
      background: #f8f7ff;
      border-left: 4px solid #8B5CF6;
      padding: 15px 20px;
      margin-bottom: 30px;
    }
    .reference-box h3 {
      font-size: 10pt;
      color: #4F46E5;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .reference-row {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
    }
    .reference-item {
      flex: 1;
    }
    .reference-label {
      color: #666;
      font-size: 8pt;
    }
    .reference-value {
      font-weight: 600;
      color: #1a1a1a;
    }
    .subject {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 25px;
      color: #1a1a1a;
    }
    .body {
      white-space: pre-wrap;
      margin-bottom: 30px;
    }
    .body strong {
      color: #4F46E5;
    }
    .line-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9pt;
    }
    .line-items-table th {
      background: #4F46E5;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }
    .line-items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e5e5;
    }
    .line-items-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .amount-col {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .offer-summary {
      background: linear-gradient(135deg, #f8f7ff 0%, #ede9fe 100%);
      border: 1px solid #c4b5fd;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    .offer-summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed #c4b5fd;
    }
    .offer-summary-row:last-child {
      border-bottom: none;
      font-weight: bold;
      font-size: 14pt;
      color: #4F46E5;
    }
    .signature-block {
      margin-top: 50px;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #333;
      width: 250px;
      padding-top: 5px;
      font-size: 9pt;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 8pt;
      color: #999;
      text-align: center;
    }
    .footer .confidential {
      font-weight: bold;
      color: #666;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div class="org-name">${data.orgName}</div>
      <div class="org-details">
        ${data.orgAddress}<br>
        Phone: ${data.orgPhone} | Email: ${data.orgEmail}
      </div>
    </div>
    <div class="date-section">
      <strong>Date:</strong> ${formatDate(data.letterDate)}<br>
      <strong>Bill ID:</strong> ${data.billId}<br>
      <strong>Negotiation #:</strong> ${data.negotiationId}
    </div>
  </div>
  
  <div class="recipient-block">
    <p><strong>${data.providerName}</strong></p>
    <p>${data.providerAddress}</p>
    ${data.providerFax ? `<p>Fax: ${data.providerFax}</p>` : ''}
    ${data.providerEmail ? `<p>Email: ${data.providerEmail}</p>` : ''}
  </div>
  
  <div class="reference-box">
    <h3>Patient & Service Reference</h3>
    <div class="reference-row">
      <div class="reference-item">
        <div class="reference-label">Patient Name</div>
        <div class="reference-value">${data.patientName}</div>
      </div>
      <div class="reference-item">
        <div class="reference-label">Member ID</div>
        <div class="reference-value">${data.memberId}</div>
      </div>
      <div class="reference-item">
        <div class="reference-label">Date of Service</div>
        <div class="reference-value">${formatDate(data.dateOfService)}</div>
      </div>
    </div>
  </div>
  
  <div class="subject">RE: ${subject}</div>
  
  <div class="body">${letterBody.replace(/\n/g, '<br>')}</div>
  
  ${data.lineItems.length > 0 ? `
  <table class="line-items-table">
    <thead>
      <tr>
        <th>CPT Code</th>
        <th>Description</th>
        <th class="amount-col">Billed</th>
        <th class="amount-col">Medicare Rate</th>
        <th class="amount-col">Our Offer</th>
      </tr>
    </thead>
    <tbody>
      ${data.lineItems.map(item => `
        <tr>
          <td>${item.cptCode}</td>
          <td>${item.description}</td>
          <td class="amount-col">${formatCurrency(item.billedAmount)}</td>
          <td class="amount-col">${formatCurrency(item.medicareRate)}</td>
          <td class="amount-col">${formatCurrency(item.offeredAmount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}
  
  <div class="offer-summary">
    <div class="offer-summary-row">
      <span>Original Billed Amount:</span>
      <span>${formatCurrency(data.originalAmount)}</span>
    </div>
    <div class="offer-summary-row">
      <span>Fair Market Value (150% Medicare):</span>
      <span>${formatCurrency(data.fairMarketValue)}</span>
    </div>
    <div class="offer-summary-row">
      <span>Our Offer (${data.offerPercentage}% of billed):</span>
      <span>${formatCurrency(data.offerAmount)}</span>
    </div>
  </div>
  
  ${(data as any).responseUrl ? `
  <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 2px solid #16a34a; border-radius: 12px; padding: 24px; margin: 30px 0; text-align: center;">
    <h3 style="color: #15803d; margin: 0 0 12px; font-size: 14pt;">Respond Online</h3>
    <p style="color: #166534; margin: 0 0 16px; font-size: 11pt;">Accept this offer, submit a counter, or decline — all online.</p>
    <a href="${(data as any).responseUrl}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 12pt;">Click Here to Respond</a>
    <p style="color: #6b7280; margin: 16px 0 0; font-size: 9pt;">Or visit: ${(data as any).responseUrl}</p>
  </div>
  ` : ''}
  
  <div class="signature-block">
    <p>Sincerely,</p>
    <div class="signature-line">
      ${data.contactName}<br>
      ${data.orgName}
    </div>
  </div>
  
  <div class="footer">
    <div class="confidential">CONFIDENTIAL</div>
    This communication contains confidential information intended only for the addressee.
    If you received this in error, please notify us immediately and destroy this document.
  </div>
</body>
</html>
`;
}

// Generate plain text version for fax cover sheets
export function generateOfferLetterText(
  data: OfferLetterData,
  template?: OfferLetterTemplate
): string {
  const selectedTemplate = template || DEFAULT_TEMPLATES.find(t => t.type === 'initial_offer' && t.isDefault)!;
  
  const templateData = {
    ...data,
    originalAmount: formatCurrency(data.originalAmount),
    fairMarketValue: formatCurrency(data.fairMarketValue),
    offerAmount: formatCurrency(data.offerAmount),
    letterDate: formatDate(data.letterDate),
    dateOfService: formatDate(data.dateOfService),
    validUntil: formatDate(data.validUntil),
    lineItems: data.lineItems.map(item => ({
      ...item,
      billedAmount: formatCurrency(item.billedAmount),
      medicareRate: formatCurrency(item.medicareRate),
      offeredAmount: formatCurrency(item.offeredAmount)
    }))
  };
  
  const body = replaceVariables(selectedTemplate.bodyTemplate, templateData);
  const subject = replaceVariables(selectedTemplate.subject, templateData);
  
  return `
================================================================================
${data.orgName.toUpperCase()}
${data.orgAddress}
Phone: ${data.orgPhone} | Email: ${data.orgEmail}
================================================================================

Date: ${formatDate(data.letterDate)}
Bill ID: ${data.billId}
Negotiation #: ${data.negotiationId}

TO:
${data.providerName}
${data.providerAddress}
${data.providerFax ? `Fax: ${data.providerFax}` : ''}
${data.providerEmail ? `Email: ${data.providerEmail}` : ''}

--------------------------------------------------------------------------------
PATIENT: ${data.patientName}
MEMBER ID: ${data.memberId}
DATE OF SERVICE: ${formatDate(data.dateOfService)}
--------------------------------------------------------------------------------

RE: ${subject}

${body}

================================================================================
OFFER SUMMARY
--------------------------------------------------------------------------------
Original Billed Amount:      ${formatCurrency(data.originalAmount)}
Fair Market Value:           ${formatCurrency(data.fairMarketValue)}
Our Offer:                   ${formatCurrency(data.offerAmount)} (${data.offerPercentage}%)
================================================================================

CONFIDENTIAL - This communication is intended only for the addressee.
`;
}

// Get template by ID or type
export function getTemplate(idOrType: string): OfferLetterTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.id === idOrType || t.type === idOrType);
}

// List all available templates
export function listTemplates(): OfferLetterTemplate[] {
  return DEFAULT_TEMPLATES;
}
