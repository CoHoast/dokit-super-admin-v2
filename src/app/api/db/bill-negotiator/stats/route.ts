import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/stats - Get Bill Negotiator statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const period = searchParams.get('period') || 'month'; // day, week, month, year, all

    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "AND b.received_at >= NOW() - INTERVAL '1 day'";
        break;
      case 'week':
        dateFilter = "AND b.received_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND b.received_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND b.received_at >= NOW() - INTERVAL '365 days'";
        break;
      default:
        dateFilter = '';
    }

    const clientFilter = clientId ? `AND b.client_id = ${parseInt(clientId)}` : '';

    // Bill counts by status
    const statusResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_billed) as total_billed,
        SUM(fair_price) as total_fair_price
      FROM bills b
      WHERE 1=1 ${clientFilter} ${dateFilter}
      GROUP BY status
    `);

    // Negotiation stats
    const negotiationResult = await pool.query(`
      SELECT 
        COUNT(*) as total_negotiations,
        COUNT(CASE WHEN response_type = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN response_type = 'countered' THEN 1 END) as countered,
        COUNT(CASE WHEN response_type = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN response_type = 'pending' THEN 1 END) as pending,
        SUM(CASE WHEN settled_at IS NOT NULL THEN savings_amount ELSE 0 END) as total_savings,
        AVG(CASE WHEN settled_at IS NOT NULL THEN savings_percent ELSE NULL END) as avg_savings_percent,
        AVG(CASE WHEN settled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (settled_at - created_at))/86400 ELSE NULL END) as avg_days_to_settle
      FROM negotiations n
      LEFT JOIN bills b ON n.bill_id = b.id
      WHERE 1=1 ${clientFilter} ${dateFilter.replace('b.received_at', 'n.created_at')}
    `);

    // Top providers by volume
    const providersResult = await pool.query(`
      SELECT 
        provider_name,
        provider_npi,
        COUNT(*) as bill_count,
        SUM(total_billed) as total_billed,
        AVG(
          CASE WHEN n.settled_at IS NOT NULL THEN n.savings_percent ELSE NULL END
        ) as avg_savings_percent
      FROM bills b
      LEFT JOIN negotiations n ON n.bill_id = b.id
      WHERE provider_name IS NOT NULL ${clientFilter} ${dateFilter}
      GROUP BY provider_name, provider_npi
      ORDER BY bill_count DESC
      LIMIT 10
    `);

    // Daily volume for chart (last 30 days)
    const dailyResult = await pool.query(`
      SELECT 
        DATE(received_at) as date,
        COUNT(*) as bills_received,
        COUNT(CASE WHEN status = 'settled' THEN 1 END) as bills_settled,
        SUM(CASE WHEN status = 'settled' THEN total_billed - (
          SELECT final_amount FROM negotiations WHERE bill_id = b.id LIMIT 1
        ) ELSE 0 END) as daily_savings
      FROM bills b
      WHERE received_at >= NOW() - INTERVAL '30 days' ${clientFilter}
      GROUP BY DATE(received_at)
      ORDER BY date DESC
    `);

    // Summary stats
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        SUM(total_billed) as total_billed_amount,
        SUM(CASE WHEN status = 'settled' THEN total_billed ELSE 0 END) as settled_billed_amount,
        (
          SELECT SUM(final_amount) FROM negotiations 
          WHERE settled_at IS NOT NULL 
          ${clientFilter ? `AND client_id = ${parseInt(clientId!)}` : ''}
        ) as total_paid,
        (
          SELECT SUM(savings_amount) FROM negotiations 
          WHERE settled_at IS NOT NULL
          ${clientFilter ? `AND client_id = ${parseInt(clientId!)}` : ''}
        ) as total_savings
      FROM bills b
      WHERE 1=1 ${clientFilter} ${dateFilter}
    `);

    const statusCounts: Record<string, number> = {};
    statusResult.rows.forEach(row => {
      statusCounts[row.status] = parseInt(row.count);
    });

    const negotiationStats = negotiationResult.rows[0];
    const summary = summaryResult.rows[0];

    return NextResponse.json({
      summary: {
        totalBills: parseInt(summary.total_bills) || 0,
        totalBilledAmount: parseFloat(summary.total_billed_amount) || 0,
        totalPaid: parseFloat(summary.total_paid) || 0,
        totalSavings: parseFloat(summary.total_savings) || 0,
        savingsPercent: summary.total_billed_amount > 0 
          ? ((summary.total_billed_amount - summary.total_paid) / summary.total_billed_amount * 100).toFixed(1)
          : 0
      },
      billsByStatus: statusCounts,
      negotiations: {
        total: parseInt(negotiationStats.total_negotiations) || 0,
        accepted: parseInt(negotiationStats.accepted) || 0,
        countered: parseInt(negotiationStats.countered) || 0,
        rejected: parseInt(negotiationStats.rejected) || 0,
        pending: parseInt(negotiationStats.pending) || 0,
        avgSavingsPercent: parseFloat(negotiationStats.avg_savings_percent)?.toFixed(1) || 0,
        avgDaysToSettle: parseFloat(negotiationStats.avg_days_to_settle)?.toFixed(1) || 0
      },
      topProviders: providersResult.rows,
      dailyVolume: dailyResult.rows,
      period
    });

  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
