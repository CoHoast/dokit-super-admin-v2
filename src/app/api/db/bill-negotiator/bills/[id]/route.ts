import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/bills/[id] - Get single bill with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(`
      SELECT 
        b.*,
        c.name as client_name,
        c.slug as client_slug
      FROM bills b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const bill = result.rows[0];

    // Get negotiations for this bill
    const negotiationsResult = await pool.query(`
      SELECT * FROM negotiations 
      WHERE bill_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    // Get communications for this bill
    const commsResult = await pool.query(`
      SELECT * FROM negotiation_communications 
      WHERE bill_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    // Get provider intelligence if exists
    let providerIntel = null;
    if (bill.provider_npi) {
      const providerResult = await pool.query(`
        SELECT * FROM bill_providers 
        WHERE client_id = $1 AND npi = $2
      `, [bill.client_id, bill.provider_npi]);
      
      if (providerResult.rows.length > 0) {
        providerIntel = providerResult.rows[0];
      }
    }

    return NextResponse.json({
      bill,
      negotiations: negotiationsResult.rows,
      communications: commsResult.rows,
      providerIntel
    });

  } catch (error: any) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// PUT /api/db/bill-negotiator/bills/[id] - Update bill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const {
      status,
      lineItems,
      diagnosisCodes,
      extractedData,
      extractionConfidence,
      totalBilled,
      totalMedicareRate,
      fairPrice,
      providerName,
      providerNpi,
      providerFax,
      providerEmail,
      memberName,
      accountNumber,
      dateOfService
    } = data;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      
      // Set analyzed_at if moving to ready_to_negotiate
      if (status === 'ready_to_negotiate' || status === 'analyzing') {
        updates.push(`analyzed_at = NOW()`);
      }
    }

    if (lineItems !== undefined) {
      updates.push(`line_items = $${paramIndex}`);
      values.push(JSON.stringify(lineItems));
      paramIndex++;
    }

    if (diagnosisCodes !== undefined) {
      updates.push(`diagnosis_codes = $${paramIndex}`);
      values.push(JSON.stringify(diagnosisCodes));
      paramIndex++;
    }

    if (extractedData !== undefined) {
      updates.push(`extracted_data = $${paramIndex}`);
      values.push(JSON.stringify(extractedData));
      paramIndex++;
    }

    if (extractionConfidence !== undefined) {
      updates.push(`extraction_confidence = $${paramIndex}`);
      values.push(extractionConfidence);
      paramIndex++;
    }

    if (totalBilled !== undefined) {
      updates.push(`total_billed = $${paramIndex}`);
      values.push(totalBilled);
      paramIndex++;
    }

    if (totalMedicareRate !== undefined) {
      updates.push(`total_medicare_rate = $${paramIndex}`);
      values.push(totalMedicareRate);
      paramIndex++;
    }

    if (fairPrice !== undefined) {
      updates.push(`fair_price = $${paramIndex}`);
      values.push(fairPrice);
      paramIndex++;
    }

    if (providerName !== undefined) {
      updates.push(`provider_name = $${paramIndex}`);
      values.push(providerName);
      paramIndex++;
    }

    if (providerNpi !== undefined) {
      updates.push(`provider_npi = $${paramIndex}`);
      values.push(providerNpi);
      paramIndex++;
    }

    if (providerFax !== undefined) {
      updates.push(`provider_fax = $${paramIndex}`);
      values.push(providerFax);
      paramIndex++;
    }

    if (providerEmail !== undefined) {
      updates.push(`provider_email = $${paramIndex}`);
      values.push(providerEmail);
      paramIndex++;
    }

    if (memberName !== undefined) {
      updates.push(`member_name = $${paramIndex}`);
      values.push(memberName);
      paramIndex++;
    }

    if (accountNumber !== undefined) {
      updates.push(`account_number = $${paramIndex}`);
      values.push(accountNumber);
      paramIndex++;
    }

    if (dateOfService !== undefined) {
      updates.push(`date_of_service = $${paramIndex}`);
      values.push(dateOfService);
      paramIndex++;
    }

    updates.push('updated_at = NOW()');

    if (updates.length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const result = await pool.query(`
      UPDATE bills 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ bill: result.rows[0] });

  } catch (error: any) {
    console.error('Error updating bill:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// DELETE /api/db/bill-negotiator/bills/[id] - Delete bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(`
      DELETE FROM bills WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });

  } catch (error: any) {
    console.error('Error deleting bill:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
