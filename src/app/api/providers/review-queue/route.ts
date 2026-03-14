/**
 * Provider Review Queue API
 * GET /api/providers/review-queue
 * 
 * Get providers needing manual email review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvidersNeedingReview } from '@/lib/provider-registry';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const providers = await getProvidersNeedingReview(limit);
    
    return NextResponse.json({
      count: providers.length,
      providers: providers.map(p => ({
        id: p.id,
        npi: p.npi,
        providerName: p.providerName,
        currentEmail: p.verifiedEmail,
        confidence: p.confidence,
        status: p.status,
        totalOffersSent: p.totalOffersSent,
        totalResponses: p.totalResponses,
        responseRate: p.responseRate,
        lastOfferSent: p.lastOfferSent,
        source: p.source,
        notes: p.notes,
      })),
    });
    
  } catch (error: any) {
    console.error('[ProviderReviewQueue] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get review queue' },
      { status: 500 }
    );
  }
}
