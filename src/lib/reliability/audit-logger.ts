/**
 * HIPAA-Compliant Audit Logger
 * 
 * Logs all PHI access and system events for compliance.
 * Retains logs for 6 years per HIPAA requirements.
 */

import { Pool } from 'pg';

// Audit action types
export type AuditAction =
  // PHI Access
  | 'phi_view'
  | 'phi_create'
  | 'phi_update'
  | 'phi_delete'
  | 'phi_export'
  | 'phi_decrypt'
  // Bill lifecycle
  | 'bill_received'
  | 'bill_extracted'
  | 'bill_offer_sent'
  | 'bill_counter_received'
  | 'bill_counter_sent'
  | 'bill_settled'
  | 'bill_paid'
  | 'bill_escalated'
  // System events
  | 'user_login'
  | 'user_logout'
  | 'user_mfa_setup'
  | 'user_password_change'
  | 'user_permission_change'
  // Data lifecycle
  | 'phi_purge'
  | 'phi_retention_check'
  | 'data_export'
  | 'data_import'
  // Errors
  | 'error_occurred'
  | 'security_violation';

// Resource types
export type ResourceType =
  | 'bill'
  | 'negotiation'
  | 'provider'
  | 'member'
  | 'user'
  | 'client'
  | 'system';

// Audit entry interface
export interface AuditEntry {
  id?: number;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string | number;
  clientId?: number;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  phiAccessed?: boolean;
  phiFields?: string[];
  details?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  sessionId?: string;
  requestId?: string;
  createdAt?: Date;
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private pool: Pool;
  private defaultContext: Partial<AuditEntry>;

  constructor(pool: Pool, defaultContext?: Partial<AuditEntry>) {
    this.pool = pool;
    this.defaultContext = defaultContext || {};
  }

  /**
   * Initialize audit log table
   */
  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(30) NOT NULL,
        resource_id VARCHAR(100),
        client_id INTEGER,
        user_id VARCHAR(100),
        user_email VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        phi_accessed BOOLEAN DEFAULT FALSE,
        phi_fields TEXT[],
        details JSONB,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        session_id VARCHAR(100),
        request_id VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_client ON audit_log(client_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_phi ON audit_log(phi_accessed) WHERE phi_accessed = TRUE;
      
      -- Partitioning by month for large-scale deployments (optional)
      -- Would need to be set up based on expected volume
    `);

    // Create retention policy view
    await this.pool.query(`
      CREATE OR REPLACE VIEW audit_log_retention AS
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as entry_count,
        COUNT(*) FILTER (WHERE phi_accessed) as phi_access_count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
      FROM audit_log
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC;
    `);
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditEntry): Promise<number> {
    const mergedEntry = { ...this.defaultContext, ...entry };

    const result = await this.pool.query(`
      INSERT INTO audit_log (
        action, resource_type, resource_id, client_id,
        user_id, user_email, ip_address, user_agent,
        phi_accessed, phi_fields, details,
        success, error_message, session_id, request_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING id
    `, [
      mergedEntry.action,
      mergedEntry.resourceType,
      mergedEntry.resourceId?.toString(),
      mergedEntry.clientId,
      mergedEntry.userId,
      mergedEntry.userEmail,
      mergedEntry.ipAddress,
      mergedEntry.userAgent,
      mergedEntry.phiAccessed || false,
      mergedEntry.phiFields || [],
      JSON.stringify(mergedEntry.details || {}),
      mergedEntry.success,
      mergedEntry.errorMessage,
      mergedEntry.sessionId,
      mergedEntry.requestId
    ]);

    return result.rows[0].id;
  }

  /**
   * Log PHI access
   */
  async logPHIAccess(params: {
    action: 'phi_view' | 'phi_create' | 'phi_update' | 'phi_delete' | 'phi_decrypt';
    resourceType: ResourceType;
    resourceId: string | number;
    phiFields: string[];
    userId: string;
    userEmail?: string;
    ipAddress?: string;
    clientId?: number;
  }): Promise<number> {
    return this.log({
      ...params,
      phiAccessed: true,
      success: true
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(params: {
    resourceType: ResourceType;
    resourceId?: string | number;
    userId?: string;
    ipAddress?: string;
    details: Record<string, any>;
  }): Promise<number> {
    console.error('[SECURITY VIOLATION]', params);
    
    return this.log({
      action: 'security_violation',
      ...params,
      success: false,
      errorMessage: 'Security violation detected'
    });
  }

  /**
   * Query audit logs
   */
  async query(params: {
    startDate?: Date;
    endDate?: Date;
    action?: AuditAction;
    resourceType?: ResourceType;
    resourceId?: string;
    clientId?: number;
    userId?: string;
    phiOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(params.endDate);
    }

    if (params.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(params.action);
    }

    if (params.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      values.push(params.resourceType);
    }

    if (params.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      values.push(params.resourceId);
    }

    if (params.clientId) {
      conditions.push(`client_id = $${paramIndex++}`);
      values.push(params.clientId);
    }

    if (params.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(params.userId);
    }

    if (params.phiOnly) {
      conditions.push(`phi_accessed = TRUE`);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM audit_log ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get entries
    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const entriesResult = await this.pool.query(
      `SELECT * FROM audit_log ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    );

    return {
      entries: entriesResult.rows.map(this.mapRow),
      total
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    startDate: Date;
    endDate: Date;
    clientId?: number;
  }): Promise<{
    period: { start: string; end: string };
    summary: {
      totalEvents: number;
      phiAccessEvents: number;
      securityViolations: number;
      uniqueUsers: number;
    };
    phiAccessByUser: Array<{ userId: string; userEmail: string; accessCount: number }>;
    phiAccessByResource: Array<{ resourceType: string; accessCount: number }>;
    actionBreakdown: Array<{ action: string; count: number }>;
    securityIncidents: AuditEntry[];
  }> {
    const clientFilter = params.clientId ? `AND client_id = ${params.clientId}` : '';

    // Summary stats
    const summaryResult = await this.pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE phi_accessed) as phi_events,
        COUNT(*) FILTER (WHERE action = 'security_violation') as security_violations,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_log
      WHERE created_at BETWEEN $1 AND $2 ${clientFilter}
    `, [params.startDate, params.endDate]);

    // PHI access by user
    const phiByUserResult = await this.pool.query(`
      SELECT user_id, user_email, COUNT(*) as access_count
      FROM audit_log
      WHERE phi_accessed = TRUE
        AND created_at BETWEEN $1 AND $2 ${clientFilter}
      GROUP BY user_id, user_email
      ORDER BY access_count DESC
      LIMIT 50
    `, [params.startDate, params.endDate]);

    // PHI access by resource
    const phiByResourceResult = await this.pool.query(`
      SELECT resource_type, COUNT(*) as access_count
      FROM audit_log
      WHERE phi_accessed = TRUE
        AND created_at BETWEEN $1 AND $2 ${clientFilter}
      GROUP BY resource_type
      ORDER BY access_count DESC
    `, [params.startDate, params.endDate]);

    // Action breakdown
    const actionsResult = await this.pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_log
      WHERE created_at BETWEEN $1 AND $2 ${clientFilter}
      GROUP BY action
      ORDER BY count DESC
    `, [params.startDate, params.endDate]);

    // Security incidents
    const incidentsResult = await this.pool.query(`
      SELECT * FROM audit_log
      WHERE action = 'security_violation'
        AND created_at BETWEEN $1 AND $2 ${clientFilter}
      ORDER BY created_at DESC
      LIMIT 100
    `, [params.startDate, params.endDate]);

    return {
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString()
      },
      summary: {
        totalEvents: parseInt(summaryResult.rows[0].total_events),
        phiAccessEvents: parseInt(summaryResult.rows[0].phi_events),
        securityViolations: parseInt(summaryResult.rows[0].security_violations),
        uniqueUsers: parseInt(summaryResult.rows[0].unique_users)
      },
      phiAccessByUser: phiByUserResult.rows.map(r => ({
        userId: r.user_id,
        userEmail: r.user_email,
        accessCount: parseInt(r.access_count)
      })),
      phiAccessByResource: phiByResourceResult.rows.map(r => ({
        resourceType: r.resource_type,
        accessCount: parseInt(r.access_count)
      })),
      actionBreakdown: actionsResult.rows.map(r => ({
        action: r.action,
        count: parseInt(r.count)
      })),
      securityIncidents: incidentsResult.rows.map(this.mapRow)
    };
  }

  /**
   * Check retention and alert on data approaching retention limit
   */
  async checkRetention(): Promise<{
    oldestEntry: Date | null;
    entriesApproachingRetention: number;
    retentionLimitYears: number;
  }> {
    const RETENTION_YEARS = 6;
    const WARNING_MONTHS = 3;

    const result = await this.pool.query(`
      SELECT 
        MIN(created_at) as oldest_entry,
        COUNT(*) FILTER (
          WHERE created_at < NOW() - INTERVAL '${RETENTION_YEARS} years' + INTERVAL '${WARNING_MONTHS} months'
        ) as approaching_retention
      FROM audit_log
    `);

    return {
      oldestEntry: result.rows[0].oldest_entry,
      entriesApproachingRetention: parseInt(result.rows[0].approaching_retention || '0'),
      retentionLimitYears: RETENTION_YEARS
    };
  }

  /**
   * Map database row to AuditEntry
   */
  private mapRow(row: any): AuditEntry {
    return {
      id: row.id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      clientId: row.client_id,
      userId: row.user_id,
      userEmail: row.user_email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      phiAccessed: row.phi_accessed,
      phiFields: row.phi_fields,
      details: row.details,
      success: row.success,
      errorMessage: row.error_message,
      sessionId: row.session_id,
      requestId: row.request_id,
      createdAt: row.created_at
    };
  }
}

/**
 * Create a request-scoped audit logger
 */
export function createRequestLogger(
  pool: Pool,
  request: {
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    clientId?: number;
  }
): AuditLogger {
  return new AuditLogger(pool, {
    userId: request.userId,
    userEmail: request.userEmail,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    sessionId: request.sessionId,
    requestId: request.requestId,
    clientId: request.clientId
  });
}
