/**
 * Provider Email Verification API
 * POST /api/providers/verify
 * 
 * Called when a provider responds to verify their email works
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyProviderEmail, markEmailBounced } from '@/lib/provider-registry';

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
    
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!body.verificationType) {
      return NextResponse.json(
        { error: 'Verification type is required (portal_click, offer_accepted, offer_countered, email_reply, manual)' },
        { status: 400 }
      );
    }

    // Check if this is marking as bounced
    if (body.verificationType === 'bounced') {
      await markEmailBounced(body.npi, body.email, body.reason);
      return NextResponse.json({
        success: true,
        action: 'marked_bounced',
        npi: body.npi,
        email: body.email,
      });
    }

    // Get IP and user agent for audit
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                      request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const provider = await verifyProviderEmail({
      npi: body.npi,
      email: body.email,
      verificationType: body.verificationType,
      verificationSource: body.source || body.billId || body.offerId,
      ipAddress,
      userAgent,
      verifiedBy: body.verifiedBy || 'system',
    });

    return NextResponse.json({
      success: true,
      action: 'verified',
      provider,
    });

  } catch (error: any) {
    console.error('[ProviderVerify] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
