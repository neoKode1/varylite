import { NextRequest, NextResponse } from 'next/server';
import { createStripeService } from '@/lib/stripeService';
import { CreateCheckoutSessionRequest } from '@/types/stripe';

export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutSessionRequest = await request.json();
    const { userId, tier, successUrl, cancelUrl } = body;

    // Validate request
    if (!userId || !tier || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['pro', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Create checkout session
    const stripeService = createStripeService();
    const session = await stripeService.createCheckoutSession({
      userId,
      tier,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json(session);

  } catch (error) {
    console.error('❌ Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
