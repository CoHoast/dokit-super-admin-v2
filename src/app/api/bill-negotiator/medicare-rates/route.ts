import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// CMS API endpoints (all FREE)
const CMS_APIS = {
  // Medicare Physician Fee Schedule (MPFS)
  MPFS: 'https://data.cms.gov/data-api/v1/dataset/8889daef-f254-4270-bff6-976a7377a2ff/data',
  // Hospital Outpatient (OPPS)
  OPPS: 'https://data.cms.gov/data-api/v1/dataset/a3d12a9e-8be0-4b86-9b22-d3c5b2e8c5f1/data',
  // NPPES Provider Lookup
  NPPES: 'https://npiregistry.cms.hhs.gov/api/?version=2.1'
};

// GET /api/bill-negotiator/medicare-rates - Calculate fair price for CPT codes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const codes = searchParams.get('codes')?.split(',') || [];
    const state = searchParams.get('state') || 'OH';
    const locality = searchParams.get('locality') || '00';
    const multiplier = parseFloat(searchParams.get('multiplier') || '1.5');

    if (codes.length === 0) {
      return NextResponse.json({ error: 'codes parameter required' }, { status: 400 });
    }

    const results = [];

    for (const code of codes) {
      const trimmedCode = code.trim();
      
      // First check cache
      const cached = await pool.query(`
        SELECT * FROM medicare_rates 
        WHERE code = $1 
        ORDER BY last_updated DESC 
        LIMIT 1
      `, [trimmedCode]);

      if (cached.rows.length > 0) {
        const rate = cached.rows[0];
        results.push({
          code: trimmedCode,
          description: rate.description,
          medicareRate: parseFloat(rate.national_rate || rate.facility_rate || 0),
          facilityRate: parseFloat(rate.facility_rate || 0),
          nonFacilityRate: parseFloat(rate.non_facility_rate || 0),
          fairPrice: parseFloat(rate.national_rate || rate.facility_rate || 0) * multiplier,
          multiplier,
          source: rate.source,
          cached: true
        });
      } else {
        // Try to fetch from CMS (simplified for now - would need real API integration)
        // For MVP, we'll use estimated rates based on code ranges
        const estimatedRate = estimateMedicareRate(trimmedCode);
        
        results.push({
          code: trimmedCode,
          description: estimatedRate.description,
          medicareRate: estimatedRate.rate,
          facilityRate: estimatedRate.rate,
          nonFacilityRate: estimatedRate.rate * 1.2,
          fairPrice: estimatedRate.rate * multiplier,
          multiplier,
          source: 'estimated',
          cached: false
        });

        // Cache the estimated rate
        await pool.query(`
          INSERT INTO medicare_rates (code, code_type, description, national_rate, facility_rate, source)
          VALUES ($1, $2, $3, $4, $4, 'estimated')
          ON CONFLICT (code, code_type, mac, locality) DO UPDATE SET
            national_rate = EXCLUDED.national_rate,
            last_updated = NOW()
        `, [trimmedCode, getCodeType(trimmedCode), estimatedRate.description, estimatedRate.rate]);
      }
    }

    // Calculate totals
    const totalMedicare = results.reduce((sum, r) => sum + r.medicareRate, 0);
    const totalFairPrice = results.reduce((sum, r) => sum + r.fairPrice, 0);

    return NextResponse.json({
      rates: results,
      totals: {
        medicare: totalMedicare,
        fairPrice: totalFairPrice,
        multiplier
      },
      state,
      locality
    });

  } catch (error: any) {
    console.error('Error calculating medicare rates:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST /api/bill-negotiator/medicare-rates - Calculate fair price for line items
export async function POST(request: NextRequest) {
  try {
    const { lineItems, state, locality, multiplier = 1.5 } = await request.json();

    if (!lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json({ error: 'lineItems array required' }, { status: 400 });
    }

    const results = [];

    for (const item of lineItems) {
      const code = item.code || item.cpt || item.hcpcs;
      const units = item.units || item.quantity || 1;
      const billed = item.billed || item.charge || item.amount || 0;

      if (!code) continue;

      // Get Medicare rate
      const cached = await pool.query(`
        SELECT * FROM medicare_rates WHERE code = $1 LIMIT 1
      `, [code]);

      let medicareRate = 0;
      let description = item.description || '';
      let source = 'estimated';

      if (cached.rows.length > 0) {
        medicareRate = parseFloat(cached.rows[0].national_rate || cached.rows[0].facility_rate || 0);
        description = cached.rows[0].description || description;
        source = cached.rows[0].source;
      } else {
        const estimated = estimateMedicareRate(code);
        medicareRate = estimated.rate;
        description = description || estimated.description;
      }

      const unitMedicareRate = medicareRate;
      const totalMedicareRate = medicareRate * units;
      const fairPrice = totalMedicareRate * multiplier;
      const savings = billed - fairPrice;
      const savingsPercent = billed > 0 ? (savings / billed) * 100 : 0;
      const billedToMedicare = billed > 0 ? (billed / totalMedicareRate * 100) : 0;

      results.push({
        code,
        description,
        units,
        billed,
        unitMedicareRate,
        totalMedicareRate,
        fairPrice,
        savings,
        savingsPercent: Math.round(savingsPercent * 10) / 10,
        billedToMedicarePercent: Math.round(billedToMedicare),
        source
      });
    }

    // Calculate totals
    const totalBilled = results.reduce((sum, r) => sum + r.billed, 0);
    const totalMedicare = results.reduce((sum, r) => sum + r.totalMedicareRate, 0);
    const totalFairPrice = results.reduce((sum, r) => sum + r.fairPrice, 0);
    const totalSavings = totalBilled - totalFairPrice;
    const totalSavingsPercent = totalBilled > 0 ? (totalSavings / totalBilled) * 100 : 0;

    return NextResponse.json({
      lineItems: results,
      totals: {
        billed: totalBilled,
        medicare: totalMedicare,
        fairPrice: totalFairPrice,
        savings: totalSavings,
        savingsPercent: Math.round(totalSavingsPercent * 10) / 10,
        multiplier
      },
      negotiationThresholds: {
        initialOffer: totalFairPrice,
        maxAcceptable: totalMedicare * 1.75,
        walkAwayMax: totalMedicare * 2.0,
        neverExceed: totalMedicare * 2.5
      }
    });

  } catch (error: any) {
    console.error('Error calculating fair price:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Helper: Determine code type
function getCodeType(code: string): string {
  if (/^[0-9]{5}$/.test(code)) return 'cpt';
  if (/^[A-Z][0-9]{4}$/.test(code)) return 'hcpcs';
  if (/^[0-9]{3}$/.test(code)) return 'drg';
  return 'other';
}

// Helper: Estimate Medicare rate based on code ranges
// This is a simplified estimation - real implementation would use CMS API
function estimateMedicareRate(code: string): { rate: number; description: string } {
  const codeNum = parseInt(code.replace(/[^0-9]/g, ''));
  
  // E/M codes (99201-99499)
  if (codeNum >= 99201 && codeNum <= 99215) {
    return { rate: 75 + (codeNum - 99201) * 15, description: 'Office/Outpatient Visit' };
  }
  if (codeNum >= 99221 && codeNum <= 99223) {
    return { rate: 150 + (codeNum - 99221) * 50, description: 'Initial Hospital Care' };
  }
  
  // Surgery codes (10000-69999)
  if (codeNum >= 10000 && codeNum < 20000) {
    return { rate: 200, description: 'Integumentary System Procedure' };
  }
  if (codeNum >= 20000 && codeNum < 30000) {
    return { rate: 350, description: 'Musculoskeletal Procedure' };
  }
  if (codeNum >= 30000 && codeNum < 40000) {
    return { rate: 400, description: 'Respiratory Procedure' };
  }
  if (codeNum >= 40000 && codeNum < 50000) {
    return { rate: 450, description: 'Digestive System Procedure' };
  }
  
  // Radiology (70000-79999)
  if (codeNum >= 70000 && codeNum < 72000) {
    return { rate: 150, description: 'Head/Neck Imaging' };
  }
  if (codeNum >= 72000 && codeNum < 74000) {
    return { rate: 175, description: 'Spine/Pelvis Imaging' };
  }
  if (codeNum >= 74000 && codeNum < 76000) {
    return { rate: 200, description: 'GI/GU Imaging' };
  }
  if (codeNum >= 76000 && codeNum < 77000) {
    return { rate: 125, description: 'Ultrasound' };
  }
  if (codeNum >= 77000 && codeNum < 78000) {
    return { rate: 100, description: 'Radiation Oncology' };
  }
  
  // Lab (80000-89999)
  if (codeNum >= 80000 && codeNum < 90000) {
    return { rate: 25, description: 'Laboratory Test' };
  }
  
  // Medicine (90000-99999)
  if (codeNum >= 90000 && codeNum < 92000) {
    return { rate: 50, description: 'Immunization/Injection' };
  }
  if (codeNum >= 92000 && codeNum < 94000) {
    return { rate: 75, description: 'Special Services' };
  }
  if (codeNum >= 94000 && codeNum < 96000) {
    return { rate: 100, description: 'Pulmonary/Allergy Testing' };
  }
  
  // Default
  return { rate: 100, description: 'Medical Service' };
}
