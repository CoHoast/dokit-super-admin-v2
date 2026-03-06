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
        b.date_of_service,
        c.name as client_name
      FROM negotiations n
      LEFT JOIN bills b ON n.bill_id = b.id
      LEFT JOIN clients c ON n.client_id = c.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM negotiations n ${whereClause}
    `, params);

    return NextResponse.json({
      negotiations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Error fetching negotiations:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/db/bill-negotiator/negotiations - Create negotiation / send offer
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      billId,
      clientId,
      strategy,
      initialOffer,
      maxAcceptable,
      walkAwayMax,
      sendVia = 'fax'
    } = data;

    if (!billId || !clientId || !initialOffer) {
      return NextResponse.json({ 
        error: 'billId, clientId, and initialOffer are required' 
      }, { status: 400 });
    }

    // Create negotiation record
    const result = await pool.query(`
      INSERT INTO negotiations (
        bill_id, client_id, strategy, initial_offer, max_acceptable, walk_away_max,
        offer_sent_via, response_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `, [billId, clientId, strategy, initialOffer, maxAcceptable, walkAwayMax, sendVia]);

    const negotiation = result.rows[0];

    // Update bill status to 'offer_sent'
    await pool.query(`
      UPDATE bills SET status = 'offer_sent', updated_at = NOW() WHERE id = $1
    `, [billId]);

    return NextResponse.json({ negotiation });

  } catch (error: any) {
    console.error('Error creating negotiation:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
