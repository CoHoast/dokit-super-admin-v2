/**
 * Provider Response Portal API
 * 
 * GET /api/respond/[token] - Fetch offer details (public)
 * POST /api/respond/[token] - Submit response (accept/counter/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET - Fetch offer details for provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Find negotiation by token
    const result = await pool.query(`
      SELECT 
        n.*,
        b.id as bill_id,
        b.provider_name,
        b.member_name as patient_name,
        b.date_of_service,
        b.total_billed as original_amount,
        b.line_items,
        c.name as org_name,
        c.contact_phone as org_phone,
        c.contact_email as org_email,
        c.settings as org_settings
      FROM negotiations n
      JOIN bills b ON n.bill_id = b.id
      JOIN clients c ON b.client_id = c.id
      WHERE n.response_token = $1
    `, [token]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Offer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const neg = result.rows[0];
    
    // Check if expired
    if (neg.response_token_expires && new Date(neg.response_token_expires) < new Date()) {
      return NextResponse.json(
        { error: 'This offer has expired', code: 'EXPIRED' },
        { status: 410 }
      );
    }
    
    // Check if already responded
    if (neg.response_type && neg.response_type !== 'pending') {
      return NextResponse.json(
        { error: 'A response has already been submitted', code: 'ALREADY_RESPONDED' },
        { status: 409 }
      );
    }
    
    // Get offer amount (current_offer or initial_offer)
    const offerAmount = parseFloat(neg.current_offer) || parseFloat(neg.initial_offer) || 0;
    const originalAmount = parseFloat(neg.original_amount) || 0;
    
    // Build response
    const response = {
      negotiationId: neg.id,
      billId: neg.bill_id,
      providerName: neg.provider_name,
      patientName: neg.patient_name,
      dateOfService: neg.date_of_service,
      originalAmount: originalAmount,
      offerAmount: offerAmount,
      offerPercentage: originalAmount > 0 ? Math.round((offerAmount / originalAmount) * 100) : 0,
      orgName: neg.org_name,
      orgPhone: neg.org_phone || neg.org_settings?.phone || '',
      orgEmail: neg.org_email || neg.org_settings?.email || '',
      expiresAt: neg.response_token_expires,
      status: neg.response_type || 'pending',
      lineItems: neg.line_items || [],
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer details', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

// POST - Submit provider response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { responseType, counterAmount, counterNotes } = body;
    
    // Validate response type
    if (!['accept', 'counter', 'reject'].includes(responseType)) {
      return NextResponse.json(
        { error: 'Invalid response type', code: 'INVALID_TYPE' },
        { status: 400 }
      );
    }
    
    // Validate counter amount if countering
    if (responseType === 'counter' && (!counterAmount || counterAmount <= 0)) {
      return NextResponse.json(
        { error: 'Counter amount is required', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }
    
    // Find negotiation by token
    const result = await pool.query(`
      SELECT n.*, b.total_billed as original_amount
      FROM negotiations n
      JOIN bills b ON n.bill_id = b.id
      WHERE n.response_token = $1
    `, [token]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Offer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const neg = result.rows[0];
    
    // Check if expired
    if (neg.response_token_expires && new Date(neg.response_token_expires) < new Date()) {
      return NextResponse.json(
        { error: 'This offer has expired', code: 'EXPIRED' },
        { status: 410 }
      );
    }
    
    // Check if already responded
    if (neg.response_type && neg.response_type !== 'pending') {
      return NextResponse.json(
        { error: 'A response has already been submitted', code: 'ALREADY_RESPONDED' },
        { status: 409 }
      );
    }
    
    // Map response type to database values
    const dbResponseType = responseType === 'accept' ? 'accepted' : 
                           responseType === 'counter' ? 'countered' : 'rejected';
    
    // Calculate savings if accepted
    const offerAmount = parseFloat(neg.current_offer) || parseFloat(neg.initial_offer) || 0;
    const originalAmount = parseFloat(neg.original_amount) || 0;
    const savingsAmount = originalAmount - offerAmount;
    const savingsPercent = originalAmount > 0 ? (savingsAmount / originalAmount) * 100 : 0;
    
    // Update negotiation
    if (responseType === 'accept') {
      await pool.query(`
        UPDATE negotiations SET
          response_type = $1,
          response_received_at = NOW(),
          provider_response_at = NOW(),
          provider_response_method = 'portal',
          final_amount = $2,
          savings_amount = $3,
          savings_percent = $4,
          settled_at = NOW(),
          updated_at = NOW()
        WHERE id = $5
      `, [dbResponseType, offerAmount, savingsAmount, savingsPercent, neg.id]);
      
      // Update bill status
      await pool.query(`
        UPDATE bills SET status = 'settled', updated_at = NOW() WHERE id = $1
      `, [neg.bill_id]);
      
    } else if (responseType === 'counter') {
      await pool.query(`
        UPDATE negotiations SET
          response_type = $1,
          response_received_at = NOW(),
          provider_response_at = NOW(),
          provider_response_method = 'portal',
          counter_amount = $2,
          counter_notes = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [dbResponseType, counterAmount, counterNotes || null, neg.id]);
      
      // Update bill status
      await pool.query(`
        UPDATE bills SET status = 'counter_received', updated_at = NOW() WHERE id = $1
      `, [neg.bill_id]);
      
      // Check if client is in autonomous mode and schedule auto-response
      const settingsResult = await pool.query(`
        SELECT * FROM negotiation_settings WHERE client_id = $1
      `, [neg.client_id]);
      
      if (settingsResult.rows.length > 0) {
        const settings = settingsResult.rows[0];
        if (settings.autonomy_level === 'fully_autonomous') {
          // Calculate delay based on settings
          const mode = settings.response_delay_mode || 'natural';
          let minMs = (settings.response_delay_min_minutes || 60) * 60 * 1000;
          let maxMs = (settings.response_delay_max_minutes || 240) * 60 * 1000;
          
          if (mode === 'instant') { minMs = 0; maxMs = 60000; }
          else if (mode === 'quick') { minMs = 15 * 60 * 1000; maxMs = 30 * 60 * 1000; }
          else if (mode === 'natural') { minMs = 60 * 60 * 1000; maxMs = 4 * 60 * 60 * 1000; }
          else if (mode === 'deliberate') { minMs = 4 * 60 * 60 * 1000; maxMs = 24 * 60 * 60 * 1000; }
          
          const delayMs = minMs + Math.random() * (maxMs - minMs);
          const scheduledAt = new Date(Date.now() + delayMs);
          
          await pool.query(`
            UPDATE negotiations SET scheduled_response_at = $1, updated_at = NOW() WHERE id = $2
          `, [scheduledAt, neg.id]);
          
          console.log(`[AUTO] Scheduled response for negotiation ${neg.id} at ${scheduledAt.toISOString()}`);
        }
      }
      
    } else { // reject
      await pool.query(`
        UPDATE negotiations SET
          response_type = $1,
          response_received_at = NOW(),
          provider_response_at = NOW(),
          provider_response_method = 'portal',
          counter_notes = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [dbResponseType, counterNotes || 'Provider declined offer', neg.id]);
      
      // Update bill status
      await pool.query(`
        UPDATE bills SET status = 'rejected', updated_at = NOW() WHERE id = $1
      `, [neg.bill_id]);
    }
    
    return NextResponse.json({
      success: true,
      responseType: dbResponseType,
      message: responseType === 'accept' 
        ? 'Offer accepted successfully'
        : responseType === 'counter'
        ? 'Counter offer submitted'
        : 'Offer declined'
    });
    
  } catch (error: any) {
    console.error('Error submitting response:', error);
    return NextResponse.json(
      { error: 'Failed to submit response', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
