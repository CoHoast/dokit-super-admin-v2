import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/bills/[id] - Get single bill with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const billResult = await pool.query(`
      SELECT 
        b.*,
        c.name as client_name,
        c.slug as client_slug
      FROM bills b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (billResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const bill = billResult.rows[0];

    // Get negotiations for this bill
    const negotiationsResult = await pool.query(`
      SELECT * FROM negotiations 
      WHERE bill_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    // Get communications
    const commsResult = await pool.query(`
      SELECT * FROM negotiation_communications 
      WHERE bill_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    // Get provider intelligence if we have NPI
    let providerIntelligence = null;
    if (bill.provider_npi) {
      const providerResult = await pool.query(`
        SELECT * FROM bill_providers 
        WHERE client_id = $1 AND npi = $2
      `, [bill.client_id, bill.provider_npi]);
      providerIntelligence = providerResult.rows[0] || null;
    }

    return NextResponse.json({
      bill,
      negotiations: negotiationsResult.rows,
      communications: commsResult.rows,
      providerIntelligence
    });

  } catch (error: any) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// PATCH /api/db/bill-negotiator/bills/[id] - Update bill
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    // Build dynamic update query
    const allowedFields = [
      'member_id', 'member_name', 'member_dob',
      'provider_name', 'provider_npi', 'provider_tin', 'provider_address',
      'provider_phone', 'provider_fax', 'provider_email',
      'account_number', 'date_of_service', 'place_of_service', 'facility_type',
      'document_url', 'document_type', 'line_items', 'diagnosis_codes', 'extracted_data',
      'extraction_confidence', 'total_billed', 'total_medicare_rate', 'fair_price',
      'status', 'analyzed_at'
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(`
      UPDATE bills 
      SET ${setClauses.join(', ')}
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
