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

    // Use the actual CreditService to check credits
    const result = await CreditService.checkUserCredits(userId, modelName);

    console.log('✅ Credit check result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Credit check API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
