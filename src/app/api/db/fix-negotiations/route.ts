// Quick fix to add missing columns to negotiations table

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
    
    // Verify columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'negotiations'
      ORDER BY ordinal_position
    `);
    
    const columns = result.rows.map(r => r.column_name);
    
    return NextResponse.json({
      success: true,
      message: 'Negotiations table fixed',
      columns
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
