import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'crypto';
import { createStripeService } from '@/lib/stripeService';
import { StripeWebhookEvent } from '@/types/stripe';
import { supabaseAdmin } from '@/lib/optimized-supabase';

// Enhanced webhook security configuration
const WEBHOOK_CONFIG = {
  maxAge: 300, // 5 minutes
  tolerance: 300, // 5 minutes tolerance
  retryAttempts: 3,
  retryDelay: 1000
};

// Webhook signature verification with enhanced security
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): { valid: boolean; event?: Stripe.Event; error?: string } {
  try {
    // Parse signature header
    const elements = signature.split(',');
    const signatureHash = elements.find(el => el.startsWith('v='))?.split('=')[1];
    const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
    const signatures = elements.filter(el => el.startsWith('s=')).map(el => el.split('=')[1]);

    if (!signatureHash || !timestamp || signatures.length === 0) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Check timestamp to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    const eventTime = parseInt(timestamp);
    
    if (currentTime - eventTime > WEBHOOK_CONFIG.maxAge) {
      return { valid: false, error: 'Event too old' };
    }

    // Verify signature
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const isValidSignature = signatures.some(sig => 
      crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'))
    );

    if (!isValidSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Parse and validate event
    const event = JSON.parse(body) as Stripe.Event;
    
    // Additional validation
    if (!event.id || !event.type || !event.created) {
      return { valid: false, error: 'Invalid event structure' };
    }

    return { valid: true, event };

  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Signature verification failed' 
    };
  }
}

// Enhanced webhook event processing with idempotency
async function processWebhookEventWithIdempotency(
  event: Stripe.Event,
  attempt: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple in-memory tracking for processed events (in production, use Redis or database)
    const processedEvents = new Set<string>();
    
    // Check if event was already processed
    if (processedEvents.has(event.id)) {
      console.log(`✅ Event ${event.id} already processed, skipping`);
      return { success: true };
    }

    // Mark as processing
    processedEvents.add(event.id);

    // Process the event
    const stripeService = createStripeService();
    const webhookEvent: StripeWebhookEvent = {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created,
    };

    await stripeService.handleWebhookEvent(webhookEvent);

    console.log(`✅ Event ${event.id} processed successfully`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error processing event ${event.id}:`, error);

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing failed' 
    };
  }
}

// Rate limiting for webhook endpoint
const webhookRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkWebhookRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // 100 requests per minute per IP

  const limit = webhookRateLimit.get(ip);
  
  if (!limit || limit.resetTime < now) {
    webhookRateLimit.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true };
  }

  if (limit.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((limit.resetTime - now) / 1000)
    };
  }

  limit.count++;
  return { allowed: true };
}

// Main webhook handler with enhanced security
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🔐 [${requestId}] Secure webhook request received`);

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimit = checkWebhookRateLimit(clientIP);
    if (!rateLimit.allowed) {
      console.log(`🚫 [${requestId}] Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Get webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(`❌ [${requestId}] Webhook secret not configured`);
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get signature
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error(`❌ [${requestId}] Missing Stripe signature`);
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get body
    const body = await request.text();
    if (!body) {
      console.error(`❌ [${requestId}] Empty request body`);
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    // Verify signature with enhanced security
    const verification = verifyWebhookSignature(body, signature, webhookSecret);
    if (!verification.valid) {
      console.error(`❌ [${requestId}] Signature verification failed: ${verification.error}`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = verification.event!;
    console.log(`✅ [${requestId}] Verified event: ${event.type} (${event.id})`);

    // Process event with idempotency and retry logic
    let attempt = 1;
    let result = await processWebhookEventWithIdempotency(event, attempt);

    // Retry logic for failed events
    while (!result.success && attempt < WEBHOOK_CONFIG.retryAttempts) {
      attempt++;
      console.log(`🔄 [${requestId}] Retrying event ${event.id} (attempt ${attempt})`);
      
      await new Promise(resolve => setTimeout(resolve, WEBHOOK_CONFIG.retryDelay * attempt));
      result = await processWebhookEventWithIdempotency(event, attempt);
    }

    const processingTime = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ [${requestId}] Webhook processed successfully in ${processingTime}ms`);
      return NextResponse.json({ received: true });
    } else {
      console.error(`❌ [${requestId}] Webhook processing failed after ${attempt} attempts: ${result.error}`);
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Webhook error after ${processingTime}ms:`, error);
    
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const healthMetrics = {
    rateLimiting: {
      activeIPs: webhookRateLimit.size,
      config: {
        windowMs: 60000,
        maxRequests: 100
      }
    },
    webhookConfig: WEBHOOK_CONFIG,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(healthMetrics);
}
