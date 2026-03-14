/**
 * Provider Registration API
 * POST /api/providers/register
 * 
 * Register or update a provider in the email registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerProviderEmail } from '@/lib/provider-registry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.npi) {
      return NextResponse.json(
        { error: 'NPI is required' },
        { status: 400 }
      );
    }
    
    if (!body.providerName) {
      return NextResponse.json(
        { error: 'Provider name is required' },
        { status: 400 }
      );
    }
    
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const provider = await registerProviderEmail({
      npi: body.npi,
      providerName: body.providerName,
      email: body.email,
      taxId: body.taxId,
      providerType: body.providerType,
      specialty: body.specialty,
      billingPhone: body.billingPhone || body.phone,
      billingFax: body.billingFax || body.fax,
      billingAddress: body.billingAddress || body.address,
      source: body.source || 'api',
      sourceBillId: body.billId,
      confidence: body.confidence,
    });

    return NextResponse.json({
      success: true,
      provider,
    });

  } catch (error: any) {
    console.error('[ProviderRegister] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
