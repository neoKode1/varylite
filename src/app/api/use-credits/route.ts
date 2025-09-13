import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const { userId, modelName, generationType, generationId } = await request.json();

    if (!userId || !modelName || !generationType) {
      return NextResponse.json({ 
        error: 'User ID, model name, and generation type are required' 
      }, { status: 400 });
    }

    console.log('💰 Using credits for user:', userId, 'model:', modelName, 'type:', generationType);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = await CreditService.useCredits(userId, modelName, generationType, generationId);

    console.log('✅ Credit usage result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Credit usage API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
