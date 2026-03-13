/**
 * SFTP Connection Test Endpoint
 * 
 * Tests SFTP connection and returns directory status.
 * 
 * GET /api/sftp/test?clientId=solidarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { SftpPickupService } from '@/lib/reliability/sftp-pickup';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientSlug = searchParams.get('clientId') || 'solidarity';
  
  try {
    // Get client ID from slug
    const clientResult = await pool.query(
      `SELECT id FROM clients WHERE slug = $1 OR name ILIKE $1`,
      [clientSlug]
    );
    
    if (clientResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Client not found: ${clientSlug}`
      }, { status: 404 });
    }
    
    const clientId = clientResult.rows[0].id;
    const config = SftpPickupService.getConfigFromEnv(clientSlug);
    
    // Check if config is present
    if (!config.host) {
      return NextResponse.json({
        success: false,
        error: 'SFTP not configured for this client',
        configuredVariables: {
          host: !!config.host,
          username: !!config.username,
          auth: !!(config.privateKey || config.password)
        }
      });
    }
    
    const service = new SftpPickupService(pool, clientId, config);
    const result = await service.testConnection();
    
    return NextResponse.json({
      success: result.success,
      client: clientSlug,
      host: config.host,
      port: config.port,
      directories: result.directories,
      error: result.error
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
