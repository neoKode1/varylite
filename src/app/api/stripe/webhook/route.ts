import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createStripeService } from '@/lib/stripeService';
import { StripeWebhookEvent } from '@/types/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripeService = createStripeService();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Missing Stripe webhook secret');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2025-08-27.basil',
      });
      
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    const webhookEvent: StripeWebhookEvent = {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created,
    };

    await stripeService.handleWebhookEvent(webhookEvent);

    console.log(`✅ Webhook handled successfully: ${event.type}`);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
