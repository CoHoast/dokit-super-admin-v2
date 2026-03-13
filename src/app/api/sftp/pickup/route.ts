/**
 * SFTP Pickup Endpoint
 * 
 * Triggers manual or scheduled SFTP pickup from MCO.
 * 
 * POST /api/sftp/pickup
 * {
 *   "clientId": "solidarity",
 *   "path": "/incoming/bills/"  // optional, uses config default
 * }
 * 
 * GET /api/sftp/pickup?secret=CRON_SECRET&clientId=solidarity
 * (For external cron services)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SftpPickupService } from '@/lib/reliability/sftp-pickup';
import { AuditLogger } from '@/lib/reliability/audit-logger';
import { pool } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET || 'sirkl-cron-2026';

function validateAuth(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret === CRON_SECRET) return true;
  
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === CRON_SECRET) {
    return true;
  }
  
  return false;
}

async function runPickup(clientSlug: string): Promise<any> {
  const auditLogger = new AuditLogger(pool);
  
  // Get client ID
  const clientResult = await pool.query(
    `SELECT id, name FROM clients WHERE slug = $1 OR name ILIKE $1`,
    [clientSlug]
  );
  
  if (clientResult.rows.length === 0) {
    throw new Error(`Client not found: ${clientSlug}`);
  }
  
  const clientId = clientResult.rows[0].id;
  const clientName = clientResult.rows[0].name;
  
  // Get SFTP config
  const config = SftpPickupService.getConfigFromEnv(clientSlug);
  
  if (!config.host) {
    throw new Error(`SFTP not configured for client: ${clientSlug}`);
  }
  
  // Log pickup start
  const pickupResult = await pool.query(`
    INSERT INTO sftp_pickups (client_id, pickup_date, started_at, status)
    VALUES ($1, CURRENT_DATE, NOW(), 'running')
    RETURNING id
  `, [clientId]);
  const pickupId = pickupResult.rows[0].id;
  
  // Run pickup
  const service = new SftpPickupService(pool, clientId, config);
  const result = await service.pickup();
  
  // Update pickup record
  await pool.query(`
    UPDATE sftp_pickups 
    SET completed_at = NOW(),
        files_found = $1,
        files_processed = $2,
        files_errored = $3,
        errors = $4,
        status = $5
    WHERE id = $6
  `, [
    result.filesFound,
    result.filesProcessed,
    result.filesErrored,
    JSON.stringify(result.errors),
    result.success ? 'completed' : 'failed',
    pickupId
  ]);
  
  // Audit log
  await auditLogger.log({
    action: 'data_import',
    resourceType: 'system',
    clientId,
    success: result.success,
    details: {
      source: 'sftp',
      client: clientName,
      filesProcessed: result.filesProcessed,
      filesErrored: result.filesErrored
    }
  });
  
  return {
    pickupId,
    client: clientName,
    ...result
  };
}

// GET endpoint for cron
export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const clientSlug = searchParams.get('clientId') || 'solidarity';
  
  try {
    const result = await runPickup(clientSlug);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[SFTP-PICKUP] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const clientSlug = body.clientId || 'solidarity';
    
    const result = await runPickup(clientSlug);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[SFTP-PICKUP] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
