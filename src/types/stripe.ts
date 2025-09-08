// Stripe Integration Types

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  priceIds: {
    light: string;
    heavy: string;
  };
  productIds: {
    light: string;
    heavy: string;
  };
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  userId: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  productId: string;
  tier: 'light' | 'heavy';
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface CreateCheckoutSessionRequest {
  userId: string;
  tier: 'light' | 'heavy';
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CreateCustomerPortalRequest {
  userId: string;
  returnUrl: string;
}

export interface CreateCustomerPortalResponse {
  url: string;
}

// Stripe webhook event types we'll handle
export type StripeWebhookEventType = 
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.trial_will_end'
  | 'customer.subscription.trial_ended';

export interface WebhookHandler {
  (event: StripeWebhookEvent): Promise<void>;
}

// Default Stripe configuration (will be overridden by environment variables)
export const DEFAULT_STRIPE_CONFIG: Partial<StripeConfig> = {
  priceIds: {
    light: 'price_light_monthly', // Will be set from environment
    heavy: 'price_heavy_monthly', // Will be set from environment
  },
  productIds: {
    light: 'prod_light_tier', // Will be set from environment
    heavy: 'prod_heavy_tier', // Will be set from environment
  },
};
