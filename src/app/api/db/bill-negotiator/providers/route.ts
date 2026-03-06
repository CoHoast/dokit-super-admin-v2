import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/db/bill-negotiator/providers - List providers with intelligence data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const npi = searchParams.get('npi');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (clientId) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      params.push(parseInt(clientId));
      paramIndex++;
    }

    if (npi) {
      whereClause += ` AND p.npi = $${paramIndex}`;
      params.push(npi);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.npi ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        p.*,
        c.name as client_name
      FROM bill_providers p
      LEFT JOIN clients c ON p.client_id = c.id
      ${whereClause}
      ORDER BY p.total_negotiations DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM bill_providers p ${whereClause}
    `, params);

    return NextResponse.json({
      providers: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/db/bill-negotiator/providers/lookup - Lookup provider via NPPES
export async function POST(request: NextRequest) {
  try {
    const { npi } = await request.json();

    if (!npi) {
      return NextResponse.json({ error: 'NPI is required' }, { status: 400 });
    }

    // First check our cache
    const cacheResult = await pool.query(`
      SELECT * FROM bill_providers WHERE npi = $1 LIMIT 1
    `, [npi]);

    if (cacheResult.rows.length > 0) {
      return NextResponse.json({ 
        provider: cacheResult.rows[0],
        source: 'cache'
      });
    }

    // Lookup via NPPES API
    const nppesData = await lookupNPPES(npi);

    if (nppesData) {
      return NextResponse.json({ 
        provider: nppesData,
        source: 'nppes'
      });
    }

    return NextResponse.json({ 
      error: 'Provider not found',
      npi 
    }, { status: 404 });

  } catch (error: any) {
    console.error('Error looking up provider:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Lookup provider via NPPES API (free government API)
async function lookupNPPES(npi: string) {
  try {
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.result_count === 0) return null;

    const result = data.results[0];
    const address = result.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || result.addresses?.[0];

    return {
      npi: result.number,
      name: result.basic?.organization_name || 
            `${result.basic?.first_name} ${result.basic?.last_name}`.trim(),
      address: address ? `${address.address_1}, ${address.city}, ${address.state} ${address.postal_code}` : null,
      city: address?.city,
      state: address?.state,
      zip: address?.postal_code,
      phone: address?.telephone_number,
      fax: address?.fax_number,
      taxonomy: result.taxonomies?.[0]?.desc,
      enumeration_date: result.basic?.enumeration_date
    };

  } catch (error) {
    console.error('NPPES lookup error:', error);
    return null;
  }
}
