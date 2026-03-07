import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Migration to create Bill Negotiator tables
export async function POST() {
  try {
    // Create bills table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        member_id VARCHAR(100),
        member_name VARCHAR(255),
        member_dob DATE,
        
        -- Provider Info
        provider_id INTEGER,
        provider_name VARCHAR(500),
        provider_npi VARCHAR(20),
        provider_tin VARCHAR(20),
        provider_address TEXT,
        provider_phone VARCHAR(50),
        provider_fax VARCHAR(50),
        provider_email VARCHAR(255),
        
        -- Bill Details
        account_number VARCHAR(100),
        date_of_service DATE,
        place_of_service VARCHAR(10),
        facility_type VARCHAR(100),
        
        -- Document
        document_url TEXT,
        document_type VARCHAR(50),
        
        -- Extracted Data
        line_items JSONB DEFAULT '[]',
        diagnosis_codes JSONB DEFAULT '[]',
        extracted_data JSONB DEFAULT '{}',
        extraction_confidence DECIMAL(5,2),
        
        -- Amounts
        total_billed DECIMAL(12,2),
        total_medicare_rate DECIMAL(12,2),
        fair_price DECIMAL(12,2),
        
        -- Status
        status VARCHAR(50) DEFAULT 'received',
        -- received, analyzing, ready_to_negotiate, offer_sent, awaiting_response, 
        -- counter_received, settled, paid, failed, cancelled
        
        -- Timestamps
        received_at TIMESTAMP DEFAULT NOW(),
        analyzed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create negotiations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS negotiations (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        
        -- Strategy
        strategy VARCHAR(50),
        -- cash_pay, medicare_plus, prompt_pay, hardship, comparison
        
        -- Offer Details
        initial_offer DECIMAL(12,2),
        max_acceptable DECIMAL(12,2),
        walk_away_max DECIMAL(12,2),
        
        offer_letter_url TEXT,
        offer_sent_via VARCHAR(50),
        offer_sent_at TIMESTAMP,
        
        -- Response
        response_type VARCHAR(50),
        -- pending, accepted, countered, rejected, no_response
        response_received_at TIMESTAMP,
        counter_amount DECIMAL(12,2),
        counter_notes TEXT,
        
        -- Settlement
        final_amount DECIMAL(12,2),
        savings_amount DECIMAL(12,2),
        savings_percent DECIMAL(5,2),
        settled_at TIMESTAMP,
        
        -- Payment
        payment_method VARCHAR(50),
        payment_date DATE,
        payment_reference VARCHAR(100),
        
        -- Tracking
        follow_up_count INTEGER DEFAULT 0,
        last_follow_up_at TIMESTAMP,
        escalated BOOLEAN DEFAULT FALSE,
        escalation_reason TEXT,
        
        -- Automation
        auto_negotiated BOOLEAN DEFAULT FALSE,
        human_reviewed BOOLEAN DEFAULT FALSE,
        reviewed_by INTEGER,
        review_notes TEXT,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create providers intelligence table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_providers (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        
        -- Provider Info
        npi VARCHAR(20) NOT NULL,
        tin VARCHAR(20),
        name VARCHAR(500),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(10),
        zip VARCHAR(20),
        phone VARCHAR(50),
        fax VARCHAR(50),
        email VARCHAR(255),
        
        -- Intelligence (learned from negotiations)
        total_negotiations INTEGER DEFAULT 0,
        total_bills_processed INTEGER DEFAULT 0,
        avg_billed_amount DECIMAL(12,2),
        avg_settlement_amount DECIMAL(12,2),
        avg_settlement_percent DECIMAL(5,2),
        avg_days_to_settle DECIMAL(5,1),
        acceptance_rate DECIMAL(5,2),
        
        preferred_contact_method VARCHAR(50),
        preferred_strategy VARCHAR(50),
        typical_counter_percent DECIMAL(5,2),
        
        notes TEXT,
        last_negotiation_at TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(client_id, npi)
      )
    `);

    // Create negotiation_communications table for tracking all comms
    await pool.query(`
      CREATE TABLE IF NOT EXISTS negotiation_communications (
        id SERIAL PRIMARY KEY,
        negotiation_id INTEGER REFERENCES negotiations(id) ON DELETE CASCADE,
        bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
        
        direction VARCHAR(10) NOT NULL,
        -- outbound, inbound
        
        type VARCHAR(50) NOT NULL,
        -- fax_sent, fax_received, email_sent, email_received, call_made, call_received, mail_sent
        
        content TEXT,
        document_url TEXT,
        
        sent_to VARCHAR(255),
        sent_from VARCHAR(255),
        
        status VARCHAR(50),
        -- sent, delivered, failed, received
        
        external_id VARCHAR(255),
        -- Reference from fax/email service
        
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create medicare_rates cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicare_rates (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL,
        code_type VARCHAR(20) NOT NULL,
        -- cpt, hcpcs, drg, apc
        
        description TEXT,
        
        -- Rates
        national_rate DECIMAL(10,2),
        facility_rate DECIMAL(10,2),
        non_facility_rate DECIMAL(10,2),
        
        -- Geographic adjustments
        mac VARCHAR(10),
        locality VARCHAR(10),
        gpci_work DECIMAL(6,4),
        gpci_pe DECIMAL(6,4),
        gpci_mp DECIMAL(6,4),
        
        -- Metadata
        effective_date DATE,
        source VARCHAR(50),
        -- mpfs, opps, ipps, asc
        
        last_updated TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(code, code_type, mac, locality)
      )
    `);

    // Add intake tracking columns if they don't exist
    await pool.query(`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS source_file_id INTEGER,
      ADD COLUMN IF NOT EXISTS source_filename VARCHAR(500),
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bills_client_id ON bills(client_id);
      CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
      CREATE INDEX IF NOT EXISTS idx_bills_received_at ON bills(received_at);
      CREATE INDEX IF NOT EXISTS idx_bills_member_id ON bills(member_id);
      CREATE INDEX IF NOT EXISTS idx_bills_source_file ON bills(source_file_id);
      
      CREATE INDEX IF NOT EXISTS idx_negotiations_bill_id ON negotiations(bill_id);
      CREATE INDEX IF NOT EXISTS idx_negotiations_client_id ON negotiations(client_id);
      CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(response_type);
      
      CREATE INDEX IF NOT EXISTS idx_bill_providers_npi ON bill_providers(npi);
      CREATE INDEX IF NOT EXISTS idx_bill_providers_client_npi ON bill_providers(client_id, npi);
      
      CREATE INDEX IF NOT EXISTS idx_medicare_rates_code ON medicare_rates(code, code_type);
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Bill Negotiator tables created successfully',
      tables: ['bills', 'negotiations', 'bill_providers', 'negotiation_communications', 'medicare_rates']
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error?.message 
    }, { status: 500 });
  }
}

export async function GET() {
  // Check if tables exist
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bills', 'negotiations', 'bill_providers', 'negotiation_communications', 'medicare_rates')
    `);
    
    const existingTables = result.rows.map(r => r.table_name);
    const allTables = ['bills', 'negotiations', 'bill_providers', 'negotiation_communications', 'medicare_rates'];
    const missingTables = allTables.filter(t => !existingTables.includes(t));
    
    return NextResponse.json({
      migrated: missingTables.length === 0,
      existingTables,
      missingTables
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
