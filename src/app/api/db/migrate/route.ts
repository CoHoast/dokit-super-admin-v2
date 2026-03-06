import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST() {
  try {
    // Add new columns to clients table
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(50),
      ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS billing_plan VARCHAR(50) DEFAULT 'starter',
      ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS billing_start_date DATE
    `);

    // Create client_workflows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_workflows (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        workflow_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT false,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, workflow_type)
      )
    `);

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_client_workflows_client_id ON client_workflows(client_id)
    `);

    // Seed default workflows for existing clients
    const clients = await pool.query('SELECT id FROM clients');
    const workflowTypes = [
      'document-intake',
      'member-intake', 
      'claims-adjudication',
      'provider-bills',
      'workers-comp'
    ];

    for (const client of clients.rows) {
      for (const workflowType of workflowTypes) {
        await pool.query(`
          INSERT INTO client_workflows (client_id, workflow_type, enabled)
          VALUES ($1, $2, $3)
          ON CONFLICT (client_id, workflow_type) DO NOTHING
        `, [client.id, workflowType, workflowType === 'document-intake']); // Enable document-intake by default
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      migrations: [
        'Added contact/billing columns to clients',
        'Created client_workflows table',
        'Seeded default workflows for existing clients'
      ]
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error?.message 
    }, { status: 500 });
  }
}
