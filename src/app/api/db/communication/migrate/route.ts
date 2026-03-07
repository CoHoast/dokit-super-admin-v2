// Phase 2C: Communication Tables Migration

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST() {
  try {
    // Add missing column to negotiations table if it doesn't exist
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS current_offer DECIMAL(12,2)
    `);
    
    // Also add status column if missing
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `);
    
    // Create bill_communications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_communications (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        negotiation_id INTEGER REFERENCES negotiations(id),
        client_id INTEGER NOT NULL REFERENCES clients(id),
        
        -- Communication details
        type VARCHAR(20) NOT NULL CHECK (type IN ('fax', 'email', 'mail')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' 
          CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced')),
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        
        -- Letter content
        letter_type VARCHAR(50) NOT NULL,
        letter_data JSONB NOT NULL,
        pdf_url TEXT,
        
        -- Tracking
        tracking_id VARCHAR(255),
        sent_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        error_message TEXT,
        
        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create offer_letter_templates table for custom templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offer_letter_templates (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        
        -- Template details
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        
        -- Variables available
        variables JSONB DEFAULT '[]',
        
        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create communication_webhooks table for tracking callbacks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS communication_webhooks (
        id SERIAL PRIMARY KEY,
        communication_id INTEGER REFERENCES bill_communications(id),
        provider VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT false,
        received_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comm_bill_id ON bill_communications(bill_id);
      CREATE INDEX IF NOT EXISTS idx_comm_client_id ON bill_communications(client_id);
      CREATE INDEX IF NOT EXISTS idx_comm_status ON bill_communications(status);
      CREATE INDEX IF NOT EXISTS idx_comm_tracking ON bill_communications(tracking_id);
      CREATE INDEX IF NOT EXISTS idx_templates_client ON offer_letter_templates(client_id);
    `);
    
    // Seed default templates
    const defaultTemplates = [
      {
        name: 'Standard Initial Offer',
        type: 'initial_offer',
        subject: 'Payment Offer - Patient: {patientName} - DOS: {dateOfService}',
        body: 'Dear {providerName},\n\nWe are writing regarding the medical bill for the patient and date of service referenced above. After careful review of the charges and comparison with fair market rates, we would like to offer the following settlement:\n\n**Original Bill Amount:** ${originalAmount}\n**Fair Market Value (Medicare x 150%):** ${fairMarketValue}\n**Our Offer:** ${offerAmount} ({offerPercentage}% of billed charges)\n\nThis offer represents a fair and prompt payment based on established Medicare rates.\n\n**Payment Terms:** {paymentTerms}\n**Offer Valid Until:** {validUntil}\n\nTo accept this offer, please respond by fax or email to the contact information below.\n\n{contactName}\nPhone: {contactPhone}\nEmail: {contactEmail}\n\nSincerely,\n{orgName}',
        variables: ['patientName', 'dateOfService', 'providerName', 'originalAmount', 'fairMarketValue', 'offerAmount', 'offerPercentage', 'paymentTerms', 'validUntil', 'contactName', 'contactPhone', 'contactEmail', 'orgName']
      },
      {
        name: 'Counter Offer Response',
        type: 'counter_offer',
        subject: 'Revised Payment Offer - Patient: {patientName} - DOS: {dateOfService}',
        body: 'Dear {providerName},\n\nThank you for your response to our initial offer. After reviewing your counter-proposal, we have revised our offer as follows:\n\n**Original Bill Amount:** ${originalAmount}\n**Our Revised Offer:** ${offerAmount}\n\nWe believe this revised offer represents a fair middle ground.\n\n**Payment Terms:** {paymentTerms}\n**Offer Valid Until:** {validUntil}\n\nSincerely,\n{orgName}\n{contactName} | {contactPhone}',
        variables: ['patientName', 'dateOfService', 'providerName', 'originalAmount', 'offerAmount', 'paymentTerms', 'validUntil', 'orgName', 'contactName', 'contactPhone']
      },
      {
        name: 'Final Offer',
        type: 'final_offer',
        subject: 'FINAL OFFER - Patient: {patientName} - DOS: {dateOfService}',
        body: 'Dear {providerName},\n\nThis letter constitutes our final offer regarding the referenced medical bill.\n\n**Original Bill Amount:** ${originalAmount}\n**Final Offer:** ${offerAmount}\n\nThis is the maximum amount we are authorized to offer. If this offer is not accepted by {validUntil}, we will consider this matter unresolved.\n\nSincerely,\n{orgName}',
        variables: ['patientName', 'dateOfService', 'providerName', 'originalAmount', 'offerAmount', 'validUntil', 'orgName']
      },
      {
        name: 'Settlement Confirmation',
        type: 'settlement_agreement',
        subject: 'Settlement Confirmation - Patient: {patientName}',
        body: 'Dear {providerName},\n\nThis letter confirms the settlement agreement reached for the referenced medical bill.\n\n**Settlement Details:**\n- Original Bill: ${originalAmount}\n- Settled Amount: ${settledAmount}\n- Savings: ${savingsAmount}\n\n**Payment Information:**\n- Payment Method: {paymentMethod}\n- Expected Payment Date: {paymentDate}\n\nThank you for working with us to resolve this matter.\n\nSincerely,\n{orgName}',
        variables: ['patientName', 'providerName', 'originalAmount', 'settledAmount', 'savingsAmount', 'paymentMethod', 'paymentDate', 'orgName']
      }
    ];
    
    for (const template of defaultTemplates) {
      await pool.query(`
        INSERT INTO offer_letter_templates (client_id, name, type, subject_template, body_template, is_default, variables)
        VALUES (NULL, $1, $2, $3, $4, true, $5)
        ON CONFLICT DO NOTHING
      `, [template.name, template.type, template.subject, template.body, JSON.stringify(template.variables)]);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Communication tables created successfully',
      tables: ['bill_communications', 'offer_letter_templates', 'communication_webhooks']
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
