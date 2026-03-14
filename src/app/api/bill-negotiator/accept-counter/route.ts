import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST /api/bill-negotiator/accept-counter - Accept provider's counter-offer
export async function POST(request: NextRequest) {
  try {
    const { billId } = await request.json();

    if (!billId) {
      return NextResponse.json(
        { error: 'billId is required' },
        { status: 400 }
      );
    }

    // Get the latest negotiation for this bill
    const negotiationResult = await pool.query(`
      SELECT n.*, b.total_billed
      FROM negotiations n
      JOIN bills b ON n.bill_id = b.id
      WHERE n.bill_id = $1
      ORDER BY n.round_number DESC
      LIMIT 1
    `, [billId]);

    if (negotiationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No negotiation found for this bill' },
        { status: 404 }
      );
    }

    const negotiation = negotiationResult.rows[0];
    const counterAmount = negotiation.counter_amount || negotiation.offer_amount;
    const totalBilled = negotiation.total_billed;
    const savingsAmount = totalBilled - counterAmount;
    const savingsPercent = totalBilled > 0 ? (savingsAmount / totalBilled) * 100 : 0;

    // Update negotiation to accepted
    await pool.query(`
      UPDATE negotiations 
      SET response_type = 'accepted',
          final_amount = $1,
          savings_amount = $2,
          savings_percent = $3,
          updated_at = NOW()
      WHERE id = $4
    `, [counterAmount, savingsAmount, savingsPercent, negotiation.id]);

    // Update bill status to settled
    await pool.query(`
      UPDATE bills 
      SET status = 'settled',
          settled_amount = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [counterAmount, billId]);

    return NextResponse.json({
      success: true,
      billId,
      finalAmount: counterAmount,
      savingsAmount,
      savingsPercent: savingsPercent.toFixed(1),
      status: 'settled'
    });
  } catch (error) {
    console.error('Error accepting counter:', error);
    return NextResponse.json(
      { error: 'Failed to accept counter-offer' },
      { status: 500 }
    );
  }
}
