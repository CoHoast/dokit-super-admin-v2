import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/analytics - Dashboard stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const period = searchParams.get('period') || 'month'; // day, week, month, year, all

    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    // Build date filter
    switch (period) {
      case 'day':
        dateFilter = `AND b.received_at >= NOW() - INTERVAL '1 day'`;
        break;
      case 'week':
        dateFilter = `AND b.received_at >= NOW() - INTERVAL '7 days'`;
        break;
      case 'month':
        dateFilter = `AND b.received_at >= NOW() - INTERVAL '30 days'`;
        break;
      case 'year':
        dateFilter = `AND b.received_at >= NOW() - INTERVAL '1 year'`;
        break;
      default:
        dateFilter = '';
    }

    let clientFilter = '';
    if (clientId) {
      clientFilter = `AND b.client_id = $${paramIndex}`;
      params.push(parseInt(clientId));
      paramIndex++;
    }

    // Overall stats
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_bills,
        COUNT(CASE WHEN status = 'offer_sent' OR status = 'awaiting_response' THEN 1 END) as pending_bills,
        COUNT(CASE WHEN status = 'received' OR status = 'analyzing' THEN 1 END) as new_bills,
        COALESCE(SUM(total_billed), 0) as total_billed,
        COALESCE(SUM(fair_price), 0) as total_fair_price
      FROM bills b
      WHERE 1=1 ${clientFilter} ${dateFilter}
    `, params);

    // Negotiation stats
    const negotiationStats = await pool.query(`
      SELECT 
        COUNT(*) as total_negotiations,
        COUNT(CASE WHEN response_type = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN response_type = 'countered' THEN 1 END) as countered,
        COUNT(CASE WHEN response_type = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN response_type = 'pending' THEN 1 END) as pending,
        COALESCE(SUM(savings_amount), 0) as total_savings,
        COALESCE(AVG(savings_percent), 0) as avg_savings_percent,
        COALESCE(AVG(EXTRACT(EPOCH FROM (settled_at - offer_sent_at)) / 86400), 0) as avg_days_to_settle
      FROM negotiations n
      JOIN bills b ON n.bill_id = b.id
      WHERE 1=1 ${clientFilter.replace('b.client_id', 'n.client_id')} 
        ${dateFilter.replace('b.received_at', 'n.created_at')}
    `, params);

    // Status breakdown
    const statusBreakdown = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_billed), 0) as total_billed
      FROM bills b
      WHERE 1=1 ${clientFilter} ${dateFilter}
      GROUP BY status
      ORDER BY count DESC
    `, params);

    // Top providers by volume
    const topProviders = await pool.query(`
      SELECT 
        provider_name,
        provider_npi,
        COUNT(*) as bill_count,
        COALESCE(SUM(total_billed), 0) as total_billed,
        COALESCE(AVG(
          CASE WHEN n.savings_percent IS NOT NULL THEN n.savings_percent END
        ), 0) as avg_savings_percent
      FROM bills b
      LEFT JOIN negotiations n ON n.bill_id = b.id
      WHERE provider_name IS NOT NULL ${clientFilter} ${dateFilter}
      GROUP BY provider_name, provider_npi
      ORDER BY bill_count DESC
      LIMIT 10
    `, params);

    // Daily trend (last 30 days)
    const dailyTrend = await pool.query(`
      SELECT 
        DATE(received_at) as date,
        COUNT(*) as bills_received,
        COUNT(CASE WHEN status = 'settled' THEN 1 END) as bills_settled,
        COALESCE(SUM(total_billed), 0) as total_billed
      FROM bills b
      WHERE received_at >= NOW() - INTERVAL '30 days'
        ${clientFilter}
      GROUP BY DATE(received_at)
      ORDER BY date DESC
    `, params);

    // Automation rate
    const automationStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN auto_negotiated = true THEN 1 END) as auto_negotiated,
        COUNT(CASE WHEN human_reviewed = true THEN 1 END) as human_reviewed
      FROM negotiations n
      JOIN bills b ON n.bill_id = b.id
      WHERE 1=1 ${clientFilter.replace('b.client_id', 'n.client_id')} 
        ${dateFilter.replace('b.received_at', 'n.created_at')}
    `, params);

    const overall = overallStats.rows[0];
    const negotiation = negotiationStats.rows[0];
    const automation = automationStats.rows[0];

    return NextResponse.json({
      overview: {
        totalBills: parseInt(overall.total_bills),
        settledBills: parseInt(overall.settled_bills),
        pendingBills: parseInt(overall.pending_bills),
        newBills: parseInt(overall.new_bills),
        totalBilled: parseFloat(overall.total_billed),
        totalFairPrice: parseFloat(overall.total_fair_price),
        totalSavings: parseFloat(negotiation.total_savings),
        avgSavingsPercent: parseFloat(negotiation.avg_savings_percent).toFixed(1),
        avgDaysToSettle: parseFloat(negotiation.avg_days_to_settle).toFixed(1)
      },
      negotiations: {
        total: parseInt(negotiation.total_negotiations),
        accepted: parseInt(negotiation.accepted),
        countered: parseInt(negotiation.countered),
        rejected: parseInt(negotiation.rejected),
        pending: parseInt(negotiation.pending),
        acceptanceRate: negotiation.total_negotiations > 0 
          ? ((negotiation.accepted / negotiation.total_negotiations) * 100).toFixed(1)
          : '0'
      },
      automation: {
        total: parseInt(automation.total),
        autoNegotiated: parseInt(automation.auto_negotiated),
        humanReviewed: parseInt(automation.human_reviewed),
        automationRate: automation.total > 0
          ? ((automation.auto_negotiated / automation.total) * 100).toFixed(1)
          : '0'
      },
      statusBreakdown: statusBreakdown.rows,
      topProviders: topProviders.rows,
      dailyTrend: dailyTrend.rows,
      period
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
