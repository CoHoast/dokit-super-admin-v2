import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/pipeline - Get pipeline status breakdown
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    let clientFilter = '';
    const params: any[] = [];
    
    if (clientId) {
      clientFilter = 'AND client_id = $1';
      params.push(parseInt(clientId));
    }

    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
        COUNT(CASE WHEN status IN ('analyzing', 'ready_to_negotiate') THEN 1 END) as processing,
        COUNT(CASE WHEN status IN ('offer_sent', 'awaiting_response', 'counter_received') THEN 1 END) as negotiating,
        COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled,
        COUNT(*) as total
      FROM bills
      WHERE 1=1 ${clientFilter}
    `, params);

    return NextResponse.json(result.rows[0] || {
      received: 0,
      processing: 0,
      negotiating: 0,
      settled: 0,
      total: 0
    });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}
