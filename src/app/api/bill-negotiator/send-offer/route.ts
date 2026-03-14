import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { CommunicationService } from '@/lib/communication/service';

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

    // Create negotiation record
    const negotiationResult = await pool.query(`
      INSERT INTO negotiations (
        bill_id, client_id, offer_amount, response_type, 
        round_number, sent_at, created_at, updated_at
      ) VALUES ($1, $2, $3, 'pending', 1, NOW(), NOW(), NOW())
      RETURNING id
    `, [billId, bill.client_id, finalOffer]);

    const negotiationId = negotiationResult.rows[0].id;

    // Update bill status
    await pool.query(`
      UPDATE bills 
      SET status = 'offer_sent', 
          current_offer = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [finalOffer, billId]);

    // Send communication (email/fax)
    const commService = new CommunicationService();
    const sendMethod = method || (bill.provider_email ? 'email' : 'fax');
    
    try {
      await commService.sendOffer({
        billId,
        negotiationId,
        method: sendMethod,
        recipient: sendMethod === 'email' ? bill.provider_email : bill.provider_fax,
        letterType: 'initial_offer'
      }, {
        clientName: bill.client_name,
        memberName: bill.member_name,
        providerName: bill.provider_name,
        totalBilled: bill.total_billed,
        offerAmount: finalOffer,
        serviceDate: bill.service_date,
        accountNumber: bill.account_number
      });
    } catch (commError) {
      console.error('Communication error (non-fatal):', commError);
    }

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
