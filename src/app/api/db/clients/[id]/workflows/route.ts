import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET workflows for a client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await pool.query(`
      SELECT workflow_type, enabled, config, created_at, updated_at
      FROM client_workflows 
      WHERE client_id = $1
      ORDER BY workflow_type
    `, [id]);

    return NextResponse.json({ 
      workflows: result.rows.map(w => ({
        type: w.workflow_type,
        enabled: w.enabled,
        config: w.config,
        createdAt: w.created_at,
        updatedAt: w.updated_at
      }))
    });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

// PUT update workflow (toggle enabled, update config)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workflowType, enabled, config } = await request.json();

    if (!workflowType) {
      return NextResponse.json({ error: 'workflowType is required' }, { status: 400 });
    }

    // Upsert the workflow
    const result = await pool.query(`
      INSERT INTO client_workflows (client_id, workflow_type, enabled, config)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (client_id, workflow_type) 
      DO UPDATE SET 
        enabled = COALESCE($3, client_workflows.enabled),
        config = COALESCE($4, client_workflows.config),
        updated_at = NOW()
      RETURNING *
    `, [id, workflowType, enabled, config ? JSON.stringify(config) : null]);

    return NextResponse.json({ 
      success: true, 
      workflow: {
        type: result.rows[0].workflow_type,
        enabled: result.rows[0].enabled,
        config: result.rows[0].config
      }
    });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

// POST bulk update workflows
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { workflows } = await request.json();

    if (!Array.isArray(workflows)) {
      return NextResponse.json({ error: 'workflows array is required' }, { status: 400 });
    }

    const results = [];
    for (const workflow of workflows) {
      const result = await pool.query(`
        INSERT INTO client_workflows (client_id, workflow_type, enabled, config)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (client_id, workflow_type) 
        DO UPDATE SET 
          enabled = $3,
          config = COALESCE($4, client_workflows.config),
          updated_at = NOW()
        RETURNING *
      `, [id, workflow.type, workflow.enabled, workflow.config ? JSON.stringify(workflow.config) : null]);
      
      results.push(result.rows[0]);
    }

    return NextResponse.json({ 
      success: true, 
      workflows: results.map(w => ({
        type: w.workflow_type,
        enabled: w.enabled,
        config: w.config
      }))
    });
  } catch (error: any) {
    console.error('Error bulk updating workflows:', error);
    return NextResponse.json({ error: 'Failed to update workflows' }, { status: 500 });
  }
}
