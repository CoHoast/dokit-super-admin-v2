import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Medicare rate multipliers for fair price calculation
const FAIR_PRICE_MULTIPLIER = 1.50; // 150% of Medicare
const MAX_ACCEPTABLE_MULTIPLIER = 2.00; // 200% of Medicare
const WALK_AWAY_MULTIPLIER = 2.50; // 250% of Medicare (never exceed)

interface LineItem {
  cptCode: string;
  description?: string;
  units: number;
  billedAmount: number;
  modifier?: string;
}

interface FairPriceResult {
  cptCode: string;
  description: string;
  units: number;
  billedAmount: number;
  medicareRate: number;
  adjustedMedicareRate: number;
  fairPrice: number;
  maxAcceptable: number;
  walkAwayMax: number;
  percentOfMedicare: number;
  potentialSavings: number;
}

// POST /api/bill-negotiator/calculate-fair-price
export async function POST(request: NextRequest) {
  try {
    const { lineItems, state = 'OH', locality = '00' } = await request.json();

    if (!lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json({ error: 'lineItems array is required' }, { status: 400 });
    }

    const results: FairPriceResult[] = [];
    let totalBilled = 0;
    let totalMedicare = 0;
    let totalFairPrice = 0;

    for (const item of lineItems as LineItem[]) {
      // Look up Medicare rate from cache first
      let medicareRate = await getMedicareRate(item.cptCode, state, locality);

      // If not in cache, fetch from CMS API and cache it
      if (!medicareRate) {
        medicareRate = await fetchCMSRate(item.cptCode);
        if (medicareRate) {
          await cacheMedicareRate(item.cptCode, medicareRate, state, locality);
        }
      }

      // Default to estimate if no rate found
      if (!medicareRate) {
        // Estimate at 20% of billed as Medicare baseline (conservative)
        medicareRate = item.billedAmount * 0.20;
      }

      // Apply GPCI adjustment (Geographic Practice Cost Index)
      // For now using 1.0, will integrate GPCI data later
      const gpciAdjustment = 1.0;
      const adjustedMedicareRate = medicareRate * gpciAdjustment * item.units;

      const fairPrice = adjustedMedicareRate * FAIR_PRICE_MULTIPLIER;
      const maxAcceptable = adjustedMedicareRate * MAX_ACCEPTABLE_MULTIPLIER;
      const walkAwayMax = adjustedMedicareRate * WALK_AWAY_MULTIPLIER;
      const percentOfMedicare = (item.billedAmount / adjustedMedicareRate) * 100;
      const potentialSavings = item.billedAmount - fairPrice;

      results.push({
        cptCode: item.cptCode,
        description: item.description || '',
        units: item.units,
        billedAmount: item.billedAmount,
        medicareRate,
        adjustedMedicareRate,
        fairPrice,
        maxAcceptable,
        walkAwayMax,
        percentOfMedicare,
        potentialSavings
      });

      totalBilled += item.billedAmount;
      totalMedicare += adjustedMedicareRate;
      totalFairPrice += fairPrice;
    }

    const summary = {
      totalBilled,
      totalMedicareRate: totalMedicare,
      totalFairPrice,
      totalMaxAcceptable: totalMedicare * MAX_ACCEPTABLE_MULTIPLIER,
      totalWalkAwayMax: totalMedicare * WALK_AWAY_MULTIPLIER,
      totalPotentialSavings: totalBilled - totalFairPrice,
      potentialSavingsPercent: ((totalBilled - totalFairPrice) / totalBilled) * 100,
      initialOffer: totalFairPrice,
      maxOffer: totalMedicare * MAX_ACCEPTABLE_MULTIPLIER
    };

    return NextResponse.json({
      lineItems: results,
      summary,
      multipliers: {
        fairPrice: FAIR_PRICE_MULTIPLIER,
        maxAcceptable: MAX_ACCEPTABLE_MULTIPLIER,
        walkAway: WALK_AWAY_MULTIPLIER
      }
    });

  } catch (error: any) {
    console.error('Error calculating fair price:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Get Medicare rate from local cache
async function getMedicareRate(code: string, state: string, locality: string): Promise<number | null> {
  try {
    const result = await pool.query(`
      SELECT national_rate, facility_rate, non_facility_rate
      FROM medicare_rates
      WHERE code = $1 AND code_type = 'cpt'
      ORDER BY effective_date DESC
      LIMIT 1
    `, [code]);

    if (result.rows.length > 0) {
      // Use facility rate if available, otherwise national
      return result.rows[0].facility_rate || result.rows[0].national_rate || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch rate from CMS MPFS API (Physician Fee Schedule)
async function fetchCMSRate(cptCode: string): Promise<number | null> {
  try {
    // CMS MPFS Lookup Tool API
    // https://www.cms.gov/Medicare/Medicare-Fee-for-Service-Payment/PFSlookup
    // For now, we'll use a lookup table of common codes
    // In production, this would hit the actual CMS API
    
    const commonRates: Record<string, number> = {
      // Office visits
      '99213': 92.00,
      '99214': 130.00,
      '99215': 175.00,
      // Imaging
      '73721': 198.45, // MRI knee
      '73722': 252.00, // MRI knee with contrast
      '77002': 62.18,  // Fluoroscopic guidance
      // Procedures
      '20610': 87.32, // Joint injection
      '20611': 95.00, // Joint aspiration
      // Labs
      '80053': 14.00, // Comprehensive metabolic panel
      '85025': 11.00, // CBC
      // X-rays
      '73560': 25.00, // Knee x-ray
      '72100': 35.00, // Spine x-ray
      // Emergency
      '99283': 85.00, // ED visit level 3
      '99284': 130.00, // ED visit level 4
      '99285': 200.00, // ED visit level 5
    };

    return commonRates[cptCode] || null;

  } catch (error) {
    console.error('Error fetching CMS rate:', error);
    return null;
  }
}

// Cache Medicare rate
async function cacheMedicareRate(code: string, rate: number, state: string, locality: string): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO medicare_rates (code, code_type, national_rate, facility_rate, source, effective_date)
      VALUES ($1, 'cpt', $2, $2, 'mpfs', CURRENT_DATE)
      ON CONFLICT (code, code_type, mac, locality) DO UPDATE
      SET national_rate = $2, facility_rate = $2, last_updated = NOW()
    `, [code, rate]);
  } catch (error) {
    console.error('Error caching Medicare rate:', error);
  }
}
