import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { WORKFLOWS } from '@/config/workflows';

interface RouteParams {
  params: Promise<{ clientId: string; workflowKey: string }>;
}

/**
 * GET /api/db/workflows/client/[clientId]/[workflowKey]
 * 
 * Get specific workflow status and config for a client
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { clientId, workflowKey } = await params;
  
  // Validate workflow exists
  const workflowDef = WORKFLOWS[workflowKey];
  if (!workflowDef) {
    return NextResponse.json({ error: 'Unknown workflow' }, { status: 404 });
  }
  
  try {
    // Get enabled status
    const statusResult = await pool.query(
      `SELECT enabled, enabled_at, enabled_by, disabled_at, disabled_by
       FROM client_workflows 
       WHERE client_id = $1 AND workflow_key = $2`,
      [clientId, workflowKey]
    );
    
    // Get config
    const configResult = await pool.query(
      `SELECT config, updated_at, updated_by
       FROM workflow_configs 
       WHERE client_id = $1 AND workflow_key = $2`,
      [clientId, workflowKey]
    );
    
    const status = statusResult.rows[0] || { enabled: false };
    const configRow = configResult.rows[0];
    const config = configRow?.config || workflowDef.defaultConfig;
    
    return NextResponse.json({
      workflow: workflowDef,
      enabled: status.enabled || false,
      enabledAt: status.enabled_at,
      enabledBy: status.enabled_by,
      config,
      configUpdatedAt: configRow?.updated_at,
      configUpdatedBy: configRow?.updated_by,
      isDefaultConfig: !configRow
    });
    
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/db/workflows/client/[clientId]/[workflowKey]
 * 
 * Update workflow (toggle enabled and/or update config)
 * Body: { enabled?: boolean, config?: object, actor?: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { clientId, workflowKey } = await params;
  const body = await request.json();
  const { enabled, config, actor } = body;
  
  // Validate workflow exists
  const workflowDef = WORKFLOWS[workflowKey];
  if (!workflowDef) {
    return NextResponse.json({ error: 'Unknown workflow' }, { status: 404 });
  }
  
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    const results: Record<string, any> = {};
    
    // Update enabled status if provided
    if (typeof enabled === 'boolean') {
      const statusResult = await dbClient.query(
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
        [clientId, workflowKey, enabled, new Date().toISOString(), actor || 'system']
      );
      
      results.enabled = statusResult.rows[0].enabled;
      
      // Log the change
      await dbClient.query(
        `INSERT INTO workflow_audit_log (client_id, workflow_key, action, actor, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [clientId, workflowKey, enabled ? 'enabled' : 'disabled', actor || 'system', { enabled }]
      );
    }
    
    // Update config if provided
    if (config && typeof config === 'object') {
      // Validate config against schema
      const validationErrors = validateConfig(workflowDef.configSchema, config);
      if (validationErrors.length > 0) {
        await dbClient.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invalid config', validationErrors },
          { status: 400 }
        );
      }
      
      // Get old config for audit
      const oldConfigResult = await dbClient.query(
        `SELECT config FROM workflow_configs WHERE client_id = $1 AND workflow_key = $2`,
        [clientId, workflowKey]
      );
      const oldConfig = oldConfigResult.rows[0]?.config || workflowDef.defaultConfig;
      
      // Merge with defaults to ensure all fields exist
      const mergedConfig = { ...workflowDef.defaultConfig, ...config };
      
      const configResult = await dbClient.query(
        `INSERT INTO workflow_configs (client_id, workflow_key, config, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (client_id, workflow_key)
         DO UPDATE SET 
           config = $3,
           updated_by = $4
         RETURNING *`,
        [clientId, workflowKey, JSON.stringify(mergedConfig), actor || 'system']
      );
      
      results.config = configResult.rows[0].config;
      
      // Log config change
      await dbClient.query(
        `INSERT INTO workflow_audit_log (client_id, workflow_key, action, actor, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, workflowKey, 'config_updated', actor || 'system', oldConfig, mergedConfig]
      );
    }
    
    await dbClient.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      ...results
    });
    
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  } finally {
    dbClient.release();
  }
}

/**
 * DELETE /api/db/workflows/client/[clientId]/[workflowKey]
 * 
 * Reset workflow to defaults (disable and clear custom config)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { clientId, workflowKey } = await params;
  const { searchParams } = new URL(request.url);
  const actor = searchParams.get('actor') || 'system';
  
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    // Disable workflow
    await dbClient.query(
      `UPDATE client_workflows 
       SET enabled = false, disabled_at = $3, disabled_by = $4
       WHERE client_id = $1 AND workflow_key = $2`,
      [clientId, workflowKey, new Date().toISOString(), actor]
    );
    
    // Delete custom config (will fall back to defaults)
    await dbClient.query(
      `DELETE FROM workflow_configs 
       WHERE client_id = $1 AND workflow_key = $2`,
      [clientId, workflowKey]
    );
    
    // Log the reset
    await dbClient.query(
      `INSERT INTO workflow_audit_log (client_id, workflow_key, action, actor)
       VALUES ($1, $2, $3, $4)`,
      [clientId, workflowKey, 'reset', actor]
    );
    
    await dbClient.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: 'Workflow reset to defaults'
    });
    
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error resetting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to reset workflow' },
      { status: 500 }
    );
  } finally {
    dbClient.release();
  }
}

// Config validation helper
function validateConfig(schema: Record<string, any>, config: Record<string, any>): string[] {
  const errors: string[] = [];
  
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const value = config[key];
    
    if (value === undefined) continue; // Will use default
    
    switch (fieldSchema.type) {
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`${key} must be a number`);
        } else {
          if (fieldSchema.min !== undefined && value < fieldSchema.min) {
            errors.push(`${key} must be at least ${fieldSchema.min}`);
          }
          if (fieldSchema.max !== undefined && value > fieldSchema.max) {
            errors.push(`${key} must be at most ${fieldSchema.max}`);
          }
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`);
        }
        break;
        
      case 'string':
      case 'email':
      case 'url':
        if (typeof value !== 'string') {
          errors.push(`${key} must be a string`);
        }
        break;
        
      case 'enum':
        const validValues = fieldSchema.options?.map((o: any) => o.value) || [];
        if (!validValues.includes(value)) {
          errors.push(`${key} must be one of: ${validValues.join(', ')}`);
        }
        break;
    }
  }
  
  return errors;
}
