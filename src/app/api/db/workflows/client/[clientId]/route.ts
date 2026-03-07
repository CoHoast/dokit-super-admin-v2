import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { WORKFLOWS } from '@/config/workflows';

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/db/workflows/client/[clientId]
 * 
 * Get all workflows and their status for a client
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;
  
  try {
    // Get client info
    const clientResult = await pool.query(
      'SELECT id, name, tier FROM clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    const client = clientResult.rows[0];
    
    // Get enabled workflows for this client
    const enabledResult = await pool.query(
      `SELECT workflow_key, enabled, enabled_at, enabled_by
       FROM client_workflows 
       WHERE client_id = $1`,
      [clientId]
    );
    
    const enabledMap = new Map(
      enabledResult.rows.map(r => [r.workflow_key, r])
    );
    
    // Get configs for this client
    const configResult = await pool.query(
      `SELECT workflow_key, config
       FROM workflow_configs 
       WHERE client_id = $1`,
      [clientId]
    );
    
    const configMap = new Map(
      configResult.rows.map(r => [r.workflow_key, r.config])
    );
    
    // Build response with all workflows and their status
    const workflows = Object.values(WORKFLOWS).map(workflow => {
      const enabledRecord = enabledMap.get(workflow.key);
      const config = configMap.get(workflow.key) || workflow.defaultConfig;
      
      return {
        ...workflow,
        enabled: enabledRecord?.enabled || false,
        enabledAt: enabledRecord?.enabled_at,
        enabledBy: enabledRecord?.enabled_by,
        config,
        hasCustomConfig: configMap.has(workflow.key)
      };
    });
    
    return NextResponse.json({
      client,
      workflows,
      summary: {
        total: workflows.length,
        enabled: workflows.filter(w => w.enabled).length,
        disabled: workflows.filter(w => !w.enabled).length
      }
    });
    
  } catch (error) {
    console.error('Error fetching client workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/db/workflows/client/[clientId]
 * 
 * Bulk enable/disable workflows for a client
 * Body: { workflows: [{ key: string, enabled: boolean }] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { clientId } = await params;
  const body = await request.json();
  const { workflows, actor } = body;
  
  if (!workflows || !Array.isArray(workflows)) {
    return NextResponse.json(
      { error: 'workflows array required' },
      { status: 400 }
    );
  }
  
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    const results = [];
    
    for (const { key, enabled } of workflows) {
      // Validate workflow exists
      if (!WORKFLOWS[key]) {
        results.push({ key, success: false, error: 'Unknown workflow' });
        continue;
      }
      
      // Upsert the workflow status
      const result = await dbClient.query(
        `INSERT INTO client_workflows (client_id, workflow_key, enabled, enabled_at, enabled_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (client_id, workflow_key)
         DO UPDATE SET 
           enabled = $3,
           enabled_at = CASE WHEN $3 = true THEN $4 ELSE client_workflows.enabled_at END,
           enabled_by = CASE WHEN $3 = true THEN $5 ELSE client_workflows.enabled_by END,
           disabled_at = CASE WHEN $3 = false THEN $4 ELSE NULL END,
           disabled_by = CASE WHEN $3 = false THEN $5 ELSE NULL END
         RETURNING *`,
        [clientId, key, enabled, new Date().toISOString(), actor || 'system']
      );
      
      // Log the change
      await dbClient.query(
        `INSERT INTO workflow_audit_log (client_id, workflow_key, action, actor, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [clientId, key, enabled ? 'enabled' : 'disabled', actor || 'system', { enabled }]
      );
      
      // If enabling, ensure default config exists
      if (enabled) {
        await dbClient.query(
          `INSERT INTO workflow_configs (client_id, workflow_key, config)
           VALUES ($1, $2, $3)
           ON CONFLICT (client_id, workflow_key) DO NOTHING`,
          [clientId, key, JSON.stringify(WORKFLOWS[key].defaultConfig)]
        );
      }
      
      results.push({ key, success: true, enabled });
    }
    
    await dbClient.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error updating workflows:', error);
    return NextResponse.json(
      { error: 'Failed to update workflows' },
      { status: 500 }
    );
  } finally {
    dbClient.release();
  }
}
