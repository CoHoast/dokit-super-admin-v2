import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET - List all intake sources for a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const workflowKey = searchParams.get('workflowKey');

    let query = `
      SELECT 
        s.*,
        t.name as source_type_name,
        t.description as source_type_description,
        t.icon as source_type_icon,
        t.supports_schedule,
        t.supports_test
      FROM intake_sources s
      LEFT JOIN intake_source_types t ON s.source_type = t.type_key
      WHERE s.client_id = $1
    `;
    const params_arr: (string | number)[] = [parseInt(clientId)];

    if (workflowKey) {
      query += ` AND s.workflow_key = $2`;
      params_arr.push(workflowKey);
    }

    query += ` ORDER BY s.workflow_key, s.created_at`;

    const result = await pool.query(query, params_arr);

    // Group by workflow if no specific workflow requested
    if (!workflowKey) {
      const grouped: Record<string, typeof result.rows> = {};
      for (const source of result.rows) {
        if (!grouped[source.workflow_key]) {
          grouped[source.workflow_key] = [];
        }
        grouped[source.workflow_key].push(source);
      }
      
      return NextResponse.json({
        success: true,
        client_id: parseInt(clientId),
        sources_by_workflow: grouped,
        total_count: result.rows.length
      });
    }

    return NextResponse.json({
      success: true,
      client_id: parseInt(clientId),
      workflow_key: workflowKey,
      sources: result.rows
    });

  } catch (error) {
    console.error('Error fetching client intake sources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch intake sources' },
      { status: 500 }
    );
  }
}
