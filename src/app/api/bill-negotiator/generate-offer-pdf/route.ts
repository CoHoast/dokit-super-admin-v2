/**
 * Generate PDF Offer Letter
 * POST /api/bill-negotiator/generate-offer-pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import React, { ReactElement } from 'react';
import { renderToBuffer, Document } from '@react-pdf/renderer';
import { OfferLetterPDF, OfferLetterProps } from '@/lib/pdf/offer-letter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const required = ['providerName', 'patientName', 'patientMemberId', 'dateOfService', 
                      'lineItems', 'totalBilled', 'offerAmount', 'offerNumber'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Set defaults
    const props: OfferLetterProps = {
      providerName: body.providerName,
      providerAddress: body.providerAddress,
      providerNPI: body.providerNPI,
      providerTaxId: body.providerTaxId,
      patientName: body.patientName,
      patientMemberId: body.patientMemberId,
      patientDOB: body.patientDOB,
      accountNumber: body.accountNumber,
      dateOfService: body.dateOfService,
      lineItems: body.lineItems,
      totalBilled: body.totalBilled,
      offerAmount: body.offerAmount,
      maxAcceptable: body.maxAcceptable || body.offerAmount * 1.33,
      potentialSavings: body.potentialSavings || (body.totalBilled - body.offerAmount),
      offerNumber: body.offerNumber,
      offerDate: body.offerDate || new Date().toLocaleDateString(),
      expirationDate: body.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      responseUrl: body.responseUrl || `https://sirkl-platform-production.up.railway.app/respond/${body.offerNumber}`,
      clientName: body.clientName || 'Solidarity Health Network',
      clientPhone: body.clientPhone || '(800) 555-0100',
      clientEmail: body.clientEmail || 'offers@sirkl.ai',
    };

    // Generate PDF
    const element = React.createElement(OfferLetterPDF, props) as ReactElement;
    const pdfBuffer = await renderToBuffer(element as any);

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="offer-${props.offerNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// GET - health check
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    description: 'POST with offer details to generate branded PDF',
    requiredFields: [
      'providerName', 'patientName', 'patientMemberId', 'dateOfService',
      'lineItems', 'totalBilled', 'offerAmount', 'offerNumber'
    ],
    optionalFields: [
      'providerAddress', 'providerNPI', 'providerTaxId', 'patientDOB',
      'accountNumber', 'maxAcceptable', 'potentialSavings', 'offerDate',
      'expirationDate', 'responseUrl', 'clientName', 'clientPhone', 'clientEmail'
    ]
  });
}
