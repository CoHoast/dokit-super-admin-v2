/**
 * Provider Email Registry Service
 * Manages verified provider billing emails
 */

import { pool } from '@/lib/db';
import { validateEmail } from '@/lib/email-validator';

export interface ProviderRecord {
  id: string;
  npi: string;
  taxId?: string;
  providerName: string;
  providerType?: string;
  specialty?: string;
  verifiedEmail?: string;
  verifiedAt?: Date;
  verificationMethod?: string;
  confidence: number;
  billingPhone?: string;
  billingFax?: string;
  billingAddress?: string;
  alternativeEmails: string[];
  totalOffersSent: number;
  totalResponses: number;
  lastOfferSent?: Date;
  lastResponse?: Date;
  responseRate: number;
  status: 'unverified' | 'verified' | 'invalid' | 'review_needed';
  source: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface EmailLookupResult {
  found: boolean;
  npi: string;
  email?: string;
  confidence: number;
  status: string;
  source: string;
  verifiedAt?: Date;
  alternativeEmails?: string[];
  recommendation: 'use' | 'verify_first' | 'extract_from_bill' | 'manual_review';
}

/**
 * Look up provider by NPI and get best email
 */
export async function lookupProviderEmail(npi: string): Promise<EmailLookupResult> {
  try {
    const result = await pool.query(`
      SELECT * FROM provider_email_registry WHERE npi = $1
    `, [npi]);

    if (result.rows.length === 0) {
      return {
        found: false,
        npi,
        confidence: 0,
        status: 'not_found',
        source: 'none',
        recommendation: 'extract_from_bill',
      };
    }

    const provider = result.rows[0];
    
    // Determine recommendation based on status and confidence
    let recommendation: EmailLookupResult['recommendation'] = 'extract_from_bill';
    
    if (provider.status === 'verified' && provider.confidence >= 90) {
      recommendation = 'use';
    } else if (provider.status === 'verified' && provider.confidence >= 70) {
      recommendation = 'use';
    } else if (provider.verified_email && provider.confidence >= 50) {
      recommendation = 'verify_first';
    } else if (provider.status === 'invalid' || provider.status === 'review_needed') {
      recommendation = 'manual_review';
    }

    return {
      found: true,
      npi,
      email: provider.verified_email,
      confidence: provider.confidence,
      status: provider.status,
      source: provider.source,
      verifiedAt: provider.verified_at,
      alternativeEmails: provider.alternative_emails || [],
      recommendation,
    };
  } catch (error) {
    console.error('[ProviderRegistry] Lookup error:', error);
    throw error;
  }
}

/**
 * Register or update a provider email
 */
export async function registerProviderEmail(data: {
  npi: string;
  providerName: string;
  email: string;
  taxId?: string;
  providerType?: string;
  specialty?: string;
  billingPhone?: string;
  billingFax?: string;
  billingAddress?: string;
  source?: string;
  sourceBillId?: string;
  confidence?: number;
}): Promise<ProviderRecord> {
  try {
    // Validate email first
    const validation = await validateEmail(data.email, data.confidence || 50);
    
    const initialConfidence = validation.isValid ? (data.confidence || 50) : 20;
    const status = validation.isValid ? 'unverified' : 'review_needed';

    const result = await pool.query(`
      INSERT INTO provider_email_registry (
        npi, provider_name, verified_email, tax_id, provider_type, specialty,
        billing_phone, billing_fax, billing_address, source, source_bill_id,
        confidence, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (npi) DO UPDATE SET
        provider_name = COALESCE(EXCLUDED.provider_name, provider_email_registry.provider_name),
        tax_id = COALESCE(EXCLUDED.tax_id, provider_email_registry.tax_id),
        provider_type = COALESCE(EXCLUDED.provider_type, provider_email_registry.provider_type),
        specialty = COALESCE(EXCLUDED.specialty, provider_email_registry.specialty),
        billing_phone = COALESCE(EXCLUDED.billing_phone, provider_email_registry.billing_phone),
        billing_fax = COALESCE(EXCLUDED.billing_fax, provider_email_registry.billing_fax),
        billing_address = COALESCE(EXCLUDED.billing_address, provider_email_registry.billing_address),
        -- Only update email if current one is unverified or new one has higher confidence
        verified_email = CASE 
          WHEN provider_email_registry.status != 'verified' THEN EXCLUDED.verified_email
          ELSE provider_email_registry.verified_email
        END,
        confidence = CASE
          WHEN EXCLUDED.confidence > provider_email_registry.confidence 
               AND provider_email_registry.status != 'verified'
          THEN EXCLUDED.confidence
          ELSE provider_email_registry.confidence
        END,
        updated_at = NOW()
      RETURNING *
    `, [
      data.npi,
      data.providerName,
      data.email,
      data.taxId,
      data.providerType,
      data.specialty,
      data.billingPhone,
      data.billingFax,
      data.billingAddress,
      data.source || 'extraction',
      data.sourceBillId,
      initialConfidence,
      status,
    ]);

    // Also log to email history
    await pool.query(`
      INSERT INTO provider_email_history (npi, email, source, mx_valid, mx_checked_at, provider_id)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT (npi, email) DO UPDATE SET
        times_used = provider_email_history.times_used,
        mx_valid = EXCLUDED.mx_valid,
        mx_checked_at = NOW()
    `, [
      data.npi,
      data.email,
      data.source || 'extraction',
      validation.hasMxRecords,
      result.rows[0].id,
    ]);

    return mapRowToProvider(result.rows[0]);
  } catch (error) {
    console.error('[ProviderRegistry] Register error:', error);
    throw error;
  }
}

/**
 * Verify an email (called when provider responds)
 */
export async function verifyProviderEmail(data: {
  npi: string;
  email: string;
  verificationType: 'portal_click' | 'offer_accepted' | 'offer_countered' | 'email_reply' | 'manual';
  verificationSource?: string;
  ipAddress?: string;
  userAgent?: string;
  verifiedBy?: string;
}): Promise<ProviderRecord | null> {
  try {
    // Update registry to verified status
    const result = await pool.query(`
      UPDATE provider_email_registry
      SET 
        verified_email = $2,
        verified_at = NOW(),
        verification_method = $3,
        confidence = 100,
        status = 'verified',
        total_responses = total_responses + 1,
        last_response = NOW(),
        response_rate = CASE 
          WHEN total_offers_sent > 0 
          THEN ((total_responses + 1)::decimal / total_offers_sent * 100)
          ELSE 100
        END,
        updated_at = NOW()
      WHERE npi = $1
      RETURNING *
    `, [data.npi, data.email, data.verificationType]);

    if (result.rows.length === 0) {
      // Provider not in registry, create them
      return await registerProviderEmail({
        npi: data.npi,
        providerName: 'Unknown Provider',
        email: data.email,
        source: 'response_verified',
        confidence: 100,
      });
    }

    // Log verification event
    await pool.query(`
      INSERT INTO provider_email_verifications 
        (provider_id, npi, email, verification_type, verification_source, ip_address, user_agent, verified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      result.rows[0].id,
      data.npi,
      data.email,
      data.verificationType,
      data.verificationSource,
      data.ipAddress,
      data.userAgent,
      data.verifiedBy || 'system',
    ]);

    // Update email history
    await pool.query(`
      UPDATE provider_email_history
      SET 
        status = 'working',
        times_responded = times_responded + 1,
        last_outcome = $3,
        last_outcome_at = NOW()
      WHERE npi = $1 AND email = $2
    `, [data.npi, data.email, data.verificationType]);

    return mapRowToProvider(result.rows[0]);
  } catch (error) {
    console.error('[ProviderRegistry] Verify error:', error);
    throw error;
  }
}

/**
 * Mark email as bounced/invalid
 */
export async function markEmailBounced(npi: string, email: string, reason?: string): Promise<void> {
  try {
    // Update history
    await pool.query(`
      UPDATE provider_email_history
      SET 
        status = 'bounced',
        times_bounced = times_bounced + 1,
        last_outcome = 'bounced',
        last_outcome_at = NOW()
      WHERE npi = $1 AND email = $2
    `, [npi, email]);

    // Check if this was the verified email
    const result = await pool.query(`
      SELECT verified_email FROM provider_email_registry WHERE npi = $1
    `, [npi]);

    if (result.rows.length > 0 && result.rows[0].verified_email === email) {
      // Demote to review_needed
      await pool.query(`
        UPDATE provider_email_registry
        SET 
          status = 'review_needed',
          confidence = 0,
          notes = COALESCE(notes, '') || E'\n' || $2,
          updated_at = NOW()
        WHERE npi = $1
      `, [npi, `[${new Date().toISOString()}] Email bounced: ${reason || 'unknown reason'}`]);
    }
  } catch (error) {
    console.error('[ProviderRegistry] Mark bounced error:', error);
    throw error;
  }
}

/**
 * Record that an offer was sent
 */
export async function recordOfferSent(npi: string, email: string): Promise<void> {
  try {
    await pool.query(`
      UPDATE provider_email_registry
      SET 
        total_offers_sent = total_offers_sent + 1,
        last_offer_sent = NOW(),
        response_rate = CASE 
          WHEN total_offers_sent > 0 
          THEN (total_responses::decimal / (total_offers_sent + 1) * 100)
          ELSE 0
        END,
        updated_at = NOW()
      WHERE npi = $1
    `, [npi]);

    await pool.query(`
      UPDATE provider_email_history
      SET 
        times_used = times_used + 1,
        last_used = NOW()
      WHERE npi = $1 AND email = $2
    `, [npi, email]);
  } catch (error) {
    console.error('[ProviderRegistry] Record offer error:', error);
  }
}

/**
 * Bulk import providers (from Solidarity data)
 */
export async function bulkImportProviders(providers: Array<{
  npi: string;
  providerName: string;
  email: string;
  taxId?: string;
  phone?: string;
  fax?: string;
}>): Promise<{ imported: number; failed: number; errors: string[] }> {
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      await registerProviderEmail({
        npi: provider.npi,
        providerName: provider.providerName,
        email: provider.email,
        taxId: provider.taxId,
        billingPhone: provider.phone,
        billingFax: provider.fax,
        source: 'solidarity_import',
        confidence: 70, // Imported data gets 70% confidence
      });
      imported++;
    } catch (error: any) {
      failed++;
      errors.push(`NPI ${provider.npi}: ${error.message}`);
    }
  }

  return { imported, failed, errors };
}

/**
 * Get providers needing review
 */
export async function getProvidersNeedingReview(limit = 50): Promise<ProviderRecord[]> {
  const result = await pool.query(`
    SELECT * FROM provider_email_registry
    WHERE status = 'review_needed'
       OR (status = 'unverified' AND confidence < 50)
       OR (total_offers_sent > 3 AND total_responses = 0)
    ORDER BY 
      CASE WHEN status = 'review_needed' THEN 0 ELSE 1 END,
      total_offers_sent DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map(mapRowToProvider);
}

/**
 * Get registry statistics
 */
export async function getRegistryStats(): Promise<{
  totalProviders: number;
  verifiedProviders: number;
  unverifiedProviders: number;
  reviewNeeded: number;
  averageConfidence: number;
  averageResponseRate: number;
  totalOffersSent: number;
  totalResponses: number;
}> {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_providers,
      COUNT(*) FILTER (WHERE status = 'verified') as verified_providers,
      COUNT(*) FILTER (WHERE status = 'unverified') as unverified_providers,
      COUNT(*) FILTER (WHERE status = 'review_needed') as review_needed,
      AVG(confidence) as avg_confidence,
      AVG(response_rate) FILTER (WHERE total_offers_sent > 0) as avg_response_rate,
      SUM(total_offers_sent) as total_offers_sent,
      SUM(total_responses) as total_responses
    FROM provider_email_registry
  `);

  const row = result.rows[0];
  return {
    totalProviders: parseInt(row.total_providers) || 0,
    verifiedProviders: parseInt(row.verified_providers) || 0,
    unverifiedProviders: parseInt(row.unverified_providers) || 0,
    reviewNeeded: parseInt(row.review_needed) || 0,
    averageConfidence: parseFloat(row.avg_confidence) || 0,
    averageResponseRate: parseFloat(row.avg_response_rate) || 0,
    totalOffersSent: parseInt(row.total_offers_sent) || 0,
    totalResponses: parseInt(row.total_responses) || 0,
  };
}

/**
 * Search providers
 */
export async function searchProviders(query: string, limit = 20): Promise<ProviderRecord[]> {
  const result = await pool.query(`
    SELECT * FROM provider_email_registry
    WHERE 
      npi ILIKE $1
      OR provider_name ILIKE $1
      OR verified_email ILIKE $1
    ORDER BY 
      CASE WHEN status = 'verified' THEN 0 ELSE 1 END,
      confidence DESC
    LIMIT $2
  `, [`%${query}%`, limit]);

  return result.rows.map(mapRowToProvider);
}

// Helper to map database row to typed object
function mapRowToProvider(row: any): ProviderRecord {
  return {
    id: row.id,
    npi: row.npi,
    taxId: row.tax_id,
    providerName: row.provider_name,
    providerType: row.provider_type,
    specialty: row.specialty,
    verifiedEmail: row.verified_email,
    verifiedAt: row.verified_at,
    verificationMethod: row.verification_method,
    confidence: row.confidence,
    billingPhone: row.billing_phone,
    billingFax: row.billing_fax,
    billingAddress: row.billing_address,
    alternativeEmails: row.alternative_emails || [],
    totalOffersSent: row.total_offers_sent,
    totalResponses: row.total_responses,
    lastOfferSent: row.last_offer_sent,
    lastResponse: row.last_response,
    responseRate: parseFloat(row.response_rate) || 0,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes,
  };
}
