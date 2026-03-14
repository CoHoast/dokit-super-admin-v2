import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST /api/bill-negotiator/escalate - Escalate bill for manual review
export async function POST(request: NextRequest) {
  try {
    const { billId, reason, notes } = await request.json();

    if (!billId) {
      return NextResponse.json(
        { error: 'billId is required' },
        { status: 400 }
      );
    }

    // Get bill details
    const billResult = await pool.query(`
      SELECT * FROM bills WHERE id = $1
    `, [billId]);

    if (billResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Update bill status to escalated
    await pool.query(`
      UPDATE bills 
      SET status = 'escalated',
          escalation_reason = $1,
          escalation_notes = $2,
          escalated_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [reason || 'Manual escalation', notes || '', billId]);

    // Update any pending negotiations
    await pool.query(`
      UPDATE negotiations 
      SET response_type = 'escalated',
          notes = COALESCE(notes, '') || ' [Escalated: ' || $1 || ']',
          updated_at = NOW()
      WHERE bill_id = $2 AND response_type = 'pending'
    `, [reason || 'Manual escalation', billId]);

    // Log the escalation
    await pool.query(`
      INSERT INTO audit_log (action, resource_type, resource_id, details, created_at)
      VALUES ('BILL_ESCALATED', 'bill', $1, $2, NOW())
    `, [billId, JSON.stringify({ reason, notes })]);

    return NextResponse.json({
      success: true,
      billId,
      status: 'escalated',
      reason: reason || 'Manual escalation'
    });
  } catch (error) {
    console.error('Error escalating bill:', error);
    return NextResponse.json(
      { error: 'Failed to escalate bill' },
      { status: 500 }
    );
  }
}
