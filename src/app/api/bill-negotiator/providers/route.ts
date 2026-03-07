import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// NPPES API endpoint
const NPPES_API = 'https://npiregistry.cms.hhs.gov/api/?version=2.1';

// GET /api/bill-negotiator/providers - Search providers or get intelligence
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const npi = searchParams.get('npi');
    const name = searchParams.get('name');
    const clientId = searchParams.get('clientId');
    const state = searchParams.get('state');

    // If NPI provided, look up specific provider
    if (npi) {
      // First check our intelligence database
      if (clientId) {
        const intel = await pool.query(`
          SELECT * FROM bill_providers 
          WHERE client_id = $1 AND npi = $2
        `, [clientId, npi]);

        if (intel.rows.length > 0) {
          return NextResponse.json({ 
            provider: intel.rows[0],
            source: 'intelligence'
          });
        }
      }

      // Look up from NPPES
      const nppes = await fetchFromNPPES({ number: npi });
      if (nppes) {
        return NextResponse.json({ 
          provider: nppes,
          source: 'nppes'
        });
      }

      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Search by name
    if (name) {
      const nppes = await fetchFromNPPES({ 
        name,
        state: state || undefined
      });
      return NextResponse.json({ providers: nppes || [] });
    }

    // List providers with intelligence for client
    if (clientId) {
      const result = await pool.query(`
        SELECT * FROM bill_providers 
        WHERE client_id = $1 
        ORDER BY total_negotiations DESC
        LIMIT 100
      `, [clientId]);

      return NextResponse.json({ providers: result.rows });
    }

    return NextResponse.json({ error: 'npi, name, or clientId required' }, { status: 400 });

  } catch (error: any) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/bill-negotiator/providers - Create/update provider intelligence
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      clientId,
      npi,
      tin,
      name,
      address,
      city,
      state,
      zip,
      phone,
      fax,
      email,
      preferredContactMethod,
      preferredStrategy,
      notes
    } = data;

    if (!clientId || !npi) {
      return NextResponse.json({ error: 'clientId and npi required' }, { status: 400 });
    }

    // Upsert provider
    const result = await pool.query(`
      INSERT INTO bill_providers (
        client_id, npi, tin, name, address, city, state, zip,
        phone, fax, email, preferred_contact_method, preferred_strategy, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (client_id, npi) DO UPDATE SET
        tin = COALESCE(EXCLUDED.tin, bill_providers.tin),
        name = COALESCE(EXCLUDED.name, bill_providers.name),
        address = COALESCE(EXCLUDED.address, bill_providers.address),
        city = COALESCE(EXCLUDED.city, bill_providers.city),
        state = COALESCE(EXCLUDED.state, bill_providers.state),
        zip = COALESCE(EXCLUDED.zip, bill_providers.zip),
        phone = COALESCE(EXCLUDED.phone, bill_providers.phone),
        fax = COALESCE(EXCLUDED.fax, bill_providers.fax),
        email = COALESCE(EXCLUDED.email, bill_providers.email),
        preferred_contact_method = COALESCE(EXCLUDED.preferred_contact_method, bill_providers.preferred_contact_method),
        preferred_strategy = COALESCE(EXCLUDED.preferred_strategy, bill_providers.preferred_strategy),
        notes = COALESCE(EXCLUDED.notes, bill_providers.notes),
        updated_at = NOW()
      RETURNING *
    `, [
      clientId, npi, tin, name, address, city, state, zip,
      phone, fax, email, preferredContactMethod, preferredStrategy, notes
    ]);

    return NextResponse.json({ provider: result.rows[0] });

  } catch (error: any) {
    console.error('Error saving provider:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Helper: Fetch from NPPES API
async function fetchFromNPPES(params: { number?: string; name?: string; state?: string }) {
  try {
    const searchParams = new URLSearchParams();
    
    if (params.number) {
      searchParams.set('number', params.number);
    }
    if (params.name) {
      // Try organization name first
      searchParams.set('organization_name', params.name);
    }
    if (params.state) {
      searchParams.set('state', params.state);
    }
    
    searchParams.set('limit', '10');

    const response = await fetch(`${NPPES_API}&${searchParams.toString()}`);
    
    if (!response.ok) {
      console.error('NPPES API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      // Try with first/last name if organization search failed
      if (params.name && !params.number) {
        const nameParts = params.name.split(' ');
        if (nameParts.length >= 2) {
          const retryParams = new URLSearchParams();
          retryParams.set('first_name', nameParts[0]);
          retryParams.set('last_name', nameParts[nameParts.length - 1]);
          if (params.state) retryParams.set('state', params.state);
          retryParams.set('limit', '10');
          
          const retryResponse = await fetch(`${NPPES_API}&${retryParams.toString()}`);
          const retryData = await retryResponse.json();
          
          if (retryData.results && retryData.results.length > 0) {
            return params.number ? formatNPPESResult(retryData.results[0]) : retryData.results.map(formatNPPESResult);
          }
        }
      }
      return null;
    }

    return params.number ? formatNPPESResult(data.results[0]) : data.results.map(formatNPPESResult);

  } catch (error) {
    console.error('NPPES fetch error:', error);
    return null;
  }
}

// Helper: Format NPPES result to our schema
function formatNPPESResult(result: any) {
  const address = result.addresses?.[0] || {};
  const taxonomy = result.taxonomies?.[0] || {};
  
  let name = '';
  if (result.basic?.organization_name) {
    name = result.basic.organization_name;
  } else if (result.basic?.first_name && result.basic?.last_name) {
    name = `${result.basic.first_name} ${result.basic.last_name}`;
    if (result.basic.credential) {
      name += `, ${result.basic.credential}`;
    }
  }

  return {
    npi: result.number,
    name,
    entityType: result.enumeration_type === 'NPI-2' ? 'organization' : 'individual',
    address: address.address_1,
    city: address.city,
    state: address.state,
    zip: address.postal_code,
    phone: address.telephone_number,
    fax: address.fax_number,
    specialty: taxonomy.desc,
    taxonomyCode: taxonomy.code
  };
}
