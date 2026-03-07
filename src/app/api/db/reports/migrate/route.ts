// Phase 2E: Reports & Audit Tables Migration

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST() {
  try {
    // Create audit_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create onboarding_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        client_id INTEGER PRIMARY KEY REFERENCES clients(id),
        completed_steps JSONB DEFAULT '[]',
        current_step VARCHAR(50) NOT NULL DEFAULT 'welcome',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);
    
    // Create saved_reports table for scheduled/saved reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        name VARCHAR(255) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        parameters JSONB DEFAULT '{}',
        schedule VARCHAR(50), -- daily, weekly, monthly, or null for one-time
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        recipients JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_client ON audit_log(client_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_saved_reports_client ON saved_reports(client_id);
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Reports tables created successfully',
      tables: ['audit_log', 'onboarding_progress', 'saved_reports']
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
