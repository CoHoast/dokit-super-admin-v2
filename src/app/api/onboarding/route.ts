// Phase 2E: Onboarding API

import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/reports/service';
import { ONBOARDING_STEPS } from '@/lib/reports/types';

// Get onboarding progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'clientId is required'
      }, { status: 400 });
    }
    
    const progress = await reportsService.getOnboardingProgress(parseInt(clientId));
    
    // Enrich steps with completion status
    const steps = ONBOARDING_STEPS.map(step => ({
      ...step,
      completed: progress.completed_steps.includes(step.id)
    }));
    
    return NextResponse.json({
      success: true,
      progress,
      steps
    });
    
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Complete an onboarding step
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, stepId } = body;
    
    if (!clientId || !stepId) {
      return NextResponse.json({
        success: false,
        error: 'clientId and stepId are required'
      }, { status: 400 });
    }
    
    const progress = await reportsService.completeOnboardingStep(
      parseInt(clientId),
      stepId
    );
    
    return NextResponse.json({
      success: true,
      progress
    });
    
  } catch (error: any) {
    console.error('Complete step error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
