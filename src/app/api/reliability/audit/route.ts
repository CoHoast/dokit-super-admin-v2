/**
 * Audit Log Query & Compliance Report API
 * 
 * Query audit logs and generate HIPAA compliance reports.
 * 
 * GET /api/reliability/audit - Query audit logs
 * GET /api/reliability/audit/report - Generate compliance report
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { AuditLogger } from '@/lib/reliability/audit-logger';

// Query audit logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Check if this is a report request
  if (searchParams.get('report') === 'true') {
    return generateComplianceReport(request);
  }

  const auditLogger = new AuditLogger(pool);

  try {
    const params: any = {
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    if (searchParams.get('startDate')) {
      params.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      params.endDate = new Date(searchParams.get('endDate')!);
    }
    if (searchParams.get('action')) {
      params.action = searchParams.get('action');
    }
    if (searchParams.get('resourceType')) {
      params.resourceType = searchParams.get('resourceType');
    }
    if (searchParams.get('resourceId')) {
      params.resourceId = searchParams.get('resourceId');
    }
    if (searchParams.get('clientId')) {
      params.clientId = parseInt(searchParams.get('clientId')!);
    }
    if (searchParams.get('userId')) {
      params.userId = searchParams.get('userId');
    }
    if (searchParams.get('phiOnly') === 'true') {
      params.phiOnly = true;
    }

    const result = await auditLogger.query(params);

    return NextResponse.json({
      entries: result.entries,
      total: result.total,
      limit: params.limit,
      offset: params.offset
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

// Generate compliance report
async function generateComplianceReport(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const auditLogger = new AuditLogger(pool);

  try {
    // Default to last 30 days if not specified
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!)
      : new Date();
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const clientId = searchParams.get('clientId')
      ? parseInt(searchParams.get('clientId')!)
      : undefined;

    const report = await auditLogger.generateComplianceReport({
      startDate,
      endDate,
      clientId
    });

    // Check retention status
    const retention = await auditLogger.checkRetention();

    return NextResponse.json({
      report,
      retention,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

// Export audit logs (for compliance)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { format, startDate, endDate, clientId } = body;

  const auditLogger = new AuditLogger(pool);

  try {
    const result = await auditLogger.query({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      clientId,
      limit: 10000 // Max export size
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID', 'Timestamp', 'Action', 'Resource Type', 'Resource ID',
        'User ID', 'User Email', 'IP Address', 'PHI Accessed',
        'PHI Fields', 'Success', 'Error'
      ];
      
      const rows = result.entries.map(e => [
        e.id,
        e.createdAt,
        e.action,
        e.resourceType,
        e.resourceId || '',
        e.userId || '',
        e.userEmail || '',
        e.ipAddress || '',
        e.phiAccessed ? 'Yes' : 'No',
        (e.phiFields || []).join('; '),
        e.success ? 'Yes' : 'No',
        e.errorMessage || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Default: JSON
    return NextResponse.json({
      entries: result.entries,
      total: result.total,
      exportedAt: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
