// Quick fix to add missing columns to various tables

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST() {
  try {
    // Add current_offer column if it doesn't exist
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS current_offer DECIMAL(12,2)
    `);
    
    // Add status column if it doesn't exist
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `);
    
    // Add settings column to clients if it doesn't exist
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'
    `);
    
    // Add response_token column to negotiations for provider response portal
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS response_token VARCHAR(64) UNIQUE
    `);
    
    // Add response_token_expires column
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS response_token_expires TIMESTAMPTZ
    `);
    
    // Add provider_response_at column
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS provider_response_at TIMESTAMPTZ
    `);
    
    // Add provider_response_method column (portal, email, phone, fax)
    await pool.query(`
      ALTER TABLE negotiations 
      ADD COLUMN IF NOT EXISTS provider_response_method VARCHAR(20)
    `);
    
    // Verify columns exist
    const negResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'negotiations'
      ORDER BY ordinal_position
    `);
    
    const clientResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Tables fixed',
      negotiations_columns: negResult.rows.map(r => r.column_name),
      clients_columns: clientResult.rows.map(r => r.column_name)
    });
    
  } catch (error: any) {
    console.error('Fix negotiations error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just check current columns
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'negotiations'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      columns: result.rows
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
