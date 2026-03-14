/**
 * Provider Registry Migration API
 * POST /api/db/provider-registry/migrate
 * 
 * Creates the provider email registry tables
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'src/lib/provider-registry/schema.sql');
    
    let schema: string;
    
    if (fs.existsSync(schemaPath)) {
      schema = fs.readFileSync(schemaPath, 'utf-8');
    } else {
      // Fallback inline schema if file not found in production
      schema = `
        -- Provider Email Registry Schema
        CREATE TABLE IF NOT EXISTS provider_email_registry (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          npi VARCHAR(10) NOT NULL,
          tax_id VARCHAR(20),
          provider_name VARCHAR(255) NOT NULL,
          provider_type VARCHAR(50),
          specialty VARCHAR(100),
          verified_email VARCHAR(255),
          verified_at TIMESTAMPTZ,
          verification_method VARCHAR(50),
          confidence INTEGER DEFAULT 0,
          billing_phone VARCHAR(20),
          billing_fax VARCHAR(20),
          billing_address TEXT,
          alternative_emails JSONB DEFAULT '[]',
          total_offers_sent INTEGER DEFAULT 0,
          total_responses INTEGER DEFAULT 0,
          last_offer_sent TIMESTAMPTZ,
          last_response TIMESTAMPTZ,
          response_rate DECIMAL(5,2) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'unverified',
          source VARCHAR(50) DEFAULT 'extraction',
          source_bill_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by VARCHAR(100),
          updated_by VARCHAR(100),
          notes TEXT,
          CONSTRAINT unique_npi UNIQUE (npi)
        );

        CREATE TABLE IF NOT EXISTS provider_email_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID REFERENCES provider_email_registry(id) ON DELETE CASCADE,
          npi VARCHAR(10) NOT NULL,
          email VARCHAR(255) NOT NULL,
          source VARCHAR(50) NOT NULL,
          mx_valid BOOLEAN,
          mx_checked_at TIMESTAMPTZ,
          times_used INTEGER DEFAULT 0,
          times_bounced INTEGER DEFAULT 0,
          times_responded INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'untested',
          last_used TIMESTAMPTZ,
          last_outcome VARCHAR(50),
          last_outcome_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          extracted_from_bill_id UUID,
          CONSTRAINT unique_provider_email UNIQUE (npi, email)
        );

        CREATE TABLE IF NOT EXISTS provider_email_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID REFERENCES provider_email_registry(id) ON DELETE CASCADE,
          npi VARCHAR(10) NOT NULL,
          email VARCHAR(255) NOT NULL,
          verification_type VARCHAR(50) NOT NULL,
          verification_source VARCHAR(100),
          ip_address INET,
          user_agent TEXT,
          verified_at TIMESTAMPTZ DEFAULT NOW(),
          verified_by VARCHAR(100)
        );

        CREATE INDEX IF NOT EXISTS idx_provider_registry_npi ON provider_email_registry(npi);
        CREATE INDEX IF NOT EXISTS idx_provider_registry_email ON provider_email_registry(verified_email);
        CREATE INDEX IF NOT EXISTS idx_provider_registry_status ON provider_email_registry(status);
        CREATE INDEX IF NOT EXISTS idx_email_history_npi ON provider_email_history(npi);
        CREATE INDEX IF NOT EXISTS idx_email_history_email ON provider_email_history(email);
        CREATE INDEX IF NOT EXISTS idx_verifications_npi ON provider_email_verifications(npi);
      `;
    }

    // Execute schema
    await pool.query(schema);

    // Verify tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('provider_email_registry', 'provider_email_history', 'provider_email_verifications')
    `);

    return NextResponse.json({
      success: true,
      message: 'Provider registry migration complete',
      tablesCreated: tables.rows.map(r => r.table_name),
    });

  } catch (error: any) {
    console.error('[ProviderRegistryMigrate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('provider_email_registry', 'provider_email_history', 'provider_email_verifications')
    `);

    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM provider_email_registry) as providers,
        (SELECT COUNT(*) FROM provider_email_history) as email_history,
        (SELECT COUNT(*) FROM provider_email_verifications) as verifications
    `).catch(() => ({ rows: [{ providers: 0, email_history: 0, verifications: 0 }] }));

    return NextResponse.json({
      migrated: tables.rows.length === 3,
      tables: tables.rows.map(r => r.table_name),
      counts: counts.rows[0],
    });

  } catch (error: any) {
    return NextResponse.json({
      migrated: false,
      error: error.message,
    });
  }
}
