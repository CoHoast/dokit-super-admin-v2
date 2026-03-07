import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET - List all available intake source types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabled') !== 'false';

    let query = `
      SELECT 
        type_key,
        name,
        description,
        icon,
        config_schema,
        supports_schedule,
        supports_test,
        enabled,
        display_order
      FROM intake_source_types
    `;

    if (enabledOnly) {
      query += ' WHERE enabled = true';
    }

    query += ' ORDER BY display_order, name';

    const result = await pool.query(query);

    // Parse config_schema JSON for each type
    const types = result.rows.map(row => ({
      ...row,
      config_schema: typeof row.config_schema === 'string' 
        ? JSON.parse(row.config_schema) 
        : row.config_schema
    }));

    return NextResponse.json({
      success: true,
      types
    });

  } catch (error) {
    console.error('Error fetching intake source types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch source types' },
      { status: 500 }
    );
  }
}
