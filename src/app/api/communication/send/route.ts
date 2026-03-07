// Phase 2C: Send Offer Letter API

import { NextRequest, NextResponse } from 'next/server';
import { communicationService, buildLetterData } from '@/lib/communication/service';
import { pool } from '@/lib/db';
import { randomBytes } from 'crypto';

// Generate a secure random token
function generateResponseToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId, negotiationId, method, recipient, offerAmount, letterType, templateId, ccEmails, customMessage } = body;
    
    // Validation
    if (!billId || !method || !recipient || !offerAmount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: billId, method, recipient, offerAmount'
      }, { status: 400 });
    }
    
    if (!['fax', 'email'].includes(method)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid method. Must be "fax" or "email"'
      }, { status: 400 });
    }
    
    // Get bill client ID
    const billResult = await pool.query('SELECT client_id FROM bills WHERE id = $1', [billId]);
    if (billResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Bill not found'
      }, { status: 404 });
    }
    const clientId = billResult.rows[0].client_id;
    
    // Generate response token and expiration (30 days)
    const responseToken = generateResponseToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Create negotiation if not provided
    let negId = negotiationId;
    if (!negId) {
      const negResult = await pool.query(`
        INSERT INTO negotiations (
          bill_id, initial_offer, current_offer, strategy, status,
          response_token, response_token_expires, response_type,
          created_at, updated_at
        )
        VALUES ($1, $2, $2, 'medicare_percentage', 'pending', $3, $4, 'pending', NOW(), NOW())
        RETURNING id
      `, [billId, offerAmount, responseToken, expiresAt]);
      negId = negResult.rows[0].id;
    } else {
      // Update negotiation with new offer and token
      await pool.query(`
        UPDATE negotiations SET 
          current_offer = $1, 
          response_token = $2,
          response_token_expires = $3,
          response_type = 'pending',
          updated_at = NOW() 
        WHERE id = $4
      `, [offerAmount, responseToken, expiresAt, negId]);
    }
    
    // Build letter data
    const letterData = await buildLetterData(billId, negId, offerAmount, clientId);
    
    // Add response portal URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
      : 'https://dokit-super-admin-v2-production.up.railway.app';
    letterData.responseUrl = `${baseUrl}/respond/${responseToken}`;
    letterData.responseToken = responseToken;
    
    // Add custom message if provided
    if (customMessage) {
      letterData.customMessage = customMessage;
    }
    
    // Send the offer
    const result = await communicationService.sendOffer(
      {
        billId,
        negotiationId: negId,
        method,
        recipient,
        letterType: letterType || 'initial_offer',
        templateId,
        ccEmails
      },
      letterData
    );
    
    // Update bill status
    if (result.success) {
      await pool.query(`
        UPDATE bills SET status = 'offer_sent', updated_at = NOW() WHERE id = $1
      `, [billId]);
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Send offer error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
