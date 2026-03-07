// Phase 2E: Audit Log API

import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/reports/service';

// Get audit log entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'clientId is required'
      }, { status: 400 });
    }
    
    const result = await reportsService.getAuditLog(parseInt(clientId), {
      entity_type: entityType || undefined,
      entity_id: entityId ? parseInt(entityId) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });
    
    return NextResponse.json({
      success: true,
      entries: result.entries,
      total: result.total
    });
    
  } catch (error: any) {
    console.error('Audit log error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Log a new audit entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, entityType, entityId, clientId, action, details } = body;
    
    if (!eventType || !entityType || !clientId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }
    
    await reportsService.logAudit({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      client_id: clientId,
      action,
      details: details || {},
      user_id: body.userId,
      user_name: body.userName,
      ip_address: request.headers.get('x-forwarded-for') || undefined
    });
    
    return NextResponse.json({
      success: true,
      message: 'Audit entry logged'
    });
    
  } catch (error: any) {
    console.error('Log audit error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
