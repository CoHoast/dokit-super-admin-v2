import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/negotiations - List negotiations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const billId = searchParams.get('billId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      whereClause += ` AND n.client_id = $${paramIndex}`;
      params.push(parseInt(clientId));
      paramIndex++;
    }

    if (billId) {
      whereClause += ` AND n.bill_id = $${paramIndex}`;
      params.push(parseInt(billId));
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND n.response_type = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        n.*,
        b.member_name,
        b.provider_name,
        b.total_billed,
        b.account_number,
        b.date_of_service,
        c.name as client_name
      FROM negotiations n
      LEFT JOIN bills b ON n.bill_id = b.id
      LEFT JOIN clients c ON n.client_id = c.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    // Get counts by status
    const statsResult = await pool.query(`
      SELECT 
        response_type,
        COUNT(*) as count,
        SUM(savings_amount) as total_savings
      FROM negotiations n
      ${whereClause}
      GROUP BY response_type
    `, params);

    return NextResponse.json({
      negotiations: result.rows,
      stats: statsResult.rows,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Error fetching negotiations:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/db/bill-negotiator/negotiations - Create negotiation (send offer)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Support both naming conventions
    const billId = data.billId || data.bill_id;
    const initialOffer = data.initialOffer || data.offer_amount || data.initial_offer;
    let clientId = data.clientId || data.client_id;
    const strategy = data.strategy;
    const maxAcceptable = data.maxAcceptable || data.max_acceptable;
    const walkAwayMax = data.walkAwayMax || data.walk_away_max;
    const offerLetterUrl = data.offerLetterUrl || data.offer_letter_url;
    const offerSentVia = data.offerSentVia || data.offer_sent_via;
    const autoNegotiated = data.autoNegotiated || data.auto_negotiated;
    const round = data.round || 1;

    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }

    // If clientId not provided, fetch it from the bill
    if (!clientId) {
      const billResult = await pool.query('SELECT client_id FROM bills WHERE id = $1', [billId]);
      if (billResult.rows.length === 0) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }
      clientId = billResult.rows[0].client_id;
    }

    // Create the negotiation
    const result = await pool.query(`
      INSERT INTO negotiations (
        bill_id, client_id, strategy,
        initial_offer, current_offer, max_acceptable, walk_away_max,
        offer_letter_url, offer_sent_via, offer_sent_at,
        response_type, auto_negotiated, round
      ) VALUES (
        $1, $2, $3, $4, $4, $5, $6, $7, $8, NOW(), 'pending', $9, $10
      )
      RETURNING *
    `, [
      billId, clientId, strategy || 'cash_pay',
      initialOffer, maxAcceptable, walkAwayMax,
      offerLetterUrl, offerSentVia || 'fax',
      autoNegotiated || false, round
    ]);

    // Update bill status
    await pool.query(`
      UPDATE bills SET status = 'offer_sent', updated_at = NOW()
      WHERE id = $1
    `, [billId]);

    return NextResponse.json({ negotiation: result.rows[0] });

  } catch (error: any) {
    console.error('Error creating negotiation:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
