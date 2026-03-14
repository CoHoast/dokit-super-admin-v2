/**
 * Provider Lookup API
 * GET /api/providers/lookup?npi=1234567890
 * 
 * Look up provider email from registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { lookupProviderEmail, searchProviders } from '@/lib/provider-registry';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const npi = url.searchParams.get('npi');
    const query = url.searchParams.get('q');

    if (npi) {
      // Direct NPI lookup
      const result = await lookupProviderEmail(npi);
      return NextResponse.json(result);
    }

    if (query) {
      // Search by name, NPI, or email
      const results = await searchProviders(query);
      return NextResponse.json({
        query,
        count: results.length,
        providers: results,
      });
    }

    return NextResponse.json({
      usage: {
        lookup: 'GET /api/providers/lookup?npi=1234567890',
        search: 'GET /api/providers/lookup?q=mountain+view',
      },
    });

  } catch (error: any) {
    console.error('[ProviderLookup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Lookup failed' },
      { status: 500 }
    );
  }
}
