import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST /api/bill-negotiator/send-offer - Send offer to provider
export async function POST(request: NextRequest) {
  try {
    const { billId, offerAmount, method } = await request.json();

    if (!billId) {
      return NextResponse.json(
        { error: 'billId is required' },
        { status: 400 }
      );
    }

    // Get bill details
    const billResult = await pool.query(`
      SELECT b.*, c.name as client_name
      FROM bills b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [billId]);

    if (billResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    const bill = billResult.rows[0];
    const finalOffer = offerAmount || bill.fair_price;

    // Check if negotiation already exists
    const existingNeg = await pool.query(`
      SELECT id FROM negotiations WHERE bill_id = $1 ORDER BY round_number DESC LIMIT 1
    `, [billId]);

    let negotiationId;
    
    if (existingNeg.rows.length > 0) {
      // Update existing negotiation
      negotiationId = existingNeg.rows[0].id;
      await pool.query(`
        UPDATE negotiations 
        SET offer_amount = $1, sent_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [finalOffer, negotiationId]);
    } else {
      // Create new negotiation record
      const negotiationResult = await pool.query(`
        INSERT INTO negotiations (
          bill_id, client_id, offer_amount, response_type, 
          round_number, sent_at, created_at, updated_at
        ) VALUES ($1, $2, $3, 'pending', 1, NOW(), NOW(), NOW())
        RETURNING id
      `, [billId, bill.client_id, finalOffer]);
      negotiationId = negotiationResult.rows[0].id;
    }

    // Update bill status
    await pool.query(`
      UPDATE bills 
      SET status = 'offer_sent', 
          current_offer = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [finalOffer, billId]);

    // Note: Actual email/fax sending handled by auto-process or manual trigger
    // This just records the offer in the database

    return NextResponse.json({
      success: true,
      negotiationId,
      offerAmount: finalOffer,
      status: 'offer_sent'
    });
  } catch (error) {
    console.error('Error sending offer:', error);
    return NextResponse.json(
      { error: 'Failed to send offer' },
      { status: 500 }
    );
  }
}
