/**
 * External Cron Processor Endpoint
 * 
 * Called by external cron services (cron-job.org, AWS EventBridge, etc.)
 * for bulletproof reliability.
 * 
 * GET /api/cron/process?secret=YOUR_SECRET&action=process_all
 * 
 * Actions:
 * - health: Health check only
 * - process_all: Process new bills + counters + retry queue
 * - process_bills: Process new bills only
 * - process_counters: Process counters only
 * - process_retry: Process retry queue only
 * - sftp_pickup: Run SFTP pickup (if configured)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RetryQueueService } from '@/lib/reliability/retry-queue';
import { AuditLogger } from '@/lib/reliability/audit-logger';

const CRON_SECRET = process.env.CRON_SECRET || 'sirkl-cron-2026';

// Validate cron authentication
function validateAuth(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret === CRON_SECRET) return true;
  
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === CRON_SECRET) {
    return true;
  }
  
  const apiKey = request.headers.get('x-api-key');
  if (apiKey === CRON_SECRET) return true;
  
  return false;
}

// Health check
async function checkHealth(): Promise<{
  database: boolean;
  retryQueue: { pending: number; deadLetter: number };
  lastRun?: string;
}> {
  let dbHealthy = false;
  let queueStats = { pending: 0, deadLetter: 0 };
  
  try {
    const result = await pool.query('SELECT 1');
    dbHealthy = result.rows.length === 1;
  } catch {}
  
  try {
    const retryQueue = new RetryQueueService(pool);
    const stats = await retryQueue.getStats();
    queueStats = {
      pending: stats.pending,
      deadLetter: stats.deadLetter
    };
  } catch {}
  
  return {
    database: dbHealthy,
    retryQueue: queueStats
  };
}

// Process new bills
async function processNewBills(): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  const retryQueue = new RetryQueueService(pool);
  const auditLogger = new AuditLogger(pool);
  
  try {
    // Get autonomous clients
    const clientsResult = await pool.query(`
      SELECT ns.*, c.name as client_name 
      FROM negotiation_settings ns
      JOIN clients c ON ns.client_id = c.id
      WHERE ns.autonomy_level = 'fully_autonomous'
    `);
    
    for (const settings of clientsResult.rows) {
      try {
        // Get bills needing offers (limit 50 per run)
        const billsResult = await pool.query(`
          SELECT b.* FROM bills b
          LEFT JOIN negotiations n ON b.id = n.bill_id
          WHERE b.client_id = $1 
            AND b.status IN ('received', 'ready_to_negotiate')
            AND n.id IS NULL
          ORDER BY b.created_at ASC
          LIMIT 50
        `, [settings.client_id]);
        
        for (const bill of billsResult.rows) {
          try {
            // Add to retry queue for reliable processing
            await retryQueue.addJob({
              jobType: 'offer_send_email',
              payload: { 
                billId: bill.id, 
                clientId: settings.client_id,
                action: 'create_and_send_offer'
              },
              clientId: settings.client_id,
              billId: bill.id
            });
            
            // Update bill status to queued
            await pool.query(`
              UPDATE bills SET status = 'queued', updated_at = NOW() WHERE id = $1
            `, [bill.id]);
            
            processed++;
          } catch (billError: any) {
            errors.push(`Bill ${bill.id}: ${billError.message}`);
          }
        }
      } catch (clientError: any) {
        errors.push(`Client ${settings.client_id}: ${clientError.message}`);
      }
    }
    
    // Log the cron run
    await auditLogger.log({
      action: 'bill_offer_sent',
      resourceType: 'system',
      success: errors.length === 0,
      details: { processed, errors: errors.length }
    });
    
  } catch (error: any) {
    errors.push(`processNewBills: ${error.message}`);
  }
  
  return { processed, errors };
}

// Process counter-offers
async function processCounters(): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  const retryQueue = new RetryQueueService(pool);
  
  try {
    // Get negotiations with counters ready for response
    const result = await pool.query(`
      SELECT n.id, n.bill_id, n.client_id
      FROM negotiations n
      JOIN negotiation_settings ns ON n.client_id = ns.client_id
      WHERE n.response_type = 'countered'
        AND ns.autonomy_level = 'fully_autonomous'
        AND n.auto_negotiated = true
        AND (n.scheduled_response_at IS NULL OR n.scheduled_response_at <= NOW())
      ORDER BY n.response_received_at ASC
      LIMIT 50
    `);
    
    for (const row of result.rows) {
      try {
        await retryQueue.addJob({
          jobType: 'counter_response',
          payload: {
            negotiationId: row.id,
            billId: row.bill_id,
            action: 'process_counter'
          },
          clientId: row.client_id,
          billId: row.bill_id
        });
        processed++;
      } catch (error: any) {
        errors.push(`Negotiation ${row.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`processCounters: ${error.message}`);
  }
  
  return { processed, errors };
}

// Process retry queue
async function processRetryQueue(): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  const retryQueue = new RetryQueueService(pool);
  
  try {
    const jobs = await retryQueue.getReadyJobs(100);
    
    for (const job of jobs) {
      try {
        await retryQueue.markProcessing(job.id);
        
        // Execute based on job type - call existing bill negotiator logic
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        let endpoint = '';
        let body = {};
        
        switch (job.jobType) {
          case 'bill_extraction':
            // Trigger extraction via existing endpoint
            endpoint = '/api/bill-negotiator/extract';
            body = { billId: job.payload.billId };
            break;
            
          case 'offer_send_email':
          case 'offer_send_fax':
            // Use the auto-process endpoint for sending offers
            endpoint = '/api/bill-negotiator/auto-process';
            body = { 
              action: 'process_single_bill',
              billId: job.payload.billId,
              clientId: job.payload.clientId
            };
            break;
            
          case 'counter_response':
            endpoint = '/api/bill-negotiator/auto-process';
            body = {
              action: 'process_single_counter',
              negotiationId: job.payload.negotiationId
            };
            break;
            
          default:
            throw new Error(`Unknown job type: ${job.jobType}`);
        }
        
        if (endpoint) {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${CRON_SECRET}`
            },
            body: JSON.stringify(body)
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
          }
        }
        
        await retryQueue.markCompleted(job.id);
        processed++;
        
      } catch (error: any) {
        await retryQueue.markFailed(job.id, error.message);
        errors.push(`Job ${job.id} (${job.jobType}): ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`processRetryQueue: ${error.message}`);
  }
  
  return { processed, errors };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';
  
  // Health check doesn't require auth
  if (action === 'health') {
    const health = await checkHealth();
    return NextResponse.json({
      status: 'ok',
      service: 'sirkl-bill-negotiator',
      ...health,
      timestamp: new Date().toISOString()
    });
  }
  
  // All other actions require auth
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const startTime = Date.now();
  const results: any = {
    action,
    success: true,
    timestamp: new Date().toISOString(),
    duration: 0,
    jobs: {}
  };
  
  try {
    switch (action) {
      case 'process_all':
        const [bills, counters, retry] = await Promise.all([
          processNewBills(),
          processCounters(),
          processRetryQueue()
        ]);
        results.jobs = { bills, counters, retry };
        results.success = bills.errors.length === 0 && 
                          counters.errors.length === 0 && 
                          retry.errors.length === 0;
        break;
        
      case 'process_bills':
        results.jobs.bills = await processNewBills();
        results.success = results.jobs.bills.errors.length === 0;
        break;
        
      case 'process_counters':
        results.jobs.counters = await processCounters();
        results.success = results.jobs.counters.errors.length === 0;
        break;
        
      case 'process_retry':
        results.jobs.retry = await processRetryQueue();
        results.success = results.jobs.retry.errors.length === 0;
        break;
        
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
    
    // Add health info
    results.health = await checkHealth();
    
  } catch (error: any) {
    results.success = false;
    results.error = error.message;
  }
  
  results.duration = Date.now() - startTime;
  
  // Log summary
  console.log(`[CRON] ${action} completed in ${results.duration}ms - success: ${results.success}`);
  
  return NextResponse.json(results, { status: results.success ? 200 : 500 });
}

// POST also supported for external services that prefer POST
export async function POST(request: NextRequest) {
  return GET(request);
}
