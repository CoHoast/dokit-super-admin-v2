// Phase 2E: Reports & Analytics Service

import { pool } from '../db';
import { SavingsReport, AuditLogEntry, ExportOptions, OnboardingProgress, ONBOARDING_STEPS } from './types';

export class ReportsService {
  
  // Generate savings report for a client
  async generateSavingsReport(
    clientId: number,
    startDate?: string,
    endDate?: string
  ): Promise<SavingsReport> {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();
    
    // Summary stats
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(total_billed), 0) as total_billed,
        COALESCE(SUM(CASE WHEN status = 'settled' OR status = 'paid' THEN settled_amount ELSE 0 END), 0) as total_settled,
        COALESCE(SUM(CASE WHEN status = 'settled' OR status = 'paid' THEN total_billed - settled_amount ELSE 0 END), 0) as total_savings,
        COUNT(CASE WHEN status = 'settled' OR status = 'paid' THEN 1 END) as settled_count
      FROM bills 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
    `, [clientId, start, end]);
    
    const summary = summaryResult.rows[0];
    const totalBilled = parseFloat(summary.total_billed) || 0;
    const totalSettled = parseFloat(summary.total_settled) || 0;
    const totalSavings = parseFloat(summary.total_savings) || 0;
    
    // Auto-negotiated stats
    const autoResult = await pool.query(`
      SELECT COUNT(DISTINCT b.id) as auto_count
      FROM bills b
      JOIN negotiations n ON b.id = n.bill_id
      WHERE b.client_id = $1 
        AND b.created_at >= $2 
        AND b.created_at <= $3
        AND n.auto_negotiated = true
    `, [clientId, start, end]);
    
    const autoCount = parseInt(autoResult.rows[0]?.auto_count) || 0;
    
    // By status
    const statusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_billed), 0) as total_billed
      FROM bills 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY status
      ORDER BY count DESC
    `, [clientId, start, end]);
    
    // By provider
    const providerResult = await pool.query(`
      SELECT 
        provider_name,
        provider_npi,
        COUNT(*) as bill_count,
        COALESCE(SUM(total_billed), 0) as total_billed,
        COALESCE(SUM(CASE WHEN status IN ('settled', 'paid') THEN settled_amount ELSE 0 END), 0) as total_settled,
        COALESCE(SUM(CASE WHEN status IN ('settled', 'paid') THEN total_billed - settled_amount ELSE 0 END), 0) as savings
      FROM bills 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY provider_name, provider_npi
      ORDER BY bill_count DESC
      LIMIT 10
    `, [clientId, start, end]);
    
    // By month
    const monthResult = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as bills,
        COALESCE(SUM(total_billed), 0) as billed,
        COALESCE(SUM(CASE WHEN status IN ('settled', 'paid') THEN settled_amount ELSE 0 END), 0) as settled,
        COALESCE(SUM(CASE WHEN status IN ('settled', 'paid') THEN total_billed - settled_amount ELSE 0 END), 0) as savings
      FROM bills 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [clientId, start, end]);
    
    // Top savings
    const topResult = await pool.query(`
      SELECT 
        id as bill_id,
        provider_name,
        member_name,
        total_billed as billed,
        settled_amount as settled,
        total_billed - settled_amount as savings,
        ROUND(((total_billed - settled_amount) / total_billed * 100)::numeric, 1) as savings_percent
      FROM bills 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
        AND status IN ('settled', 'paid')
        AND settled_amount IS NOT NULL
      ORDER BY (total_billed - settled_amount) DESC
      LIMIT 5
    `, [clientId, start, end]);
    
    return {
      period: { start, end },
      summary: {
        total_bills: parseInt(summary.total_bills) || 0,
        total_billed: totalBilled,
        total_settled: totalSettled,
        total_savings: totalSavings,
        savings_percent: totalBilled > 0 ? (totalSavings / totalBilled) * 100 : 0,
        avg_settlement_percent: totalBilled > 0 ? (totalSettled / totalBilled) * 100 : 0,
        auto_negotiated_count: autoCount,
        auto_negotiated_percent: parseInt(summary.total_bills) > 0 ? (autoCount / parseInt(summary.total_bills)) * 100 : 0
      },
      by_status: statusResult.rows.map(r => ({
        status: r.status,
        count: parseInt(r.count),
        total_billed: parseFloat(r.total_billed)
      })),
      by_provider: providerResult.rows.map(r => ({
        provider_name: r.provider_name,
        provider_npi: r.provider_npi,
        bill_count: parseInt(r.bill_count),
        total_billed: parseFloat(r.total_billed),
        total_settled: parseFloat(r.total_settled),
        savings: parseFloat(r.savings),
        avg_settlement_percent: parseFloat(r.total_billed) > 0 ? 
          (parseFloat(r.total_settled) / parseFloat(r.total_billed)) * 100 : 0
      })),
      by_month: monthResult.rows.map(r => ({
        month: r.month,
        bills: parseInt(r.bills),
        billed: parseFloat(r.billed),
        settled: parseFloat(r.settled),
        savings: parseFloat(r.savings)
      })),
      top_savings: topResult.rows.map(r => ({
        bill_id: r.bill_id,
        provider_name: r.provider_name,
        member_name: r.member_name,
        billed: parseFloat(r.billed),
        settled: parseFloat(r.settled),
        savings: parseFloat(r.savings),
        savings_percent: parseFloat(r.savings_percent)
      }))
    };
  }
  
  // Log an audit event
  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    await pool.query(`
      INSERT INTO audit_log (
        event_type, entity_type, entity_id, client_id,
        user_id, user_name, action, details, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      entry.event_type,
      entry.entity_type,
      entry.entity_id,
      entry.client_id,
      entry.user_id || null,
      entry.user_name || null,
      entry.action,
      JSON.stringify(entry.details),
      entry.ip_address || null
    ]);
  }
  
  // Get audit log
  async getAuditLog(
    clientId: number,
    options?: {
      entity_type?: string;
      entity_id?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    let query = `
      SELECT * FROM audit_log 
      WHERE client_id = $1
    `;
    const params: any[] = [clientId];
    let paramIndex = 2;
    
    if (options?.entity_type) {
      query += ` AND entity_type = $${paramIndex++}`;
      params.push(options.entity_type);
    }
    
    if (options?.entity_id) {
      query += ` AND entity_id = $${paramIndex++}`;
      params.push(options.entity_id);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM audit_log WHERE client_id = $1`;
    const countParams: any[] = [clientId];
    
    if (options?.entity_type) {
      countQuery += ` AND entity_type = $2`;
      countParams.push(options.entity_type);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      entries: result.rows.map(r => ({
        id: r.id,
        timestamp: r.created_at,
        event_type: r.event_type,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        client_id: r.client_id,
        user_id: r.user_id,
        user_name: r.user_name,
        action: r.action,
        details: r.details,
        ip_address: r.ip_address
      })),
      total: parseInt(countResult.rows[0].total)
    };
  }
  
  // Export bills to CSV
  async exportToCSV(clientId: number, options: ExportOptions): Promise<string> {
    let query = `
      SELECT 
        b.id,
        b.member_name,
        b.member_id,
        b.provider_name,
        b.provider_npi,
        b.account_number,
        b.date_of_service,
        b.total_billed,
        b.fair_price,
        b.settled_amount,
        b.status,
        b.created_at,
        b.updated_at
      FROM bills b
      WHERE b.client_id = $1
    `;
    const params: any[] = [clientId];
    let paramIndex = 2;
    
    if (options.date_range?.start) {
      query += ` AND b.created_at >= $${paramIndex++}`;
      params.push(options.date_range.start);
    }
    
    if (options.date_range?.end) {
      query += ` AND b.created_at <= $${paramIndex++}`;
      params.push(options.date_range.end);
    }
    
    if (options.status_filter?.length) {
      query += ` AND b.status = ANY($${paramIndex++})`;
      params.push(options.status_filter);
    }
    
    query += ` ORDER BY b.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Build CSV
    const headers = [
      'Bill ID', 'Member Name', 'Member ID', 'Provider', 'NPI', 
      'Account #', 'DOS', 'Billed', 'Fair Price', 'Settled', 'Status',
      'Created', 'Updated'
    ];
    
    let csv = headers.join(',') + '\n';
    
    for (const row of result.rows) {
      const line = [
        row.id,
        `"${row.member_name || ''}"`,
        row.member_id || '',
        `"${row.provider_name || ''}"`,
        row.provider_npi || '',
        row.account_number || '',
        row.date_of_service || '',
        row.total_billed || '',
        row.fair_price || '',
        row.settled_amount || '',
        row.status,
        row.created_at,
        row.updated_at
      ].join(',');
      csv += line + '\n';
    }
    
    return csv;
  }
  
  // Get onboarding progress
  async getOnboardingProgress(clientId: number): Promise<OnboardingProgress> {
    const result = await pool.query(`
      SELECT * FROM onboarding_progress WHERE client_id = $1
    `, [clientId]);
    
    if (result.rows.length === 0) {
      // Create new progress record
      await pool.query(`
        INSERT INTO onboarding_progress (client_id, completed_steps, current_step, started_at)
        VALUES ($1, '[]', 'welcome', NOW())
      `, [clientId]);
      
      return {
        client_id: clientId,
        completed_steps: [],
        current_step: 'welcome',
        started_at: new Date().toISOString(),
        is_complete: false
      };
    }
    
    const row = result.rows[0];
    const completedSteps = row.completed_steps || [];
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required).map(s => s.id);
    const isComplete = requiredSteps.every(s => completedSteps.includes(s));
    
    return {
      client_id: row.client_id,
      completed_steps: completedSteps,
      current_step: row.current_step,
      started_at: row.started_at,
      completed_at: row.completed_at,
      is_complete: isComplete
    };
  }
  
  // Complete an onboarding step
  async completeOnboardingStep(clientId: number, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(clientId);
    
    if (!progress.completed_steps.includes(stepId)) {
      progress.completed_steps.push(stepId);
    }
    
    // Find next step
    const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
    const nextStep = ONBOARDING_STEPS[currentIndex + 1];
    
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required).map(s => s.id);
    const isComplete = requiredSteps.every(s => progress.completed_steps.includes(s));
    
    await pool.query(`
      UPDATE onboarding_progress 
      SET completed_steps = $1, 
          current_step = $2,
          completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END
      WHERE client_id = $4
    `, [
      JSON.stringify(progress.completed_steps),
      nextStep?.id || stepId,
      isComplete,
      clientId
    ]);
    
    return {
      ...progress,
      current_step: nextStep?.id || stepId,
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : undefined
    };
  }
}

// Singleton
export const reportsService = new ReportsService();
