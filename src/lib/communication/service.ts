// Phase 2C: Communication Service
// Handles sending offers via fax (Phaxio) and email (AWS SES)

import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import {
  CommunicationType,
  CommunicationStatus,
  OfferLetterType,
  OfferLetterData,
  SendOfferRequest,
  SendOfferResponse,
  CommunicationRecord
} from './types';
import { generateOfferLetterHTML, generateOfferLetterText, getTemplate } from './pdf-generator';
import { pool } from '../db';

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  } : undefined
});

// Phaxio configuration
const PHAXIO_API_KEY = process.env.PHAXIO_API_KEY;
const PHAXIO_API_SECRET = process.env.PHAXIO_API_SECRET;
const PHAXIO_BASE_URL = 'https://api.phaxio.com/v2.1';

// Communication service class
export class CommunicationService {
  
  // Send offer via specified method
  async sendOffer(request: SendOfferRequest, letterData: OfferLetterData): Promise<SendOfferResponse> {
    const { billId, negotiationId, method, recipient, letterType, templateId } = request;
    
    // Get client ID from bill
    const billResult = await pool.query('SELECT client_id FROM bills WHERE id = $1', [billId]);
    if (billResult.rows.length === 0) {
      return { success: false, communicationId: 0, error: 'Bill not found' };
    }
    const clientId = billResult.rows[0].client_id;
    
    // Create communication record
    const commResult = await pool.query(`
      INSERT INTO bill_communications (
        bill_id, negotiation_id, client_id, type, status, recipient,
        letter_type, letter_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, NOW(), NOW())
      RETURNING id
    `, [billId, negotiationId, clientId, method, recipient, letterType, JSON.stringify(letterData)]);
    
    const communicationId = commResult.rows[0].id;
    
    try {
      // Get template
      const template = templateId ? getTemplate(templateId) : getTemplate(letterType);
      
      // Generate content
      const htmlContent = generateOfferLetterHTML(letterData, template);
      const textContent = generateOfferLetterText(letterData, template);
      
      let trackingId: string | undefined;
      
      if (method === 'fax') {
        trackingId = await this.sendFax(recipient, htmlContent, letterData, communicationId);
      } else if (method === 'email') {
        trackingId = await this.sendEmail(
          recipient,
          `Payment Offer - ${letterData.patientName} - DOS: ${letterData.dateOfService}`,
          htmlContent,
          textContent,
          request.ccEmails,
          communicationId
        );
      }
      
      // Update record with tracking ID
      await pool.query(`
        UPDATE bill_communications 
        SET status = 'sent', tracking_id = $1, sent_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [trackingId, communicationId]);
      
      return { success: true, communicationId, trackingId };
      
    } catch (error: any) {
      // Update record with error
      await pool.query(`
        UPDATE bill_communications 
        SET status = 'failed', error_message = $1, updated_at = NOW()
        WHERE id = $2
      `, [error.message, communicationId]);
      
      return { success: false, communicationId, error: error.message };
    }
  }
  
  // Send fax via Phaxio
  private async sendFax(
    faxNumber: string,
    htmlContent: string,
    letterData: OfferLetterData,
    communicationId: number
  ): Promise<string> {
    if (!PHAXIO_API_KEY || !PHAXIO_API_SECRET) {
      // Mock mode if no API keys
      console.log(`[MOCK FAX] Would send to ${faxNumber}`);
      return `mock-fax-${Date.now()}`;
    }
    
    // Format fax number (ensure it starts with +1 for US)
    const formattedNumber = faxNumber.replace(/\D/g, '');
    const to = formattedNumber.startsWith('1') ? `+${formattedNumber}` : `+1${formattedNumber}`;
    
    // Create form data for Phaxio
    const formData = new FormData();
    formData.append('to', to);
    formData.append('file', new Blob([htmlContent], { type: 'text/html' }), 'offer-letter.html');
    formData.append('header_text', `${letterData.orgName} - Bill ID: ${letterData.billId}`);
    
    const response = await fetch(`${PHAXIO_BASE_URL}/faxes`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${PHAXIO_API_KEY}:${PHAXIO_API_SECRET}`).toString('base64')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Phaxio error: ${error.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data?.id?.toString() || 'unknown';
  }
  
  // Send email via AWS SES
  private async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string,
    cc?: string[],
    communicationId?: number
  ): Promise<string> {
    const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dokit.ai';
    
    // Check if SES is configured
    if (!process.env.AWS_ACCESS_KEY_ID) {
      // Mock mode
      console.log(`[MOCK EMAIL] Would send to ${to}: ${subject}`);
      return `mock-email-${Date.now()}`;
    }
    
    // Build MIME message
    const boundary = `boundary-${Date.now()}`;
    
    // Build headers array (only include CC if present)
    const headers = [
      `From: DOKit <${fromEmail}>`,
      `To: ${to}`,
    ];
    if (cc && cc.length > 0) {
      headers.push(`Cc: ${cc.join(', ')}`);
    }
    headers.push(
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`
    );
    
    const rawMessage = [
      ...headers,
      '',
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      '',
      textBody,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      '',
      htmlBody,
      '',
      `--${boundary}--`
    ].join('\r\n');
    
    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage)
      }
    });
    
    const result = await sesClient.send(command);
    return result.MessageId || 'unknown';
  }
  
  // Check fax delivery status
  async checkFaxStatus(trackingId: string): Promise<CommunicationStatus> {
    if (!PHAXIO_API_KEY || trackingId.startsWith('mock-')) {
      return 'delivered'; // Mock mode
    }
    
    const response = await fetch(`${PHAXIO_BASE_URL}/faxes/${trackingId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${PHAXIO_API_KEY}:${PHAXIO_API_SECRET}`).toString('base64')}`
      }
    });
    
    if (!response.ok) {
      return 'failed';
    }
    
    const result = await response.json();
    const status = result.data?.status;
    
    switch (status) {
      case 'success':
        return 'delivered';
      case 'failure':
      case 'cancelled':
        return 'failed';
      case 'queued':
      case 'pendingbatch':
        return 'pending';
      case 'inprogress':
        return 'sending';
      default:
        return 'sent';
    }
  }
  
  // Get communication history for a bill
  async getCommunicationHistory(billId: number): Promise<CommunicationRecord[]> {
    const result = await pool.query(`
      SELECT * FROM bill_communications 
      WHERE bill_id = $1 
      ORDER BY created_at DESC
    `, [billId]);
    
    return result.rows;
  }
  
  // Update communication status (webhook callback)
  async updateStatus(communicationId: number, status: CommunicationStatus, deliveredAt?: Date): Promise<void> {
    await pool.query(`
      UPDATE bill_communications 
      SET status = $1, delivered_at = $2, updated_at = NOW()
      WHERE id = $3
    `, [status, deliveredAt, communicationId]);
  }
  
  // Resend a failed communication
  async resend(communicationId: number): Promise<SendOfferResponse> {
    const result = await pool.query(`
      SELECT * FROM bill_communications WHERE id = $1
    `, [communicationId]);
    
    if (result.rows.length === 0) {
      return { success: false, communicationId, error: 'Communication not found' };
    }
    
    const comm = result.rows[0];
    
    return this.sendOffer(
      {
        billId: comm.bill_id,
        negotiationId: comm.negotiation_id,
        method: comm.type,
        recipient: comm.recipient,
        letterType: comm.letter_type
      },
      comm.letter_data
    );
  }
}

// Singleton instance
export const communicationService = new CommunicationService();

// Helper: Build letter data from bill and negotiation
export async function buildLetterData(
  billId: number,
  negotiationId: number,
  offerAmount: number,
  clientId: number
): Promise<OfferLetterData> {
  // Fetch bill details
  const billResult = await pool.query(`
    SELECT b.*, 
           c.name as client_name,
           c.settings
    FROM bills b
    JOIN clients c ON b.client_id = c.id
    WHERE b.id = $1
  `, [billId]);
  
  if (billResult.rows.length === 0) {
    throw new Error('Bill not found');
  }
  
  const bill = billResult.rows[0];
  const clientSettings = bill.settings || {};
  
  // Fetch negotiation details
  const negResult = await pool.query(`
    SELECT * FROM negotiations WHERE id = $1
  `, [negotiationId]);
  
  const negotiation = negResult.rows[0] || {};
  
  // Build the letter data
  const letterData: OfferLetterData = {
    // Organization
    orgName: bill.client_name,
    orgAddress: clientSettings.address || '123 Main St, City, ST 12345',
    orgPhone: clientSettings.phone || '(555) 123-4567',
    orgEmail: clientSettings.email || 'billing@healthshare.org',
    
    // Provider
    providerName: bill.provider_name || 'Unknown Provider',
    providerNpi: bill.provider_npi,
    providerAddress: bill.provider_address || '',
    providerFax: bill.provider_fax,
    providerEmail: bill.provider_email,
    
    // Patient/Member
    patientName: bill.member_name || 'Unknown Patient',
    memberId: bill.member_id || '',
    dateOfService: bill.date_of_service,
    
    // Bill details
    billId: bill.id.toString(),
    originalAmount: parseFloat(bill.total_billed) || 0,
    fairMarketValue: parseFloat(bill.fair_price) || 0,
    offerAmount: offerAmount,
    offerPercentage: Math.round((offerAmount / parseFloat(bill.total_billed)) * 100),
    
    // Line items
    lineItems: (bill.line_items || []).map((item: any) => ({
      cptCode: item.cpt_code || '',
      description: item.description || '',
      billedAmount: parseFloat(item.billed_amount) || 0,
      medicareRate: parseFloat(item.medicare_rate) || 0,
      offeredAmount: parseFloat(item.offered_amount) || offerAmount / (bill.line_items?.length || 1)
    })),
    
    // Negotiation
    negotiationId: negotiationId.toString(),
    roundNumber: negotiation.round || 1,
    responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
    
    // Terms
    paymentTerms: clientSettings.payment_terms || 'Payment within 30 days of acceptance',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    
    // Contact
    contactName: clientSettings.contact_name || 'Billing Department',
    contactPhone: clientSettings.contact_phone || clientSettings.phone || '(555) 123-4567',
    contactEmail: clientSettings.contact_email || clientSettings.email || 'billing@healthshare.org',
    
    // Generated
    letterDate: new Date().toISOString()
  };
  
  return letterData;
}
