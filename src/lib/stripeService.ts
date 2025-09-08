import Stripe from 'stripe';
import { supabase } from './supabase';
import { 
  StripeConfig, 
  StripeCustomer, 
  StripeSubscription,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalRequest,
  CreateCustomerPortalResponse,
  StripeWebhookEvent,
  StripeWebhookEventType
} from '@/types/stripe';
import { UserTier } from '@/types/pricing';

export class StripeService {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<StripeCustomer> {
    try {
      // Check if customer already exists
      const existingCustomer = await this.getCustomerByUserId(userId);
      if (existingCustomer) {
        return existingCustomer;
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      // Store customer in database
      const { error } = await supabase
        .from('stripe_customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customer.id,
          email: customer.email,
          name: customer.name,
        });

      if (error) {
        console.error('Error storing Stripe customer:', error);
        throw error;
      }

      return {
        id: customer.id,
        email: customer.email || email,
        name: customer.name || name,
        userId,
      };

    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Get Stripe customer by user ID
   */
  async getCustomerByUserId(userId: string): Promise<StripeCustomer | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_customers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      // Get subscription info from Stripe
      const subscriptions = await this.stripe.subscriptions.list({
        customer: data.stripe_customer_id,
        status: 'all',
        limit: 1,
      });

      const subscription = subscriptions.data[0];

      return {
        id: data.stripe_customer_id,
        email: data.email,
        name: data.name,
        userId: data.user_id,
        subscriptionId: subscription?.id,
        subscriptionStatus: subscription?.status as any,
        currentPeriodEnd: (subscription as any)?.current_period_end 
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : undefined,
        cancelAtPeriodEnd: (subscription as any)?.cancel_at_period_end || false,
      };

    } catch (error) {
      console.error('Error getting Stripe customer:', error);
      return null;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    request: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const { userId, tier, successUrl, cancelUrl } = request;

      // Get or create customer
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      const customer = await this.createCustomer(userId, user.email, user.name);

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: this.config.priceIds[tier],
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          tier,
        },
        subscription_data: {
          metadata: {
            userId,
            tier,
          },
        },
      });

      return {
        sessionId: session.id,
        url: session.url || '',
      };

    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session
   */
  async createCustomerPortalSession(
    request: CreateCustomerPortalRequest
  ): Promise<CreateCustomerPortalResponse> {
    try {
      const { userId, returnUrl } = request;

      const customer = await this.getCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: returnUrl,
      });

      return {
        url: session.url,
      };

    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      const customer = await this.getCustomerByUserId(userId);
      if (!customer || !customer.subscriptionId) {
        throw new Error('No active subscription found');
      }

      if (cancelAtPeriodEnd) {
        await this.stripe.subscriptions.update(customer.subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        await this.stripe.subscriptions.cancel(customer.subscriptionId);
      }

    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: StripeWebhookEvent): Promise<void> {
    try {
      const { type, data } = event;

      switch (type as StripeWebhookEventType) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(data.object);
          break;
        default:
          console.log(`Unhandled webhook event type: ${type}`);
      }

    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle subscription created webhook
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.userId;
      const tier = subscription.metadata.tier as UserTier;

      if (!userId || !tier) {
        console.error('Missing metadata in subscription:', subscription.id);
        return;
      }

      // Update user tier in database
      await supabase
        .from('users')
        .update({
          tier,
          subscription_id: subscription.id,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      console.log(`Subscription created for user ${userId}, tier: ${tier}`);

    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.userId;
      const tier = subscription.metadata.tier as UserTier;

      if (!userId || !tier) {
        console.error('Missing metadata in subscription:', subscription.id);
        return;
      }

      // Update user subscription status
      await supabase
        .from('users')
        .update({
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);

    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('Missing userId in subscription metadata:', subscription.id);
        return;
      }

      // Downgrade user to free tier
      await supabase
        .from('users')
        .update({
          tier: 'free',
          subscription_id: null,
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      console.log(`Subscription deleted for user ${userId}, downgraded to free tier`);

    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handle payment succeeded webhook
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      if ((invoice as any).subscription) {
        const subscription = await this.stripe.subscriptions.retrieve((invoice as any).subscription as string);
        const userId = subscription.metadata.userId;

        if (userId) {
          // Reset usage counters on successful payment
          await supabase
            .from('users')
            .update({
              monthly_generations: 0,
              daily_generations: 0,
              overage_charges: 0,
              last_reset_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          console.log(`Payment succeeded for user ${userId}, reset usage counters`);
        }
      }

    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      if ((invoice as any).subscription) {
        const subscription = await this.stripe.subscriptions.retrieve((invoice as any).subscription as string);
        const userId = subscription.metadata.userId;

        if (userId) {
          // Update subscription status to past_due
          await supabase
            .from('users')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          console.log(`Payment failed for user ${userId}, status set to past_due`);
        }
      }

    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }
}

// Export function to create Stripe service instance
export function createStripeService(): StripeService {
  const config: StripeConfig = {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      light: process.env.STRIPE_LIGHT_PRICE_ID || '',
      heavy: process.env.STRIPE_HEAVY_PRICE_ID || '',
    },
    productIds: {
      light: process.env.STRIPE_LIGHT_PRODUCT_ID || '',
      heavy: process.env.STRIPE_HEAVY_PRODUCT_ID || '',
    },
  };

  return new StripeService(config);
}
