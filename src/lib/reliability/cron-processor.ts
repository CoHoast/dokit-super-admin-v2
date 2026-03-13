/**
 * External Cron Processor
 * 
 * Handles scheduled job execution with health monitoring.
 * Designed to be called by external cron services (cron-job.org, AWS EventBridge).
 */

import { Pool } from 'pg';
import { RetryQueueService } from '../lib/retry-queue';

// Types
export interface ProcessorResult {
  success: boolean;
  timestamp: string;
  duration: number;
  jobs: {
    billsProcessed: number;
    countersProcessed: number;
    retryQueueProcessed: number;
    errors: string[];
  };
  health: {
    database: boolean;
    queue: {
      pending: number;
      deadLetter: number;
    };
  };
}

export interface ProcessorConfig {
  pool: Pool;
  maxBillsPerRun: number;
  maxCountersPerRun: number;
  maxRetryJobsPerRun: number;
  dryRun?: boolean;
}

/**
 * Main Cron Processor
 */
export class CronProcessor {
  private pool: Pool;
  private retryQueue: RetryQueueService;
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig) {
    this.pool = config.pool;
    this.retryQueue = new RetryQueueService(config.pool);
    this.config = config;
  }

  /**
   * Run the full processing cycle
   */
  async run(): Promise<ProcessorResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const result: ProcessorResult = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: 0,
      jobs: {
        billsProcessed: 0,
        countersProcessed: 0,
        retryQueueProcessed: 0,
        errors: []
      },
      health: {
        database: false,
        queue: {
          pending: 0,
          deadLetter: 0
        }
      }
    };

    try {
      // 1. Health check
      result.health.database = await this.checkDatabaseHealth();
      if (!result.health.database) {
        throw new Error('Database health check failed');
      }

      // 2. Get queue stats
      const queueStats = await this.retryQueue.getStats();
      result.health.queue.pending = queueStats.pending;
      result.health.queue.deadLetter = queueStats.deadLetter;

      // 3. Process new bills
      if (!this.config.dryRun) {
        const billsResult = await this.processNewBills();
        result.jobs.billsProcessed = billsResult.processed;
        errors.push(...billsResult.errors);
      }

      // 4. Process counter-offers
      if (!this.config.dryRun) {
        const countersResult = await this.processCounters();
        result.jobs.countersProcessed = countersResult.processed;
        errors.push(...countersResult.errors);
      }

      // 5. Process retry queue
      if (!this.config.dryRun) {
        const retryResult = await this.processRetryQueue();
        result.jobs.retryQueueProcessed = retryResult.processed;
        errors.push(...retryResult.errors);
      }

      // 6. Cleanup old jobs
      if (!this.config.dryRun) {
        await this.retryQueue.cleanupCompleted(30);
      }

      result.jobs.errors = errors;
      result.success = errors.length === 0;

    } catch (error: any) {
      result.success = false;
      result.jobs.errors.push(error.message);
      console.error('[CRON-PROCESSOR] Fatal error:', error);
    }

    result.duration = Date.now() - startTime;
    
    // Log summary
    console.log(`[CRON-PROCESSOR] Run complete in ${result.duration}ms: ` +
      `${result.jobs.billsProcessed} bills, ` +
      `${result.jobs.countersProcessed} counters, ` +
      `${result.jobs.retryQueueProcessed} retries, ` +
      `${result.jobs.errors.length} errors`);

    return result;
  }

  /**
   * Process new bills that need offers
   */
  private async processNewBills(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Get autonomous clients
      const clientsResult = await this.pool.query(`
        SELECT ns.*, c.name as client_name 
        FROM negotiation_settings ns
        JOIN clients c ON ns.client_id = c.id
        WHERE ns.autonomy_level = 'fully_autonomous'
      `);

      for (const settings of clientsResult.rows) {
        try {
          // Get bills that need offers
          const billsResult = await this.pool.query(`
            SELECT b.* FROM bills b
            LEFT JOIN negotiations n ON b.id = n.bill_id
            WHERE b.client_id = $1 
              AND b.status IN ('received', 'ready_to_negotiate')
              AND n.id IS NULL
            ORDER BY b.created_at ASC
            LIMIT $2
          `, [settings.client_id, this.config.maxBillsPerRun]);

          for (const bill of billsResult.rows) {
            try {
              // Queue the job through retry queue for reliability
              await this.retryQueue.addJob({
                jobType: 'offer_send_email',
                payload: { billId: bill.id, clientId: settings.client_id },
                clientId: settings.client_id,
                billId: bill.id
              });
              processed++;
            } catch (billError: any) {
              errors.push(`Bill ${bill.id}: ${billError.message}`);
            }
          }
        } catch (clientError: any) {
          errors.push(`Client ${settings.client_id}: ${clientError.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`processNewBills: ${error.message}`);
    }

    return { processed, errors };
  }

  /**
   * Process counter-offers
   */
  private async processCounters(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Get negotiations with counters that need responses
      const result = await this.pool.query(`
        SELECT n.*, b.provider_email, b.provider_fax, b.total_billed,
               ns.*, c.name as client_name
        FROM negotiations n
        JOIN bills b ON n.bill_id = b.id
        JOIN negotiation_settings ns ON n.client_id = ns.client_id
        JOIN clients c ON n.client_id = c.id
        WHERE n.response_type = 'countered'
          AND ns.autonomy_level = 'fully_autonomous'
          AND n.auto_negotiated = true
          AND (n.scheduled_response_at IS NULL OR n.scheduled_response_at <= NOW())
        ORDER BY n.response_received_at ASC 
        LIMIT $1
      `, [this.config.maxCountersPerRun]);

      for (const row of result.rows) {
        try {
          // Queue through retry queue
          await this.retryQueue.addJob({
            jobType: 'counter_response',
            payload: { negotiationId: row.id, billId: row.bill_id },
            clientId: row.client_id,
            billId: row.bill_id
          });
          processed++;
        } catch (negError: any) {
          errors.push(`Negotiation ${row.id}: ${negError.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`processCounters: ${error.message}`);
    }

    return { processed, errors };
  }

  /**
   * Process items from retry queue
   */
  private async processRetryQueue(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      const jobs = await this.retryQueue.getReadyJobs(this.config.maxRetryJobsPerRun);

      for (const job of jobs) {
        try {
          await this.retryQueue.markProcessing(job.id);
          
          // Execute based on job type
          switch (job.jobType) {
            case 'bill_extraction':
              await this.executeBillExtraction(job.payload);
              break;
            case 'offer_send_email':
              await this.executeOfferSendEmail(job.payload);
              break;
            case 'offer_send_fax':
              await this.executeOfferSendFax(job.payload);
              break;
            case 'counter_response':
              await this.executeCounterResponse(job.payload);
              break;
            case 'settlement_process':
              await this.executeSettlementProcess(job.payload);
              break;
            case 'sftp_pickup':
              await this.executeSftpPickup(job.payload);
              break;
            default:
              throw new Error(`Unknown job type: ${job.jobType}`);
          }

          await this.retryQueue.markCompleted(job.id);
          processed++;
        } catch (jobError: any) {
          await this.retryQueue.markFailed(job.id, jobError.message);
          errors.push(`Job ${job.id} (${job.jobType}): ${jobError.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`processRetryQueue: ${error.message}`);
    }

    return { processed, errors };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1');
      return result.rows.length === 1;
    } catch {
      return false;
    }
  }

  // Job executors - these call the existing bill negotiator logic
  
  private async executeBillExtraction(payload: { billId: number }): Promise<void> {
    // TODO: Call existing extraction API
    console.log(`[EXECUTE] Bill extraction for bill ${payload.billId}`);
  }

  private async executeOfferSendEmail(payload: { billId: number; clientId: number }): Promise<void> {
    // TODO: Call existing offer send logic
    console.log(`[EXECUTE] Send offer email for bill ${payload.billId}`);
  }

  private async executeOfferSendFax(payload: { billId: number; clientId: number }): Promise<void> {
    // TODO: Call existing fax send logic
    console.log(`[EXECUTE] Send offer fax for bill ${payload.billId}`);
  }

  private async executeCounterResponse(payload: { negotiationId: number; billId: number }): Promise<void> {
    // TODO: Call existing counter response logic
    console.log(`[EXECUTE] Process counter for negotiation ${payload.negotiationId}`);
  }

  private async executeSettlementProcess(payload: { negotiationId: number }): Promise<void> {
    // TODO: Call existing settlement logic
    console.log(`[EXECUTE] Process settlement for negotiation ${payload.negotiationId}`);
  }

  private async executeSftpPickup(payload: { clientId: string; path?: string }): Promise<void> {
    // TODO: Call SFTP pickup service
    console.log(`[EXECUTE] SFTP pickup for client ${payload.clientId}`);
  }
}

/**
 * API Route Handler for External Cron
 * 
 * Call this endpoint from cron-job.org or AWS EventBridge:
 * GET /api/cron/process?secret=YOUR_CRON_SECRET
 */
export async function handleCronRequest(
  pool: Pool,
  secret: string,
  expectedSecret: string,
  action?: string
): Promise<{ status: number; body: any }> {
  // Validate secret
  if (secret !== expectedSecret) {
    return {
      status: 401,
      body: { error: 'Unauthorized' }
    };
  }

  const processor = new CronProcessor({
    pool,
    maxBillsPerRun: 50,
    maxCountersPerRun: 50,
    maxRetryJobsPerRun: 100,
    dryRun: action === 'dry-run'
  });

  const result = await processor.run();

  // Alert if there are dead letter items
  if (result.health.queue.deadLetter > 0) {
    console.warn(`[CRON] ${result.health.queue.deadLetter} items in dead letter queue`);
  }

  return {
    status: result.success ? 200 : 500,
    body: result
  };
}
