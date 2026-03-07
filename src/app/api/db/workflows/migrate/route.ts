import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * POST /api/db/workflows/migrate
 * 
 * Creates the workflow management tables:
 * - client_workflows: Which workflows are enabled per client
 * - workflow_configs: Client-specific configuration for each workflow
 */
export async function POST() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Table 1: client_workflows - Tracks which workflows are enabled per client
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_workflows (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        workflow_key VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT false,
        enabled_at TIMESTAMP,
        enabled_by VARCHAR(255),
        disabled_at TIMESTAMP,
        disabled_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(client_id, workflow_key)
      )
    `);
    
    // Index for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_workflows_client 
      ON client_workflows(client_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_workflows_enabled 
      ON client_workflows(client_id, enabled) 
      WHERE enabled = true
    `);
    
    // Table 2: workflow_configs - Client-specific settings for each workflow
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_configs (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        workflow_key VARCHAR(50) NOT NULL,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        
        UNIQUE(client_id, workflow_key)
      )
    `);
    
    // Index for config lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_configs_client 
      ON workflow_configs(client_id)
    `);
    
    // Table 3: workflow_audit_log - Track changes for compliance
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_audit_log (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        workflow_key VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        actor VARCHAR(255),
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_audit_client 
      ON workflow_audit_log(client_id, created_at DESC)
    `);
    
    // Create updated_at trigger function if not exists
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    // Apply triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_client_workflows_updated_at ON client_workflows;
      CREATE TRIGGER update_client_workflows_updated_at
        BEFORE UPDATE ON client_workflows
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_workflow_configs_updated_at ON workflow_configs;
      CREATE TRIGGER update_workflow_configs_updated_at
        BEFORE UPDATE ON workflow_configs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Workflow tables created successfully',
      tables: ['client_workflows', 'workflow_configs', 'workflow_audit_log']
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/db/workflows/migrate
 * 
 * Check migration status
 */
export async function GET() {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('client_workflows', 'workflow_configs', 'workflow_audit_log')
    `);
    
    const existingTables = tablesResult.rows.map(r => r.table_name);
    const requiredTables = ['client_workflows', 'workflow_configs', 'workflow_audit_log'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    return NextResponse.json({
      migrated: missingTables.length === 0,
      existingTables,
      missingTables
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
