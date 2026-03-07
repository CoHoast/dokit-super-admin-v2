import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET - Get single intake source with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(`
      SELECT 
        s.*,
        t.name as source_type_name,
        t.description as source_type_description,
        t.icon as source_type_icon,
        t.config_schema,
        t.supports_schedule,
        t.supports_test,
        c.name as client_name,
        (
          SELECT json_agg(j ORDER BY j.created_at DESC)
          FROM (
            SELECT id, status, trigger_type, files_found, files_processed, 
                   files_failed, started_at, completed_at, duration_ms
            FROM intake_jobs 
            WHERE intake_source_id = s.id
            ORDER BY created_at DESC
            LIMIT 10
          ) j
        ) as recent_jobs
      FROM intake_sources s
      LEFT JOIN intake_source_types t ON s.source_type = t.type_key
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Intake source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching intake source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch intake source' },
      { status: 500 }
    );
  }
}

// PUT - Update intake source
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build dynamic update query
    const allowedFields = ['name', 'description', 'config', 'schedule', 'schedule_cron', 'enabled'];
    const updates: string[] = [];
    const values: (string | number | boolean | object)[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'config') {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(JSON.stringify(body[field]));
        } else {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(`
      UPDATE intake_sources
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Intake source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating intake source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update intake source' },
      { status: 500 }
    );
  }
}

// DELETE - Delete intake source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if source exists and get info for audit
    const checkResult = await pool.query(
      'SELECT id, client_id, workflow_key, name FROM intake_sources WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Intake source not found' },
        { status: 404 }
      );
    }

    const source = checkResult.rows[0];

    // Delete the source (cascade will handle jobs and files)
    await pool.query('DELETE FROM intake_sources WHERE id = $1', [id]);

    // Log to workflow audit if table exists
    try {
      await pool.query(`
        INSERT INTO workflow_audit_log (client_id, workflow_key, action, details, performed_by)
        VALUES ($1, $2, 'intake_source_deleted', $3, $4)
      `, [
        source.client_id,
        source.workflow_key,
        JSON.stringify({ source_id: id, source_name: source.name }),
        'system'
      ]);
    } catch {
      // Audit log table might not exist, continue anyway
    }

    return NextResponse.json({
      success: true,
      message: 'Intake source deleted successfully',
      deleted: source
    });

  } catch (error) {
    console.error('Error deleting intake source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete intake source' },
      { status: 500 }
    );
  }
}
