import { NextRequest, NextResponse } from 'next/server';
import { createStripeService } from '@/lib/stripeService';
import { CreateCustomerPortalRequest } from '@/types/stripe';

export async function POST(request: NextRequest) {
  try {
    const body: CreateCustomerPortalRequest = await request.json();
    const { userId, returnUrl } = body;

    // Validate request
    if (!userId || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create customer portal session
    const stripeService = createStripeService();
    const session = await stripeService.createCustomerPortalSession({
      userId,
      returnUrl,
    });

    return NextResponse.json(session);

  } catch (error) {
    console.error('❌ Customer portal session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
