/**
 * Verify Provider Email
 * POST /api/bill-negotiator/verify-email
 * 
 * Validates email before sending negotiation offers
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validateAndCorrectEmail, generateEmailVariations } from '@/lib/email-validator';

export async function POST(request: NextRequest) {
  try {
    const { email, confidence = 100, autoCorrect = false } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (autoCorrect) {
      // Try to auto-correct if invalid
      const result = await validateAndCorrectEmail(email, confidence);
      
      return NextResponse.json({
        originalEmail: email,
        validatedEmail: result.email,
        wasCorrected: result.wasCorreted,
        validation: result.validation,
        possibleVariations: generateEmailVariations(email),
      });
    } else {
      // Just validate
      const validation = await validateEmail(email, confidence);
      
      return NextResponse.json({
        email,
        validation,
        possibleVariations: !validation.isValid ? generateEmailVariations(email) : [],
      });
    }
    
  } catch (error: any) {
    console.error('[VerifyEmail] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Email verification failed' },
      { status: 500 }
    );
  }
}

// GET - test endpoint
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({
      usage: 'GET /api/bill-negotiator/verify-email?email=test@example.com',
      description: 'Validates email and checks MX records',
    });
  }
  
  const validation = await validateEmail(email);
  
  return NextResponse.json({
    email,
    validation,
    possibleVariations: !validation.isValid ? generateEmailVariations(email) : [],
  });
}
