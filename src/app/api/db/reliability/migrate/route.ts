/**
 * Database Migration for Reliability Components
 * 
 * Creates tables for:
 * - Retry queue (with dead letter support)
 * - Enhanced audit logging
 * - PHI encryption metadata
 * 
 * POST /api/db/reliability/migrate
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Retry Queue Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS retry_queue (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        next_retry_at TIMESTAMPTZ,
        client_id INTEGER,
        bill_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        
        CONSTRAINT valid_retry_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON retry_queue(status);
      CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry ON retry_queue(next_retry_at) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_retry_queue_client ON retry_queue(client_id);
      CREATE INDEX IF NOT EXISTS idx_retry_queue_bill ON retry_queue(bill_id);
    `);

    // 2. Enhanced Audit Log Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(30) NOT NULL,
        resource_id VARCHAR(100),
        client_id INTEGER,
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        phi_accessed BOOLEAN DEFAULT FALSE,
        phi_fields TEXT[],
        details JSONB,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        session_id VARCHAR(100),
        request_id VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_client ON audit_log(client_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_phi ON audit_log(phi_accessed) WHERE phi_accessed = TRUE;
    `);

    // 3. Add PHI encryption columns to bills table
    await pool.query(`
      ALTER TABLE bills 
      ADD COLUMN IF NOT EXISTS phi_encrypted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS encrypted_fields JSONB,
      ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100);
    `);

    // 4. SFTP pickup tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sftp_pickups (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        pickup_date DATE NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        files_found INTEGER DEFAULT 0,
        files_processed INTEGER DEFAULT 0,
        files_errored INTEGER DEFAULT 0,
        errors JSONB,
        status VARCHAR(20) DEFAULT 'running',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT valid_pickup_status CHECK (status IN ('running', 'completed', 'failed'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_sftp_pickups_client ON sftp_pickups(client_id);
      CREATE INDEX IF NOT EXISTS idx_sftp_pickups_date ON sftp_pickups(pickup_date DESC);
    `);

    // 5. Dead letter queue view
    await pool.query(`
      CREATE OR REPLACE VIEW dead_letter_queue AS
      SELECT * FROM retry_queue WHERE status = 'dead_letter' ORDER BY created_at DESC;
    `);

    // 6. Audit retention view
    await pool.query(`
      CREATE OR REPLACE VIEW audit_log_retention AS
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as entry_count,
        COUNT(*) FILTER (WHERE phi_accessed) as phi_access_count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
      FROM audit_log
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC;
    `);

    return NextResponse.json({
      success: true,
      message: 'Reliability tables created successfully',
      tables: [
        'retry_queue',
        'audit_log',
        'sftp_pickups'
      ],
      columns_added: [
        'bills.phi_encrypted',
        'bills.encrypted_fields',
        'bills.encryption_key_id'
      ],
      views: [
        'dead_letter_queue',
        'audit_log_retention'
      ]
    });

  } catch (error: any) {
    console.error('[MIGRATE] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('retry_queue', 'audit_log', 'sftp_pickups')
    `);

    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
        AND column_name IN ('phi_encrypted', 'encrypted_fields', 'encryption_key_id')
    `);

    return NextResponse.json({
      migrated: tables.rows.length === 3 && columns.rows.length === 3,
      tables: tables.rows.map(r => r.table_name),
      bill_columns: columns.rows.map(r => r.column_name)
    });

  } catch (error: any) {
    return NextResponse.json({
      migrated: false,
      error: error.message
    });
  }
}
