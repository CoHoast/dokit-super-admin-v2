// Phase 2E: Savings Report API

import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/reports/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'clientId is required'
      }, { status: 400 });
    }
    
    const report = await reportsService.generateSavingsReport(
      parseInt(clientId),
      startDate || undefined,
      endDate || undefined
    );
    
    return NextResponse.json({
      success: true,
      report
    });
    
  } catch (error: any) {
    console.error('Savings report error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
