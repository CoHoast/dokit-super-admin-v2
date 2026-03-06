import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/negotiations/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(`
      SELECT 
        n.*,
        b.member_name, b.member_id, b.provider_name, b.provider_npi,
        b.total_billed, b.fair_price, b.date_of_service, b.document_url,
        c.name as client_name
      FROM negotiations n
      LEFT JOIN bills b ON n.bill_id = b.id
      LEFT JOIN clients c ON n.client_id = c.id
      WHERE n.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    // Get communications for this negotiation
    const commsResult = await pool.query(`
      SELECT * FROM negotiation_communications 
      WHERE negotiation_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    return NextResponse.json({
      negotiation: result.rows[0],
      communications: commsResult.rows
    });

  } catch (error: any) {
    console.error('Error fetching negotiation:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// PATCH /api/db/bill-negotiator/negotiations/[id] - Update negotiation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const allowedFields = [
      'offer_sent_at', 'response_type', 'response_received_at',
      'counter_amount', 'counter_notes', 'final_amount', 'savings_amount',
      'savings_percent', 'settled_at', 'payment_method', 'payment_date',
      'payment_reference', 'follow_up_count', 'last_follow_up_at',
      'escalated', 'escalation_reason', 'human_reviewed', 'reviewed_by', 'review_notes'
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(`
      UPDATE negotiations 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    const negotiation = result.rows[0];

    // Update bill status based on negotiation status
    if (updates.responseType === 'accepted' || updates.settledAt) {
      await pool.query(`
        UPDATE bills SET status = 'settled', updated_at = NOW() WHERE id = $1
      `, [negotiation.bill_id]);
    } else if (updates.responseType === 'countered') {
      await pool.query(`
        UPDATE bills SET status = 'counter_received', updated_at = NOW() WHERE id = $1
      `, [negotiation.bill_id]);
    }

    return NextResponse.json({ negotiation });

  } catch (error: any) {
    console.error('Error updating negotiation:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/db/bill-negotiator/negotiations/[id]/accept - Accept counter offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    if (action === 'accept_counter') {
      // Get current negotiation
      const negResult = await pool.query(`
        SELECT n.*, b.total_billed 
        FROM negotiations n 
        LEFT JOIN bills b ON n.bill_id = b.id
        WHERE n.id = $1
      `, [id]);

      if (negResult.rows.length === 0) {
        return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
      }

      const negotiation = negResult.rows[0];
      const finalAmount = negotiation.counter_amount;
      const savingsAmount = negotiation.total_billed - finalAmount;
      const savingsPercent = (savingsAmount / negotiation.total_billed) * 100;

      // Update negotiation as settled
      const result = await pool.query(`
        UPDATE negotiations SET
          response_type = 'accepted',
          final_amount = $1,
          savings_amount = $2,
          savings_percent = $3,
          settled_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [finalAmount, savingsAmount, savingsPercent, id]);

      // Update bill status
      await pool.query(`
        UPDATE bills SET status = 'settled', updated_at = NOW() WHERE id = $1
      `, [negotiation.bill_id]);

      // Update provider intelligence
      await updateProviderIntelligence(negotiation.bill_id, finalAmount, savingsPercent);

      return NextResponse.json({ 
        negotiation: result.rows[0],
        message: 'Counter offer accepted, bill settled'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error processing negotiation action:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Update provider intelligence after settlement
async function updateProviderIntelligence(billId: number, finalAmount: number, savingsPercent: number) {
  try {
    const billResult = await pool.query(`
      SELECT client_id, provider_npi, provider_name, provider_fax, provider_email, total_billed
      FROM bills WHERE id = $1
    `, [billId]);

    if (billResult.rows.length === 0 || !billResult.rows[0].provider_npi) return;

    const bill = billResult.rows[0];
    const settlementPercent = 100 - savingsPercent;

    // Upsert provider record
    await pool.query(`
      INSERT INTO bill_providers (
        client_id, npi, name, fax, email,
        total_negotiations, avg_settlement_percent, last_negotiation_at
      ) VALUES ($1, $2, $3, $4, $5, 1, $6, NOW())
      ON CONFLICT (client_id, npi) DO UPDATE SET
        total_negotiations = bill_providers.total_negotiations + 1,
        avg_settlement_percent = (bill_providers.avg_settlement_percent * bill_providers.total_negotiations + $6) / (bill_providers.total_negotiations + 1),
        last_negotiation_at = NOW(),
        updated_at = NOW()
    `, [bill.client_id, bill.provider_npi, bill.provider_name, bill.provider_fax, bill.provider_email, settlementPercent]);

  } catch (error) {
    console.error('Error updating provider intelligence:', error);
  }
}
