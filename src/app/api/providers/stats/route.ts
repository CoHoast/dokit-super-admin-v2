/**
 * Provider Registry Stats API
 * GET /api/providers/stats
 */

import { NextResponse } from 'next/server';
import { getRegistryStats } from '@/lib/provider-registry';

export async function GET() {
  try {
    const stats = await getRegistryStats();
    
    return NextResponse.json({
      ...stats,
      verificationRate: stats.totalProviders > 0 
        ? ((stats.verifiedProviders / stats.totalProviders) * 100).toFixed(1) + '%'
        : '0%',
      overallResponseRate: stats.totalOffersSent > 0
        ? ((stats.totalResponses / stats.totalOffersSent) * 100).toFixed(1) + '%'
        : 'N/A',
    });
    
  } catch (error: any) {
    console.error('[ProviderStats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    );
  }
}
