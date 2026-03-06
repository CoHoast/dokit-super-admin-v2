import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/bills - List bills with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const memberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      whereClause += ` AND b.client_id = $${paramIndex}`;
      params.push(parseInt(clientId));
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (memberId) {
      whereClause += ` AND b.member_id = $${paramIndex}`;
      params.push(memberId);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        b.*,
        c.name as client_name,
        n.id as negotiation_id,
        n.response_type as negotiation_status,
        n.final_amount,
        n.savings_amount,
        n.savings_percent
      FROM bills b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN negotiations n ON n.bill_id = b.id
      ${whereClause}
      ORDER BY b.received_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM bills b ${whereClause}
    `, params);

    return NextResponse.json({
      bills: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/db/bill-negotiator/bills - Create new bill
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      clientId,
      memberId,
      memberName,
      memberDob,
      providerName,
      providerNpi,
      providerTin,
      providerAddress,
      providerPhone,
      providerFax,
      providerEmail,
      accountNumber,
      dateOfService,
      placeOfService,
      facilityType,
      documentUrl,
      documentType,
      lineItems,
      diagnosisCodes,
      totalBilled
    } = data;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO bills (
        client_id, member_id, member_name, member_dob,
        provider_name, provider_npi, provider_tin, provider_address, 
        provider_phone, provider_fax, provider_email,
        account_number, date_of_service, place_of_service, facility_type,
        document_url, document_type, line_items, diagnosis_codes, total_billed,
        status, received_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        'received', NOW()
      )
      RETURNING *
    `, [
      clientId, memberId, memberName, memberDob,
      providerName, providerNpi, providerTin, providerAddress,
      providerPhone, providerFax, providerEmail,
      accountNumber, dateOfService, placeOfService, facilityType,
      documentUrl, documentType, JSON.stringify(lineItems || []), JSON.stringify(diagnosisCodes || []),
      totalBilled
    ]);

    return NextResponse.json({ bill: result.rows[0] });

  } catch (error: any) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
