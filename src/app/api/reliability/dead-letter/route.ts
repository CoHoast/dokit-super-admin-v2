/**
 * Dead Letter Queue Management API
 * 
 * View and manage failed jobs that need manual attention.
 * 
 * GET /api/reliability/dead-letter - List dead letter items
 * POST /api/reliability/dead-letter/:id/retry - Retry a dead letter item
 * POST /api/reliability/dead-letter/:id/resolve - Mark as resolved
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RetryQueueService } from '@/lib/reliability/retry-queue';
import { AuditLogger } from '@/lib/reliability/audit-logger';

// List dead letter queue items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let query = `
      SELECT 
        rq.*,
        b.provider_name,
        b.member_name,
        b.total_billed,
        c.name as client_name
      FROM retry_queue rq
      LEFT JOIN bills b ON rq.bill_id = b.id
      LEFT JOIN clients c ON rq.client_id = c.id
      WHERE rq.status = 'dead_letter'
    `;
    const params: any[] = [];
    
    if (clientId) {
      params.push(parseInt(clientId));
      query += ` AND rq.client_id = $${params.length}`;
    }
    
    query += ` ORDER BY rq.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM retry_queue WHERE status = 'dead_letter'`;
    const countParams: any[] = [];
    if (clientId) {
      countParams.push(parseInt(clientId));
      countQuery += ` AND client_id = $1`;
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      items: result.rows.map(row => ({
        id: row.id,
        jobType: row.job_type,
        payload: row.payload,
        attempts: row.attempts,
        maxRetries: row.max_retries,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Bill context
        billId: row.bill_id,
        providerName: row.provider_name,
        memberName: row.member_name,
        totalBilled: row.total_billed,
        // Client context
        clientId: row.client_id,
        clientName: row.client_name
      })),
      total,
      limit,
      offset
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

// Retry or resolve dead letter items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, resolution, additionalRetries } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const retryQueue = new RetryQueueService(pool);
    const auditLogger = new AuditLogger(pool);

    switch (action) {
      case 'retry':
        await retryQueue.retryDeadLetter(id, additionalRetries || 3);
        await auditLogger.log({
          action: 'error_occurred',
          resourceType: 'system',
          resourceId: id.toString(),
          success: true,
          details: { action: 'dead_letter_retry', additionalRetries: additionalRetries || 3 }
        });
        return NextResponse.json({
          success: true,
          message: `Job ${id} queued for retry with ${additionalRetries || 3} additional attempts`
        });

      case 'resolve':
        if (!resolution) {
          return NextResponse.json({ error: 'resolution is required' }, { status: 400 });
        }
        await retryQueue.resolveDeadLetter(id, resolution);
        await auditLogger.log({
          action: 'error_occurred',
          resourceType: 'system',
          resourceId: id.toString(),
          success: true,
          details: { action: 'dead_letter_resolved', resolution }
        });
        return NextResponse.json({
          success: true,
          message: `Job ${id} marked as resolved: ${resolution}`
        });

      default:
        return NextResponse.json({ error: 'Invalid action. Use: retry, resolve' }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
