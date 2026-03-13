/**
 * Provider Intelligence Engine
 * 
 * Learns provider negotiation patterns and optimizes offers based on history.
 * The more bills we negotiate, the smarter the system gets.
 * 
 * Key metrics tracked per provider:
 * - Average settlement % (what they typically accept)
 * - Acceptance rate (how often they accept first offer)
 * - Counter pattern (do they always counter, or sometimes accept?)
 * - Preferred contact method (email vs fax response rates)
 * - Average response time (how fast do they respond?)
 * - Seasonal patterns (end of quarter behavior, etc.)
 */

import { Pool } from 'pg';

// Provider intelligence profile
export interface ProviderProfile {
  npi: string;
  name: string;
  
  // Negotiation stats
  totalNegotiations: number;
  avgSettlementPercent: number;      // % of billed they accept (e.g., 45% = they accept 45% of bill)
  avgSettlementMultiplier: number;   // Multiple of Medicare (e.g., 1.65 = 165% of Medicare)
  acceptanceRate: number;            // % of first offers accepted
  counterRate: number;               // % that result in counter-offer
  rejectionRate: number;             // % rejected outright
  
  // Timing patterns
  avgResponseDays: number;           // Average days to respond
  avgSettlementDays: number;         // Average days to final settlement
  
  // Contact preferences
  preferredContactMethod: 'email' | 'fax' | 'unknown';
  emailResponseRate: number;         // % response rate via email
  faxResponseRate: number;           // % response rate via fax
  
  // Recommended strategy
  recommendedInitialOffer: number;   // % of billed to offer first
  recommendedMaxOffer: number;       // % of billed max before escalation
  autoAcceptThreshold: number;       // Counter within X% = auto-accept
  
  // Confidence
  confidenceScore: number;           // 0-100, based on data volume
  lastUpdated: Date;
}

// Offer recommendation
export interface OfferRecommendation {
  initialOfferPercent: number;       // % of billed
  initialOfferAmount: number;        // $ amount
  maxOfferPercent: number;           // % of billed
  maxOfferAmount: number;            // $ amount
  expectedSettlement: number;        // Predicted final amount
  expectedSavingsPercent: number;    // Predicted savings
  preferredContactMethod: 'email' | 'fax';
  confidenceScore: number;
  reasoning: string;
}

/**
 * Provider Intelligence Service
 */
export class ProviderIntelligenceService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize provider intelligence tables
   */
  async initialize(): Promise<void> {
    // Enhance bill_providers table if not already done
    await this.pool.query(`
      ALTER TABLE bill_providers 
      ADD COLUMN IF NOT EXISTS counter_rate DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS rejection_rate DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS avg_response_days DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS avg_settlement_days DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS email_response_rate DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS fax_response_rate DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS recommended_initial_offer DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS recommended_max_offer DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS auto_accept_threshold DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS negotiation_history JSONB DEFAULT '[]'::jsonb
    `);

    // Create provider negotiation history table for detailed tracking
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS provider_negotiation_history (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        provider_npi VARCHAR(20) NOT NULL,
        bill_id INTEGER NOT NULL,
        negotiation_id INTEGER NOT NULL,
        
        -- Bill details
        total_billed DECIMAL(12,2),
        medicare_rate DECIMAL(12,2),
        
        -- Offer details
        initial_offer DECIMAL(12,2),
        initial_offer_percent DECIMAL(5,2),
        
        -- Response details
        response_type VARCHAR(20),  -- 'accepted', 'countered', 'rejected', 'no_response'
        counter_amount DECIMAL(12,2),
        
        -- Settlement
        final_amount DECIMAL(12,2),
        settlement_percent DECIMAL(5,2),
        savings_percent DECIMAL(5,2),
        
        -- Timing
        offer_sent_at TIMESTAMPTZ,
        response_received_at TIMESTAMPTZ,
        settled_at TIMESTAMPTZ,
        response_days INTEGER,
        settlement_days INTEGER,
        
        -- Contact method used
        contact_method VARCHAR(10),
        
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_pnh_provider ON provider_negotiation_history(provider_npi);
      CREATE INDEX IF NOT EXISTS idx_pnh_client ON provider_negotiation_history(client_id);
    `);
  }

  /**
   * Get provider intelligence profile
   */
  async getProfile(clientId: number, npi: string): Promise<ProviderProfile | null> {
    const result = await this.pool.query(`
      SELECT * FROM bill_providers 
      WHERE client_id = $1 AND npi = $2
    `, [clientId, npi]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapRowToProfile(row);
  }

  /**
   * Get optimal offer recommendation for a bill
   */
  async getOfferRecommendation(
    clientId: number,
    providerNpi: string,
    totalBilled: number,
    medicareRate: number,
    defaultSettings: {
      defaultOfferPercent: number;
      minOfferPercent: number;
      maxOfferPercent: number;
    }
  ): Promise<OfferRecommendation> {
    // Get provider profile
    const profile = await this.getProfile(clientId, providerNpi);

    // If no history, use defaults
    if (!profile || profile.totalNegotiations < 3) {
      return {
        initialOfferPercent: defaultSettings.defaultOfferPercent,
        initialOfferAmount: totalBilled * (defaultSettings.defaultOfferPercent / 100),
        maxOfferPercent: defaultSettings.maxOfferPercent,
        maxOfferAmount: totalBilled * (defaultSettings.maxOfferPercent / 100),
        expectedSettlement: totalBilled * (defaultSettings.defaultOfferPercent / 100),
        expectedSavingsPercent: 100 - defaultSettings.defaultOfferPercent,
        preferredContactMethod: 'email',
        confidenceScore: 10,
        reasoning: 'New provider - using default negotiation strategy'
      };
    }

    // Calculate optimal initial offer based on history
    // Strategy: Start slightly below their average acceptance, leave room to negotiate up
    const historicalAcceptancePercent = profile.avgSettlementPercent;
    
    // If they typically accept 45%, start at 40% (leave negotiation room)
    let recommendedInitialPercent = Math.max(
      historicalAcceptancePercent - 5,
      defaultSettings.minOfferPercent
    );

    // If they have high acceptance rate (>70%), we can be more aggressive
    if (profile.acceptanceRate > 70) {
      recommendedInitialPercent = Math.max(
        historicalAcceptancePercent - 3,
        defaultSettings.minOfferPercent
      );
    }

    // Calculate max offer (their typical acceptance + small buffer)
    let recommendedMaxPercent = Math.min(
      historicalAcceptancePercent + 5,
      defaultSettings.maxOfferPercent
    );

    // Determine expected outcome
    const expectedSettlementPercent = profile.counterRate > 50
      ? (recommendedInitialPercent + historicalAcceptancePercent) / 2  // They'll likely counter
      : recommendedInitialPercent;  // They often accept first offer

    return {
      initialOfferPercent: Math.round(recommendedInitialPercent * 10) / 10,
      initialOfferAmount: Math.round(totalBilled * (recommendedInitialPercent / 100) * 100) / 100,
      maxOfferPercent: Math.round(recommendedMaxPercent * 10) / 10,
      maxOfferAmount: Math.round(totalBilled * (recommendedMaxPercent / 100) * 100) / 100,
      expectedSettlement: Math.round(totalBilled * (expectedSettlementPercent / 100) * 100) / 100,
      expectedSavingsPercent: Math.round((100 - expectedSettlementPercent) * 10) / 10,
      preferredContactMethod: profile.preferredContactMethod === 'unknown' ? 'email' : profile.preferredContactMethod,
      confidenceScore: profile.confidenceScore,
      reasoning: this.generateReasoning(profile)
    };
  }

  /**
   * Record a negotiation outcome and update provider intelligence
   */
  async recordNegotiationOutcome(data: {
    clientId: number;
    providerNpi: string;
    billId: number;
    negotiationId: number;
    totalBilled: number;
    medicareRate?: number;
    initialOffer: number;
    responseType: 'accepted' | 'countered' | 'rejected' | 'no_response';
    counterAmount?: number;
    finalAmount?: number;
    contactMethod: 'email' | 'fax';
    offerSentAt: Date;
    responseReceivedAt?: Date;
    settledAt?: Date;
  }): Promise<void> {
    const {
      clientId, providerNpi, billId, negotiationId,
      totalBilled, medicareRate, initialOffer,
      responseType, counterAmount, finalAmount,
      contactMethod, offerSentAt, responseReceivedAt, settledAt
    } = data;

    // Calculate percentages
    const initialOfferPercent = (initialOffer / totalBilled) * 100;
    const settlementPercent = finalAmount ? (finalAmount / totalBilled) * 100 : null;
    const savingsPercent = finalAmount ? ((totalBilled - finalAmount) / totalBilled) * 100 : null;
    
    // Calculate timing
    const responseDays = responseReceivedAt 
      ? Math.floor((responseReceivedAt.getTime() - offerSentAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const settlementDays = settledAt
      ? Math.floor((settledAt.getTime() - offerSentAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Record in history table
    await this.pool.query(`
      INSERT INTO provider_negotiation_history (
        client_id, provider_npi, bill_id, negotiation_id,
        total_billed, medicare_rate, initial_offer, initial_offer_percent,
        response_type, counter_amount, final_amount, settlement_percent, savings_percent,
        offer_sent_at, response_received_at, settled_at, response_days, settlement_days,
        contact_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      clientId, providerNpi, billId, negotiationId,
      totalBilled, medicareRate, initialOffer, initialOfferPercent,
      responseType, counterAmount, finalAmount, settlementPercent, savingsPercent,
      offerSentAt, responseReceivedAt, settledAt, responseDays, settlementDays,
      contactMethod
    ]);

    // Update provider aggregate stats
    await this.updateProviderStats(clientId, providerNpi);
  }

  /**
   * Recalculate provider stats from history
   */
  async updateProviderStats(clientId: number, providerNpi: string): Promise<void> {
    // Get aggregated stats from history
    const statsResult = await this.pool.query(`
      SELECT 
        COUNT(*) as total_negotiations,
        AVG(settlement_percent) as avg_settlement_percent,
        COUNT(*) FILTER (WHERE response_type = 'accepted') as accepted_count,
        COUNT(*) FILTER (WHERE response_type = 'countered') as countered_count,
        COUNT(*) FILTER (WHERE response_type = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE response_type = 'no_response') as no_response_count,
        AVG(response_days) FILTER (WHERE response_days IS NOT NULL) as avg_response_days,
        AVG(settlement_days) FILTER (WHERE settlement_days IS NOT NULL) as avg_settlement_days,
        AVG(settlement_percent) FILTER (WHERE contact_method = 'email' AND final_amount IS NOT NULL) as email_settlement,
        AVG(settlement_percent) FILTER (WHERE contact_method = 'fax' AND final_amount IS NOT NULL) as fax_settlement,
        COUNT(*) FILTER (WHERE contact_method = 'email' AND response_type != 'no_response') as email_responses,
        COUNT(*) FILTER (WHERE contact_method = 'email') as email_total,
        COUNT(*) FILTER (WHERE contact_method = 'fax' AND response_type != 'no_response') as fax_responses,
        COUNT(*) FILTER (WHERE contact_method = 'fax') as fax_total,
        AVG(final_amount) FILTER (WHERE final_amount IS NOT NULL) as avg_settlement_amount,
        AVG(savings_percent) FILTER (WHERE savings_percent IS NOT NULL) as avg_savings_percent
      FROM provider_negotiation_history
      WHERE client_id = $1 AND provider_npi = $2
    `, [clientId, providerNpi]);

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total_negotiations) || 0;
    
    if (total === 0) return;

    // Calculate rates
    const acceptanceRate = (parseInt(stats.accepted_count) / total) * 100;
    const counterRate = (parseInt(stats.countered_count) / total) * 100;
    const rejectionRate = (parseInt(stats.rejected_count) / total) * 100;
    
    const emailResponseRate = stats.email_total > 0 
      ? (parseInt(stats.email_responses) / parseInt(stats.email_total)) * 100 
      : null;
    const faxResponseRate = stats.fax_total > 0 
      ? (parseInt(stats.fax_responses) / parseInt(stats.fax_total)) * 100 
      : null;

    // Determine preferred contact method
    let preferredMethod = 'email';
    if (emailResponseRate !== null && faxResponseRate !== null) {
      preferredMethod = emailResponseRate >= faxResponseRate ? 'email' : 'fax';
    }

    // Calculate recommended offers based on history
    const avgSettlement = parseFloat(stats.avg_settlement_percent) || 50;
    const recommendedInitial = Math.max(avgSettlement - 5, 30);
    const recommendedMax = Math.min(avgSettlement + 5, 75);
    const autoAcceptThreshold = 5; // Accept counters within 5% of our offer

    // Calculate confidence score (more data = higher confidence)
    let confidenceScore = Math.min(total * 10, 100); // 10 points per negotiation, max 100
    if (total < 3) confidenceScore = Math.min(confidenceScore, 30); // Low confidence with few data points

    // Update provider record
    await this.pool.query(`
      INSERT INTO bill_providers (client_id, npi, total_negotiations, avg_settlement_percent, 
        acceptance_rate, counter_rate, rejection_rate, avg_response_days, avg_settlement_days,
        email_response_rate, fax_response_rate, preferred_contact_method,
        recommended_initial_offer, recommended_max_offer, auto_accept_threshold,
        confidence_score, avg_settlement_amount, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (client_id, npi) DO UPDATE SET
        total_negotiations = $3,
        avg_settlement_percent = $4,
        acceptance_rate = $5,
        counter_rate = $6,
        rejection_rate = $7,
        avg_response_days = $8,
        avg_settlement_days = $9,
        email_response_rate = $10,
        fax_response_rate = $11,
        preferred_contact_method = $12,
        recommended_initial_offer = $13,
        recommended_max_offer = $14,
        auto_accept_threshold = $15,
        confidence_score = $16,
        avg_settlement_amount = $17,
        updated_at = NOW()
    `, [
      clientId, providerNpi, total, avgSettlement,
      acceptanceRate, counterRate, rejectionRate,
      stats.avg_response_days, stats.avg_settlement_days,
      emailResponseRate, faxResponseRate, preferredMethod,
      recommendedInitial, recommendedMax, autoAcceptThreshold,
      confidenceScore, stats.avg_settlement_amount
    ]);

    console.log(`[PROVIDER-INTEL] Updated stats for ${providerNpi}: ${total} negotiations, ${avgSettlement.toFixed(1)}% avg settlement, ${confidenceScore} confidence`);
  }

  /**
   * Get top providers by negotiation volume
   */
  async getTopProviders(clientId: number, limit: number = 20): Promise<ProviderProfile[]> {
    const result = await this.pool.query(`
      SELECT * FROM bill_providers 
      WHERE client_id = $1 AND total_negotiations > 0
      ORDER BY total_negotiations DESC
      LIMIT $2
    `, [clientId, limit]);

    return result.rows.map(row => this.mapRowToProfile(row));
  }

  /**
   * Get providers needing more data (low confidence)
   */
  async getLowConfidenceProviders(clientId: number, limit: number = 20): Promise<ProviderProfile[]> {
    const result = await this.pool.query(`
      SELECT * FROM bill_providers 
      WHERE client_id = $1 
        AND total_negotiations BETWEEN 1 AND 5
        AND confidence_score < 50
      ORDER BY total_negotiations DESC
      LIMIT $2
    `, [clientId, limit]);

    return result.rows.map(row => this.mapRowToProfile(row));
  }

  /**
   * Generate human-readable reasoning for offer recommendation
   */
  private generateReasoning(profile: ProviderProfile): string {
    const parts: string[] = [];

    parts.push(`Based on ${profile.totalNegotiations} previous negotiations with this provider.`);

    if (profile.avgSettlementPercent) {
      parts.push(`They typically settle at ${profile.avgSettlementPercent.toFixed(1)}% of billed charges.`);
    }

    if (profile.acceptanceRate > 60) {
      parts.push(`High acceptance rate (${profile.acceptanceRate.toFixed(0)}%) - they often accept first offers.`);
    } else if (profile.counterRate > 60) {
      parts.push(`They usually counter (${profile.counterRate.toFixed(0)}% of the time) - expect negotiation.`);
    }

    if (profile.preferredContactMethod !== 'unknown') {
      parts.push(`Best contacted via ${profile.preferredContactMethod}.`);
    }

    if (profile.avgResponseDays) {
      parts.push(`Average response time: ${profile.avgResponseDays.toFixed(0)} days.`);
    }

    return parts.join(' ');
  }

  /**
   * Map database row to ProviderProfile
   */
  private mapRowToProfile(row: any): ProviderProfile {
    return {
      npi: row.npi,
      name: row.name || 'Unknown',
      totalNegotiations: parseInt(row.total_negotiations) || 0,
      avgSettlementPercent: parseFloat(row.avg_settlement_percent) || 0,
      avgSettlementMultiplier: row.avg_settlement_amount && row.medicare_rate 
        ? row.avg_settlement_amount / row.medicare_rate 
        : 0,
      acceptanceRate: parseFloat(row.acceptance_rate) || 0,
      counterRate: parseFloat(row.counter_rate) || 0,
      rejectionRate: parseFloat(row.rejection_rate) || 0,
      avgResponseDays: parseFloat(row.avg_response_days) || 0,
      avgSettlementDays: parseFloat(row.avg_settlement_days) || 0,
      preferredContactMethod: row.preferred_contact_method || 'unknown',
      emailResponseRate: parseFloat(row.email_response_rate) || 0,
      faxResponseRate: parseFloat(row.fax_response_rate) || 0,
      recommendedInitialOffer: parseFloat(row.recommended_initial_offer) || 50,
      recommendedMaxOffer: parseFloat(row.recommended_max_offer) || 75,
      autoAcceptThreshold: parseFloat(row.auto_accept_threshold) || 5,
      confidenceScore: parseInt(row.confidence_score) || 0,
      lastUpdated: row.updated_at
    };
  }
}
