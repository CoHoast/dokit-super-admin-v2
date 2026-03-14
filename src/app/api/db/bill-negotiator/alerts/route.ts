import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/alerts - Get recent alerts/notifications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let clientFilter = '';
    const params: any[] = [];
    
    if (clientId) {
      clientFilter = 'AND b.client_id = $1';
      params.push(parseInt(clientId));
    }

    // Get counter-offers received (warning)
    const counters = await pool.query(`
      SELECT 
        b.id as bill_id,
        'warning' as type,
        'Counter Received' as title,
        'BILL-' || b.id || ' — Provider countered at $' || n.counter_amount || ' (target: $' || b.fair_price || ')' as message,
        n.updated_at as created_at
      FROM bills b
      JOIN negotiations n ON n.bill_id = b.id
      WHERE n.response_type = 'countered' 
        AND n.updated_at > NOW() - INTERVAL '7 days'
        ${clientFilter}
      ORDER BY n.updated_at DESC
      LIMIT 5
    `, params);

    // Get recent settlements (success)
    const settlements = await pool.query(`
      SELECT 
        b.id as bill_id,
        'success' as type,
        'Settlement Received' as title,
        'BILL-' || b.id || ' settled at $' || n.final_amount || ' — $' || n.savings_amount || ' saved (' || ROUND(n.savings_percent::numeric, 1) || '%)' as message,
        n.updated_at as created_at
      FROM bills b
      JOIN negotiations n ON n.bill_id = b.id
      WHERE n.response_type = 'accepted' 
        AND n.updated_at > NOW() - INTERVAL '7 days'
        ${clientFilter}
      ORDER BY n.updated_at DESC
      LIMIT 5
    `, params);

    // Get overdue responses (error)
    const overdue = await pool.query(`
      SELECT 
        b.id as bill_id,
        'error' as type,
        'Response Overdue' as title,
        'BILL-' || b.id || ' — No provider response in ' || EXTRACT(DAY FROM NOW() - n.sent_at)::int || ' days' as message,
        n.sent_at as created_at
      FROM bills b
      JOIN negotiations n ON n.bill_id = b.id
      WHERE n.response_type = 'pending' 
        AND n.sent_at < NOW() - INTERVAL '3 days'
        ${clientFilter}
      ORDER BY n.sent_at ASC
      LIMIT 5
    `, params);

    // Get high-value bills needing review (info)
    const highValue = await pool.query(`
      SELECT 
        b.id as bill_id,
        'info' as type,
        'High-Value Bill' as title,
        'BILL-' || b.id || ' ($' || b.total_billed || ') requires manual review' as message,
        b.received_at as created_at
      FROM bills b
      WHERE b.total_billed > 10000 
        AND b.status IN ('received', 'analyzing', 'ready_to_negotiate')
        ${clientFilter}
      ORDER BY b.total_billed DESC
      LIMIT 5
    `, params);

    // Combine and sort all alerts
    const allAlerts = [
      ...counters.rows,
      ...settlements.rows,
      ...overdue.rows,
      ...highValue.rows
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map((alert, idx) => ({
        id: `alert-${idx}-${alert.bill_id}`,
        ...alert,
        billId: alert.bill_id,
        createdAt: alert.created_at
      }));

    return NextResponse.json(allAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
