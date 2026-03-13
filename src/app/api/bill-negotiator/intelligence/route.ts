/**
 * Provider Intelligence API
 * 
 * Get and manage provider negotiation intelligence.
 * 
 * GET /api/bill-negotiator/intelligence?npi=XXX - Get provider profile
 * GET /api/bill-negotiator/intelligence/recommend?npi=XXX&billed=1000 - Get offer recommendation
 * GET /api/bill-negotiator/intelligence/top - Get top providers by volume
 * POST /api/bill-negotiator/intelligence/record - Record negotiation outcome
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { ProviderIntelligenceService } from '@/lib/reliability/provider-intelligence';

const intelligenceService = new ProviderIntelligenceService(pool);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'profile';
  const clientId = parseInt(searchParams.get('clientId') || '1');

  try {
    switch (action) {
      case 'profile': {
        const npi = searchParams.get('npi');
        if (!npi) {
          return NextResponse.json({ error: 'npi required' }, { status: 400 });
        }
        const profile = await intelligenceService.getProfile(clientId, npi);
        return NextResponse.json({ profile });
      }

      case 'recommend': {
        const npi = searchParams.get('npi');
        const totalBilled = parseFloat(searchParams.get('billed') || '0');
        const medicareRate = parseFloat(searchParams.get('medicare') || '0');
        
        if (!npi || !totalBilled) {
          return NextResponse.json({ error: 'npi and billed required' }, { status: 400 });
        }

        // Get client settings for defaults
        const settingsResult = await pool.query(`
          SELECT * FROM negotiation_settings WHERE client_id = $1
        `, [clientId]);
        const settings = settingsResult.rows[0] || {};

        const recommendation = await intelligenceService.getOfferRecommendation(
          clientId,
          npi,
          totalBilled,
          medicareRate,
          {
            defaultOfferPercent: settings.default_initial_offer_percent || 50,
            minOfferPercent: settings.min_offer_percent || 35,
            maxOfferPercent: settings.max_offer_percent || 75
          }
        );

        return NextResponse.json({ recommendation });
      }

      case 'top': {
        const limit = parseInt(searchParams.get('limit') || '20');
        const providers = await intelligenceService.getTopProviders(clientId, limit);
        return NextResponse.json({ providers });
      }

      case 'low-confidence': {
        const limit = parseInt(searchParams.get('limit') || '20');
        const providers = await intelligenceService.getLowConfidenceProviders(clientId, limit);
        return NextResponse.json({ providers });
      }

      case 'stats': {
        // Get overall intelligence stats
        const statsResult = await pool.query(`
          SELECT 
            COUNT(*) as total_providers,
            COUNT(*) FILTER (WHERE confidence_score >= 70) as high_confidence,
            COUNT(*) FILTER (WHERE confidence_score BETWEEN 30 AND 69) as medium_confidence,
            COUNT(*) FILTER (WHERE confidence_score < 30) as low_confidence,
            SUM(total_negotiations) as total_negotiations,
            AVG(avg_settlement_percent) as overall_avg_settlement
          FROM bill_providers
          WHERE client_id = $1 AND total_negotiations > 0
        `, [clientId]);

        return NextResponse.json({ stats: statsResult.rows[0] });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[INTELLIGENCE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Record negotiation outcome (called when negotiation settles)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      clientId,
      providerNpi,
      billId,
      negotiationId,
      totalBilled,
      medicareRate,
      initialOffer,
      responseType,
      counterAmount,
      finalAmount,
      contactMethod,
      offerSentAt,
      responseReceivedAt,
      settledAt
    } = data;

    if (!clientId || !providerNpi || !billId || !negotiationId) {
      return NextResponse.json(
        { error: 'clientId, providerNpi, billId, negotiationId required' },
        { status: 400 }
      );
    }

    await intelligenceService.recordNegotiationOutcome({
      clientId,
      providerNpi,
      billId,
      negotiationId,
      totalBilled,
      medicareRate,
      initialOffer,
      responseType,
      counterAmount,
      finalAmount,
      contactMethod,
      offerSentAt: new Date(offerSentAt),
      responseReceivedAt: responseReceivedAt ? new Date(responseReceivedAt) : undefined,
      settledAt: settledAt ? new Date(settledAt) : undefined
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[INTELLIGENCE] Error recording outcome:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
