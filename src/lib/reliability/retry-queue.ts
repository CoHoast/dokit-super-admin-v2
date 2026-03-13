/**
 * Retry Queue & Dead Letter Queue
 * 
 * Handles failed operations with exponential backoff retry.
 * Operations that exceed max retries go to dead letter queue for manual review.
 */

import { Pool } from 'pg';

// Configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 60000; // 1 minute
const MAX_DELAY_MS = 3600000; // 1 hour
const BACKOFF_MULTIPLIER = 2;

// Job types
export type JobType = 
  | 'bill_extraction'
  | 'offer_send_email'
  | 'offer_send_fax'
  | 'counter_response'
  | 'settlement_process'
  | 'sftp_pickup';

// Job status
export type JobStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter';

export interface RetryJob {
  id: number;
  jobType: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  maxRetries: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateJobParams {
  jobType: JobType;
  payload: Record<string, any>;
  maxRetries?: number;
  clientId?: number;
  billId?: number;
}

/**
 * Retry Queue Service
 */
export class RetryQueueService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize database tables
   */
  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS retry_queue (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        next_retry_at TIMESTAMPTZ,
        client_id INTEGER,
        bill_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        
        CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON retry_queue(status);
      CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry ON retry_queue(next_retry_at) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_retry_queue_client ON retry_queue(client_id);
      CREATE INDEX IF NOT EXISTS idx_retry_queue_bill ON retry_queue(bill_id);
    `);

    // Dead letter queue view
    await this.pool.query(`
      CREATE OR REPLACE VIEW dead_letter_queue AS
      SELECT * FROM retry_queue WHERE status = 'dead_letter' ORDER BY created_at DESC;
    `);
  }

  /**
   * Add a job to the retry queue
   */
  async addJob(params: CreateJobParams): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO retry_queue (job_type, payload, max_retries, client_id, bill_id, next_retry_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [
      params.jobType,
      JSON.stringify(params.payload),
      params.maxRetries || MAX_RETRIES,
      params.clientId,
      params.billId
    ]);

    const jobId = result.rows[0].id;
    console.log(`[RETRY-QUEUE] Job ${jobId} added: ${params.jobType}`);
    return jobId;
  }

  /**
   * Get jobs ready for processing
   */
  async getReadyJobs(limit: number = 10): Promise<RetryJob[]> {
    const result = await this.pool.query(`
      SELECT * FROM retry_queue
      WHERE status = 'pending'
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `, [limit]);

    return result.rows.map(this.mapRow);
  }

  /**
   * Mark job as processing
   */
  async markProcessing(jobId: number): Promise<void> {
    await this.pool.query(`
      UPDATE retry_queue 
      SET status = 'processing', updated_at = NOW()
      WHERE id = $1
    `, [jobId]);
  }

  /**
   * Mark job as completed
   */
  async markCompleted(jobId: number): Promise<void> {
    await this.pool.query(`
      UPDATE retry_queue 
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [jobId]);
    console.log(`[RETRY-QUEUE] Job ${jobId} completed`);
  }

  /**
   * Mark job as failed with retry scheduling
   */
  async markFailed(jobId: number, error: string): Promise<void> {
    // Get current job state
    const result = await this.pool.query(`
      SELECT attempts, max_retries FROM retry_queue WHERE id = $1
    `, [jobId]);

    if (result.rows.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const { attempts, max_retries } = result.rows[0];
    const newAttempts = attempts + 1;

    if (newAttempts >= max_retries) {
      // Move to dead letter queue
      await this.pool.query(`
        UPDATE retry_queue 
        SET status = 'dead_letter', 
            attempts = $1, 
            last_error = $2, 
            updated_at = NOW()
        WHERE id = $3
      `, [newAttempts, error, jobId]);
      
      console.error(`[RETRY-QUEUE] Job ${jobId} moved to dead letter queue after ${newAttempts} attempts: ${error}`);
      
      // TODO: Send alert notification
      await this.sendDeadLetterAlert(jobId, error);
    } else {
      // Schedule retry with exponential backoff
      const delayMs = Math.min(
        BASE_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, newAttempts - 1),
        MAX_DELAY_MS
      );
      const nextRetryAt = new Date(Date.now() + delayMs);

      await this.pool.query(`
        UPDATE retry_queue 
        SET status = 'pending', 
            attempts = $1, 
            last_error = $2, 
            next_retry_at = $3, 
            updated_at = NOW()
        WHERE id = $4
      `, [newAttempts, error, nextRetryAt, jobId]);

      console.log(`[RETRY-QUEUE] Job ${jobId} failed (attempt ${newAttempts}/${max_retries}), retry at ${nextRetryAt.toISOString()}: ${error}`);
    }
  }

  /**
   * Get dead letter queue items
   */
  async getDeadLetterQueue(clientId?: number): Promise<RetryJob[]> {
    let query = `SELECT * FROM retry_queue WHERE status = 'dead_letter'`;
    const params: any[] = [];

    if (clientId) {
      query += ` AND client_id = $1`;
      params.push(clientId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapRow);
  }

  /**
   * Retry a dead letter queue item
   */
  async retryDeadLetter(jobId: number, additionalRetries: number = 3): Promise<void> {
    await this.pool.query(`
      UPDATE retry_queue 
      SET status = 'pending', 
          max_retries = max_retries + $1,
          next_retry_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND status = 'dead_letter'
    `, [additionalRetries, jobId]);

    console.log(`[RETRY-QUEUE] Dead letter job ${jobId} queued for retry with ${additionalRetries} additional attempts`);
  }

  /**
   * Delete a dead letter queue item (after manual resolution)
   */
  async resolveDeadLetter(jobId: number, resolution: string): Promise<void> {
    await this.pool.query(`
      UPDATE retry_queue 
      SET status = 'completed', 
          last_error = CONCAT(last_error, ' | RESOLVED: ', $1),
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND status = 'dead_letter'
    `, [resolution, jobId]);

    console.log(`[RETRY-QUEUE] Dead letter job ${jobId} resolved: ${resolution}`);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    deadLetter: number;
    byJobType: Record<string, number>;
  }> {
    const result = await this.pool.query(`
      SELECT 
        status,
        job_type,
        COUNT(*) as count
      FROM retry_queue
      GROUP BY status, job_type
    `);

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      deadLetter: 0,
      byJobType: {} as Record<string, number>
    };

    for (const row of result.rows) {
      const count = parseInt(row.count);
      
      switch (row.status) {
        case 'pending': stats.pending += count; break;
        case 'processing': stats.processing += count; break;
        case 'completed': stats.completed += count; break;
        case 'dead_letter': stats.deadLetter += count; break;
      }

      stats.byJobType[row.job_type] = (stats.byJobType[row.job_type] || 0) + count;
    }

    return stats;
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupCompleted(olderThanDays: number = 30): Promise<number> {
    const result = await this.pool.query(`
      DELETE FROM retry_queue 
      WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '1 day' * $1
    `, [olderThanDays]);

    const deleted = result.rowCount || 0;
    console.log(`[RETRY-QUEUE] Cleaned up ${deleted} completed jobs older than ${olderThanDays} days`);
    return deleted;
  }

  /**
   * Send alert for dead letter queue item
   */
  private async sendDeadLetterAlert(jobId: number, error: string): Promise<void> {
    // TODO: Integrate with alerting system (Slack, PagerDuty, email)
    console.error(`[ALERT] Dead letter queue item: Job ${jobId} - ${error}`);
    
    // For now, just log. In production, this would send to:
    // - Slack webhook
    // - PagerDuty incident
    // - Email to admin
  }

  /**
   * Map database row to RetryJob
   */
  private mapRow(row: any): RetryJob {
    return {
      id: row.id,
      jobType: row.job_type,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      maxRetries: row.max_retries,
      lastError: row.last_error,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
}

/**
 * Wrapper function to execute with retry queue
 */
export async function withRetry<T>(
  queue: RetryQueueService,
  jobType: JobType,
  payload: Record<string, any>,
  fn: () => Promise<T>,
  options?: { clientId?: number; billId?: number; maxRetries?: number }
): Promise<T> {
  const jobId = await queue.addJob({
    jobType,
    payload,
    ...options
  });

  try {
    await queue.markProcessing(jobId);
    const result = await fn();
    await queue.markCompleted(jobId);
    return result;
  } catch (error: any) {
    await queue.markFailed(jobId, error.message);
    throw error;
  }
}
