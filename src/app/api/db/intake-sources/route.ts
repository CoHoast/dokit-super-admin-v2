import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';

// GET - List all intake sources (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const workflowKey = searchParams.get('workflowKey');
    const sourceType = searchParams.get('sourceType');
    const enabled = searchParams.get('enabled');

    let query = `
      SELECT 
        s.*,
        t.name as source_type_name,
        t.description as source_type_description,
        t.icon as source_type_icon,
        t.config_schema,
        t.supports_schedule,
        t.supports_test,
        c.name as client_name
      FROM intake_sources s
      LEFT JOIN intake_source_types t ON s.source_type = t.type_key
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE 1=1
    `;
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (clientId) {
      query += ` AND s.client_id = $${paramIndex++}`;
      params.push(parseInt(clientId));
    }
    if (workflowKey) {
      query += ` AND s.workflow_key = $${paramIndex++}`;
      params.push(workflowKey);
    }
    if (sourceType) {
      query += ` AND s.source_type = $${paramIndex++}`;
      params.push(sourceType);
    }
    if (enabled !== null && enabled !== undefined) {
      query += ` AND s.enabled = $${paramIndex++}`;
      params.push(enabled === 'true');
    }

    query += ` ORDER BY s.client_id, s.workflow_key, s.created_at`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      sources: result.rows
    });

  } catch (error) {
    console.error('Error fetching intake sources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch intake sources' },
      { status: 500 }
    );
  }
}

// POST - Create new intake source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client_id,
      workflow_key,
      source_type,
      name,
      description,
      config,
      schedule,
      schedule_cron,
      enabled = true,
      created_by
    } = body;

    // Validate required fields
    if (!client_id || !workflow_key || !source_type || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: client_id, workflow_key, source_type, name' },
        { status: 400 }
      );
    }

    // Verify source type exists
    const typeCheck = await pool.query(
      'SELECT type_key FROM intake_source_types WHERE type_key = $1 AND enabled = true',
      [source_type]
    );
    if (typeCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Invalid source type: ${source_type}` },
        { status: 400 }
      );
    }

    // Generate API key and webhook secret for API sources
    let finalConfig = { ...config };
    if (source_type === 'api') {
      finalConfig.api_key = finalConfig.api_key || `dk_${crypto.randomBytes(24).toString('hex')}`;
      finalConfig.webhook_secret = finalConfig.webhook_secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;
      finalConfig.webhook_url = `/api/intake/webhook/${client_id}/${workflow_key}`;
    }

    // Generate email address for email sources
    if (source_type === 'email') {
      const clientResult = await pool.query('SELECT slug FROM clients WHERE id = $1', [client_id]);
      const clientSlug = clientResult.rows[0]?.slug || `client-${client_id}`;
      finalConfig.email_address = `${workflow_key}-${clientSlug}@intake.dokit.ai`;
    }

    const result = await pool.query(`
      INSERT INTO intake_sources (
        client_id, workflow_key, source_type, name, description,
        config, schedule, schedule_cron, enabled, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      client_id,
      workflow_key,
      source_type,
      name,
      description || null,
      JSON.stringify(finalConfig),
      schedule || null,
      schedule_cron || null,
      enabled,
      created_by || null
    ]);

    return NextResponse.json({
      success: true,
      source: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating intake source:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'An intake source with this name already exists for this client and workflow' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create intake source' },
      { status: 500 }
    );
  }
}
