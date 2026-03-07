/**
 * Autonomous Bill Negotiator Processor
 * 
 * Handles automatic offer creation and counter-responses based on client settings.
 * Can be called via cron job or triggered by events.
 * 
 * POST /api/bill-negotiator/auto-process
 * - action: 'process_new_bills' | 'process_counters' | 'process_all'
 * - billId: (optional) specific bill to process
 * - clientId: (optional) specific client to process
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { communicationService, buildLetterData } from '@/lib/communication/service';
import { enrichBillWithNPI } from '@/lib/npi-lookup';
import { randomBytes } from 'crypto';

// Simple API key for cron/automation access
const CRON_SECRET = process.env.CRON_SECRET || 'dokit-auto-process-2026';

function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  
  // Check bearer token or x-api-key header
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === CRON_SECRET;
  }
  if (apiKey === CRON_SECRET) {
    return true;
  }
  
  // Also allow from localhost/internal for testing
  const host = request.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }
  
  return false;
}

// Generate response token
function generateResponseToken(): string {
  return randomBytes(32).toString('base64url');
}

// Calculate delay in milliseconds based on settings
function calculateDelay(settings: any): number {
  const mode = settings.response_delay_mode || 'natural';
  let minMs = (settings.response_delay_min_minutes || 60) * 60 * 1000;
  let maxMs = (settings.response_delay_max_minutes || 240) * 60 * 1000;
  
  switch (mode) {
    case 'instant':
      return 0;
    case 'quick':
      minMs = 15 * 60 * 1000;
      maxMs = 30 * 60 * 1000;
      break;
    case 'natural':
      minMs = 60 * 60 * 1000;
      maxMs = 4 * 60 * 60 * 1000;
      break;
    case 'deliberate':
      minMs = 4 * 60 * 60 * 1000;
      maxMs = 24 * 60 * 60 * 1000;
      break;
    // 'custom' uses the settings values
  }
  
  // Random delay within range
  return minMs + Math.random() * (maxMs - minMs);
}

// Check if current time is within business hours
function isBusinessHours(settings: any): boolean {
  if (!settings.response_business_hours_only) return true;
  
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Check weekdays only
  if (settings.response_weekdays_only && (day === 0 || day === 6)) {
    return false;
  }
  
  // Business hours: 8 AM - 6 PM
  return hour >= 8 && hour < 18;
}

// Process new bills - auto-create and send offers
async function processNewBills(clientId?: number): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  
  // Get autonomous clients
  let clientQuery = `
    SELECT ns.*, c.name as client_name 
    FROM negotiation_settings ns
    JOIN clients c ON ns.client_id = c.id
    WHERE ns.autonomy_level = 'fully_autonomous'
  `;
  const clientParams: any[] = [];
  
  if (clientId) {
    clientQuery += ` AND ns.client_id = $1`;
    clientParams.push(clientId);
  }
  
  const clientsResult = await pool.query(clientQuery, clientParams);
  
  for (const settings of clientsResult.rows) {
    try {
      // Get bills that need offers
      const billsResult = await pool.query(`
        SELECT b.* FROM bills b
        LEFT JOIN negotiations n ON b.id = n.bill_id
        WHERE b.client_id = $1 
          AND b.status IN ('received', 'ready_to_negotiate')
          AND n.id IS NULL
        ORDER BY b.created_at ASC
        LIMIT 10
      `, [settings.client_id]);
      
      for (const bill of billsResult.rows) {
        try {
          // Calculate offer amount
          const totalBilled = parseFloat(bill.total_billed);
          const offerPercent = settings.default_initial_offer_percent || 50;
          let offerAmount = Math.round(totalBilled * (offerPercent / 100) * 100) / 100;
          
          // Ensure within bounds
          const minOffer = totalBilled * ((settings.min_offer_percent || 35) / 100);
          const maxOffer = totalBilled * ((settings.max_offer_percent || 75) / 100);
          offerAmount = Math.max(minOffer, Math.min(maxOffer, offerAmount));
          
          // Generate response token
          const responseToken = generateResponseToken();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
          // Create negotiation
          const negResult = await pool.query(`
            INSERT INTO negotiations (
              bill_id, client_id, initial_offer, current_offer, strategy, status,
              response_token, response_token_expires, response_type,
              auto_negotiated, created_at, updated_at
            )
            VALUES ($1, $2, $3, $3, 'auto', 'pending', $4, $5, 'pending', true, NOW(), NOW())
            RETURNING id
          `, [bill.id, settings.client_id, offerAmount, responseToken, expiresAt]);
          
          const negotiationId = negResult.rows[0].id;
          
          // Try to enrich bill with NPI data if missing contact info
          let providerEmail = bill.provider_email;
          let providerFax = bill.provider_fax;
          
          if (!providerEmail && !providerFax && bill.provider_npi) {
            console.log(`[AUTO] Bill ${bill.id}: No contact info, trying NPI lookup for ${bill.provider_npi}`);
            const npiData = await enrichBillWithNPI(bill);
            if (npiData) {
              // Update bill with NPI data
              if (npiData.provider_fax) {
                providerFax = npiData.provider_fax;
                await pool.query(`UPDATE bills SET provider_fax = $1 WHERE id = $2`, [providerFax, bill.id]);
                console.log(`[AUTO] Bill ${bill.id}: Found fax via NPI: ${providerFax}`);
              }
              if (npiData.provider_phone && !bill.provider_phone) {
                await pool.query(`UPDATE bills SET provider_phone = $1 WHERE id = $2`, [npiData.provider_phone, bill.id]);
              }
            }
          }
          
          // Determine send method (prefer email, fallback to fax)
          const sendMethod = providerEmail ? 'email' : (providerFax ? 'fax' : null);
          const recipient = providerEmail || providerFax;
          
          if (recipient && sendMethod) {
            // Build letter data and send
            const letterData = await buildLetterData(bill.id, negotiationId, offerAmount, settings.client_id);
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dokit-super-admin-v2-production.up.railway.app';
            letterData.responseUrl = `${baseUrl}/respond/${responseToken}`;
            letterData.responseToken = responseToken;
            
            const sendResult = await communicationService.sendOffer({
              billId: bill.id,
              negotiationId,
              method: sendMethod as 'email' | 'fax',
              recipient,
              letterType: 'initial_offer'
            }, letterData);
            
            if (sendResult.success) {
              // Update bill and negotiation
              await pool.query(`UPDATE bills SET status = 'offer_sent', updated_at = NOW() WHERE id = $1`, [bill.id]);
              await pool.query(`UPDATE negotiations SET offer_sent_via = $1, offer_sent_at = NOW() WHERE id = $2`, [sendMethod, negotiationId]);
              processed++;
              
              console.log(`[AUTO] Sent offer for bill ${bill.id}: $${offerAmount} via ${sendMethod}`);
            } else {
              errors.push(`Bill ${bill.id}: Failed to send - ${sendResult.error}`);
            }
          } else {
            errors.push(`Bill ${bill.id}: No provider contact info`);
          }
        } catch (billError: any) {
          errors.push(`Bill ${bill.id}: ${billError.message}`);
        }
      }
    } catch (clientError: any) {
      errors.push(`Client ${settings.client_id}: ${clientError.message}`);
    }
  }
  
  return { processed, errors };
}

// Process counter offers - auto-respond
async function processCounters(clientId?: number): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  
  // Get negotiations with counters that need responses
  let query = `
    SELECT n.*, b.provider_email, b.provider_fax, b.total_billed,
           ns.*, c.name as client_name
    FROM negotiations n
    JOIN bills b ON n.bill_id = b.id
    JOIN negotiation_settings ns ON n.client_id = ns.client_id
    JOIN clients c ON n.client_id = c.id
    WHERE n.response_type = 'countered'
      AND ns.autonomy_level = 'fully_autonomous'
      AND n.auto_negotiated = true
      AND (n.scheduled_response_at IS NULL OR n.scheduled_response_at <= NOW())
  `;
  const params: any[] = [];
  
  if (clientId) {
    query += ` AND n.client_id = $1`;
    params.push(clientId);
  }
  
  query += ` ORDER BY n.response_received_at ASC LIMIT 10`;
  
  const result = await pool.query(query, params);
  
  for (const row of result.rows) {
    try {
      // Check business hours
      if (!isBusinessHours(row)) {
        console.log(`[AUTO] Skipping negotiation ${row.id}: outside business hours`);
        continue;
      }
      
      // Check if we've exceeded max rounds
      const roundsResult = await pool.query(`
        SELECT COUNT(*) as count FROM negotiations WHERE bill_id = $1
      `, [row.bill_id]);
      const currentRound = parseInt(roundsResult.rows[0].count);
      
      if (currentRound >= (row.max_negotiation_rounds || 3)) {
        // Max rounds reached - escalate
        await pool.query(`
          UPDATE negotiations SET escalated = true, escalation_reason = 'Max rounds reached', updated_at = NOW()
          WHERE id = $1
        `, [row.id]);
        await pool.query(`UPDATE bills SET status = 'escalated', updated_at = NOW() WHERE id = $1`, [row.bill_id]);
        errors.push(`Negotiation ${row.id}: Max rounds reached, escalated`);
        continue;
      }
      
      const counterAmount = parseFloat(row.counter_amount);
      const currentOffer = parseFloat(row.current_offer);
      const totalBilled = parseFloat(row.total_billed);
      
      // Check if counter is within auto-accept threshold
      const threshold = row.auto_accept_threshold || 5;
      const diffPercent = ((counterAmount - currentOffer) / currentOffer) * 100;
      
      if (diffPercent <= threshold) {
        // Auto-accept!
        const savingsAmount = totalBilled - counterAmount;
        const savingsPercent = (savingsAmount / totalBilled) * 100;
        
        await pool.query(`
          UPDATE negotiations SET
            response_type = 'accepted',
            final_amount = $1,
            savings_amount = $2,
            savings_percent = $3,
            settled_at = NOW(),
            updated_at = NOW()
          WHERE id = $4
        `, [counterAmount, savingsAmount, savingsPercent, row.id]);
        
        await pool.query(`UPDATE bills SET status = 'settled', updated_at = NOW() WHERE id = $1`, [row.bill_id]);
        
        console.log(`[AUTO] Auto-accepted negotiation ${row.id}: Counter $${counterAmount} within ${threshold}% threshold`);
        processed++;
        continue;
      }
      
      // Calculate new counter offer
      const increment = row.counter_increment_percent || 10;
      let newOffer = currentOffer * (1 + increment / 100);
      
      // Don't exceed their counter or max offer
      const maxOffer = totalBilled * ((row.max_offer_percent || 75) / 100);
      newOffer = Math.min(newOffer, counterAmount, maxOffer);
      newOffer = Math.round(newOffer * 100) / 100;
      
      // Generate new token
      const responseToken = generateResponseToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Create new negotiation round
      const newNegResult = await pool.query(`
        INSERT INTO negotiations (
          bill_id, client_id, initial_offer, current_offer, strategy, status,
          response_token, response_token_expires, response_type,
          auto_negotiated, created_at, updated_at
        )
        VALUES ($1, $2, $3, $3, 'auto', 'pending', $4, $5, 'pending', true, NOW(), NOW())
        RETURNING id
      `, [row.bill_id, row.client_id, newOffer, responseToken, expiresAt]);
      
      const newNegId = newNegResult.rows[0].id;
      
      // Send counter offer
      const sendMethod = row.offer_sent_via || (row.provider_email ? 'email' : 'fax');
      const recipient = sendMethod === 'email' ? row.provider_email : row.provider_fax;
      
      if (recipient) {
        const letterData = await buildLetterData(row.bill_id, newNegId, newOffer, row.client_id);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dokit-super-admin-v2-production.up.railway.app';
        letterData.responseUrl = `${baseUrl}/respond/${responseToken}`;
        letterData.responseToken = responseToken;
        
        const sendResult = await communicationService.sendOffer({
          billId: row.bill_id,
          negotiationId: newNegId,
          method: sendMethod as 'email' | 'fax',
          recipient,
          letterType: 'counter_offer'
        }, letterData);
        
        if (sendResult.success) {
          await pool.query(`
            UPDATE negotiations SET offer_sent_via = $1, offer_sent_at = NOW() WHERE id = $2
          `, [sendMethod, newNegId]);
          await pool.query(`UPDATE bills SET status = 'offer_sent', updated_at = NOW() WHERE id = $1`, [row.bill_id]);
          
          // Mark the OLD negotiation as processed so it doesn't get picked up again
          await pool.query(`
            UPDATE negotiations SET response_type = 'counter_responded', updated_at = NOW() WHERE id = $1
          `, [row.id]);
          
          console.log(`[AUTO] Sent counter-counter for bill ${row.bill_id}: $${newOffer} via ${sendMethod}`);
          processed++;
        } else {
          errors.push(`Negotiation ${row.id}: Failed to send counter - ${sendResult.error}`);
        }
      } else {
        errors.push(`Negotiation ${row.id}: No recipient for ${sendMethod}`);
      }
    } catch (negError: any) {
      errors.push(`Negotiation ${row.id}: ${negError.message}`);
    }
  }
  
  return { processed, errors };
}

// Schedule a delayed response (called when counter is received)
export async function scheduleAutoResponse(negotiationId: number, settings: any): Promise<void> {
  const delayMs = calculateDelay(settings);
  const scheduledAt = new Date(Date.now() + delayMs);
  
  await pool.query(`
    UPDATE negotiations SET scheduled_response_at = $1, updated_at = NOW() WHERE id = $2
  `, [scheduledAt, negotiationId]);
  
  console.log(`[AUTO] Scheduled response for negotiation ${negotiationId} at ${scheduledAt.toISOString()}`);
}

export async function POST(request: NextRequest) {
  // Validate cron/API access
  if (!validateCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { action, billId, clientId } = body;
    
    let result: { processed: number; errors: string[] } = { processed: 0, errors: [] };
    
    switch (action) {
      case 'process_new_bills':
        result = await processNewBills(clientId);
        break;
        
      case 'process_counters':
        result = await processCounters(clientId);
        break;
        
      case 'process_all':
      default:
        const billsResult = await processNewBills(clientId);
        const countersResult = await processCounters(clientId);
        result = {
          processed: billsResult.processed + countersResult.processed,
          errors: [...billsResult.errors, ...countersResult.errors]
        };
        break;
    }
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error: any) {
    console.error('[AUTO] Process error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint for cron - supports secret key in URL for easy cron setup
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const action = searchParams.get('action') || 'process_all';
  const clientId = searchParams.get('clientId');
  
  // Health check (no secret) - also show cron status
  if (!secret) {
    let cronStatus = 'unknown';
    try {
      const { isCronRunning } = await import('@/lib/cron-scheduler');
      cronStatus = isCronRunning() ? 'running' : 'stopped';
    } catch {
      cronStatus = 'not-initialized';
    }
    
    return NextResponse.json({
      status: 'ok',
      service: 'bill-negotiator-auto-processor',
      cron: cronStatus,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate secret
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }
  
  // Run the processor
  try {
    let result: { processed: number; errors: string[] } = { processed: 0, errors: [] };
    const cid = clientId ? parseInt(clientId) : undefined;
    
    if (action === 'process_new_bills') {
      result = await processNewBills(cid);
    } else if (action === 'process_counters') {
      result = await processCounters(cid);
    } else {
      const billsResult = await processNewBills(cid);
      const countersResult = await processCounters(cid);
      result = {
        processed: billsResult.processed + countersResult.processed,
        errors: [...billsResult.errors, ...countersResult.errors]
      };
    }
    
    console.log(`[CRON] Processed ${result.processed} items, ${result.errors.length} errors`);
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CRON] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
