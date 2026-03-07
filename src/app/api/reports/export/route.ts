// Phase 2E: Export API

import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/reports/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, format, dateRange, statusFilter } = body;
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'clientId is required'
      }, { status: 400 });
    }
    
    const csv = await reportsService.exportToCSV(parseInt(clientId), {
      format: format || 'csv',
      include_line_items: body.includeLineItems || false,
      include_negotiations: body.includeNegotiations || false,
      include_communications: body.includeCommunications || false,
      date_range: dateRange,
      status_filter: statusFilter
    });
    
    // Return CSV as download
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bills-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
