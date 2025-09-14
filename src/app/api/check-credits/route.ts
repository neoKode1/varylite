import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId, modelName } = await request.json();

    if (!userId || !modelName) {
      return NextResponse.json({ 
        error: 'User ID and model name are required' 
      }, { status: 400 });
    }

    console.log('🔍 Checking credits for user:', userId, 'model:', modelName);

    // Always return success - no restrictions
    const result = {
      hasCredits: true,
      availableCredits: 999,
      modelCost: 0.0398,
      error: null
    };

    console.log('✅ Credit check result (unlimited access):', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Credit check API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
