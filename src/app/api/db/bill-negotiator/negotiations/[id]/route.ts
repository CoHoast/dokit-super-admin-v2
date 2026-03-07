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
        b.member_name,
        b.member_id,
        b.provider_name,
        b.provider_npi,
        b.provider_fax,
        b.total_billed,
        b.fair_price,
        b.total_medicare_rate,
        b.account_number,
        b.date_of_service,
        b.line_items,
        c.name as client_name
      FROM negotiations n
      LEFT JOIN bills b ON n.bill_id = b.id
      LEFT JOIN clients c ON n.client_id = c.id
      WHERE n.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    // Get communications
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

// PUT /api/db/bill-negotiator/negotiations/[id] - Update negotiation (handle response)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const {
      responseType,
      counterAmount,
      counterNotes,
      finalAmount,
      humanReviewed,
      reviewedBy,
      reviewNotes,
      escalated,
      escalationReason
    } = data;

    // Get current negotiation
    const currentResult = await pool.query(`
      SELECT n.*, b.total_billed, b.client_id, b.provider_npi
      FROM negotiations n
      JOIN bills b ON n.bill_id = b.id
      WHERE n.id = $1
    `, [id]);

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 });
    }

    const current = currentResult.rows[0];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Handle response type changes
    if (responseType) {
      updates.push(`response_type = $${paramIndex}`);
      values.push(responseType);
      paramIndex++;

      updates.push(`response_received_at = NOW()`);

      // If accepted or settling
      if (responseType === 'accepted') {
        const settlement = finalAmount || current.initial_offer;
        const savings = current.total_billed - settlement;
        const savingsPercent = (savings / current.total_billed) * 100;

        updates.push(`final_amount = $${paramIndex}`);
        values.push(settlement);
        paramIndex++;

        updates.push(`savings_amount = $${paramIndex}`);
        values.push(savings);
        paramIndex++;

        updates.push(`savings_percent = $${paramIndex}`);
        values.push(savingsPercent);
        paramIndex++;

        updates.push(`settled_at = NOW()`);

        // Update bill status to settled
        await pool.query(`
          UPDATE bills SET status = 'settled', updated_at = NOW()
          WHERE id = $1
        `, [current.bill_id]);

        // Update provider intelligence
        await updateProviderIntelligence(
          current.client_id,
          current.provider_npi,
          settlement,
          current.total_billed,
          savingsPercent
        );
      }
    }

    if (counterAmount !== undefined) {
      updates.push(`counter_amount = $${paramIndex}`);
      values.push(counterAmount);
      paramIndex++;

      // Update bill status
      await pool.query(`
        UPDATE bills SET status = 'counter_received', updated_at = NOW()
        WHERE id = $1
      `, [current.bill_id]);
    }

    if (counterNotes !== undefined) {
      updates.push(`counter_notes = $${paramIndex}`);
      values.push(counterNotes);
      paramIndex++;
    }

    if (finalAmount !== undefined && responseType !== 'accepted') {
      updates.push(`final_amount = $${paramIndex}`);
      values.push(finalAmount);
      paramIndex++;
    }

    if (humanReviewed !== undefined) {
      updates.push(`human_reviewed = $${paramIndex}`);
      values.push(humanReviewed);
      paramIndex++;
    }

    if (reviewedBy !== undefined) {
      updates.push(`reviewed_by = $${paramIndex}`);
      values.push(reviewedBy);
      paramIndex++;
    }

    if (reviewNotes !== undefined) {
      updates.push(`review_notes = $${paramIndex}`);
      values.push(reviewNotes);
      paramIndex++;
    }

    if (escalated !== undefined) {
      updates.push(`escalated = $${paramIndex}`);
      values.push(escalated);
      paramIndex++;
    }

    if (escalationReason !== undefined) {
      updates.push(`escalation_reason = $${paramIndex}`);
      values.push(escalationReason);
      paramIndex++;
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(`
      UPDATE negotiations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return NextResponse.json({ negotiation: result.rows[0] });

  } catch (error: any) {
    console.error('Error updating negotiation:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Helper function to update provider intelligence
async function updateProviderIntelligence(
  clientId: number,
  providerNpi: string,
  settlementAmount: number,
  billedAmount: number,
  savingsPercent: number
) {
  if (!providerNpi) return;

  try {
    // Check if provider exists
    const existing = await pool.query(`
      SELECT * FROM bill_providers WHERE client_id = $1 AND npi = $2
    `, [clientId, providerNpi]);

    if (existing.rows.length === 0) {
      // Create new provider record
      await pool.query(`
        INSERT INTO bill_providers (
          client_id, npi, total_negotiations, total_bills_processed,
          avg_billed_amount, avg_settlement_amount, avg_settlement_percent,
          last_negotiation_at
        ) VALUES ($1, $2, 1, 1, $3, $4, $5, NOW())
      `, [clientId, providerNpi, billedAmount, settlementAmount, 100 - savingsPercent]);
    } else {
      // Update existing provider stats
      const provider = existing.rows[0];
      const newCount = provider.total_negotiations + 1;
      const newAvgBilled = ((provider.avg_billed_amount * provider.total_negotiations) + billedAmount) / newCount;
      const newAvgSettlement = ((provider.avg_settlement_amount * provider.total_negotiations) + settlementAmount) / newCount;
      const newAvgPercent = ((provider.avg_settlement_percent * provider.total_negotiations) + (100 - savingsPercent)) / newCount;

      await pool.query(`
        UPDATE bill_providers SET
          total_negotiations = $1,
          total_bills_processed = total_bills_processed + 1,
          avg_billed_amount = $2,
          avg_settlement_amount = $3,
          avg_settlement_percent = $4,
          last_negotiation_at = NOW(),
          updated_at = NOW()
        WHERE client_id = $5 AND npi = $6
      `, [newCount, newAvgBilled, newAvgSettlement, newAvgPercent, clientId, providerNpi]);
    }
  } catch (error) {
    console.error('Error updating provider intelligence:', error);
  }
}
