/**
 * Reliability Status Dashboard API
 * 
 * Provides real-time status of all reliability components.
 * 
 * GET /api/reliability/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RetryQueueService } from '@/lib/reliability/retry-queue';

export async function GET(request: NextRequest) {
  const status: any = {
    timestamp: new Date().toISOString(),
    healthy: true,
    components: {}
  };

  // 1. Database health
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    status.components.database = {
      healthy: true,
      latencyMs: Date.now() - start
    };
  } catch (error: any) {
    status.healthy = false;
    status.components.database = {
      healthy: false,
      error: error.message
    };
  }

  // 2. Retry queue stats
  try {
    const retryQueue = new RetryQueueService(pool);
    const stats = await retryQueue.getStats();
    status.components.retryQueue = {
      healthy: stats.deadLetter < 10, // Alert if >10 dead letters
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      deadLetter: stats.deadLetter,
      byJobType: stats.byJobType
    };
    if (stats.deadLetter >= 10) {
      status.healthy = false;
    }
  } catch (error: any) {
    status.components.retryQueue = {
      healthy: false,
      error: error.message
    };
  }

  // 3. Recent processing stats (last 24 hours)
  try {
    const processingResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'offer_sent') as offers_sent,
        COUNT(*) FILTER (WHERE status = 'settled') as settled,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated,
        COUNT(*) as total
      FROM bills
      WHERE updated_at > NOW() - INTERVAL '24 hours'
    `);
    status.components.billProcessing = {
      last24Hours: processingResult.rows[0]
    };
  } catch (error: any) {
    status.components.billProcessing = { error: error.message };
  }

  // 4. SFTP pickup status (last 7 days)
  try {
    const sftpResult = await pool.query(`
      SELECT 
        pickup_date,
        status,
        files_processed,
        files_errored
      FROM sftp_pickups
      WHERE pickup_date > CURRENT_DATE - INTERVAL '7 days'
      ORDER BY pickup_date DESC
      LIMIT 7
    `);
    status.components.sftpPickups = {
      recentPickups: sftpResult.rows,
      lastPickup: sftpResult.rows[0] || null
    };
  } catch (error: any) {
    status.components.sftpPickups = { error: error.message };
  }

  // 5. Audit log stats
  try {
    const auditResult = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE phi_accessed) as phi_accesses,
        COUNT(*) FILTER (WHERE action = 'security_violation') as security_violations
      FROM audit_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    status.components.audit = {
      last24Hours: auditResult.rows[0]
    };
  } catch (error: any) {
    status.components.audit = { error: error.message };
  }

  // 6. Encryption status
  try {
    const encryptionResult = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        COUNT(*) FILTER (WHERE phi_encrypted = true) as encrypted_bills
      FROM bills
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    const row = encryptionResult.rows[0];
    const encryptionRate = row.total_bills > 0 
      ? (row.encrypted_bills / row.total_bills * 100).toFixed(1)
      : 100;
    status.components.encryption = {
      totalRecentBills: parseInt(row.total_bills),
      encryptedBills: parseInt(row.encrypted_bills),
      encryptionRate: `${encryptionRate}%`
    };
  } catch (error: any) {
    status.components.encryption = { error: error.message };
  }

  return NextResponse.json(status);
}
