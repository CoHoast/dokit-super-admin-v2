import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Support both GET and POST for easier testing
export async function GET() {
  return runMigration();
}

export async function POST() {
  return runMigration();
}

async function runMigration() {
  try {
    // Add custom dashboard fields to clients table
    await pool.query(`
      -- Add dashboard_type enum and column
      DO $$ BEGIN
        CREATE TYPE dashboard_type AS ENUM ('standard', 'custom');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Add new columns for custom dashboard support
      ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS dashboard_type dashboard_type DEFAULT 'standard',
        ADD COLUMN IF NOT EXISTS custom_dashboard_url TEXT,
        ADD COLUMN IF NOT EXISTS stats_api_endpoint TEXT,
        ADD COLUMN IF NOT EXISTS stats_api_key TEXT,
        ADD COLUMN IF NOT EXISTS last_stats_sync TIMESTAMP,
        ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'disconnected',
        ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

      -- Create client_stats table for caching stats from custom dashboards
      CREATE TABLE IF NOT EXISTS client_stats (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
        stats_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        synced_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, stat_date)
      );

      -- Create client_products table for tracking which products each client uses
      CREATE TABLE IF NOT EXISTS client_products (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        product_slug TEXT NOT NULL,
        product_name TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        custom_config JSONB DEFAULT '{}'::jsonb,
        dashboard_url TEXT,
        stats_endpoint TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, product_slug)
      );

      -- Create index for faster stats lookups
      CREATE INDEX IF NOT EXISTS idx_client_stats_client_date ON client_stats(client_id, stat_date DESC);
      CREATE INDEX IF NOT EXISTS idx_client_products_client ON client_products(client_id);
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Custom dashboard migration complete',
      tables: ['clients (updated)', 'client_stats', 'client_products']
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error?.message 
    }, { status: 500 });
  }
}
