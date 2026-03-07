import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { WORKFLOWS } from '@/config/workflows';

/**
 * GET /api/db/workflows/enabled?clientId=123
 * 
 * Get enabled workflows for a client (used by Client Dashboard)
 * Returns only enabled workflows with their config
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  }
  
  try {
    // Get enabled workflows
    const enabledResult = await pool.query(
      `SELECT cw.workflow_key, cw.enabled_at,
              COALESCE(wc.config, '{}') as config
       FROM client_workflows cw
       LEFT JOIN workflow_configs wc ON cw.client_id = wc.client_id AND cw.workflow_key = wc.workflow_key
       WHERE cw.client_id = $1 AND cw.enabled = true`,
      [clientId]
    );
    
    // Build response with workflow definitions + client config
    const workflows = enabledResult.rows.map(row => {
      const def = WORKFLOWS[row.workflow_key];
      if (!def) return null;
      
      return {
        key: def.key,
        name: def.name,
        shortDescription: def.shortDescription,
        icon: def.icon,
        color: def.color,
        category: def.category,
        enabledAt: row.enabled_at,
        config: {
          ...def.defaultConfig,
          ...row.config
        }
      };
    }).filter(Boolean);
    
    return NextResponse.json({
      clientId: parseInt(clientId),
      workflows,
      count: workflows.length
    });
    
  } catch (error) {
    console.error('Error fetching enabled workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}
