/**
 * Bulk Provider Import API
 * POST /api/providers/import
 * 
 * Import providers from CSV or JSON (e.g., Solidarity's provider list)
 */

import { NextRequest, NextResponse } from 'next/server';
import { bulkImportProviders } from '@/lib/provider-registry';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let providers: Array<{
      npi: string;
      providerName: string;
      email: string;
      taxId?: string;
      phone?: string;
      fax?: string;
    }> = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      
      if (!Array.isArray(body.providers)) {
        return NextResponse.json(
          { error: 'Request body must contain a "providers" array' },
          { status: 400 }
        );
      }
      
      providers = body.providers;
    } else if (contentType.includes('text/csv') || contentType.includes('multipart/form-data')) {
      // Handle CSV upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file uploaded' },
          { status: 400 }
        );
      }
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return NextResponse.json(
          { error: 'CSV must have header row and at least one data row' },
          { status: 400 }
        );
      }
      
      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const npiIdx = header.findIndex(h => h === 'npi');
      const nameIdx = header.findIndex(h => h.includes('name') || h === 'provider');
      const emailIdx = header.findIndex(h => h.includes('email'));
      const taxIdIdx = header.findIndex(h => h.includes('tax') || h === 'tin');
      const phoneIdx = header.findIndex(h => h.includes('phone'));
      const faxIdx = header.findIndex(h => h.includes('fax'));
      
      if (npiIdx === -1 || emailIdx === -1) {
        return NextResponse.json(
          { error: 'CSV must have "npi" and "email" columns' },
          { status: 400 }
        );
      }
      
      // Parse rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        if (values[npiIdx] && values[emailIdx]) {
          providers.push({
            npi: values[npiIdx],
            providerName: nameIdx !== -1 ? values[nameIdx] : 'Unknown Provider',
            email: values[emailIdx],
            taxId: taxIdIdx !== -1 ? values[taxIdIdx] : undefined,
            phone: phoneIdx !== -1 ? values[phoneIdx] : undefined,
            fax: faxIdx !== -1 ? values[faxIdx] : undefined,
          });
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be application/json or text/csv' },
        { status: 400 }
      );
    }

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'No valid providers found in request' },
        { status: 400 }
      );
    }

    // Validate providers
    const validProviders = providers.filter(p => {
      if (!p.npi || !/^\d{10}$/.test(p.npi)) return false;
      if (!p.email || !p.email.includes('@')) return false;
      return true;
    });

    const invalidCount = providers.length - validProviders.length;

    // Import
    const result = await bulkImportProviders(validProviders);

    return NextResponse.json({
      success: true,
      summary: {
        totalReceived: providers.length,
        validRecords: validProviders.length,
        invalidRecords: invalidCount,
        imported: result.imported,
        failed: result.failed,
      },
      errors: result.errors.slice(0, 10), // First 10 errors
      hasMoreErrors: result.errors.length > 10,
    });

  } catch (error: any) {
    console.error('[ProviderImport] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

// GET - show usage
export async function GET() {
  return NextResponse.json({
    usage: {
      json: {
        method: 'POST',
        contentType: 'application/json',
        body: {
          providers: [
            {
              npi: '1234567890',
              providerName: 'Provider Name',
              email: 'billing@provider.com',
              taxId: '12-3456789',
              phone: '555-123-4567',
              fax: '555-123-4568',
            }
          ]
        }
      },
      csv: {
        method: 'POST',
        contentType: 'multipart/form-data',
        file: 'CSV with columns: npi, name/provider, email, tax_id/tin, phone, fax',
        example: 'npi,provider_name,email,tax_id\n1234567890,Mountain View Ortho,billing@mvo.com,84-1234567'
      }
    }
  });
}
